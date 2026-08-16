document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  // ---------- THEME ----------
  if ($("btnTheme")) {
    $("btnTheme").addEventListener("click", () =>
      applyTheme(currentTheme() === "dark" ? "light" : "dark"),
    );
  }
  if ($("themeLightBtn"))
    $("themeLightBtn").addEventListener("click", () => applyTheme("light"));
  if ($("themeDarkBtn"))
    $("themeDarkBtn").addEventListener("click", () => applyTheme("dark"));

  // ---------- REFRESH ----------
  if ($("btnRefresh")) {
    $("btnRefresh").addEventListener("click", () => {
      $("btnRefresh").classList.add("spin");
      loadData().finally(() =>
        setTimeout(() => $("btnRefresh").classList.remove("spin"), 400),
      );
    });
  }

  // ---------- SEARCH / TABS ----------
  if ($("searchInput"))
    $("searchInput").addEventListener("input", applyFilters);
  if ($("btnSeeAll"))
    $("btnSeeAll").addEventListener("click", () => switchTab("history"));
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // ---------- CETAK / EKSPOR PDF ----------
  // Selalu mencetak data RIWAYAT untuk bulan yang sedang dipilih di dropdown
  // periode (state.selectedMonth), lengkap dengan judul laporan, penomoran
  // ulang 1..n, dan ringkasan total di bagian bawah tabel — diskalakan
  // otomatis supaya selalu muat dalam 1 halaman A4.
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

  // ---------- LOGOUT ----------
  if ($("btnLogout")) {
    $("btnLogout").addEventListener("click", () => {
      const session = getSession();
      // Cabut token di server dulu (best-effort) supaya token lama itu
      // langsung tidak bisa dipakai lagi, baru bersihkan sesi lokal.
      if (session && session.token) {
        apiPost({ action: "logout", token: session.token }).catch(() => {});
      }
      clearSession();
      document.documentElement.classList.remove("authenticated");
      document.documentElement.classList.add("auth-locked");
      $("shell")?.classList.add("hidden");
      $("authScreen")?.classList.remove("hidden");
      $("authForm")?.reset();
      showToast("Berhasil keluar.");
    });
  }

  // ---------- TAMBAH TRANSAKSI ----------
  if ($("segDebet"))
    $("segDebet").addEventListener("click", () => setTxJenis("debet"));
  if ($("segKredit"))
    $("segKredit").addEventListener("click", () => setTxJenis("kredit"));

  if ($("fabAdd")) {
    $("fabAdd").addEventListener("click", () => {
      if (state.isAdmin !== true) return;
      state.editingNo = null;
      if ($("txSheetTitle")) $("txSheetTitle").textContent = "Tambah Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Simpan";
      $("txError")?.classList.add("hidden");
      $("txForm")?.reset();
      setTxJenis("debet");
      if ($("txTanggal")) $("txTanggal").valueAsDate = new Date();
      $("txOverlay")?.classList.remove("hidden");
    });
  }
  $("btnCancelTx").addEventListener("click", () => {
    state.editingNo = null;
    $("txOverlay")?.classList.add("hidden");
  });
  if ($("txOverlay")) {
    $("txOverlay").addEventListener("click", (e) => {
      if (e.target === $("txOverlay")) $("txOverlay").classList.add("hidden");
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
      if (state.isAdmin !== true) {
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
      $("btnSubmitTx").disabled = true;
      $("btnSubmitTx").textContent = isEditing ? "Memperbarui…" : "Menyimpan…";
      try {
        const payload = {
          action: isEditing ? "editTransaction" : "addTransaction",
          token: session.token,
          tanggal: $("txTanggal").value,
          account: $("txAccount").value.trim(),
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

  // ---------- KARTU TRANSAKSI: ketuk untuk membuka menu aksi (Edit/Hapus) ----------
  // Menggantikan tombol icon edit/hapus inline yang sebelumnya menempel di
  // setiap baris. Sekarang seluruh kartu (mode admin) bisa diketuk, lalu
  // muncul action sheet berisi dua pilihan.
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

  if ($("btnActionCancel"))
    $("btnActionCancel").addEventListener("click", closeTxActionSheet);
  if ($("txActionOverlay")) {
    $("txActionOverlay").addEventListener("click", (e) => {
      if (e.target === $("txActionOverlay")) closeTxActionSheet();
    });
  }

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
      $("txTanggal").value = tx.tanggal;
      $("txAccount").value = tx.account;
      $("txKeterangan").value = tx.keterangan;
      $("txJumlah").value = tx.debet > 0 ? tx.debet : tx.kredit;
      setTxJenis(tx.debet > 0 ? "debet" : "kredit");
      $("txOverlay")?.classList.remove("hidden");
    });
  }

  // ---------- DUPLIKASI TRANSAKSI ----------
  if ($("btnActionDuplicate")) {
    $("btnActionDuplicate").addEventListener("click", () => {
      const no = state.actionNo;

      const tx = state.transactions.find((t) => String(t.no) === String(no));

      closeTxActionSheet();

      if (!tx) return;

      // null = transaksi baru, bukan edit
      state.editingNo = null;

      if ($("txSheetTitle")) {
        $("txSheetTitle").textContent = "Duplikasi Transaksi";
      }

      if ($("btnSubmitTx")) {
        $("btnSubmitTx").textContent = "Simpan";
      }

      $("txError")?.classList.add("hidden");

      // Salin data transaksi
      $("txTanggal").value = tx.tanggal;

      $("txAccount").value = tx.account;

      $("txKeterangan").value = tx.keterangan;

      $("txJumlah").value = tx.debet > 0 ? tx.debet : tx.kredit;

      setTxJenis(tx.debet > 0 ? "debet" : "kredit");

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
      if (!state.carryForwardMonth) {
        return;
      }

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

          monthKey: monthKey,
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

  // ---------- MODAL KONFIRMASI HAPUS ----------
  function openDeleteConfirm() {
    const tx = state.transactions.find(
      (t) => String(t.no) === String(state.actionNo),
    );
    if ($("deleteConfirmDesc")) {
      $("deleteConfirmDesc").innerHTML = tx
        ? `<b>${tx.account}</b> · ${fmtDateShort(tx.tanggal)} akan dihapus permanen dan tidak bisa dibatalkan.`
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

  // ---------- AUTH GATE (login pengurus) ----------
  if ($("authForm")) {
    $("authForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = $("authUsername").value.trim();
      const password = $("authPassword").value;
      $("btnAuthSubmit").disabled = true;
      $("btnAuthSubmit").textContent = "Memeriksa…";
      try {
        const res = await apiPost({ action: "login", username, password });
        if (!res.success) {
          $("authError").textContent =
            res.message || "Username atau password salah.";
          $("authError").classList.remove("hidden");
          return;
        }
        // Peran ditentukan dari backend (res.role) bila tersedia; jika tidak,
        // username "admin" mendapat hak input, selain itu hanya lihat (pengurus).
        // Password TIDAK disimpan — hanya token sesi yang diterbitkan backend.
        const role = String(res.role || "pengurus").toLowerCase();
        saveSession(res.token, res.nama || username, role, res.expiresAt);
        setAdminUI(role === "admin", res.nama || username);
        $("authError").classList.add("hidden");
        $("authForm").reset();
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

  // ---------- DROPDOWN PERIODE / OVERLAY: tutup saat klik di luar / tekan Escape ----------
  document.addEventListener("click", (event) => {
    const homeDropdown = $("homeMonthDropdown");
    const historyDropdown = $("historyMonthDropdown");
    if (
      (!homeDropdown || !homeDropdown.contains(event.target)) &&
      (!historyDropdown || !historyDropdown.contains(event.target))
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
    }
  });

  // ---------- INIT: pulihkan sesi bila masih berlaku (maks. 30 hari) ----------
  const existing = getSession();

  if (existing) {
    setAdminUI(
      String(existing.role || "").toLowerCase() === "admin",
      existing.nama,
    );

    enterApp();
  }
});
