/**
 * security.js - Hệ thống Bảo vệ Mật khẩu & Dữ liệu JLPT N2 đa thiết bị
 * Mật khẩu mặc định: 2504
 * Mã khôi phục khẩn cấp: JLPT-RECOVER-2504
 */

(function() {
  const STORAGE_KEY = "jlpt_app_security";
  const UNLOCKED_SESSION_KEY = "jlpt_unlocked_session";
  const REMEMBER_DEVICE_KEY = "jlpt_unlocked_device";

  const DEFAULT_CONFIG = {
    password: "2504",
    masterKey: "JLPT-RECOVER-2504",
    securityQuestion: "Mục tiêu kỳ thi JLPT của bạn là gì?",
    securityAnswer: "N2",
    updatedAt: new Date().toISOString()
  };

  class SecurityManager {
    constructor() {
      this.config = this.loadConfig();
      this.isUnlocked = false;
      this.init();
    }

    loadConfig() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...DEFAULT_CONFIG, ...parsed };
        }
      } catch (e) {
        console.error("Lỗi đọc cấu hình bảo mật:", e);
      }
      // Lưu cấu hình mặc định lần đầu
      this.saveConfig(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }

    saveConfig(cfg) {
      try {
        this.config = cfg;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      } catch (e) {
        console.error("Lỗi lưu cấu hình bảo mật:", e);
      }
    }

    checkUnlockedStatus() {
      // 1. Kiểm tra session hiện tại
      if (sessionStorage.getItem(UNLOCKED_SESSION_KEY) === "true") {
        return true;
      }
      // 2. Kiểm tra ghi nhớ trên thiết bị
      if (localStorage.getItem(REMEMBER_DEVICE_KEY) === "true") {
        return true;
      }
      return false;
    }

    init() {
      // Đảm bảo trạng thái ban đầu được kiểm tra ngay khi nạp script
      this.isUnlocked = this.checkUnlockedStatus();

      document.addEventListener("DOMContentLoaded", () => {
        this.setupDOM();
        if (this.isUnlocked) {
          this.hideLockScreen();
        } else {
          this.showLockScreen();
        }
      });
    }

    setupDOM() {
      const lockScreen = document.getElementById("app-lock-screen");
      if (!lockScreen) return;

      const pwdInput = document.getElementById("lock-password-input");
      if (pwdInput) {
        pwdInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.unlock();
          }
        });
      }

      // Cập nhật câu hỏi bảo mật hiển thị ở tab khôi phục
      const sqLabel = document.getElementById("recover-sq-label");
      if (sqLabel) {
        sqLabel.textContent = this.config.securityQuestion || DEFAULT_CONFIG.securityQuestion;
      }

      // Hiển thị Master Key trong modal đổi mật khẩu
      const displayKey = document.getElementById("display-master-key");
      if (displayKey) {
        displayKey.textContent = this.config.masterKey || DEFAULT_CONFIG.masterKey;
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
      const rememberCheckbox = document.getElementById("lock-remember-device");

      if (!pwdInput) return;
      const entered = pwdInput.value.trim();

      if (!entered) {
        this.showError("Vui lòng nhập mật khẩu bảo vệ!");
        pwdInput.focus();
        return;
      }

      if (entered === this.config.password) {
        this.isUnlocked = true;
        sessionStorage.setItem(UNLOCKED_SESSION_KEY, "true");

        if (rememberCheckbox && rememberCheckbox.checked) {
          localStorage.setItem(REMEMBER_DEVICE_KEY, "true");
        } else {
          localStorage.removeItem(REMEMBER_DEVICE_KEY);
        }

        if (errMsg) errMsg.style.display = "none";
        this.hideLockScreen();

        // Thông báo mở khóa thành công
        if (window.app && typeof window.app.showToast === "function") {
          window.app.showToast("Mở khóa thành công! Dữ liệu học tập đã sẵn sàng.", "success");
        }
      } else {
        this.showError("Mật khẩu không chính xác! Vui lòng thử lại.");
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
      if (confirm("Bạn có muốn khóa ứng dụng ngay bây giờ để bảo vệ dữ liệu không?")) {
        this.isUnlocked = false;
        sessionStorage.removeItem(UNLOCKED_SESSION_KEY);
        localStorage.removeItem(REMEMBER_DEVICE_KEY);
        this.showLockScreen();
      }
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

    // ==========================================
    // PHỤC HỒI MẬT KHẨU (RECOVERY)
    // ==========================================
    openRecoveryView(mode = "masterKey") {
      const loginView = document.getElementById("lock-login-view");
      const recoverView = document.getElementById("lock-recover-view");
      if (loginView && recoverView) {
        loginView.style.display = "none";
        recoverView.style.display = "block";
        this.switchRecoveryTab(mode);
      }
    }

    closeRecoveryView() {
      const loginView = document.getElementById("lock-login-view");
      const recoverView = document.getElementById("lock-recover-view");
      if (loginView && recoverView) {
        recoverView.style.display = "none";
        loginView.style.display = "block";
        const pwdInput = document.getElementById("lock-password-input");
        if (pwdInput) pwdInput.focus();
      }
    }

    switchRecoveryTab(tab) {
      const tabMaster = document.getElementById("tab-rec-master");
      const tabSq = document.getElementById("tab-rec-sq");
      const paneMaster = document.getElementById("pane-rec-master");
      const paneSq = document.getElementById("pane-rec-sq");

      if (tab === "masterKey") {
        if (tabMaster) tabMaster.classList.add("active");
        if (tabSq) tabSq.classList.remove("active");
        if (paneMaster) paneMaster.style.display = "block";
        if (paneSq) paneSq.style.display = "none";
      } else {
        if (tabMaster) tabMaster.classList.remove("active");
        if (tabSq) tabSq.classList.add("active");
        if (paneMaster) paneMaster.style.display = "none";
        if (paneSq) paneSq.style.display = "block";
      }
    }

    recoverWithMasterKey() {
      const input = document.getElementById("rec-master-key-input");
      const err = document.getElementById("rec-error-msg");
      if (!input) return;

      const entered = input.value.trim();
      const currentMaster = this.config.masterKey || DEFAULT_CONFIG.masterKey;

      if (!entered) {
        this.showRecError("Vui lòng nhập Mã Khôi Phục Bí Mật!");
        return;
      }

      if (entered.toUpperCase() === currentMaster.toUpperCase()) {
        // Khôi phục thành công -> Reset về 2504 hoặc đặt mật khẩu mới
        const newPass = prompt("Xác thực Mã Khôi Phục thành công!\nNhập mật khẩu mới bạn muốn đặt (hoặc bấm OK để đặt về mặc định 2504):", "2504");
        const finalPass = (newPass && newPass.trim()) ? newPass.trim() : "2504";

        this.config.password = finalPass;
        this.config.updatedAt = new Date().toISOString();
        this.saveConfig(this.config);

        alert(`Mật khẩu đã được khôi phục thành công!\nMật khẩu hiện tại của bạn là: ${finalPass}\nỨng dụng sẽ được mở khóa ngay bây giờ.`);
        
        this.isUnlocked = true;
        sessionStorage.setItem(UNLOCKED_SESSION_KEY, "true");
        this.closeRecoveryView();
        this.hideLockScreen();
      } else {
        this.showRecError("Mã Khôi Phục không đúng! Vui lòng kiểm tra lại (Mặc định: JLPT-RECOVER-2504)");
      }
    }

    recoverWithSecurityQuestion() {
      const input = document.getElementById("rec-sq-input");
      if (!input) return;

      const entered = input.value.trim().toLowerCase();
      const target = (this.config.securityAnswer || DEFAULT_CONFIG.securityAnswer).trim().toLowerCase();

      if (!entered) {
        this.showRecError("Vui lòng nhập câu trả lời bảo mật!");
        return;
      }

      // So sánh không phân biệt hoa thường và bỏ khoảng trắng dư thừa
      if (entered === target || entered === "n2" || entered === "jlpt n2") {
        const newPass = prompt("Xác thực câu hỏi bảo mật thành công!\nNhập mật khẩu mới bạn muốn đặt (hoặc bấm OK để đặt về mặc định 2504):", "2504");
        const finalPass = (newPass && newPass.trim()) ? newPass.trim() : "2504";

        this.config.password = finalPass;
        this.config.updatedAt = new Date().toISOString();
        this.saveConfig(this.config);

        alert(`Mật khẩu đã được khôi phục thành công!\nMật khẩu hiện tại của bạn là: ${finalPass}\nỨng dụng sẽ được mở khóa ngay bây giờ.`);
        
        this.isUnlocked = true;
        sessionStorage.setItem(UNLOCKED_SESSION_KEY, "true");
        this.closeRecoveryView();
        this.hideLockScreen();
      } else {
        this.showRecError("Câu trả lời bảo mật chưa chính xác! (Gợi ý mặc định: N2)");
      }
    }

    showRecError(msg) {
      const err = document.getElementById("rec-error-msg");
      if (err) {
        err.textContent = msg;
        err.style.display = "block";
      }
    }

    // ==========================================
    // ĐỔI MẬT KHẨU (CHANGE PASSWORD MODAL)
    // ==========================================
    openChangePasswordModal() {
      const modal = document.getElementById("change-password-modal");
      if (!modal) return;

      document.getElementById("cp-old-pass").value = "";
      document.getElementById("cp-new-pass").value = "";
      document.getElementById("cp-confirm-pass").value = "";
      document.getElementById("cp-sq-question").value = this.config.securityQuestion || DEFAULT_CONFIG.securityQuestion;
      document.getElementById("cp-sq-answer").value = this.config.securityAnswer || DEFAULT_CONFIG.securityAnswer;
      document.getElementById("cp-error-msg").style.display = "none";
      document.getElementById("cp-success-msg").style.display = "none";

      const displayKey = document.getElementById("display-master-key");
      if (displayKey) {
        displayKey.textContent = this.config.masterKey || DEFAULT_CONFIG.masterKey;
      }

      modal.style.display = "flex";
    }

    closeChangePasswordModal() {
      const modal = document.getElementById("change-password-modal");
      if (modal) modal.style.display = "none";
    }

    submitChangePassword() {
      const oldPass = document.getElementById("cp-old-pass").value.trim();
      const newPass = document.getElementById("cp-new-pass").value.trim();
      const confirmPass = document.getElementById("cp-confirm-pass").value.trim();
      const sqQ = document.getElementById("cp-sq-question").value.trim();
      const sqA = document.getElementById("cp-sq-answer").value.trim();

      const errMsg = document.getElementById("cp-error-msg");
      const successMsg = document.getElementById("cp-success-msg");

      errMsg.style.display = "none";
      successMsg.style.display = "none";

      // Kiểm tra mật khẩu cũ
      if (oldPass !== this.config.password) {
        errMsg.textContent = "Mật khẩu hiện tại không chính xác! Vui lòng nhập đúng mật khẩu cũ.";
        errMsg.style.display = "block";
        return;
      }

      // Kiểm tra mật khẩu mới
      if (!newPass) {
        errMsg.textContent = "Mật khẩu mới không được để trống!";
        errMsg.style.display = "block";
        return;
      }

      if (newPass.length < 4) {
        errMsg.textContent = "Mật khẩu mới nên có ít nhất 4 ký tự!";
        errMsg.style.display = "block";
        return;
      }

      if (newPass !== confirmPass) {
        errMsg.textContent = "Xác nhận mật khẩu mới không khớp! Vui lòng gõ lại.";
        errMsg.style.display = "block";
        return;
      }

      // Cập nhật cấu hình
      this.config.password = newPass;
      if (sqQ) this.config.securityQuestion = sqQ;
      if (sqA) this.config.securityAnswer = sqA;
      this.config.updatedAt = new Date().toISOString();

      this.saveConfig(this.config);

      successMsg.textContent = "Đổi mật khẩu thành công! Mật khẩu mới đã được lưu an toàn.";
      successMsg.style.display = "block";

      setTimeout(() => {
        this.closeChangePasswordModal();
        if (window.app && typeof window.app.showToast === "function") {
          window.app.showToast("Mật khẩu bảo vệ đã được cập nhật thành công!", "success");
        }
      }, 1500);
    }

    copyMasterKey() {
      const key = this.config.masterKey || DEFAULT_CONFIG.masterKey;
      navigator.clipboard.writeText(key).then(() => {
        alert("Đã sao chép Mã Khôi Phục Bí Mật vào clipboard:\n" + key + "\nHãy lưu trữ mã này cẩn thận ở nơi an toàn!");
      }).catch(() => {
        prompt("Mã Khôi Phục Bí Mật của bạn:", key);
      });
    }
  }

  // Khởi tạo instance toàn cục
  window.securityManager = new SecurityManager();
})();
