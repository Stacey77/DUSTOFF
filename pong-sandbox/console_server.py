"""Serves ONLY console.html on 127.0.0.1. Nothing else in the folder (.env, logs, data) is reachable."""
import http.server, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "console.html")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8710

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] not in ("/", "/console.html", "/index.html"):
            self.send_error(404); return
        body = open(PAGE, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers(); self.wfile.write(body)
    def log_message(self, *a): pass

if __name__ == "__main__":
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
