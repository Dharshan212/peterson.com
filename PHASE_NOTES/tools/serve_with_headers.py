"""Static server for a dist folder that ALSO sends the release headers from its _headers file,
so the Content-Security-Policy is actually enforced during local testing.
usage: py -3 -B -I serve_with_headers.py <dist_dir> <port> [bind_address]
bind_address defaults to 127.0.0.1 (this machine only). For a phone on the same hotspot / LAN pass that network's own IPv4 address (never 0.0.0.0, never a public address).
"""
import http.server, os, sys, functools

dist = os.path.abspath(sys.argv[1]); port = int(sys.argv[2]); host = sys.argv[3] if len(sys.argv) > 3 else "127.0.0.1"
hdrs = []
for line in open(os.path.join(dist, "_headers"), encoding="utf-8"):
    line = line.rstrip("\n")
    if line.startswith((" ", "\t")) and ":" in line:
        k, v = line.strip().split(":", 1); hdrs.append((k.strip(), v.strip()))

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        for k, v in hdrs: self.send_header(k, v)
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def log_message(self, *a): pass

class Server(http.server.ThreadingHTTPServer):
    # The default listen backlog is 5: a page that opens ~70 assets at once had ~20% of its connections REFUSED (WinError 10061), which made UI suites fail
    # intermittently and need automatic retries. stress_server.py reproduces and verifies this. Test tooling only.
    request_queue_size = 512
    daemon_threads = True


Server((host, port), functools.partial(H, directory=dist)).serve_forever()
