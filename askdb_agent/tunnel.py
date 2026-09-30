"""
Outbound WebSocket tunnel to the AskDB cloud backend.

Runs its own asyncio event loop on a background thread so it doesn't
block the Tkinter main loop. Reconnects automatically if the connection
drops. Reports status back to the GUI via a callback.
"""

import asyncio
import json
import threading

import websockets

from db import  get_schema, get_relationships, execute_sql

BACKEND_WS_URL = "ws://localhost:8000/agent/connect"  # TODO: set your real backend URL
RECONNECT_DELAY_SECONDS = 5


class AgentTunnel:
    def __init__(self, pairing_token, database_url,  on_status_change):
        self.token = pairing_token
        self.database_url = database_url # 1. Major change (for crendentials stays on machine)
        self.on_status_change = on_status_change  # callback(status: str, detail: str)
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self):
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()

    # --- internals -----------------------------------------------------

    def _run_loop(self):
        asyncio.run(self._connect_forever())

    async def _connect_forever(self):
        while not self._stop_event.is_set():
            url = f"{BACKEND_WS_URL}?token={self.token}"
            try:
                self.on_status_change("connecting", "")
                async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                    self.on_status_change("connected", "")
                    await self._handle_messages(ws)
            except Exception as e:
                self.on_status_change("disconnected", str(e))

            if self._stop_event.is_set():
                break
            await asyncio.sleep(RECONNECT_DELAY_SECONDS)

    async def _handle_messages(self, ws):
        async for raw in ws:
            request = json.loads(raw)
            if request.get("type") == "paired":
                self.token = request["session"] #reconnects use this from now on
                continue
            try:
                result = self._dispatch(request)
            except Exception as e:
                result = {"success": False, "error": str(e)}
            await ws.send(json.dumps({"request_id": request.get("request_id"), "result": result}))


    def _dispatch(self, request: dict) -> dict:
        t = request.get("type")
        if t == "get_schema":
            return {"success": True,
                    "schema": get_schema(self.database_url),
                    "relationships": get_relationships(self.database_url)}
        if t == "execute_query":
            rows = execute_sql(self.database_url, request.get("sql", ""))
            return {"success": True, "results": rows, "row_count": len(rows)}
        return {"success": False, "error": "Unknown request type"}