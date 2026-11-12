// JLPT N2 Practice App Core Logic - Enhanced & Robust
class JLPTApp {
  constructor() {
    this.currentSessionId = 1;
    this.currentMode = "practice"; // "practice" | "exam"
    this.activeFilter = "all"; // "all" | sectionId
    this.userAnswers = {}; // { questionId: selectedNumber }
    this.starAnswers = {}; // { questionId: [slot0, slot1, slot2, slot3] }
    this.selectedStarSlot = null; // { qId, slotIndex } cho phep chon o truoc khi bam tu
    this.currentDraggedStar = null;
    this.activeQuestionId = null;
    this.timerInterval = null;
    this.timeLeftSeconds = 105 * 60; // 105 phút thi thật N2
    this.cleanSharedDraftsOnce();
    this.syncFromDisk();
    this.history = JSON.parse(localStorage.getItem("jlpt_n2_history") || "{}");
    this.bookmarks = JSON.parse(localStorage.getItem("jlpt_n2_bookmarks") || "{}");
    this.wrongQuestions = JSON.parse(localStorage.getItem("jlpt_n2_wrong_questions") || "{}");
    this.fontSizeLevel = localStorage.getItem("jlpt_font_size") || "normal"; // normal | lg | xl
    this.enableMaziiLookup = localStorage.getItem("jlpt_enable_mazii") !== "false";
    this.splitReadingMode = localStorage.getItem("jlpt_split_reading") === "true";
    this.showFurigana = localStorage.getItem("jlpt_show_furigana") !== "false";
    this.highlights = JSON.parse(localStorage.getItem("jlpt_highlights") || "{}");
    this.dictCache = JSON.parse(localStorage.getItem("jlpt_dict_cache") || "{}");
    this.audioListened = JSON.parse(localStorage.getItem("jlpt_audio_listened") || "{}");
    this.audioSpeeds = {};
    this.choukaiPeek = {};
    this.isExamSubmitted = false;
    this.keigoPracticeAnswers = {};
    this.keigoShowAllAnswers = false;
    try {
      const savedKeigo = localStorage.getItem("jlpt_keigo_practice_answers");
      if (savedKeigo) {
        this.keigoPracticeAnswers = JSON.parse(savedKeigo);
      }
    } catch (e) {}
    this.saveTimeout = null;
    this.savedSelectionRange = null;
    this.currentAudioEl = null;
    this.cachedVoices = [];
    if ("speechSynthesis" in window) {
      try {
        this.cachedVoices = window.speechSynthesis.getVoices() || [];
        window.speechSynthesis.onvoiceschanged = () => {
          this.cachedVoices = window.speechSynthesis.getVoices() || [];
        };
      } catch (e) {}
    }

    this.cloudSync = window.JLPTCloudSync ? new window.JLPTCloudSync(this) : null;
    this.init();
  }

  cleanSharedDraftsOnce() {
    // Đã hoàn tất dọn dẹp các bản nháp mẫu cũ, tuyệt đối không can thiệp hay xóa dữ liệu làm bài của người dùng
  }

  syncFromDisk() {
    if (window.JLPT_SYNC_DATA && typeof window.JLPT_SYNC_DATA === "object") {
      try {
        const sync = window.JLPT_SYNC_DATA;
        for (const [key, val] of Object.entries(sync)) {
          if (!val) continue;
          const strVal = typeof val === "object" ? JSON.stringify(val) : String(val);

          if (key === "jlpt_dict_cache") {
            const currentVal = localStorage.getItem("jlpt_dict_cache");
            if (!currentVal || currentVal === "{}") {
              localStorage.setItem("jlpt_dict_cache", strVal);
            }
          } else if (key.startsWith("jlpt_draft_")) {
            const curVal = localStorage.getItem(key);
            if (!curVal) {
              localStorage.setItem(key, strVal);
            } else {
              try {
                const curObj = JSON.parse(curVal);
                const syncObj = typeof val === "string" ? JSON.parse(val) : val;
                const mergedAnswers = { ...(syncObj.userAnswers || {}), ...(curObj.userAnswers || {}) };
                const mergedStar = { ...(syncObj.starAnswers || {}), ...(curObj.starAnswers || {}) };
                const maxTime = Math.max(syncObj.updatedAt || 0, curObj.updatedAt || 0);
                curObj.userAnswers = mergedAnswers;
                curObj.starAnswers = mergedStar;
                curObj.updatedAt = maxTime;
                localStorage.setItem(key, JSON.stringify(curObj));
              } catch (e) {
                localStorage.setItem(key, strVal);
              }
            }
          } else if (key === "jlpt_n2_bookmarks" || key === "jlpt_n2_wrong_questions") {
            try {
              const curMap = JSON.parse(localStorage.getItem(key) || "{}");
              const syncMap = typeof val === "string" ? JSON.parse(val) : val;
              for (const [sess, list] of Object.entries(syncMap)) {
                if (Array.isArray(list)) {
                  curMap[sess] = Array.from(new Set([...(curMap[sess] || []), ...list]));
                }
              }
              localStorage.setItem(key, JSON.stringify(curMap));
            } catch (e) {
              localStorage.setItem(key, strVal);
            }
          } else if (key === "jlpt_n2_history") {
            try {
              const curHist = JSON.parse(localStorage.getItem(key) || "{}");
              const syncHist = typeof val === "string" ? JSON.parse(val) : val;
              for (const [sess, list] of Object.entries(syncHist)) {
                if (Array.isArray(list)) {
                  curHist[sess] = curHist[sess] || [];
                  for (const item of list) {
                    if (!curHist[sess].some(x => x.date === item.date)) {
                      curHist[sess].push(item);
                    }
                  }
                }
              }
              localStorage.setItem(key, JSON.stringify(curHist));
            } catch (e) {
              localStorage.setItem(key, strVal);
            }
          } else if (key === "jlpt_audio_listened") {
            try {
              const curAudio = JSON.parse(localStorage.getItem(key) || "{}");
              const syncAudio = typeof val === "string" ? JSON.parse(val) : val;
              for (const [aKey, aVal] of Object.entries(syncAudio)) {
                curAudio[aKey] = curAudio[aKey] || aVal;
              }
              localStorage.setItem(key, JSON.stringify(curAudio));
            } catch (e) {
              localStorage.setItem(key, strVal);
            }
          } else {
            if (!localStorage.getItem(key)) {
              localStorage.setItem(key, strVal);
            }
          }
        }
      } catch (err) {
        console.warn("[JLPT Sync] Loi khi dong bo user_data.js:", err);
      }
    }
  }

  openSyncModal() {
    const modal = document.getElementById("sync-modal");
    if (modal) modal.style.display = "flex";
    const msg = document.getElementById("sync-status-msg");
    if (msg) msg.style.display = "none";
    if (this.cloudSync) {
      const idInput = document.getElementById("cloud-input-id");
      const passInput = document.getElementById("cloud-input-pass");
      if (idInput) idInput.value = this.cloudSync.config.syncId || "";
      if (passInput) passInput.value = this.cloudSync.config.passphrase || "";
      this.cloudSync.updateCloudStatusUI();
    }
  }

  closeSyncModal() {
    const modal = document.getElementById("sync-modal");
    if (modal) modal.style.display = "none";
  }

  exportAllUserData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("jlpt_") || k.includes("jlpt")) && k !== "jlpt_cloud_sync_config") {
        data[k] = localStorage.getItem(k);
      }
    }
    return data;
  }

  importAllUserData(dataObj) {
    if (!dataObj || typeof dataObj !== "object") return false;
    let count = 0;
    for (const [key, val] of Object.entries(dataObj)) {
      if (!val) continue;
      const strVal = typeof val === "object" ? JSON.stringify(val) : String(val);

      if (key.startsWith("jlpt_draft_")) {
        const curVal = localStorage.getItem(key);
        if (!curVal) {
          localStorage.setItem(key, strVal);
        } else {
          try {
            const curObj = JSON.parse(curVal);
            const syncObj = typeof val === "string" ? JSON.parse(val) : val;
            const mergedAnswers = { ...(syncObj.userAnswers || {}), ...(curObj.userAnswers || {}) };
            const mergedStar = { ...(syncObj.starAnswers || {}), ...(curObj.starAnswers || {}) };
            const maxTime = Math.max(syncObj.updatedAt || 0, curObj.updatedAt || 0);
            curObj.userAnswers = mergedAnswers;
            curObj.starAnswers = mergedStar;
            curObj.updatedAt = maxTime;
            localStorage.setItem(key, JSON.stringify(curObj));
          } catch (e) {
            localStorage.setItem(key, strVal);
          }
        }
        count++;
      } else if (key === "jlpt_n2_bookmarks" || key === "jlpt_n2_wrong_questions") {
        try {
          const curMap = JSON.parse(localStorage.getItem(key) || "{}");
          const syncMap = typeof val === "string" ? JSON.parse(val) : val;
          for (const [sess, list] of Object.entries(syncMap)) {
            if (Array.isArray(list)) {
              curMap[sess] = Array.from(new Set([...(curMap[sess] || []), ...list]));
            }
          }
          localStorage.setItem(key, JSON.stringify(curMap));
        } catch (e) {
          localStorage.setItem(key, strVal);
        }
        count++;
      } else if (key === "jlpt_n2_history") {
        try {
          const curHist = JSON.parse(localStorage.getItem(key) || "{}");
          const syncHist = typeof val === "string" ? JSON.parse(val) : val;
          for (const [sess, list] of Object.entries(syncHist)) {
            if (Array.isArray(list)) {
              curHist[sess] = curHist[sess] || [];
              for (const item of list) {
                if (!curHist[sess].some(x => x.date === item.date)) {
                  curHist[sess].push(item);
                }
              }
            }
          }
          localStorage.setItem(key, JSON.stringify(curHist));
        } catch (e) {
          localStorage.setItem(key, strVal);
        }
        count++;
      } else {
        localStorage.setItem(key, strVal);
        count++;
      }
    }

    // Refresh current instance state
    this.history = JSON.parse(localStorage.getItem("jlpt_n2_history") || "{}");
    this.bookmarks = JSON.parse(localStorage.getItem("jlpt_n2_bookmarks") || "{}");
    this.wrongQuestions = JSON.parse(localStorage.getItem("jlpt_n2_wrong_questions") || "{}");
    if (this.currentSessionId) {
      this.loadDraftAnswers(this.currentSessionId);
      this.syncWrongAndBookmarkedQuestions(this.currentSessionId);
      const practiceView = document.getElementById("view-practice");
      if (practiceView && practiceView.style.display !== "none") {
        this.renderQuestions();
        this.updatePallet();
        this.renderFilterTabs();
      }
    }
    this.renderDashboard();
    return true;
  }

  copySyncCode() {
    try {
      const data = this.exportAllUserData();
      const jsonStr = JSON.stringify(data);
      const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
      navigator.clipboard.writeText(b64).then(() => {
        this.showSyncStatus("✅ Đã sao chép Mã Đồng Bộ vào Clipboard! Bạn hãy mở link trên thiết bị khác và dán mã này vào mục 'Nạp Dữ Liệu'.", "success");
      }).catch(() => {
        window.prompt("Sao chép mã đồng bộ này và dán sang thiết bị khác:", b64);
      });
    } catch (e) {
      this.showSyncStatus("❌ Lỗi khi tạo mã: " + e.message, "error");
    }
  }

  applySyncCode() {
    const input = document.getElementById("input-sync-code");
    const code = (input ? input.value : "").trim();
    if (!code) {
      this.showSyncStatus("⚠️ Vui lòng dán mã đồng bộ vào ô trước khi nạp.", "warning");
      return;
    }
    try {
      const jsonStr = decodeURIComponent(escape(atob(code)));
      const dataObj = JSON.parse(jsonStr);
      const ok = this.importAllUserData(dataObj);
      if (ok) {
        this.showSyncStatus("🎉 Đồng bộ thành công! Toàn bộ bài làm dở, câu sai và dấu sao đã được cập nhật.", "success");
        if (input) input.value = "";
      }
    } catch (e) {
      this.showSyncStatus("❌ Mã đồng bộ không hợp lệ: " + e.message, "error");
    }
  }

  downloadBackupFile() {
    try {
      const data = this.exportAllUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jlpt_n2_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showSyncStatus("✅ Đã tải file sao lưu về máy thành công!", "success");
    } catch (e) {
      this.showSyncStatus("❌ Lỗi khi tải file: " + e.message, "error");
    }
  }

  restoreFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dataObj = JSON.parse(e.target.result);
        const ok = this.importAllUserData(dataObj);
        if (ok) {
          this.showSyncStatus("🎉 Khôi phục từ file thành công! Toàn bộ tiến độ đã được cập nhật.", "success");
        }
      } catch (err) {
        this.showSyncStatus("❌ File JSON không hợp lệ: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  }

  showSyncStatus(text, type = "info") {
    const el = document.getElementById("sync-status-msg");
    if (!el) return;
    el.style.display = "block";
    el.style.color = type === "success" ? "var(--success)" : type === "error" ? "var(--error)" : "var(--primary)";
    el.innerHTML = text;
  }

  init() {
    this.setupTheme();
    this.setupFurigana();
    this.updateMaziiToggleUI();
    this.renderDashboard();
    this.bindEvents();
    this.setupHistoryRouting();
    if (this.cloudSync) {
      this.cloudSync.updateCloudStatusUI();
      if (this.cloudSync.config.enabled) {
        this.cloudSync.pull(true);
      }
    }
  }

  setupTheme() {
    const isDark = localStorage.getItem("jlpt_theme") === "dark";
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }

  setupFurigana() {
    if (!this.showFurigana) {
      document.body.classList.add("hide-furigana");
    }
    const btn = document.getElementById("btn-toggle-furigana");
    if (btn) btn.classList.toggle("active", this.showFurigana);
    const btnSide = document.getElementById("btn-sidebar-furigana");
    if (btnSide) btnSide.classList.toggle("active", this.showFurigana);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("jlpt_theme", next);
  }

  toggleFurigana() {
    this.showFurigana = !this.showFurigana;
    localStorage.setItem("jlpt_show_furigana", String(this.showFurigana));
    document.body.classList.toggle("hide-furigana", !this.showFurigana);
    const btn = document.getElementById("btn-toggle-furigana");
    if (btn) btn.classList.toggle("active", this.showFurigana);
    const btnSide = document.getElementById("btn-sidebar-furigana");
    if (btnSide) btnSide.classList.toggle("active", this.showFurigana);
  }

  setupHistoryRouting() {
    const parseHash = () => {
      const hash = window.location.hash || "";
      if (hash.startsWith("#session=")) {
        const sId = hash.replace("#session=", "").trim();
        if (sId) return { view: "session", sessionId: sId };
      } else if (hash.startsWith("#cheatsheet=")) {
        const csId = hash.replace("#cheatsheet=", "").trim();
        if (csId) return { view: "cheatsheet", csId: csId };
      }
      return { view: "dashboard" };
    };

    // Khởi tạo trạng thái ban đầu
    const initial = parseHash();
    if (initial.view === "session") {
      history.replaceState({ view: "dashboard" }, document.title, window.location.pathname + window.location.search);
      history.pushState(initial, document.title, window.location.hash);
      this.loadSession(initial.sessionId, false);
    } else if (initial.view === "cheatsheet") {
      history.replaceState({ view: "dashboard" }, document.title, window.location.pathname + window.location.search);
      history.pushState(initial, document.title, window.location.hash);
      this.openCheatsheet(initial.csId, false);
    } else {
      history.replaceState({ view: "dashboard" }, document.title, window.location.pathname + window.location.search);
    }

    // Lắng nghe nút Back / Forward của trình duyệt hoặc cử chỉ vuốt Back trên điện thoại
    window.addEventListener("popstate", (e) => {
      const csModal = document.getElementById("cheatsheet-modal");
      const isCsOpen = csModal && (csModal.style.display === "flex" || csModal.style.display === "block");

      const syncModal = document.getElementById("sync-modal");
      if (syncModal && syncModal.style.display === "flex") {
        this.closeSyncModal();
        return;
      }

      const floatPallet = document.getElementById("floating-pallet-modal");
      if (floatPallet && floatPallet.classList.contains("active")) {
        floatPallet.classList.remove("active");
        return;
      }

      const state = e.state || parseHash();

      if (state && state.view === "cheatsheet" && state.csId) {
        this.openCheatsheet(state.csId, false);
      } else if (state && state.view === "session" && state.sessionId) {
        if (isCsOpen) this.closeCheatsheet(false);
        this.loadSession(state.sessionId, false);
      } else {
        // Quay về Dashboard an toàn tuyệt đối
        if (isCsOpen) this.closeCheatsheet(false);
        this.showDashboard(false);
      }
    });
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {}
    try {
      document.body.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {}
  }

  bindEvents() {
    this.initScrollSpy();
    document.getElementById("btn-dashboard").addEventListener("click", () => this.showDashboard());
    const btnBack = document.getElementById("btn-back-dashboard");
    if (btnBack) {
      btnBack.addEventListener("click", () => {
        if (window.history.state && window.history.state.view === "session") {
          window.history.back();
        } else {
          this.showDashboard(true);
        }
      });
    }

    document.getElementById("theme-toggle").addEventListener("click", () => this.toggleTheme());

    const btnSyncModal = document.getElementById("btn-sync-modal");
    if (btnSyncModal) {
      btnSyncModal.addEventListener("click", () => this.openSyncModal());
    }

    const btnCloseSync = document.getElementById("btn-close-sync-modal");
    if (btnCloseSync) {
      btnCloseSync.addEventListener("click", () => this.closeSyncModal());
    }

    const syncModal = document.getElementById("sync-modal");
    if (syncModal) {
      syncModal.addEventListener("click", (e) => {
        if (e.target === syncModal) this.closeSyncModal();
      });
    }

    const btnCopySync = document.getElementById("btn-copy-sync-code");
    if (btnCopySync) {
      btnCopySync.addEventListener("click", () => this.copySyncCode());
    }

    const btnApplySync = document.getElementById("btn-apply-sync-code");
    if (btnApplySync) {
      btnApplySync.addEventListener("click", () => this.applySyncCode());
    }

    const btnDownloadBackup = document.getElementById("btn-download-backup");
    if (btnDownloadBackup) {
      btnDownloadBackup.addEventListener("click", () => this.downloadBackupFile());
    }

    const fileRestore = document.getElementById("file-restore-backup");
    if (fileRestore) {
      fileRestore.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
          this.restoreFromFile(e.target.files[0]);
        }
      });
    }

    // Cloud Firebase E2EE Sync listeners
    const btnTogglePass = document.getElementById("btn-toggle-show-pass");
    if (btnTogglePass) {
      btnTogglePass.addEventListener("click", () => {
        const passInput = document.getElementById("cloud-input-pass");
        const icon = document.getElementById("icon-toggle-pass");
        if (passInput) {
          const isMasked = passInput.classList.contains("is-masked") || passInput.style.webkitTextSecurity === "disc" || passInput.type === "password";
          if (isMasked) {
            passInput.classList.remove("is-masked");
            passInput.style.webkitTextSecurity = "none";
            passInput.style.textSecurity = "none";
            if (passInput.type === "password") passInput.type = "text";
            if (icon) icon.className = "far fa-eye-slash";
          } else {
            passInput.classList.add("is-masked");
            passInput.style.webkitTextSecurity = "disc";
            passInput.style.textSecurity = "disc";
            if (icon) icon.className = "far fa-eye";
          }
        }
      });
    }

    const btnSaveCloud = document.getElementById("btn-save-cloud-config");
    if (btnSaveCloud) {
      btnSaveCloud.addEventListener("click", async () => {
        const idInput = document.getElementById("cloud-input-id");
        const passInput = document.getElementById("cloud-input-pass");
        const syncId = (idInput ? idInput.value : "").trim();
        const passphrase = (passInput ? passInput.value : "").trim();

        if (!syncId || !passphrase) {
          this.showSyncStatus("⚠️ Vui lòng nhập Tên Đồng Bộ và Mật Khẩu Khóa Bí Mật!", "error");
          return;
        }

        if (this.cloudSync) {
          this.cloudSync.saveConfig({ enabled: true, syncId, passphrase });
          this.showSyncStatus("🔄 Đang kết nối và đồng bộ với Đám mây Firebase...", "info");
          const ok = await this.cloudSync.pull(false);
          if (ok) {
            this.showSyncStatus("🎉 Đã kết nối và đồng bộ Đám mây Firebase thành công! Tiến độ làm bài sẽ tự động đồng bộ ngầm.", "success");
          }
        }
      });
    }

    const btnCloudSyncNow = document.getElementById("btn-cloud-sync-now");
    if (btnCloudSyncNow) {
      btnCloudSyncNow.addEventListener("click", async () => {
        if (!this.cloudSync || !this.cloudSync.config.enabled) {
          this.showSyncStatus("⚠️ Vui lòng nhập Tên và Mật khẩu rồi bấm 'Bật & Kết Nối Đám Mây' trước.", "warning");
          return;
        }
        this.showSyncStatus("🔄 Đang đồng bộ với đám mây...", "info");
        const ok = await this.cloudSync.pull(false);
        if (ok) {
          this.showSyncStatus("✅ Đồng bộ thành công! Toàn bộ tiến độ mới nhất đã được cập nhật.", "success");
        }
      });
    }

    const btnDisableCloud = document.getElementById("btn-disable-cloud");
    if (btnDisableCloud) {
      btnDisableCloud.addEventListener("click", () => {
        if (confirm("Bạn có chắc chắn muốn ngắt kết nối đồng bộ đám mây trên thiết bị này?")) {
          if (this.cloudSync) {
            this.cloudSync.saveConfig({ enabled: false });
            this.showSyncStatus("Đã ngắt kết nối đám mây trên thiết bị này.", "info");
          }
        }
      });
    }

    const btnPractice = document.getElementById("btn-mode-practice");
    if (btnPractice) btnPractice.addEventListener("click", () => this.setMode("practice"));
    const btnExam = document.getElementById("btn-mode-exam");
    if (btnExam) btnExam.addEventListener("click", () => this.setMode("exam"));

    document.getElementById("btn-submit-exam").addEventListener("click", () => this.submitExam());
    document.getElementById("btn-close-modal").addEventListener("click", () => {
      document.getElementById("result-modal").style.display = "none";
    });

    document.getElementById("btn-retry-wrong").addEventListener("click", () => {
      document.getElementById("result-modal").style.display = "none";
      this.setFilter("starred");
    });

    const btnReset = document.getElementById("btn-reset-session");
    if (btnReset) {
      btnReset.addEventListener("click", () => this.resetCurrentSession());
    }

    const btnFloating = document.getElementById("btn-floating-pallet");
    if (btnFloating) {
      btnFloating.addEventListener("click", () => this.openPalletModal());
    }

    // Reading controls: Cỡ chữ, Split View, Highlighter, Furigana
    const btnFontDec = document.getElementById("btn-font-dec");
    if (btnFontDec) btnFontDec.addEventListener("click", () => this.changeFontSize(-1));

    const btnFontInc = document.getElementById("btn-font-inc");
    if (btnFontInc) btnFontInc.addEventListener("click", () => this.changeFontSize(1));

    const btnToggleSplit = document.getElementById("btn-toggle-split");
    if (btnToggleSplit) btnToggleSplit.addEventListener("click", () => this.toggleSplitMode());

    const btnHl = document.getElementById("btn-highlight-text");
    if (btnHl) {
      btnHl.addEventListener("mousedown", (e) => e.preventDefault());
      btnHl.addEventListener("click", () => this.highlightSelectedText());
    }

    const btnClearHl = document.getElementById("btn-clear-highlights");
    if (btnClearHl) btnClearHl.addEventListener("click", () => this.clearHighlights());

    const btnFurigana = document.getElementById("btn-toggle-furigana");
    if (btnFurigana) btnFurigana.addEventListener("click", () => this.toggleFurigana());

    // Sidebar Dedicated Dokkai Controls (Pinned directly under the Question Pallet)
    const btnSideHl = document.getElementById("btn-sidebar-highlight");
    if (btnSideHl) {
      btnSideHl.addEventListener("mousedown", (e) => e.preventDefault());
      btnSideHl.addEventListener("click", () => this.highlightSelectedText());
    }

    const btnSideClear = document.getElementById("btn-sidebar-clear-hl");
    if (btnSideClear) btnSideClear.addEventListener("click", () => this.clearHighlights());

    const btnSideFontDec = document.getElementById("btn-sidebar-font-dec");
    if (btnSideFontDec) btnSideFontDec.addEventListener("click", () => this.changeFontSize(-1));

    const btnSideFontInc = document.getElementById("btn-sidebar-font-inc");
    if (btnSideFontInc) btnSideFontInc.addEventListener("click", () => this.changeFontSize(1));

    const btnSideSplit = document.getElementById("btn-sidebar-split");
    if (btnSideSplit) {
      btnSideSplit.classList.toggle("active", this.splitReadingMode);
      btnSideSplit.addEventListener("click", () => this.toggleSplitMode());
    }

    const btnSideFurigana = document.getElementById("btn-sidebar-furigana");
    if (btnSideFurigana) {
      btnSideFurigana.classList.toggle("active", this.showFurigana);
      btnSideFurigana.addEventListener("click", () => this.toggleFurigana());
    }

    // Home / Scroll to Top buttons
    const btnScrollTop = document.getElementById("btn-scroll-top-topbar");
    if (btnScrollTop) {
      btnScrollTop.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    const btnFabHome = document.getElementById("btn-floating-home");
    if (btnFabHome) {
      btnFabHome.addEventListener("click", (e) => {
        e.preventDefault();
        this.scrollToTop();
      });
    }

    const updateFabVisibility = () => {
      const fab = document.getElementById("btn-floating-home");
      if (!fab) return;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (scrollY > 100) {
        fab.classList.add("visible");
      } else {
        fab.classList.remove("visible");
      }
    };
    window.addEventListener("scroll", updateFabVisibility, { passive: true });
    document.addEventListener("scroll", updateFabVisibility, { passive: true });
    updateFabVisibility();

    // iOS Audio Context & Web Speech Unlock on first interaction
    const unlockAudio = () => {
      if ("speechSynthesis" in window) {
        try {
          const dummy = new SpeechSynthesisUtterance("");
          dummy.volume = 0;
          window.speechSynthesis.speak(dummy);
        } catch (e) {}
      }
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("pointerdown", unlockAudio);
    };
    document.addEventListener("touchstart", unlockAudio, { passive: true });
    document.addEventListener("pointerdown", unlockAudio, { passive: true });

    // Touch-friendly highlight preserve
    const preserveSelectionOnTouch = (e) => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        this.savedSelectionRange = sel.getRangeAt(0).cloneRange();
      }
    };
    if (btnSideHl) {
      btnSideHl.addEventListener("pointerdown", preserveSelectionOnTouch);
      btnSideHl.addEventListener("touchstart", preserveSelectionOnTouch, { passive: false });
    }

    this.initSelectionBubble();
    this.initMobileBottomBar();
    this.initStarTouchDrag();

    window.addEventListener("resize", () => {
      this.updateMobileBar();
    });

    // Sổ tay câu hỏi: Lọc câu đã lưu (⭐) và câu sai (❌)
    const btnFilterStarred = document.getElementById("btn-filter-starred");
    if (btnFilterStarred) btnFilterStarred.addEventListener("click", () => this.filterStarredQuestions());

    const btnFilterWrong = document.getElementById("btn-filter-wrong");
    if (btnFilterWrong) btnFilterWrong.addEventListener("click", () => this.filterWrongQuestions());

    // Keyboard shortcuts: 1, 2, 3, 4 for options | J / K for navigation | H for highlight | Escape for modal
    window.addEventListener("keydown", (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (["1", "2", "3", "4"].includes(e.key)) {
        this.handleKeyboardSelect(parseInt(e.key));
      } else if (e.key === "j" || e.key === "ArrowDown") {
        this.navigateQuestion(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        this.navigateQuestion(-1);
      } else if (e.key === "h" || e.key === "H") {
        this.highlightSelectedText();
      } else if (e.key === "Home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (e.key === "Escape") {
        const popup = document.getElementById("dict-popup");
        if (popup && popup.style.display !== "none") {
          this.hideDictPopup();
          return;
        }
        const modal = document.getElementById("result-modal");
        if (modal && modal.style.display !== "none") {
          modal.style.display = "none";
        }
        const csModal = document.getElementById("cheatsheet-modal");
        if (csModal && csModal.style.display !== "none") {
          this.closeCheatsheet();
        }
      }
    });

    this.setupCheatsheetModal();

    // Khi bôi đen văn bản trên PC / Điện thoại: KHÔNG tự ý hiện ngay bảng nghĩa từ điển
    // Mà chỉ hiển thị thanh tác vụ gọn gàng [Đọc | Tra từ | Sao chép]. Người dùng bấm 'Tra từ' mới mở bảng nghĩa.

    // Đóng popup từ điển khi click ra bên ngoài
    document.addEventListener("mousedown", (e) => {
      const popup = document.getElementById("dict-popup");
      if (popup && popup.style.display !== "none") {
        if (!popup.contains(e.target)) {
          this.hideDictPopup();
        }
      }
    });

    const btnDictClose = document.getElementById("dict-popup-close");
    if (btnDictClose) btnDictClose.addEventListener("click", () => this.hideDictPopup());

    const btnDictAudio = document.getElementById("dict-popup-audio");
    if (btnDictAudio) btnDictAudio.addEventListener("click", () => {
      const w = document.getElementById("dict-popup-word").textContent;
      if (w) this.speakWord(w);
    });

    // Track active question on click
    document.addEventListener("click", (e) => {
      // Bổ qua nếu click vào các nú́t điều hướng chuyển câu hoặc bảng chọn câu hỏi
      if (e.target.closest(".q-nav-bar, .q-nav-btn, .btn-nav-wrong, .pallet-item, .mob-tab-chip, .btn-speed, .audio-player-wrapper")) {
        return;
      }
      const card = e.target.closest(".question-card");
      if (card && card.id) {
        const qId = parseInt(card.id.replace("q-card-", ""));
        if (!isNaN(qId) && this.activeQuestionId !== qId) {
          this.setActiveQuestion(qId, false);
        }
      }
    });
  }

  updateSubmitButton() {
    const btnSubmit = document.getElementById("btn-submit-exam");
    if (!btnSubmit) return;
    btnSubmit.innerHTML = `<i class="fas fa-chart-bar"></i> Tổng Kết Điểm`;
    btnSubmit.title = "Xem bảng tổng kết điểm và phân tích câu sai";
  }

  setMode(mode) {
    this.currentMode = "practice";
    const btnPractice = document.getElementById("btn-mode-practice");
    if (btnPractice) btnPractice.classList.toggle("active", true);
    const btnExam = document.getElementById("btn-mode-exam");
    if (btnExam) btnExam.classList.toggle("active", false);

    const timerBox = document.getElementById("timer-box");
    if (timerBox) timerBox.style.display = "none";
    this.stopTimer();

    this.updateSubmitButton();
    this.renderQuestions();
    this.updatePallet();
  }

  startTimer() {
    this.stopTimer();
    this.timeLeftSeconds = 105 * 60;
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.timeLeftSeconds--;
      this.updateTimerDisplay();
      if (this.timeLeftSeconds <= 0) {
        this.stopTimer();
        alert("Hết giờ làm bài! Hệ thống đang tự động nộp bài.");
        this.submitExam();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  updateTimerDisplay() {
    const min = Math.floor(this.timeLeftSeconds / 60).toString().padStart(2, "0");
    const sec = (this.timeLeftSeconds % 60).toString().padStart(2, "0");
    const timerText = document.getElementById("timer-text");
    if (timerText) timerText.textContent = `${min}:${sec}`;

    // NÂNG CẤP: Pacing Guide chuẩn JLPT N2 (105 phút)
    const pacingEl = document.getElementById("pacing-badge");
    if (pacingEl) {
      const minutesLeft = this.timeLeftSeconds / 60;
      if (minutesLeft > 80) {
        pacingEl.textContent = "Moji-Goi (25p)";
        pacingEl.style.background = "rgba(16, 185, 129, 0.35)"; // green
      } else if (minutesLeft > 60) {
        pacingEl.textContent = "Bunpou (20p)";
        pacingEl.style.background = "rgba(59, 130, 246, 0.35)"; // blue
      } else {
        pacingEl.textContent = "Dokkai (60p) - Đọc hiểu!";
        pacingEl.style.background = "rgba(239, 68, 68, 0.45)"; // red alert
      }
    }
  }

  addWrongQuestion(qId) {
    const sessionKey = String(this.currentSessionId);
    this.wrongQuestions[sessionKey] = this.wrongQuestions[sessionKey] || [];
    if (!this.wrongQuestions[sessionKey].includes(qId)) {
      this.wrongQuestions[sessionKey].push(qId);
      localStorage.setItem("jlpt_n2_wrong_questions", JSON.stringify(this.wrongQuestions));
    }
  }

  removeWrongQuestion(qId) {
    const sessionKey = String(this.currentSessionId);
    this.wrongQuestions[sessionKey] = this.wrongQuestions[sessionKey] || [];
    const idx = this.wrongQuestions[sessionKey].indexOf(qId);
    if (idx > -1) {
      this.wrongQuestions[sessionKey].splice(idx, 1);
      localStorage.setItem("jlpt_n2_wrong_questions", JSON.stringify(this.wrongQuestions));
    }
  }

  isWrongQuestion(qId) {
    const sessionKey = String(this.currentSessionId);
    return !!(this.wrongQuestions[sessionKey] && this.wrongQuestions[sessionKey].includes(qId));
  }

  addBookmark(qId, shouldRender = true) {
    const sessionKey = String(this.currentSessionId);
    this.bookmarks[sessionKey] = this.bookmarks[sessionKey] || [];
    if (!this.bookmarks[sessionKey].includes(qId)) {
      this.bookmarks[sessionKey].push(qId);
      localStorage.setItem("jlpt_n2_bookmarks", JSON.stringify(this.bookmarks));
      if (this.cloudSync) this.cloudSync.triggerDebouncedPush();
      if (shouldRender) {
        this.renderSingleQuestion(qId);
        this.updatePallet();
        this.renderFilterTabs();
      }
      return true;
    }
    return false;
  }

  removeBookmark(qId, shouldRender = true) {
    const sessionKey = String(this.currentSessionId);
    this.bookmarks[sessionKey] = this.bookmarks[sessionKey] || [];
    const idx = this.bookmarks[sessionKey].indexOf(qId);
    if (idx > -1) {
      this.bookmarks[sessionKey].splice(idx, 1);
      localStorage.setItem("jlpt_n2_bookmarks", JSON.stringify(this.bookmarks));
      if (this.cloudSync) this.cloudSync.triggerDebouncedPush();
      if (shouldRender) {
        this.renderSingleQuestion(qId);
        this.updatePallet();
        this.renderFilterTabs();
      }
      return true;
    }
    return false;
  }

  toggleBookmark(qId) {
    if (this.isQuestionBookmarked(qId)) {
      this.removeBookmark(qId);
    } else {
      this.addBookmark(qId);
    }
  }

  getTargetAnswer(q) {
    if (!q) return undefined;
    return q.isStarQuestion ? (q.correctStarOption ?? q.correctAnswer) : (q.correctAnswer ?? q.correctStarOption);
  }

  isQuestionBookmarked(qId) {
    const sessionKey = String(this.currentSessionId);
    if (this.bookmarks[sessionKey] && this.bookmarks[sessionKey].includes(qId)) {
      return true;
    }
    // Tự động đồng bộ (Self-healing): Trong chế độ luyện tập, nếu câu này đã trả lời và bị sai thì tự động ghi nhận bookmark
    if (this.currentMode === "practice" && this.userAnswers && this.userAnswers[qId] !== undefined) {
      const all = this.getAllQuestions();
      const q = all.find((x) => x.id === qId);
      if (q) {
        const targetAns = this.getTargetAnswer(q);
        if (this.userAnswers[qId] !== targetAns) {
          this.addBookmark(qId, false);
          this.addWrongQuestion(qId);
          return true;
        }
      }
    }
    return false;
  }

  // Tự động quét và đồng bộ các câu đã làm sai trong bài dở vào danh sách bookmarks & wrongQuestions
  syncWrongAndBookmarkedQuestions(sessionId = this.currentSessionId) {
    if (!sessionId) return;
    const sessionKey = String(sessionId);
    this.bookmarks[sessionKey] = this.bookmarks[sessionKey] || [];
    this.wrongQuestions[sessionKey] = this.wrongQuestions[sessionKey] || [];

    const all = this.getAllQuestions();
    let hasChanges = false;

    all.forEach((q) => {
      const userAns = this.userAnswers[q.id];
      if (userAns !== undefined) {
        const targetAns = this.getTargetAnswer(q);
        const isCorrect = (userAns === targetAns);

        if (!isCorrect) {
          if (!this.bookmarks[sessionKey].includes(q.id)) {
            this.bookmarks[sessionKey].push(q.id);
            hasChanges = true;
          }
          if (!this.wrongQuestions[sessionKey].includes(q.id)) {
            this.wrongQuestions[sessionKey].push(q.id);
            hasChanges = true;
          }
        } else {
          const wrongIdx = this.wrongQuestions[sessionKey].indexOf(q.id);
          if (wrongIdx > -1) {
            this.wrongQuestions[sessionKey].splice(wrongIdx, 1);
            hasChanges = true;
          }
          const bmIdx = this.bookmarks[sessionKey].indexOf(q.id);
          if (bmIdx > -1) {
            this.bookmarks[sessionKey].splice(bmIdx, 1);
            hasChanges = true;
          }
        }
      }
    });

    if (hasChanges) {
      localStorage.setItem("jlpt_n2_bookmarks", JSON.stringify(this.bookmarks));
      localStorage.setItem("jlpt_n2_wrong_questions", JSON.stringify(this.wrongQuestions));
    }
  }

  changeFontSize(delta) {
    const levels = ["normal", "lg", "xl"];
    let currIdx = levels.indexOf(this.fontSizeLevel);
    if (currIdx === -1) currIdx = 0;
    let nextIdx = Math.max(0, Math.min(levels.length - 1, currIdx + delta));
    this.fontSizeLevel = levels[nextIdx];
    localStorage.setItem("jlpt_font_size", this.fontSizeLevel);
    this.renderQuestions();
  }

  toggleSplitMode() {
    this.splitReadingMode = !this.splitReadingMode;
    localStorage.setItem("jlpt_split_reading", String(this.splitReadingMode));
    const btn = document.getElementById("btn-toggle-split");
    if (btn) btn.classList.toggle("active", this.splitReadingMode);
    const btnSide = document.getElementById("btn-sidebar-split");
    if (btnSide) btnSide.classList.toggle("active", this.splitReadingMode);
    this.renderQuestions();
  }

  filterStarredQuestions() {
    const sessionKey = String(this.currentSessionId);
    const starredList = this.bookmarks[sessionKey] || [];
    if (this.activeFilter === "starred") {
      this.setFilter("all");
      return;
    }
    if (starredList.length === 0) {
      alert("Bạn chưa có câu hỏi nào trong mục Đã lưu!\n\n💡 Mẹo: Khi bạn làm sai bất kỳ câu hỏi nào, hệ thống sẽ tự động tích sao ⭐ vào đây ở dạng nguyên bản chưa trả lời để bạn làm lại.");
      return;
    }
    this.setFilter("starred");
  }

  showDashboard(pushHistory = true) {
    this.stopTimer();
    this.saveDraftAnswers();
    this.currentView = "dashboard";

    if (pushHistory) {
      if (window.location.hash) {
        history.pushState({ view: "dashboard" }, document.title, window.location.pathname + window.location.search);
      } else {
        history.replaceState({ view: "dashboard" }, document.title, window.location.pathname + window.location.search);
      }
    }

    document.getElementById("view-dashboard").style.display = "block";
    document.getElementById("view-practice").style.display = "none";
    const floatBtn = document.getElementById("btn-floating-pallet");
    if (floatBtn) floatBtn.style.display = "none";
    if (this.currentDashboardTab === "drills") {
      this.switchDashboardTab("drills");
    } else {
      this.switchDashboardTab("sessions");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  getSessionData(sessionId) {
    if (!window.JLPT_DATA) return null;
    if (window.JLPT_DATA[sessionId]) return window.JLPT_DATA[sessionId];
    const str = String(sessionId);
    if (window.JLPT_DATA[str]) return window.JLPT_DATA[str];
    const num = parseInt(str.replace(/\D+/g, ""), 10);
    if (!isNaN(num)) {
      if (window.JLPT_DATA[num]) return window.JLPT_DATA[num];
      if (window.JLPT_DATA[String(num)]) return window.JLPT_DATA[String(num)];
      const padKey = `buoi_${String(num).padStart(2, "0")}`;
      if (window.JLPT_DATA[padKey]) return window.JLPT_DATA[padKey];
    }
    return null;
  }

  loadSession(sessionId, pushHistory = true) {
    this.currentSessionId = sessionId;
    const sessionData = this.getSessionData(sessionId);

    if (!sessionData) {
      const readySessions = (window.JLPT_SYLLABUS || [])
        .filter(s => s.ready || !!this.getSessionData(s.id))
        .map(s => `Buổi ${s.id}`)
        .join(", ");
      alert(`Buổi ${sessionId} đang được trích xuất dữ liệu. Vui lòng chọn các Buổi đã sẵn sàng (${readySessions || "Buổi 1, 5, 6"})!`);
      return;
    }

    if (pushHistory) {
      const newHash = `#session=${sessionId}`;
      if (window.location.hash !== newHash) {
        history.pushState({ view: "session", sessionId: sessionId }, document.title, newHash);
      } else {
        history.replaceState({ view: "session", sessionId: sessionId }, document.title, newHash);
      }
    }
    this.currentView = "session";

    document.getElementById("view-dashboard").style.display = "none";
    document.getElementById("view-practice").style.display = "block";
    document.getElementById("current-session-title").textContent = sessionData.title;

    // Restore draft answers from LocalStorage
    this.loadDraftAnswers(sessionId);
    // Tự động đồng bộ các câu đã làm sai trong draft vào danh sách bookmarks & wrongQuestions
    this.syncWrongAndBookmarkedQuestions(sessionId);

    this.activeFilter = "all";
    this.starredReviewIds = undefined;
    const initialFiltered = this.getFilteredQuestions();
    this.activeQuestionId = initialFiltered.length > 0 ? initialFiltered[0].id : null;

    this.renderFilterTabs();
    this.renderQuestions();
    this.updatePallet();
    this.updateFloatingPalletBtn();

    // Exam mode removed - always practice mode

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  loadDraftAnswers(sessionId) {
    try {
      const raw = localStorage.getItem(`jlpt_draft_${sessionId}`);
      if (raw) {
        const draft = JSON.parse(raw);
        this.userAnswers = draft.userAnswers || {};
        this.starAnswers = draft.starAnswers || {};

        // Tự động đồng bộ lại đáp án dấu sao theo đúng vị trí mảnh ghép thực tế người dùng đã xếp:
        const all = this.getAllQuestions();
        all.forEach((q) => {
          if (q.isStarQuestion && this.starAnswers[q.id]) {
            const slots = this.starAnswers[q.id];
            if (Array.isArray(slots) && slots.length === 4 && slots.every(s => s !== null)) {
              const starPos = this.getStarPosition(q);
              const actualStarFragId = slots[starPos - 1];
              this.userAnswers[q.id] = actualStarFragId;
            }
          }
        });
        return;
      }
    } catch (e) {
      console.warn("Failed to read draft answers", e);
    }
    this.userAnswers = {};
    this.starAnswers = {};
  }

  saveDraftAnswers() {
    try {
      const draft = {
        userAnswers: this.userAnswers,
        starAnswers: this.starAnswers,
        updatedAt: Date.now()
      };
      localStorage.setItem(`jlpt_draft_${this.currentSessionId}`, JSON.stringify(draft));
      this.showAutoSaveIndicator();
      if (this.cloudSync) {
        this.cloudSync.triggerDebouncedPush();
      }
    } catch (e) {
      console.warn("Failed to save draft", e);
    }
  }

  showAutoSaveIndicator() {
    const el = document.getElementById("autosave-indicator");
    if (!el) return;
    el.style.display = "inline-flex";
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      el.style.display = "none";
    }, 1800);
  }

  resetCurrentSession() {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ bài làm của buổi này để làm lại từ đầu? (Bao gồm cả các dấu sao và câu làm sai)")) {
      return;
    }
    const sessionKey = String(this.currentSessionId);
    this.userAnswers = {};
    this.starAnswers = {};
    this.isExamSubmitted = false;
    this.bookmarks[sessionKey] = [];
    this.wrongQuestions[sessionKey] = [];
    delete this.history[sessionKey];

    localStorage.removeItem(`jlpt_draft_${this.currentSessionId}`);
    localStorage.setItem("jlpt_n2_bookmarks", JSON.stringify(this.bookmarks));
    localStorage.setItem("jlpt_n2_wrong_questions", JSON.stringify(this.wrongQuestions));
    localStorage.setItem("jlpt_n2_history", JSON.stringify(this.history));

    // Xóa trạng thái đã nghe Choukai và peek của các câu trong buổi này
    const all = this.getAllQuestions();
    all.forEach(q => {
      delete this.audioListened[q.id];
      delete this.choukaiPeek[q.id];
    });
    try {
      localStorage.setItem("jlpt_audio_listened", JSON.stringify(this.audioListened));
    } catch (e) {}

    this.activeFilter = "all";
    if (this.cloudSync) this.cloudSync.triggerDebouncedPush();
    this.renderFilterTabs();
    this.renderQuestions();
    this.updatePallet();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  renderDashboard() {
    const mobBar = document.getElementById("mobile-bottom-bar");
    if (mobBar) mobBar.style.display = "none";
    const grid = document.getElementById("sessions-grid");
    grid.innerHTML = "";

    const syllabus = window.JLPT_SYLLABUS || [];
    let completedCount = 0;

    syllabus.forEach((item) => {
      const hist = this.history[item.id];
      if (hist && hist.completed) completedCount++;

      const isDataAvailable = !!this.getSessionData(item.id);
      const isReady = item.ready || isDataAvailable;
      const totalQ = (item.stats && item.stats.totalQuestions) ? item.stats.totalQuestions : 35;

      // Check draft progress
      let draftAnswered = 0;
      let hasDraft = false;
      try {
        const rawDraft = localStorage.getItem(`jlpt_draft_${item.id}`);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          const uAns = draft.userAnswers || {};
          draftAnswered = Object.keys(uAns).length;
          if (draftAnswered > 0) hasDraft = true;
        }
      } catch (e) {}

      const draftPct = totalQ > 0 ? Math.round((draftAnswered / totalQ) * 100) : 0;

      let actionButtons = "";
      if (!isReady) {
        actionButtons = `
          <button class="btn btn-outline" style="width: 100%; justify-content: center; opacity: 0.6; cursor: not-allowed;" disabled>
            <i class="fas fa-spinner fa-spin" style="margin-right: 0.4rem;"></i> Đang xử lý tài liệu
          </button>
        `;
      } else if (hasDraft) {
        actionButtons = `
          <div style="display: flex; gap: 0.5rem; align-items: center; width: 100%;">
            <button class="btn btn-primary" style="flex: 1; justify-content: center;" onclick="app.loadSession(${item.id})">
              <i class="fas fa-play"></i> Tiếp Tục Làm Bài (${draftAnswered}/${totalQ})
            </button>
            <button class="btn btn-outline" style="color: var(--error); border-color: var(--border); padding: 0.55rem 0.75rem;" 
                    title="Xóa nháp làm lại từ đầu" onclick="event.stopPropagation(); app.clearDraft(${item.id})">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        `;
      } else {
        actionButtons = `
          <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="app.loadSession(${item.id})">
            ${hist ? '<i class="fas fa-redo"></i> Làm Lại Buổi Này' : '<i class="fas fa-play"></i> Bắt Đầu Làm Bài'}
          </button>
        `;
      }

      const card = document.createElement("div");
      card.className = "session-card";
      card.innerHTML = `
        <div>
          <div class="session-card-header">
            <h3 class="session-card-title">${item.title}</h3>
            <span class="session-badge ${isReady ? "badge-ready" : "badge-soon"}">
              ${isReady ? "Sẵn sàng" : "Đang xử lý"}
            </span>
          </div>
          <p class="session-card-desc">${item.description}</p>
          <div class="session-meta">
            <span>📝 ${totalQ} câu</span>
            <span>⏱ 105 phút</span>
            ${hist ? `<span>⭐ Điểm: <b>${hist.score}/${hist.total}</b> (${Math.round((hist.score/hist.total)*100)}%)</span>` : ""}
          </div>
          ${hasDraft ? `
            <div class="draft-badge-row">
              <span class="badge-draft"><i class="fas fa-edit"></i> Đang làm dở: <b>${draftAnswered}/${totalQ} câu</b> (${draftPct}%)</span>
            </div>
            <div class="card-progress-track">
              <div class="card-progress-fill" style="width: ${draftPct}%;"></div>
            </div>
          ` : ""}
        </div>
        ${actionButtons}
      `;
      grid.appendChild(card);
    });

    document.getElementById("stat-completed-days").textContent = `${completedCount}/15`;
    document.getElementById("stat-accuracy").textContent = this.calculateAverageAccuracy() + "%";
  }

  switchDashboardTab(tab) {
    this.currentDashboardTab = tab;
    const btnSessions = document.getElementById("tab-btn-sessions");
    const btnDrills = document.getElementById("tab-btn-drills");
    const paneSessions = document.getElementById("tab-content-sessions");
    const paneDrills = document.getElementById("tab-content-drills");

    if (tab === "drills") {
      if (btnSessions) btnSessions.classList.remove("active");
      if (btnDrills) btnDrills.classList.add("active");
      if (paneSessions) paneSessions.style.display = "none";
      if (paneDrills) paneDrills.style.display = "block";
      this.renderDrillsDashboard();
    } else {
      if (btnSessions) btnSessions.classList.add("active");
      if (btnDrills) btnDrills.classList.remove("active");
      if (paneSessions) paneSessions.style.display = "block";
      if (paneDrills) paneDrills.style.display = "none";
      this.renderDashboard();
    }
  }

  renderDrillsDashboard() {
    const mobBar = document.getElementById("mobile-bottom-bar");
    if (mobBar) mobBar.style.display = "none";
    const drillsGrid = document.getElementById("drills-grid");
    if (!drillsGrid) return;
    drillsGrid.innerHTML = "";

    const drills = window.JLPT_DRILLS || [];

    drills.forEach((item) => {
      const hist = this.history[item.id];
      const isDataAvailable = window.JLPT_DATA && !!window.JLPT_DATA[item.id];
      const isReady = item.ready || isDataAvailable;
      const totalQ = (item.stats && item.stats.totalQuestions) ? item.stats.totalQuestions : 35;

      let draftAnswered = 0;
      let hasDraft = false;
      try {
        const rawDraft = localStorage.getItem(`jlpt_draft_${item.id}`);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          const uAns = draft.userAnswers || {};
          draftAnswered = Object.keys(uAns).length;
          if (draftAnswered > 0) hasDraft = true;
        }
      } catch (e) {}

      const draftPct = totalQ > 0 ? Math.round((draftAnswered / totalQ) * 100) : 0;

      let actionButtons = "";
      if (!isReady) {
        actionButtons = `
          <button class="btn btn-outline" style="width: 100%; justify-content: center; opacity: 0.6; cursor: not-allowed;" disabled>
            <i class="fas fa-spinner fa-spin" style="margin-right: 0.4rem;"></i> Đang chuẩn bị dữ liệu
          </button>
        `;
      } else if (hasDraft) {
        actionButtons = `
          <div style="display: flex; gap: 0.5rem; align-items: center; width: 100%;">
            <button class="btn btn-primary" style="flex: 1; justify-content: center;" onclick="app.loadSession('${item.id}')">
              <i class="fas fa-play"></i> Tiếp Tục Làm Bài (${draftAnswered}/${totalQ})
            </button>
            <button class="btn btn-outline" style="color: var(--error); border-color: var(--border); padding: 0.55rem 0.75rem;" 
                    title="Xóa nháp làm lại từ đầu" onclick="event.stopPropagation(); app.clearDraft('${item.id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        `;
      } else {
        actionButtons = `
          <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="app.loadSession('${item.id}')">
            ${hist ? '<i class="fas fa-redo"></i> Luyện Lại Chuyên Đề Này' : '<i class="fas fa-bolt"></i> Bắt Đầu Luyện Cấp Tốc'}
          </button>
        `;
      }

      const card = document.createElement("div");
      card.className = "session-card";
      card.innerHTML = `
        <div>
          <div class="session-card-header">
            <h3 class="session-card-title">${item.title}</h3>
            <span class="session-badge" style="background: ${item.badgeColor || '#4f46e5'}20; color: ${item.badgeColor || '#4f46e5'}; border: 1px solid ${item.badgeColor || '#4f46e5'}50; font-weight: 700;">
              ${item.badge || 'Chuyên đề'}
            </span>
          </div>
          <p class="session-card-desc">${item.description}</p>
          <div class="session-meta">
            <span>⭐ ${totalQ} câu hỏi</span>
            <span>⚡ Luyện phản xạ</span>
            ${hist ? `<span>Điểm: <b>${hist.score}/${hist.total}</b> (${Math.round((hist.score/hist.total)*100)}%)</span>` : ""}
          </div>
          ${hasDraft ? `
            <div class="draft-badge-row">
              <span class="badge-draft"><i class="fas fa-edit"></i> Đang làm dở: <b>${draftAnswered}/${totalQ} câu</b> (${draftPct}%)</span>
            </div>
            <div class="card-progress-track">
              <div class="card-progress-fill" style="width: ${draftPct}%;"></div>
            </div>
          ` : ""}
        </div>
        <div style="margin-top: 1.25rem;">
          ${actionButtons}
        </div>
      `;
      drillsGrid.appendChild(card);
    });

    // Render Cheatsheets
    const csGrid = document.getElementById("cheatsheets-grid");
    if (csGrid) {
      csGrid.innerHTML = "";
      const cheatsheets = window.JLPT_CHEATSHEETS || [];
      cheatsheets.forEach(cs => {
        const card = document.createElement("div");
        card.className = "cheatsheet-card";
        card.style.cursor = "pointer";
        card.onclick = () => this.openCheatsheet(cs.id);
        card.innerHTML = `
          <div class="cheatsheet-icon-box" style="background: ${cs.color || '#6366f1'};">
            <i class="fas ${cs.icon || 'fa-book'}"></i>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.25rem; color: var(--text-main);">
              ${cs.title}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
              ${cs.subtitle}
            </div>
          </div>
          <div style="color: var(--primary); font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.25rem; align-self: center;">
            <span>Tra cứu</span> <i class="fas fa-arrow-right"></i>
          </div>
        `;
        csGrid.appendChild(card);
      });
    }
  }

  setupCheatsheetModal() {
    const modal = document.getElementById("cheatsheet-modal");
    const closeBtn = document.getElementById("btn-close-cs-modal");
    const searchInput = document.getElementById("cs-search-input");
    const searchClear = document.getElementById("cs-search-clear");
    const tabsContainer = document.getElementById("cs-modal-tabs");
    const cardEl = document.getElementById("cs-modal-card");
    const zoomInBtn = document.getElementById("btn-cs-zoom-in");
    const zoomOutBtn = document.getElementById("btn-cs-zoom-out");
    const zoomLabel = document.getElementById("cs-zoom-label");
    const fullscreenBtn = document.getElementById("btn-cs-fullscreen");
    const fullscreenIcon = document.getElementById("cs-fullscreen-icon");

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeCheatsheet(true));
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.closeCheatsheet(true);
      });
    }

    // Zoom level controls (small 90%, normal 100%, large 115%, xlarge 132%)
    const zoomLevels = ["small", "normal", "large", "xlarge"];
    const zoomLabels = { small: "90%", normal: "100%", large: "115%", xlarge: "132%" };
    let currentZoom = localStorage.getItem("jlpt_cs_zoom") || "normal";
    if (!zoomLevels.includes(currentZoom)) currentZoom = "normal";

    const applyZoom = (lvl) => {
      currentZoom = lvl;
      if (cardEl) cardEl.dataset.zoom = lvl;
      if (zoomLabel) zoomLabel.textContent = zoomLabels[lvl] || "100%";
      localStorage.setItem("jlpt_cs_zoom", lvl);
    };
    applyZoom(currentZoom);

    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", () => {
        const idx = zoomLevels.indexOf(currentZoom);
        if (idx < zoomLevels.length - 1) applyZoom(zoomLevels[idx + 1]);
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", () => {
        const idx = zoomLevels.indexOf(currentZoom);
        if (idx > 0) applyZoom(zoomLevels[idx - 1]);
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener("click", () => {
        if (cardEl) {
          cardEl.classList.toggle("is-fullscreen");
          const isFs = cardEl.classList.contains("is-fullscreen");
          if (fullscreenIcon) {
            fullscreenIcon.className = isFs ? "fas fa-compress" : "fas fa-expand";
          }
          if (fullscreenBtn) {
            fullscreenBtn.title = isFs ? "Thu nhỏ cửa sổ" : "Phóng to toàn màn hình";
          }
        }
      });
    }

    if (tabsContainer) {
      tabsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".cs-tab-btn");
        if (btn && btn.dataset.cs) {
          this.switchCheatsheetTab(btn.dataset.cs);
        }
      });
    }

    // Nút Thu gọn / Mở rộng thanh công cụ (Zen Reading Mode)
    const toggleToolbarBtn = document.getElementById("btn-cs-toggle-toolbar");
    const toggleIcon = document.getElementById("cs-toggle-toolbar-icon");
    const toggleText = document.getElementById("cs-toggle-toolbar-text");
    const controlsCluster = document.getElementById("cs-controls-cluster");
    const minibar = document.getElementById("cs-minibar");
    const minibarExpandBtn = document.getElementById("btn-cs-minibar-expand");
    const chapterSelect = document.getElementById("cs-chapter-select");

    const updateMinibarTitles = () => {
      const minibarTab = document.getElementById("cs-minibar-tab-title");
      const minibarCh = document.getElementById("cs-minibar-ch-title");
      const meta = (window.JLPT_CHEATSHEETS || []).find(c => c.id === this.activeCheatsheetId);
      if (minibarTab && meta) minibarTab.textContent = meta.title;
      if (minibarCh) {
        if (this.activeCheatsheetId === "cs_kosei_np") {
          const chSel = document.getElementById("cs-chapter-select");
          minibarCh.textContent = chSel && chSel.options[chSel.selectedIndex] ? " • " + chSel.options[chSel.selectedIndex].text : " • Toàn bộ 75 trang";
        } else {
          minibarCh.textContent = "";
        }
      }
    };

    const setToolbarCollapsed = (collapsed) => {
      if (!controlsCluster) return;
      if (collapsed) {
        controlsCluster.classList.add("is-collapsed");
        if (toggleIcon) toggleIcon.className = "fas fa-sliders-h";
        if (toggleText) toggleText.textContent = "Mở công cụ";
        if (toggleToolbarBtn) toggleToolbarBtn.title = "Mở rộng thanh công cụ tra cứu";
        if (minibar) minibar.style.display = "flex";
      } else {
        controlsCluster.classList.remove("is-collapsed");
        if (toggleIcon) toggleIcon.className = "fas fa-eye-slash";
        if (toggleText) toggleText.textContent = "Thu gọn";
        if (toggleToolbarBtn) toggleToolbarBtn.title = "Thu gọn thanh công cụ để đọc thoáng mắt";
        if (minibar) minibar.style.display = "none";
      }
      updateMinibarTitles();
    };

    if (toggleToolbarBtn) {
      toggleToolbarBtn.addEventListener("click", () => {
        const isCollapsed = controlsCluster ? controlsCluster.classList.contains("is-collapsed") : false;
        setToolbarCollapsed(!isCollapsed);
      });
    }

    if (minibarExpandBtn) {
      minibarExpandBtn.addEventListener("click", () => {
        setToolbarCollapsed(false);
      });
    }

    if (chapterSelect) {
      const handleChapterSelection = (e) => {
        this.activeKoseiChapter = e.target.value;
        updateMinibarTitles();
        const q = searchInput ? searchInput.value.trim() : "";
        this.renderCheatsheetContent("cs_kosei_np", q, true);
        this.scrollCheatsheetToTop(false);
      };
      chapterSelect.addEventListener("change", handleChapterSelection);
      chapterSelect.addEventListener("input", handleChapterSelection);
    }

    // Nút nổi cuộn lên đầu trang / đầu chương
    const scrollTopBtn = document.getElementById("btn-cs-scroll-top");
    const modalBody = document.getElementById("cs-modal-body");
    if (modalBody && scrollTopBtn) {
      modalBody.addEventListener("scroll", () => {
        if (modalBody.scrollTop > 220) {
          scrollTopBtn.classList.add("is-visible");
        } else {
          scrollTopBtn.classList.remove("is-visible");
        }
      }, { passive: true });

      scrollTopBtn.addEventListener("click", () => {
        this.scrollCheatsheetToTop(true);
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const q = e.target.value.trim();
        if (searchClear) searchClear.style.display = q ? "block" : "none";
        this.renderCheatsheetContent(this.activeCheatsheetId || "cs_kosei_np", q);
      });
    }

    if (searchClear) {
      searchClear.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          searchClear.style.display = "none";
          this.renderCheatsheetContent(this.activeCheatsheetId || "cs_kosei_np", "", true);
          this.scrollCheatsheetToTop(false);
          searchInput.focus();
        }
      });
    }
  }

  scrollCheatsheetToTop(smooth = false) {
    const body = document.getElementById("cs-modal-body");
    const scrollTopBtn = document.getElementById("btn-cs-scroll-top");
    if (scrollTopBtn && !smooth) {
      scrollTopBtn.classList.remove("is-visible");
    }
    if (!body) return;
    if (smooth) {
      body.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      body.scrollTop = 0;
      body.scrollTo({ top: 0, left: 0, behavior: "instant" });
      requestAnimationFrame(() => {
        if (body) {
          body.scrollTop = 0;
          body.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
      });
      setTimeout(() => {
        if (body) {
          body.scrollTop = 0;
        }
      }, 25);
    }
  }

  openCheatsheet(csId, pushHistory = true) {
    const modal = document.getElementById("cheatsheet-modal");
    if (!modal) return;
    this.activeCheatsheetId = csId || "cs_kosei_np";
    this.switchCheatsheetTab(this.activeCheatsheetId);
    modal.style.display = "flex";
    this.scrollCheatsheetToTop(false);

    if (pushHistory) {
      const prevHash = window.location.hash || "";
      history.pushState(
        { view: "cheatsheet", csId: this.activeCheatsheetId, previousHash: prevHash, previousView: this.currentView || "dashboard" },
        document.title,
        `#cheatsheet=${this.activeCheatsheetId}`
      );
    }
  }

  openCheatsheetModal(csId) {
    this.openCheatsheet(csId || "cs_kosei_np");
  }

  closeCheatsheet(syncHistory = false) {
    const modal = document.getElementById("cheatsheet-modal");
    if (modal) modal.style.display = "none";

    if (syncHistory && window.history.state && window.history.state.view === "cheatsheet") {
      window.history.back();
    }
  }

  switchCheatsheetTab(csId) {
    this.activeCheatsheetId = csId;
    const tabBtns = document.querySelectorAll(".cs-tab-btn");
    tabBtns.forEach(btn => {
      if (btn.dataset.cs === csId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const cheatsheetMeta = (window.JLPT_CHEATSHEETS || []).find(c => c.id === csId);
    if (cheatsheetMeta) {
      const titleEl = document.getElementById("cs-modal-title");
      const subEl = document.getElementById("cs-modal-subtitle");
      const iconEl = document.getElementById("cs-modal-icon");
      if (titleEl) titleEl.textContent = cheatsheetMeta.title;
      if (subEl) subEl.textContent = cheatsheetMeta.subtitle;
      if (iconEl) {
        iconEl.style.background = cheatsheetMeta.color || "#6366f1";
        iconEl.innerHTML = `<i class="fas ${cheatsheetMeta.icon || 'fa-book'}"></i>`;
      }
    }

    // Hiện / ẩn Dropdown chọn chương theo tab
    const chDropdownWrap = document.getElementById("cs-chapter-dropdown-wrap");
    if (chDropdownWrap) {
      chDropdownWrap.style.display = csId === "cs_kosei_np" ? "flex" : "none";
    }

    const minibarTab = document.getElementById("cs-minibar-tab-title");
    const minibarCh = document.getElementById("cs-minibar-ch-title");
    if (minibarTab && cheatsheetMeta) minibarTab.textContent = cheatsheetMeta.title;
    if (minibarCh) {
      if (csId === "cs_kosei_np") {
        const chSel = document.getElementById("cs-chapter-select");
        minibarCh.textContent = chSel && chSel.options[chSel.selectedIndex] ? " • " + chSel.options[chSel.selectedIndex].text : " • Toàn bộ 75 trang";
      } else {
        minibarCh.textContent = "";
      }
    }

    const searchInput = document.getElementById("cs-search-input");
    const query = searchInput ? searchInput.value.trim() : "";
    this.renderCheatsheetContent(csId, query, true);
    this.scrollCheatsheetToTop(false);
  }

  renderCheatsheetContent(csId, query = "", resetScroll = false) {
    const body = document.getElementById("cs-modal-body");
    if (!body) return;
    const allData = window.JLPT_CHEATSHEETS_DATA || {};
    const qLower = query.toLowerCase();

    // Helper highlight
    const hl = (txt) => {
      if (!query || !txt) return txt || "";
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return String(txt).replace(regex, '<mark style="background:#fef08a;color:#854d0e;padding:1px 4px;border-radius:4px;font-weight:700;">$1</mark>');
    };

    // Helper format bilingual examples
    const formatBilingual = (ex) => {
      if (!ex) return { ja: "", vi: "" };
      const m = ex.match(/^([^(（]+)[(（]([^)）]+)[)）]\.?$/);
      if (m) {
        return { ja: m[1].trim(), vi: m[2].trim() };
      }
      return { ja: ex, vi: "" };
    };

    const formatBilingualList = (ex) => {
      if (!ex) return [];
      const parts = ex.split(/\s+\/\s+(?=[^()（）]*(?:[（(]|$))/);
      return parts.map(p => {
        const m = p.trim().match(/^([^(（]+)[(（]([^)）]+)[)）]\.?$/);
        if (m) {
          return { ja: m[1].trim(), vi: m[2].trim() };
        }
        return { ja: p.trim(), vi: "" };
      }).filter(x => x.ja);
    };

    // 1. SỔ TAY KOSEI 75 TRANG
    if (csId === "cs_kosei_np") {
      const book = allData.cs_kosei_np || { chapters: [] };
      const chapters = book.chapters || [];
      const activeChId = this.activeKoseiChapter || "all";

      const chSelect = document.getElementById("cs-chapter-select");
      if (chSelect && chSelect.value !== activeChId) {
        chSelect.value = activeChId;
      }

      const visibleChapters = chapters.filter(ch => {
        if (activeChId !== "all" && ch.id !== activeChId) return false;
        return true;
      });

      const renderChapterContent = (ch) => {
        let hasContent = false;
        let contentHtml = "";

        if (ch.id === "ch1") {
          const secs = (ch.sections || []).map(sec => {
            const matchedPatterns = (sec.patterns || []).filter(p => {
              if (!query) return true;
              return p.pattern.toLowerCase().includes(qLower) ||
                     p.meaning.toLowerCase().includes(qLower) ||
                     sec.root.toLowerCase().includes(qLower) ||
                     (p.examples && p.examples.some(ex => ex.toLowerCase().includes(qLower)));
            });
            return { root: sec.root, meaning: sec.meaning, patterns: matchedPatterns };
          }).filter(sec => sec.patterns.length > 0);

          if (secs.length > 0) {
            hasContent = true;
            contentHtml = `
              <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                ${secs.map(sec => `
                  <div>
                    <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.85rem;">
                      <span class="cs-badge-pill" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; font-size: calc(0.95rem * var(--cs-scale)); font-weight: 800;">
                        Gốc Hán Tự: ${hl(sec.root)}
                      </span>
                      <span style="font-size: calc(1rem * var(--cs-scale)); font-weight: 600; color: var(--text-sub);">
                        ${hl(sec.meaning)}
                      </span>
                    </div>
                    <div class="cs-card-grid">
                      ${sec.patterns.map(p => `
                        <div class="cs-grammar-card" style="border-left-color: #8b5cf6;">
                          <div class="cs-pattern-head">
                            <span class="cs-pattern-title">${hl(p.pattern)}</span>
                            ${p.note ? `<span class="cs-formula-badge">${hl(p.note)}</span>` : ''}
                          </div>
                          <div class="cs-meaning-text">
                            💡 ${hl(p.meaning)}
                          </div>
                          ${(p.examples || []).length > 0 ? `
                            <div class="cs-example-group">
                              ${p.examples.map(ex => {
                                const b = formatBilingual(ex);
                                return `
                                  <div class="cs-example-item">
                                    <div class="cs-ex-ja">${hl(b.ja)}</div>
                                    ${b.vi ? `<div class="cs-ex-vi">🇻🇳 ${hl(b.vi)}</div>` : ''}
                                  </div>
                                `;
                              }).join("")}
                            </div>
                          ` : ''}
                        </div>
                      `).join("")}
                    </div>
                  </div>
                `).join("")}
              </div>
            `;
          }
        } else if (ch.id === "ch2" || ch.id === "ch3" || ch.id === "ch4") {
          const secs = (ch.sections || []).map(sec => {
            const matchedPatterns = (sec.patterns || []).filter(p => {
              if (!query) return true;
              return p.pattern.toLowerCase().includes(qLower) ||
                     p.meaning.toLowerCase().includes(qLower) ||
                     sec.group.toLowerCase().includes(qLower) ||
                     (p.example && p.example.toLowerCase().includes(qLower));
            });
            return { group: sec.group, patterns: matchedPatterns };
          }).filter(sec => sec.patterns.length > 0);

          if (secs.length > 0) {
            hasContent = true;
            contentHtml = `
              <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                ${secs.map(sec => `
                  <div>
                    <h4 style="font-size: calc(1.08rem * var(--cs-scale)); font-weight: 800; color: #8b5cf6; margin-bottom: 0.65rem; display: flex; align-items: center; gap: 0.5rem;">
                      <i class="fas fa-layer-group"></i> ${sec.group}
                    </h4>
                    <div class="cs-table-wrap">
                      <table class="cs-table">
                        <thead>
                          <tr>
                            <th style="width: 25%;">Mẫu câu</th>
                            <th style="width: 35%;">Ý nghĩa & Sắc thái phân biệt</th>
                            <th style="width: 40%;">Ví dụ thực tế song ngữ</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${sec.patterns.map(p => {
                            const b = formatBilingual(p.example || "");
                            return `
                              <tr>
                                <td>
                                  <span class="cs-highlight-term">${hl(p.pattern)}</span>
                                </td>
                                <td>
                                  <div style="font-weight: 600; color: var(--text-main); line-height: 1.6;">
                                    ${hl(p.meaning)}
                                  </div>
                                </td>
                                <td>
                                  ${b.ja ? `
                                    <div class="cs-ex-ja" style="font-size: calc(0.95rem * var(--cs-scale));">${hl(b.ja)}</div>
                                    ${b.vi ? `<div class="cs-ex-vi" style="font-size: calc(0.88rem * var(--cs-scale)); margin-top: 0.2rem;">🇻🇳 ${hl(b.vi)}</div>` : ''}
                                  ` : '<span style="color: var(--text-sub);">-</span>'}
                                </td>
                              </tr>
                            `;
                          }).join("")}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `).join("")}
              </div>
            `;
          }
        } else if (ch.id === "ch5") {
          const signs = (ch.sections || []).filter(s => {
            if (!query) return true;
            return s.signType.toLowerCase().includes(qLower) ||
                   s.patterns.toLowerCase().includes(qLower) ||
                   s.rule.toLowerCase().includes(qLower);
          });

          if (signs.length > 0) {
            hasContent = true;
            contentHtml = `
              <div class="cs-card-grid">
                ${signs.map(s => `
                  <div class="cs-grammar-card" style="border-left-color: #f59e0b;">
                    <div class="cs-pattern-head">
                      <span class="cs-pattern-title" style="color: #d97706;">
                        <i class="fas fa-bolt" style="color: #f59e0b; margin-right: 0.35rem;"></i>${hl(s.signType)}
                      </span>
                      <span class="cs-badge-pill" style="background: rgba(245, 158, 11, 0.15); color: #d97706;">Dấu Hiệu Vàng</span>
                    </div>
                    <div style="margin-bottom: 0.6rem;">
                      <span class="cs-formula-badge">${hl(s.patterns)}</span>
                    </div>
                    <div class="cs-note-box" style="margin-top: 0.5rem; font-size: calc(0.95rem * var(--cs-scale)); white-space: pre-line;">
                      ${hl(s.rule)}
                    </div>
                  </div>
                `).join("")}
              </div>
            `;
          }
        } else if (ch.id === "ch6") {
          const items = (ch.sections || []).filter(it => {
            if (!query) return true;
            return it.pattern.toLowerCase().includes(qLower) ||
                   it.meaning.toLowerCase().includes(qLower) ||
                   (it.example && it.example.toLowerCase().includes(qLower));
          });

          if (items.length > 0) {
            hasContent = true;
            contentHtml = `
              <div class="cs-card-grid">
                ${items.map(it => {
                  const b = formatBilingual(it.example || "");
                  return `
                    <div class="cs-grammar-card" style="border-left-color: #ef4444;">
                      <div class="cs-pattern-head">
                        <span class="cs-pattern-title" style="color: #dc2626;">${hl(it.pattern)}</span>
                        <span class="cs-badge-pill" style="background: rgba(239, 68, 68, 0.12); color: #dc2626;">Ngoài Shinkanzen</span>
                      </div>
                      <div class="cs-meaning-text">
                        💡 <b>Ý nghĩa:</b> ${hl(it.meaning)}
                      </div>
                      ${b.ja ? `
                        <div class="cs-example-group">
                          <div class="cs-example-item">
                            <div class="cs-ex-ja">${hl(b.ja)}</div>
                            ${b.vi ? `<div class="cs-ex-vi">🇻🇳 ${hl(b.vi)}</div>` : ''}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join("")}
              </div>
            `;
          }
        } else if (ch.id === "ch7") {
          const tips = (ch.tips || []).filter(t => {
            if (!query) return true;
            return t.title.toLowerCase().includes(qLower) ||
                   t.detail.toLowerCase().includes(qLower);
          });

          if (tips.length > 0) {
            hasContent = true;
            contentHtml = `
              <div class="cs-card-grid">
                ${tips.map(t => `
                  <div class="cs-grammar-card" style="border-left-color: #6366f1;">
                    <div class="cs-pattern-head">
                      <span class="cs-pattern-title" style="color: #4f46e5;">
                        <i class="fas fa-star" style="color: #f59e0b; margin-right: 0.35rem;"></i>Mẹo ${t.tipNumber}: ${hl(t.title)}
                      </span>
                    </div>
                    <div style="background: var(--bg-main); padding: 0.9rem 1.1rem; border-radius: 10px; border: 1px solid var(--border); font-size: calc(0.95rem * var(--cs-scale)); line-height: 1.6; white-space: pre-line; color: var(--text-main);">
                      ${hl(t.detail)}
                    </div>
                  </div>
                `).join("")}
              </div>
            `;
          }
        } else if (ch.id === "ch8") {
          hasContent = true;
          contentHtml = `
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
              ${(ch.sections || []).map(sec => `
                <div>
                  <h4 style="font-size: calc(1.08rem * var(--cs-scale)); font-weight: 800; color: #06b6d4; margin-bottom: 0.65rem;">
                    ${sec.title}
                  </h4>
                  <div class="cs-table-wrap">
                    <table class="cs-table">
                      <thead>
                        <tr>
                          ${sec.items[0]?.adverb ? '<th style="width: 32%;">Phó từ cố định</th><th style="width: 33%;">Mẫu ngữ pháp đi kèm</th><th style="width: 35%;">Ý nghĩa sư phạm</th>' : '<th style="width: 25%;">Động từ gốc</th><th style="width: 38%;">Tôn kính ngữ (Sonkeigo)</th><th style="width: 37%;">Khiêm nhường ngữ (Kenjougo)</th>'}
                        </tr>
                      </thead>
                      <tbody>
                        ${(sec.items || []).map(it => `
                          <tr>
                            ${it.adverb ? `
                              <td><span class="cs-highlight-term">${hl(it.adverb)}</span></td>
                              <td><b style="color: var(--primary); font-size: calc(1.02rem * var(--cs-scale));">${hl(it.match)}</b></td>
                              <td><div style="font-weight: 600; color: var(--text-main);">${hl(it.meaning)}</div></td>
                            ` : `
                              <td><b>${hl(it.verb)}</b></td>
                              <td><span style="color: #059669; font-weight: 700; font-size: calc(1.02rem * var(--cs-scale));">${hl(it.sonkei)}</span></td>
                              <td><span style="color: #d97706; font-weight: 700; font-size: calc(1.02rem * var(--cs-scale));">${hl(it.kenjou)}</span></td>
                            `}
                          </tr>
                        `).join("")}
                      </tbody>
                    </table>
                  </div>
                </div>
              `).join("")}
            </div>
          `;
        }

        if (!hasContent) return "";

        return `
          <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.75rem; box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06);">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <h3 style="font-size: calc(1.22rem * var(--cs-scale)); font-weight: 800; color: var(--text-main); margin: 0;">
                ${ch.title}
              </h3>
              <span class="cs-badge-pill" style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; font-size: calc(0.85rem * var(--cs-scale)); font-weight: 700;">${ch.pages}</span>
            </div>
            <p style="font-size: calc(0.92rem * var(--cs-scale)); color: var(--text-sub); margin-bottom: 1.25rem; line-height: 1.5;">
              ${ch.description}
            </p>
            ${contentHtml}
          </div>
        `;
      };

      const chaptersOutput = visibleChapters.map(renderChapterContent).filter(Boolean).join("");

      if (!chaptersOutput) {
        body.innerHTML = `
          <div style="text-align:center;padding:3rem;color:var(--text-sub);">
            <i class="fas fa-search" style="font-size:2.5rem;margin-bottom:0.85rem;display:block;opacity:0.6;"></i>
            Không tìm thấy nội dung nào trong 75 trang Kosei khớp với "${query}"
          </div>
        `;
        return;
      }

      body.innerHTML = chaptersOutput;
      if (resetScroll) {
        this.scrollCheatsheetToTop(false);
      }
      return;
    }

    // 1.5. DẤU HIỆU MẪU CÂU NGỮ PHÁP N2 (18 TRANG GỐC)
    if (csId === "cs_dau_hieu_mau_cau") {
      const book = allData.cs_dau_hieu_mau_cau || { pages: [] };
      const pages = book.pages || [];

      const filteredPages = pages.map(pg => {
        const matchesCategory = pg.category && (pg.category.toLowerCase().includes(qLower) || (pg.description && pg.description.toLowerCase().includes(qLower)));
        const matchedItems = (pg.items || []).filter(it => {
          if (!query) return true;
          if (matchesCategory) return true;
          return (it.pattern && it.pattern.toLowerCase().includes(qLower)) ||
                 (it.meaning && it.meaning.toLowerCase().includes(qLower)) ||
                 (it.note && it.note.toLowerCase().includes(qLower)) ||
                 (it.example && it.example.toLowerCase().includes(qLower));
        });
        return { ...pg, items: matchedItems };
      }).filter(pg => pg.items.length > 0);

      if (filteredPages.length === 0) {
        body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-sub);"><i class="fas fa-search" style="font-size:2.5rem;margin-bottom:0.85rem;display:block;opacity:0.6;"></i>Không tìm thấy dấu hiệu mẫu câu nào khớp với "${query}"</div>`;
        return;
      }

      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1.75rem;">
          <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.04)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 1rem 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem; font-weight: 800; color: #b45309; font-size: calc(1.05rem * var(--cs-scale)); margin-bottom: 0.35rem;">
              <i class="fas fa-bolt" style="color: #f59e0b;"></i> ${book.title || 'Bí Kíp Dấu Hiệu Nhận Biết Mẫu Câu N2 (Trọn Bộ 18 Trang Gốc)'}
            </div>
            <div style="color: var(--text-sub); font-size: calc(0.92rem * var(--cs-scale)); line-height: 1.5;">
              ${book.subtitle || 'Bí kíp phản xạ 5 giây: Nhìn từ khóa nhận diện ngay cấu trúc ngữ pháp'}
            </div>
          </div>

          ${filteredPages.map(pg => `
            <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06);">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                <h3 style="font-size: calc(1.15rem * var(--cs-scale)); font-weight: 800; color: #d97706; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                  <i class="fas fa-bookmark" style="font-size: 0.95rem;"></i> ${hl(pg.category)}
                </h3>
                <span class="cs-badge-pill" style="background: rgba(245, 158, 11, 0.15); color: #d97706; font-size: calc(0.85rem * var(--cs-scale)); font-weight: 700;">
                  Trang ${pg.pageNumber} / 18
                </span>
              </div>
              ${pg.description ? `<p style="font-size: calc(0.92rem * var(--cs-scale)); color: var(--text-sub); margin-bottom: 1.2rem; line-height: 1.5; font-style: italic;">📌 ${hl(pg.description)}</p>` : ''}
              
              <div class="cs-card-grid">
                ${pg.items.map(it => `
                  <div class="cs-grammar-card" style="border-left-color: #f59e0b;">
                    <div class="cs-pattern-head">
                      <span class="cs-pattern-title" style="color: #b45309; font-size: calc(1.1rem * var(--cs-scale));">${hl(it.pattern)}</span>
                      <span class="cs-badge-pill" style="background: rgba(245, 158, 11, 0.12); color: #b45309; font-size: calc(0.82rem * var(--cs-scale));">Trọng Tâm</span>
                    </div>
                    <div class="cs-meaning-text" style="font-size: calc(0.98rem * var(--cs-scale)); margin-bottom: 0.6rem;">
                      💡 <b>Ý nghĩa:</b> ${hl(it.meaning)}
                    </div>
                    ${it.example ? (() => {
                      const bList = formatBilingualList(it.example);
                      return `
                        <div class="cs-example-group" style="margin-top: 0.65rem;">
                          ${bList.map(b => `
                            <div class="cs-example-item" style="padding: 0.55rem 0.8rem; background: rgba(0,0,0,0.02); border-left: 3px solid #f59e0b; border-radius: 6px; margin-bottom: 0.35rem;">
                              <div class="cs-ex-ja" style="font-size: calc(0.95rem * var(--cs-scale)); line-height: 1.5; color: var(--text-main); font-weight: 600;">
                                <span style="color: #d97706; margin-right: 0.35rem; font-weight: 700;">例：</span>${hl(b.ja)}
                              </div>
                              ${b.vi ? `
                                <div class="cs-ex-vi" style="font-size: calc(0.9rem * var(--cs-scale)); color: var(--text-sub); margin-top: 0.25rem; line-height: 1.45;">
                                  <span style="font-weight: 700; color: #059669; margin-right: 0.35rem;">🇻🇳 Dịch:</span>${hl(b.vi)}
                                </div>
                              ` : ''}
                            </div>
                          `).join("")}
                        </div>
                      `;
                    })() : ''}
                    ${it.note ? `
                      <div class="cs-note-box" style="margin-top: 0.5rem; font-size: calc(0.9rem * var(--cs-scale)); line-height: 1.45;">
                        <i class="fas fa-lightbulb" style="color: #f59e0b; margin-right: 0.3rem;"></i>${hl(it.note)}
                      </div>
                    ` : ''}
                  </div>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      `;
      return;
    }

    // 2. PHÓ TỪ ĐẶC ĐỊNH (13 TRANG GỐC - 3 PHẦN TOÀN DIỆN)
    if (csId === "cs_pho_tu" || csId === "cs_pho_tu_dac_dinh") {
      const doc = allData.cs_pho_tu || allData.cs_pho_tu_dac_dinh || {};
      const p1 = (doc.part1_fixed_endings || []).filter(it => {
        if (!query) return true;
        return (it.adverb && it.adverb.toLowerCase().includes(qLower)) ||
               (it.pattern && it.pattern.toLowerCase().includes(qLower)) ||
               (it.meaning && it.meaning.toLowerCase().includes(qLower)) ||
               (it.note && it.note.toLowerCase().includes(qLower));
      });

      const p2 = (doc.part2_fixed_verbs || []).filter(it => {
        if (!query) return true;
        return (it.adverb && it.adverb.toLowerCase().includes(qLower)) ||
               (it.collocation && it.collocation.toLowerCase().includes(qLower)) ||
               (it.meaning && it.meaning.toLowerCase().includes(qLower));
      });

      const p3 = (doc.part3_onomatopoeia || []).filter(it => {
        if (!query) return true;
        return (it.word && it.word.toLowerCase().includes(qLower)) ||
               (it.meaning && it.meaning.toLowerCase().includes(qLower));
      });

      if (p1.length === 0 && p2.length === 0 && p3.length === 0) {
        body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-sub);"><i class="fas fa-search" style="font-size:2.5rem;margin-bottom:0.85rem;display:block;opacity:0.6;"></i>Không tìm thấy phó từ nào khớp với "${query}"</div>`;
        return;
      }

      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2rem;">
          <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(99, 102, 241, 0.04)); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 1rem 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem; font-weight: 800; color: #4338ca; font-size: calc(1.05rem * var(--cs-scale)); margin-bottom: 0.35rem;">
              <i class="fas fa-link" style="color: #6366f1;"></i> ${doc.title || 'Phó Từ Đi Với Các Mẫu Câu Đặc Định (Trọn Bộ 13 Trang Gốc)'}
            </div>
            <div style="color: var(--text-sub); font-size: calc(0.92rem * var(--cs-scale)); line-height: 1.5;">
              ${doc.subtitle || 'Trọn bộ 3 phần: Đuôi câu cố định, Cụm động từ cố định & Phó từ láy tượng thanh tượng hình'}
            </div>
          </div>

          <!-- PHẦN 1 -->
          ${p1.length > 0 ? `
            <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06);">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                <h3 style="font-size: calc(1.15rem * var(--cs-scale)); font-weight: 800; color: #4f46e5; margin: 0;">
                  <i class="fas fa-exchange-alt" style="margin-right: 0.4rem;"></i> PHẦN 1: 23 Cặp Phó Từ Đi Với Đuôi Câu Cố Định
                </h3>
                <span class="cs-badge-pill" style="background: rgba(99, 102, 241, 0.15); color: #4f46e5; font-size: calc(0.85rem * var(--cs-scale)); font-weight: 700;">Trang 1 - 6 (23 cặp)</span>
              </div>
              <p style="font-size: calc(0.92rem * var(--cs-scale)); color: var(--text-sub); margin-bottom: 1.25rem;">
                Gặp phó từ ở vế đầu &rarr; Tự động phản xạ ngay đuôi câu ở vế sau không cần dịch nghĩa phức tạp.
              </p>
              <div class="cs-table-wrap">
                <table class="cs-table">
                  <thead>
                    <tr>
                      <th style="width: 28%;">Phó từ (副詞)</th>
                      <th style="width: 28%;">Mẫu câu đi kèm cố định</th>
                      <th style="width: 26%;">Ý nghĩa sư phạm</th>
                      <th style="width: 18%;">Ghi chú / Mức độ</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${p1.map(it => `
                      <tr>
                        <td style="vertical-align: top;"><span class="cs-highlight-term" style="font-size: calc(1rem * var(--cs-scale));">${hl(it.adverb)}</span></td>
                        <td style="vertical-align: top;"><b style="color: #4f46e5; font-size: calc(1.05rem * var(--cs-scale));">${hl(it.pattern)}</b></td>
                        <td style="vertical-align: top;">
                          <div style="font-weight: 600; color: var(--text-main); font-size: calc(0.95rem * var(--cs-scale));">${hl(it.meaning)}</div>
                          ${it.example ? (() => {
                            const b = formatBilingual(it.example);
                            return `
                              <div style="margin-top: 0.45rem; padding: 0.45rem 0.65rem; background: rgba(99, 102, 241, 0.05); border-left: 3px solid #6366f1; border-radius: 4px;">
                                <div style="font-size: calc(0.92rem * var(--cs-scale)); color: var(--text-main); font-weight: 600;"><span style="color: #4f46e5; font-weight: 700;">例：</span>${hl(b.ja)}</div>
                                ${b.vi ? `<div style="font-size: calc(0.88rem * var(--cs-scale)); color: var(--text-sub); margin-top: 0.2rem;"><span style="color: #059669; font-weight: 700;">🇻🇳 Dịch:</span> ${hl(b.vi)}</div>` : ''}
                              </div>
                            `;
                          })() : ''}
                        </td>
                        <td style="vertical-align: top;"><small style="color: var(--text-sub); font-size: calc(0.9rem * var(--cs-scale));">${hl(it.note || '')}</small></td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- PHẦN 2 -->
          ${p2.length > 0 ? `
            <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06);">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                <h3 style="font-size: calc(1.15rem * var(--cs-scale)); font-weight: 800; color: #0891b2; margin: 0;">
                  <i class="fas fa-layer-group" style="margin-right: 0.4rem;"></i> PHẦN 2: 18 Phó Từ Đi Với Động Từ / Cụm Cố Định
                </h3>
                <span class="cs-badge-pill" style="background: rgba(8, 145, 178, 0.15); color: #0891b2; font-size: calc(0.85rem * var(--cs-scale)); font-weight: 700;">Trang 7 - 11 (18 cụm)</span>
              </div>
              <p style="font-size: calc(0.92rem * var(--cs-scale)); color: var(--text-sub); margin-bottom: 1.25rem;">
                Các phó từ chuyên đi kèm với các động từ thành cụm bất biến, xuất hiện dày đặc trong Mondai 4 & Mondai 6.
              </p>
              <div class="cs-table-wrap">
                <table class="cs-table">
                  <thead>
                    <tr>
                      <th style="width: 25%;">Phó từ</th>
                      <th style="width: 35%;">Cụm động từ cố định</th>
                      <th style="width: 40%;">Ý nghĩa & Ngữ cảnh sử dụng</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${p2.map(it => `
                      <tr>
                        <td style="vertical-align: top;"><span class="cs-highlight-term" style="font-size: calc(1rem * var(--cs-scale)); color: #0891b2; background: rgba(8, 145, 178, 0.1); border-color: rgba(8, 145, 178, 0.3);">${hl(it.adverb)}</span></td>
                        <td style="vertical-align: top;"><b style="color: #0e7490; font-size: calc(1.05rem * var(--cs-scale));">${hl(it.collocation)}</b></td>
                        <td style="vertical-align: top;">
                          <div style="font-weight: 600; color: var(--text-main); font-size: calc(0.95rem * var(--cs-scale));">${hl(it.meaning)}</div>
                          ${it.example ? (() => {
                            const b = formatBilingual(it.example);
                            return `
                              <div style="margin-top: 0.45rem; padding: 0.45rem 0.65rem; background: rgba(8, 145, 178, 0.05); border-left: 3px solid #0891b2; border-radius: 4px;">
                                <div style="font-size: calc(0.92rem * var(--cs-scale)); color: var(--text-main); font-weight: 600;"><span style="color: #0891b2; font-weight: 700;">例：</span>${hl(b.ja)}</div>
                                ${b.vi ? `<div style="font-size: calc(0.88rem * var(--cs-scale)); color: var(--text-sub); margin-top: 0.2rem;"><span style="color: #059669; font-weight: 700;">🇻🇳 Dịch:</span> ${hl(b.vi)}</div>` : ''}
                              </div>
                            `;
                          })() : ''}
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}

          <!-- PHẦN 3 -->
          ${p3.length > 0 ? `
            <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06);">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
                <h3 style="font-size: calc(1.15rem * var(--cs-scale)); font-weight: 800; color: #16a34a; margin: 0;">
                  <i class="fas fa-spell-check" style="margin-right: 0.4rem;"></i> PHẦN 3: 22 Phó Từ Láy Tượng Thanh Tượng Hình N2
                </h3>
                <span class="cs-badge-pill" style="background: rgba(22, 163, 74, 0.15); color: #16a34a; font-size: calc(0.85rem * var(--cs-scale)); font-weight: 700;">Trang 12 - 13 (22 từ)</span>
              </div>
              <p style="font-size: calc(0.92rem * var(--cs-scale)); color: var(--text-sub); margin-bottom: 1.25rem;">
                Bảng phân biệt các từ láy đuôi 「り」 và 「っと」 cực kỳ hay nhầm lẫn trong các kỳ thi JLPT N2.
              </p>
              <div class="cs-card-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));">
                ${p3.map(it => `
                  <div class="cs-grammar-card" style="border-left-color: #16a34a; padding: 1rem 1.15rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem;">
                      <span style="font-weight: 800; font-size: calc(1.15rem * var(--cs-scale)); color: #15803d;">${hl(it.word)}</span>
                      <span class="cs-badge-pill" style="background: rgba(22, 163, 74, 0.12); color: #15803d; font-size: 0.8rem;">Từ láy</span>
                    </div>
                    <div style="color: var(--text-main); font-size: calc(0.95rem * var(--cs-scale)); line-height: 1.5; font-weight: 600; margin-bottom: 0.45rem;">
                      💡 ${hl(it.meaning)}
                    </div>
                    ${it.example ? (() => {
                      const b = formatBilingual(it.example);
                      return `
                        <div style="margin-top: 0.4rem; padding: 0.45rem 0.65rem; background: rgba(22, 163, 74, 0.05); border-left: 3px solid #16a34a; border-radius: 4px;">
                          <div style="font-size: calc(0.92rem * var(--cs-scale)); color: var(--text-main); font-weight: 600;"><span style="color: #15803d; font-weight: 700;">例：</span>${hl(b.ja)}</div>
                          ${b.vi ? `<div style="font-size: calc(0.88rem * var(--cs-scale)); color: var(--text-sub); margin-top: 0.2rem;"><span style="color: #059669; font-weight: 700;">🇻🇳 Dịch:</span> ${hl(b.vi)}</div>` : ''}
                        </div>
                      `;
                    })() : ''}
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}
        </div>
      `;
      return;
    }

    // 3. ĐỘNG TỪ ĐA NGHĨA
    if (csId === "cs_dong_tu") {
      const verbs = (allData.cs_dong_tu || []).filter(v => {
        if (!query) return true;
        return v.verb.toLowerCase().includes(qLower) ||
               (v.kanji && v.kanji.toLowerCase().includes(qLower)) ||
               v.meanings.some(m => m.meaning.toLowerCase().includes(qLower) || m.example.toLowerCase().includes(qLower));
      });

      if (verbs.length === 0) {
        body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-sub);"><i class="fas fa-search" style="font-size:2.5rem;margin-bottom:0.85rem;display:block;opacity:0.6;"></i>Không tìm thấy động từ nào khớp với "${query}"</div>`;
        return;
      }

      body.innerHTML = `
        <div class="cs-card-grid">
          ${verbs.map(v => `
            <div class="cs-grammar-card" style="border-left-color: #ec4899;">
              <div class="cs-pattern-head">
                <span class="cs-pattern-title" style="color: #db2777; font-size: calc(1.3rem * var(--cs-scale));">
                  ${hl(v.verb)} <small style="font-size: calc(0.88rem * var(--cs-scale)); font-weight: normal; color: var(--text-sub);">[Hán Việt: ${v.kanji}]</small>
                </span>
                <span class="cs-badge-pill" style="background: rgba(236, 72, 153, 0.15); color: #db2777;">${v.meanings.length} Nét Nghĩa</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-top: 0.4rem;">
                ${v.meanings.map((m, idx) => {
                  const b = formatBilingual(m.example || "");
                  return `
                    <div style="background: var(--bg-main); padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border);">
                      <div style="font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem; font-size: calc(1rem * var(--cs-scale));">
                        <span style="color: #db2777; font-weight: 800;">${idx + 1}.</span> ${hl(m.meaning)}
                      </div>
                      ${b.ja ? `
                        <div class="cs-ex-ja" style="font-size: calc(0.96rem * var(--cs-scale));">${hl(b.ja)}</div>
                        ${b.vi ? `<div class="cs-ex-vi" style="font-size: calc(0.88rem * var(--cs-scale));">🇻🇳 ${hl(b.vi)}</div>` : ''}
                      ` : ''}
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      `;
      return;
    }

    // 4. TRỌN BỘ CẤU TRÚC MONO & KOTO (16 TRANG GỐC: こと, もの, 上, ところ)
    if (csId === "cs_mono_koto") {
      const data = allData.cs_mono_koto || { koto: [], mono: [], ue: [], tokoro: [] };
      const filterItems = (list) => list.filter(it => {
        if (!query) return true;
        return (it.pattern && it.pattern.toLowerCase().includes(qLower)) ||
               (it.meaning && it.meaning.toLowerCase().includes(qLower)) ||
               (it.example && it.example.toLowerCase().includes(qLower)) ||
               (it.note && it.note.toLowerCase().includes(qLower));
      });

      const kotoFiltered = filterItems(data.koto || []);
      const monoFiltered = filterItems(data.mono || []);
      const ueFiltered = filterItems(data.ue || []);
      const tokoroFiltered = filterItems(data.tokoro || []);

      if (kotoFiltered.length === 0 && monoFiltered.length === 0 && ueFiltered.length === 0 && tokoroFiltered.length === 0) {
        body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-sub);"><i class="fas fa-search" style="font-size:2.5rem;margin-bottom:0.85rem;display:block;opacity:0.6;"></i>Không tìm thấy cấu trúc nào khớp với "${query}"</div>`;
        return;
      }

      const renderSectionTable = (title, colorClass, colorCode, icon, list) => {
        if (!list || list.length === 0) return "";
        return `
          <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06);">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem;">
              <h3 style="font-size: calc(1.18rem * var(--cs-scale)); font-weight: 800; color: ${colorCode}; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${icon}"></i> ${title}
              </h3>
              <span class="cs-badge-pill" style="background: ${colorCode}22; color: ${colorCode}; font-size: calc(0.85rem * var(--cs-scale)); font-weight: 700;">${list.length} cấu trúc</span>
            </div>
            <div class="cs-table-wrap">
              <table class="cs-table">
                <thead>
                  <tr>
                    <th style="width: 25%;">Cấu trúc ngữ pháp</th>
                    <th style="width: 33%;">Ý nghĩa sư phạm & Lưu ý</th>
                    <th style="width: 42%;">Ví dụ thực tế song ngữ</th>
                  </tr>
                </thead>
                <tbody>
                  ${list.map(it => {
                    const b = formatBilingual(it.example || "");
                    return `
                      <tr>
                        <td style="vertical-align: top;"><span class="cs-highlight-term" style="color: ${colorCode}; background: ${colorCode}15; border-color: ${colorCode}33; font-weight: 800;">${hl(it.pattern)}</span></td>
                        <td style="vertical-align: top;">
                          <div style="font-weight: 600; color: var(--text-main); font-size: calc(0.95rem * var(--cs-scale));">${hl(it.meaning)}</div>
                          ${it.note ? `<div style="color: var(--text-sub); font-size: calc(0.88rem * var(--cs-scale)); margin-top: 0.25rem;"><i class="fas fa-lightbulb" style="color: #f59e0b; margin-right: 0.25rem;"></i>${hl(it.note)}</div>` : ''}
                        </td>
                        <td style="vertical-align: top;">
                          ${b.ja ? `
                            <div style="padding: 0.45rem 0.65rem; background: ${colorCode}08; border-left: 3px solid ${colorCode}; border-radius: 4px;">
                              <div class="cs-ex-ja" style="font-size: calc(0.94rem * var(--cs-scale)); font-weight: 600; color: var(--text-main);"><span style="color: ${colorCode}; font-weight: 700;">例：</span>${hl(b.ja)}</div>
                              ${b.vi ? `<div class="cs-ex-vi" style="font-size: calc(0.88rem * var(--cs-scale)); color: var(--text-sub); margin-top: 0.25rem;"><span style="color: #059669; font-weight: 700;">🇻🇳 Dịch:</span> ${hl(b.vi)}</div>` : ''}
                            </div>
                          ` : '-'}
                        </td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            </div>
          </div>
        `;
      };

      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2rem;">
          <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.04)); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 1rem 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.6rem; font-weight: 800; color: #047857; font-size: calc(1.05rem * var(--cs-scale)); margin-bottom: 0.35rem;">
              <i class="fas fa-layer-group" style="color: #10b981;"></i> Trọn Bộ Cấu Trúc もの & こと (Trọn Bộ 16 Trang Gốc)
            </div>
            <div style="color: var(--text-sub); font-size: calc(0.92rem * var(--cs-scale)); line-height: 1.5;">
              Cẩm nang phân biệt 4 nhóm cấu trúc kinh điển N2: Nhóm こと (15 mẫu), Nhóm もの (10 mẫu), Nhóm chữ 上 (4 mẫu) & Nhóm ところ (5 mẫu) kèm ví dụ song ngữ.
            </div>
          </div>

          ${renderSectionTable("PHẦN 1: Nhóm Cấu Trúc こと (KOTO)", "koto", "#059669", "fa-check-circle", kotoFiltered)}
          ${renderSectionTable("PHẦN 2: Nhóm Cấu Trúc もの (MONO)", "mono", "#2563eb", "fa-bookmark", monoFiltered)}
          ${renderSectionTable("PHẦN 3: Trọn Bộ Mẫu Câu Chữ 上 (うえ / じょう)", "ue", "#d97706", "fa-arrow-up", ueFiltered)}
          ${renderSectionTable("PHẦN 4: Trọn Bộ Mẫu Câu Chữ ところ (TOKORO)", "tokoro", "#7c3aed", "fa-map-marker-alt", tokoroFiltered)}
        </div>
      `;
      return;
    }

    // 5. KÍNH NGỮ N2 - N3 CẤP TỐC (27 TRANG)
    if (csId === "cs_kinh_ngu") {
      const data = allData.cs_kinh_ngu || {};
      const coreRules = data.coreRules || [];
      const verbTable = data.verbTable || data.special_verbs || [];
      const advancedNuances = data.advancedNuances || [];
      const exercises = data.practiceExercises || [];

      // Filter verb table
      const filteredVerbs = verbTable.filter(v => {
        if (!query) return true;
        const verbStr = (v.verb || v.normal || "").toLowerCase();
        const sonkeiStr = (v.sonkei || v.sonkeigo || "").toLowerCase();
        const kenjouStr = (v.kenjou || v.kenjougo || "").toLowerCase();
        const noteStr = (v.note || "").toLowerCase();
        return verbStr.includes(qLower) || sonkeiStr.includes(qLower) || kenjouStr.includes(qLower) || noteStr.includes(qLower);
      });

      // Filter exercises
      const filteredExercises = exercises.filter(ex => {
        if (!query) return true;
        return ex.sentence.toLowerCase().includes(qLower) ||
               ex.context.toLowerCase().includes(qLower) ||
               ex.options.some(opt => opt.toLowerCase().includes(qLower)) ||
               ex.explanation.toLowerCase().includes(qLower);
      });

      // Filter nuances
      const filteredNuances = advancedNuances.filter(nu => {
        if (!query) return true;
        return nu.title.toLowerCase().includes(qLower) || nu.content.toLowerCase().includes(qLower);
      });

      // Check if anything matched
      if (filteredVerbs.length === 0 && filteredExercises.length === 0 && filteredNuances.length === 0 && query) {
        body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-sub);"><i class="fas fa-search" style="font-size:2.5rem;margin-bottom:0.85rem;display:block;opacity:0.6;"></i>Không tìm thấy nội dung kính ngữ nào khớp với "${query}"</div>`;
        return;
      }

      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2.25rem;">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.05)); border: 1.5px solid rgba(245, 158, 11, 0.3); border-radius: 16px; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.35rem;">
                <span class="cs-badge-pill" style="background: #f59e0b; color: #fff; font-size: 0.85rem; font-weight: 800;">
                  <i class="fas fa-file-pdf"></i> TÀI LIỆU GỐC: 27 TRANG
                </span>
                <span style="font-size: calc(1.15rem * var(--cs-scale)); font-weight: 800; color: var(--text-main);">
                  Sổ Tay Kính Ngữ N2 - N3 Cấp Tốc
                </span>
              </div>
              <div style="font-size: calc(0.92rem * var(--cs-scale)); color: var(--text-sub); line-height: 1.5;">
                Đầy đủ 4 công thức cốt lõi, bảng 18 động từ bất quy tắc đặc biệt, phân biệt sắc thái tinh tế và trọn bộ 18 câu bài tập thực chiến có giải thích chi tiết.
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <a href="#cs-kn-rules" class="cs-ctrl-btn" style="text-decoration: none; font-size: 0.84rem; font-weight: 700; color: var(--primary); padding: 0.4rem 0.8rem;"><i class="fas fa-scroll"></i> Quy tắc</a>
              <a href="#cs-kn-table" class="cs-ctrl-btn" style="text-decoration: none; font-size: 0.84rem; font-weight: 700; color: #059669; padding: 0.4rem 0.8rem;"><i class="fas fa-table"></i> Bảng động từ</a>
              <a href="#cs-kn-nuances" class="cs-ctrl-btn" style="text-decoration: none; font-size: 0.84rem; font-weight: 700; color: #d97706; padding: 0.4rem 0.8rem;"><i class="fas fa-lightbulb"></i> Phân biệt</a>
              <a href="#cs-kn-exercises" class="cs-ctrl-btn" style="text-decoration: none; font-size: 0.84rem; font-weight: 700; color: #8b5cf6; padding: 0.4rem 0.8rem;"><i class="fas fa-tasks"></i> 18 Bài tập</a>
            </div>
          </div>

          <!-- PHẦN 1: CÔNG THỨC QUY TẮC CỐT LÕI (TRANG 3-4) -->
          ${!query ? `
            <div id="cs-kn-rules">
              <h3 style="font-size: calc(1.2rem * var(--cs-scale)); font-weight: 800; color: #f59e0b; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-scroll"></i> 1. Quy Tắc Biến Đổi Kính Ngữ Cốt Lõi (Trang 2 - 4)
              </h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;">
                ${coreRules.map(cat => `
                  <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 1.25rem; box-shadow: 0 4px 14px -2px rgba(0,0,0,0.05);">
                    <h4 style="font-size: calc(1.05rem * var(--cs-scale)); font-weight: 800; color: var(--primary); margin-bottom: 0.85rem; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border);">
                      ${cat.category}
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                      ${cat.rules.map(r => `
                        <div style="background: var(--bg-main); border: 1px solid var(--border); border-radius: 10px; padding: 0.75rem 1rem;">
                          <div style="font-family: monospace; font-size: calc(1rem * var(--cs-scale)); font-weight: 800; color: #d97706; margin-bottom: 0.25rem;">
                            📌 ${r.formula}
                          </div>
                          <div style="font-size: calc(0.9rem * var(--cs-scale)); font-weight: 600; color: var(--text-main); margin-bottom: 0.4rem;">
                            💡 ${r.meaning}
                          </div>
                          <div style="font-size: calc(0.88rem * var(--cs-scale)); color: var(--text-sub); border-left: 2.5px solid #f59e0b; padding-left: 0.6rem;">
                            ${r.examples.join("<br>")}
                          </div>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}

          <!-- PHẦN 2: BẢNG TRA CỨU ĐỐI CHIẾU 3 CỘT (TRANG 5 - 7) -->
          <div id="cs-kn-table">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
              <h3 style="font-size: calc(1.2rem * var(--cs-scale)); font-weight: 800; color: #059669; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-table"></i> 2. Bảng Đối Chiếu 3 Cột Kính Ngữ Đặc Biệt (Trang 5 - 7)
              </h3>
              <span class="cs-badge-pill" style="background: rgba(16, 185, 129, 0.12); color: #059669; font-weight: 700;">
                ${filteredVerbs.length} động từ
              </span>
            </div>
            <div class="cs-table-wrap">
              <table class="cs-table">
                <thead>
                  <tr>
                    <th style="width: 20%;">Động từ thông thường</th>
                    <th style="width: 30%; color: #059669;">Tôn kính ngữ (尊敬語 - Đối phương)</th>
                    <th style="width: 30%; color: #d97706;">Khiêm nhường ngữ (謙譲語 - Bản thân)</th>
                    <th style="width: 20%;">Mẹo phân biệt & Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredVerbs.map(it => `
                    <tr>
                      <td><b style="font-size: calc(1.08rem * var(--cs-scale));">${hl(it.verb || it.normal)}</b></td>
                      <td><span style="color: #059669; font-weight: 700; font-size: calc(1.04rem * var(--cs-scale));">${hl(it.sonkei || it.sonkeigo)}</span></td>
                      <td><span style="color: #d97706; font-weight: 700; font-size: calc(1.04rem * var(--cs-scale));">${hl(it.kenjou || it.kenjougo)}</span></td>
                      <td><small style="color: var(--text-sub); font-size: calc(0.88rem * var(--cs-scale)); line-height: 1.4; display: block;">${hl(it.note || '')}</small></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- PHẦN 3: PHÂN BIỆT SẮC THÁI TINH TẾ & THƯƠNG MẠI (TRANG 8 - 9) -->
          ${filteredNuances.length > 0 ? `
            <div id="cs-kn-nuances">
              <h3 style="font-size: calc(1.2rem * var(--cs-scale)); font-weight: 800; color: #d97706; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-lightbulb"></i> 3. Phân Biệt Sắc Thái Tinh Tế & Nhờ Vả Thương Mại (Trang 8 - 9)
              </h3>
              <div class="cs-card-grid">
                ${filteredNuances.map(nu => `
                  <div class="cs-grammar-card" style="border-left-color: #d97706;">
                    <div class="cs-pattern-head">
                      <span class="cs-pattern-title" style="color: #b45309; font-size: calc(1.15rem * var(--cs-scale));">
                        <i class="fas fa-check-circle" style="color: #f59e0b; margin-right: 0.4rem;"></i>${hl(nu.title)}
                      </span>
                    </div>
                    <div class="cs-note-box" style="margin-top: 0.6rem; font-size: calc(0.96rem * var(--cs-scale)); line-height: 1.65; white-space: pre-line;">
                      ${hl(nu.content)}
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}

          <!-- PHẦN 4: 18 BÀI TẬP KÍNH NGỮ THỰC CHIẾN (TRANG 10 - 27) -->
          <div id="cs-kn-exercises">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.75rem;">
              <div>
                <h3 style="font-size: calc(1.2rem * var(--cs-scale)); font-weight: 800; color: #8b5cf6; margin: 0 0 0.25rem 0; display: flex; align-items: center; gap: 0.5rem;">
                  <i class="fas fa-tasks"></i> 4. Trọn Bộ 18 Câu Bài Tập Kính Ngữ Thực Chiến Có Phân Tích (Trang 10 - 27)
                </h3>
                <div style="font-size: calc(0.88rem * var(--cs-scale)); color: var(--text-sub);">
                  🎯 Đã làm: <b>${exercises.filter(e => this.keigoPracticeAnswers && this.keigoPracticeAnswers[e.id] !== undefined).length}/${exercises.length} câu</b>
                  ${exercises.some(e => this.keigoPracticeAnswers && this.keigoPracticeAnswers[e.id] !== undefined) ? `• Đúng: <b style="color: #059669;">${exercises.filter(e => this.keigoPracticeAnswers && this.keigoPracticeAnswers[e.id] === e.correctAnswer).length}/${exercises.filter(e => this.keigoPracticeAnswers && this.keigoPracticeAnswers[e.id] !== undefined).length}</b> (${Math.round((exercises.filter(e => this.keigoPracticeAnswers && this.keigoPracticeAnswers[e.id] === e.correctAnswer).length / Math.max(1, exercises.filter(e => this.keigoPracticeAnswers && this.keigoPracticeAnswers[e.id] !== undefined).length)) * 100)}%)` : '• Nhấp vào đáp án bạn chọn để làm bài và xem giải thích!'}
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <button type="button" class="cs-ctrl-btn" onclick="app.toggleKeigoShowAllAnswers()" style="font-size: 0.82rem; font-weight: 700; color: ${this.keigoShowAllAnswers ? '#d97706' : '#8b5cf6'}; padding: 0.45rem 0.85rem; border-radius: 8px;">
                  <i class="fas ${this.keigoShowAllAnswers ? 'fa-eye-slash' : 'fa-eye'}"></i> ${this.keigoShowAllAnswers ? 'Ẩn đáp án (Tự luyện)' : 'Hiện tất cả đáp án'}
                </button>
                ${exercises.some(e => this.keigoPracticeAnswers && this.keigoPracticeAnswers[e.id] !== undefined) ? `
                  <button type="button" class="cs-ctrl-btn" onclick="app.resetAllKeigoPractice()" style="font-size: 0.82rem; font-weight: 700; color: #ef4444; padding: 0.45rem 0.85rem; border-radius: 8px;" title="Xóa toàn bộ bài làm để làm lại từ đầu">
                    <i class="fas fa-redo"></i> Làm lại tất cả
                  </button>
                ` : ''}
              </div>
            </div>

            ${!this.keigoShowAllAnswers && !exercises.some(e => this.keigoPracticeAnswers && this.keigoPracticeAnswers[e.id] !== undefined) ? `
              <div style="background: rgba(139, 92, 246, 0.08); border: 1px dashed rgba(139, 92, 246, 0.35); border-radius: 12px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.65rem; font-size: calc(0.9rem * var(--cs-scale)); color: var(--text-main);">
                <i class="fas fa-hand-pointer" style="color: #8b5cf6; font-size: 1.15rem; flex-shrink: 0;"></i>
                <span><b>Chế độ Tự Luyện Tập Tương Tác:</b> Nhấp chuột chọn 1 trong 4 đáp án bên dưới. Hệ thống sẽ chấm đúng/sai ngay lập tức và mở khóa phần dịch nghĩa cùng phân tích sư phạm chi tiết!</span>
              </div>
            ` : ''}

            <div style="display: flex; flex-direction: column; gap: 1.25rem;">
              ${filteredExercises.map(ex => {
                const userAns = this.keigoPracticeAnswers ? this.keigoPracticeAnswers[ex.id] : null;
                const isAnswered = userAns !== undefined && userAns !== null;
                const isCorrect = isAnswered && userAns === ex.correctAnswer;
                const showExplanation = this.keigoShowAllAnswers || isAnswered;

                return `
                <div id="cs-kn-card-${ex.id}" style="background: var(--card-bg); border: 1.5px solid ${isAnswered ? (isCorrect ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)') : 'var(--border)'}; border-radius: 14px; padding: 1.35rem; box-shadow: 0 4px 14px -2px rgba(0,0,0,0.05); border-left: 5px solid ${isAnswered ? (isCorrect ? '#10b981' : '#ef4444') : '#8b5cf6'}; transition: all 0.2s ease;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                      <span class="cs-badge-pill" style="background: #8b5cf6; color: #fff; font-weight: 800; font-size: 0.85rem;">
                        Câu ${ex.id}
                      </span>
                      <span style="font-size: calc(0.92rem * var(--cs-scale)); font-weight: 700; color: var(--text-sub);">
                        [${hl(ex.context)}]
                      </span>
                      ${isAnswered ? (isCorrect ? `
                        <span class="cs-badge-pill" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 800; font-size: 0.82rem;">
                          <i class="fas fa-check-circle"></i> Chính xác!
                        </span>
                      ` : `
                        <span class="cs-badge-pill" style="background: rgba(239, 68, 68, 0.15); color: #dc2626; font-weight: 800; font-size: 0.82rem;">
                          <i class="fas fa-times-circle"></i> Chưa đúng (Đáp án đúng: ${ex.correctAnswer})
                        </span>
                      `) : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                      ${isAnswered ? `
                        <button type="button" class="cs-ctrl-btn" onclick="app.resetKeigoQuestion(${ex.id})" style="font-size: 0.78rem; padding: 0.25rem 0.6rem; color: var(--text-sub); border-color: var(--border);" title="Làm lại câu này">
                          <i class="fas fa-redo"></i> Làm lại
                        </button>
                      ` : ''}
                      <span style="font-size: 0.82rem; color: var(--text-sub); font-weight: 600;">Trang ${ex.page}</span>
                    </div>
                  </div>

                  <div style="font-size: calc(1.08rem * var(--cs-scale)); font-weight: 700; color: var(--text-main); margin-bottom: 1rem; line-height: 1.7; background: var(--bg-main); padding: 0.85rem 1.15rem; border-radius: 10px; border: 1px solid var(--border);">
                    ${hl(ex.sentence)}
                  </div>

                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.65rem; margin-bottom: ${showExplanation ? '1rem' : '0.5rem'};">
                    ${ex.options.map((opt, oIdx) => {
                      const optNum = oIdx + 1;
                      const isThisCorrect = optNum === ex.correctAnswer;
                      const isThisSelected = userAns === optNum;

                      let optBorder = 'var(--border)';
                      let optBg = 'var(--card-bg)';
                      let optColor = 'var(--text-main)';
                      let optFontWeight = '600';
                      let badgeHtml = '';

                      if (this.keigoShowAllAnswers) {
                        if (isThisCorrect) {
                          optBorder = '#10b981';
                          optBg = 'rgba(16, 185, 129, 0.12)';
                          optColor = '#059669';
                          optFontWeight = '700';
                          badgeHtml = '<span style="background: #10b981; color: #fff; font-size: 0.75rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;"><i class="fas fa-check"></i> ĐÁP ÁN</span>';
                        }
                      } else if (isAnswered) {
                        if (isThisSelected && isCorrect) {
                          // Người học chọn đúng
                          optBorder = '#10b981';
                          optBg = 'rgba(16, 185, 129, 0.15)';
                          optColor = '#059669';
                          optFontWeight = '700';
                          badgeHtml = '<span style="background: #10b981; color: #fff; font-size: 0.75rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;"><i class="fas fa-check"></i> ĐÚNG</span>';
                        } else if (isThisSelected && !isCorrect) {
                          // Người học chọn sai
                          optBorder = '#ef4444';
                          optBg = 'rgba(239, 68, 68, 0.12)';
                          optColor = '#dc2626';
                          optFontWeight = '700';
                          badgeHtml = '<span style="background: #ef4444; color: #fff; font-size: 0.75rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;"><i class="fas fa-times"></i> ĐÃ CHỌN</span>';
                        } else if (isThisCorrect && !isCorrect) {
                          // Hiển thị đáp án đúng để đối chiếu khi người học chọn sai
                          optBorder = '#10b981';
                          optBg = 'rgba(16, 185, 129, 0.1)';
                          optColor = '#059669';
                          optFontWeight = '700';
                          badgeHtml = '<span style="background: #10b981; color: #fff; font-size: 0.75rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;"><i class="fas fa-check"></i> ĐÁP ÁN ĐÚNG</span>';
                        } else {
                          optBorder = 'var(--border)';
                          optBg = 'var(--bg-main)';
                          optColor = 'var(--text-sub)';
                          optFontWeight = '500';
                        }
                      }

                      return `
                        <div class="cs-keigo-opt-btn" 
                             onclick="app.selectKeigoOption(${ex.id}, ${optNum})"
                             style="padding: 0.75rem 1rem; border-radius: 10px; border: 1.5px solid ${optBorder}; background: ${optBg}; font-size: calc(0.95rem * var(--cs-scale)); font-weight: ${optFontWeight}; color: ${optColor}; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                          <span><b style="color: ${isThisCorrect && (isAnswered || this.keigoShowAllAnswers) ? '#059669' : (isThisSelected ? '#dc2626' : '#8b5cf6')}; margin-right: 0.4rem;">${optNum}.</b> ${hl(opt)}</span>
                          ${badgeHtml ? badgeHtml : `<span style="font-size: 0.8rem; color: var(--text-sub); opacity: 0.5;"><i class="far fa-circle"></i></span>`}
                        </div>
                      `;
                    }).join("")}
                  </div>

                  ${showExplanation ? `
                    <div style="background: var(--bg-main); border: 1.5px solid ${isCorrect ? 'rgba(16, 185, 129, 0.4)' : (isAnswered ? 'rgba(239, 68, 68, 0.4)' : 'rgba(139, 92, 246, 0.3)')}; border-radius: 12px; padding: 1.1rem 1.25rem; font-size: calc(0.95rem * var(--cs-scale)); line-height: 1.65; color: var(--text-main); margin-top: 0.85rem;" class="cs-explanation-card">
                      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.65rem; font-weight: 800; font-size: 0.96rem; color: ${isCorrect ? '#059669' : (isAnswered ? '#dc2626' : '#8b5cf6')};">
                        <i class="fas ${isCorrect ? 'fa-check-circle' : (isAnswered ? 'fa-info-circle' : 'fa-lightbulb')}"></i>
                        ${isCorrect ? 'Chúc mừng bạn đã chọn đúng! Phân tích chi tiết:' : (isAnswered ? 'Phân tích tại sao câu trả lời của bạn chưa chuẩn:' : '💡 Phân tích & Lời giải chi tiết:')}
                      </div>
                      ${ex.explanation}
                    </div>
                  ` : `
                    <div style="display: flex; justify-content: flex-end; margin-top: 0.4rem;">
                      <button type="button" class="cs-ctrl-btn" onclick="app.selectKeigoOption(${ex.id}, ${ex.correctAnswer})" style="font-size: 0.78rem; font-weight: 600; color: var(--text-sub); border-color: var(--border); padding: 0.3rem 0.65rem; border-radius: 6px;">
                        <i class="fas fa-eye"></i> Xem ngay đáp án câu này
                      </button>
                    </div>
                  `}
                </div>
              `;
              }).join("")}
            </div>
          </div>
        </div>
      `;
      return;
    }

    // 6. BẪY ĐỌC HIỂU & CÔNG THỨC NGHE HIỂU
    if (csId === "cs_dokkai_choukai") {
      const data = allData.cs_dokkai_choukai || {};
      const rawTraps = data.dokkai_traps || data.readingTraps || [];
      const rawFormulas = data.choukai_formulas || data.listeningFormulas || [];

      const traps = rawTraps.filter(t => {
        if (!query) return true;
        const name = (t.trap_name || t.trapName || "").toLowerCase();
        const desc = (t.desc || t.description || "").toLowerCase();
        const sol = (t.solution || t.howToAvoid || "").toLowerCase();
        return name.includes(qLower) || desc.includes(qLower) || sol.includes(qLower);
      });

      const formulas = rawFormulas.filter(f => {
        if (!query) return true;
        const mondai = (f.mondai || "").toLowerCase();
        const tip = (f.tip || f.strategy || "").toLowerCase();
        return mondai.includes(qLower) || tip.includes(qLower);
      });

      if (traps.length === 0 && formulas.length === 0 && query) {
        body.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--text-sub);"><i class="fas fa-search" style="font-size:2.5rem;margin-bottom:0.85rem;display:block;opacity:0.6;"></i>Không tìm thấy nội dung bẫy đọc - nghe nào khớp với "${query}"</div>`;
        return;
      }

      body.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2rem;">
          <div>
            <h3 style="font-size: calc(1.2rem * var(--cs-scale)); font-weight: 800; color: #f59e0b; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-exclamation-triangle"></i> Cẩm Nang 5 Bẫy Đọc Hiểu Kinh Điển JLPT N2
            </h3>
            <div class="cs-card-grid">
              ${traps.map((t, idx) => `
                <div class="cs-grammar-card" style="border-left-color: #f59e0b;">
                  <div class="cs-pattern-head">
                    <span class="cs-pattern-title" style="color: #d97706;">
                      ${hl(t.trap_name || t.trapName || `Bẫy ${idx + 1}`)}
                    </span>
                  </div>
                  <div class="cs-meaning-text">
                    ${hl(t.desc || t.description)}
                  </div>
                  <div class="cs-note-box" style="margin-top: 0.4rem;">
                    <div><b>🛡️ Cách phá bẫy:</b> ${hl(t.solution || t.howToAvoid)}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>

          <div>
            <h3 style="font-size: calc(1.2rem * var(--cs-scale)); font-weight: 800; color: #8b5cf6; margin-bottom: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
              <i class="fas fa-headphones"></i> Chiến Thuật 5 Mondai Nghe Hiểu (Choukai)
            </h3>
            <div class="cs-card-grid">
              ${formulas.map(f => `
                <div class="cs-grammar-card" style="border-left-color: #8b5cf6;">
                  <div class="cs-pattern-head">
                    <span class="cs-pattern-title" style="color: #6d28d9;">
                      ${hl(f.mondai)}
                    </span>
                  </div>
                  <div style="background: var(--bg-main); padding: 0.85rem 1.1rem; border-radius: 10px; border: 1px solid var(--border); font-size: calc(0.96rem * var(--cs-scale)); line-height: 1.6; color: var(--text-main);">
                    💡 <b>Bí quyết:</b> ${hl(f.tip || f.strategy)}
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
      return;
    }
  }

  selectKeigoOption(exId, chosenOpt) {
    if (!this.keigoPracticeAnswers) this.keigoPracticeAnswers = {};
    this.keigoPracticeAnswers[exId] = chosenOpt;
    try {
      localStorage.setItem("jlpt_keigo_practice_answers", JSON.stringify(this.keigoPracticeAnswers));
    } catch (e) {}

    const body = document.getElementById("cs-modal-body");
    const prevScroll = body ? body.scrollTop : 0;
    const searchInput = document.getElementById("cs-search-input");
    const query = searchInput ? searchInput.value.trim() : "";
    this.renderCheatsheetContent("cs_kinh_ngu", query);
    if (body) body.scrollTop = prevScroll;
  }

  resetKeigoQuestion(exId) {
    if (this.keigoPracticeAnswers && this.keigoPracticeAnswers[exId] !== undefined) {
      delete this.keigoPracticeAnswers[exId];
      try {
        localStorage.setItem("jlpt_keigo_practice_answers", JSON.stringify(this.keigoPracticeAnswers));
      } catch (e) {}
    }
    const body = document.getElementById("cs-modal-body");
    const prevScroll = body ? body.scrollTop : 0;
    const searchInput = document.getElementById("cs-search-input");
    const query = searchInput ? searchInput.value.trim() : "";
    this.renderCheatsheetContent("cs_kinh_ngu", query);
    if (body) body.scrollTop = prevScroll;
  }

  resetAllKeigoPractice() {
    if (confirm("Bạn có chắc muốn xóa kết quả để làm lại toàn bộ 18 câu bài tập Kính ngữ từ đầu không?")) {
      this.keigoPracticeAnswers = {};
      this.keigoShowAllAnswers = false;
      try {
        localStorage.removeItem("jlpt_keigo_practice_answers");
      } catch (e) {}
      const body = document.getElementById("cs-modal-body");
      const prevScroll = body ? body.scrollTop : 0;
      const searchInput = document.getElementById("cs-search-input");
      const query = searchInput ? searchInput.value.trim() : "";
      this.renderCheatsheetContent("cs_kinh_ngu", query);
      if (body) body.scrollTop = prevScroll;
    }
  }

  toggleKeigoShowAllAnswers() {
    this.keigoShowAllAnswers = !this.keigoShowAllAnswers;
    const body = document.getElementById("cs-modal-body");
    const prevScroll = body ? body.scrollTop : 0;
    const searchInput = document.getElementById("cs-search-input");
    const query = searchInput ? searchInput.value.trim() : "";
    this.renderCheatsheetContent("cs_kinh_ngu", query);
    if (body) body.scrollTop = prevScroll;
  }

  clearDraft(sessionId) {
    if (confirm(`Bạn có chắc chắn muốn xóa bản nháp làm dở của ${sessionId} để làm lại từ đầu?`)) {
      localStorage.removeItem(`jlpt_draft_${sessionId}`);
      if (this.currentSessionId === sessionId) {
        this.userAnswers = {};
        this.starAnswers = {};
      }
      if (this.currentDashboardTab === "drills") {
        this.renderDrillsDashboard();
      } else {
        this.renderDashboard();
      }
    }
  }

  highlightSelectedText() {
    let selection = window.getSelection();
    let range = null;

    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      range = selection.getRangeAt(0);
    } else if (this.savedSelectionRange) {
      range = this.savedSelectionRange;
    }

    if (!range) {
      alert("Vui lòng chọn đoạn văn bản trong bài đọc trước khi bấm Bôi vàng (hoặc phím H)!");
      return;
    }

    const selectedText = range.toString().trim();
    if (!selectedText) {
      alert("Vui lòng chọn đoạn văn bản trong bài đọc trước khi bấm Bôi vàng!");
      return;
    }

    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
    const dokkaiContent = container.closest(".dokkai-content");
    if (!dokkaiContent) {
      alert("Bạn chỉ có thể bôi vàng đoạn văn bản bên trong bài Đọc hiểu!");
      return;
    }

    const mark = document.createElement("mark");
    mark.className = "dokkai-hl";
    try {
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
      if (selection && selection.removeAllRanges) selection.removeAllRanges();
      this.savedSelectionRange = null;

      const bubble = document.getElementById("selection-action-bubble");
      if (bubble) bubble.style.display = "none";

      const passageKey = dokkaiContent.getAttribute("data-passage-key");
      if (passageKey) {
        this.highlights[passageKey] = dokkaiContent.innerHTML;
        localStorage.setItem("jlpt_highlights", JSON.stringify(this.highlights));
        this.showAutoSaveIndicator();
      }
    } catch (e) {
      console.warn("Highlight error", e);
    }
  }

  clearHighlights() {
    const sessionPrefix = `${this.currentSessionId}_p_`;
    let count = 0;
    Object.keys(this.highlights).forEach(k => {
      if (k.startsWith(sessionPrefix)) {
        delete this.highlights[k];
        count++;
      }
    });
    if (count > 0) {
      localStorage.setItem("jlpt_highlights", JSON.stringify(this.highlights));
      this.renderQuestions();
      this.showAutoSaveIndicator();
    } else {
      alert("Chưa có đoạn bôi vàng nào trong buổi này để xóa.");
    }
  }

  // --- TÍNH NĂNG MỚI: TỪ ĐIỂN TRA NHANH KHI CLICK ĐÚP ---
  cleanJapaneseWord(str) {
    if (!str) return "";
    // Loại bỏ dấu gạch chân, số, ký tự đặc biệt, ngoặc, khoảng trắng
    let cleaned = str.replace(/[_0-9a-zA-Z\s\.,\?!。、・「」『』（）\(\)\*\★\-\+\/\\:;~`]/g, "").trim();
    if (cleaned.length > 12) cleaned = cleaned.substring(0, 12);
    return cleaned;
  }

  showDictPopup(word, rect) {
    if (!this.enableMaziiLookup) return;
    const popup = document.getElementById("dict-popup");
    if (!popup) return;

    const elWord = document.getElementById("dict-popup-word");
    const elReading = document.getElementById("dict-popup-reading");
    const elHanviet = document.getElementById("dict-popup-hanviet");
    const elBody = document.getElementById("dict-popup-body");
    const elTag = document.getElementById("dict-popup-tag");
    const elLink = document.getElementById("dict-popup-link");

    elWord.textContent = word;
    elReading.textContent = "...";
    elReading.style.display = "inline-block";
    elHanviet.textContent = "";
    elHanviet.style.display = "none";
    elTag.textContent = "JLPT N2";
    elLink.href = `https://mazii.net/vi-VN/search/word/javi/${encodeURIComponent(word)}`;

    elBody.innerHTML = `
      <div class="dict-loading">
        <i class="fas fa-spinner fa-spin"></i> Đang tra cứu "<b>${word}</b>"...
      </div>
    `;

    popup.style.display = "block";

    // Ẩn selection bubble khi mở popup từ điển
    const bubble = document.getElementById("selection-action-bubble");
    if (bubble) bubble.style.display = "none";

    // Trên điện thoại (<= 600px): hiển thị dạng Bottom Sheet trượt từ đáy màn hình lên
    if (window.innerWidth <= 600) {
      popup.classList.add("bottom-sheet");
      popup.style.left = "0";
      popup.style.right = "0";
      popup.style.top = "auto";
      popup.style.bottom = "0";
      popup.style.width = "100%";
      popup.style.maxWidth = "100%";
    } else {
      popup.classList.remove("bottom-sheet");
      popup.style.bottom = "auto";
      popup.style.right = "auto";
      popup.style.maxWidth = "90vw";
      popup.style.width = "320px";

      const popupWidth = popup.offsetWidth || 320;
      const popupHeight = popup.offsetHeight || 180;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = (rect.left || 0) + ((rect.width || 0) / 2) - (popupWidth / 2);
      let top = (rect.top || 0) - popupHeight - 12;

      if (top < 10) {
        top = (rect.bottom || (rect.top || 0) + (rect.height || 24)) + 12;
      }
      if (left < 10) left = 10;
      if (left + popupWidth > viewportWidth - 15) {
        left = viewportWidth - popupWidth - 15;
      }

      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
    }

    // Gọi API hoặc lấy từ cache
    this.lookupWord(word);
  }

  hideDictPopup() {
    const popup = document.getElementById("dict-popup");
    if (popup) popup.style.display = "none";
    const bubble = document.getElementById("selection-action-bubble");
    if (bubble) bubble.style.display = "none";
  }

  // TỐI ƯU PHÁT ÂM TIẾNG NHẬT: Hoạt động hoàn hảo trên iPhone Safari, iPad, Android & Desktop
  speakWord(word) {
    if (!word) return;
    // Làm sạch từ/câu để đọc tự nhiên, không giới hạn độ dài 12 ký tự
    const cleanWord = String(word).replace(/<[^>]+>/g, "").replace(/[_~`\*\^]/g, "").trim();
    if (!cleanWord) return;

    // Bộ phát âm Online qua Google Translate TTS (hoạt động tuyệt hảo nhờ meta no-referrer)
    const playFallbackAudio = () => {
      try {
        if (this.currentAudioEl) {
          this.currentAudioEl.pause();
          this.currentAudioEl = null;
        }
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(cleanWord)}`;
        const audio = new Audio();
        audio.referrerPolicy = "no-referrer";
        audio.src = audioUrl;
        this.currentAudioEl = audio;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn("Audio play prevented/failed:", err);
          });
        }
      } catch (err) {
        console.warn("Audio initialization error:", err);
      }
    };

    // Kiểm tra và sử dụng Web Speech Synthesis nếu có sẵn
    if ("speechSynthesis" in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const u = new SpeechSynthesisUtterance(cleanWord);
        u.lang = "ja-JP";
        u.rate = 0.9;

        // Tránh lỗi WebKit Garbage Collection trên iOS Safari (giữ tham chiếu window)
        window._activeSpeechUtterance = u;

        const voices = (this.cachedVoices && this.cachedVoices.length > 0)
          ? this.cachedVoices
          : window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const jaVoice = voices.find(v => v.lang === "ja-JP" || v.lang.startsWith("ja") || (v.name && v.name.toLowerCase().includes("japanese")));
          if (jaVoice) u.voice = jaVoice;
        }

        let started = false;
        u.onstart = () => { started = true; };
        u.onerror = (e) => {
          console.warn("speechSynthesis error, switching to audio fallback:", e);
          window._activeSpeechUtterance = null;
          playFallbackAudio();
        };

        const timeoutId = setTimeout(() => {
          if (!started && (!window.speechSynthesis.speaking || window.speechSynthesis.paused)) {
            playFallbackAudio();
          }
        }, 1200);

        u.onend = () => {
          clearTimeout(timeoutId);
          window._activeSpeechUtterance = null;
        };

        window.speechSynthesis.speak(u);
      } catch (e) {
        console.warn("SpeechSynthesis error:", e);
        playFallbackAudio();
      }
    } else {
      playFallbackAudio();
    }
  }

  // Phát âm toàn bộ câu tiếng Nhật khi bấm icon loa
  speakSentence(qId) {
    const all = this.getAllQuestions();
    const q = all.find(x => x.id === qId);
    if (!q) return;

    let text = "";
    if (q.sentence) {
      const div = document.createElement("div");
      // Loại bỏ thẻ <rt> để chỉ đọc Kanji hoặc chữ tự nhiên
      div.innerHTML = q.sentence.replace(/<rt>.*?<\/rt>/gi, "");
      text = div.textContent || div.innerText || "";
    } else if (q.questionText) {
      text = q.questionText;
    }
    if (text) {
      this.speakWord(text.trim());
    }
  }

  findBestDictMatch(query, list) {
    if (!list || list.length === 0) return null;
    const q = query.trim();

    // 1. Exact match on word
    const exactWord = list.find(item => item.word === q);
    if (exactWord) return exactWord;

    // 2. Exact match on phonetic (for hiragana searches like むしろ -> 寧ろ)
    const exactPhonetic = list.filter(item => item.phonetic && item.phonetic.trim() === q);
    if (exactPhonetic.length > 0) return exactPhonetic[0];

    // 3. Phonetic contains query as one of the space-separated readings
    const tokenMatches = list.filter(item => {
      if (!item.phonetic) return false;
      const tokens = item.phonetic.trim().split(/\s+/);
      return tokens.includes(q);
    });
    if (tokenMatches.length > 0) {
      tokenMatches.sort((a, b) => {
        const aFirst = a.phonetic.trim().split(/\s+/)[0] === q;
        const bFirst = b.phonetic.trim().split(/\s+/)[0] === q;
        if (aFirst && !bFirst) return -1;
        if (!aFirst && bFirst) return 1;
        return 0;
      });
      return tokenMatches[0];
    }

    // 4. Default fallback: first item
    return list[0];
  }

  async lookupWord(word) {
    // 1. Kiểm tra từ điển có sẵn (offline)
    if (window.JLPT_COMMON_DICT && window.JLPT_COMMON_DICT[word]) {
      this.renderDictResult(word, window.JLPT_COMMON_DICT[word]);
      return;
    }

    // 2. Kiểm tra cache trong localStorage và loại bỏ cache sai cũ
    if (this.dictCache[word]) {
      const cached = this.dictCache[word];
      const isBadCache = (word === "むしろ" && cached.word === "席");
      if (!isBadCache) {
        this.renderDictResult(word, cached);
        return;
      } else {
        delete this.dictCache[word];
        try { localStorage.setItem("jlpt_dict_cache", JSON.stringify(this.dictCache)); } catch(e) {}
      }
    }

    // 3. Tra cứu từ điển Mazii API với thuật toán khớp từ thông minh
    try {
      const resp = await fetch("https://mazii.net/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          dict: "javi",
          type: "word",
          query: word,
          page: 1
        })
      });

      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const resJson = await resp.json();

      if (resJson && resJson.data && resJson.data.length > 0) {
        const item = this.findBestDictMatch(word, resJson.data);
        if (item) {
          this.dictCache[word] = item;
          try {
            localStorage.setItem("jlpt_dict_cache", JSON.stringify(this.dictCache));
          } catch (e) {}
          this.renderDictResult(word, item);
          return;
        }
      }
    } catch (err) {
      console.warn("Mazii API query error", err);
    }

    // 4. Fallback: Tra cứu trong phần giải thích của buổi thi hiện tại
    this.renderDictFallback(word);
  }

  renderDictResult(word, item) {
    const elWord = document.getElementById("dict-popup-word");
    const elReading = document.getElementById("dict-popup-reading");
    const elHanviet = document.getElementById("dict-popup-hanviet");
    const elBody = document.getElementById("dict-popup-body");
    const elTag = document.getElementById("dict-popup-tag");

    if (word !== item.word && item.word && item.word.length > 0) {
      elWord.textContent = `${word} (${item.word})`;
    } else {
      elWord.textContent = item.word || word;
    }

    const reading = item.phonetic || (item.pronunciation && item.pronunciation[0] ? item.pronunciation[0].kana : "");
    if (reading && reading !== item.word) {
      elReading.textContent = reading;
      elReading.style.display = "inline-block";
    } else {
      elReading.style.display = "none";
    }

    if (item.han) {
      elHanviet.textContent = item.han;
      elHanviet.style.display = "inline-block";
    } else {
      elHanviet.style.display = "none";
    }

    if (item.level && item.level.length > 0) {
      elTag.textContent = `JLPT ${item.level.join("/")}`;
    }

    let means = [];
    if (Array.isArray(item.means)) {
      means = item.means.map(m => typeof m === "string" ? m : m.mean).filter(Boolean);
    } else if (item.short_mean) {
      means = item.short_mean.split(";").map(s => s.trim());
    }

    if (means.length === 0 && item.short_mean) {
      means = [item.short_mean];
    }

    if (means.length === 0) {
      elBody.innerHTML = `<div style="color: var(--text-sub); text-align: center; padding: 0.5rem;">Không tìm thấy định nghĩa chi tiết.</div>`;
      return;
    }

    let bodyHTML = "";
    means.slice(0, 3).forEach((m, idx) => {
      bodyHTML += `
        <div class="dict-mean-item">
          <span class="dict-mean-num">${idx + 1}</span>
          <span class="dict-mean-text">${m}</span>
        </div>
      `;
    });

    elBody.innerHTML = bodyHTML;
  }

  renderDictFallback(word) {
    const elReading = document.getElementById("dict-popup-reading");
    const elHanviet = document.getElementById("dict-popup-hanviet");
    const elBody = document.getElementById("dict-popup-body");

    // Tìm trong câu hỏi và lời giải của buổi hiện tại
    const all = this.getAllQuestions();
    let foundExplanation = "";
    for (const q of all) {
      if (q.targetWord === word && q.explanation) {
        foundExplanation = q.explanation;
        break;
      }
      if (q.sentence && q.sentence.includes(word) && q.explanation) {
        foundExplanation = q.explanation;
      }
    }

    if (foundExplanation) {
      elReading.style.display = "none";
      elHanviet.style.display = "none";
      elBody.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--text-main);">
          <b style="color: var(--primary);">Giải thích trong đề thi:</b><br>
          <div style="margin-top: 0.3rem;">${foundExplanation}</div>
        </div>
      `;
    } else {
      elReading.style.display = "none";
      elHanviet.style.display = "none";
      elBody.innerHTML = `
        <div style="color: var(--text-sub); text-align: center; padding: 0.75rem 0; font-size: 0.85rem;">
          Không tìm thấy từ "<b>${word}</b>" trong từ điển nhanh.<br>
          <span style="font-size: 0.78rem;">Bạn có thể bấm liên kết bên dưới để xem trên Mazii.</span>
        </div>
      `;
    }
  }

  calculateAverageAccuracy() {
    let totalScore = 0;
    let totalMax = 0;
    Object.values(this.history).forEach((h) => {
      if (h.completed && h.total > 0) {
        totalScore += h.score;
        totalMax += h.total;
      }
    });
    if (totalMax === 0) return 0;
    return Math.round((totalScore / totalMax) * 100);
  }

  prepareStarredQuestionsForRetry() {
    const sessionKey = String(this.currentSessionId);
    const starredList = this.bookmarks[sessionKey] || [];
    this.starredReviewIds = [...starredList];
    if (starredList.length === 0) return;

    // Reset các câu hỏi đã lưu về nguyên bản chưa trả lời để người học làm lại
    starredList.forEach((qId) => {
      delete this.userAnswers[qId];
      delete this.starAnswers[qId];
    });
    this.saveDraftAnswers();
  }


  // =========================================================================
  // =========================================================================
  // TÍNH NĂNG MỚI: BẬT / TẮT CHẾ ĐỘ TRA TỪ ĐIỂN MAZII KHI BÔI ĐEN VĂN BẢN
  // =========================================================================
  toggleMaziiLookup(forceState = null) {
    if (forceState !== null) {
      this.enableMaziiLookup = !!forceState;
    } else {
      this.enableMaziiLookup = !this.enableMaziiLookup;
    }
    try {
      localStorage.setItem("jlpt_enable_mazii", String(this.enableMaziiLookup));
    } catch (e) {}

    this.updateMaziiToggleUI();

    // Nếu vừa tắt, ẩn ngay lập tức popup từ điển và thanh tác vụ đang hiển thị
    if (!this.enableMaziiLookup) {
      this.hideDictPopup();
      const bubble = document.getElementById("selection-action-bubble");
      if (bubble) bubble.style.display = "none";
    }

    const msg = this.enableMaziiLookup 
      ? "Đã BẬT công cụ tra Mazii (Bôi đen chữ để tra)"
      : "Đã TẮT công cụ tra Mazii (Ẩn thanh tra cứu khi bôi đen)";
    this.showToast(msg, this.enableMaziiLookup ? "success" : "info");
  }

  updateMaziiToggleUI() {
    const btnHeader = document.getElementById("btn-toggle-mazii");
    const labelHeader = document.getElementById("mazii-toggle-label");
    const iconHeader = document.getElementById("mazii-toggle-icon");
    const btnSidebar = document.getElementById("btn-sidebar-toggle-mazii");

    if (this.enableMaziiLookup) {
      if (btnHeader) {
        btnHeader.classList.add("active");
        btnHeader.style.borderColor = "#10b981";
        btnHeader.style.color = "#059669";
        btnHeader.style.background = "rgba(16, 185, 129, 0.08)";
        btnHeader.title = "Tra từ điển Mazii: Đang BẬT (Bấm để TẮT)";
      }
      if (labelHeader) labelHeader.textContent = "Tra Mazii: BẬT";
      if (iconHeader) iconHeader.className = "fas fa-book-reader";

      if (btnSidebar) {
        btnSidebar.classList.add("active");
        btnSidebar.innerHTML = `<i class="fas fa-book-reader" style="color: #10b981;"></i> Tra Mazii: BẬT`;
        btnSidebar.title = "Tra từ điển Mazii: Đang BẬT (Bấm để TẮT)";
      }
    } else {
      if (btnHeader) {
        btnHeader.classList.remove("active");
        btnHeader.style.borderColor = "var(--border)";
        btnHeader.style.color = "var(--text-sub)";
        btnHeader.style.background = "transparent";
        btnHeader.title = "Tra từ điển Mazii: Đang TẮT (Bấm để BẬT)";
      }
      if (labelHeader) labelHeader.textContent = "Tra Mazii: TẮT";
      if (iconHeader) iconHeader.className = "fas fa-eye-slash";

      if (btnSidebar) {
        btnSidebar.classList.remove("active");
        btnSidebar.innerHTML = `<i class="fas fa-eye-slash" style="opacity: 0.6;"></i> Tra Mazii: TẮT`;
        btnSidebar.title = "Tra từ điển Mazii: Đang TẮT (Bấm để BẬT)";
      }
    }
  }

  showToast(message, type = "info") {
    let toastContainer = document.getElementById("app-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "app-toast-container";
      toastContainer.style.cssText = "position: fixed; bottom: 25px; right: 25px; z-index: 999999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;";
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement("div");
    const bg = type === "success" ? "#10b981" : (type === "error" ? "#ef4444" : "#4f46e5");
    toast.style.cssText = `background: ${bg}; color: #fff; padding: 0.6rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; box-shadow: 0 4px 14px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 0.5rem; animation: bubblePop 0.2s ease; pointer-events: auto;`;
    const icon = type === "success" ? "fa-check-circle" : (type === "error" ? "fa-exclamation-triangle" : "fa-info-circle");
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => {
        if (toast.remove) toast.remove();
        else if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2200);
  }

  // TÍNH NĂNG MỚI: THANH TÁC VỤ NỔI KHI BÔI ĐEN VĂN BẢN (IPHONE / IPAD / PC)
  // =========================================================================
  initSelectionBubble() {
    const bubble = document.getElementById("selection-action-bubble");
    if (!bubble) return;

    const btnSpeak = document.getElementById("bubble-btn-speak");
    const btnLookup = document.getElementById("bubble-btn-lookup");
    const btnCopy = document.getElementById("bubble-btn-copy");
    const btnHl = document.getElementById("bubble-btn-highlight");

    let currentSelectedText = "";

    const hideBubble = () => {
      bubble.style.display = "none";
    };

    const updateBubblePosition = () => {
      // Nếu chế độ tra cứu Mazii đang TẮT -> không hiện bubble
      if (!this.enableMaziiLookup) {
        hideBubble();
        return;
      }

      // Nếu bảng tra từ điển đang mở, tuyệt đối không hiện thanh thao tác đè lên
      const dictPopup = document.getElementById("dict-popup");
      if (dictPopup && dictPopup.style.display !== "none") {
        hideBubble();
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        hideBubble();
        return;
      }
      const text = sel.toString().trim();
      if (!text || text.length > 100) {
        hideBubble();
        return;
      }

      currentSelectedText = text;
      try {
        const range = sel.getRangeAt(0);
        this.savedSelectionRange = range.cloneRange();
        const rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          hideBubble();
          return;
        }

        // Kiểm tra xem đoạn chọn có nằm trong bài Đọc hiểu không
        let container = range.commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentElement;
        const isDokkai = !!container.closest(".dokkai-content");

        if (btnHl) {
          btnHl.style.display = isDokkai ? "inline-flex" : "none";
        }

        bubble.style.display = "flex";
        const bubbleWidth = bubble.offsetWidth || 210;
        const bubbleHeight = bubble.offsetHeight || 38;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = vw <= 768;

        if (isMobile) {
          // Trên iPhone/màn hình nhỏ: Neo thanh tác vụ nổi ở đáy màn hình (trên thanh bottom bar)
          // Tách biệt hoàn toàn khỏi menu Apple iOS callout ở phía trên chữ, triệt tiêu 100% việc bị đè
          bubble.classList.add("mobile-docked");
          bubble.style.left = "50%";
          bubble.style.top = "auto";
          bubble.style.bottom = "80px";
          bubble.style.transform = "translateX(-50%)";
        } else {
          // Trên iPad & Máy tính: Đặt thanh tác vụ ở PHÍA DƯỚI dòng chữ bôi đen (rect.bottom + 12px)
          // Vì menu mặc định của Apple luôn nằm ở PHÍA TRÊN dòng chữ, nên đặt ở dưới sẽ không bao giờ bị đè!
          bubble.classList.remove("mobile-docked");
          bubble.style.transform = "none";
          bubble.style.bottom = "auto";

          let left = rect.left + (rect.width / 2) - (bubbleWidth / 2);
          let top = rect.bottom + 12;

          // Nếu gần sát mép dưới màn hình thì mới đẩy lên trên
          if (top + bubbleHeight > vh - 20) {
            top = Math.max(10, rect.top - bubbleHeight - 12);
          }
          if (left < 10) left = 10;
          if (left + bubbleWidth > vw - 10) left = vw - bubbleWidth - 10;

          bubble.style.left = `${left}px`;
          bubble.style.top = `${top}px`;
        }
      } catch (err) {
        hideBubble();
      }
    };

    let isPointerDown = false;
    let selDebounce = null;

    const onPointerDown = (e) => {
      const popup = document.getElementById("dict-popup");
      // Bấm vào trong bubble hoặc popup từ điển thì không tính là bắt đầu bôi đen lại
      if (bubble.contains(e.target) || (popup && popup.contains(e.target))) {
        return;
      }
      isPointerDown = true;
      hideBubble();
    };

    const onPointerUp = (e) => {
      isPointerDown = false;
      const popup = document.getElementById("dict-popup");
      if (bubble.contains(e.target) || (popup && popup.contains(e.target))) {
        return;
      }

      // Người dùng đã kết thúc thao tác bôi đen (thả chuột hoặc nhấc ngón tay)
      if (selDebounce) clearTimeout(selDebounce);
      // Đợi 120ms để trình duyệt cập nhật selection range ổn định trước khi hiển thị
      selDebounce = setTimeout(updateBubblePosition, 120);
    };

    document.addEventListener("mousedown", onPointerDown, { passive: true });
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });

    document.addEventListener("mouseup", onPointerUp, { passive: true });
    document.addEventListener("touchend", onPointerUp, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });

    // Theo dõi thay đổi bôi đen
    document.addEventListener("selectionchange", () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        if (selDebounce) clearTimeout(selDebounce);
        selDebounce = setTimeout(() => {
          const curSel = window.getSelection();
          if (!curSel || curSel.isCollapsed || !curSel.toString().trim()) {
            hideBubble();
          }
        }, 150);
        return;
      }

      // Lưu lại range hiện tại
      try {
        if (sel.rangeCount > 0) {
          this.savedSelectionRange = sel.getRangeAt(0).cloneRange();
        }
      } catch (err) {}

      // NẾU NGƯỜI DÙNG VẪN ĐANG GIỮ CHUỘT / KÉO TAY (CHƯA KẾT THÚC BÔI ĐEN):
      // Tuyệt đối không hiện thanh tra từ sớm khi đang kéo dở từ (ví dụ đang kéo 計 chưa qua 算)
      if (isPointerDown) {
        if (selDebounce) clearTimeout(selDebounce);
        return;
      }

      // Nếu không có chuột/ngón tay đang nhấn (ví dụ chọn bằng phím Shift hoặc dừng):
      // Chờ 350ms sau khi ngừng thay đổi mới hiển thị
      if (selDebounce) clearTimeout(selDebounce);
      selDebounce = setTimeout(updateBubblePosition, 350);
    });

    if (btnSpeak) {
      const handleSpeak = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentSelectedText) {
          const orig = btnSpeak.innerHTML;
          btnSpeak.innerHTML = `<i class="fas fa-spinner fa-spin" style="color: var(--primary);"></i> <span>Đang đọc...</span>`;
          this.speakWord(currentSelectedText);
          setTimeout(() => {
            btnSpeak.innerHTML = orig;
          }, 1400);
        }
      };

      btnSpeak.addEventListener("click", handleSpeak);
      btnSpeak.addEventListener("touchend", handleSpeak);
    }

    if (btnLookup) {
      const handleLookup = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentSelectedText) {
          const word = this.cleanJapaneseWord(currentSelectedText) || currentSelectedText;
          const rect = bubble.getBoundingClientRect();
          hideBubble();
          try {
            window.getSelection()?.removeAllRanges();
          } catch (err) {}
          this.showDictPopup(word, rect);
        }
      };

      btnLookup.addEventListener("click", handleLookup);
      btnLookup.addEventListener("touchend", handleLookup);
    }

    if (btnCopy) {
      const handleCopy = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentSelectedText) {
          try {
            await navigator.clipboard.writeText(currentSelectedText);
            const orig = btnCopy.innerHTML;
            btnCopy.innerHTML = `<i class="fas fa-check" style="color: #10b981;"></i> <span>Đã chép</span>`;
            setTimeout(() => {
              btnCopy.innerHTML = orig;
              hideBubble();
            }, 800);
          } catch (err) {
            const ta = document.createElement("textarea");
            ta.value = currentSelectedText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            hideBubble();
          }
        }
      };

      btnCopy.addEventListener("click", handleCopy);
      btnCopy.addEventListener("touchend", handleCopy);
    }

    // Chặn triệt để menu hệ thống iOS / iPadOS và desktop khi bôi đen để chỉ hiện menu ứng dụng
    window.addEventListener("contextmenu", (e) => {
      if (e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
      }
    }, { capture: true });

    if (btnHl) {
      btnHl.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.highlightSelectedText();
        hideBubble();
      });
    }
  }

  // =========================================================================
  // TÍNH NĂNG MỚI: THANH ĐIỀU HƯỚNG ĐÁY MÀN HÌNH VÀ BẢNG CÂU HỎI TRÊN MOBILE
  // =========================================================================
  initMobileBottomBar() {
    const btnPrev = document.getElementById("btn-mob-prev");
    const btnNext = document.getElementById("btn-mob-next");
    const btnPallet = document.getElementById("btn-mob-pallet");
    const modal = document.getElementById("mobile-pallet-modal");
    const btnClose = document.getElementById("btn-close-mob-pallet");
    const btnCloseSheet = document.getElementById("btn-mob-close-sheet");

    if (btnPrev) {
      btnPrev.addEventListener("click", () => {
        const filtered = this.getFilteredQuestions();
        if (!filtered.length) return;
        const curIdx = filtered.findIndex(q => q.id === this.activeQuestionId);
        if (curIdx > 0) {
          this.scrollToQuestion(filtered[curIdx - 1].id);
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener("click", () => {
        const filtered = this.getFilteredQuestions();
        if (!filtered.length) return;
        const curIdx = filtered.findIndex(q => q.id === this.activeQuestionId);
        if (curIdx >= 0 && curIdx < filtered.length - 1) {
          this.scrollToQuestion(filtered[curIdx + 1].id);
        }
      });
    }

    if (btnPallet) btnPallet.addEventListener("click", () => this.openPalletModal());
    if (btnClose) btnClose.addEventListener("click", () => this.closePalletModal());
    if (btnCloseSheet) btnCloseSheet.addEventListener("click", () => this.closePalletModal());

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.closePalletModal();
      });
    }
  }

  openPalletModal() {
    const modal = document.getElementById("mobile-pallet-modal");
    if (!modal) return;
    this.renderMobilePallet();
    modal.style.display = "flex";
  }

  closePalletModal() {
    const modal = document.getElementById("mobile-pallet-modal");
    if (modal) modal.style.display = "none";
  }

  updateFloatingPalletBtn() {
    const btn = document.getElementById("btn-floating-pallet");
    if (!btn) return;
    const practiceView = document.getElementById("view-practice");
    if (!practiceView || practiceView.style.display === "none") {
      btn.style.display = "none";
      return;
    }
    btn.style.display = "flex";

    const countEl = document.getElementById("floating-pallet-count");
    if (countEl) {
      const filtered = this.getFilteredQuestions();
      let answeredCount = 0;
      filtered.forEach(q => {
        if (this.userAnswers[q.id] !== undefined) answeredCount++;
      });
      countEl.textContent = `${answeredCount}/${filtered.length}`;
    }
  }

  getActiveFilterName() {
    if (this.activeFilter === "all") return "Tất cả câu hỏi";
    if (this.activeFilter === "starred") return "⭐ Đã lưu / Ôn lại";
    const session = this.getSessionData(this.currentSessionId);
    if (session && session.sections) {
      const sec = session.sections.find(s => s.id === this.activeFilter);
      if (sec) {
        if (sec.id === "dokkai" || sec.name.startsWith("読解")) return "読解 (Đọc hiểu)";
        if (sec.id === "choukai" || sec.name.startsWith("聴解")) return "聴解 (Nghe hiểu)";
        return sec.name;
      }
    }
    return "Phần đang chọn";
  }

  // CẬP NHẬT BẢNG CÂU HỎI TRÊN MOBILE: Đồng bộ chính xác theo Phần đang chọn (Đọc hiểu, Từ vựng,...)
  renderMobilePallet() {
    const container = document.getElementById("mobile-pallet-grid");
    const statusText = document.getElementById("mob-pallet-status");
    const titleText = document.getElementById("mob-pallet-title-text");
    const filterTabsContainer = document.getElementById("mob-pallet-filter-tabs");
    if (!container) return;

    // LẤY ĐÚNG CÁC CÂU HỎI THEO BỘ LỌC ĐANG CHỌN (Đọc hiểu, Ngữ pháp, Từ vựng,...)
    const filtered = this.getFilteredQuestions();
    let answeredCount = 0;
    filtered.forEach(q => {
      if (this.userAnswers[q.id] !== undefined) answeredCount++;
    });

    const filterName = this.getActiveFilterName();
    if (titleText) titleText.textContent = filterName;
    if (statusText) statusText.textContent = `${answeredCount}/${filtered.length}`;

    // Thanh chuyển đổi nhanh các phần thi ngay trong Bảng câu hỏi Mobile
    if (filterTabsContainer) {
      const session = this.getSessionData(this.currentSessionId);
      if (session && session.sections) {
        let tabsHtml = `<button type="button" class="mob-tab-chip ${this.activeFilter === 'all' ? 'active' : ''}" onclick="app.setFilter('all'); app.renderMobilePallet();">Tất cả (${this.getAllQuestions().length})</button>`;
        session.sections.forEach(sec => {
          const count = sec.questions ? sec.questions.length : 0;
          let shortName = sec.name;
          if (sec.id === "dokkai" || shortName.startsWith("読解")) shortName = "Đọc hiểu";
          else if (sec.id === "choukai" || shortName.startsWith("聴解")) shortName = "Nghe hiểu";
          else shortName = shortName.split("(")[0].replace("Chuyên đề", "CĐ").trim();
          tabsHtml += `<button type="button" class="mob-tab-chip ${this.activeFilter === sec.id ? 'active' : ''}" onclick="app.setFilter('${sec.id}'); app.renderMobilePallet();">${shortName} (${count})</button>`;
        });
        const sessionKey = this.currentSessionId;
        const starredList = (this.bookmarks && this.bookmarks[sessionKey]) ? this.bookmarks[sessionKey] : [];
        if (starredList.length > 0 || this.activeFilter === "starred") {
          tabsHtml += `<button type="button" class="mob-tab-chip ${this.activeFilter === 'starred' ? 'active' : ''}" onclick="app.setFilter('starred'); app.renderMobilePallet();"><i class="fas fa-star" style="color: #f59e0b; margin-right: 3px;"></i>Đã lưu (${starredList.length})</button>`;
        }
        filterTabsContainer.innerHTML = tabsHtml;
        setTimeout(() => {
          const activeChip = filterTabsContainer.querySelector(".mob-tab-chip.active");
          if (activeChip) {
            activeChip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          }
        }, 50);
      }
    }

    container.innerHTML = "";

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 1rem; color: var(--text-sub);">
          <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
          Không có câu hỏi nào trong phần này.
        </div>
      `;
      return;
    }

    filtered.forEach(q => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mob-pallet-btn";
      btn.textContent = q.id;
      btn.title = `Câu ${q.id} - ${q.mondaiName || ""}`;

      const isAnswered = this.userAnswers[q.id] !== undefined;
      const targetAns = this.getTargetAnswer(q);
      const isCorrect = isAnswered && (this.userAnswers[q.id] === targetAns);

      if (this.currentMode === "practice" && isAnswered) {
        btn.classList.add(isCorrect ? "correct" : "incorrect");
      } else if (isAnswered) {
        btn.classList.add("answered");
      }

      if (q.id === this.activeQuestionId) {
        btn.classList.add("current");
      }

      const sessionKey = String(this.currentSessionId);
      if (this.bookmarks[sessionKey] && this.bookmarks[sessionKey].includes(q.id)) {
        btn.classList.add("starred");
      }

      btn.addEventListener("click", () => {
        const modal = document.getElementById("mobile-pallet-modal");
        if (modal) modal.style.display = "none";
        this.scrollToQuestion(q.id);
      });

      container.appendChild(btn);
    });
  }

  updateMobileBar() {
    const bar = document.getElementById("mobile-bottom-bar");
    if (!bar) return;

    const practiceView = document.getElementById("view-practice");
    if (!practiceView || practiceView.style.display === "none") {
      bar.style.display = "none";
      return;
    }

    if (window.innerWidth <= 900) {
      bar.style.display = "flex";
    } else {
      bar.style.display = "none";
      return;
    }

    const filtered = this.getFilteredQuestions();
    const total = filtered.length;
    let answeredCount = 0;
    filtered.forEach(q => {
      if (this.userAnswers[q.id] !== undefined) answeredCount++;
    });
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    const elTag = document.querySelector(".mobile-bar-tag");
    const elNum = document.getElementById("mob-q-num");
    const elTotal = document.getElementById("mob-q-total");
    const elPct = document.getElementById("mob-q-pct");

    if (elTag) {
      let name = this.getActiveFilterName();
      if (name.includes("Đọc hiểu")) name = "ĐỌC HIỂU";
      else if (name.includes("Nghe hiểu")) name = "NGHE HIỂU";
      else if (name.includes("Tất cả")) name = "TẤT CẢ";
      else if (name.includes("Đã lưu")) name = "ĐÃ LƯU";
      else name = name.split("(")[0].trim().toUpperCase();

      elTag.textContent = name.length > 12 ? name.substring(0, 11) + "…" : name;
      elTag.title = this.getActiveFilterName();
    }

    let displayNum = this.activeQuestionId;
    if (filtered.length > 0) {
      const idx = filtered.findIndex(q => q.id === this.activeQuestionId);
      if (idx !== -1) {
        displayNum = `${this.activeQuestionId} (câu ${idx + 1}/${total})`;
      } else {
        displayNum = `${filtered[0].id} (câu 1/${total})`;
      }
    }

    if (elNum) elNum.textContent = displayNum;
    if (elTotal) elTotal.textContent = total;
    if (elPct) elPct.textContent = `${pct}% (${answeredCount}/${total})`;
  }

  renderFilterTabs() {
    const tabsContainer = document.getElementById("filter-tabs");
    const session = this.getSessionData(this.currentSessionId);
    if (!session) return;

    const sessionKey = String(this.currentSessionId);
    const starredList = this.bookmarks[sessionKey] || [];

    let html = `<button class="tab-btn ${this.activeFilter === "all" ? "active" : ""}" onclick="app.setFilter('all')"><i class="fas fa-layer-group" style="margin-right: 5px;"></i> Tất cả (${this.getAllQuestions().length} câu)</button>`;
    session.sections.forEach(sec => {
      const qCount = sec.questions ? sec.questions.length : 0;
      let label = sec.name;
      // Tinh gọn tiêu đề để các nút tab hiển thị cân đối trong lưới 2-3 hàng
      if (sec.id === "dokkai" || label.startsWith("読解")) {
        label = "読解 (Đọc hiểu)";
      } else if (label.includes("Từ Vựng - Ngữ Pháp Tổng Hợp")) {
        label = "CĐ Từ Vựng - Ngữ Pháp";
      } else if (label.includes("Dấu Sao") || label.includes("dấu sao")) {
        label = "CĐ Dấu Sao ★";
      } else if (sec.id === "choukai" || label.startsWith("聴解")) {
        label = "聴解 (Nghe hiểu)";
      }
      html += `<button class="tab-btn ${this.activeFilter === sec.id ? "active" : ""}" onclick="app.setFilter('${sec.id}')" title="${sec.name}">${label} (${qCount})</button>`;
    });

    const isStarredActive = this.activeFilter === "starred";
    html += `
      <button class="tab-btn tab-starred ${isStarredActive ? "active" : ""}" onclick="app.setFilter('starred')">
        <i class="fas fa-star" style="margin-right: 4px;"></i> Đã lưu / Ôn lại (${starredList.length})
      </button>
    `;

    tabsContainer.innerHTML = html;
  }

  setFilter(filterId) {
    this.activeFilter = filterId;
    if (filterId === "starred") {
      this.prepareStarredQuestionsForRetry();
    }
    // Khi đổi sang phần khác (ví dụ Đọc hiểu), tự động đặt câu active là câu đầu tiên của phần đó
    const filtered = this.getFilteredQuestions();
    if (filtered.length > 0) {
      this.activeQuestionId = filtered[0].id;
    }
    this.renderFilterTabs();
    this.renderQuestions();
    this.updatePallet();
    this.updateMobileBar();
    this.updateFloatingPalletBtn();
  }

  getAllQuestions() {
    const session = this.getSessionData(this.currentSessionId);
    if (!session || !session.sections) return [];
    let list = [];
    session.sections.forEach((sec) => {
      if (sec.questions) {
        sec.questions.forEach((q) => {
          list.push({ ...q, sectionId: sec.id, sectionName: sec.name });
        });
      }
    });
    return list;
  }

  getFilteredQuestions() {
    const all = this.getAllQuestions();
    if (this.activeFilter === "all") return all;
    if (this.activeFilter === "starred") {
      const sessionKey = String(this.currentSessionId);
      const starredList = this.bookmarks[sessionKey] || [];
      const reviewIds = this.starredReviewIds !== undefined ? this.starredReviewIds : starredList;
      return all.filter((q) => reviewIds.includes(q.id));
    }
    return all.filter((q) => q.sectionId === this.activeFilter);
  }

  // Đọc hiểu: Tự động kế thừa đoạn văn nếu câu trước cùng Mondai đã có bài đọc
  getQuestionPassage(q, allQuestions) {
    const rawOwn = q.passage || q.readingPassage || q.dokkaiPassage;
    const clean = (str) => (str || "").replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();

    if (rawOwn && rawOwn.trim().length > 0) {
      let sourceId = q.id;
      let isShared = false;
      if (q.mondai >= 9 && allQuestions) {
        const ownClean = clean(rawOwn);
        const currIdx = allQuestions.findIndex(x => x.id === q.id);
        for (let i = 0; i < currIdx; i++) {
          const prev = allQuestions[i];
          const prevRaw = prev.passage || prev.readingPassage || prev.dokkaiPassage;
          if (prev.mondai === q.mondai && prevRaw && clean(prevRaw) === ownClean) {
            sourceId = prev.id;
            isShared = true;
            break;
          }
        }
      }
      return { passage: rawOwn, isShared, sourceId };
    }
    // Nếu câu hỏi điền từ (Mondai 9) hoặc đọc hiểu (Mondai >= 10) bị thiếu bài đọc, tìm ngược về câu trước cùng Mondai
    if (q.mondai >= 9 && allQuestions) {
      const currIdx = allQuestions.findIndex(x => x.id === q.id);
      if (currIdx > 0) {
        for (let i = currIdx - 1; i >= 0; i--) {
          const prev = allQuestions[i];
          const prevRaw = prev.passage || prev.readingPassage || prev.dokkaiPassage;
          if (prev.mondai === q.mondai && prevRaw && prevRaw.trim().length > 0) {
            return { passage: prevRaw, isShared: true, sourceId: prev.id };
          }
        }
      }
    }
    return { passage: null, isShared: false };
  }

  // Lấy nhóm tất cả các câu hỏi cùng thuộc một bài đọc / đoạn văn với câu q
  getPassageQuestionGroup(q, allQuestions) {
    if (!allQuestions) allQuestions = this.getAllQuestions();
    const pInfo = this.getQuestionPassage(q, allQuestions);
    if (!pInfo || !pInfo.passage) {
      return [q];
    }

    const clean = (str) => (str || "").replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
    const targetClean = clean(pInfo.passage);
    const currIdx = allQuestions.findIndex(x => x.id === q.id);
    if (currIdx === -1) return [q];

    const group = allQuestions.filter(item => {
      if (item.mondai !== q.mondai) return false;
      const itemPInfo = this.getQuestionPassage(item, allQuestions);
      if (!itemPInfo || !itemPInfo.passage) return false;
      
      if (pInfo.sourceId && itemPInfo.sourceId && pInfo.sourceId === itemPInfo.sourceId) {
        return true;
      }
      return clean(itemPInfo.passage) === targetClean;
    });

    return group.length > 0 ? group : [q];
  }

  // Xác định trạng thái vị trí của câu hỏi trong nhóm bài đọc đang hiển thị (đầu nhóm, giữa nhóm, cuối nhóm)
  getPassageGroupState(q, indexInFiltered, filteredList) {
    const allQuestions = this.getAllQuestions();
    const passageInfo = this.getQuestionPassage(q, allQuestions);
    const passageGroup = this.getPassageQuestionGroup(q, allQuestions);
    const isMultiQuestionPassage = !!(passageGroup && passageGroup.length > 1);

    const prevQ = (indexInFiltered > 0 && filteredList) ? filteredList[indexInFiltered - 1] : null;
    const nextQ = (filteredList && indexInFiltered < filteredList.length - 1) ? filteredList[indexInFiltered + 1] : null;

    const isSharedWithPrev = isMultiQuestionPassage && !!prevQ && passageGroup.some(pg => pg.id === prevQ.id);
    const isSharedWithNext = isMultiQuestionPassage && !!nextQ && passageGroup.some(pg => pg.id === nextQ.id);

    const posInGroup = isMultiQuestionPassage ? (passageGroup.findIndex(pg => pg.id === q.id) + 1) : 1;
    const answeredInGroup = isMultiQuestionPassage ? passageGroup.filter(pg => this.userAnswers[pg.id] !== undefined).length : (this.userAnswers[q.id] !== undefined ? 1 : 0);

    const filteredGroup = filteredList ? filteredList.filter(item => passageGroup.some(pg => pg.id === item.id)) : passageGroup;
    const lastQuestionInGroup = filteredGroup.length > 0 ? filteredGroup[filteredGroup.length - 1] : passageGroup[passageGroup.length - 1];
    const isLastInPassageGroup = !isMultiQuestionPassage || !isSharedWithNext || (lastQuestionInGroup && q.id === lastQuestionInGroup.id);

    let cardGroupClass = "";
    if (isMultiQuestionPassage) {
      if (!isSharedWithPrev && isSharedWithNext) {
        cardGroupClass = " passage-group-start";
      } else if (isSharedWithPrev && isSharedWithNext) {
        cardGroupClass = " passage-child-card passage-group-middle";
      } else if (isSharedWithPrev && !isSharedWithNext) {
        cardGroupClass = " passage-child-card passage-group-end";
      }
    }

    return {
      passageInfo,
      passageGroup,
      isMultiQuestionPassage,
      isSharedWithPrev,
      isSharedWithNext,
      posInGroup,
      answeredInGroup,
      lastQuestionInGroup,
      isLastInPassageGroup,
      cardGroupClass
    };
  }

  renderQuestions() {
    const container = document.getElementById("questions-container");
    container.innerHTML = "";

    const all = this.getAllQuestions();
    const filtered = this.getFilteredQuestions();

    if (this.activeFilter === "starred") {
      const banner = document.createElement("div");
      banner.className = "starred-review-banner";
      banner.style.cssText = "background: rgba(245, 158, 11, 0.12); border: 1.5px solid rgba(245, 158, 11, 0.45); border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;";
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <i class="fas fa-star" style="font-size: 1.5rem; color: #f59e0b;"></i>
          <div>
            <b style="color: #f59e0b; font-size: 1rem;">CHẾ ĐỘ ÔN LUYỆN CÂU ĐÃ LƯU & CÂU SAI:</b><br>
            <span style="font-size: 0.88rem; color: var(--text-sub);">Các câu hỏi đã đưa về nguyên bản chưa trả lời. Khi bạn <b>làm đúng</b>, hệ thống sẽ <b>tự động bỏ dấu sao</b>!</span>
          </div>
        </div>
        <button class="btn btn-primary" style="font-weight: 700; padding: 0.55rem 1.1rem; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);" onclick="app.setFilter('all')">
          <i class="fas fa-arrow-left"></i> Quay lại phần luyện tập
        </button>
      `;
      container.appendChild(banner);
    }

    if (filtered.length === 0) {
      if (this.activeFilter === "starred") {
        container.innerHTML += `
          <div style="text-align: center; padding: 3.5rem 1.5rem; color: var(--text-sub);">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
              <i class="fas fa-check-circle" style="font-size: 2rem; color: var(--success);"></i>
            </div>
            <div style="font-size: 1.2rem; font-weight: 700; color: var(--text); margin-bottom: 0.5rem;">Tuyệt vời! Không còn câu hỏi nào trong mục Đã lưu!</div>
            <p style="max-width: 480px; margin: 0 auto 1.25rem; font-size: 0.9rem;">Khi bạn trả lời sai bất kỳ câu hỏi nào, câu đó sẽ tự động được đánh dấu ⭐ vào đây để bạn làm lại.</p>
            <button class="btn btn-primary" onclick="app.setFilter('all')">
              <i class="fas fa-th-list"></i> Xem tất cả câu hỏi
            </button>
          </div>
        `;
      } else {
        container.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-sub);">Không có câu hỏi nào trong mục này.</div>`;
      }
      return;
    }

    filtered.forEach((q, idx) => {
      const card = document.createElement("div");
      const groupState = !q.isStarQuestion ? this.getPassageGroupState(q, idx, filtered) : { cardGroupClass: "" };
      card.className = "question-card" + groupState.cardGroupClass + (this.activeQuestionId === q.id ? " active-target" : "");
      card.id = `q-card-${q.id}`;

      if (q.isStarQuestion) {
        card.innerHTML = this.renderStarQuestionHTML(q, idx, filtered);
      } else {
        card.innerHTML = this.renderStandardQuestionHTML(q, idx, filtered);
      }

      container.appendChild(card);
    });
  }

  formatDokkaiPassage(text) {
    if (!text) return "";
    
    // If already contains rich html formatting, return directly
    if (text.includes("dokkai-email-frame") || text.includes("dokkai-notes-box") || text.includes("dokkai-para")) {
      return text;
    }

    let introText = "";
    let mainBody = text;

    // 1. Check for email structure (e.g. Buổi 6 Q109, Buổi 5 Q57, etc.)
    if (text.includes("宛先：") || text.includes("宛先:") || (text.includes("件名：") && (text.includes("---") || text.includes("様") || text.includes("担当")))) {
      let cleanText = text.replace(/<br\s*\/?>/gi, "\n");
      const lines = cleanText.split("\n");
      
      let headerLines = [];
      let bodyLines = [];
      let state = "intro";
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          if (state === "body") bodyLines.push("");
          continue;
        }
        
        if (line.startsWith("---") || line.startsWith("ーーー") || line.startsWith("───")) {
          if (state === "intro") {
            state = "header";
          } else if (state === "header") {
            state = "body";
          }
          continue;
        }
        
        if (state === "intro") {
          if (line.includes("宛先：") || line.includes("宛先:") || line.includes("件名：") || line.includes("件名:")) {
            state = "header";
            headerLines.push(line);
          } else {
            introText += (introText ? "<br>" : "") + line;
          }
        } else if (state === "header") {
          if (line.includes("宛先") || line.includes("件名") || line.includes("日時") || line.includes("送信者") || line.includes("From") || line.includes("To") || line.includes("Date")) {
            headerLines.push(line);
          } else {
            state = "body";
            bodyLines.push(line);
          }
        } else {
          bodyLines.push(line);
        }
      }
      
      if (headerLines.length > 0) {
        let headerHTML = headerLines.map(h => {
          const parts = h.split(/[:：]/);
          if (parts.length >= 2) {
            const k = parts[0].trim();
            const v = parts.slice(1).join("：").trim();
            return `<div class="dokkai-email-row"><span class="email-label">${k}：</span><span class="email-val">${v}</span></div>`;
          }
          return `<div class="dokkai-email-row">${h}</div>`;
        }).join("");
        
        let bodyFormatted = bodyLines.map(l => {
          if (!l.trim()) return '<div class="dokkai-email-spacer"></div>';
          return `<div class="dokkai-email-line">${l}</div>`;
        }).join("");
        
        return `
          ${introText ? `<div class="dokkai-intro-text">${introText}</div>` : ""}
          <div class="dokkai-email-frame">
            <div class="dokkai-email-header">
              ${headerHTML}
            </div>
            <div class="dokkai-email-body">
              ${bodyFormatted}
            </div>
          </div>
        `.trim();
      }
    }

    // 2. Check for Notes block at bottom: （注1）, （注2）, (注1), etc.
    let cleanText = text.replace(/<br\s*\/?>/gi, "\n");
    const noteMatch = cleanText.search(/(\n|\s|^)[（(]注\s*1[)）]/);
    let notesHTML = "";
    
    if (noteMatch !== -1) {
      const mainPart = cleanText.substring(0, noteMatch).trim();
      const notesPart = cleanText.substring(noteMatch).trim();
      
      const noteItems = [];
      const noteRegex = /[（(]注\s*(\d+)[)）]\s*([^（(]*)/g;
      let m;
      while ((m = noteRegex.exec(notesPart)) !== null) {
        const num = m[1];
        const desc = m[2].trim().replace(/\n/g, " ");
        if (desc) {
          noteItems.push(`<div class="dokkai-note-item"><span class="note-num">（注${num}）</span><span class="note-text">${desc}</span></div>`);
        }
      }
      
      if (noteItems.length > 0) {
        notesHTML = `
          <div class="dokkai-notes-box">
            <div class="dokkai-notes-title"><i class="fas fa-info-circle"></i> Chú thích từ vựng (注釈)</div>
            ${noteItems.join("")}
          </div>
        `;
        mainBody = mainPart;
      }
    }

    // 3. Format mainBody into clean separated paragraphs
    const paragraphs = mainBody.split(/\n{2,}/);
    let bodyHTML = "";
    
    paragraphs.forEach(p => {
      const trimmed = p.trim();
      if (trimmed) {
        const withBr = trimmed.replace(/\n/g, "<br>");
        bodyHTML += `<div class="dokkai-para">${withBr}</div>`;
      }
    });

    return (bodyHTML + notesHTML).trim() || text;
  }

  renderStandardQuestionHTML(q, indexInFiltered, filteredList) {
    const userSelected = this.userAnswers[q.id];
    const isAnswered = userSelected !== undefined;
    const isCorrect = userSelected === q.correctAnswer;
    const isChoukai = !!(q.isChoukai || q.sectionId === "choukai");
    const hasListened = !!(this.audioListened[q.id] || this.isExamSubmitted);
    
    // Phần giải thích chỉ hiện lên khi đã nghe và trả lời câu hỏi
    const canShowFeedback = isAnswered;
    const showFeedback = this.currentMode === "practice" && canShowFeedback;

    // Xác định trạng thái nhóm đoạn văn dùng chung (Mondai 9 - 14)
    const groupState = this.getPassageGroupState(q, indexInFiltered, filteredList);
    const {
      passageInfo,
      passageGroup,
      isMultiQuestionPassage,
      isSharedWithPrev,
      isSharedWithNext,
      posInGroup,
      answeredInGroup,
      lastQuestionInGroup,
      isLastInPassageGroup
    } = groupState;

    // Dokkai passage handling: Chỉ hiển thị đoạn văn 1 lần duy nhất ở câu đầu tiên của nhóm (!isSharedWithPrev)
    let dokkaiHTML = "";
    if (passageInfo.passage && !isSharedWithPrev) {
      const fontClass = this.fontSizeLevel === "lg" ? "font-lg" : (this.fontSizeLevel === "xl" ? "font-xl" : "");
      const splitClass = this.splitReadingMode ? "split-active" : "";
      const passageKey = `${this.currentSessionId}_p_${passageInfo.sourceId || q.id}`;
      let passageBody = (this.highlights && this.highlights[passageKey]) ? this.highlights[passageKey] : passageInfo.passage;
      if (!passageBody.includes("dokkai-email-frame") && !passageBody.includes("dokkai-para")) {
        passageBody = this.formatDokkaiPassage(passageBody);
      }

      const firstGroupId = passageGroup[0].id;
      const lastGroupId = passageGroup[passageGroup.length - 1].id;
      const badgeLabel = isMultiQuestionPassage
        ? `Văn bản dùng chung cho ${passageGroup.length} câu hỏi (Câu ${firstGroupId} – Câu ${lastGroupId})`
        : `Văn bản đọc hiểu`;

      dokkaiHTML = `
        <div class="dokkai-box ${splitClass}">
          <div class="dokkai-box-header">
            <div class="dokkai-badge ${isMultiQuestionPassage ? "shared" : ""}">
              <i class="fas fa-book-open"></i> 
              ${badgeLabel}
            </div>
            <div class="dokkai-box-quicktools">
              <button type="button" class="btn-dokkai-mini hl" title="Bôi vàng văn bản đang chọn" onclick="app.highlightSelectedText()">
                <i class="fas fa-highlighter"></i> Bôi vàng
              </button>
              <button type="button" class="btn-dokkai-mini" title="Giảm cỡ chữ bài đọc" onclick="app.changeFontSize(-1)">
                <i class="fas fa-font" style="font-size:0.75rem;"></i>-
              </button>
              <button type="button" class="btn-dokkai-mini" title="Tăng cỡ chữ bài đọc" onclick="app.changeFontSize(1)">
                <i class="fas fa-font" style="font-size:0.95rem;"></i>+
              </button>
            </div>
          </div>
          <div class="dokkai-content ${fontClass}" data-passage-key="${passageKey}">${passageBody}</div>
        </div>
        ${isMultiQuestionPassage ? `
          <div class="passage-group-sub-banner">
            <i class="fas fa-layer-group"></i>
            <span>Trả lời lần lượt các câu hỏi <b>Câu ${firstGroupId} – Câu ${lastGroupId}</b> của đoạn văn trên</span>
            <span class="passage-group-progress">Đã làm: <b>${answeredInGroup}/${passageGroup.length}</b> câu</span>
          </div>
        ` : ""}
      `;
    }

    // Choukai Question Text & Header simulation
    let choukaiHeaderHTML = "";
    if (isChoukai) {
      const choukaiQText = q.questionText || q.question || q.sentence || "";
      if (canShowFeedback) {
        choukaiHeaderHTML = `
          <div class="choukai-revealed-header">
            <div class="choukai-q-tag"><i class="fas fa-question-circle"></i> Câu hỏi trong bài nghe (Đã mở khóa):</div>
            <div class="choukai-q-text">${choukaiQText}</div>
          </div>
        `;
      } else {
        const isPeeking = !!this.choukaiPeek[q.id];
        choukaiHeaderHTML = `
          <div class="choukai-simulation-banner">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem;">
              <div class="choukai-sim-title" style="margin-bottom: 0;">
                <i class="fas fa-volume-up"></i> MÔ PHỎNG PHIẾU ĐỀ THI JLPT CHOUKAI (聴解)
              </div>
              <button type="button" class="btn-toggle-peek" onclick="app.toggleChoukaiPeek(${q.id})" style="background: none; border: 1px solid var(--primary); color: var(--primary); font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem;">
                <i class="far fa-${isPeeking ? 'eye-slash' : 'eye'}"></i> ${isPeeking ? 'Ẩn câu hỏi gợi ý' : 'Hiện trước câu hỏi'}
              </button>
            </div>
            <div class="choukai-sim-hint">
              Quy chế thi thật: Trên phiếu đề <b>không in câu hỏi</b> (chỉ in 4 lựa chọn bên dưới). Bạn hãy bấm <b>Play</b> để nghe câu hỏi và bài đối thoại.
            </div>
            ${isPeeking ? `
              <div class="choukai-peek-box" style="margin-top: 0.6rem; padding: 0.6rem 0.85rem; background: var(--bg-card); border-radius: 6px; border: 1px dashed var(--primary); font-size: 0.95rem; color: var(--text);">
                <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase; display: block; margin-bottom: 0.2rem;">👁️ Xem trước câu hỏi trong băng:</span>
                <b>${choukaiQText}</b>
              </div>
            ` : ''}
          </div>
        `;
      }
    }

    // Audio Choukai player
    let audioHTML = "";
    const audioUrl = q.audio || q.audioSrc;
    if (audioUrl) {
      const curSpeed = this.getAudioSpeed(q.id);
      audioHTML = `
        <div class="choukai-player-card">
          <div class="choukai-player-header">
            <div class="choukai-player-title">
              <i class="fas fa-headphones-alt"></i> BĂNG NGHE CHOUKAI (AUDIO GỐC)
            </div>
            <div class="choukai-speed-controls">
              <span class="speed-label">Tốc độ:</span>
              <button type="button" class="btn-speed ${curSpeed === 0.8 ? "active" : ""}" data-speed="0.8" onclick="app.setAudioSpeed(${q.id}, 0.8)">0.8x</button>
              <button type="button" class="btn-speed ${curSpeed === 1.0 ? "active" : ""}" data-speed="1.0" onclick="app.setAudioSpeed(${q.id}, 1.0)">1.0x</button>
              <button type="button" class="btn-speed ${curSpeed === 1.2 ? "active" : ""}" data-speed="1.2" onclick="app.setAudioSpeed(${q.id}, 1.2)">1.2x</button>
            </div>
          </div>
          <audio id="audio-${q.id}" controls controlsList="nodownload" preload="metadata" onplay="app.markAudioListened(${q.id})" src="${audioUrl}">
            Trình duyệt của bạn không hỗ trợ phát âm thanh.
          </audio>
        </div>
      `;
    }

    // Image illustration handling
    let imageHTML = "";
    if (q.image) {
      imageHTML = `
        <div class="q-image-container" style="text-align: center; margin: 0.8rem 0;">
          <img src="${q.image}" alt="Hình minh họa bài tập" />
        </div>
      `;
    }

    // Format sentence: chuyển thẻ ruby có gạch dưới thành <span class="target-word"> gạch chân chuẩn JLPT
    let formattedSentence = (q.sentence || q.question || q.questionText || "");
    formattedSentence = formattedSentence.replace(/<ruby>([^<]+)<rt>_+<\/rt><\/ruby>/g, '<span class="target-word">$1</span>');

    const isBookmarked = this.isQuestionBookmarked(q.id);

    // Options grid
    let optionsHTML = "";
    const opts = q.optionsDisplay || q.options || [];
    const isLockedInPractice = this.currentMode === "practice" && isAnswered;

    opts.forEach((optText, i) => {
      const optNum = i + 1;
      let optClass = "opt-btn";

      if (isAnswered) {
        if (userSelected === optNum) optClass += " selected";
        if (showFeedback) {
          if (optNum === q.correctAnswer) optClass += " correct";
          else if (userSelected === optNum) optClass += " incorrect";
        }
      }

      optionsHTML += `
        <button class="${optClass}" ${isLockedInPractice ? "disabled" : ""} onclick="app.selectOption(${q.id}, ${optNum})">
          <span class="opt-num">${optNum}</span>
          <span>${optText}</span>
        </button>
      `;
    });

    // Choukai prompt
    let choukaiPromptHTML = "";

    // Explanation & Dokkai Translation
    let explanationHTML = "";
    const isDokkaiQuestion = !!(passageInfo && passageInfo.passage) || !!q.passage || (q.mondai >= 9 && q.mondai <= 14);

    let trans = null;
    if (isDokkaiQuestion) {
      const transKey = `${this.currentSessionId}_${passageInfo.sourceId || q.id}`;
      trans = (window.JLPT_PASSAGE_TRANSLATIONS && window.JLPT_PASSAGE_TRANSLATIONS[transKey])
              || (window.JLPT_PASSAGE_TRANSLATIONS && window.JLPT_PASSAGE_TRANSLATIONS[`${this.currentSessionId}_${q.id}`])
              || q.passageTranslation;

      if (!trans && isMultiQuestionPassage) {
        for (const member of passageGroup) {
          const mKey = `${this.currentSessionId}_${member.id}`;
          if (window.JLPT_PASSAGE_TRANSLATIONS && window.JLPT_PASSAGE_TRANSLATIONS[mKey]) {
            trans = window.JLPT_PASSAGE_TRANSLATIONS[mKey];
            break;
          }
          if (member.passageTranslation) {
            trans = member.passageTranslation;
            break;
          }
        }
      }
    }

    if (showFeedback && (q.explanation || (trans && trans.trim()))) {
      const statusText = isCorrect 
        ? (isBookmarked ? "✓ Chính xác (Đã tự động bỏ dấu sao ⭐)" : "✓ Chính xác") 
        : `✗ Chưa đúng (Đáp án: ${q.correctAnswer} - Đã tự động lưu ⭐)`;

      // Dokkai Full Passage Translation: Chỉ hiển thị ở vị trí cuối cùng trong đoạn văn
      let translationHTML = "";
      if (isLastInPassageGroup) {
        if (trans && trans.trim()) {
          translationHTML = `
            <div class="dokkai-translation-box">
              <div class="dokkai-translation-header">
                <i class="fas fa-language"></i> 📖 DỊCH TIẾNG VIỆT TOÀN BỘ BÀI ĐỌC:
              </div>
              <div class="dokkai-translation-body">
                ${trans.trim()}
              </div>
            </div>
          `;
        }
      } else if (isMultiQuestionPassage && trans && trans.trim()) {
        const lastQId = lastQuestionInGroup ? lastQuestionInGroup.id : "";
        translationHTML = `
          <div class="dokkai-translation-hint" style="margin-top: 0.65rem; padding: 0.5rem 0.85rem; background: rgba(59, 130, 246, 0.08); border-left: 3px solid var(--primary); font-size: 0.82rem; color: var(--text-sub); border-radius: 4px; display: flex; align-items: center; gap: 0.45rem;">
            <i class="fas fa-info-circle" style="color: var(--primary); flex-shrink: 0;"></i>
            <span>Đã hoàn thành <b>${answeredInGroup}/${passageGroup.length}</b> câu trong đoạn văn — Bản dịch toàn bài sẽ xuất hiện ở vị trí cuối cùng${lastQId ? ` (<b>Câu ${lastQId}</b>)` : ""} để tránh lộ trước đáp án.</span>
          </div>
        `;
      }

      explanationHTML = `
        <div class="explanation-box">
          <div class="explanation-title">
            <span>💡 Giải thích chi tiết${isChoukai ? " & Script hội thoại" : ""}:</span>
            <span style="margin-left: auto; font-weight: 700; color: ${isCorrect ? "var(--success)" : "var(--error)"};">
              ${statusText}
            </span>
          </div>
          ${q.explanation ? `<div>${q.explanation}</div>` : ""}
          ${translationHTML}
          <div style="margin-top: 0.6rem; display: flex; justify-content: flex-end;">
            <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;" onclick="app.resetQuestion(${q.id})">
              <i class="fas fa-redo"></i> Làm lại câu này
            </button>
          </div>
        </div>
      `;
    }

    // Navigation bar (Trước / Tiếp): Ẩn thanh điều hướng trung gian giữa các câu hỏi con trong cùng 1 đoạn văn
    let navHTML = "";
    if (!isSharedWithNext) {
      const firstGroupIdx = isSharedWithPrev ? Math.max(0, indexInFiltered - (posInGroup - 1)) : indexInFiltered;
      const hasPrev = firstGroupIdx > 0;
      const hasNext = indexInFiltered < filteredList.length - 1;
      const prevId = hasPrev ? filteredList[firstGroupIdx - 1].id : null;
      const nextId = hasNext ? filteredList[indexInFiltered + 1].id : null;

      navHTML = `
        <div class="q-nav-bar">
          <button class="q-nav-btn" onclick="event.stopPropagation(); app.scrollToQuestion(${prevId}, event)" ${!hasPrev ? "disabled" : ""}>
            <i class="fas fa-arrow-left"></i> Câu trước
          </button>
          <span style="font-size: 0.8rem; color: var(--text-sub);">Câu ${indexInFiltered + 1} / ${filteredList.length}</span>
          <button class="q-nav-btn" onclick="event.stopPropagation(); app.scrollToQuestion(${nextId}, event)" ${!hasNext ? "disabled" : ""}>
            Câu tiếp <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      `;
    }

    const hasPassage = !!(passageInfo && passageInfo.passage);
    const firstGroupId = passageGroup && passageGroup.length > 0 ? passageGroup[0].id : q.id;
    const lastGroupId = passageGroup && passageGroup.length > 0 ? passageGroup[passageGroup.length - 1].id : q.id;

    // Header của khối đoạn văn (hiển thị TRƯỚC đoạn văn)
    const passageHeaderHTML = (hasPassage && !isSharedWithPrev) ? `
      <div class="q-header passage-top-header">
        <span class="q-mondai-badge">${q.mondaiName || "Mondai " + q.mondai}</span>
        <span class="passage-group-title">
          <i class="fas fa-book-reader"></i>
          ${isMultiQuestionPassage
            ? `Đoạn văn cho Câu ${firstGroupId} – Câu ${lastGroupId} (${passageGroup.length} câu hỏi)`
            : `Đoạn văn cho Câu ${q.id}`}
        </span>
      </div>
    ` : "";

    // Header của từng câu hỏi (luôn hiển thị BÊN DƯỚI đoạn văn cho cả Câu đầu và các Câu tiếp theo)
    const questionHeaderHTML = hasPassage ? `
      <div class="q-header q-sub-header">
        <span class="q-sub-badge">
          <i class="fas fa-pen-alt"></i>
          ${isMultiQuestionPassage ? `Câu hỏi ${posInGroup}/${passageGroup.length}` : `Câu hỏi đọc hiểu`}
        </span>
        <span class="q-index">Câu ${q.id}</span>
        <button class="btn-bookmark ${isBookmarked ? "active" : ""}" onclick="app.toggleBookmark(${q.id})" title="${isBookmarked ? "Bỏ đánh dấu" : "Đánh dấu câu này"}">
          <i class="${isBookmarked ? "fas" : "far"} fa-star"></i>
        </button>
      </div>
    ` : `
      <div class="q-header">
        <span class="q-mondai-badge">${q.mondaiName || "Mondai " + q.mondai}</span>
        <span class="q-index">Câu ${q.id}</span>
        <button class="btn-bookmark ${isBookmarked ? "active" : ""}" onclick="app.toggleBookmark(${q.id})" title="${isBookmarked ? "Bỏ đánh dấu" : "Đánh dấu câu này"}">
          <i class="${isBookmarked ? "fas" : "far"} fa-star"></i>
        </button>
      </div>
    `;

    const questionItemOpen = hasPassage ? `<div id="q-subitem-${q.id}" class="passage-subquestion-item ${isSharedWithPrev ? "is-child" : "is-first"}">` : "";
    const questionItemClose = hasPassage ? `</div>` : "";

    return `
      ${passageHeaderHTML}
      ${dokkaiHTML}
      ${questionItemOpen}
      ${questionHeaderHTML}
      ${isChoukai ? choukaiHeaderHTML : ""}
      ${audioHTML}
      ${imageHTML}
      ${!isChoukai ? `
        <div class="q-sentence-row">
          <div class="q-sentence">${formattedSentence}</div>
        </div>
      ` : ""}
      <div class="options-grid">${optionsHTML}</div>
      ${choukaiPromptHTML}
      ${explanationHTML}
      ${questionItemClose}
      ${navHTML}
    `;
  }

  getStarSlots(qId) {
    const raw = this.starAnswers[qId];
    if (!raw || !Array.isArray(raw)) return [null, null, null, null];
    const res = [null, null, null, null];
    for (let i = 0; i < 4; i++) {
      res[i] = (raw[i] !== undefined && raw[i] !== null) ? raw[i] : null;
    }
    return res;
  }

  formatStarOrder(order, starPos) {
    if (!order || !Array.isArray(order) || order.length !== 4) return "";
    const starIdx = (starPos && starPos >= 1 && starPos <= 4) ? starPos - 1 : 2;
    return order.map((num, idx) => {
      if (idx === starIdx) {
        return `★ (${num})`;
      }
      return `(${num})`;
    }).join(" - ");
  }

  getStarTranslation(sessionNum, qId) {
    if (!window.JLPT_STAR_TRANSLATIONS) return "";
    const num = parseInt(String(sessionNum).replace(/\D+/g, ""), 10);
    const keys = [
      `${sessionNum}_${qId}`,
      `${num}_${qId}`,
      `buoi_${String(num).padStart(2, "0")}_${qId}`
    ];
    for (let k of keys) {
      if (window.JLPT_STAR_TRANSLATIONS[k]) {
        return window.JLPT_STAR_TRANSLATIONS[k];
      }
    }
    return "";
  }

  getStarPosition(q) {
    if (!q) return 3;
    const order = q.correctOrder || q.sentenceOrder;
    const target = q.correctStarOption || q.correctAnswer;
    if (Array.isArray(order) && target !== undefined) {
      const idx = order.indexOf(target);
      if (idx !== -1) return idx + 1;
    }
    const text = q.question || q.sentence;
    if (text) {
      const blanks = text.match(/(?:[_＿]*<u>★<\/u>[_＿]*|[_＿]*★[_＿]*|[_＿]+)/g);
      if (blanks && blanks.length >= 4) {
        const sIdx = blanks.findIndex(b => b.includes("★"));
        if (sIdx !== -1) return sIdx + 1;
      }
    }
    return q.starPositionIndex || 3;
  }

  formatStarExplanationHTML(q) {
    if (!q) return "";
    const rawExp = q.explanation || "";
    const order = q.correctOrder || q.sentenceOrder || [];
    const starPos = this.getStarPosition(q);
    const formattedOrder = this.formatStarOrder(order, starPos);

    let trans = this.getStarTranslation(this.currentSessionId, q.id);
    if (!trans && q.translation) {
      trans = q.translation;
    }

    let lines = rawExp.split(/<br\s*\/?>|\n/i).map(l => l.trim()).filter(Boolean);
    let sentenceLines = [];
    let starPosLines = [];
    let grammarLines = [];
    let unlabelledLines = [];

    for (let line of lines) {
      const cleanLine = line.replace(/<[^>]+>/g, "").trim();

      // 1. Thứ tự câu đúng đã hiển thị ở badge trên cùng nên bỏ qua
      if (/^(?:•\s*)?(?:Thứ tự câu đúng|Thứ tự sắp xếp đúng|Thứ tự đúng)\s*:/i.test(cleanLine)) {
        continue;
      }

      // 2. Câu ghép hoàn chỉnh / Cấu trúc ghép câu
      if (/^(?:•\s*)?(?:Cấu trúc ghép câu|Ghép câu|Câu hoàn chỉnh)\s*:/i.test(cleanLine)) {
        sentenceLines.push(line);
        continue;
      }
      if (/^<b>Cấu trúc:<\/b>\s*.*?(?:\[\d.*?\]|\d\s*->)/i.test(line) || /^Cấu trúc:\s*.*?(?:\[\d.*?\]|\d\s*->)/i.test(cleanLine)) {
        sentenceLines.push(line);
        continue;
      }

      // 3. Dịch nghĩa
      if (/^(?:•\s*)?(?:Dịch nghĩa|Dịch câu|Dịch|Ý nghĩa)\s*:/i.test(cleanLine)) {
        const m = cleanLine.match(/^(?:•\s*)?(?:Dịch nghĩa|Dịch câu|Dịch|Ý nghĩa)\s*:\s*(.+)$/i);
        if (m && m[1].trim()) {
          const parsed = m[1].trim();
          if (!trans || parsed.length >= trans.length) trans = parsed;
        }
        continue;
      }

      // 4. Vị trí ngôi sao / Đáp án
      if (/^(?:•\s*)?(?:Vị trí (?:ngôi |dấu )?sao|Đáp án(?: đúng)?|Ngôi sao|Dấu sao)\b/i.test(cleanLine) || /->\s*Vị trí (?:dấu )?sao/i.test(cleanLine)) {
        starPosLines.push(line);
        continue;
      }

      // 5. Cấu trúc / Ngữ pháp / Mẫu câu
      if (/^(?:•\s*)?(?:Cấu trúc|Ngữ pháp|Mẫu câu)\s*:/i.test(cleanLine)) {
        grammarLines.push(line);
        continue;
      }

      // 6. Dòng tiếng Việt không nhãn (dịch câu)
      if (!/[ぁ-んァ-ヶ一-龯]/.test(cleanLine) && /[a-zA-Zà-ỹÀ-Ỹ]/.test(cleanLine)) {
        unlabelledLines.push(cleanLine);
      } else {
        grammarLines.push(line);
      }
    }

    if (unlabelledLines.length > 0) {
      const unlabelledTrans = unlabelledLines.join(" ");
      if (!trans || unlabelledTrans.length >= trans.length) {
        trans = unlabelledTrans;
      }
    }

    let html = "";
    // BƯỚC 1: Thứ tự câu đúng (1 - 4 - ★ 3 - 2)
    if (formattedOrder) {
      html += `<div style="margin-bottom: 0.5rem; font-size: 1rem;"><b>Thứ tự câu đúng:</b> <span class="star-order-badge" style="color: #f59e0b; font-weight: 700; font-size: 1.05rem; letter-spacing: 0.5px;">${formattedOrder}</span></div>`;
    }

    // BƯỚC 2: Câu ghép hoàn chỉnh (ở vị trí trên)
    if (sentenceLines.length > 0) {
      html += `<div style="margin-bottom: 0.45rem;">${sentenceLines.join("<br>")}</div>`;
    }

    // BƯỚC 3: Dịch nghĩa toàn câu (Ở VỊ TRÍ TRÊN, ngay dưới câu ghép hoàn chỉnh!)
    if (trans) {
      html += `
        <div class="star-trans-box" style="margin-bottom: 0.55rem;">
          <b class="star-trans-label">Dịch:</b> <span style="color: var(--text-main); font-weight: 500;">${trans}</span>
        </div>
      `;
    }

    // BƯỚC 4: Vị trí ngôi sao ★ & Phân tích ngữ pháp (Ở VỊ TRÍ DƯỚI)
    if (starPosLines.length > 0) {
      html += `<div style="margin-bottom: 0.35rem;">${starPosLines.join("<br>")}</div>`;
    }
    if (grammarLines.length > 0) {
      html += `<div>${grammarLines.join("<br>")}</div>`;
    }

    return html;
  }

  renderStarQuestionHTML(q, indexInFiltered, filteredList) {
    const currentSlots = this.getStarSlots(q.id);
    const placedCount = currentSlots.filter((x) => x !== null).length;
    const isComplete = placedCount === 4;

    // Detect fragments pool
    const fragments = (Array.isArray(q.fragments) && q.fragments.length > 0)
      ? q.fragments
      : (Array.isArray(q.options) ? q.options.map((opt, i) => ({ id: i + 1, text: opt })) : []);

    // Detect star position (1..4)
    const starPos = this.getStarPosition(q);

    // Detect beforeText / afterText
    let beforeText = q.beforeText;
    let afterText = q.afterText;
    const rawStarText = q.question || q.sentence || "";
    if (beforeText === undefined && rawStarText) {
      const match = rawStarText.match(/^(.*?)(?:[\s　]*(?:[_＿]*<u>★<\/u>[_＿]*|[_＿]*★[_＿]*|[_＿]+)[\s　]*){4}(.*)$/s);
      if (match) {
        beforeText = match[1];
        afterText = match[2];
      } else {
        beforeText = rawStarText;
        afterText = "";
      }
    }

    const starChosenId = currentSlots[starPos - 1]; // id của mảnh nằm ở vị trí sao
    const targetCorrectStar = q.correctStarOption || q.correctAnswer;
    const isStarCorrect = (starChosenId === targetCorrectStar);
    const isCorrect = isStarCorrect;

    const correctOrder = q.correctOrder || q.sentenceOrder;
    let isFullOrderCorrect = true;
    if (Array.isArray(correctOrder) && correctOrder.length === 4) {
      isFullOrderCorrect = correctOrder.every((fragId, idx) => currentSlots[idx] === fragId);
    }

    const showFeedback = this.currentMode === "practice" && isComplete;
    const isBookmarked = this.isQuestionBookmarked(q.id);

    // 4 Slots - Kéo thả vào bất kỳ ô nào, hoặc click để gỡ / chọn ô
    let slotsHTML = "";
    for (let i = 0; i < 4; i++) {
      const isStar = (i + 1) === starPos;
      const fragId = currentSlots[i];
      const frag = fragments.find((f) => f.id === fragId);
      const hasItem = !!frag;
      const isSelected = this.selectedStarSlot && this.selectedStarSlot.qId === q.id && this.selectedStarSlot.slotIndex === i;

      slotsHTML += `
        <div class="star-slot ${isStar ? "is-star" : ""} ${hasItem ? "filled" : ""} ${isSelected ? "selected-slot" : ""}" 
             data-qid="${q.id}"
             data-slotindex="${i}"
             data-source="slot"
             ${hasItem ? `data-fragid="${frag.id}" data-fromslot="${i}"` : ""}
             draggable="${hasItem && !showFeedback ? "true" : "false"}"
             ondragstart="app.handleStarDragStart(event, ${q.id}, 'slot', ${hasItem ? frag.id : 'null'}, ${i})"
             ondragend="app.handleStarDragEnd(event)"
             ondragover="app.handleStarDragOver(event)"
             ondragenter="app.handleStarDragEnter(event)"
             ondragleave="app.handleStarDragLeave(event)"
             ondrop="app.handleStarDrop(event, ${q.id}, ${i})"
             onclick="app.clickStarSlot(${q.id}, ${i})" 
             title="${hasItem ? "Kéo sang ô khác hoặc bấm để gỡ từ '" + frag.text + "' ra" : (isSelected ? "Đang chọn ô này" : "Bấm chọn hoặc kéo từ thả vào ô " + (i + 1))}">
          ${hasItem ? `
            <span class="slot-text">${frag.text}</span>
            ${!showFeedback ? `<span class="slot-remove-btn" title="Gỡ từ này ra" onclick="event.stopPropagation(); app.clickStarSlot(${q.id}, ${i})">&times;</span>` : ""}
          ` : (isStar ? `<span class="slot-placeholder star-char">★</span>` : `<span class="slot-placeholder">＿＿</span>`)}
        </div>
      `;
    }

    // Chips pool - Kéo thả hoặc click
    let chipsHTML = "";
    fragments.forEach((frag) => {
      const isUsed = currentSlots.includes(frag.id);
      chipsHTML += `
        <button class="star-fragment-chip ${isUsed ? "used" : ""}" 
                data-qid="${q.id}"
                data-fragid="${frag.id}"
                data-source="pool"
                ${showFeedback ? "disabled" : ""}
                draggable="${!isUsed && !showFeedback ? "true" : "false"}"
                ondragstart="app.handleStarDragStart(event, ${q.id}, 'pool', ${frag.id})"
                ondragend="app.handleStarDragEnd(event)"
                onclick="app.clickStarFragment(${q.id}, ${frag.id})"
                title="${isUsed ? "Bấm để gỡ từ này ra" : "Kéo thả vào ô bất kỳ hoặc bấm để chọn"}">
          <i class="fas fa-grip-vertical drag-handle-icon" style="font-size: 0.72rem; opacity: 0.55; margin-right: 2px;"></i>
          ${frag.id}. ${frag.text} ${isUsed ? '<i class="fas fa-undo" style="font-size: 0.75rem; margin-left: 4px;"></i>' : ""}
        </button>
      `;
    });

    let explanationHTML = "";
    if (showFeedback && q.explanation) {
      let statusText = "";
      let statusColor = "";
      let orderWarningHTML = "";

      if (isStarCorrect && isFullOrderCorrect) {
        statusText = isBookmarked ? "✓ Đúng vị trí dấu ★ & Đúng cả câu (Đã bỏ dấu sao ⭐)" : "✓ Đúng vị trí dấu ★ & Đúng cả câu";
        statusColor = "var(--success)";
      } else if (isStarCorrect && !isFullOrderCorrect) {
        statusText = "⚠️ Đúng dấu ★ nhưng sai thứ tự câu (Đã lưu ⭐)";
        statusColor = "#f59e0b"; // Màu cảnh báo cam/hổ phách

        // Xây dựng chuỗi thứ tự người học và thứ tự đúng
        const userOrderStr = currentSlots.map((id, idx) => (idx + 1 === starPos ? `★ (${id})` : `(${id})`)).join(" - ");
        const correctOrderStr = correctOrder ? correctOrder.map((id, idx) => (idx + 1 === starPos ? `★ (${id})` : `(${id})`)).join(" - ") : "";

        orderWarningHTML = `
          <div style="background: rgba(245, 158, 11, 0.12); border: 1.5px solid #f59e0b; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.85rem; color: #b45309; font-size: 0.88rem; line-height: 1.55;">
            <div style="font-weight: 700; display: flex; align-items: center; gap: 0.4rem; font-size: 0.95rem; margin-bottom: 0.35rem; color: #b45309;">
              <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> Cảnh báo: Vị trí dấu ★ đã đúng, nhưng thứ tự ghép câu chưa chuẩn xác!
            </div>
            <div>
              • <b>Thứ tự bạn đã xếp:</b> <span style="font-family: monospace; font-weight: 700;">${userOrderStr}</span><br>
              • <b>Thứ tự câu đúng:</b> <span style="font-family: monospace; font-weight: 700; color: var(--success);">${correctOrderStr}</span><br>
              • Từ ở vị trí dấu <b>[ ★ ]</b> của bạn đạt điểm thi, nhưng ngữ pháp câu thực tế cần ghép theo đúng trật tự chuẩn.<br>
              👉 <i>Hệ thống đã <b>tự động lưu dấu sao ⭐</b> câu này vào danh sách ôn tập. Hãy bấm nút <b>"Xếp lại câu này"</b> bên dưới để luyện xếp lại cho thật chuẩn nhé!</i>
            </div>
          </div>
        `;
      } else {
        statusText = "✗ Chưa đúng vị trí dấu ★ (Đã tự động lưu ⭐)";
        statusColor = "var(--error)";
      }

      explanationHTML = `
        <div class="explanation-box">
          <div class="explanation-title">
            <span>💡 Giải thích chi tiết sắp xếp câu:</span>
            <span style="margin-left: auto; font-weight: 700; color: ${statusColor};">
              ${statusText}
            </span>
          </div>
          ${orderWarningHTML}
          <div>${this.formatStarExplanationHTML(q)}</div>
          <div style="margin-top: 0.6rem; display: flex; justify-content: flex-end;">
            <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;" onclick="app.resetStarQuestion(${q.id})">
              <i class="fas fa-redo"></i> Xếp lại câu này
            </button>
          </div>
        </div>
      `;
    }

    // Navigation bar (Trước / Tiếp)
    const hasPrev = indexInFiltered > 0;
    const hasNext = indexInFiltered < filteredList.length - 1;
    const prevId = hasPrev ? filteredList[indexInFiltered - 1].id : null;
    const nextId = hasNext ? filteredList[indexInFiltered + 1].id : null;

    const navHTML = `
      <div class="q-nav-bar">
        <button class="q-nav-btn" onclick="event.stopPropagation(); app.scrollToQuestion(${prevId}, event)" ${!hasPrev ? "disabled" : ""}>
          <i class="fas fa-arrow-left"></i> Câu trước
        </button>
        <span style="font-size: 0.8rem; color: var(--text-sub);">Câu ${indexInFiltered + 1} / ${filteredList.length}</span>
        <button class="q-nav-btn" onclick="event.stopPropagation(); app.scrollToQuestion(${nextId}, event)" ${!hasNext ? "disabled" : ""}>
          Câu tiếp <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    `;

    const isSelectedSlot = this.selectedStarSlot && this.selectedStarSlot.qId === q.id;
    let helperText = "";
    if (isSelectedSlot) {
      helperText = `👉 <b>Đang chọn Ô số ${this.selectedStarSlot.slotIndex + 1}</b>: Bấm một từ bên dưới để điền vào ô này, hoặc kéo thả từ vào bất kỳ ô nào khác.`;
    } else {
      helperText = `👉 <b>Kéo thả</b> đáp án vào <b>bất kì ô nào</b> (Ô số <b>${starPos}</b> là dấu ★), hoặc bấm từ để điền. Bấm vào ô đã điền để gỡ ra:`;
    }

      return `
      <div class="q-header">
        <span class="q-mondai-badge">${q.mondaiName || "Mondai 8 (Dấu Sao ★)"}</span>
        <span class="q-index">Câu ${q.id} (Dấu Sao ★)</span>
        <button class="btn-bookmark ${isBookmarked ? "active" : ""}" onclick="app.toggleBookmark(${q.id})" title="${isBookmarked ? "Bỏ đánh dấu" : "Đánh dấu câu này"}">
          <i class="${isBookmarked ? "fas" : "far"} fa-star"></i>
        </button>
      </div>

      <div class="star-sentence-box">
        <span class="star-text-before">${beforeText || ""}</span>
        <span class="star-slots">${slotsHTML}</span>
        <span class="star-text-after">${afterText || ""}</span>
      </div>

      <!-- Hướng dẫn cách làm rõ ràng cho câu dấu sao -->
      <div style="background: var(--card-bg, #ffffff); border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: 8px; padding: 0.7rem 0.9rem; margin-bottom: 0.85rem; font-size: 0.85rem; line-height: 1.5;">
        <div style="font-weight: 700; color: var(--primary); margin-bottom: 0.25rem;">
          <i class="fas fa-info-circle"></i> HƯỚNG DẪN CÂU HỎI DẤU SAO ★ (Vị trí ô ★ là Ô số ${starPos}):
        </div>
        <div style="color: var(--text-sub);">
          • <b>Cách 1 (Ghép câu):</b> Kéo thả hoặc click lần lượt 4 từ bên dưới để ghép trọn câu (từ nằm ở ô số <b>${starPos} ★</b> là đáp án tính điểm).<br>
          • <b>Cách 2 (Chọn nhanh):</b> Bấm trực tiếp 1 trong 4 đáp án trắc nghiệm bên dưới để chọn ngay phương án cho vị trí <b>[ ★ ]</b>.
        </div>
      </div>

      <div style="font-size: 0.83rem; font-weight: 600; color: var(--text); margin-bottom: 0.35rem;">
        🧩 Mảnh ghép từ vựng (Click vào từ để điền vào ô trống tiếp theo, click ô đã điền để gỡ):
      </div>
      <div class="star-fragments-pool" 
           data-qid="${q.id}"
           ondragover="app.handleStarDragOver(event)"
           ondragenter="app.handleStarDragEnter(event)"
           ondragleave="app.handleStarDragLeave(event)"
           ondrop="app.handleStarDropToPool(event, ${q.id})">
        ${chipsHTML}
      </div>

      <div style="margin: 0.4rem 0 0.8rem 0; display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn btn-outline" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;" onclick="app.resetStarQuestion(${q.id})">
          <i class="fas fa-undo"></i> Xếp lại từ đầu
        </button>
        ${placedCount > 0 ? `<span style="font-size: 0.78rem; color: var(--text-sub);">Đã xếp: ${placedCount}/4 từ</span>` : ""}
      </div>

      ${explanationHTML}
      ${navHTML}`;
  }

  handleStarDragStart(e, qId, source, fragId, fromSlotIndex = null) {
    const slots = this.getStarSlots(qId);
    const isComplete = slots.every(s => s !== null);
    if (this.currentMode === "practice" && isComplete) {
      e.preventDefault();
      return;
    }
    this.currentDraggedStar = { qId, source, fragId, fromSlotIndex };
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", JSON.stringify(this.currentDraggedStar));
      } catch (err) {}
    }
    setTimeout(() => {
      if (e.target) e.target.classList.add("dragging");
    }, 0);
  }

  handleStarDragEnd(e) {
    if (e.target) e.target.classList.remove("dragging");
    document.querySelectorAll(".star-slot.drag-over, .star-fragments-pool.drag-over").forEach(el => el.classList.remove("drag-over"));
    this.currentDraggedStar = null;
  }

  handleStarDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  handleStarDragEnter(e) {
    const slot = e.currentTarget.closest(".star-slot") || e.currentTarget.closest(".star-fragments-pool");
    if (slot) slot.classList.add("drag-over");
  }

  handleStarDragLeave(e) {
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
    e.currentTarget.classList.remove("drag-over");
  }

  handleStarDrop(e, qId, targetSlotIndex) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    let dragData = this.currentDraggedStar;
    if (!dragData && e.dataTransfer) {
      try {
        const text = e.dataTransfer.getData("text/plain");
        if (text) dragData = JSON.parse(text);
      } catch (err) {}
    }
    if (!dragData || dragData.qId !== qId) return;
    this.handleStarDropAction(qId, dragData.source, dragData.fragId, dragData.fromSlotIndex, targetSlotIndex);
  }

  handleStarDropToPool(e, qId) {
    e.preventDefault();
    e.currentTarget.classList.remove("drag-over");
    let dragData = this.currentDraggedStar;
    if (!dragData && e.dataTransfer) {
      try {
        const text = e.dataTransfer.getData("text/plain");
        if (text) dragData = JSON.parse(text);
      } catch (err) {}
    }
    if (!dragData || dragData.qId !== qId || dragData.source !== "slot") return;
    this.handleStarDropToPoolAction(qId, dragData.fromSlotIndex);
  }

  handleStarDropAction(qId, source, fragId, fromSlotIndex, targetSlotIndex) {
    const slots = this.getStarSlots(qId);
    const isComplete = slots.every(s => s !== null);
    if (this.currentMode === "practice" && isComplete) return;

    if (source === "slot") {
      if (fromSlotIndex === targetSlotIndex) return;
      const targetExisting = slots[targetSlotIndex];
      // Hoán đổi hoặc di chuyển
      slots[targetSlotIndex] = fragId;
      slots[fromSlotIndex] = (targetExisting !== undefined && targetExisting !== null) ? targetExisting : null;
    } else {
      // Từ kho fragment pool
      const oldIdx = slots.indexOf(fragId);
      if (oldIdx !== -1) slots[oldIdx] = null;
      slots[targetSlotIndex] = fragId;
    }

    this.selectedStarSlot = null;
    this.starAnswers[qId] = slots;
    this.checkAndSaveStarQuestion(qId, slots);
  }

  handleStarDropToPoolAction(qId, fromSlotIndex) {
    const slots = this.getStarSlots(qId);
    const isComplete = slots.every(s => s !== null);
    if (this.currentMode === "practice" && isComplete) return;

    if (fromSlotIndex !== null && fromSlotIndex !== undefined) {
      slots[fromSlotIndex] = null;
      this.selectedStarSlot = null;
      this.starAnswers[qId] = slots;
      this.checkAndSaveStarQuestion(qId, slots);
    }
  }

  checkAndSaveStarQuestion(qId, slots) {
    const isComplete = slots.every(s => s !== null);
    const q = this.getAllQuestions().find(x => x.id === qId);

    if (isComplete) {
      const starPos = this.getStarPosition(q);
      const starFragId = slots[starPos - 1];
      this.userAnswers[qId] = starFragId;

      if (q && this.currentMode === "practice") {
        const targetAns = q.correctStarOption || q.correctAnswer;
        const isStarCorrect = (starFragId === targetAns);
        const correctOrder = q.correctOrder || q.sentenceOrder;
        let isFullOrderCorrect = true;
        if (Array.isArray(correctOrder) && correctOrder.length === 4) {
          isFullOrderCorrect = correctOrder.every((fragId, idx) => slots[idx] === fragId);
        }

        // Chỉ khi đúng cả vị trí dấu sao VÀ đúng thứ tự ghép câu trọn vẹn thì mới xóa bookmark
        if (isStarCorrect && isFullOrderCorrect) {
          this.removeBookmark(qId, false);
          this.removeWrongQuestion(qId);
        } else {
          // Đúng dấu sao nhưng sai thứ tự các vị trí khác HOẶC sai dấu sao -> Đều lưu lại dấu sao ⭐
          this.addBookmark(qId, false);
          this.addWrongQuestion(qId);
        }
      }
    } else {
      delete this.userAnswers[qId];
    }

    this.saveDraftAnswers();
    this.renderSingleQuestion(qId);
    this.updatePallet();
    if (typeof this.renderFilterTabs === "function") this.renderFilterTabs();
    this.setActiveQuestion(qId, false);
  }

  // Click vào ô: nếu đã có từ thì gỡ ra, nếu trống thì chọn ô này để nhận từ tiếp theo
  clickStarSlot(qId, slotIndex) {
    const slots = this.getStarSlots(qId);
    const isComplete = slots.every(s => s !== null);

    if (this.currentMode === "practice" && isComplete) {
      return;
    }

    // Nếu ô đã điền -> Bấm để gỡ ra
    if (slots[slotIndex] !== null) {
      slots[slotIndex] = null;
      this.selectedStarSlot = null;
      this.starAnswers[qId] = slots;
      this.checkAndSaveStarQuestion(qId, slots);
      return;
    }

    // Nếu ô trống -> Chọn / Bỏ chọn ô này để nhận từ tiếp theo khi bấm chip
    if (this.selectedStarSlot && this.selectedStarSlot.qId === qId && this.selectedStarSlot.slotIndex === slotIndex) {
      this.selectedStarSlot = null;
    } else {
      this.selectedStarSlot = { qId, slotIndex };
    }
    this.renderSingleQuestion(qId);
  }

  // Click vào chip để chọn hoặc gỡ bỏ
  // TÍNH NĂNG MỚI: Chọn nhanh đáp án trắc nghiệm cho vị trí Dấu Sao ★
  selectStarDirectOption(qId, fragId) {
    if (this.currentMode === "practice" && this.userAnswers[qId] !== undefined) {
      return;
    }
    const all = this.getAllQuestions();
    const q = all.find(x => x.id === qId);
    if (!q) return;

    const starPos = this.getStarPosition(q);
    const slots = this.getStarSlots(qId);

    // Giải phóng từ fragId nếu đang nằm ở ô khác
    for (let i = 0; i < 4; i++) {
      if (slots[i] === fragId) slots[i] = null;
    }
    // Đặt từ fragId vào đúng ô dấu sao (starPos - 1)
    slots[starPos - 1] = fragId;

    // Tự động sắp xếp các ô còn lại theo trật tự câu đúng nếu có
    const order = q.correctOrder || q.sentenceOrder;
    const fragments = (Array.isArray(q.fragments) && q.fragments.length > 0)
      ? q.fragments
      : (Array.isArray(q.options) ? q.options.map((opt, i) => ({ id: i + 1, text: opt })) : []);
    const remainingFragIds = fragments.map(f => f.id).filter(id => id !== fragId);
    let remIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i !== starPos - 1) {
        if (order && Array.isArray(order) && order[i] !== undefined && order[i] !== fragId) {
          slots[i] = order[i];
        } else {
          slots[i] = remainingFragIds[remIdx++] || null;
        }
      }
    }

    this.starAnswers[qId] = slots;
    this.userAnswers[qId] = fragId;

    if (this.currentMode === "practice") {
      const targetAns = q.correctStarOption || q.correctAnswer;
      const isCorrect = (fragId === targetAns);
      if (isCorrect) {
        this.removeBookmark(qId, false);
        this.removeWrongQuestion(qId);
      } else {
        this.addBookmark(qId, false);
        this.addWrongQuestion(qId);
      }
    }

    this.saveDraftAnswers();
    this.renderSingleQuestion(qId);
    this.updatePallet();
    if (typeof this.renderFilterTabs === "function") this.renderFilterTabs();
    this.setActiveQuestion(qId, false);
  }

  clickStarFragment(qId, fragId) {
    const slots = this.getStarSlots(qId);
    const isComplete = slots.every(s => s !== null);

    if (this.currentMode === "practice" && isComplete) {
      return;
    }

    const existingIndex = slots.indexOf(fragId);

    // Nếu từ này đã được xếp trong 1 ô nào đó -> Bấm vào chip sẽ gỡ ra (Toggle)
    if (existingIndex > -1) {
      slots[existingIndex] = null;
      this.selectedStarSlot = null;
      this.starAnswers[qId] = slots;
      this.checkAndSaveStarQuestion(qId, slots);
      return;
    }

    // Nếu từ này chưa được xếp:
    // 1. Nếu người dùng đang chọn sẵn 1 ô trống cụ thể -> Điền thẳng vào ô đó
    if (this.selectedStarSlot && this.selectedStarSlot.qId === qId && slots[this.selectedStarSlot.slotIndex] === null) {
      slots[this.selectedStarSlot.slotIndex] = fragId;
      this.selectedStarSlot = null;
      this.starAnswers[qId] = slots;
      this.checkAndSaveStarQuestion(qId, slots);
      return;
    }

    // 2. Mặc định điền vào ô trống đầu tiên từ trái qua phải
    const emptyIdx = slots.findIndex(s => s === null);
    if (emptyIdx !== -1) {
      slots[emptyIdx] = fragId;
      this.selectedStarSlot = null;
      this.starAnswers[qId] = slots;
      this.checkAndSaveStarQuestion(qId, slots);
    }
  }

  resetStarQuestion(qId) {
    this.starAnswers[qId] = [null, null, null, null];
    delete this.userAnswers[qId];
    this.selectedStarSlot = null;
    this.saveDraftAnswers();
    this.renderSingleQuestion(qId);
    this.updatePallet();
    if (typeof this.renderFilterTabs === "function") this.renderFilterTabs();
    this.scrollToQuestionTop(qId);
  }

  // Hỗ trợ cảm ứng kéo thả trên Mobile & Tablet (Touch Drag & Drop)
  initStarTouchDrag() {
    let touchItem = null;
    let ghostEl = null;
    let startX = 0, startY = 0;
    let isDragging = false;

    const onTouchStart = (e) => {
      const handle = e.target.closest(".star-fragment-chip:not(.used):not([disabled]), .star-slot.filled:not([disabled])");
      if (!handle) return;
      if (this.currentMode === "practice") {
        const qId = parseInt(handle.dataset.qid, 10);
        const slots = this.getStarSlots(qId);
        if (slots.every(s => s !== null)) return;
      }
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      touchItem = handle;
      isDragging = false;
    };

    const onTouchMove = (e) => {
      if (!touchItem) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (!isDragging && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        isDragging = true;
        ghostEl = touchItem.cloneNode(true);
        ghostEl.className = "star-drag-ghost";
        const removeBtn = ghostEl.querySelector(".slot-remove-btn");
        if (removeBtn) removeBtn.remove();
        document.body.appendChild(ghostEl);
        touchItem.classList.add("dragging");
      }

      if (isDragging && ghostEl) {
        if (e.cancelable) e.preventDefault();
        ghostEl.style.left = `${touch.clientX}px`;
        ghostEl.style.top = `${touch.clientY}px`;

        const elem = document.elementFromPoint(touch.clientX, touch.clientY);
        document.querySelectorAll(".star-slot.drag-over, .star-fragments-pool.drag-over").forEach(el => el.classList.remove("drag-over"));
        if (elem) {
          const slot = elem.closest(".star-slot");
          if (slot) slot.classList.add("drag-over");
          const pool = elem.closest(".star-fragments-pool");
          if (pool) pool.classList.add("drag-over");
        }
      }
    };

    const onTouchEnd = (e) => {
      if (!touchItem) return;
      if (isDragging) {
        const touch = e.changedTouches[0];
        const elem = document.elementFromPoint(touch.clientX, touch.clientY);

        const qId = parseInt(touchItem.dataset.qid, 10);
        const fragId = parseInt(touchItem.dataset.fragid, 10);
        const source = touchItem.dataset.source;
        const fromSlot = touchItem.dataset.fromslot !== undefined && touchItem.dataset.fromslot !== "" 
          ? parseInt(touchItem.dataset.fromslot, 10) 
          : null;

        if (elem) {
          const targetSlot = elem.closest(".star-slot");
          const targetPool = elem.closest(".star-fragments-pool");
          if (targetSlot && targetSlot.dataset.slotindex !== undefined) {
            const targetIndex = parseInt(targetSlot.dataset.slotindex, 10);
            this.handleStarDropAction(qId, source, fragId, fromSlot, targetIndex);
          } else if (targetPool && source === "slot") {
            this.handleStarDropToPoolAction(qId, fromSlot);
          }
        }

        if (ghostEl && ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
        touchItem.classList.remove("dragging");
        document.querySelectorAll(".star-slot.drag-over, .star-fragments-pool.drag-over").forEach(el => el.classList.remove("drag-over"));
      }
      touchItem = null;
      ghostEl = null;
      isDragging = false;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
  }

  selectOption(qId, optNum) {
    // Trong chế độ luyện tập: nếu đã chọn đáp án rồi thì khóa, chỉ được chọn 1 lần (muốn làm lại bấm nút "Làm lại câu này")
    if (this.currentMode === "practice" && this.userAnswers[qId] !== undefined) {
      return;
    }

    this.userAnswers[qId] = optNum;

    // Tự động tích sao và bôi đỏ nếu làm sai, bỏ tích sao và chuyển xanh nếu làm đúng
    const allQuestions = this.getAllQuestions();
    const q = allQuestions.find(x => x.id === qId);
    if (q && this.currentMode === "practice") {
      const targetAns = this.getTargetAnswer(q);
      const isCorrect = (optNum === targetAns);
      if (isCorrect) {
        this.removeBookmark(qId, false);
        this.removeWrongQuestion(qId);
      } else {
        this.addBookmark(qId, false);
        this.addWrongQuestion(qId);
      }
    }

    this.saveDraftAnswers();
    this.renderSingleQuestion(qId);
    if (q && !q.isStarQuestion) {
      const pGroup = this.getPassageQuestionGroup(q, allQuestions);
      if (pGroup && pGroup.length > 1) {
        pGroup.forEach(member => {
          if (member.id !== qId) this.renderSingleQuestion(member.id);
        });
      }
    }
    this.updatePallet();
    this.renderFilterTabs();
    this.setActiveQuestion(qId, false);
  }

  resetQuestion(qId) {
    delete this.userAnswers[qId];
    delete this.audioListened[qId];
    delete this.choukaiPeek[qId];
    try {
      localStorage.setItem("jlpt_audio_listened", JSON.stringify(this.audioListened));
    } catch (e) {}
    this.saveDraftAnswers();
    const allQuestions = this.getAllQuestions();
    const q = allQuestions.find(x => x.id === qId);
    this.renderSingleQuestion(qId);
    if (q && !q.isStarQuestion) {
      const pGroup = this.getPassageQuestionGroup(q, allQuestions);
      if (pGroup && pGroup.length > 1) {
        pGroup.forEach(member => {
          if (member.id !== qId) this.renderSingleQuestion(member.id);
        });
      }
    }
    this.updatePallet();
    this.setActiveQuestion(qId, false);
  }

  toggleChoukaiPeek(qId) {
    this.choukaiPeek[qId] = !this.choukaiPeek[qId];
    this.renderSingleQuestion(qId);
  }

  markAudioListened(qId) {
    if (!this.audioListened[qId]) {
      this.audioListened[qId] = true;
      try {
        localStorage.setItem("jlpt_audio_listened", JSON.stringify(this.audioListened));
      } catch (e) {}
      // Nếu câu hỏi đã được chọn đáp án từ trước, lập tức mở khóa giải thích chi tiết
      if (this.userAnswers[qId] !== undefined) {
        this.renderSingleQuestion(qId);
      }
    }
  }

  getAudioSpeed(qId) {
    return (this.audioSpeeds && this.audioSpeeds[qId]) ? this.audioSpeeds[qId] : 1.0;
  }

  setAudioSpeed(qId, speed) {
    this.audioSpeeds = this.audioSpeeds || {};
    this.audioSpeeds[qId] = speed;
    const el = document.getElementById(`audio-${qId}`);
    if (el) {
      el.playbackRate = speed;
    }
    const card = document.getElementById(`q-card-${qId}`);
    if (card) {
      card.querySelectorAll(".btn-speed").forEach((b) => {
        const val = parseFloat(b.getAttribute("data-speed"));
        b.classList.toggle("active", val === speed);
      });
    }
  }

  scrollToElementBelowHeader(el) {
    if (!el) return;
    const headerEl = document.querySelector(".app-header");
    const headerHeight = headerEl ? headerEl.offsetHeight : 65;
    const extraPadding = 16; // 16px khoảng đệm thẩm mỹ để thấy rõ toàn bộ viền trên và tiêu đề câu hỏi
    const totalOffset = headerHeight + extraPadding;

    const rect = el.getBoundingClientRect();
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const targetScrollY = rect.top + currentScrollY - totalOffset;

    window.scrollTo({
      top: Math.max(0, targetScrollY),
      behavior: "smooth"
    });
  }

  setActiveQuestion(qId, shouldScroll = false) {
    if (!qId) return;
    this.activeQuestionId = qId;
    document.querySelectorAll(".question-card").forEach((card) => {
      card.classList.toggle("active-target", card.id === `q-card-${qId}`);
    });
    if (shouldScroll) {
      const el = document.getElementById(`q-card-${qId}`);
      if (el) {
        this.scrollToElementBelowHeader(el);
      }
    }
    this.scrollPalletToQuestion(qId, shouldScroll ? "smooth" : "auto");
    this.updateMobileBar();
    this.updateFloatingPalletBtn();
    const modal = document.getElementById("mobile-pallet-modal");
    if (modal && modal.style.display !== "none") {
      this.renderMobilePallet();
    }
  }

  scrollToQuestionTop(qId) {
    this.scrollToQuestion(qId);
  }

  scrollToQuestion(qId, evt = null) {
    if (evt && typeof evt.stopPropagation === "function") {
      evt.stopPropagation();
    }
    if (!qId) return;
    this.isProgrammaticScrolling = true;
    this.setActiveQuestion(qId, true);
    clearTimeout(this.programmaticScrollTimer);
    this.programmaticScrollTimer = setTimeout(() => {
      this.isProgrammaticScrolling = false;
      this.setActiveQuestion(qId, false);
    }, 850);
  }

  scrollPalletToQuestion(qId, behavior = "smooth") {
    if (!qId) return;
    const grid = document.getElementById("pallet-grid");
    if (!grid) return;
    const item = document.getElementById(`pallet-item-${qId}`);
    if (!item) return;

    grid.querySelectorAll(".pallet-item.active").forEach((el) => {
      if (el.id !== `pallet-item-${qId}`) el.classList.remove("active");
    });
    item.classList.add("active");

    // Tính toán khoảng cách tuyệt đối chuẩn xác CHỈ trong phạm vi grid
    // Tuyệt đối không dùng scrollIntoView() vì scrollIntoView sẽ làm nhảy cả cửa sổ/sidebar (kéo lung tung)
    const gridRect = grid.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const relativeTop = itemRect.top - gridRect.top + grid.scrollTop;
    const targetScrollTop = relativeTop - (grid.clientHeight / 2) + (item.clientHeight / 2);

    grid.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: behavior
    });
  }

  initScrollSpy() {
    if (this._scrollSpyAttached) return;
    this._scrollSpyAttached = true;

    let ticking = false;
    const onScroll = () => {
      if (this.isProgrammaticScrolling || this.isHoveringPallet) return;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          this.updateActiveQuestionFromScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true });
  }

  updateActiveQuestionFromScroll() {
    if (this.isProgrammaticScrolling || this.isHoveringPallet) return;
    const cards = document.querySelectorAll(".question-card");
    if (!cards || cards.length === 0) return;

    const headerEl = document.querySelector(".app-header");
    const headerHeight = headerEl ? headerEl.offsetHeight : 65;
    const readingLine = headerHeight + 45;
    let closestQId = null;

    // 1. Tìm câu hỏi đang trực tiếp bao trùm đường quan sát này
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (rect.top <= readingLine && rect.bottom >= readingLine) {
        const idStr = card.id;
        if (idStr && idStr.startsWith("q-card-")) {
          closestQId = parseInt(idStr.replace("q-card-", ""), 10);
          break;
        }
      }
    }

    // 2. Nếu nằm ở khoảng trống giữa 2 câu hoặc đầu trang, chọn câu gần đường quan sát nhất
    if (!closestQId) {
      let minDistance = Infinity;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const dist = Math.min(Math.abs(rect.top - readingLine), Math.abs(rect.bottom - readingLine));
        if (dist < minDistance) {
          minDistance = dist;
          const idStr = card.id;
          if (idStr && idStr.startsWith("q-card-")) {
            closestQId = parseInt(idStr.replace("q-card-", ""), 10);
          }
        }
      });
    }

    if (closestQId && closestQId !== this.activeQuestionId) {
      this.activeQuestionId = closestQId;
      cards.forEach((c) => {
        c.classList.toggle("active-target", c.id === `q-card-${closestQId}`);
      });
      this.scrollPalletToQuestion(closestQId, "smooth");
      this.updateMobileBar();
    }
  }

  

  // TÍNH NĂNG MỚI: Xử lý phím tắt 1, 2, 3, 4 chuẩn xác, không crash
  handleKeyboardSelect(optNum) {
    const filtered = this.getFilteredQuestions();
    if (filtered.length === 0) return;

    let targetQ = null;

    // 1. Nếu đã có câu hỏi đang active trong view
    if (this.activeQuestionId) {
      targetQ = filtered.find(q => q.id === this.activeQuestionId);
    }

    // 2. Nếu chưa có, tìm câu hỏi gần vị trí cuộn màn hình nhất
    if (!targetQ) {
      const centerY = window.innerHeight / 2;
      let minDistance = Infinity;

      filtered.forEach((q) => {
        const el = document.getElementById(`q-card-${q.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top + rect.height / 2 - centerY);
          if (distance < minDistance) {
            minDistance = distance;
            targetQ = q;
          }
        }
      });
    }

    if (!targetQ) targetQ = filtered[0];

    if (targetQ) {
      this.setActiveQuestion(targetQ.id, false);

      if (targetQ.isStarQuestion) {
        // Với câu dấu sao: phím 1..4 tương ứng với chọn/gỡ mảnh ghép 1..4
        this.clickStarFragment(targetQ.id, optNum);
      } else {
        // Với câu trắc nghiệm: phím 1..4 tương ứng với đáp án 1..4
        this.selectOption(targetQ.id, optNum);
      }
    }
  }

  // TÍNH NĂNG MỚI: Phím J/K hoặc Mũi tên lên/xuống để chuyển câu
  navigateQuestion(direction) {
    const filtered = this.getFilteredQuestions();
    if (filtered.length === 0) return;

    let currentIndex = filtered.findIndex(q => q.id === this.activeQuestionId);
    if (currentIndex === -1) currentIndex = 0;

    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= filtered.length) nextIndex = filtered.length - 1;

    const nextQ = filtered[nextIndex];
    if (nextQ) {
      this.scrollToQuestion(nextQ.id);
    }
  }

  renderSingleQuestion(qId) {
    const all = this.getAllQuestions();
    const q = all.find(x => x.id === qId);
    if (!q) return;

    const filtered = this.getFilteredQuestions();
    let idx = filtered.findIndex(x => x.id === qId);
    if (idx === -1) idx = all.findIndex(x => x.id === qId);

    const card = document.getElementById(`q-card-${qId}`);
    if (card) {
      const list = filtered.length > 0 ? filtered : all;
      const groupState = !q.isStarQuestion ? this.getPassageGroupState(q, idx, list) : { cardGroupClass: "" };
      card.className = "question-card" + groupState.cardGroupClass + (this.activeQuestionId === q.id ? " active-target" : "");
      if (q.isStarQuestion) {
        card.innerHTML = this.renderStarQuestionHTML(q, idx, list);
      } else {
        card.innerHTML = this.renderStandardQuestionHTML(q, idx, list);
      }
    }
  }

  // NÂNG CẤP PALLET: Phân nhóm theo Section và cập nhật thanh tiến độ %
  updatePallet() {
    const grid = document.getElementById("pallet-grid");
    if (!grid) return;

    if (!grid.dataset.scrollBound) {
      grid.dataset.scrollBound = "true";
      grid.addEventListener("mouseenter", () => { this.isHoveringPallet = true; });
      grid.addEventListener("mouseleave", () => { this.isHoveringPallet = false; });
      grid.addEventListener("touchstart", () => { this.isHoveringPallet = true; }, { passive: true });
      grid.addEventListener("touchend", () => {
        setTimeout(() => { this.isHoveringPallet = false; }, 1200);
      }, { passive: true });
    }

    grid.innerHTML = "";

    const all = this.getAllQuestions();
    let answeredCount = 0;
    let wrongCount = 0;

    // Tính tổng số câu đã làm và câu sai
    all.forEach((q) => {
      const isAnswered = this.userAnswers[q.id] !== undefined;
      if (isAnswered) {
        answeredCount++;
        const targetAns = this.getTargetAnswer(q);
        if (this.userAnswers[q.id] !== targetAns) wrongCount++;
      }
    });

    const sessionKey = String(this.currentSessionId);
    const starredList = this.bookmarks[sessionKey] || [];
    const countStarredEl = document.getElementById("count-starred");
    if (countStarredEl) countStarredEl.textContent = starredList.length;

    const countWrongEl = document.getElementById("count-wrong");
    if (countWrongEl) countWrongEl.textContent = wrongCount;

    // Cập nhật text & thanh progress bar theo đúng phần đang lọc (Đọc hiểu, Từ vựng,...)
    const filtered = this.getFilteredQuestions();
    let filterAnsweredCount = 0;
    filtered.forEach(q => {
      if (this.userAnswers[q.id] !== undefined) filterAnsweredCount++;
    });
    const filterPct = filtered.length > 0 ? Math.round((filterAnsweredCount / filtered.length) * 100) : 0;
    const pct = all.length > 0 ? Math.round((answeredCount / all.length) * 100) : 0;

    const statusText = document.getElementById("pallet-status-text");
    if (statusText) {
      if (this.activeFilter === "all") {
        statusText.textContent = `${answeredCount}/${all.length} (${pct}%)`;
      } else {
        const secName = this.getActiveFilterName().split("(")[0].trim();
        statusText.textContent = `${secName}: ${filterAnsweredCount}/${filtered.length} (${filterPct}%)`;
      }
    }

    const progressBar = document.getElementById("pallet-progress-bar");
    if (progressBar) {
      progressBar.style.width = `${this.activeFilter === "all" ? pct : filterPct}%`;
    }

    // Nhóm câu hỏi theo section để không bị rối mắt
    const session = this.getSessionData(this.currentSessionId);

    // Nếu đang filter 'starred', chỉ hiển thị các câu đã lưu trong pallet
    if (this.activeFilter === "starred") {
      const reviewIds = this.starredReviewIds !== undefined ? this.starredReviewIds : starredList;
      const starredQuestions = all.filter(q => reviewIds.includes(q.id));
      const titleDiv = document.createElement("div");
      titleDiv.className = "pallet-section-title";
      titleDiv.textContent = `⭐ Đã lưu / Ôn lại (${starredQuestions.length})`;
      grid.appendChild(titleDiv);

      starredQuestions.forEach((q) => {
        const answered = this.userAnswers[q.id] !== undefined;
        const targetAns = this.getTargetAnswer(q);
        const isCorrect = answered && (this.userAnswers[q.id] === targetAns);
        let itemClass = "pallet-item has-star";

        if (this.currentMode === "practice") {
          if (isCorrect) {
            itemClass += " answered correct";
          } else if (answered) {
            // Câu đã làm và làm sai: Vừa bôi đỏ vừa có dấu sao
            itemClass += " answered wrong";
          }
        } else {
          if (answered) itemClass += " answered";
        }
        if (q.id === this.activeQuestionId) {
          itemClass += " active";
        }
        const div = document.createElement("div");
        div.id = `pallet-item-${q.id}`;
        div.className = itemClass;
        div.textContent = q.id;
        div.title = `Câu ${q.id} - ${q.mondaiName || ""}`;
        div.onclick = () => {
          this.scrollToQuestion(q.id);
        };
        grid.appendChild(div);
      });

      const backBtn = document.createElement("button");
      backBtn.className = "btn btn-primary";
      backBtn.style.cssText = "width: 100%; margin-top: 1rem; justify-content: center; font-size: 0.8rem; font-weight: 700; grid-column: 1 / -1; padding: 0.5rem 0.6rem;";
      backBtn.innerHTML = `<i class="fas fa-arrow-left"></i> Quay lại phần luyện tập`;
      backBtn.onclick = () => this.setFilter("all");
      grid.appendChild(backBtn);
      return;
    }

    const sections = session ? session.sections : [{ id: "all", name: "Câu hỏi", questions: all }];

    sections.forEach((sec) => {
      // Nếu đang filter mục cụ thể, chỉ hiện section đó
      if (this.activeFilter !== "all" && this.activeFilter !== sec.id) return;

      // Tiêu đề section trong pallet
      if (sections.length > 1 && this.activeFilter === "all") {
        const titleDiv = document.createElement("div");
        titleDiv.className = "pallet-section-title";
        titleDiv.textContent = sec.name.split("(")[0];
        grid.appendChild(titleDiv);
      }

      const secQuestions = sec.questions || [];
      secQuestions.forEach((q) => {
        const answered = this.userAnswers[q.id] !== undefined;
        const isStarred = starredList.includes(q.id);
        const targetAns = this.getTargetAnswer(q);
        const isCorrect = answered && (this.userAnswers[q.id] === targetAns);
        const isWrong = answered && !isCorrect;

        let itemClass = "pallet-item";

        if (this.currentMode === "practice") {
          if (isCorrect) {
            itemClass += " answered correct" + (isStarred ? " has-star" : "");
          } else if (isWrong) {
            // Câu đã làm và làm sai: Vừa đánh dấu sao vừa bôi đỏ
            itemClass += " answered wrong has-star";
          } else if (isStarred) {
            // Câu chưa làm nhưng được gắn sao: Chỉ hiện dấu sao, không bôi đỏ
            itemClass += " has-star";
          }
        } else {
          // Exam mode
          if (isStarred) itemClass += " has-star";
          if (answered) itemClass += " answered";
        }

        if (q.id === this.activeQuestionId) {
          itemClass += " active";
        }
        const div = document.createElement("div");
        div.id = `pallet-item-${q.id}`;
        div.className = itemClass;
        div.textContent = q.id;
        div.title = `Câu ${q.id} - ${q.mondaiName || ""}`;
        div.onclick = () => {
          if (this.activeFilter !== "all" && this.activeFilter !== sec.id) {
            this.setFilter("all");
          }
          this.scrollToQuestion(q.id);
        };
        grid.appendChild(div);
      });
    });
    if (this.activeQuestionId) {
      this.scrollPalletToQuestion(this.activeQuestionId, "auto");
    }
    this.updateMobileBar();
    this.updateFloatingPalletBtn();
    const modal = document.getElementById("mobile-pallet-modal");
    if (modal && modal.style.display !== "none") {
      this.renderMobilePallet();
    }
  }

  // SỬA LỖI TÍNH ĐIỂM: Phân loại theo mondai thực tế thay vì hardcode sectionId
  submitExam() {
    this.stopTimer();
    const all = this.getAllQuestions();
    let correctCount = 0;

    let mojiScore = { correct: 0, total: 0 };
    let bunpouScore = { correct: 0, total: 0 };
    let dokkaiScore = { correct: 0, total: 0 };
    let choukaiScore = { correct: 0, total: 0 };

    all.forEach((q) => {
      const targetAns = this.getTargetAnswer(q);
      const isRight = this.userAnswers[q.id] === targetAns;
      if (isRight) {
        correctCount++;
        // Tự động bỏ dấu sao nếu câu này đã làm đúng trong bài thi
        this.removeBookmark(q.id, false);
        this.removeWrongQuestion(q.id);
      } else {
        // Tự động tích sao nếu câu hỏi trả lời sai hoặc chưa làm
        this.addBookmark(q.id, false);
        this.addWrongQuestion(q.id);
      }

      // Chuẩn JLPT: Phân chia theo Mondai chính thức
      const m = q.mondai || 1;
      if (q.isChoukai || q.sectionId === "choukai") {
        // Choukai (Nghe hiểu)
        choukaiScore.total++;
        if (isRight) choukaiScore.correct++;
      } else if (m <= 6) {
        // Mondai 1 - 6: Moji-Goi (Từ vựng & Chữ Hán)
        mojiScore.total++;
        if (isRight) mojiScore.correct++;
      } else if (m >= 7 && m <= 9) {
        // Mondai 7 - 9: Bunpou (Ngữ pháp & Dấu sao)
        bunpouScore.total++;
        if (isRight) bunpouScore.correct++;
      } else if (m >= 10) {
        // Mondai 10 - 14: Dokkai (Đọc hiểu)
        dokkaiScore.total++;
        if (isRight) dokkaiScore.correct++;
      }
    });

    // Lưu kết quả làm bài
    this.history[this.currentSessionId] = {
      completed: true,
      score: correctCount,
      total: all.length,
      date: new Date().toLocaleDateString("vi-VN")
    };
    localStorage.setItem("jlpt_n2_history", JSON.stringify(this.history));

    // Xóa draft sau khi đã nộp bài chính thức
    localStorage.removeItem(`jlpt_draft_${this.currentSessionId}`);

    // Hiển thị modal kết quả
    document.getElementById("res-score-num").textContent = correctCount;
    document.getElementById("res-score-total").textContent = `/ ${all.length}`;

    // Quy đổi sang thang điểm chuẩn JLPT N2 (Thang điểm 60 cho mỗi phần)
    const langTotal = mojiScore.total + bunpouScore.total;
    const langCorrect = mojiScore.correct + bunpouScore.correct;
    const langScaled = langTotal > 0 ? Math.round((langCorrect / langTotal) * 60) : 0;

    const dokkaiTotal = dokkaiScore.total;
    const dokkaiCorrect = dokkaiScore.correct;
    const dokkaiScaled = dokkaiTotal > 0 ? Math.round((dokkaiCorrect / dokkaiTotal) * 60) : 0;

    const choukaiTotal = choukaiScore.total;
    const choukaiCorrect = choukaiScore.correct;
    const choukaiScaled = choukaiTotal > 0 ? Math.round((choukaiCorrect / choukaiTotal) * 60) : 0;

    const hasLangFailed = langScaled < 19;
    const hasDokkaiFailed = dokkaiScaled < 19;
    const hasChoukaiFailed = choukaiTotal > 0 && choukaiScaled < 19;
    const hasLiệt = hasLangFailed || hasDokkaiFailed || hasChoukaiFailed;

    const hasChoukai = choukaiTotal > 0;
    const totalScaled = langScaled + dokkaiScaled + (hasChoukai ? choukaiScaled : 0);
    const maxScaled = hasChoukai ? 180 : 120;
    const passThreshold = hasChoukai ? 90 : 60;
    const isPass = totalScaled >= passThreshold;

    const pct = all.length > 0 ? Math.round((correctCount / all.length) * 100) : 0;
    
    let passHTML = "";
    if (hasLiệt) {
      passHTML = `
        <div class="fail-warning-box">
          <i class="fas fa-exclamation-triangle" style="font-size: 1.4rem;"></i>
          <div>
            <b>CẢNH BÁO NGUY CƠ ĐIỂM LIỆT N2 (&lt; 19/60):</b><br>
            ${hasLangFailed ? `• Kiến thức ngôn ngữ đạt ${langScaled}/60 (Dưới 19 điểm)<br>` : ""}
            ${hasDokkaiFailed ? `• Đọc hiểu đạt ${dokkaiScaled}/60 (Dưới 19 điểm liệt)<br>` : ""}
            ${hasChoukaiFailed ? `• Nghe hiểu đạt ${choukaiScaled}/60 (Dưới 19 điểm liệt)<br>` : ""}
            <i>Quy chế JLPT: Bất kỳ phần nào dưới 19 điểm đều trượt dù tổng điểm cao!</i>
          </div>
        </div>
      `;
      document.getElementById("res-pass-status").innerHTML = `<span style="color: var(--error);">⚠️ NGUY CƠ DÍNH ĐIỂM LIỆT (${pct}%)</span>`;
    } else {
      passHTML = `
        <div class="pass-success-box">
          <i class="fas fa-check-circle" style="font-size: 1.4rem;"></i>
          <div>
            <b>AN TOÀN ĐIỂM LIỆT (${hasChoukai ? "Cả 3 phần" : "Cả 2 phần"} đều &ge; 19/60 điểm)</b><br>
            Ước tính điểm: <b>${totalScaled}/${maxScaled} điểm</b> ${isPass ? "(Tỷ lệ đạt chuẩn đỗ N2)" : "(Cần tăng thêm điểm)"}
          </div>
        </div>
      `;
      document.getElementById("res-pass-status").innerHTML = `<span style="color: var(--success);">${isPass ? "🎉 AN TOÀN - ĐẠT CHUẨN ĐỖ" : "Cần cố gắng thêm"} (${pct}%)</span>`;
    }

    document.getElementById("res-breakdown").innerHTML = `
      <div class="breakdown-item">
        <b>文字・語彙 (Mondai 1-6):</b> ${mojiScore.correct}/${mojiScore.total} câu
      </div>
      <div class="breakdown-item">
        <b>文法 (Mondai 7-9):</b> ${bunpouScore.correct}/${bunpouScore.total} câu
      </div>
      <div class="breakdown-item">
        <b>読解 (Mondai 10-14):</b> ${dokkaiScore.correct}/${dokkaiScore.total} câu
      </div>
      ${hasChoukai ? `
      <div class="breakdown-item">
        <b>聴解 (Nghe hiểu):</b> ${choukaiScore.correct}/${choukaiScore.total} câu
      </div>
      ` : ""}
      <div class="breakdown-item">
        <b>Tổng kết số câu:</b> ${correctCount}/${all.length} câu (${pct}%)
      </div>
    `;

    // Bổ sung container điểm chuẩn JLPT
    const modalContent = document.getElementById("res-breakdown");
    const jlptBox = document.createElement("div");
    jlptBox.className = "jlpt-score-container";
    jlptBox.style.gridColumn = "1 / -1";
    jlptBox.innerHTML = `
      <div style="font-weight: 700; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
        <i class="fas fa-chart-line"></i> MÔ PHỎNG ĐIỂM THI THẬT JLPT (CHUẨN THANG 60)
      </div>
      <div class="jlpt-score-row">
        <span>言語知識 (Từ vựng & Ngữ pháp)</span>
        <span style="font-weight: 700; color: ${hasLangFailed ? "var(--error)" : "var(--primary)"};">${langScaled} / 60 điểm ${hasLangFailed ? "⚠️ Liệt" : "✓"}</span>
      </div>
      <div class="jlpt-score-row">
        <span>読解 (Đọc hiểu Đoản - Trung - Trường văn)</span>
        <span style="font-weight: 700; color: ${hasDokkaiFailed ? "var(--error)" : "var(--primary)"};">${dokkaiScaled} / 60 điểm ${hasDokkaiFailed ? "⚠️ Liệt" : "✓"}</span>
      </div>
      ${hasChoukai ? `
      <div class="jlpt-score-row">
        <span>聴解 (Nghe hiểu Choukai)</span>
        <span style="font-weight: 700; color: ${hasChoukaiFailed ? "var(--error)" : "var(--primary)"};">${choukaiScaled} / 60 điểm ${hasChoukaiFailed ? "⚠️ Liệt" : "✓"}</span>
      </div>
      ` : ""}
      <div class="jlpt-score-row">
        <span>${hasChoukai ? "Tổng Điểm Toàn Diện JLPT" : "Tổng Điểm Phần Chữ (Chưa tính Nghe)"}</span>
        <span style="font-weight: 800; color: var(--text);">${totalScaled} / ${maxScaled} điểm</span>
      </div>
      ${passHTML}
    `;
    modalContent.appendChild(jlptBox);

    document.getElementById("result-modal").style.display = "flex";

    // Chuyển sang chế độ practice để xem giải thích
    this.currentMode = "practice";
    this.isExamSubmitted = true;
    const btnPractice = document.getElementById("btn-mode-practice");
    if (btnPractice) btnPractice.classList.add("active");
    const btnExam = document.getElementById("btn-mode-exam");
    if (btnExam) btnExam.classList.remove("active");
    const timerBox = document.getElementById("timer-box");
    if (timerBox) timerBox.style.display = "none";
    localStorage.setItem("jlpt_n2_bookmarks", JSON.stringify(this.bookmarks));
    this.renderQuestions();
    this.updatePallet();
    this.renderFilterTabs();
  }

  getWrongQuestions() {
    const all = this.getAllQuestions();
    return all.filter((q) => {
      const ans = this.userAnswers[q.id];
      if (ans === undefined) return false; // Chưa làm thì KHÔNG PHẢI là câu sai
      const targetAns = this.getTargetAnswer(q);
      return ans !== targetAns;
    });
  }

  filterWrongQuestions() {
    const wrongQuestions = this.getWrongQuestions();

    if (wrongQuestions.length === 0) {
      alert("Tuyệt vời! Bạn chưa có câu nào làm sai trong buổi này.");
      return;
    }

    // Đưa về chế độ xem tất cả nếu đang ở bộ lọc chuyên đề khác để câu hỏi luôn hiện diện trên DOM
    if (this.activeFilter !== "all" && this.activeFilter !== "starred") {
      this.setFilter("all");
    }

    // Tìm câu sai tiếp theo (chu trình qua các câu sai nếu nhấn nhiều lần)
    let targetQ = wrongQuestions[0];
    if (this.activeQuestionId) {
      const curIdx = wrongQuestions.findIndex((q) => q.id === this.activeQuestionId);
      if (curIdx !== -1 && curIdx < wrongQuestions.length - 1) {
        targetQ = wrongQuestions[curIdx + 1];
      } else if (curIdx === -1) {
        const nextQ = wrongQuestions.find((q) => q.id > this.activeQuestionId);
        if (nextQ) targetQ = nextQ;
      }
    }

    // Cuộn mượt và làm nổi bật câu sai
    this.scrollToQuestion(targetQ.id);

    const card = document.getElementById(`q-card-${targetQ.id}`);
    if (card) {
      card.classList.remove("target-wrong-pulse");
      void card.offsetWidth;
      card.classList.add("target-wrong-pulse");
      setTimeout(() => {
        if (card) card.classList.remove("target-wrong-pulse");
      }, 3000);
    }
  }
}

// Khởi chạy ứng dụng
window.app = new JLPTApp();
