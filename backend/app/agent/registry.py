"""
Tracks paired agents and lets HTTP endpoints "await" a response that
actually arrives asynchronously over a WebSocket.
"""

import asyncio
import secrets
import time
from dataclasses import dataclass, field

from fastapi import WebSocket

PAIRING_CODE_TTL_SECONDS = 600  # unpaired codes expire after 10 minutes


@dataclass
class AgentConnection:
    websocket: WebSocket
    db_params: dict | None = None  # cached after a successful /connect/local
    pending: dict = field(default_factory=dict)

    async def send_request(self, payload: dict, timeout: float = 30.0) -> dict:
        request_id = secrets.token_hex(8)
        fut = asyncio.get_event_loop().create_future()
        self.pending[request_id] = fut
        await self.websocket.send_json({"request_id": request_id, **payload})
        try:
            return await asyncio.wait_for(fut, timeout=timeout)
        finally:
            self.pending.pop(request_id, None)

    def resolve(self, request_id: str, result: dict):
        fut = self.pending.get(request_id)
        if fut and not fut.done():
            fut.set_result(result)


class AgentRegistry:
    def __init__(self):
        self._pending_codes: dict[str, float] = {}
        self._agents: dict[str, AgentConnection] = {}

    def create_pairing_code(self) -> str:
        code = secrets.token_hex(4)  # 8 hex chars, shown to the user
        self._pending_codes[code] = time.time()
        return code

    def is_code_valid(self, code: str) -> bool:
        created_at = self._pending_codes.get(code)
        if created_at is None:
            return code in self._agents  # already paired, e.g. agent reconnecting
        return (time.time() - created_at) < PAIRING_CODE_TTL_SECONDS

    def register(self, code: str, websocket: WebSocket) -> AgentConnection:
        connection = AgentConnection(websocket=websocket)
        self._agents[code] = connection
        self._pending_codes.pop(code, None)
        return connection

    def unregister(self, code: str):
        self._agents.pop(code, None)

    def get(self, code: str) -> AgentConnection | None:
        return self._agents.get(code)

    def is_connected(self, code: str) -> bool:
        return code in self._agents


registry = AgentRegistry()