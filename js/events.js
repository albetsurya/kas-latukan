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

  document.querySelectorAll(".kas-type-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const kasType = this.dataset.kasType;
      switchKasType(kasType);
    });
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

  if (typeof initTheme === "function") {
    initTheme();
  } else if (typeof window.initTheme === "function") {
    window.initTheme();
  } else {
    // Fallback
    const saved = localStorage.getItem("kas_theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    if (typeof applyTheme === "function") {
      applyTheme(saved);
    }
  }

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
      const btn = $("btnRefresh");
      btn.classList.add("spin");
      btn.disabled = true;

      refreshAllDataWithShodaqoh()
        .then(() => {
          showToast("Data berhasil disinkronkan!", "success");
        })
        .catch((err) => {
          showToast("Gagal sinkron: " + err.message, "error");
        })
        .finally(() => {
          btn.disabled = false;
          setTimeout(() => btn.classList.remove("spin"), 400);
        });
    });
  }

  if ($("searchInput"))
    $("searchInput").addEventListener("input", applyFilters);

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab) {
        router.navigateTo(tab);
      }
    });
  });

  if ($("btnSeeAll")) {
    $("btnSeeAll").addEventListener("click", () => {
      router.navigateTo("history");
    });
  }

  document.addEventListener("click", (e) => {
    const recapBtn = e.target.closest(".recap-open-history");
    if (recapBtn) {
      e.preventDefault();
      const month = recapBtn.dataset.month;
      if (month) {
        state.selectedMonth = month;
        renderAllMonthChipRows();
        refreshScopedUI();
        router.navigateTo("history");
      }
    }
  });

  window.initRouter = function () {
    if (typeof router === "undefined" || !router) {
      console.warn("⚠️ Router not available");
      return;
    }

    if (!router.initialized) {
      router.on("routeChange", ({ tab }) => {
        // Handle Shodaqoh
        if (tab === "shodaqoh" && !state.shodaqoh.loaded) {
          loadShodaqohData();
        }

        // Handle Fullscreen Screens (Zakat & Shodaqoh)
        if (tab === "zakat" || tab === "shodaqoh") {
          // Sembunyikan bottom nav karena screen full screen
          const bottomNav = document.getElementById("bottomnav");
          if (bottomNav) {
            bottomNav.style.display = "none";
          }

          // Tampilkan screen terkait
          const screen = document.getElementById("screen-" + tab);
          if (screen) {
            screen.classList.add("active");
          }

          // Load data zakat jika belum (khusus zakat)
          if (tab === "zakat" && !state.zakat._loaded) {
            showZakatLoader("Memuat data zakat...");
            loadZakatData()
              .then(() => {
                state.zakat._loaded = true;
                hideZakatLoader();
              })
              .catch(() => {
                hideZakatLoader();
              });
          }
        } else {
          // Kembalikan bottom nav untuk route lain (kecuali zakat & shodaqoh)
          const bottomNav = document.getElementById("bottomnav");
          if (bottomNav) {
            bottomNav.style.display = "";
          }

          // Sembunyikan screen zakat jika aktif
          const zakatScreen = document.getElementById("screen-zakat");
          if (zakatScreen && zakatScreen.classList.contains("active")) {
            zakatScreen.classList.remove("active");
          }

          // Sembunyikan screen shodaqoh jika aktif
          const shodaqohScreen = document.getElementById("screen-shodaqoh");
          if (shodaqohScreen && shodaqohScreen.classList.contains("active")) {
            shodaqohScreen.classList.remove("active");
          }
        }

        updateFabVisibility();
      });

      router.init();
    }
  };

  if ($("fabPrint")) {
    $("fabPrint").addEventListener("click", () => {
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

      printReport();
    });
  }

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

  if ($("btnShodCancelPostToKas")) {
    $("btnShodCancelPostToKas").addEventListener("click", function () {
      if (typeof cancelPostShodaqohToKas === "function") {
        cancelPostShodaqohToKas();
      } else {
        showToast("Fungsi batal posting tidak tersedia.", "error");
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

      if (!id) {
        showToast("ID pembayaran tidak ditemukan.", "error");
        return;
      }

      state.shodaqoh.selectedPaymentId = id;

      $("shodPaymentDetailOverlay")?.classList.add("hidden");

      if (typeof openShodaqohPaymentForm === "function") {
        openShodaqohPaymentForm(null, true);
      }

      const form = document.getElementById("shodaqohPaymentForm");
      if (form) form.classList.add("loading");

      try {
        const d = await apiGetShodaqohPaymentDetail(id);

        if (d.success && d.payment) {
          if (typeof fillShodaqohPaymentForm === "function") {
            fillShodaqohPaymentForm(d.payment);
          }

          state.shodaqoh.selectedPaymentId = d.payment.payment_id || id;
        }
      } catch (err) {
        showToast("Gagal memuat data: " + err.message, "error");
      } finally {
        if (form) form.classList.remove("loading");
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
    token: session?.token || "",
    paymentId: paymentId,
  };
  return apiPost(payload);
}

async function openShodaqohPaymentDetail(paymentId) {
  const body = $("shodPaymentDetailBody");
  try {
    // ============================================================
    // PERBAIKAN: Ambil role dari session atau state
    // ============================================================
    const session = getSession();
    const role = session?.role || state?.role || state?.user?.role || "";
    const isAdmin =
      role === "admin" || state.isAdmin === true || state.isAdmin === "true";

    const adminActions = $("shodPaymentAdminActions");
    if (adminActions) {
      adminActions.classList.toggle("hidden", !isAdmin);
    }

    const editBtn = $("btnShodEditPayment");
    const reverseBtn = $("btnShodReversePayment");

    if (editBtn) {
      editBtn.disabled = !isAdmin;
      editBtn.dataset.paymentId = isAdmin ? paymentId : "";
      if (isAdmin) {
        editBtn.style.display = "flex";
        editBtn.style.opacity = "1";
        editBtn.style.pointerEvents = "auto";
      } else {
        editBtn.style.display = "none";
      }
    }

    if (reverseBtn) {
      reverseBtn.disabled = !isAdmin;
      reverseBtn.dataset.paymentId = isAdmin ? paymentId : "";
      if (isAdmin) {
        reverseBtn.style.display = "flex";
        reverseBtn.style.opacity = "1";
        reverseBtn.style.pointerEvents = "auto";
      } else {
        reverseBtn.style.display = "none";
      }
    }

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

    let isLunas = false;
    let statusLabel = "Belum";

    // Cek dari berbagai kemungkinan
    if (p.status) {
      // Jika status berupa string teks
      if (typeof p.status === "string") {
        isLunas = p.status === "LUNAS" || p.status === "ACTIVE";
        statusLabel = isLunas ? "Lunas" : "Belum";
      }
      // Jika status berupa tanggal (bug), gunakan logika lain
      else if (
        p.status instanceof Date ||
        !isNaN(new Date(p.status).getTime())
      ) {
        // Fallback: cek dari total_paid vs target
        const totalPaid = Number(p.total_paid || p.total || 0);
        const target = Number(p.target || 0);

        if (target > 0 && totalPaid >= target) {
          isLunas = true;
          statusLabel = "Lunas";
        } else if (totalPaid > 0) {
          isLunas = false;
          statusLabel = "Sebagian";
        } else {
          isLunas = false;
          statusLabel = "Belum";
        }

        console.log("🔧 Fallback status:", { totalPaid, target, isLunas });
      }
    } else {
      // Fallback: cek dari total vs target
      const totalPaid = Number(p.total_paid || p.total || 0);
      const target = Number(p.target || 0);

      if (target > 0 && totalPaid >= target) {
        isLunas = true;
        statusLabel = "Lunas";
      } else if (totalPaid > 0) {
        isLunas = false;
        statusLabel = "Sebagian";
      } else {
        isLunas = false;
        statusLabel = "Belum";
      }
    }

    const statusClass = isLunas ? "status-active" : "status-inactive";

    console.log("Status di detail:", p.status);
    console.log("isLunas:", isLunas);

    // ============================================================
    // PERBAIKAN: Nama dan badge menjadi 2 baris - tetap di CENTER
    // ============================================================
    if ($("shodPaymentDetailMeta")) {
      $("shodPaymentDetailMeta").innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;text-align:center;">
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:600;color:var(--ink);">
              ${escapeHtml(p.nama)}
            </span>
            <span style="font-size:11px;color:var(--ink-soft);">
              · ${formattedDate}
            </span>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:6px;width:80%;">
            <span style="font-size:14px;font-weight:800;color:var(--brand);font-variant-numeric:tabular-nums;">
              ${fmtRp(p.total)}
            </span>
            <span class="status-pill ${statusClass}" style="font-size:8px;padding:4px 12px;font-weight:700;">
              ${escapeHtml(statusLabel)}
            </span>
          </div>
        </div>
      `;
    }

    if (body) {
      // ============================================================
      // TAMPILKAN RINCIAN DENGAN SUSULAN BULAN
      // ============================================================
      const allocationItems = [];

      // 1. Infak IR dengan rincian susulan
      const susulanIR = Number(p.susulan_ir) || 0;
      const susulanBulan = p.susulan_bulan || "";
      const susulanRincian = p.susulan_rincian || "";

      if (susulanIR > 0) {
        let rincianText = "";
        let rincianParsed = {};

        // Parse susulan_rincian
        if (susulanRincian) {
          try {
            rincianParsed = JSON.parse(susulanRincian);
          } catch (e) {
            rincianParsed = {};
          }
        }

        // Jika ada rincian per bulan
        if (Object.keys(rincianParsed).length > 0) {
          const bulanList = Object.keys(rincianParsed).filter(function (key) {
            return rincianParsed[key] > 0;
          });

          if (bulanList.length > 0) {
            const bulanLabels = bulanList.map(function (key) {
              const [y, m] = key.split("-");
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "Mei",
                "Jun",
                "Jul",
                "Ags",
                "Sep",
                "Okt",
                "Nov",
                "Des",
              ];
              return monthNames[parseInt(m) - 1] + "'" + y.slice(2, 4);
            });

            const totalIR = Object.values(rincianParsed).reduce(function (
              sum,
              val,
            ) {
              return sum + val;
            }, 0);

            rincianText = `↻ ${bulanLabels.join(", ")}`;
          }
        } else if (susulanBulan) {
          // Fallback: pakai susulan_bulan
          const bulanArray = susulanBulan.split(",").filter(Boolean);
          if (bulanArray.length > 1) {
            const bulanLabels = bulanArray.map(function (key) {
              const [y, m] = key.trim().split("-");
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "Mei",
                "Jun",
                "Jul",
                "Ags",
                "Sep",
                "Okt",
                "Nov",
                "Des",
              ];
              return monthNames[parseInt(m) - 1] + "'" + y.slice(2, 4);
            });
            rincianText = `↻ ${bulanLabels.join(", ")}`;
          }
        }

        allocationItems.push({
          label: "Infak IR",
          nominal: susulanIR,
          detail: rincianText,
          type: "ir",
        });
      }

      // 2. Uang Sambung
      const uangSambung = Number(p.uang_sambung) || 0;
      if (uangSambung > 0) {
        allocationItems.push({
          label: "Uang Sambung",
          nominal: uangSambung,
          detail: "",
          type: "sambung",
        });
      }

      // 3. Jimpitan
      const jimpitan = Number(p.jimpitan) || 0;
      if (jimpitan > 0) {
        allocationItems.push({
          label: "Jimpitan",
          nominal: jimpitan,
          detail: "",
          type: "jimpitan",
        });
      }

      // 4. Siar-siar
      const siarSiar = Number(p.siar_siar) || 0;
      if (siarSiar > 0) {
        allocationItems.push({
          label: "Siar-siar",
          nominal: siarSiar,
          detail: "",
          type: "siar",
        });
      }

      // 5. Seribuan
      const seribuan = Number(p.seribuan) || 0;
      if (seribuan > 0) {
        allocationItems.push({
          label: "Seribuan",
          nominal: seribuan,
          detail: "",
          type: "seribuan",
        });
      }

      // 6. Kafan
      const kafan = Number(p.kafan) || 0;
      if (kafan > 0) {
        allocationItems.push({
          label: "Kafan",
          nominal: kafan,
          detail: "",
          type: "kafan",
        });
      }

      // 7. Ukhro MT
      const ukhroMt = Number(p.ukhro_mt) || 0;
      if (ukhroMt > 0) {
        allocationItems.push({
          label: "Ukhro MT",
          nominal: ukhroMt,
          detail: "",
          type: "ukhro",
        });
      }

      // Render
      if (allocationItems.length > 0) {
        body.innerHTML = allocationItems
          .map(function (item) {
            const isIR = item.type === "ir";
            const amountColor = isIR ? "var(--brand)" : "var(--pos)";
            const detailHtml = item.detail
              ? `<span class="ir-susulan-detail" style="
                display: block;
                font-size: 7px;
                color: var(--gold);
                font-weight: 600;
                margin-top: 1px;
                letter-spacing: 0.3px;
              ">${escapeHtml(item.detail)}</span>`
              : "";

            return `<div class="tx-card">
              <div class="flex-1">
                <p class="tx-title">${escapeHtml(item.label)}</p>
                ${detailHtml}
              </div>
              <div class="text-right">
                <p class="tx-amount mono" style="color:${amountColor};">${fmtRp(item.nominal)}</p>
              </div>
            </div>`;
          })
          .join("");
      } else {
        body.innerHTML =
          '<p class="text-xs text-[color:var(--ink-faint)] text-center py-6">Tidak ada alokasi.</p>';
      }
    }
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
