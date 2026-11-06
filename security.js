/**
 * security.js - Hệ thống Bảo vệ Mật khẩu JLPT N2
 * 
 * QUY TẮC BẢO MẬT:
 * 1. Mật khẩu được cố định trong mã nguồn: APP_PASSWORD = "2504"
 * 2. Tuyệt đối KHÔNG lưu mật khẩu hoặc cờ mở khóa vào localStorage / sessionStorage.
 * 3. Mỗi lần mở tool hoặc tải lại trang trên bất kỳ thiết bị nào, hệ thống luôn bắt buộc nhập mật khẩu.
 * 4. Khi người dùng muốn đổi mật khẩu, chỉ cần ra lệnh cho AI Agent cập nhật trực tiếp tại biến APP_PASSWORD bên dưới.
 */

(function() {
  // ==============================================================
  // MẬT KHẨU CỐ ĐỊNH TRONG MÃ NGUỒN (AI Agent cập nhật tại đây khi có yêu cầu)
  // ==============================================================
  const APP_PASSWORD = "2504";

  class SecurityManager {
    constructor() {
      this.isUnlocked = false;
      this.init();
    }

    init() {
      // Dọn dẹp triệt để bất kỳ cấu hình/cờ cũ trong localStorage / sessionStorage
      try {
        localStorage.removeItem("jlpt_app_security");
        localStorage.removeItem("jlpt_unlocked_device");
        sessionStorage.removeItem("jlpt_unlocked_session");
      } catch (e) {}

      document.addEventListener("DOMContentLoaded", () => {
        this.setupDOM();
        this.showLockScreen();
      });
    }

    setupDOM() {
      const pwdInput = document.getElementById("lock-password-input");
      if (pwdInput) {
        pwdInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.unlock();
          }
        });
      }
    }

    showLockScreen() {
      const lockScreen = document.getElementById("app-lock-screen");
      if (lockScreen) {
        lockScreen.style.display = "flex";
        document.body.style.overflow = "hidden";
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
      const lockScreen = document.getElementById("app-lock-screen");
      if (lockScreen) {
        lockScreen.style.display = "none";
        document.body.style.overflow = "";
      }
    }

    unlock() {
      const pwdInput = document.getElementById("lock-password-input");
      const errMsg = document.getElementById("lock-error-msg");

      if (!pwdInput) return;
      const entered = pwdInput.value.trim();

      if (!entered) {
        this.showError("Vui lòng nhập mật khẩu!");
        pwdInput.focus();
        return;
      }

      if (entered === APP_PASSWORD) {
        this.isUnlocked = true;
        if (errMsg) errMsg.style.display = "none";
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
      this.isUnlocked = false;
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
        if (inp.type === "password") {
          inp.type = "text";
          icon.className = "fas fa-eye-slash";
        } else {
          inp.type = "password";
          icon.className = "fas fa-eye";
        }
      }
    }
  }

  // Khởi tạo instance toàn cục
  window.securityManager = new SecurityManager();
})();
