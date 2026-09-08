// ============================================================
// EVENT LISTENER - SATU KALI SAJA
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  // Tombol Print Laporan Keuangan
  const printBtn = document.getElementById("btnPrintReport");
  if (printBtn) {
    printBtn.addEventListener("click", function (e) {
      e.preventDefault();
      printReport();
    });
  }

  // Tombol Print Shodaqoh
  const printShodBtn = document.getElementById("btnPrintShodaqoh");
  if (printShodBtn) {
    printShodBtn.addEventListener("click", function (e) {
      e.preventDefault();
      printShodaqohReport();
    });
  }
});

function applyFilters() {
  const monthKey = state.selectedMonth;

  const scope = computeScope(monthKey);

  renderSummaryHistory(scope, monthKey);

  const searchEl = $("searchInput");

  const q = searchEl ? searchEl.value.trim().toLowerCase() : "";

  const filtered = q
    ? scope.list.filter((t) =>
        `${t.tanggal} ${t.account} ${t.keterangan}`.toLowerCase().includes(q),
      )
    : scope.list;

  renderTxList([...filtered].reverse(), "txList", "txEmpty");

  buildPrintTable(filtered);
}

const TAB_TITLES = {
  home: "Beranda",
  history: "Riwayat",
  recap: "Rekap Bulanan",
  shodaqoh: "Shodaqoh Bulanan",
  profile: "Profil",
};

function switchTab(tab) {
  state.activeTab = tab;

  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));

  const targetScreen = $("screen-" + tab);

  if (targetScreen) targetScreen.classList.add("active");

  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

  if ($("screenTitle")) $("screenTitle").textContent = TAB_TITLES[tab];

  document.body.classList.remove(
    "screen-shodaqoh-active",
    "screen-zakat-active",
  );
  if (tab === "shodaqoh") {
    document.body.classList.add("screen-shodaqoh-active");
  } else if (tab === "zakat") {
    document.body.classList.add("screen-zakat-active");
  }

  updateFabVisibility();

  document.querySelector("main")?.scrollTo({
    top: 0,
  });
}

function updateFabVisibility() {
  const fabAdd = $("fabAdd");
  const fabPost = $("fabPostToKas");
  const postStatus = $("shodPostStatus");

  if (!fabAdd) return;

  const isAdmin = isAdminUser();

  const isAllowedTab =
    state.activeTab === "home" ||
    state.activeTab === "history" ||
    state.activeTab === "shodaqoh";

  const shouldShowAdd = isAdmin && isAllowedTab;
  fabAdd.classList.toggle("hidden", !shouldShowAdd);

  const shodaqoh = state.shodaqoh || {};
  const payments = shodaqoh.payments || [];

  // Posting hanya boleh ditentukan untuk periode yang spesifik (tahun + bulan).
  // Jika filter belum menentukan keduanya, jangan tampilkan FAB agar tidak
  // berisiko melakukan posting ke periode yang salah.
  const filterYear = String(shodaqoh.filters?.year || "");
  const filterMonth = String(shodaqoh.filters?.month || "");
  const filteredMonthKey =
    filterYear && filterMonth ? `${filterYear}-${filterMonth}` : "";
  const selectedMonthKey = String(shodaqoh.selectedMonth || "");
  const hasSpecificPeriod = Boolean(filteredMonthKey);

  // Data `payments` berasal dari selectedMonth yang dimuat dari backend.
  // Jadi status POSTED di sini adalah status untuk periode yang sedang dipilih.
  const allPosted =
    hasSpecificPeriod &&
    selectedMonthKey === filteredMonthKey &&
    payments.some(function (p) {
      return String(p.kas_transaction_no || "").includes("POSTED");
    });

  if (fabPost) {
    // FAB Post hanya tampil pada periode spesifik yang BELUM diposting.
    const shouldShowPost =
      isAdmin &&
      state.activeTab === "shodaqoh" &&
      hasSpecificPeriod &&
      selectedMonthKey === filteredMonthKey &&
      !allPosted;

    fabPost.classList.toggle("hidden", !shouldShowPost);
    fabPost.style.display = shouldShowPost ? "flex" : "";
  }

  if (postStatus) {
    // Card status + tombol Cancel hanya tampil kalau di tab Shodaqoh DAN sudah posting
    const shouldShowStatus = state.activeTab === "shodaqoh" && allPosted;
    postStatus.classList.toggle("hidden", !shouldShowStatus);
  }
}

function setAdminUI(isAdmin, nama) {
  state.isAdmin = isAdmin;
  state.adminName = nama || "";

  if ($("profileName"))
    $("profileName").textContent = nama || (isAdmin ? "Admin" : "Pengurus");

  if ($("profileStatus")) {
    $("profileStatus").textContent = isAdmin
      ? "Admin · dapat menambah transaksi"
      : "Pengurus · mode lihat saja";
  }

  updateFabVisibility();

  if ($("btnShodAddPayment"))
    $("btnShodAddPayment").classList.toggle("hidden", !isAdmin);
}

function enterApp() {
  // Fungsi ini dipanggil setelah login berhasil

  // Inisialisasi router
  if (typeof window.initRouter === "function") {
    window.initRouter();
  }

  // Refresh auth gate
  if (window.__refreshAuthGate) {
    window.__refreshAuthGate();
  }
}
