import http.server
import socketserver
import socket
import webbrowser
import sys

PORT = 8000

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and caching headers
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

if __name__ == "__main__":
    local_ip = get_local_ip()
    url_local = f"http://localhost:{PORT}"
    url_mobile = f"http://{local_ip}:{PORT}"

    print("=" * 65)
    print("   JLPT N2 - 15 NGÀY LUYỆN ĐỀ CHUYÊN SÂU (WEB APP)")
    print("=" * 65)
    print()
    print("  📱 CÁCH MỞ TRÊN IPHONE / IPAD:")
    print("     1. Đảm bảo iPhone / iPad kết nối CÙNG MẠNG WI-FI với máy tính.")
    print("     2. Mở trình duyệt Safari trên iPhone / iPad và nhập:")
    print(f"        👉  {url_mobile}")
    print()
    print("  💻 TRÊN MÁY TÍNH NÀY:")
    print(f"     👉  {url_local}")
    print()
    print("  ⭐ MẸO DÙNG NHƯ APP THẬT TRÊN IPHONE / IPAD:")
    print("     Trong Safari, bấm nút [Chia sẻ] (biểu tượng hình vuông có mũi tên lên)")
    print("     -> Chọn 'Thêm vào MH chính' (Add to Home Screen).")
    print("=" * 65)
    print("  Đang chạy máy chủ... (Nhấn Ctrl + C để dừng)")
    print()

    # Open on desktop automatically
    try:
        webbrowser.open(url_local)
    except Exception:
        pass

    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng máy chủ.")
            sys.exit(0)
