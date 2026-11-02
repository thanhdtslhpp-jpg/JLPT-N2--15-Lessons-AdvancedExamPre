// cloud_sync.js - Module Đồng Bộ Đám Mây Realtime với Mã Hóa Đầu Cuối (E2EE AES-256)
// Sử dụng Google Firebase Realtime Database & Browser Native Web Cryptography API

class JLPTCloudSync {
  constructor(app) {
    this.app = app;
    this.defaultDbUrl = "https://jlpt-n215-lessons-default-rtdb.firebaseio.com";
    this.storageKey = "jlpt_cloud_sync_config";
    this.config = this.loadConfig();
    this.isSyncing = false;
    this.debounceTimer = null;
    this.lastSyncTime = this.config.lastSyncedAt || null;
  }

  loadConfig() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          enabled: !!parsed.enabled,
          dbUrl: parsed.dbUrl || this.defaultDbUrl,
          syncId: parsed.syncId || "",
          passphrase: parsed.passphrase || "",
          lastSyncedAt: parsed.lastSyncedAt || 0
        };
      }
    } catch (e) {}
    return {
      enabled: false,
      dbUrl: this.defaultDbUrl,
      syncId: "",
      passphrase: "",
      lastSyncedAt: 0
    };
  }

  saveConfig(cfg) {
    this.config = { ...this.config, ...cfg };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (e) {}
    this.updateCloudStatusUI();
  }

  // --- MÃ HÓA ĐẦU CUỐI BẢO MẬT (AES-GCM 256-bit + PBKDF2 100,000 Rounds) ---
  async deriveKey(passphrase, saltBytes) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(passphrase),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async hashId(id) {
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(id.trim().toLowerCase()));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 24);
  }

  arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async encrypt(dataObj, passphrase) {
    const enc = new TextEncoder();
    const jsonStr = JSON.stringify(dataObj);
    const plaintextBytes = enc.encode(jsonStr);

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(passphrase, salt);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      plaintextBytes
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertextBuffer),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt),
      updatedAt: Date.now(),
      version: "2.0",
      device: navigator.userAgent.includes("Mobile") ? "Mobile" : "Desktop"
    };
  }

  async decrypt(payload, passphrase) {
    if (!payload || !payload.ciphertext || !payload.iv || !payload.salt) {
      throw new Error("Dữ liệu trên đám mây không đúng định dạng.");
    }
    const ciphertext = this.base64ToArrayBuffer(payload.ciphertext);
    const iv = new Uint8Array(this.base64ToArrayBuffer(payload.iv));
    const salt = new Uint8Array(this.base64ToArrayBuffer(payload.salt));

    const key = await this.deriveKey(passphrase, salt);
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(plaintextBuffer);
    return JSON.parse(jsonStr);
  }

  // --- KẾT NỐI VÀ ĐỒNG BỘ ĐÁM MÂY (FIREBASE REST API) ---
  getEndpointUrl() {
    const base = (this.config.dbUrl || this.defaultDbUrl).replace(/\/+$/, "");
    return base;
  }

  async push(force = false) {
    if (!this.config.enabled || !this.config.syncId || !this.config.passphrase) return false;
    if (this.isSyncing && !force) return false;

    this.isSyncing = true;
    this.updateCloudStatusUI("syncing", "Đang lưu lên đám mây...");

    try {
      const allData = this.app.exportAllUserData();
      const encryptedPayload = await this.encrypt(allData, this.config.passphrase);
      const userHash = await this.hashId(this.config.syncId);
      const url = `${this.getEndpointUrl()}/jlpt_users/${userHash}.json`;

      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(encryptedPayload)
      });

      if (!res.ok) throw new Error(`Lỗi kết nối Firebase (HTTP ${res.status})`);

      this.lastSyncTime = encryptedPayload.updatedAt;
      this.saveConfig({ lastSyncedAt: this.lastSyncTime });
      this.updateCloudStatusUI("success", `Đã đồng bộ lên đám mây (${this.formatTime(this.lastSyncTime)})`);
      return true;
    } catch (e) {
      console.warn("Cloud push error:", e);
      this.updateCloudStatusUI("error", `Không thể gửi dữ liệu: ${e.message}`);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  async pull(silent = false) {
    if (!this.config.enabled || !this.config.syncId || !this.config.passphrase) return false;

    this.isSyncing = true;
    if (!silent) this.updateCloudStatusUI("syncing", "Đang kiểm tra đám mây...");

    try {
      const userHash = await this.hashId(this.config.syncId);
      const url = `${this.getEndpointUrl()}/jlpt_users/${userHash}.json`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Lỗi kết nối Firebase (HTTP ${res.status})`);
      const payload = await res.json();

      if (!payload) {
        // Trên đám mây chưa có dữ liệu nào cho tài khoản này -> Đẩy bài làm hiện tại lên làm gốc
        console.log("No cloud data found for this syncId. Pushing local data as initial cloud copy.");
        await this.push(true);
        return true;
      }

      // Giải mã dữ liệu E2EE bằng passphrase của người dùng
      let decryptedData;
      try {
        decryptedData = await this.decrypt(payload, this.config.passphrase);
      } catch (err) {
        console.error("Decryption failed:", err);
        const errMsg = "Mật khẩu mã hóa E2EE không chính xác! Không thể giải mã dữ liệu.";
        this.updateCloudStatusUI("error", errMsg);
        if (!silent) alert(errMsg + "\n\nVui lòng kiểm tra lại Mật khẩu bí mật trên thiết bị này.");
        return false;
      }

      if (decryptedData) {
        // Nhập và hòa trộn dữ liệu vào máy này
        this.app.importAllUserData(decryptedData);
        this.lastSyncTime = payload.updatedAt || Date.now();
        this.saveConfig({ lastSyncedAt: this.lastSyncTime });
        this.updateCloudStatusUI("success", `Đã đồng bộ từ đám mây (${this.formatTime(this.lastSyncTime)})`);
        return true;
      }
    } catch (e) {
      console.warn("Cloud pull error:", e);
      this.updateCloudStatusUI("error", `Lỗi nạp dữ liệu: ${e.message}`);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // Tự động kích hoạt lưu ngầm sau khi người dùng dừng thao tác
  triggerDebouncedPush(delayMs = 1200) {
    if (!this.config.enabled) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.push();
    }, delayMs);
  }

  formatTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  updateCloudStatusUI(state = null, message = null) {
    const badgeEl = document.getElementById("cloud-sync-badge");
    const statusTextEl = document.getElementById("cloud-sync-status-text");
    const modalStatusBox = document.getElementById("modal-cloud-status");

    const isConnected = this.config.enabled && !!this.config.syncId && !!this.config.passphrase;

    let dotColor = "#94a3b8"; // grey
    let displayText = "Chưa kết nối Cloud";

    if (isConnected) {
      if (state === "syncing") {
        dotColor = "#3b82f6"; // blue
        displayText = "Đang đồng bộ...";
      } else if (state === "error") {
        dotColor = "#ef4444"; // red
        displayText = "Lỗi đồng bộ";
      } else {
        dotColor = "#10b981"; // green
        displayText = this.lastSyncTime ? `Đã đồng bộ (${this.formatTime(this.lastSyncTime)})` : "Cloud sẵn sàng";
      }
    }

    if (badgeEl) {
      badgeEl.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${dotColor}; margin-right:5px; box-shadow: 0 0 6px ${dotColor};"></span><i class="fas fa-cloud"></i> ${displayText}`;
      badgeEl.title = isConnected ? `Đám mây Firebase: Đang kết nối (${this.config.syncId})` : "Bấm để thiết lập đồng bộ đám mây tự động";
    }

    if (statusTextEl) {
      statusTextEl.textContent = displayText;
    }

    if (modalStatusBox) {
      if (!isConnected) {
        modalStatusBox.innerHTML = `
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--text-sub); font-size:0.85rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:#94a3b8; display:inline-block;"></span>
            <span>Chưa bật đồng bộ đám mây tự động trên thiết bị này.</span>
          </div>
        `;
      } else if (state === "error") {
        modalStatusBox.innerHTML = `
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--error); font-size:0.85rem; font-weight:600;">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message || "Lỗi đồng bộ"}</span>
          </div>
        `;
      } else {
        modalStatusBox.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem; font-size:0.85rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; color:#10b981; font-weight:600;">
              <span style="width:10px; height:10px; border-radius:50%; background:#10b981; display:inline-block; box-shadow:0 0 6px #10b981;"></span>
              <span>Đang kết nối: <b>${this.config.syncId}</b> (Mã hóa AES-256 E2EE)</span>
            </div>
            <span style="color:var(--text-sub); font-size:0.8rem;">Lần cuối: ${this.lastSyncTime ? this.formatTime(this.lastSyncTime) : "Vừa xong"}</span>
          </div>
        `;
      }
    }
  }
}

window.JLPTCloudSync = JLPTCloudSync;
