"""
AskDB Agent — desktop connector.

Lets a user point a local or private database at their deployed AskDB
backend without opening any inbound ports. Packaged as a single binary
with PyInstaller (built per-OS in CI).

Flow:
  1. The AskDB website creates a pairing code and copies it to the clipboard
     when the user clicks Download. This app pre-fills it on launch.
  2. The user enters their database details HERE. They are used locally only;
     the password is never sent to the AskDB backend and never saved to disk.
  3. The app tests the database locally, then opens an outbound WebSocket to
     the backend. The backend only ever sends "get schema" / "run this SELECT".
"""

import json
import re
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk

from db import build_database_url, test_connection
from tunnel import AgentTunnel

# Non-secret fields are remembered between launches. The password is NOT saved.
CONFIG_PATH = Path.home() / ".askdb_agent.json"

# Matches secrets.token_urlsafe(9) from the backend (12 chars).
CODE_RE = re.compile(r"^[A-Za-z0-9_-]{12}$")

# label -> (SQLAlchemy dialect name used by db.build_database_url, default port)
ENGINES = {
    "PostgreSQL": ("postgresql", "5432"),
    "MySQL": ("mysql", "3306"),
}

STATUS_COLORS = {
    "idle": "#888888",
    "connecting": "#c98a1d",
    "connected": "#1d9e75",
    "disconnected": "#d84b30",
}
STATUS_LABELS = {
    "idle": "Not connected",
    "connecting": "Connecting…",
    "connected": "Connected · read-only",
    "disconnected": "Disconnected — retrying",
}

TRUST_NOTE = (
    "Your database password stays on this computer. AskDB only receives your "
    "table structure and query results. Queries are read-only and limited to "
    "1,000 rows. Close this window to disconnect."
)


class AgentApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("AskDB Agent")
        self.root.geometry("400x560")
        self.root.resizable(False, False)

        self.tunnel: AgentTunnel | None = None
        self._was_connected = False
        self._inputs: list[tk.Widget] = []  # locked while connected

        self._build_form()
        self._build_status_bar()

        self._load_saved()
        self._prefill_code()

    # --- UI construction -------------------------------------------------

    def _build_form(self):
        frame = ttk.Frame(self.root)
        frame.pack(fill="both", expand=True, padx=16, pady=(14, 0))
        frame.columnconfigure(1, weight=1)

        ttk.Label(frame, text="AskDB Agent", font=("TkDefaultFont", 13, "bold")).grid(
            row=0, column=0, columnspan=2, sticky="w", pady=(0, 4)
        )
        ttk.Label(
            frame,
            text="Enter your database details and press Connect.",
            wraplength=350,
        ).grid(row=1, column=0, columnspan=2, sticky="w", pady=(0, 12))

        # Engine
        ttk.Label(frame, text="Database").grid(row=2, column=0, sticky="w", pady=4)
        self.engine = ttk.Combobox(
            frame, values=list(ENGINES.keys()), state="readonly"
        )
        self.engine.set("PostgreSQL")
        self.engine.bind("<<ComboboxSelected>>", self._on_engine_change)
        self.engine.grid(row=2, column=1, sticky="ew", pady=4)
        self._inputs.append(self.engine)

        self.host = self._entry(frame, "Host", 3, default="localhost")
        self.port = self._entry(frame, "Port", 4, default=ENGINES["PostgreSQL"][1])
        self.username = self._entry(frame, "Username", 5)
        self.password = self._entry(frame, "Password", 6, show="•")
        self.database = self._entry(frame, "Database name", 7)

        ttk.Separator(frame).grid(row=8, column=0, columnspan=2, sticky="ew", pady=12)

        # Pairing code — normally pre-filled from the clipboard
        ttk.Label(frame, text="Pairing code").grid(row=9, column=0, sticky="w", pady=4)
        self.pairing_code = ttk.Entry(frame)
        self.pairing_code.grid(row=9, column=1, sticky="ew", pady=4)
        self._inputs.append(self.pairing_code)
        ttk.Label(
            frame,
            text="Filled in automatically from the AskDB website.",
            foreground="#888888",
        ).grid(row=10, column=1, sticky="w")

        ttk.Label(
            frame, text=TRUST_NOTE, wraplength=350, foreground="#666666"
        ).grid(row=11, column=0, columnspan=2, sticky="w", pady=(16, 0))

        self.connect_button = ttk.Button(
            self.root, text="Connect", command=self._on_connect
        )
        self.connect_button.pack(pady=(10, 0))

    def _entry(self, frame, label, row, default="", show=None):
        ttk.Label(frame, text=label).grid(row=row, column=0, sticky="w", pady=4)
        entry = ttk.Entry(frame, show=show)
        if default:
            entry.insert(0, default)
        entry.grid(row=row, column=1, sticky="ew", pady=4)
        self._inputs.append(entry)
        return entry

    def _build_status_bar(self):
        bar = ttk.Frame(self.root)
        bar.pack(fill="x", side="bottom", padx=16, pady=12)

        self.status_dot = tk.Canvas(bar, width=10, height=10, highlightthickness=0)
        self.status_dot.pack(side="left")
        self._draw_status_dot("idle")

        self.status_label = ttk.Label(bar, text=STATUS_LABELS["idle"])
        self.status_label.pack(side="left", padx=(8, 0))

    def _draw_status_dot(self, status: str):
        self.status_dot.delete("all")
        color = STATUS_COLORS.get(status, "#888888")
        self.status_dot.create_oval(1, 1, 9, 9, fill=color, outline="")

    # --- saved settings / clipboard ---------------------------------------

    def _load_saved(self):
        try:
            data = json.loads(CONFIG_PATH.read_text())
        except Exception:
            return

        if data.get("engine") in ENGINES:
            self.engine.set(data["engine"])
        for key, entry in (
            ("host", self.host),
            ("port", self.port),
            ("username", self.username),
            ("database", self.database),
        ):
            if data.get(key):
                entry.delete(0, "end")
                entry.insert(0, data[key])

    def _save_settings(self):
        data = {
            "engine": self.engine.get(),
            "host": self.host.get().strip(),
            "port": self.port.get().strip(),
            "username": self.username.get(),
            "database": self.database.get().strip(),
            # password intentionally not stored
        }
        try:
            CONFIG_PATH.write_text(json.dumps(data))
        except Exception:
            pass

    def _prefill_code(self):
        try:
            text = self.root.clipboard_get().strip()
        except tk.TclError:
            return  # clipboard empty or not text
        if CODE_RE.match(text):
            self.pairing_code.insert(0, text)

    def _on_engine_change(self, _event=None):
        default_port = ENGINES[self.engine.get()][1]
        self.port.delete(0, "end")
        self.port.insert(0, default_port)

    # --- actions -----------------------------------------------------------

    def _on_connect(self):
        code = self.pairing_code.get().strip()
        host = self.host.get().strip()
        port = self.port.get().strip()
        database = self.database.get().strip()

        if not (host and port and database):
            messagebox.showerror(
                "Missing details", "Host, port and database name are required."
            )
            return
        if not port.isdigit():
            messagebox.showerror("Invalid port", "Port must be a number.")
            return
        if not code:
            messagebox.showerror(
                "Missing pairing code",
                "Open the AskDB website, click “Connect local database”, "
                "then press Connect here again.",
            )
            return

        self.connect_button.config(state="disabled", text="Checking database…")
        params = (
            ENGINES[self.engine.get()][0],
            host,
            port,
            self.username.get(),
            self.password.get(),
            database,
        )
        # Test off the UI thread so the window doesn't freeze.
        threading.Thread(
            target=self._test_then_start, args=(code, params), daemon=True
        ).start()

    def _test_then_start(self, code: str, params: tuple):
        try:
            database_url = build_database_url(*params)
            test_connection(database_url)
        except Exception:
            # Deliberately generic — raw driver errors can echo credentials.
            self.root.after(0, self._on_db_test_failed)
            return
        self.root.after(0, self._start_tunnel, code, database_url)

    def _on_db_test_failed(self):
        self.connect_button.config(state="normal", text="Connect")
        messagebox.showerror(
            "Can't reach the database",
            "Check the host, port, username, password and database name, "
            "and make sure the database is running.",
        )

    def _start_tunnel(self, code: str, database_url):
        self._save_settings()

        if self.tunnel is not None:
            self.tunnel.stop()

        self.connect_button.config(text="Connecting…", state="disabled")
        self.tunnel = AgentTunnel(
            pairing_token=code,
            database_url=database_url,
            on_status_change=self._on_status_change,
        )
        self.tunnel.start()

    def _on_status_change(self, status: str, detail: str):
        # Tkinter isn't thread-safe — hop back to the main thread.
        self.root.after(0, self._update_status_ui, status, detail)

    def _update_status_ui(self, status: str, detail: str):
        self._draw_status_dot(status)
        self.status_label.config(text=STATUS_LABELS.get(status, status))

        if status == "connected":
            self._was_connected = True
            for widget in self._inputs:
                widget.config(state="disabled")
            self.connect_button.config(
                text="Disconnect & quit", state="normal", command=self.root.destroy
            )

        elif status == "disconnected" and not self._was_connected:
            # Never paired — most likely an expired or already-used code.
            for widget in self._inputs:
                widget.config(state="readonly" if widget is self.engine else "normal")
            self.connect_button.config(
                text="Try again", state="normal", command=self._on_connect
            )
            if self.tunnel is not None:
                self.tunnel.stop()
            self.status_label.config(
                text="Couldn't pair — get a fresh code from the AskDB website"
            )


def main():
    root = tk.Tk()
    AgentApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()