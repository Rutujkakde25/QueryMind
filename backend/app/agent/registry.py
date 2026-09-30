"""
Tracks paired agents and lets HTTP endpoints "await" a response that
actually arrives asynchronously over a WebSocket.

Two kinds of secrets, deliberately separate:

  * pairing code  - short-lived, single-use. Created by the website, entered
                    (or clipboard-pasted) into the agent exactly once.
  * session token - long-lived. Issued to the agent when it pairs, handed to
                    the browser once, and used for every later request and
                    for agent reconnects. A leaked pairing code is useless
                    after first use.
"""

import asyncio
import secrets
import time
from dataclasses import dataclass, field

from fastapi import WebSocket

PAIRING_CODE_TTL_SECONDS = 600   # unused codes expire after 10 minutes
SESSION_TTL_SECONDS = 8 * 3600   # a paired session lasts 8 hours


@dataclass
class AgentConnection:
    websocket: WebSocket
    schema: dict | None = None            # cached after a successful /connect/local
    relationships: dict | None = None
    pending: dict = field(default_factory=dict)

    async def send_request(self, payload: dict, timeout: float = 30.0) -> dict:
        request_id = secrets.token_hex(8)
        fut = asyncio.get_running_loop().create_future()
        self.pending[request_id] = fut
        try:
            await self.websocket.send_json({"request_id": request_id, **payload})
            return await asyncio.wait_for(fut, timeout=timeout)
        finally:
            self.pending.pop(request_id, None)

    def resolve(self, request_id: str, result: dict):
        fut = self.pending.get(request_id)
        if fut and not fut.done():
            fut.set_result(result)

    def fail_all(self, error: str):
        """Unblock anyone still waiting when the agent goes away."""
        for fut in list(self.pending.values()):
            if not fut.done():
                fut.set_result({"success": False, "error": error})


class AgentRegistry:
    def __init__(self):
        self._pending_codes: dict[str, float] = {}                 # code -> created_at
        self._code_to_session: dict[str, tuple[str, float]] = {}   # code -> (session, created_at)
        self._sessions: dict[str, float] = {}                      # session -> expires_at
        self._agents: dict[str, AgentConnection] = {}              # session -> live connection

    # --- housekeeping ---------------------------------------------------

    def _purge(self):
        now = time.time()

        for code, created in list(self._pending_codes.items()):
            if now - created >= PAIRING_CODE_TTL_SECONDS:
                del self._pending_codes[code]

        for code, (_, created) in list(self._code_to_session.items()):
            if now - created >= PAIRING_CODE_TTL_SECONDS:
                del self._code_to_session[code]

        for session, expires_at in list(self._sessions.items()):
            if expires_at <= now:
                del self._sessions[session]
                conn = self._agents.pop(session, None)
                if conn:
                    conn.fail_all("Session expired")

    # --- pairing --------------------------------------------------------

    def create_pairing_code(self) -> str:
        self._purge()
        code = secrets.token_urlsafe(9)  # 12 chars; users don't type it
        self._pending_codes[code] = time.time()
        return code

    def authenticate(self, token: str) -> str | None:
        """
        Called when an agent opens its WebSocket.
        - fresh pairing code  -> consumed, new session token returned
        - valid session token -> same token returned (reconnect)
        - anything else       -> None
        """
        self._purge()

        created = self._pending_codes.pop(token, None)   # single use
        if created is not None:
            session = secrets.token_urlsafe(24)
            now = time.time()
            self._sessions[session] = now + SESSION_TTL_SECONDS
            self._code_to_session[token] = (session, now)
            return session

        if self._sessions.get(token, 0) > time.time():
            return token

        return None

    def claim_session(self, code: str) -> str | None:
        """Browser exchanges its pairing code for the session token — once."""
        entry = self._code_to_session.pop(code, None)
        return entry[0] if entry else None

    # --- live connections -----------------------------------------------

    def register(self, session: str, websocket: WebSocket) -> AgentConnection:
        old = self._agents.get(session)
        if old:
            old.fail_all("Agent reconnected")
        connection = AgentConnection(websocket=websocket)
        self._agents[session] = connection
        return connection

    def unregister(self, session: str, connection: AgentConnection):
        """The session stays valid so the agent can reconnect."""
        connection.fail_all("Agent disconnected")
        # Only drop the entry if it's still this connection — a late close
        # from an old socket must not evict a fresh reconnect.
        if self._agents.get(session) is connection:
            del self._agents[session]

    def get(self, session: str) -> AgentConnection | None:
        return self._agents.get(session)

    def is_connected(self, session: str) -> bool:
        return session in self._agents


registry = AgentRegistry()