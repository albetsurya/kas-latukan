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

  console.log("✅ Print buttons initialized");
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

function postShodaqohToKas() {
  if (!isAdminUser()) {
    showToast("Hanya admin yang dapat melakukan posting ke Kas.", "error");
    return;
  }

  const monthKey = state.shodaqoh.selectedMonth;
  if (!monthKey) {
    showToast("Pilih bulan terlebih dahulu.", "error");
    return;
  }

  const payments = state.shodaqoh.payments || [];
  const alreadyPosted =
    payments.length > 0 &&
    payments.every(function (p) {
      return String(p.kas_transaction_no || "").includes("POSTED");
    });

  if (alreadyPosted) {
    showToast("Bulan ini sudah diposting ke Kas Utama.", "error");
    return;
  }

  const totalPayments = payments.reduce(function (s, p) {
    return s + (p.total || 0);
  }, 0);

  if (totalPayments === 0) {
    showToast("Tidak ada pembayaran untuk bulan ini.", "error");
    return;
  }

  showPostConfirmModal(monthKey, totalPayments);
}

function showPostConfirmModal(monthKey, totalPayments) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "postConfirmOverlay";
  overlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:400px;">
      <div class="modal-icon" style="background:var(--gold-soft);color:var(--gold);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="9" y1="15" x2="21" y2="3" />
        </svg>
      </div>
      <h3 class="font-display text-[16px] font-extrabold text-center mt-3">
        Posting ke Kas Utama?
      </h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        Semua pembayaran Infak Bulanan bulan <b>${getMonthLabel(monthKey)}</b> akan diposting ke Kas Utama.
      </p>
      <div class="mt-3 p-3 bg-[color:var(--surface-alt)] rounded-lg">
        <p class="text-[10px] text-[color:var(--ink-faint)] font-bold uppercase tracking-wide">Total yang akan diposting</p>
        <p class="mono text-[17px] font-extrabold text-center">${fmtRp(totalPayments)}</p>
      </div>
      <p class="text-[10.5px] text-[color:var(--ink-faint)] text-center mt-2">
        Transaksi akan dibuat per kategori alokasi.
      </p>
      <div class="flex gap-2.5 pt-4">
        <button type="button" id="btnPostCancel" class="btn-ghost flex-1" style="padding:12px 0;">Batal</button>
        <button type="button" id="btnPostConfirm" class="btn-primary flex-1" style="background:var(--gold);color:#fff;padding:12px 0;">Lanjutkan</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeModal = function () {
    if (document.getElementById("postConfirmOverlay")) {
      document.getElementById("postConfirmOverlay").remove();
    }
  };

  document
    .getElementById("btnPostCancel")
    .addEventListener("click", closeModal);
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  document
    .getElementById("btnPostConfirm")
    .addEventListener("click", async function () {
      closeModal();
      await executePostToKas(monthKey);
    });
}

async function executePostToKas(monthKey) {
  const session = getSession();
  if (!session) {
    showToast("Sesi admin berakhir, silakan login ulang.", "error");
    return;
  }

  const btn = $("btnShodPostToKas") || $("fabPostToKas");

  setButtonLoading(btn, true);

  try {
    const res = await apiPost({
      action: "postShodaqohToKas",
      token: session.token,
      monthKey: monthKey,
    });

    if (!res.success) throw new Error(res.message);

    showToast(res.message);

    if (res.details && res.details.length > 0) {
      showPostResultModal(res);
    }

    // Refresh semua data (kas + shodaqoh)
    await refreshAllDataWithShodaqoh();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setButtonLoading(btn, false);
  }
}

function showPostResultModal(res) {
  let detailRows = res.details
    .map(function (d) {
      return `
        <div class="flex items-center justify-between py-2 border-b border-[color:var(--line)] last:border-0">
          <span class="text-xs font-medium">${d.account}</span>
          <span class="mono text-xs font-bold">${fmtRp(d.amount)}</span>
        </div>
      `;
    })
    .join("");

  const resultOverlay = document.createElement("div");
  resultOverlay.className = "modal-overlay";
  resultOverlay.id = "postResultOverlay";
  resultOverlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:400px;">
      <div class="modal-icon" style="background:var(--pos-soft);color:var(--pos);">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h3 class="font-display text-[16px] font-extrabold text-center mt-3">
        Posting Berhasil!
      </h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        Rincian transaksi yang dibuat di Kas Utama:
      </p>
      <div class="mt-3 p-3 bg-[color:var(--surface-alt)] rounded-lg max-h-48 overflow-y-auto">
        ${detailRows}
      </div>
      <div class="flex items-center justify-between mt-3 pt-2 border-t border-[color:var(--line)]">
        <span class="text-xs font-bold">TOTAL</span>
        <span class="mono text-sm font-extrabold">${fmtRp(res.total)}</span>
      </div>
      <button type="button" id="btnResultClose" class="btn-primary w-full mt-4" style="padding:12px 0;">Tutup</button>
    </div>
  `;
  document.body.appendChild(resultOverlay);

  document
    .getElementById("btnResultClose")
    .addEventListener("click", function () {
      if (document.getElementById("postResultOverlay")) {
        document.getElementById("postResultOverlay").remove();
      }
    });

  resultOverlay.addEventListener("click", function (e) {
    if (e.target === resultOverlay) {
      if (document.getElementById("postResultOverlay")) {
        document.getElementById("postResultOverlay").remove();
      }
    }
  });
}

function generateShodaqohRekapText() {
  const monthKey = state.shodaqoh.selectedMonth;
  const monthLabel = getMonthLabel(monthKey);

  const payments = state.shodaqoh.payments || [];

  let totalSusulanIr = 0;
  let totalUangSambung = 0;
  let totalJimpitan = 0;
  let totalSiarSiar = 0;
  let totalSeribuan = 0;
  let totalKafan = 0;
  let totalUkhroMt = 0;

  payments.forEach(function (p) {
    totalSusulanIr += Number(p.susulan_ir || 0);
    totalUangSambung += Number(p.uang_sambung || 0);
    totalJimpitan += Number(p.jimpitan || 0);
    totalSiarSiar += Number(p.siar_siar || 0);
    totalSeribuan += Number(p.seribuan || 0);
    totalKafan += Number(p.kafan || 0);
    totalUkhroMt += Number(p.ukhro_mt || 0);
  });

  const total =
    totalSusulanIr +
    totalUangSambung +
    totalJimpitan +
    totalSiarSiar +
    totalSeribuan +
    totalKafan +
    totalUkhroMt;

  const formatNumber = (n) => {
    return Math.round(n || 0).toLocaleString("id-ID");
  };

  let lines = [];
  lines.push(`*Bulan ${monthLabel}*`);
  lines.push("");
  lines.push(`Persenan.      ${formatNumber(totalSusulanIr)}`);
  lines.push(`Sambung.      ${formatNumber(totalUangSambung)}`);
  lines.push(`Jimpitan.          ${formatNumber(totalJimpitan)}`);
  lines.push(`Siar2.               ${formatNumber(totalSiarSiar)}`);
  lines.push(`1000an.             ${formatNumber(totalSeribuan)}`);
  lines.push(`Kafan.               ${formatNumber(totalKafan)}`);
  lines.push(`Ukro mt.         ${formatNumber(totalUkhroMt)}`);
  lines.push(`        __________________+`);
  lines.push(`*Total             ${formatNumber(total)}*`);

  return lines.join("\n");
}

async function copyShodaqohRekap() {
  const btn = document.getElementById("btnCopyShodaqohRekap");
  if (!btn) return;

  const payments = state.shodaqoh.payments || [];
  const hasData = payments.some((p) => {
    return (
      Number(p.susulan_ir || 0) > 0 ||
      Number(p.uang_sambung || 0) > 0 ||
      Number(p.jimpitan || 0) > 0 ||
      Number(p.siar_siar || 0) > 0 ||
      Number(p.seribuan || 0) > 0 ||
      Number(p.kafan || 0) > 0 ||
      Number(p.ukhro_mt || 0) > 0
    );
  });

  if (!hasData) {
    showToast("Belum ada data pembayaran untuk bulan ini.", "warning");
    return;
  }

  const text = generateShodaqohRekapText();

  try {
    await navigator.clipboard.writeText(text);

    btn.classList.add("copied");
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    `;

    showToast("Rekap berhasil disalin ke clipboard!", "success");

    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = originalHtml;
    }, 2000);
  } catch (err) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();

      showToast("Rekap berhasil disalin ke clipboard!", "success");
    } catch (e) {
      showToast("Gagal menyalin teks. Silakan coba lagi.", "error");
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

