document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("#shell .sheet-overlay").forEach((overlay) => {
    document.body.appendChild(overlay);
  });
  document.body.classList.add("sheet-system-ready");

  const actionOverlays = [
    "txActionOverlay",
    "shodMemberActionOverlay",
    "shodPaymentDetailOverlay",
    "shodMemberDetailOverlay",
  ];

  actionOverlays.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("sheet-action");
  });

  // Universal sheet backdrop close:
  // clicking the overlay/backdrop closes the sheet, while clicks inside
  // the actual sheet content are ignored.
  document.querySelectorAll("body > .sheet-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target !== overlay) return;

      overlay.classList.add("hidden");

      if (overlay.id === "txActionOverlay") {
        state.actionNo = null;
      }

      if (overlay.id === "shodMemberActionOverlay") {
        if (typeof closeShodMemberActionSheet === "function") {
          closeShodMemberActionSheet();
        }
      }
    });
  });

  initTheme();

  if ($("btnTheme")) {
    $("btnTheme").addEventListener("click", () =>
      applyTheme(currentTheme() === "dark" ? "light" : "dark"),
    );
  }

  if ($("themeLightBtn"))
    $("themeLightBtn").addEventListener("click", () => applyTheme("light"));

  if ($("themeDarkBtn"))
    $("themeDarkBtn").addEventListener("click", () => applyTheme("dark"));

  if ($("btnRefresh")) {
    $("btnRefresh").addEventListener("click", () => {
      $("btnRefresh").classList.add("spin");
      loadData().finally(() =>
        setTimeout(() => $("btnRefresh").classList.remove("spin"), 400),
      );
    });
  }

  if ($("searchInput"))
    $("searchInput").addEventListener("input", applyFilters);

  if ($("btnSeeAll"))
    $("btnSeeAll").addEventListener("click", () => switchTab("history"));

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  if ($("btnPrint")) {
    $("btnPrint").addEventListener("click", () => {
      const monthKey = state.selectedMonth;
      const scope = computeScope(monthKey);

      if ($("printPeriod"))
        $("printPeriod").textContent = "Periode: " + getMonthLabel(monthKey);

      buildPrintTable(scope.list);

      if ($("printTotalDebet"))
        $("printTotalDebet").textContent = fmtRp(scope.debet);

      if ($("printTotalKredit"))
        $("printTotalKredit").textContent = fmtRp(scope.kredit);

      if ($("printTotalSaldo"))
        $("printTotalSaldo").textContent = fmtRp(scope.akhir);

      fitPrintToOnePage();
      window.print();
    });
  }

  window.addEventListener("afterprint", () => {
    document.documentElement.style.setProperty("--print-scale", "1");
  });

  if ($("btnLogout")) {
    $("btnLogout").addEventListener("click", () => {
      $("logoutConfirmOverlay")?.classList.remove("hidden");
    });
  }

  if ($("btnLogoutCancel")) {
    $("btnLogoutCancel").addEventListener("click", () => {
      $("logoutConfirmOverlay")?.classList.add("hidden");
    });
  }

  if ($("logoutConfirmOverlay")) {
    $("logoutConfirmOverlay").addEventListener("click", (e) => {
      if (e.target === $("logoutConfirmOverlay")) {
        $("logoutConfirmOverlay")?.classList.add("hidden");
      }
    });
  }

  if ($("btnLogoutConfirm")) {
    $("btnLogoutConfirm").addEventListener("click", async () => {
      const btn = $("btnLogoutConfirm");
      btn.disabled = true;
      btn.textContent = "Keluar…";

      try {
        const session = getSession();
        if (session && session.token) {
          await apiPost({
            action: "logout",
            token: session.token,
          }).catch(() => {});
        }
      } catch (e) {}

      clearSession();
      document.documentElement.classList.remove("authenticated");
      document.documentElement.classList.add("auth-locked");
      $("shell")?.classList.add("hidden");
      $("authScreen")?.classList.remove("hidden");
      $("authForm")?.reset();
      $("logoutConfirmOverlay")?.classList.add("hidden");
      showToast("Berhasil keluar.");

      btn.disabled = false;
      btn.textContent = "Keluar";
    });
  }

  if ($("segDebet"))
    $("segDebet").addEventListener("click", () => setTxJenis("debet"));

  if ($("segKredit"))
    $("segKredit").addEventListener("click", () => setTxJenis("kredit"));

  if ($("fabAdd")) {
    $("fabAdd").addEventListener("click", () => {
      if (state.isAdmin !== true) return;

      if (state.activeTab === "shodaqoh") {
        openShodaqohPaymentForm(null);
        return;
      }

      state.editingNo = null;

      if ($("txSheetTitle")) $("txSheetTitle").textContent = "Tambah Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Simpan";
      $("txError")?.classList.add("hidden");
      $("txForm")?.reset();
      setTxJenis("debet");

      const today = new Date();
      const valueDisplay = document.getElementById("txDateDropdownValue");
      const hiddenInput = document.getElementById("txTanggal");
      if (valueDisplay) valueDisplay.textContent = formatDateDisplay(today);
      if (hiddenInput) hiddenInput.value = formatDateInput(today);
      txDatePickerState.selectedDate = today;
      txDatePickerState.currentMonth = today.getMonth();
      txDatePickerState.currentYear = today.getFullYear();

      const accountDisplay = document.getElementById("txAccountDropdownValue");
      const accountHidden = document.getElementById("txAccount");
      if (accountDisplay) accountDisplay.textContent = "Pilih kategori";
      if (accountHidden) accountHidden.value = "";
      renderTxAccountDropdownMenu();

      $("txOverlay")?.classList.remove("hidden");
    });
  }

  if ($("fabPostToKas")) {
    $("fabPostToKas").addEventListener("click", function () {
      if (typeof postShodaqohToKas === "function") {
        postShodaqohToKas();
      } else {
        showToast("Fungsi posting tidak tersedia.", "error");
      }
    });
  }

  if ($("btnCancelTx")) {
    $("btnCancelTx").addEventListener("click", () => {
      state.editingNo = null;
      $("txOverlay")?.classList.add("hidden");
    });
  }

  if ($("txOverlay")) {
    $("txOverlay").addEventListener("click", (e) => {
      if (e.target === $("txOverlay")) {
        $("txOverlay").classList.add("hidden");
      }
    });
  }

  if ($("txForm")) {
    $("txForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const jumlah = Number($("txJumlah").value);

      if (!jumlah || jumlah <= 0) {
        $("txError").textContent = "Jumlah nominal harus lebih dari 0.";
        $("txError").classList.remove("hidden");
        return;
      }

      if (!isAdminUser()) {
        $("txError").textContent =
          "Hanya admin yang dapat menyimpan transaksi.";
        $("txError").classList.remove("hidden");
        return;
      }

      const session = getSession();

      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        $("txOverlay").classList.add("hidden");
        setAdminUI(false);
        return;
      }

      const isEditing = state.editingNo !== null;

      const tanggal = $("txTanggal").value;
      const account = $("txAccount").value.trim();

      if (!tanggal) {
        $("txError").textContent = "Tanggal wajib dipilih.";
        $("txError").classList.remove("hidden");
        return;
      }

      if (!account) {
        $("txError").textContent = "Account/kategori wajib dipilih.";
        $("txError").classList.remove("hidden");
        return;
      }

      $("btnSubmitTx").disabled = true;
      $("btnSubmitTx").textContent = isEditing ? "Memperbarui…" : "Menyimpan…";

      try {
        const payload = {
          action: isEditing ? "editTransaction" : "addTransaction",
          token: session.token,
          tanggal: tanggal,
          account: account,
          keterangan: $("txKeterangan").value.trim(),
          jenis: state.txJenis,
          jumlah,
        };

        if (isEditing) payload.no = state.editingNo;

        const res = await apiPost(payload);

        if (!res.success) {
          $("txError").textContent =
            res.message || "Gagal menyimpan transaksi.";
          $("txError").classList.remove("hidden");
          return;
        }

        $("txOverlay").classList.add("hidden");
        showToast(
          isEditing
            ? "Transaksi berhasil diperbarui."
            : "Transaksi berhasil ditambahkan.",
        );

        state.editingNo = null;
        await loadData();
      } catch (err) {
        $("txError").textContent =
          "Tidak dapat menghubungi server: " + err.message;
        $("txError").classList.remove("hidden");
      } finally {
        $("btnSubmitTx").disabled = false;
        $("btnSubmitTx").textContent = isEditing ? "Update" : "Simpan";
      }
    });
  }

  function openTxActionSheet(no) {
    const tx = state.transactions.find((t) => String(t.no) === String(no));
    if (!tx) return;

    state.actionNo = tx.no;

    if ($("txActionSubtitle")) {
      $("txActionSubtitle").textContent =
        fmtDateShort(tx.tanggal) + " · " + tx.account;
    }

    $("txActionOverlay")?.classList.remove("hidden");
  }

  function closeTxActionSheet() {
    $("txActionOverlay")?.classList.add("hidden");
  }

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".tx-card-clickable");
    if (!card) return;
    openTxActionSheet(card.dataset.no);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest && e.target.closest(".tx-card-clickable");
    if (!card) return;
    e.preventDefault();
    openTxActionSheet(card.dataset.no);
  });

  if (document.getElementById("btnCopyShodaqohRekap")) {
    document
      .getElementById("btnCopyShodaqohRekap")
      .addEventListener("click", function () {
        if (typeof copyShodaqohRekap === "function") {
          copyShodaqohRekap();
        } else {
          showToast("Fungsi belum tersedia.", "error");
        }
      });
  }

  if ($("btnActionCancel"))
    $("btnActionCancel").addEventListener("click", closeTxActionSheet);


  if ($("btnActionEdit")) {
    $("btnActionEdit").addEventListener("click", () => {
      const no = state.actionNo;
      const tx = state.transactions.find((t) => String(t.no) === String(no));

      closeTxActionSheet();
      if (!tx) return;

      state.editingNo = tx.no;

      if ($("txSheetTitle")) $("txSheetTitle").textContent = "Edit Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Update";
      $("txError")?.classList.add("hidden");

      const dateValue = tx.tanggal;
      const valueDisplay = document.getElementById("txDateDropdownValue");
      const hiddenInput = document.getElementById("txTanggal");
      if (dateValue) {
        const d = new Date(dateValue);
        if (!isNaN(d.getTime())) {
          if (valueDisplay) valueDisplay.textContent = formatDateDisplay(d);
          if (hiddenInput) hiddenInput.value = formatDateInput(d);
          txDatePickerState.selectedDate = d;
          txDatePickerState.currentMonth = d.getMonth();
          txDatePickerState.currentYear = d.getFullYear();
        }
      }

      const accountDisplay = document.getElementById("txAccountDropdownValue");
      const accountHidden = document.getElementById("txAccount");
      if (tx.account) {
        if (accountDisplay) accountDisplay.textContent = tx.account;
        if (accountHidden) accountHidden.value = tx.account;
        renderTxAccountDropdownMenu();
      }

      $("txKeterangan").value = tx.keterangan;
      $("txJumlah").value = tx.debet > 0 ? tx.debet : tx.kredit;

      const jenis = tx.debet > 0 ? "debet" : "kredit";
      setTxJenis(jenis);

      $("txOverlay")?.classList.remove("hidden");
    });
  }

  if ($("btnActionDuplicate")) {
    $("btnActionDuplicate").addEventListener("click", () => {
      const no = state.actionNo;
      const tx = state.transactions.find((t) => String(t.no) === String(no));

      closeTxActionSheet();
      if (!tx) return;

      state.editingNo = null;

      if ($("txSheetTitle"))
        $("txSheetTitle").textContent = "Duplikasi Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Simpan";
      $("txError")?.classList.add("hidden");

      const dateValue = tx.tanggal;
      const valueDisplay = document.getElementById("txDateDropdownValue");
      const hiddenInput = document.getElementById("txTanggal");
      if (dateValue) {
        const d = new Date(dateValue);
        if (!isNaN(d.getTime())) {
          if (valueDisplay) valueDisplay.textContent = formatDateDisplay(d);
          if (hiddenInput) hiddenInput.value = formatDateInput(d);
          txDatePickerState.selectedDate = d;
          txDatePickerState.currentMonth = d.getMonth();
          txDatePickerState.currentYear = d.getFullYear();
        }
      }

      const accountDisplay = document.getElementById("txAccountDropdownValue");
      const accountHidden = document.getElementById("txAccount");
      if (tx.account) {
        if (accountDisplay) accountDisplay.textContent = tx.account;
        if (accountHidden) accountHidden.value = tx.account;
        renderTxAccountDropdownMenu();
      }

      $("txKeterangan").value = tx.keterangan;
      $("txJumlah").value = tx.debet > 0 ? tx.debet : tx.kredit;

      const jenis = tx.debet > 0 ? "debet" : "kredit";
      setTxJenis(jenis);

      $("txOverlay")?.classList.remove("hidden");
    });
  }

  function closeCarryForwardConfirm() {
    $("carryForwardOverlay")?.classList.add("hidden");
    state.carryForwardMonth = null;
    state.carryForwardNextMonth = null;
  }

  if ($("btnCarryForwardCancel")) {
    $("btnCarryForwardCancel").addEventListener(
      "click",
      closeCarryForwardConfirm,
    );
  }

  if ($("carryForwardOverlay")) {
    $("carryForwardOverlay").addEventListener("click", (event) => {
      if (event.target === $("carryForwardOverlay")) {
        closeCarryForwardConfirm();
      }
    });
  }

  if ($("btnCarryForwardConfirm")) {
    $("btnCarryForwardConfirm").addEventListener("click", async () => {
      if (!state.carryForwardMonth) return;

      const session = getSession();

      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        closeCarryForwardConfirm();
        return;
      }

      const monthKey = state.carryForwardMonth;

      $("btnCarryForwardConfirm").disabled = true;
      $("btnCarryForwardConfirm").textContent = "Memproses…";

      try {
        const res = await apiPost({
          action: "carryForwardSaldo",
          token: session.token,
          monthKey,
        });

        if (!res.success) {
          showToast(res.message || "Gagal membuat saldo awal.", "error");
          return;
        }

        showToast(res.message || "Saldo awal berhasil dibuat.");
        closeCarryForwardConfirm();
        await loadData();
      } catch (err) {
        showToast("Tidak dapat menghubungi server: " + err.message, "error");
      } finally {
        $("btnCarryForwardConfirm").disabled = false;
        $("btnCarryForwardConfirm").textContent = "Lanjutkan";
      }
    });
  }

  if ($("shodFilterYear"))
    $("shodFilterYear").addEventListener("change", function () {
      state.shodaqoh.filters.year = this.value;
      renderPaymentHistory();
    });

  if ($("shodFilterMonth"))
    $("shodFilterMonth").addEventListener("change", function () {
      state.shodaqoh.filters.month = this.value;
      var p = state.shodaqoh.filters.year + "-" + state.shodaqoh.filters.month;
      if (state.shodaqoh.filters.year && state.shodaqoh.filters.month) {
        loadShodaqohData(p);
      }
    });

  if ($("shodFilterMember"))
    $("shodFilterMember").addEventListener("change", function () {
      state.shodaqoh.filters.memberId = this.value;
      renderShodaqohMonitoring();
      renderPaymentHistory();
    });

  if ($("shodFilterStatus"))
    $("shodFilterStatus").addEventListener("change", function () {
      state.shodaqoh.filters.status = this.value;
      renderShodaqohMonitoring();
    });

  if ($("shodMethodManual")) {
    $("shodMethodManual").addEventListener("click", function () {
      if (typeof toggleShodMethod === "function") {
        toggleShodMethod("manual");
      }
    });
  }

  if ($("shodMethodUpload")) {
    $("shodMethodUpload").addEventListener("click", function () {
      if (typeof toggleShodMethod === "function") {
        toggleShodMethod("upload");
      }
    });
  }

  if (typeof setupShodUpload === "function") {
    setupShodUpload();
  }

  if ($("shodUploadClear")) {
    $("shodUploadClear").addEventListener("click", function () {
      if (typeof clearShodUpload === "function") {
        clearShodUpload();
      }
    });
  }

  if ($("btnShodAddPayment"))
    $("btnShodAddPayment").addEventListener("click", () => {
      if (isAdminUser()) openShodaqohPaymentForm(null);
    });

  if ($("btnCancelShodaqohPayment"))
    $("btnCancelShodaqohPayment").addEventListener(
      "click",
      closeShodaqohPaymentForm,
    );

  if ($("shodaqohPaymentOverlay")) {
    $("shodaqohPaymentOverlay").addEventListener("click", function (e) {
      if (e.target === this) {
        if (typeof closeShodaqohPaymentForm === "function") {
          closeShodaqohPaymentForm();
        }
      }
    });
  }

  if (document.getElementById("btnLoadLastNominals")) {
    document
      .getElementById("btnLoadLastNominals")
      .addEventListener("click", function () {
        if (typeof loadLastNominals === "function") {
          loadLastNominals();
        } else {
          showToast("Fungsi belum tersedia.", "error");
        }
      });
  }

  document.addEventListener("click", function (e) {
    const menu = document.getElementById("shodPaymentMemberMenu");
    if (menu && menu.contains(e.target)) {
      const option = e.target.closest(".filter-dropdown-option");
      if (option) {
        setTimeout(function () {
          if (typeof updateLoadLastNominalsButton === "function") {
            updateLoadLastNominalsButton();
          }
        }, 50);
      }
    }
  });

  const memberHidden = document.getElementById("shodPaymentMember");
  if (memberHidden) {
    const observer = new MutationObserver(function () {
      if (typeof updateLoadLastNominalsButton === "function") {
        updateLoadLastNominalsButton();
      }
    });
    observer.observe(memberHidden, {
      attributes: true,
      attributeFilter: ["value"],
    });

    memberHidden.addEventListener("change", function () {
      if (typeof updateLoadLastNominalsButton === "function") {
        updateLoadLastNominalsButton();
      }
    });
  }

  document.addEventListener("click", function (e) {
    const paymentBtn = e.target.closest("[data-shod-payment]");
    if (paymentBtn) {
      e.preventDefault();
      const paymentId = paymentBtn.dataset.shodPayment;
      if (!paymentId) return;
      openShodaqohPaymentDetail(paymentId);
      return;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    const paymentBtn = e.target.closest?.("[data-shod-payment]");
    if (!paymentBtn) return;
    e.preventDefault();
    paymentBtn.click();
  });

  document.addEventListener("click", function (e) {
    const memberBtn = e.target.closest("[data-shod-member]");
    if (memberBtn) {
      e.preventDefault();
      const memberId = memberBtn.dataset.shodMember;
      if (!memberId) return;
      if (isAdminUser()) {
        openShodMemberActionSheet(memberId);
      } else {
        openShodaqohMemberDetail(memberId);
      }
      return;
    }

    const detailBtn = e.target.closest("#btnMemberActionDetail");
    if (detailBtn) {
      e.preventDefault();
      const memberId = shodMemberActionId;
      if (!memberId) return;
      closeShodMemberActionSheet();
      openShodaqohMemberDetail(memberId);
      return;
    }

    const editBtn = e.target.closest("#btnMemberActionEdit");
    if (editBtn) {
      e.preventDefault();
      const memberId = shodMemberActionId;
      if (!memberId) return;
      closeShodMemberActionSheet();
      openShodMemberForm(memberId);
      return;
    }

    const deleteBtn = e.target.closest("#btnMemberActionDelete");
    if (deleteBtn) {
      e.preventDefault();
      const memberId = shodMemberActionId;
      if (!memberId) return;
      closeShodMemberActionSheet();
      openShodMemberDeleteConfirm(memberId);
      return;
    }

    const cancelBtn = e.target.closest("#btnMemberActionCancel");
    if (cancelBtn) {
      e.preventDefault();
      closeShodMemberActionSheet();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    const memberBtn = e.target.closest?.("[data-shod-member]");
    if (!memberBtn) return;
    e.preventDefault();
    memberBtn.click();
  });

  if ($("btnCloseShodMemberDetail")) {
    $("btnCloseShodMemberDetail").addEventListener("click", function () {
      $("shodMemberDetailOverlay")?.classList.add("hidden");
    });
  }



  const membersList = document.getElementById("shodMembersList");
  if (membersList) {
    // Gunakan MutationObserver untuk mendeteksi perubahan pada members list
    const observer = new MutationObserver(function () {
      // Cek apakah header sudah sticky
      const header = membersList.querySelector(".shod-members-header");
      if (header) {
        header.style.position = "sticky";
        header.style.top = "0";
        header.style.zIndex = "10";
        header.style.background = "var(--surface)";
        header.style.padding = "8px 0 10px 0";
        header.style.borderBottom = "1px solid var(--line)";
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.justifyContent = "space-between";
      }
    });

    observer.observe(membersList, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  if ($("btnCloseShodPaymentDetail"))
    $("btnCloseShodPaymentDetail").addEventListener("click", function () {
      $("shodPaymentDetailOverlay")?.classList.add("hidden");
    });

  if ($("btnShodEditPayment")) {
    $("btnShodEditPayment").addEventListener("click", async () => {
      const id = $("btnShodEditPayment").dataset.paymentId;
      const d = await apiGetShodaqohPaymentDetail(id);
      $("shodPaymentDetailOverlay")?.classList.add("hidden");
      if (typeof openShodaqohPaymentForm === "function") {
        openShodaqohPaymentForm(d.payment);
      }
    });
  }

  if ($("btnShodReversePayment")) {
    $("btnShodReversePayment").addEventListener("click", async function () {
      const id = $("btnShodReversePayment").dataset.paymentId;
      if (!id) return;
      showReverseConfirmModal(id);
    });
  }

  function showReverseConfirmModal(paymentId) {
    const existingModal = document.getElementById("reverseConfirmOverlay");
    if (existingModal) {
      existingModal.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "reverseConfirmOverlay";
    overlay.style.zIndex = "99999 !important";
    overlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:400px;z-index:100000 !important;">
      <div class="modal-icon" style="background:var(--neg-soft);color:var(--neg);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 10h18M3 6h18M5 14h14a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 1 2-2z" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      <h3 class="font-display text-[16px] font-extrabold text-center mt-3">
        Reversal Pembayaran?
      </h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        Pembayaran akan dibatalkan (reversal). Histori tetap tersimpan dan transaksi Kas Utama akan disesuaikan.
      </p>
      <div class="mt-3 p-3 bg-[color:var(--neg-soft)] rounded-lg">
        <p class="text-[10px] text-[color:var(--ink-faint)] font-bold uppercase tracking-wide">Perhatian</p>
        <p class="text-[11px] text-[color:var(--ink-soft)] text-center">Tindakan ini tidak dapat dibatalkan.</p>
      </div>
      <div class="flex gap-2.5 pt-4">
        <button type="button" id="btnReverseCancel" class="btn-ghost flex-1" style="padding:12px 0;">Batal</button>
        <button type="button" id="btnReverseConfirm" class="btn-primary flex-1" style="background:var(--neg);color:#fff;padding:12px 0;">Reversal</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    const closeModal = function () {
      const modal = document.getElementById("reverseConfirmOverlay");
      if (modal) {
        modal.remove();
      }
    };

    const cancelBtn = document.getElementById("btnReverseCancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", closeModal);
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        closeModal();
      }
    });

    const confirmBtn = document.getElementById("btnReverseConfirm");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", async function () {
        closeModal();
        await executeReversePayment(paymentId);
      });
    }

    const escHandler = function (e) {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  async function executeReversePayment(paymentId) {
    const session = getSession();
    if (!session) {
      showToast("Sesi admin berakhir, silakan login ulang.", "error");
      return;
    }

    try {
      const r = await apiPost({
        action: "reverseShodaqohPayment",
        token: session.token,
        paymentId: paymentId,
      });
      if (!r.success) throw new Error(r.message);
      showToast(r.message);
      $("shodPaymentDetailOverlay")?.classList.add("hidden");
      await loadData();
      await loadShodaqohData(state.shodaqoh.selectedMonth);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if ($("btnMemberActionCancel")) {
    $("btnMemberActionCancel").addEventListener("click", function () {
      if (typeof closeShodMemberActionSheet === "function") {
        closeShodMemberActionSheet();
      }
    });
  }


  if ($("btnAddMember")) {
    $("btnAddMember").addEventListener("click", function () {
      if (!isAdminUser()) {
        showToast("Hanya admin yang dapat menambah anggota.", "error");
        return;
      }
      if (typeof openShodMemberForm === "function") {
        openShodMemberForm(null);
      }
    });
  }

  if ($("btnMemberFormCancel")) {
    $("btnMemberFormCancel").addEventListener("click", function () {
      if (typeof closeShodMemberForm === "function") {
        closeShodMemberForm();
      }
    });
  }

  if ($("shodMemberFormOverlay")) {
    $("shodMemberFormOverlay").addEventListener("click", function (e) {
      if (e.target === this) {
        if (typeof closeShodMemberForm === "function") {
          closeShodMemberForm();
        }
      }
    });
  }

  if ($("shodMemberForm")) {
    $("shodMemberForm").addEventListener("submit", async function (e) {
      e.preventDefault();

      const memberId = this.dataset.memberId || null;
      const nama = $("shodMemberFormName").value.trim();
      const nominal = Number($("shodMemberFormNominal").value || 0);

      const errorEl = $("shodMemberFormError");

      if (!nama) {
        errorEl.textContent = "Nama anggota wajib diisi.";
        errorEl.classList.remove("hidden");
        return;
      }

      if (nominal <= 0) {
        errorEl.textContent = "Nominal bulanan harus lebih dari 0.";
        errorEl.classList.remove("hidden");
        return;
      }

      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        return;
      }

      $("btnMemberFormSubmit").disabled = true;
      $("btnMemberFormSubmit").textContent = "Menyimpan…";

      try {
        let res;
        if (memberId) {
          res = await apiPost({
            action: "updateShodaqohMember",
            token: session.token,
            memberId: memberId,
            nama: nama,
            nominalBulanan: nominal,
          });
        } else {
          res = await apiPost({
            action: "addShodaqohMember",
            token: session.token,
            nama: nama,
            nominalBulanan: nominal,
          });
        }

        if (!res.success) throw new Error(res.message);

        showToast(res.message);
        if (typeof closeShodMemberForm === "function") {
          closeShodMemberForm();
        }
        await loadShodaqohData(state.shodaqoh.selectedMonth);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
      } finally {
        $("btnMemberFormSubmit").disabled = false;
        $("btnMemberFormSubmit").textContent = "Simpan";
      }
    });
  }

  if ($("btnDeleteMemberCancel")) {
    $("btnDeleteMemberCancel").addEventListener("click", function () {
      if (typeof closeShodMemberDeleteConfirm === "function") {
        closeShodMemberDeleteConfirm();
      }
    });
  }

  if ($("deleteMemberConfirmOverlay")) {
    $("deleteMemberConfirmOverlay").addEventListener("click", function (e) {
      if (e.target === this) {
        if (typeof closeShodMemberDeleteConfirm === "function") {
          closeShodMemberDeleteConfirm();
        }
      }
    });
  }

  if ($("btnDeleteMemberConfirm")) {
    $("btnDeleteMemberConfirm").addEventListener("click", async function () {
      const memberId =
        typeof shodMemberActionId !== "undefined" ? shodMemberActionId : null;
      if (!memberId) {
        if (typeof closeShodMemberDeleteConfirm === "function") {
          closeShodMemberDeleteConfirm();
        }
        return;
      }

      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        if (typeof closeShodMemberDeleteConfirm === "function") {
          closeShodMemberDeleteConfirm();
        }
        return;
      }

      $("btnDeleteMemberConfirm").disabled = true;
      $("btnDeleteMemberConfirm").textContent = "Menghapus…";

      try {
        const res = await apiPost({
          action: "deleteShodaqohMember",
          token: session.token,
          memberId: memberId,
        });

        if (!res.success) throw new Error(res.message);

        showToast(res.message || "Anggota berhasil dihapus.");
        if (typeof closeShodMemberDeleteConfirm === "function") {
          closeShodMemberDeleteConfirm();
        }
        await loadShodaqohData(state.shodaqoh.selectedMonth);
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        $("btnDeleteMemberConfirm").disabled = false;
        $("btnDeleteMemberConfirm").textContent = "Hapus";
      }
    });
  }

  function openDeleteConfirm() {
    const tx = state.transactions.find(
      (t) => String(t.no) === String(state.actionNo),
    );

    if ($("deleteConfirmDesc")) {
      $("deleteConfirmDesc").innerHTML = tx
        ? `<b>${tx.account}</b> · ${fmtDateShort(
            tx.tanggal,
          )} akan dihapus permanen dan tidak bisa dibatalkan.`
        : "Tindakan ini tidak bisa dibatalkan.";
    }

    $("deleteConfirmOverlay")?.classList.remove("hidden");
  }

  function closeDeleteConfirm() {
    $("deleteConfirmOverlay")?.classList.add("hidden");
  }

  if ($("btnActionDelete")) {
    $("btnActionDelete").addEventListener("click", () => {
      closeTxActionSheet();
      openDeleteConfirm();
    });
  }

  if ($("btnDeleteCancel"))
    $("btnDeleteCancel").addEventListener("click", () => {
      state.actionNo = null;
      closeDeleteConfirm();
    });

  if ($("deleteConfirmOverlay")) {
    $("deleteConfirmOverlay").addEventListener("click", (e) => {
      if (e.target === $("deleteConfirmOverlay")) {
        state.actionNo = null;
        closeDeleteConfirm();
      }
    });
  }

  if ($("btnDeleteConfirm")) {
    $("btnDeleteConfirm").addEventListener("click", () => {
      const no = state.actionNo;

      if (no === null || no === undefined) {
        closeDeleteConfirm();
        return;
      }

      const session = getSession();

      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        closeDeleteConfirm();
        return;
      }

      $("btnDeleteConfirm").disabled = true;
      $("btnDeleteConfirm").textContent = "Menghapus…";

      apiPost({
        action: "deleteTransaction",
        token: session.token,
        no,
      })
        .then((res) => {
          if (!res.success) {
            showToast(res.message || "Gagal menghapus transaksi.", "error");
            return;
          }
          showToast("Transaksi berhasil dihapus.");
          loadData();
        })
        .catch((err) =>
          showToast("Tidak dapat menghubungi server: " + err.message, "error"),
        )
        .finally(() => {
          state.actionNo = null;
          $("btnDeleteConfirm").disabled = false;
          $("btnDeleteConfirm").textContent = "Hapus";
          closeDeleteConfirm();
        });
    });
  }

  if ($("btnTogglePassword")) {
    $("btnTogglePassword").addEventListener("click", () => {
      const pwdInput = $("authPassword");
      const iconEye = $("iconEye");
      const iconEyeOff = $("iconEyeOff");
      const isPassword = pwdInput.type === "password";

      pwdInput.type = isPassword ? "text" : "password";
      iconEye?.classList.toggle("hidden", !isPassword);
      iconEyeOff?.classList.toggle("hidden", isPassword);
    });
  }

  if ($("authForm")) {
    $("authForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = $("authUsername").value.trim();
      const password = $("authPassword").value;

      $("btnAuthSubmit").disabled = true;
      $("btnAuthSubmit").textContent = "Memeriksa…";

      try {
        const res = await apiPost({
          action: "login",
          username,
          password,
        });

        if (!res.success) {
          $("authError").textContent =
            res.message || "Username atau password salah.";
          $("authError").classList.remove("hidden");
          return;
        }

        const role = String(res.role || "pengurus").toLowerCase();

        saveSession(res.token, res.nama || username, role, res.expiresAt);
        setAdminUI(role === "admin", res.nama || username);

        $("authError").classList.add("hidden");
        $("authForm").reset();

        if ($("authPassword")) $("authPassword").type = "password";
        $("iconEye")?.classList.add("hidden");
        $("iconEyeOff")?.classList.remove("hidden");

        enterApp();
      } catch (err) {
        $("authError").textContent =
          "Tidak dapat menghubungi server: " + err.message;
        $("authError").classList.remove("hidden");
      } finally {
        $("btnAuthSubmit").disabled = false;
        $("btnAuthSubmit").textContent = "Masuk";
      }
    });
  }

  document.addEventListener("click", (event) => {
    const homeDropdown = $("homeMonthDropdown");
    const historyDropdown = $("historyMonthDropdown");
    const shodaqohDropdown = $("shodaqohMonthDropdown");

    if (
      (!homeDropdown || !homeDropdown.contains(event.target)) &&
      (!historyDropdown || !historyDropdown.contains(event.target)) &&
      (!shodaqohDropdown || !shodaqohDropdown.contains(event.target))
    ) {
      closeAllMonthDropdowns();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllMonthDropdowns();
      closeTxActionSheet();
      state.actionNo = null;
      closeDeleteConfirm();
      $("shodPaymentDetailOverlay")?.classList.add("hidden");
      $("shodMemberDetailOverlay")?.classList.add("hidden");
      $("shodaqohPaymentOverlay")?.classList.add("hidden");
      $("txOverlay")?.classList.add("hidden");
      $("txActionOverlay")?.classList.add("hidden");
      $("shodMemberActionOverlay")?.classList.add("hidden");
      if (typeof closeShodMemberActionSheet === "function") {
        closeShodMemberActionSheet();
      }
      if (typeof closeShodMemberDeleteConfirm === "function") {
        closeShodMemberDeleteConfirm();
      }
      if (typeof closeShodaqohPaymentForm === "function") {
        closeShodaqohPaymentForm();
      }
      if (typeof closeShodMemberForm === "function") {
        closeShodMemberForm();
      }
      state.shodaqoh.actionNo = null;
      state.shodaqoh.editingNo = null;
    }
  });

  setTimeout(function () {
    if (typeof initShodMemberDropdown === "function") {
      initShodMemberDropdown();
    }
  }, 100);

  setTimeout(function () {
    if (typeof initShodDatePicker === "function") {
      initShodDatePicker();
    }
  }, 150);

  const existing = getSession();

  if (existing) {
    setAdminUI(
      String(existing.role || "").toLowerCase() === "admin",
      existing.nama,
    );
    enterApp();
  }
});

async function apiGetShodaqohPaymentDetail(paymentId) {
  const session = getSession();
  const payload = {
    action: "getShodaqohPaymentDetail",
    paymentId: paymentId,
  };
  if (session && session.token) {
    payload.token = session.token;
  }
  return apiPost(payload);
}

async function openShodaqohPaymentDetail(paymentId) {
  try {
    const body = $("shodPaymentDetailBody");
    if (body) {
      body.innerHTML = `
        <div class="space-y-3">
          ${[1, 2, 3]
            .map(
              () => `
            <div class="tx-card skeleton-loading">
              <div class="flex-1">
                <div class="skeleton-line" style="width:60%;height:16px;border-radius:4px;"></div>
                <div class="skeleton-line mt-2" style="width:40%;height:12px;border-radius:4px;"></div>
              </div>
              <div class="text-right">
                <div class="skeleton-line" style="width:80px;height:16px;border-radius:4px;margin-left:auto;"></div>
                <div class="skeleton-line mt-2" style="width:60px;height:12px;border-radius:4px;margin-left:auto;"></div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    }

    if ($("shodPaymentDetailMeta")) {
      $("shodPaymentDetailMeta").innerHTML = `
        <span class="skeleton-line" style="width:200px;height:14px;display:inline-block;border-radius:4px;"></span>
      `;
    }

    if ($("shodPaymentDetailTitle")) {
      $("shodPaymentDetailTitle").textContent = "Memuat...";
    }

    $("shodPaymentDetailOverlay")?.classList.remove("hidden");

    const d = await apiGetShodaqohPaymentDetail(paymentId);

    if (!d.success)
      throw new Error(d.message || "Gagal memuat detail pembayaran");

    const p = d.payment;

    if ($("shodPaymentDetailTitle"))
      $("shodPaymentDetailTitle").textContent = `Pembayaran · ${p.payment_id}`;

    let formattedDate = p.tanggal;
    if (p.tanggal) {
      const d = new Date(p.tanggal);
      if (!isNaN(d.getTime())) {
        formattedDate = fmtDateShort(p.tanggal);
      }
    }

    const isLunas = p.status === "LUNAS" || p.status === "ACTIVE";
    const statusClass = isLunas ? "status-active" : "status-inactive";
    const statusLabel = isLunas ? "Lunas" : "Belum";

    if ($("shodPaymentDetailMeta")) {
      $("shodPaymentDetailMeta").innerHTML = `
        ${escapeHtml(p.nama)} · ${formattedDate} · ${fmtRp(p.total)}
        <span class="status-pill ${statusClass}" style="font-size:8px;padding:2px 10px;margin-left:4px;vertical-align:middle;">
          ${escapeHtml(statusLabel)}
        </span>
      `;
    }

    if (body) {
      const allocations = d.allocations || [];

      if (allocations.length > 0) {
        body.innerHTML = allocations
          .map((a) => {
            const nominal = Number(a.nominal_target) || Number(a.nominal) || 0;

            let allocationType = "Alokasi";
            if (a.allocation_id) {
              const idParts = a.allocation_id.split("_");
              if (idParts.length > 0) {
                const lastPart = idParts[idParts.length - 1];
                const typeMap = {
                  IR: "Infak IR",
                  SAMBUNG: "Uang Sambung",
                  JIMPITAN: "Jimpitan",
                  SIAR: "Siar-siar",
                  SERIBUAN: "Seribuan",
                  KAFAN: "Kafan",
                  UKHRO: "Ukhro MT",
                };
                allocationType = typeMap[lastPart] || lastPart;
              }
            }

            let periodLabel = a.periode || "Periode tidak diketahui";
            if (periodLabel && periodLabel !== "Periode tidak diketahui") {
              const [year, month] = periodLabel.split("-");
              if (year && month) {
                const monthNames = [
                  "Januari",
                  "Februari",
                  "Maret",
                  "April",
                  "Mei",
                  "Juni",
                  "Juli",
                  "Agustus",
                  "September",
                  "Oktober",
                  "November",
                  "Desember",
                ];
                periodLabel = `${monthNames[parseInt(month) - 1]} ${year}`;
              }
            }

            return `<div class="tx-card">
              <div class="flex-1">
                <p class="tx-title">${escapeHtml(allocationType)}</p>
                <p class="tx-meta">${escapeHtml(periodLabel)}</p>
              </div>
              <div class="text-right">
                <p class="tx-amount mono" style="color:var(--pos);">${fmtRp(nominal)}</p>
              </div>
            </div>`;
          })
          .join("");
      } else {
        const allocationFields = [
          { field: "susulan_ir", label: "Infak IR" },
          { field: "uang_sambung", label: "Uang Sambung" },
          { field: "jimpitan", label: "Jimpitan" },
          { field: "siar_siar", label: "Siar-siar" },
          { field: "seribuan", label: "Seribuan" },
          { field: "kafan", label: "Kafan" },
          { field: "ukhro_mt", label: "Ukhro MT" },
        ];

        let hasAllocation = false;
        const allocFromPayment = [];
        allocationFields.forEach(({ field, label }) => {
          const value = Number(p[field]) || 0;
          if (value > 0) {
            hasAllocation = true;
            allocFromPayment.push({
              label: label,
              nominal: value,
              periode: p.tanggal || "Bulan berjalan",
            });
          }
        });

        if (hasAllocation) {
          body.innerHTML = allocFromPayment
            .map((a) => {
              let periodLabel = "Bulan berjalan";
              if (a.periode && a.periode !== "Bulan berjalan") {
                const d = new Date(a.periode);
                if (!isNaN(d.getTime())) {
                  periodLabel = fmtDateShort(a.periode);
                }
              }

              return `<div class="tx-card">
                <div class="flex-1">
                  <p class="tx-title">${escapeHtml(a.label)}</p>
                  <p class="tx-meta">${escapeHtml(periodLabel)}</p>
                </div>
                <div class="text-right">
                  <p class="tx-amount mono" style="color:var(--pos);">${fmtRp(a.nominal)}</p>
                </div>
              </div>`;
            })
            .join("");
        } else {
          body.innerHTML =
            '<p class="text-xs text-[color:var(--ink-faint)] text-center py-6">Tidak ada alokasi.</p>';
        }
      }
    }

    if ($("btnShodEditPayment"))
      $("btnShodEditPayment").dataset.paymentId = paymentId;

    if ($("btnShodReversePayment"))
      $("btnShodReversePayment").dataset.paymentId = paymentId;
  } catch (err) {
    console.error(err);
    if (body) {
      body.innerHTML = `
        <div class="text-center py-8">
          <p class="text-xs text-[color:var(--neg)]">Gagal memuat detail: ${escapeHtml(err.message)}</p>
          <button type="button" id="btnRetryPaymentDetail" class="mt-3 text-xs font-bold" style="color:var(--brand);">
            Coba lagi
          </button>
        </div>
      `;

      const retryBtn = document.getElementById("btnRetryPaymentDetail");
      if (retryBtn) {
        retryBtn.addEventListener("click", function () {
          openShodaqohPaymentDetail(paymentId);
        });
      }
    }
    showToast(err.message, "error");
  }
}
