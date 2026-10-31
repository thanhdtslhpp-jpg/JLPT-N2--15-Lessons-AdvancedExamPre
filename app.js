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
    this.splitReadingMode = localStorage.getItem("jlpt_split_reading") === "true";
    this.showFurigana = localStorage.getItem("jlpt_show_furigana") !== "false";
    this.highlights = JSON.parse(localStorage.getItem("jlpt_highlights") || "{}");
    this.dictCache = JSON.parse(localStorage.getItem("jlpt_dict_cache") || "{}");
    this.audioListened = JSON.parse(localStorage.getItem("jlpt_audio_listened") || "{}");
    this.audioSpeeds = {};
    this.choukaiPeek = {};
    this.isExamSubmitted = false;
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

    this.init();
  }

  cleanSharedDraftsOnce() {
    // Đã hoàn tất dọn dẹp các bản nháp mẫu cũ, tuyệt đối không can thiệp hay xóa dữ liệu làm bài của người dùng
  }

  syncFromDisk() {
    if (window.JLPT_SYNC_DATA && typeof window.JLPT_SYNC_DATA === "object") {
      try {
        // Chỉ đồng bộ bộ đệm từ điển (dict cache) để hỗ trợ tra từ offline nhanh
        // Tuyệt đối không nạp draft làm dở hay lịch sử cá nhân để tránh làm phiền người dùng mới
        if (window.JLPT_SYNC_DATA.jlpt_dict_cache) {
          const currentVal = localStorage.getItem("jlpt_dict_cache");
          if (!currentVal || currentVal === "{}") {
            localStorage.setItem("jlpt_dict_cache", window.JLPT_SYNC_DATA.jlpt_dict_cache);
          }
        }
      } catch (err) {
        console.warn("[JLPT Sync] Loi khi dong bo user_data.js:", err);
      }
    }
  }

  init() {
    this.setupTheme();
    this.setupFurigana();
    this.renderDashboard();
    this.bindEvents();
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
    document.getElementById("btn-dashboard").addEventListener("click", () => this.showDashboard());
    const btnBack = document.getElementById("btn-back-dashboard");
    if (btnBack) btnBack.addEventListener("click", () => this.showDashboard());

    document.getElementById("theme-toggle").addEventListener("click", () => this.toggleTheme());

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
      }
    });

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
      const card = e.target.closest(".question-card");
      if (card && card.id) {
        const qId = parseInt(card.id.replace("q-card-", ""));
        if (!isNaN(qId)) {
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

  isQuestionBookmarked(qId) {
    const sessionKey = String(this.currentSessionId);
    return this.bookmarks[sessionKey] && this.bookmarks[sessionKey].includes(qId);
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

  showDashboard() {
    this.stopTimer();
    document.getElementById("view-dashboard").style.display = "block";
    document.getElementById("view-practice").style.display = "none";
    const floatBtn = document.getElementById("btn-floating-pallet");
    if (floatBtn) floatBtn.style.display = "none";
    this.renderDashboard();
  }

  loadSession(sessionId) {
    this.currentSessionId = sessionId;
    const sessionData = window.JLPT_DATA ? window.JLPT_DATA[sessionId] : null;

    if (!sessionData) {
      const readySessions = (window.JLPT_SYLLABUS || [])
        .filter(s => s.ready || (window.JLPT_DATA && !!window.JLPT_DATA[s.id]))
        .map(s => `Buổi ${s.id}`)
        .join(", ");
      alert(`Buổi ${sessionId} đang được trích xuất dữ liệu. Vui lòng chọn các Buổi đã sẵn sàng (${readySessions || "Buổi 1, 5, 6"})!`);
      return;
    }

    document.getElementById("view-dashboard").style.display = "none";
    document.getElementById("view-practice").style.display = "block";
    document.getElementById("current-session-title").textContent = sessionData.title;

    // Restore draft answers from LocalStorage
    this.loadDraftAnswers(sessionId);

    this.activeFilter = "all";
    this.starredReviewIds = undefined;
    this.activeQuestionId = null;

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

      const isDataAvailable = window.JLPT_DATA && !!window.JLPT_DATA[item.id];
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

  clearDraft(sessionId) {
    if (confirm(`Bạn có chắc chắn muốn xóa bản nháp làm dở của Buổi ${sessionId} để làm lại từ đầu?`)) {
      localStorage.removeItem(`jlpt_draft_${sessionId}`);
      if (this.currentSessionId === sessionId) {
        this.userAnswers = {};
        this.starAnswers = {};
      }
      this.renderDashboard();
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
    const session = window.JLPT_DATA ? window.JLPT_DATA[this.currentSessionId] : null;
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
      const session = window.JLPT_DATA ? window.JLPT_DATA[this.currentSessionId] : null;
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
        filterTabsContainer.innerHTML = tabsHtml;
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
      const targetAns = q.isStarQuestion ? q.correctStarOption : q.correctAnswer;
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
    const session = window.JLPT_DATA ? window.JLPT_DATA[this.currentSessionId] : null;
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
    const session = window.JLPT_DATA ? window.JLPT_DATA[this.currentSessionId] : null;
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
    if (q.passage && q.passage.trim().length > 0) {
      return { passage: q.passage, isShared: false, sourceId: q.id };
    }
    // Nếu câu hỏi đọc hiểu (Mondai >= 10) bị thiếu bài đọc, tìm ngược về câu trước cùng Mondai
    if (q.mondai >= 10 && allQuestions) {
      const currIdx = allQuestions.findIndex(x => x.id === q.id);
      if (currIdx > 0) {
        for (let i = currIdx - 1; i >= 0; i--) {
          const prev = allQuestions[i];
          if (prev.mondai === q.mondai && prev.passage && prev.passage.trim().length > 0) {
            return { passage: prev.passage, isShared: true, sourceId: prev.id };
          }
        }
      }
    }
    return { passage: null, isShared: false };
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
      card.className = "question-card" + (this.activeQuestionId === q.id ? " active-target" : "");
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

    // Dokkai passage handling
    const passageInfo = this.getQuestionPassage(q, this.getAllQuestions());
    let dokkaiHTML = "";
    if (passageInfo.passage) {
      const fontClass = this.fontSizeLevel === "lg" ? "font-lg" : (this.fontSizeLevel === "xl" ? "font-xl" : "");
      const splitClass = this.splitReadingMode ? "split-active" : "";
      const passageKey = `${this.currentSessionId}_p_${passageInfo.sourceId || q.id}`;
      let passageBody = (this.highlights && this.highlights[passageKey]) ? this.highlights[passageKey] : passageInfo.passage;
      if (!passageBody.includes("dokkai-email-frame") && !passageBody.includes("dokkai-para")) {
        passageBody = this.formatDokkaiPassage(passageBody);
      }

      dokkaiHTML = `
        <div class="dokkai-box ${splitClass}">
          <div class="dokkai-box-header">
            <div class="dokkai-badge ${passageInfo.isShared ? "shared" : ""}">
              <i class="fas fa-book-open"></i> 
              ${passageInfo.isShared ? `Văn bản đọc hiểu (Dùng chung với Câu ${passageInfo.sourceId})` : `Văn bản đọc hiểu`}
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
      `;
    }

    // Choukai Question Text & Header simulation
    let choukaiHeaderHTML = "";
    if (isChoukai) {
      if (canShowFeedback) {
        choukaiHeaderHTML = `
          <div class="choukai-revealed-header">
            <div class="choukai-q-tag"><i class="fas fa-question-circle"></i> Câu hỏi trong bài nghe (Đã mở khóa):</div>
            <div class="choukai-q-text">${q.questionText}</div>
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
                <b>${q.questionText}</b>
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
    // Chỉ lấy và hiển thị bản dịch bài đọc khi câu hỏi thực sự là bài Đọc hiểu (có bài đọc đi kèm hoặc Mondai 10 - 14)
    const isDokkaiQuestion = !!(passageInfo && passageInfo.passage) || !!q.passage || (q.mondai >= 10 && q.mondai <= 14);
    let trans = null;
    if (isDokkaiQuestion) {
      const transKey = `${this.currentSessionId}_${passageInfo.sourceId || q.id}`;
      trans = (window.JLPT_PASSAGE_TRANSLATIONS && window.JLPT_PASSAGE_TRANSLATIONS[transKey])
              || q.passageTranslation;
    }

    if (showFeedback && (q.explanation || (trans && trans.trim()))) {
      const statusText = isCorrect 
        ? (isBookmarked ? "✓ Chính xác (Đã tự động bỏ dấu sao ⭐)" : "✓ Chính xác") 
        : `✗ Chưa đúng (Đáp án: ${q.correctAnswer} - Đã tự động lưu ⭐)`;

      // Dokkai Full Passage Translation
      let translationHTML = "";
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

      explanationHTML = `
        <div class="explanation-box">
          <div class="explanation-title">
            <span>💡 Giải thích chi tiết & Script hội thoại:</span>
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

    // Navigation bar (Trước / Tiếp)
    const hasPrev = indexInFiltered > 0;
    const hasNext = indexInFiltered < filteredList.length - 1;
    const prevId = hasPrev ? filteredList[indexInFiltered - 1].id : null;
    const nextId = hasNext ? filteredList[indexInFiltered + 1].id : null;

    const navHTML = `
      <div class="q-nav-bar">
        <button class="q-nav-btn" onclick="app.scrollToQuestion(${prevId})" ${!hasPrev ? "disabled" : ""}>
          <i class="fas fa-arrow-left"></i> Câu trước
        </button>
        <span style="font-size: 0.8rem; color: var(--text-sub);">Câu ${indexInFiltered + 1} / ${filteredList.length}</span>
        <button class="q-nav-btn" onclick="app.scrollToQuestion(${nextId})" ${!hasNext ? "disabled" : ""}>
          Câu tiếp <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    `;

    return `
      <div class="q-header">
        <span class="q-mondai-badge">${q.mondaiName || "Mondai " + q.mondai}</span>
        <span class="q-index">Câu ${q.id}</span>
        <button class="btn-bookmark ${isBookmarked ? "active" : ""}" onclick="app.toggleBookmark(${q.id})" title="${isBookmarked ? "Bỏ đánh dấu" : "Đánh dấu câu này"}">
          <i class="${isBookmarked ? "fas" : "far"} fa-star"></i>
        </button>
      </div>
      ${dokkaiHTML}
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
    const before = order.slice(0, starIdx);
    const star = order[starIdx];
    const after = order.slice(starIdx + 1);

    const parts = [];
    if (before.length > 0) {
      parts.push(`(${before.join(" - ")})`);
    }
    parts.push(`⭐ (${star})`);
    if (after.length > 0) {
      parts.push(`(${after.join(" - ")})`);
    }
    return parts.join(" - ");
  }

  getStarTranslation(sessionNum, qId) {
    const key = `${sessionNum}_${qId}`;
    if (window.JLPT_STAR_TRANSLATIONS && window.JLPT_STAR_TRANSLATIONS[key]) {
      return window.JLPT_STAR_TRANSLATIONS[key];
    }
    return "";
  }

  formatStarExplanationHTML(q) {
    if (!q) return "";
    const rawExp = q.explanation || "";
    const order = q.correctOrder || q.sentenceOrder || [];

    let starPos = q.starPositionIndex;
    if (!starPos && (q.question || q.sentence)) {
      const text = q.question || q.sentence;
      const blanks = text.match(/(?:_{2,}|＿|__★__|<u>★<\/u>|★)/g);
      if (blanks && blanks.length >= 4) {
        const sIdx = blanks.findIndex(b => b.includes("★"));
        if (sIdx !== -1) starPos = sIdx + 1;
      }
    }
    if (!starPos) starPos = 3;

    const formattedOrder = this.formatStarOrder(order, starPos);

    let trans = this.getStarTranslation(this.currentSessionId, q.id);
    if (!trans && q.translation) {
      trans = q.translation;
    }
    if (!trans) {
      const clean = rawExp.replace(/<[^>]+>/g, " ");
      const m = clean.match(/(?:•\s*Dịch|Dịch nghĩa|Dịch câu|Dịch|Ý nghĩa)\s*:\s*([^<]+?)(?=(?:•|Vị trí ngôi sao|Đáp án|$))/i);
      if (m) trans = m[1].trim();
    }

    let lines = rawExp.split(/<br\s*\/?>|\n/i).map(l => l.trim()).filter(Boolean);
    let remainingLines = [];

    for (let line of lines) {
      const cleanLine = line.replace(/<[^>]+>/g, "").trim();
      if (/^(?:•\s*)?(?:Thứ tự câu đúng|Thứ tự sắp xếp đúng|Thứ tự đúng|Cấu trúc ghép câu|Ghép câu)\s*:/i.test(cleanLine)) {
        continue;
      }
      if (/^(?:•\s*)?(?:Câu hoàn chỉnh)\s*:/i.test(cleanLine)) {
        continue;
      }
      if (/^(?:•\s*)?(?:Dịch nghĩa|Dịch câu|Dịch|Ý nghĩa)\s*:/i.test(cleanLine)) {
        if (!trans) {
          const m = cleanLine.match(/^(?:•\s*)?(?:Dịch nghĩa|Dịch câu|Dịch|Ý nghĩa)\s*:\s*(.+)$/i);
          if (m) trans = m[1].trim();
        }
        continue;
      }
      remainingLines.push(line);
    }

    let html = "";
    if (formattedOrder) {
      html += `<div style="margin-bottom: 0.5rem; font-size: 1rem;"><b>Thứ tự câu đúng:</b> <span class="star-order-badge" style="color: #f59e0b; font-weight: 700; font-size: 1.05rem; letter-spacing: 0.5px;">${formattedOrder}</span></div>`;
    }

    if (remainingLines.length > 0) {
      html += `<div>${remainingLines.join("<br>")}</div>`;
    }

    if (trans) {
      html += `
        <div class="star-trans-box" style="margin-top: 0.65rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.18); font-size: 0.95rem; line-height: 1.55;">
          <b style="color: var(--primary-light, #93c5fd);">Dịch:</b> <span style="color: var(--text-main);">${trans}</span>
        </div>
      `;
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
    let starPos = q.starPositionIndex;
    if (!starPos && q.question) {
      const blanks = q.question.match(/(?:_{2,}|＿|__★__|<u>★<\/u>|★)/g);
      if (blanks && blanks.length >= 4) {
        const sIdx = blanks.findIndex(b => b.includes("★"));
        if (sIdx !== -1) starPos = sIdx + 1;
      }
    }
    if (!starPos) starPos = 3;

    // Detect beforeText / afterText
    let beforeText = q.beforeText;
    let afterText = q.afterText;
    if (beforeText === undefined && q.question) {
      const match = q.question.match(/^(.*?)(?:[\s　]*(?:_{2,}|＿|__★__|<u>★<\/u>|★)[\s　]*){4}(.*)$/s);
      if (match) {
        beforeText = match[1];
        afterText = match[2];
      } else {
        beforeText = q.question;
        afterText = "";
      }
    }

    const starChosenId = currentSlots[starPos - 1]; // id của mảnh nằm ở vị trí sao
    const targetCorrectStar = q.correctStarOption || q.correctAnswer;
    const isCorrect = starChosenId === targetCorrectStar;
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
      const statusText = isCorrect 
        ? (isBookmarked ? "✓ Đúng vị trí dấu ★ (Đã tự động bỏ dấu sao ⭐)" : "✓ Đúng vị trí dấu ★") 
        : "✗ Chưa đúng vị trí dấu ★ (Đã tự động lưu ⭐)";
      explanationHTML = `
        <div class="explanation-box">
          <div class="explanation-title">
            <span>💡 Giải thích chi tiết sắp xếp câu:</span>
            <span style="margin-left: auto; font-weight: 700; color: ${isCorrect ? "var(--success)" : "var(--error)"};">
              ${statusText}
            </span>
          </div>
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
        <button class="q-nav-btn" onclick="app.scrollToQuestion(${prevId})" ${!hasPrev ? "disabled" : ""}>
          <i class="fas fa-arrow-left"></i> Câu trước
        </button>
        <span style="font-size: 0.8rem; color: var(--text-sub);">Câu ${indexInFiltered + 1} / ${filteredList.length}</span>
        <button class="q-nav-btn" onclick="app.scrollToQuestion(${nextId})" ${!hasNext ? "disabled" : ""}>
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
      <div style="font-size: 0.88rem; margin-bottom: 0.6rem; color: var(--text-sub);">
        ${helperText}
      </div>
      <div class="star-fragments-pool" 
           data-qid="${q.id}"
           ondragover="app.handleStarDragOver(event)"
           ondragenter="app.handleStarDragEnter(event)"
           ondragleave="app.handleStarDragLeave(event)"
           ondrop="app.handleStarDropToPool(event, ${q.id})">
        ${chipsHTML}
      </div>
      <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; align-items: center;">
        <button class="btn btn-outline" style="font-size: 0.8rem; padding: 0.35rem 0.7rem;" onclick="app.resetStarQuestion(${q.id})">
          <i class="fas fa-undo"></i> Xếp lại từ đầu
        </button>
        ${placedCount > 0 ? `<span style="font-size: 0.8rem; color: var(--text-sub);">Đã xếp: ${placedCount}/4 từ</span>` : ""}
      </div>
      ${explanationHTML}
      ${navHTML}
    `;
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
      let starPos = (q && q.starPositionIndex) ? q.starPositionIndex : null;
      if (!starPos && q && q.question) {
        const blanks = q.question.match(/(?:_{2,}|＿|__★__|<u>★<\/u>|★)/g);
        if (blanks && blanks.length >= 4) {
          const sIdx = blanks.findIndex(b => b.includes("★"));
          if (sIdx !== -1) starPos = sIdx + 1;
        }
      }
      if (!starPos) starPos = 3;
      const starFragId = slots[starPos - 1];
      this.userAnswers[qId] = starFragId;

      if (q && this.currentMode === "practice") {
        const targetAns = q.correctStarOption || q.correctAnswer;
        const isCorrect = (starFragId === targetAns);
        if (isCorrect) {
          this.removeBookmark(qId, false);
          this.removeWrongQuestion(qId);
        } else {
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
    this.setActiveQuestion(qId, false);
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
    const q = this.getAllQuestions().find(x => x.id === qId);
    if (q && this.currentMode === "practice") {
      const targetAns = q.isStarQuestion ? q.correctStarOption : q.correctAnswer;
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
    this.renderSingleQuestion(qId);
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

  setActiveQuestion(qId, shouldScroll = false) {
    this.activeQuestionId = qId;
    document.querySelectorAll(".question-card").forEach((card) => {
      card.classList.toggle("active-target", card.id === `q-card-${qId}`);
    });
    if (shouldScroll) {
      const el = document.getElementById(`q-card-${qId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    this.updateMobileBar();
  }

  scrollToQuestion(qId) {
    if (!qId) return;
    this.setActiveQuestion(qId, true);
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
        // Với câu dấu sao: phím 1..4 tương ứng với fragment id 1..4
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
    grid.innerHTML = "";

    const all = this.getAllQuestions();
    let answeredCount = 0;
    let wrongCount = 0;

    // Tính tổng số câu đã làm và câu sai
    all.forEach((q) => {
      const isAnswered = this.userAnswers[q.id] !== undefined;
      if (isAnswered) {
        answeredCount++;
        const targetAns = q.isStarQuestion ? q.correctStarOption : q.correctAnswer;
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
    const session = window.JLPT_DATA ? window.JLPT_DATA[this.currentSessionId] : null;

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
        const targetAns = q.isStarQuestion ? q.correctStarOption : q.correctAnswer;
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
        const div = document.createElement("div");
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
        const targetAns = q.isStarQuestion ? q.correctStarOption : q.correctAnswer;
        const isCorrect = answered && (this.userAnswers[q.id] === targetAns);
        const isWrong = answered && !isCorrect;

        let itemClass = "pallet-item";

        if (this.currentMode === "practice") {
          if (isCorrect) {
            itemClass += " answered correct";
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

        const div = document.createElement("div");
        div.className = itemClass;
        div.textContent = q.id;
        div.title = `Câu ${q.id} - ${q.mondaiName || ""}`;
        div.onclick = () => {
          // Nếu câu hỏi này đang bị ẩn do filter, chuyển về 'all'
          if (this.activeFilter !== "all" && this.activeFilter !== sec.id) {
            this.setFilter("all");
          }
          this.scrollToQuestion(q.id);
        };
        grid.appendChild(div);
      });
    });
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
      const targetAns = q.isStarQuestion ? q.correctStarOption : q.correctAnswer;
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

  filterWrongQuestions() {
    const all = this.getAllQuestions();
    const wrongCards = [];

    all.forEach((q) => {
      const targetAns = q.isStarQuestion ? q.correctStarOption : q.correctAnswer;
      const isRight = this.userAnswers[q.id] === targetAns;
      const card = document.getElementById(`q-card-${q.id}`);
      if (card) {
        if (!isRight) {
          card.style.display = "block";
          wrongCards.push(card);
        } else {
          card.style.display = "none";
        }
      }
    });

    if (wrongCards.length > 0) {
      wrongCards[0].scrollIntoView({ behavior: "smooth" });
    } else {
      alert("Chúc mừng! Bạn đã làm đúng tất cả các câu!");
      this.renderQuestions();
    }
  }
}

// Khởi chạy ứng dụng
window.app = new JLPTApp();
