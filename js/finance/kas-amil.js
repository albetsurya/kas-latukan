// ============================================================
// SWITCH KAS TYPE - DENGAN UPDATE UI YANG LEBIH BAIK
// ============================================================

function switchKasType(kasType) {
  if (state.kasType === kasType) return;

  state.kasType = kasType;

  // Reset data
  state.saldoAwal = 0;
  state.totalDebet = 0;
  state.totalKredit = 0;
  state.saldoAkhir = 0;
  state.transactions = [];
  state.selectedMonth = "all";
  state.editingNo = null;
  state.actionNo = null;
  state.carryForwardMonth = null;
  state.carryForwardNextMonth = null;

  // Update UI
  updateKasTypeUI(kasType);

  // Update title
  const titleEl = document.getElementById("screenTitle");
  if (titleEl) {
    const titleMap = {
      home: "Beranda",
      history: "Riwayat",
      recap: "Rekap",
      shodaqoh: "Shodaqoh",
      profile: "Profil",
    };
    const currentTab = state.activeTab || "home";
    titleEl.textContent = titleMap[currentTab] || "Beranda";
  }

  // Load data
  if (getSession()) {
    loadData();

    // Reload shodaqoh if active
    if (state.activeTab === "shodaqoh") {
      const monthKey = state.shodaqoh.selectedMonth || "";
      loadShodaqohData(monthKey);
    }
  }
}

function updateKasTypeUI(kasType) {
  // Update switcher buttons
  document.querySelectorAll(".kas-type-btn").forEach((btn) => {
    const isActive = btn.dataset.kasType === kasType;
    btn.classList.toggle("active", isActive);

    // Update aria
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  // Update hero title
  const heroTitle = document.getElementById("heroTitle");
  if (heroTitle) {
    heroTitle.textContent =
      kasType === "main" ? "📊 Dashboard Kas Utama" : "📊 Dashboard Kas Amil";
  }
}
