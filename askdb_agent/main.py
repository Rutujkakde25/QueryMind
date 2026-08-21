"""
AskDB Agent — desktop connector.

Lets a user point a local or private database at their deployed AskDB
backend without opening any inbound ports. Packaged as a single binary
with PyInstaller — see build.sh.
"""

import tkinter as tk
from tkinter import ttk, messagebox

from tunnel import AgentTunnel

STATUS_COLORS = {
    "idle": "#888888",
    "connecting": "#c98a1d",
    "connected": "#1d9e75",
    "disconnected": "#d84b30",
}
STATUS_LABELS = {
    "idle": "Not connected",
    "connecting": "Connecting…",
    "connected": "Connected",
    "disconnected": "Disconnected — retrying",
}


class AgentApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("AskDB Agent")
        self.root.geometry("380x460")
        self.root.resizable(False, False)

        self.tunnel: AgentTunnel | None = None

        self._build_form()
        self._build_status_bar()

    # --- UI construction -------------------------------------------------

    def _build_form(self):
        pad = {"padx": 16, "pady": 6}

        frame = ttk.Frame(self.root)
        frame.pack(fill="both", expand=True, **pad)

        ttk.Label(frame, text="AskDB Agent", font=("Segoe UI", 13, "bold")).grid(
            row=0, column=0, columnspan=2, sticky="w", pady=(0, 12)
        )
        ttk.Label(
            frame,
            text="Paste the pairing code shown in the AskDB app, then click Connect.\n"
                 "Database details are entered there — this app just relays them.",
            wraplength=320,
        ).grid(row=1, column=0, columnspan=2, sticky="w", pady=(0, 12))

        ttk.Label(frame, text="Pairing code").grid(row=2, column=0, sticky="w")
        self.pairing_token = self._labeled_entry(frame, "", 2, column_offset=1, colspan_only=True)

        frame.columnconfigure(1, weight=1)

        self.connect_button = ttk.Button(self.root, text="Connect", command=self._on_connect)
        self.connect_button.pack(pady=(4, 0))

    def _labeled_entry(self, frame, label, row, default="", show=None, column_offset=0, colspan_only=False):
        if not colspan_only:
            ttk.Label(frame, text=label).grid(row=row, column=0, sticky="w")
        entry = ttk.Entry(frame, show=show)
        if default:
            entry.insert(0, default)
        if colspan_only:
            entry.grid(row=row, column=0, columnspan=2, sticky="ew", pady=(20, 4))
        else:
            entry.grid(row=row, column=1, sticky="ew", pady=4)
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

    # --- actions -----------------------------------------------------------

    def _on_connect(self):
        token = self.pairing_token.get().strip()

        if not token:
            messagebox.showerror("Missing pairing code", "Paste the pairing code shown in the AskDB app.")
            return

        self.connect_button.config(state="disabled", text="Connecting…")

        self.tunnel = AgentTunnel(
            pairing_token=token,
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
            self.connect_button.config(text="Connected", state="disabled")
        elif status == "disconnected":
            self.connect_button.config(text="Retry", state="normal")


def main():
    root = tk.Tk()
    AgentApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
