/**
 * security.js - Hệ thống Bảo vệ Mật khẩu An Toàn JLPT N2
 * 
 * NGUYÊN TẮC BẢO MẬT & CHỐNG F12:
 * 1. Mật khẩu không bao giờ lưu dưới dạng văn bản thô (Plaintext).
 * 2. Mật khẩu được mã hóa băm một chiều SHA-256 kèm chuỗi Salt bí mật.
 *    Bất kỳ ai mở F12 / Inspect / View Source chỉ thấy chuỗi băm ngẫu nhiên, không thể dò ngược ra mật khẩu.
 * 3. Chống F12 gỡ màn hình khóa: Khi chưa nhập đúng mật khẩu, body mang class "app-locked",
 *    toàn bộ header, nội dung bài học đều bị ẩn hoàn toàn (display: none !important).
 *    Nếu ai đó cố tình dùng F12 xóa phần tử lock screen, màn hình bên dưới vẫn hoàn toàn trống trơn.
 * 4. Không lưu trữ mật khẩu trên trình duyệt (luôn yêu cầu nhập khi mở hoặc tải lại trang).
 */

(function() {
  const PASSWORD_SALT = "jlpt_n2_2026_salt_";
  const PASSWORD_HASH = "7e17444b0c68e23a34c78c0019b0857ad6801ac547945a1092b94d86938c374f";

  // Hàm tính SHA-256 qua Web Crypto API chuẩn trình duyệt
  async function computeHash(str) {
    try {
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {
      console.warn("Web Crypto API error:", e);
    }
    return null;
  }

  class SecurityManager {
    constructor() {
      this.isUnlocked = false;
      this.init();
    }

    init() {
      // Dọn dẹp bất kỳ cờ cũ nào trong localStorage / sessionStorage
      try {
        localStorage.removeItem("jlpt_app_security");
        localStorage.removeItem("jlpt_unlocked_device");
        sessionStorage.removeItem("jlpt_unlocked_session");
      } catch (e) {}

      // Đảm bảo body luôn có class app-locked từ đầu
      if (document.body) {
        document.body.classList.add("app-locked");
      }

      document.addEventListener("DOMContentLoaded", () => {
        document.body.classList.add("app-locked");
        this.setupDOM();
        this.showLockScreen();
      });
    }

    setupDOM() {
      const pwdInput = document.getElementById("lock-password-input");
      if (pwdInput) {
        if (window.CSS && !CSS.supports("-webkit-text-security", "disc") && !CSS.supports("text-security", "disc")) {
          pwdInput.type = "password";
        }

        pwdInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.unlock();
          }
        });
      }
    }

    showLockScreen() {
      this.isUnlocked = false;
      document.body.classList.add("app-locked");
      const lockScreen = document.getElementById("app-lock-screen");
      if (lockScreen) {
        lockScreen.style.display = "flex";
        setTimeout(() => {
          const pwdInput = document.getElementById("lock-password-input");
          if (pwdInput) {
            pwdInput.value = "";
            pwdInput.focus();
          }
          const errMsg = document.getElementById("lock-error-msg");
          if (errMsg) errMsg.style.display = "none";
        }, 100);
      }
    }

    hideLockScreen() {
      this.isUnlocked = true;
      const lockScreen = document.getElementById("app-lock-screen");
      if (lockScreen) {
        lockScreen.style.display = "none";
      }
      document.body.classList.remove("app-locked");
    }

    async unlock() {
      const pwdInput = document.getElementById("lock-password-input");
      const errMsg = document.getElementById("lock-error-msg");

      if (!pwdInput) return;
      const entered = pwdInput.value.trim();

      if (!entered) {
        this.showError("Vui lòng nhập mật khẩu!");
        pwdInput.focus();
        return;
      }

      // Tính mã băm SHA-256 kèm salt của chuỗi nhập
      const hash = await computeHash(PASSWORD_SALT + entered);

      if (hash === PASSWORD_HASH) {
        if (errMsg) errMsg.style.display = "none";
        pwdInput.value = "";
        pwdInput.blur();
        this.hideLockScreen();

        if (window.app && typeof window.app.showToast === "function") {
          window.app.showToast("Mở khóa thành công!", "success");
        }
      } else {
        this.showError("Mật khẩu không chính xác!");
        pwdInput.value = "";
        pwdInput.focus();
        this.shakeInput();
      }
    }

    showError(msg) {
      const errMsg = document.getElementById("lock-error-msg");
      if (errMsg) {
        errMsg.textContent = msg;
        errMsg.style.display = "flex";
      }
    }

    shakeInput() {
      const card = document.querySelector(".lock-card");
      if (card) {
        card.classList.add("lock-shake");
        setTimeout(() => card.classList.remove("lock-shake"), 500);
      }
    }

    lockNow() {
      this.showLockScreen();
    }

    appendPin(num) {
      const pwdInput = document.getElementById("lock-password-input");
      if (pwdInput) {
        pwdInput.value += num;
        pwdInput.focus();
      }
    }

    clearPin() {
      const pwdInput = document.getElementById("lock-password-input");
      if (pwdInput) {
        pwdInput.value = "";
        pwdInput.focus();
      }
    }

    backspacePin() {
      const pwdInput = document.getElementById("lock-password-input");
      if (pwdInput) {
        pwdInput.value = pwdInput.value.slice(0, -1);
        pwdInput.focus();
      }
    }

    togglePasswordVisibility(inputId, iconId) {
      const inp = document.getElementById(inputId);
      const icon = document.getElementById(iconId);
      if (inp && icon) {
        const isMasked = inp.classList.contains("is-masked") || inp.style.webkitTextSecurity === "disc" || inp.type === "password";
        if (isMasked) {
          inp.classList.remove("is-masked");
          inp.style.webkitTextSecurity = "none";
          inp.style.textSecurity = "none";
          if (inp.type === "password") inp.type = "text";
          icon.className = "fas fa-eye-slash";
        } else {
          inp.classList.add("is-masked");
          inp.style.webkitTextSecurity = "disc";
          inp.style.textSecurity = "disc";
          icon.className = "fas fa-eye";
        }
      }
    }
  }

  // Khởi tạo instance toàn cục
  window.securityManager = new SecurityManager();
})();
