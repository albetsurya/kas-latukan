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

  updateFabVisibility();

  document.querySelector("main")?.scrollTo({
    top: 0,
  });
}

function updateFabVisibility() {
  const fabAdd = $("fabAdd");
  const fabPost = $("fabPostToKas");

  if (!fabAdd) return;

  const isAdmin = isAdminUser();

  const isAllowedTab =
    state.activeTab === "home" ||
    state.activeTab === "history" ||
    state.activeTab === "shodaqoh";

  const shouldShowAdd = isAdmin && isAllowedTab;
  fabAdd.classList.toggle("hidden", !shouldShowAdd);

  if (fabPost) {
    const shouldShowPost = isAdmin && state.activeTab === "shodaqoh";
    fabPost.classList.toggle("hidden", !shouldShowPost);

    if (shouldShowPost) {
      fabPost.style.display = "flex";
    } else {
      fabPost.style.display = "";
    }
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
