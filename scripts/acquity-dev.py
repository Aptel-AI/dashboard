#!/usr/bin/env python3
"""
Acquity prototype — local dev server.

Mirrors GitHub Pages' project-page layout so the same code works
locally and deployed:
  - Mounts /dashboard/* → repo root (matches aptel-ai.github.io/dashboard/)
  - Serves 404.html for missing paths (matches GH Pages behavior)

Usage:
  python3 scripts/acquity-dev.py              # port 8000
  python3 scripts/acquity-dev.py 9000         # custom port

Open:
  http://localhost:8000/dashboard/acquity.html
  http://localhost:8000/dashboard/acquity/recruiter/profile     (direct URL)
  http://localhost:8000/dashboard/acquity/admin/recruiters      (direct URL)
"""

import http.server
import os
import socketserver
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def translate_path(self, path):
        # Strip /dashboard prefix so URLs match GH Pages project hosting.
        clean = path.split("?", 1)[0].split("#", 1)[0]
        if clean.startswith("/dashboard/"):
            clean = clean[len("/dashboard"):]
        elif clean == "/dashboard":
            clean = "/"
        # Rebuild path with query/fragment stripped — SimpleHTTPRequestHandler
        # only uses the first segment, so this is safe.
        self.path = clean + path[len(path.split("?", 1)[0].split("#", 1)[0]):]
        return super().translate_path(self.path)

    def send_head(self):
        # Default behavior, but if it would 404, serve 404.html instead
        # (matches GH Pages' fallback).
        target = self.translate_path(self.path)
        if not os.path.exists(target):
            fallback = REPO_ROOT / "404.html"
            if fallback.exists():
                try:
                    body = fallback.read_bytes()
                except OSError:
                    return super().send_head()
                self.send_response(404)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                return None if self._write_body(body) else None
        return super().send_head()

    def _write_body(self, body):
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass
        return True


def main():
    os.chdir(REPO_ROOT)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Acquity dev server: http://localhost:{PORT}/dashboard/acquity.html")
        print(f"  direct routes:    http://localhost:{PORT}/dashboard/acquity/admin/recruiters")
        print(f"  serving from:     {REPO_ROOT}")
        print("Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print()


if __name__ == "__main__":
    main()
