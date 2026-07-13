"""
VPS 住宅IP HTTP 代理 — 供 CF Worker 调用
Worker → 此代理 → 人民网

启动方式:
  python vps_proxy.py
  # 或后台运行:
  nohup python vps_proxy.py > proxy.log 2>&1 &

安全: 仅接受带 SHARED_SECRET 的请求
"""

import os
import http.server
import urllib.request
import urllib.parse
import json
import re
import socket
from datetime import datetime

PORT = 8765
SHARED_SECRET = os.environ.get("VPS_PROXY_SECRET", "change-me-in-production")  # 与调用方一致
ALLOWED_HOSTS = ["opinion.people.com.cn", "people.com.cn"]


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/health":
            self._json({"status": "ok", "time": datetime.now().isoformat()})
            return

        if parsed.path != "/fetch":
            self._json({"error": "not found"}, 404)
            return

        params = urllib.parse.parse_qs(parsed.query)
        url = params.get("url", [None])[0]
        secret = params.get("secret", [None])[0]

        if secret != SHARED_SECRET:
            self._json({"error": "unauthorized"}, 401)
            return

        if not url:
            self._json({"error": "missing url"}, 400)
            return

        # 安全检查: 只允许人民网
        host = urllib.parse.urlparse(url).hostname or ""
        if not any(host.endswith(h) for h in ALLOWED_HOSTS):
            self._json({"error": f"forbidden host: {host}"}, 403)
            return

        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml",
                    "Accept-Language": "zh-CN,zh;q=0.9",
                },
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                content_type = resp.headers.get("Content-Type", "")
                # 自动编码检测
                body = resp.read()
                encoding = "GB18030"
                if "utf-8" in content_type.lower() or "charset=utf-8" in content_type.lower():
                    encoding = "utf-8"
                try:
                    text = body.decode(encoding)
                    if not re.search(r"[\u4e00-\u9fa5]{3}", text[:200]):
                        text = body.decode("utf-8")
                except:
                    text = body.decode("utf-8", errors="replace")

                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("X-Proxy-Time", datetime.now().isoformat())
                self.end_headers()
                self.wfile.write(text.encode("utf-8"))
        except Exception as e:
            self._json({"error": f"fetch failed: {str(e)}"})

    def _json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False)
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def log_message(self, format, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]}")


if __name__ == "__main__":
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"VPS Proxy starting on {local_ip}:{PORT}")
    print(f"Health check: http://{local_ip}:{PORT}/health")
    server = http.server.HTTPServer(("0.0.0.0", PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.server_close()
