const CONFIG = {
  WEB_APP_URL:
    "https://script.google.com/macros/s/AKfycbwqCvr9HQvij6g1q3r0tlxfCu3Slb8xhTCdIZ80jYNXdJIVTOtHHSwmEauU3CLt-yd2/exec",
};

let state = {
  saldoAwal: 0,
  totalDebet: 0,
  totalKredit: 0,
  saldoAkhir: 0,
  transactions: [],
  isAdmin: false,
  adminName: "",
  chart: null,
  selectedMonth: "all",
  activeTab: "home",
  txJenis: "debet",
  editingNo: null,
  actionNo: null,
  carryForwardMonth: null,
  carryForwardNextMonth: null,
  shodaqoh: {
    loaded: false,
    loadingPromise: null,
    currentMonth: "",
    selectedMonth: "",
    dashboard: {},
    members: [],
    monitoring: [],
    payments: [],
    filters: { year: "", month: "", memberId: "", status: "ALL" },
    selectedMemberId: null,
    selectedPaymentId: null,
    actionNo: null,
    editingNo: null,
  },
};

const $ = (id) => document.getElementById(id);

function isAdminUser() {
  return state.isAdmin === true || state.isAdmin === "true";
}

const fmtRp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

const getMonthKey = (tanggal) => (tanggal || "").slice(0, 7);

const getMonthLabel = (key) => {
  if (key === "all") return "Semua Periode";
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};

const getPeriodRangeLabel = () => {
  if (!state.transactions || state.transactions.length === 0)
    return "Semua Periode";

  const months = [
    ...new Set(state.transactions.map((t) => getMonthKey(t.tanggal))),
  ]
    .filter(Boolean)
    .sort();

  if (months.length === 0) return "Semua Periode";
  if (months.length === 1) return getMonthLabel(months[0]);

  const firstMonthKey = months[0];
  const lastMonthKey = months[months.length - 1];

  const [y1, m1] = firstMonthKey.split("-");
  const [y2, m2] = lastMonthKey.split("-");

  const startMonthName = new Date(
    Number(y1),
    Number(m1) - 1,
    1,
  ).toLocaleDateString("id-ID", { month: "long" });

  const endMonthName = new Date(
    Number(y2),
    Number(m2) - 1,
    1,
  ).toLocaleDateString("id-ID", { month: "long" });

  if (y1 === y2) {
    return `Periode ${startMonthName} - ${endMonthName} ${y1}`;
  }

  const startShort = new Date(Number(y1), Number(m1) - 1, 1).toLocaleDateString(
    "id-ID",
    { month: "short", year: "numeric" },
  );

  const endShort = new Date(Number(y2), Number(m2) - 1, 1).toLocaleDateString(
    "id-ID",
    { month: "short", year: "numeric" },
  );

  return `Periode ${startShort} - ${endShort}`;
};

const getMonthChipLabel = (key) => {
  if (key === "all") return "Semua";
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });
};

const getMonthShortLabel = (key) => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });
};

const fmtDateShort = (tanggal) => {
  if (!tanggal) return "-";

  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return tanggal;

  const bulan = [
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

  return `${String(d.getDate()).padStart(2, "0")} ${
    bulan[d.getMonth()]
  } ${d.getFullYear()}`;
};

const fmtMonthYear = (tanggal) => {
  if (!tanggal) return "-";
  const d = new Date(tanggal);
  if (isNaN(d.getTime())) return tanggal;

  const bulan = [
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

  return `${bulan[d.getMonth()]} ${d.getFullYear()}`;
};

function updateHeroCardLabel(filterType) {
  const elLabelSaldoAwal = $("homeLabelSaldoAwal");
  if (!elLabelSaldoAwal) return;

  elLabelSaldoAwal.textContent =
    filterType === "monthly"
      ? "Saldo Awal (Awal Bulan)"
      : "Saldo Awal (Awal Tahun)";
}

const isSaldoAwalRow = (t) =>
  (t.account || "").trim().toUpperCase() === "SALDO AWAL";

function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

const SESSION_KEY = "kas_user";

function saveSession(token, nama, role, expiresAt) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token,
      nama,
      role,
      expiresAt,
    }),
  );
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (!parsed.token || !parsed.expiresAt || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return parsed;
  } catch (e) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

const ICON_SUN =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/></svg>';

const ICON_MOON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"/></svg>';

function applyTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);

  try {
    localStorage.setItem("kas_theme", mode);
  } catch (e) {}

  if ($("btnTheme"))
    $("btnTheme").innerHTML = mode === "dark" ? ICON_SUN : ICON_MOON;

  if ($("themeLightBtn"))
    $("themeLightBtn").classList.toggle("active", mode === "light");

  if ($("themeDarkBtn"))
    $("themeDarkBtn").classList.toggle("active", mode === "dark");

  if (state.chart) renderChart();
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}

function initTheme() {
  let saved = null;

  try {
    saved = localStorage.getItem("kas_theme");
  } catch (e) {}

  if (!saved) {
    saved =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
  }

  applyTheme(saved);
}

let toastTimer;

function showToast(msg, type = "success") {
  const el = $("toast");
  if (!el) return;

  const isHtml = msg.includes("<svg") || msg.includes("<span");

  if (isHtml) {
    el.innerHTML = msg;
  } else {
    el.textContent = msg;
  }

  el.style.background =
    type === "error"
      ? "var(--neg)"
      : type === "warning"
        ? "var(--gold)"
        : "var(--brand-dark)";

  el.classList.remove("hidden");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3200);
}

function showToastWithIcon(message, type = "success") {
  const icons = {
    success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;margin-right:6px;flex-shrink:0;">
      <path d="M20 6L9 17l-5-5" />
    </svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;margin-right:6px;flex-shrink:0;">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>`,
    warning: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;margin-right:6px;flex-shrink:0;">
      <path d="M12 9v4M12 17h.01" />
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    </svg>`,
    error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;margin-right:6px;flex-shrink:0;">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>`,
  };

  const icon = icons[type] || icons.info;
  showToast(`${icon} ${message}`, type);
}

async function apiGet() {
  const res = await fetch(`${CONFIG.WEB_APP_URL}?action=getData`);

  if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");

  return res.json();
}

async function apiGetShodaqoh(monthKey) {
  const url =
    `${CONFIG.WEB_APP_URL}?action=getShodaqohData` +
    (monthKey ? `&month=${encodeURIComponent(monthKey)}` : "");

  const res = await fetch(url);

  if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");

  return res.json();
}

async function apiPost(payload) {
  const res = await fetch(CONFIG.WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Gagal mengirim data (" + res.status + ")");

  return res.json();
}

// ============================================================
// HELPER: UPDATE LAST SYNC TIME
// ============================================================

function updateLastSyncTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const lastSyncEl = document.getElementById("lastSync");
  const lastSyncProfileEl = document.getElementById("lastSyncProfile");

  if (lastSyncEl) {
    lastSyncEl.textContent = "tersinkron " + timeString;
  }

  if (lastSyncProfileEl) {
    lastSyncProfileEl.textContent = timeString;
  }
}

// ============================================================
// REFRESH DATA FUNCTIONS
// ============================================================

async function refreshAllData() {
  try {
    const data = await apiGet();
    if (!data.success) throw new Error(data.message || "Gagal memuat data kas");

    state.saldoAwal = data.saldoAwal;
    state.totalDebet = data.totalDebet;
    state.totalKredit = data.totalKredit;
    state.saldoAkhir = data.saldoAkhir;
    state.transactions = data.transactions || [];

    renderAllMonthChipRows();
    renderRecapList();
    refreshScopedUI();

    updateLastSyncTime();
  } catch (err) {
    console.error(err);
    showToast("Gagal refresh data: " + err.message, "error");
  }
}

async function refreshAllDataWithShodaqoh() {
  try {
    // 1. Refresh data kas
    await refreshAllData();

    // 2. Refresh data shodaqoh jika sudah pernah di-load atau tab aktif
    if (state.shodaqoh.loaded || state.activeTab === "shodaqoh") {
      const monthKey = state.shodaqoh.selectedMonth || "";
      await loadShodaqohData(monthKey);
    }

    // 3. Update last sync (sudah dilakukan di refreshAllData)
    updateLastSyncTime();
  } catch (err) {
    console.error(err);
    showToast("Gagal refresh data: " + err.message, "error");
  }
}

// ============================================================
// MANUAL SYNC (KLIK TOMBOL)
// ============================================================

let isSyncing = false;

async function manualSync() {
  // Cegah double click
  if (isSyncing) {
    showToast("Sinkronisasi sedang berjalan...", "info");
    return;
  }

  const btn = document.getElementById("btnRefresh");
  if (!btn) return;

  // Set state syncing
  isSyncing = true;
  btn.classList.add("syncing", "spin");
  btn.disabled = true;

  // Simpan konten asli
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v6h-6" />
    </svg>
  `;

  try {
    await refreshAllDataWithShodaqoh();
    showToast("Data berhasil disinkronkan!", "success");
  } catch (err) {
    console.error(err);
    showToast("Gagal sinkron: " + err.message, "error");
  } finally {
    // Reset state
    isSyncing = false;
    btn.classList.remove("syncing", "spin");
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ============================================================
// LOAD DATA (PERTAMA KALI)
// ============================================================

async function loadData() {
  // Cek apakah benar-benar authenticated
  if (!document.documentElement.classList.contains("authenticated")) {
    console.warn("loadData dipanggil tanpa authenticated");
    return;
  }

  if (CONFIG.WEB_APP_URL.includes("GANTI_DENGAN")) {
    if ($("configWarning")) $("configWarning").classList.remove("hidden");
    renderTxList([], "txList", "txEmpty");
    return;
  }

  renderHomeSkeleton();
  renderHistorySkeleton();
  renderRecapSkeleton();

  await refreshAllData();
  updateLastSyncTime();

  // Shodaqoh akan di-load oleh switchTab jika diperlukan
}

function getMonthsDesc() {
  return [...new Set(state.transactions.map((t) => getMonthKey(t.tanggal)))]
    .filter(Boolean)
    .sort()
    .reverse();
}

function getMonthDropdownRefs(prefix) {
  return {
    dropdown: $(`${prefix}MonthDropdown`),
    trigger: $(`${prefix}MonthDropdownTrigger`),
    value: $(`${prefix}MonthDropdownValue`),
    menu: $(`${prefix}MonthDropdownMenu`),
  };
}

function closeMonthDropdown(prefix) {
  const { dropdown, trigger } = getMonthDropdownRefs(prefix);

  if (!dropdown) return;

  dropdown.classList.remove("open");
  trigger?.setAttribute("aria-expanded", "false");
}

function closeAllMonthDropdowns() {
  closeMonthDropdown("home");
  closeMonthDropdown("history");
  closeMonthDropdown("shodaqoh");
}

function toggleMonthDropdown(prefix) {
  const { dropdown, trigger } = getMonthDropdownRefs(prefix);

  if (!dropdown) return;

  const willOpen = !dropdown.classList.contains("open");

  closeAllMonthDropdowns();

  dropdown.classList.toggle("open", willOpen);

  trigger?.setAttribute("aria-expanded", String(willOpen));
}

function renderMonthDropdown(prefix, months) {
  const { trigger, value, menu } = getMonthDropdownRefs(prefix);

  if (!trigger || !value || !menu) return;

  value.textContent = getMonthLabel(state.selectedMonth);

  menu.innerHTML = ["all", ...months]
    .map(
      (m) =>
        `<button type="button"
        class="month-dropdown-option ${
          m === state.selectedMonth ? "active" : ""
        }"
        data-month="${m}"
        role="option"
        aria-selected="${m === state.selectedMonth}">

        <span class="month-dropdown-check" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5">
            <path d="m5 12 4 4L19 6"></path>
          </svg>
        </span>

        <span>${getMonthLabel(m)}</span>
      </button>`,
    )
    .join("");

  trigger.onclick = (event) => {
    event.stopPropagation();
    toggleMonthDropdown(prefix);
  };

  menu.querySelectorAll(".month-dropdown-option").forEach((option) => {
    option.onclick = (event) => {
      event.stopPropagation();

      state.selectedMonth = option.dataset.month;

      closeAllMonthDropdowns();
      renderAllMonthDropdowns();
      refreshScopedUI();
    };
  });
}

function renderAllMonthDropdowns() {
  const months = getMonthsDesc();

  if (!months.includes(state.selectedMonth) && state.selectedMonth !== "all") {
    state.selectedMonth = "all";
  }

  renderMonthDropdown("home", months);
  renderMonthDropdown("history", months);
}

function renderAllMonthChipRows() {
  renderAllMonthDropdowns();
}

function refreshScopedUI() {
  renderHome();
  applyFilters();

  const chartWrapper = document.getElementById("chartWrapper");
  if (chartWrapper) {
    const skeleton = chartWrapper.querySelector(".chart-skeleton");
    if (skeleton) skeleton.remove();

    const canvas = chartWrapper.querySelector("#saldoChart");
    if (canvas) canvas.style.display = "block";
  }
}

function computeScope(monthKey) {
  if (monthKey === "all") {
    return {
      awal: state.saldoAwal,
      debet: state.totalDebet,
      kredit: state.totalKredit,
      akhir: state.saldoAkhir,
      list: state.transactions,
    };
  }

  const all = state.transactions;

  const monthTx = all.filter((t) => getMonthKey(t.tanggal) === monthKey);

  const before = all.filter((t) => getMonthKey(t.tanggal) < monthKey);

  const awal = before.length
    ? before[before.length - 1].saldo
    : state.saldoAwal;

  const debet = monthTx
    .filter((t) => !isSaldoAwalRow(t))
    .reduce((s, t) => s + t.debet, 0);

  const kredit = monthTx
    .filter((t) => !isSaldoAwalRow(t))
    .reduce((s, t) => s + t.kredit, 0);

  const akhir = monthTx.length ? monthTx[monthTx.length - 1].saldo : awal;

  return {
    awal,
    debet,
    kredit,
    akhir,
    list: monthTx,
  };
}

function computeMonthlySeries() {
  const months = [
    ...new Set(state.transactions.map((t) => getMonthKey(t.tanggal))),
  ]
    .filter(Boolean)
    .sort();

  const labels = [];
  const data = [];

  months.forEach((m) => {
    const monthTx = state.transactions.filter(
      (t) => getMonthKey(t.tanggal) === m,
    );

    if (!monthTx.length) return;

    labels.push(getMonthShortLabel(m));

    data.push(monthTx[monthTx.length - 1].saldo);
  });

  return {
    labels,
    data,
  };
}

function renderRecapList() {
  const months = getMonthsDesc();
  const wrap = $("recapList");

  if (!wrap) return;

  if (!months.length) {
    wrap.innerHTML =
      '<div class="card p-6 text-center text-[color:var(--ink-faint)] text-xs">Belum ada transaksi.</div>';

    return;
  }

  wrap.innerHTML = months
    .map((m) => {
      const s = computeScope(m);

      const [year, month] = m.split("-");

      const nextMonthDate = new Date(Number(year), Number(month), 1);

      const nextMonthKey =
        nextMonthDate.getFullYear() +
        "-" +
        String(nextMonthDate.getMonth() + 1).padStart(2, "0");

      return `
        <div
          class="card p-4 recap-card"
          data-month="${m}"
        >

          <button
            type="button"
            class="w-full text-left recap-open-history"
            data-month="${m}"
          >

            <div class="flex items-center justify-between">

              <p
                class="font-display font-extrabold text-[13.5px]"
              >
                ${getMonthLabel(m)}
              </p>

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-faint)"
                stroke-width="2"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>

            </div>

            <div class="grid grid-cols-3 gap-2 mt-3">

              <div>
                <p
                  class="eyebrow"
                  style="font-size:9.5px"
                >
                  Masuk
                </p>

                <p
                  class="mono text-[11.5px] font-bold mt-0.5"
                  style="color:var(--pos)"
                >
                  ${fmtRp(s.debet)}
                </p>
              </div>

              <div>
                <p
                  class="eyebrow"
                  style="font-size:9.5px"
                >
                  Keluar
                </p>

                <p
                  class="mono text-[11.5px] font-bold mt-0.5"
                  style="color:var(--neg)"
                >
                  ${fmtRp(s.kredit)}
                </p>
              </div>

              <div>
                <p
                  class="eyebrow"
                  style="font-size:9.5px"
                >
                  Akhir
                </p>

                <p
                  class="mono text-[11.5px] font-bold mt-0.5"
                >
                  ${fmtRp(s.akhir)}
                </p>
              </div>

            </div>

          </button>

          ${
            state.isAdmin
              ? `
      <div
        class="mt-3 pt-3"
        style="border-top:1px solid var(--line);"
      >
        <button
          type="button"
          class="btn-carry-forward w-full flex items-center justify-center gap-1.5"
          data-month="${m}"
          data-next-month="${nextMonthKey}"
          style="
            padding: 4px 12px;
            border: 1.5px solid var(--pos);
            border-radius: 6px;
            background: transparent;
            color: var(--pos);
            font-size: 10px;
            font-weight: 600;
            font-family: 'Plus Jakarta Sans', sans-serif;
            cursor: pointer;
            transition: all 0.15s ease;
            width: 100%;
          "
          onmouseover="this.style.background='var(--pos-soft)'"
          onmouseout="this.style.background='transparent'"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--pos)"
            stroke-width="2.2"
            style="flex-shrink:0;"
          >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
          <span>Saldo Awal ${getMonthLabel(nextMonthKey)}</span>
        </button>
      </div>
    `
              : ""
          }

        </div>
      `;
    })
    .join("");

  wrap.querySelectorAll(".recap-open-history").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedMonth = button.dataset.month;

      renderAllMonthChipRows();
      refreshScopedUI();
      switchTab("history");
    });
  });

  wrap.querySelectorAll(".btn-carry-forward").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      openCarryForwardConfirm(button.dataset.month, button.dataset.nextMonth);
    });
  });
}

function openCarryForwardConfirm(monthKey, nextMonthKey) {
  if (!monthKey || !nextMonthKey) return;

  const scope = computeScope(monthKey);

  state.carryForwardMonth = monthKey;
  state.carryForwardNextMonth = nextMonthKey;

  if ($("carryForwardDesc")) {
    $("carryForwardDesc").textContent =
      `Saldo akhir ${getMonthLabel(monthKey)} sebesar ${fmtRp(
        scope.akhir,
      )} akan dijadikan Saldo Awal ${getMonthLabel(nextMonthKey)}. Lanjutkan?`;
  }

  $("carryForwardOverlay")?.classList.remove("hidden");
}

function renderHome() {
  const scope = computeScope(state.selectedMonth);

  updateHeroCardLabel(state.selectedMonth === "all" ? "all" : "monthly");

  if ($("homeSaldoAkhir")) $("homeSaldoAkhir").textContent = fmtRp(scope.akhir);

  if ($("homePeriodeText")) {
    $("homePeriodeText").textContent =
      state.selectedMonth === "all"
        ? getPeriodRangeLabel()
        : getMonthLabel(state.selectedMonth);
  }

  if ($("homeTotalTx"))
    $("homeTotalTx").textContent = scope.list.length + " transaksi";

  if ($("homeSaldoAwal")) $("homeSaldoAwal").textContent = fmtRp(scope.awal);

  if ($("homeDebet")) $("homeDebet").textContent = fmtRp(scope.debet);

  if ($("homeKredit")) $("homeKredit").textContent = fmtRp(scope.kredit);

  const selisih = scope.debet - scope.kredit;

  const surplusEl = $("homeSurplus");
  const badgeEl = $("homeSurplusBadge");
  const labelEl = $("homeSurplusLabel");

  if (surplusEl && badgeEl && labelEl) {
    if (selisih > 0) {
      labelEl.textContent = "Surplus Periode Ini";

      surplusEl.textContent = "+" + fmtRp(selisih);

      surplusEl.style.color = "var(--pos)";

      badgeEl.textContent = "Surplus";
      badgeEl.style.background = "var(--pos-soft)";
      badgeEl.style.color = "var(--pos)";
    } else if (selisih < 0) {
      labelEl.textContent = "Defisit Periode Ini";

      surplusEl.textContent = "-" + fmtRp(Math.abs(selisih));

      surplusEl.style.color = "var(--neg)";

      badgeEl.textContent = "Defisit";
      badgeEl.style.background = "var(--neg-soft)";
      badgeEl.style.color = "var(--neg)";
    } else {
      labelEl.textContent = "Selisih Periode Ini";

      surplusEl.textContent = fmtRp(0);

      surplusEl.style.color = "var(--ink-soft)";

      badgeEl.textContent = "Impas";
      badgeEl.style.background = "var(--surface-alt)";
      badgeEl.style.color = "var(--ink-soft)";
    }
  }

  const recent = scope.list.slice(-5).reverse();

  renderTxList(recent, "homeRecentList", null, { compact: true });

  renderChart();
}

function renderChart() {
  const ctx = document.getElementById("saldoChart");

  if (!ctx) return;

  const { labels, data } = computeMonthlySeries();

  if (!labels.length) {
    const now = new Date();
    const currentMonthKey =
      now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    labels.push(getMonthShortLabel(currentMonthKey));
    data.push(state.saldoAwal);
  }

  // Update label periode
  if ($("chartScopeLabel")) {
    $("chartScopeLabel").textContent = labels.length + " bulan";
  }

  // Update nilai terakhir dan perubahan
  const lastValue = data[data.length - 1] || 0;
  const firstValue = data[0] || 0;
  const change =
    firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  if ($("chartLastValue")) {
    $("chartLastValue").textContent = fmtRp(lastValue);
  }

  if ($("chartChange")) {
    const changeEl = $("chartChange");
    if (change > 0) {
      changeEl.textContent = `▲ +${change.toFixed(1)}%`;
      changeEl.style.color = "var(--pos)";
    } else if (change < 0) {
      changeEl.textContent = `▼ ${change.toFixed(1)}%`;
      changeEl.style.color = "var(--neg)";
    } else {
      changeEl.textContent = `▬ 0%`;
      changeEl.style.color = "var(--ink-soft)";
    }
  }

  const dark = currentTheme() === "dark";

  // Warna modern - gradasi hijau/teal
  const lineColor = "#10b981";
  const gradientColor1 = dark
    ? "rgba(16,185,129,0.25)"
    : "rgba(16,185,129,0.15)";
  const gradientColor2 = dark
    ? "rgba(16,185,129,0.02)"
    : "rgba(16,185,129,0.01)";

  const tickColor = dark ? "#475569" : "#94a3b8";
  const gridColor = dark ? "rgba(71,85,105,0.15)" : "rgba(148,163,184,0.12)";
  const textColor = dark ? "#94a3b8" : "#64748b";

  if (state.chart) state.chart.destroy();

  // Buat gradient fill
  const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 160);
  gradient.addColorStop(0, gradientColor1);
  gradient.addColorStop(1, gradientColor2);

  state.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Saldo Akhir Bulan",
          data: data,
          borderColor: lineColor,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: lineColor,
          pointBorderColor: dark ? "#1e293b" : "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: dark
            ? "rgba(30,41,59,0.92)"
            : "rgba(255,255,255,0.92)",
          titleColor: dark ? "#f1f5f9" : "#0f172a",
          bodyColor: dark ? "#e2e8f0" : "#334155",
          borderColor: dark ? "rgba(71,85,105,0.2)" : "rgba(148,163,184,0.2)",
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          callbacks: {
            label: function (context) {
              return fmtRp(context.parsed.y);
            },
            title: function (items) {
              return items[0].label;
            },
          },
        },
      },
      scales: {
        x: {
          type: "category",
          ticks: {
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0,
            font: {
              size: 8,
              weight: "500",
            },
            color: tickColor,
            padding: 4,
          },
          grid: {
            display: false,
            drawBorder: false,
          },
          border: {
            display: false,
          },
        },
        y: {
          display: true,
          position: "right",
          ticks: {
            font: {
              size: 8,
              weight: "500",
            },
            color: tickColor,
            padding: 6,
            maxTicksLimit: 6,
            callback: function (value) {
              if (value >= 1000000) return (value / 1000000).toFixed(0) + "jt";
              if (value >= 1000) return (value / 1000).toFixed(0) + "rb";
              return value.toFixed(0);
            },
          },
          grid: {
            color: gridColor,
            drawBorder: false,
            lineWidth: 0.8,
          },
          border: {
            display: false,
          },
        },
      },
      elements: {
        line: {
          tension: 0.4,
        },
        point: {
          hoverRadius: 6,
        },
      },
      animation: {
        duration: 800,
        easing: "easeOutQuart",
      },
    },
  });
}

function renderSummaryHistory(scope, monthKey) {
  if ($("rySaldoAwal")) $("rySaldoAwal").textContent = fmtRp(scope.awal);

  if ($("rySaldoAkhir")) $("rySaldoAkhir").textContent = fmtRp(scope.akhir);

  if ($("periodHint")) {
    $("periodHint").textContent =
      "Menampilkan: " +
      getMonthLabel(monthKey) +
      " · " +
      scope.list.length +
      " transaksi";
  }
}

function txIconSvg(isDebet) {
  return isDebet
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pos)" stroke-width="2.3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neg)" stroke-width="2.3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
}

function toTitleCase(str) {
  if (!str) return "";

  const specialUpper = new Set([
    "CAI",
    "PLN",
    "OVO",
    "ATM",
    "EDC",
    "BCA",
    "BNI",
    "BRI",
    "BSI",
  ]);

  const lowerWords = new Set([
    "dan",
    "ke",
    "di",
    "dari",
    "yang",
    "untuk",
    "pada",
    "atau",
    "via",
    "by",
    "dengan",
    "dalam",
  ]);

  return str
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      const upperWord = word.toUpperCase();

      const cleanUpper = upperWord.replace(/[^A-Z0-9]/g, "");

      if (specialUpper.has(cleanUpper)) return upperWord;

      const hasNoVowels = !/[AEIOU]/.test(cleanUpper);

      if (cleanUpper.length >= 2 && cleanUpper.length <= 4 && hasNoVowels) {
        return upperWord;
      }

      const lowerWord = word.toLowerCase();

      if (index > 0 && lowerWords.has(lowerWord)) {
        return lowerWord;
      }

      return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    })
    .join(" ");
}

function renderTxList(rows, containerId, emptyId, opts) {
  opts = opts || {};

  const body = $(containerId);

  if (!body) return;

  if (!rows.length) {
    body.innerHTML = opts.compact
      ? '<p class="text-center py-6 text-[color:var(--ink-faint)] text-xs">Belum ada transaksi.</p>'
      : "";

    if (emptyId && $(emptyId)) {
      $(emptyId).classList.remove("hidden");
    }

    return;
  }

  if (emptyId && $(emptyId)) {
    $(emptyId).classList.add("hidden");
  }

  body.innerHTML = rows
    .map((t) => {
      const isAwal = isSaldoAwalRow(t);

      const isDebet = Number(t.debet) > 0;

      const amount = isDebet ? t.debet : t.kredit;

      const amountColor = isAwal
        ? "var(--ink-soft)"
        : isDebet
          ? "var(--pos)"
          : "var(--neg)";

      const amountPrefix = isAwal ? "" : isDebet ? "+" : "-";

      const iconBg = isAwal
        ? "var(--gold-soft)"
        : isDebet
          ? "var(--pos-soft)"
          : "var(--neg-soft)";

      const icon = isAwal
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.3"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>'
        : txIconSvg(isDebet);

      const isClickable = state.isAdmin === true;

      const chevron = isClickable
        ? '<svg class="tx-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>'
        : "";

      return `
  <div class="tx-card${isClickable ? " tx-card-clickable" : ""}"${
    isClickable ? ` data-no="${t.no}" role="button" tabindex="0"` : ""
  }>

    <div
      class="tx-icon"
      style="background:${iconBg}"
    >
      ${icon}
    </div>

    <div class="flex-1 min-w-0">

      <p class="tx-title">
        ${escapeHtml(toTitleCase(t.keterangan))}
      </p>

      <p class="tx-sub">
        ${escapeHtml(toTitleCase(t.account))}
      </p>

      <p class="tx-meta">
        ${fmtDateShort(t.tanggal)}
        ${t.createdBy ? " · " + escapeHtml(t.createdBy) : ""}
      </p>

    </div>

    <div
      class="text-right flex-shrink-0"
    >

      <p
        class="tx-amount mono"
        style="color:${amountColor}"
      >
        ${amountPrefix}${fmtRp(amount)}
      </p>

      <p
        class="text-[9.5px] mono text-[color:var(--ink-faint)] mt-0.5"
      >
        ${fmtRp(t.saldo)}
      </p>

    </div>

    ${chevron}

  </div>`;
    })
    .join("");
}

// ============================================================
// PRINT LAPORAN KEUANGAN
// ============================================================

function buildPrintTable(rows) {
  const body = document.getElementById("printTableBody");
  if (!body) return;

  // Jika rows kosong atau undefined
  if (!rows || rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;font-size:9px;">
          Tidak ada transaksi untuk periode ini.
        </td>
      </tr>
    `;
    updatePrintTotals([]);
    return;
  }

  // Build table rows dengan data yang valid
  body.innerHTML = rows
    .map((t, idx) => {
      const no = idx + 1;
      const tanggal = t.tanggal ? fmtDateShort(t.tanggal) : "-";
      const keterangan = t.keterangan
        ? escapeHtml(toTitleCase(t.keterangan))
        : "-";
      const debet = Number(t.debet) || 0;
      const kredit = Number(t.kredit) || 0;
      const saldo = Number(t.saldo) || 0;

      return `
        <tr>
          <td style="text-align:center;">${no}</td>
          <td>${tanggal}</td>
          <td>${keterangan}</td>
          <td class="num">${debet > 0 ? fmtRp(debet) : "—"}</td>
          <td class="num">${kredit > 0 ? fmtRp(kredit) : "—"}</td>
          <td class="num">${fmtRp(saldo)}</td>
        </tr>
      `;
    })
    .join("");

  updatePrintTotals(rows);
}

function updatePrintTotals(rows) {
  const totalDebet = rows.reduce((sum, t) => sum + (Number(t.debet) || 0), 0);
  const totalKredit = rows.reduce((sum, t) => sum + (Number(t.kredit) || 0), 0);
  const lastSaldo =
    rows.length > 0 ? Number(rows[rows.length - 1].saldo) || 0 : 0;

  const debetEl = document.getElementById("printTotalDebet");
  const kreditEl = document.getElementById("printTotalKredit");
  const saldoEl = document.getElementById("printTotalSaldo");

  if (debetEl) debetEl.textContent = fmtRp(totalDebet);
  if (kreditEl) kreditEl.textContent = fmtRp(totalKredit);
  if (saldoEl) saldoEl.textContent = fmtRp(lastSaldo);
}

function printReport() {
  const area = document.getElementById("printArea");

  if (!area) {
    window.print();
    return;
  }

  const monthKey = state.selectedMonth || "all";
  const scope = computeScope(monthKey);

  const searchEl = document.getElementById("searchInput");
  const q = searchEl ? searchEl.value.trim().toLowerCase() : "";

  let rows = scope.list || [];

  if (q) {
    rows = rows.filter((t) =>
      `${t.tanggal} ${t.account || ""} ${t.keterangan || ""}`
        .toLowerCase()
        .includes(q),
    );
  }

  const periodEl = document.getElementById("printPeriod");

  if (periodEl) {
    periodEl.textContent =
      state.selectedMonth === "all"
        ? getPeriodRangeLabel()
        : getMonthLabel(state.selectedMonth);
  }

  buildPrintTable(rows);

  // Tandai bahwa yang sedang dicetak adalah laporan kas
  document.body.classList.add("printing-finance");

  const restore = () => {
    document.body.classList.remove("printing-finance");

    area.style.display = "";
    area.style.position = "";
    area.style.left = "";
    area.style.top = "";
    area.style.zIndex = "";
    area.style.background = "";
    area.style.width = "";
    area.style.height = "";
  };

  area.style.display = "block";
  area.style.position = "fixed";
  area.style.left = "-9999px";
  area.style.top = "0";
  area.style.zIndex = "999998";
  area.style.background = "white";
  area.style.width = "100%";
  area.style.height = "100%";

  void area.offsetHeight;

  window.addEventListener("afterprint", restore, { once: true });

  window.print();

  setTimeout(restore, 2000);
}

// ============================================================
// PRINT SHODAQOH - VERSI LENGKAP (SATU FUNGSI SAJA)
// ============================================================

function printShodaqohReport() {
  const monthKey = state.shodaqoh.selectedMonth;
  if (!monthKey) {
    showToast("Pilih bulan terlebih dahulu.", "error");
    return;
  }

  const payments = state.shodaqoh.payments || [];
  if (payments.length === 0) {
    showToast("Belum ada data pembayaran untuk bulan ini.", "error");
    return;
  }

  const area = document.getElementById("printShodaqohArea");
  if (!area) return;

  // 1. Set Judul Periode
  const periodEl = document.getElementById("printShodaqohPeriod");
  if (periodEl) {
    periodEl.textContent = "Periode: " + getMonthLabel(monthKey);
  }

  // 2. Filter data berdasarkan bulan yang dipilih
  const filteredPayments = payments.filter(function (p) {
    return String(p.tanggal).slice(0, 7) === monthKey;
  });

  // 3. Kumpulkan semua bulan susulan unik dan URUTKAN TERBALIK (dari terbaru ke terlama)
  let allSusulanMonths = new Set();
  filteredPayments.forEach(function (p) {
    if (p.susulan_bulan) {
      let bulanArray = [];
      if (typeof p.susulan_bulan === "string") {
        bulanArray = p.susulan_bulan.split(",").filter(Boolean);
      } else if (Array.isArray(p.susulan_bulan)) {
        bulanArray = p.susulan_bulan;
      }
      bulanArray.forEach(function (key) {
        if (key.length === 7) {
          allSusulanMonths.add(key);
        }
      });
    }
  });

  // Urutkan dari yang TERBARU ke TERLAMA
  let sortedSusulanMonths = Array.from(allSusulanMonths).sort().reverse();

  // B A T A S I : Hanya ambil 3 BULAN TERAKHIR saja
  if (sortedSusulanMonths.length > 3) {
    sortedSusulanMonths = sortedSusulanMonths.slice(0, 3);
  }

  // Balik urutannya agar tampil dari yang TERLAMA ke TERBARU (untuk tampilan tabel)
  let displaySusulanMonths = [...sortedSusulanMonths].reverse();

  const thead = document.getElementById("printShodaqohHead");
  const body = document.getElementById("printShodaqohBody");
  const tfoot = document.getElementById("printShodaqohFoot");
  if (!thead || !body || !tfoot) return;

  // 3.5 UPDATE COLGROUP dengan kolom IR dinamis
  const table = document.getElementById("printShodaqohTable");
  if (table) {
    let colgroupHTML = `
      <col class="col-no" />
      <col class="col-nama" />
    `;

    // Tambahkan col untuk setiap bulan susulan
    displaySusulanMonths.forEach(function () {
      colgroupHTML += `<col class="col-ir" />`;
    });

    // Tambahkan col untuk kolom lainnya
    colgroupHTML += `
      <col class="col-sambung" />
      <col class="col-jimpitan" />
      <col class="col-siar" />
      <col class="col-seribuan" />
      <col class="col-kafan" />
      <col class="col-ukhro" />
      <col class="col-total" />
    `;

    // Ganti colgroup
    const oldColgroup = table.querySelector("colgroup");
    if (oldColgroup) {
      oldColgroup.innerHTML = colgroupHTML;
    }
  }

  // 4. Siapkan variabel total
  let totalIr = {};
  let totalSambung = 0,
    totalJimpitan = 0,
    totalSiar = 0;
  let totalSeribuan = 0,
    totalKafan = 0,
    totalUkhro = 0,
    grandTotal = 0;

  displaySusulanMonths.forEach(function (m) {
    totalIr[m] = 0;
  });

  // 5. BANGUN HEADER 2 BARIS
  let headerHTML = "";

  // --- BARIS PERTAMA (Header Utama) ---
  headerHTML += `<tr>`;
  headerHTML += `<th rowspan="2" style="text-align:left;width:3%;">No</th>`;
  headerHTML += `<th rowspan="2" style="text-align:left;width:16%;">Nama Anggota</th>`;

  // Kolom Infak IR (colspan untuk 3 bulan)
  const irColspan =
    displaySusulanMonths.length > 0 ? displaySusulanMonths.length : 1;
  headerHTML += `<th colspan="${irColspan}" style="text-align:center;width:${irColspan * 12}%;">Infak IR (Susulan)</th>`;

  // Kolom Lainnya (masing-masing dengan rowspan 2) - RATA KANAN
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Uang Sambung</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Jimpitan</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Siar-siar</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Seribuan</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Kafan</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Ukhro MT</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:9%;">Total</th>`;
  headerHTML += `</tr>`;

  // --- BARIS KEDUA (Sub-Header untuk Infak IR) ---
  headerHTML += `<tr>`;

  // Sub-Header untuk Infak IR (Bulan-bulan) - RATA KANAN
  if (displaySusulanMonths.length > 0) {
    displaySusulanMonths.forEach(function (key) {
      const y = key.slice(2, 4);
      const m = parseInt(key.slice(5, 7));
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
      headerHTML += `<th style="text-align:right;width:12%;">${monthNames[m - 1]}'${y}</th>`;
    });
  } else {
    headerHTML += `<th style="text-align:right;width:12%;">—</th>`;
  }
  headerHTML += `</tr>`;

  // 6. BANGUN BODY TABEL
  let bodyHTML = filteredPayments
    .map(function (p, idx) {
      const no = idx + 1;
      const nama = p.nama || "-";

      const sambung = Number(p.uang_sambung || 0);
      const jimpitan = Number(p.jimpitan || 0);
      const siar = Number(p.siar_siar || 0);
      const seribuan = Number(p.seribuan || 0);
      const kafan = Number(p.kafan || 0);
      const ukhro = Number(p.ukhro_mt || 0);

      // Ambil data IR per bulan
      let irData = {};
      if (p.susulan_bulan) {
        let bulanArray = [];
        if (typeof p.susulan_bulan === "string") {
          bulanArray = p.susulan_bulan.split(",").filter(Boolean);
        } else if (Array.isArray(p.susulan_bulan)) {
          bulanArray = p.susulan_bulan;
        }

        if (bulanArray.length > 0) {
          const totalIR = Number(p.susulan_ir || 0);
          let irPerBulan = Math.round(totalIR / bulanArray.length);

          bulanArray.forEach(function (key) {
            if (key.length === 7 && displaySusulanMonths.includes(key)) {
              irData[key] = irPerBulan;
              if (totalIr[key] !== undefined) {
                totalIr[key] += irPerBulan;
              }
            }
          });
        }
      }

      let rowHTML = `<tr>
        <td style="text-align:left;padding:6px 4px;font-size:9.5px;">${no}</td>
        <td style="text-align:left;padding:6px 4px;font-size:9.5px;">${escapeHtml(nama)}</td>`;

      // Tampilkan IR per bulan - RATA KANAN
      displaySusulanMonths.forEach(function (key) {
        let val = irData[key] || 0;
        rowHTML += `<td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${val > 0 ? fmtRp(val) : "—"}</td>`;
      });

      // Kolom lainnya - RATA KANAN
      rowHTML += `
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${sambung > 0 ? fmtRp(sambung) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${jimpitan > 0 ? fmtRp(jimpitan) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${siar > 0 ? fmtRp(siar) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${seribuan > 0 ? fmtRp(seribuan) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${kafan > 0 ? fmtRp(kafan) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${ukhro > 0 ? fmtRp(ukhro) : "—"}</td>`;

      // Total per baris - RATA KANAN
      let total = sambung + jimpitan + siar + seribuan + kafan + ukhro;
      displaySusulanMonths.forEach(function (key) {
        total += irData[key] || 0;
      });

      rowHTML += `<td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(total)}</td>
      </tr>`;

      // Akumulasi total footer
      totalSambung += sambung;
      totalJimpitan += jimpitan;
      totalSiar += siar;
      totalSeribuan += seribuan;
      totalKafan += kafan;
      totalUkhro += ukhro;
      grandTotal += total;

      return rowHTML;
    })
    .join("");

  // 7. BANGUN FOOTER
  let footerHTML = "";

  // Baris 1: Total Keseluruhan per kolom
  footerHTML += `<tr class="print-total-saldo">`;
  footerHTML += `<td colspan="2" class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">TOTAL KESELURUHAN</td>`;

  // Total per bulan IR - RATA KANAN
  displaySusulanMonths.forEach(function (key) {
    footerHTML += `<td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${totalIr[key] > 0 ? fmtRp(totalIr[key]) : "—"}</td>`;
  });

  // Total lainnya - RATA KANAN
  footerHTML += `
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalSambung)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalJimpitan)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalSiar)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalSeribuan)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalKafan)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalUkhro)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(grandTotal)}</td>
  `;
  footerHTML += `</tr>`;

  // Baris 2: Grand Total Infak IR
  if (displaySusulanMonths.length > 0) {
    footerHTML += `<tr class="print-grand-total-ir" style="background: #e8f5e9 !important;">`;
    footerHTML += `<td colspan="2" class="num font-bold" style="background: #e8f5e9 !important; color: #1e293b !important; text-align:right;padding:6px 4px;font-size:9.5px;">GRAND TOTAL IR</td>`;

    displaySusulanMonths.forEach(function (key) {
      footerHTML += `<td class="num font-bold" style="background: #e8f5e9 !important; color: #1e293b !important; text-align:right;padding:6px 4px;font-size:9.5px; border-top: 2px solid #16a34a;">${totalIr[key] > 0 ? fmtRp(totalIr[key]) : "—"}</td>`;
    });

    const otherCols = 7;
    footerHTML += `<td colspan="${otherCols}" style="background: #e8f5e9 !important; border-top: 2px solid #16a34a; padding:6px 4px;"></td>`;
    footerHTML += `</tr>`;
  }

  // 8. GABUNGKAN SEMUA & RENDER
  thead.innerHTML = headerHTML;
  body.innerHTML = bodyHTML;
  tfoot.innerHTML = footerHTML;

  // 9. PROSES PRINT
  const prevDisplay = area.style.display;
  area.style.display = "block";
  area.style.position = "fixed";
  area.style.left = "-9999px";
  area.style.top = "0";
  area.style.zIndex = "999999";
  area.style.background = "white";
  area.style.width = "100%";
  area.style.height = "100%";

  void area.offsetHeight;

  const restore = () => {
    area.style.display = prevDisplay || "none";
    area.style.position = "";
    area.style.left = "";
    area.style.top = "";
    area.style.zIndex = "";
    area.style.background = "";
    area.style.width = "";
    area.style.height = "";

    document.body.classList.remove("printing-shodaqoh");
  };

  document.body.classList.add("printing-shodaqoh");
  window.print();
  window.removeEventListener("afterprint", restore);
  window.addEventListener("afterprint", restore, { once: true });
  setTimeout(restore, 2000);
}

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

// ============================================================
// NAVIGASI PROGRAMATIK (untuk digunakan di mana saja)
// ============================================================

// Fungsi navigasi global
window.navigateTo = function (route) {
  if (router && typeof router.navigateTo === "function") {
    router.navigateTo(route);
  }
};

// ============================================================
// UPDATE switchTab - Gunakan Router jika tersedia
// ============================================================

// Simpan referensi ke switchTab asli
const originalSwitchTab = switchTab;

// Override switchTab untuk menggunakan router
switchTab = function (tab) {
  // Jika router tersedia dan belum dalam proses navigasi, gunakan router
  if (router && router.initialized && !router._isNavigating) {
    const currentRoute = router.getCurrentRoute();
    if (currentRoute !== tab) {
      router.navigateTo(tab);
      return;
    }
  }

  // Fallback ke implementasi asli
  if (typeof originalSwitchTab === "function") {
    originalSwitchTab(tab);
  } else {
    // Implementasi manual jika original tidak tersedia
    state.activeTab = tab;

    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.remove("active"));

    const targetScreen = $("screen-" + tab);
    if (targetScreen) targetScreen.classList.add("active");

    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));

    if ($("screenTitle")) {
      const titles = {
        home: "Beranda",
        history: "Riwayat",
        recap: "Rekap",
        shodaqoh: "Shodaqoh",
        profile: "Profil",
      };
      $("screenTitle").textContent = titles[tab] || tab;
    }

    updateFabVisibility();

    document.querySelector("main")?.scrollTo({ top: 0 });

    if (tab === "shodaqoh" && !state.shodaqoh.loaded) {
      loadShodaqohData();
    }
  }
};

// ============================================================
// INITIALIZE - Hanya event listener
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  // Cek apakah sudah authenticated
  if (!document.documentElement.classList.contains("authenticated")) {
    // Jika belum, jangan jalankan apapun yang butuh auth
    return;
  }

  // Hanya jalankan jika sudah authenticated
  setupEventListeners();
});

function setTxJenis(jenis) {
  state.txJenis = jenis;

  if ($("segDebet"))
    $("segDebet").classList.toggle("active-debet", jenis === "debet");

  if ($("segKredit"))
    $("segKredit").classList.toggle("active-kredit", jenis === "kredit");
}

const SHOD_STATUS_LABELS = {
  ALL: "Semua",
  LUNAS: "Lunas",
  BELUM: "Belum",
};

async function loadShodaqohData(monthKey) {
  try {
    renderShodaqohSkeleton();

    const month = monthKey || state.shodaqoh.selectedMonth || "";
    const data = await apiGetShodaqoh(month);

    if (!data.success) {
      throw new Error(data.message || "Gagal memuat data");
    }

    if (state.shodaqoh.loadingPromise) {
      return state.shodaqoh.loadingPromise;
    }

    const container = document.querySelector("#screen-shodaqoh");
    if (container) {
      container
        .querySelectorAll(".shod-skeleton-wrapper")
        .forEach((el) => el.remove());

      const children = container.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (
          !child.classList ||
          !child.classList.contains("shod-skeleton-wrapper")
        ) {
          child.style.display = "";
        }
      }
    }

    state.shodaqoh.loaded = true;
    state.shodaqoh.currentMonth = data.currentMonth || "";
    state.shodaqoh.selectedMonth =
      data.selectedMonth || data.currentMonth || "";
    state.shodaqoh.dashboard = data.dashboard || {};
    state.shodaqoh.members = data.members || [];
    state.shodaqoh.monitoring = data.monitoring || [];
    state.shodaqoh.payments = data.payments || [];

    if (!state.shodaqoh.filters.year) {
      state.shodaqoh.filters.year = String(state.shodaqoh.selectedMonth).slice(
        0,
        4,
      );
    }
    if (!state.shodaqoh.filters.month) {
      state.shodaqoh.filters.month = String(state.shodaqoh.selectedMonth).slice(
        5,
        7,
      );
    }

    renderShodaqohDashboard();
    renderShodaqohAllocation();
    renderShodaqohFilters();
    renderShodaqohTabs();

    const postStatus = $("shodPostStatus");
    if (postStatus) {
      const payments = state.shodaqoh.payments || [];
      const allPosted =
        payments.length > 0 &&
        payments.every(function (p) {
          return String(p.kas_transaction_no || "").includes("POSTED");
        });
      postStatus.classList.toggle("hidden", !allPosted);
    }
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat Shodaqoh IR: " + err.message, "error");
    renderShodaqohError(err.message);
  }
}

function renderShodaqohScreen() {
  renderShodaqohDashboard();
  renderShodaqohAllocation();
  renderShodaqohFilters();
  renderShodaqohTabs();
}

function renderShodaqohDashboard() {
  const d = state.shodaqoh.dashboard || {};
  const set = (id, v) => {
    if ($(id)) $(id).textContent = v;
  };

  set("shodTarget", fmtRp(d.target || 0));
  set("shodReceived", fmtRp(d.received || 0));
  set("shodPaidCount", String(d.paidCount || 0));
  set("shodUnpaidCount", String(d.unpaidCount || 0));
  set("shodMemberCount", String(d.memberCount || 0));
  set("shodMonthLabel", getMonthLabel(state.shodaqoh.selectedMonth));

  // Ubah warna Pembayaran jika lebih dari 0
  const receivedEl = $("shodReceived");
  if (receivedEl && d.received > 0) {
    receivedEl.style.color = "var(--pos)";
  } else if (receivedEl) {
    receivedEl.style.color = "var(--ink)";
  }

  const postStatus = $("shodPostStatus");
  if (postStatus) {
    const payments = state.shodaqoh.payments || [];
    const allPosted =
      payments.length > 0 &&
      payments.every(function (p) {
        return String(p.kas_transaction_no || "").includes("POSTED");
      });
    postStatus.classList.toggle("hidden", !allPosted);
  }
}

function renderShodaqohAllocation() {
  const payments = state.shodaqoh.payments || [];

  let totalSusulanIr = 0;
  let totalUangSambung = 0;
  let totalJimpitan = 0;
  let totalSiarSiar = 0;
  let totalSeribuan = 0;
  let totalKafan = 0;
  let totalUkhroMt = 0;

  payments.forEach(function (p) {
    const uangSambung = p.uang_sambung || p.uang || 0;
    totalSusulanIr += Number(p.susulan_ir || 0);
    totalUangSambung += Number(uangSambung);
    totalJimpitan += Number(p.jimpitan || 0);
    totalSiarSiar += Number(p.siar_siar || 0);
    totalSeribuan += Number(p.seribuan || 0);
    totalKafan += Number(p.kafan || 0);
    totalUkhroMt += Number(p.ukhro_mt || 0);
  });

  // Dana Kesehatan = 20% dari Uang Sambung
  const danaKesehatan = totalUangSambung * 0.2;
  const uangSambungAfterKesehatan = totalUangSambung - danaKesehatan;

  const set = function (id, v) {
    const el = $(id);
    if (el) el.textContent = v;
  };

  set("shodTotalSusulanIr", fmtRp(totalSusulanIr));
  set("shodTotalUangSambung", fmtRp(totalUangSambung));
  set("shodTotalJimpitan", fmtRp(totalJimpitan));
  set("shodTotalSiarSiar", fmtRp(totalSiarSiar));
  set("shodTotalSeribuan", fmtRp(totalSeribuan));
  set("shodTotalKafan", fmtRp(totalKafan));
  set("shodTotalUkhroMt", fmtRp(totalUkhroMt));
  set("shodTotalDanaKesehatan", fmtRp(danaKesehatan));

  // Tampilkan sisa Uang Sambung setelah dipotong Dana Kesehatan
  const uangSambungEl = $("shodUangSambungAfterKesehatan");
  if (uangSambungEl) {
    const sisa = totalUangSambung - danaKesehatan;
    uangSambungEl.textContent = `sisa: ${fmtRp(sisa)}`;
    uangSambungEl.style.color =
      danaKesehatan > 0 ? "var(--pos)" : "var(--ink-faint)";
    uangSambungEl.style.fontWeight = danaKesehatan > 0 ? "600" : "normal";
  }
}

function getFilteredMonitoringRows() {
  const f = state.shodaqoh.filters;
  return (state.shodaqoh.monitoring || [])
    .filter((r) => !f.memberId || String(r.member_id) === String(f.memberId))
    .filter((r) => f.status === "ALL" || r.status === f.status);
}

function renderShodaqohMonitoring() {
  const body = $("shodMonitoringBody");
  if (!body) return;

  const f = state.shodaqoh.filters;

  const rows = (state.shodaqoh.monitoring || []).filter(function (r) {
    if (f.memberId && String(r.member_id) !== String(f.memberId)) return false;
    if (f.status !== "ALL" && r.status !== f.status) return false;
    return true;
  });

  const totalMembers = state.shodaqoh.monitoring?.length || 0;
  const lunasCount = rows.filter((r) => r.status === "LUNAS").length;
  const belumCount = rows.filter(
    (r) => r.status === "BELUM" || r.status === "PENDING",
  ).length;
  const filteredCount = rows.length;

  const headerEl = document.querySelector(".shod-monitoring-header");
  if (headerEl) {
    headerEl.innerHTML = `
      <div>
        <span class="text-[12px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)]">
          Monitoring
        </span>
        <span class="text-[10px] text-[color:var(--ink-faint)] ml-2">
          ${filteredCount} dari ${totalMembers} anggota
        </span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[10px] text-[color:var(--pos)]">● ${lunasCount} Lunas</span>
        <span class="text-[10px] text-[color:var(--neg)]">● ${belumCount} Belum</span>
      </div>
    `;
  }

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-[11px] text-[color:var(--ink-faint)]">
      Tidak ada data sesuai filter.
    </td></tr>`;
    return;
  }

  function getBadgeClass(r) {
    const totalPaid = r.total_paid || 0;
    const target = r.target || 0;
    const status = r.status || "BELUM";

    if (status === "LUNAS") return "badge-success";
    if (totalPaid === 0) return "badge-danger";
    if (totalPaid < target) return "badge-warning";
    if (totalPaid >= target) return "badge-success";
    return "badge-secondary";
  }

  function getBadgeLabel(r) {
    const totalPaid = r.total_paid || 0;
    const target = r.target || 0;
    const status = r.status || "BELUM";

    if (status === "LUNAS") return "Lunas ✓";
    if (totalPaid === 0) return "Belum Bayar";
    if (totalPaid < target) return `Kurang ${fmtRp(target - totalPaid)}`;
    if (totalPaid >= target) return "Lunas ✓";
    return "—";
  }

  body.innerHTML = rows
    .map(function (r) {
      let formattedDate = "—";
      if (r.allocated_at) {
        const d = new Date(r.allocated_at);
        if (!isNaN(d.getTime())) {
          formattedDate = fmtDateShort(r.allocated_at);
        }
      }

      const badgeClass = getBadgeClass(r);
      const badgeLabel = getBadgeLabel(r);
      const totalPaid = r.total_paid || 0;
      const paymentId = r.payment_id || "";

      const clickAction = paymentId
        ? `openShodaqohPaymentDetail('${escapeHtml(paymentId)}')`
        : `showToast('Member ini belum melakukan pembayaran untuk bulan ini', 'warning')`;

      return `<tr class="border-t border-[color:var(--line)] cursor-pointer hover:bg-[color:var(--surface-hover)] transition-colors" 
              onclick="${clickAction}"
              title="${paymentId ? "Klik untuk lihat detail pembayaran" : "Belum ada pembayaran"}">
        <td class="py-2.5 pr-2 font-semibold text-[12px] truncate max-w-[80px]">${escapeHtml(r.nama)}</td>
        <td class="py-2.5 mono text-[11.5px] text-right tabular-nums whitespace-nowrap">${fmtRp(r.target)}</td>
        <td class="py-2.5 mono text-[11.5px] text-right tabular-nums whitespace-nowrap">${fmtRp(totalPaid)}</td>
        <td class="py-2.5 text-center whitespace-nowrap">
          <span class="badge-status ${badgeClass}" style="font-size:8.5px;padding:2.5px 10px;border-radius:999px;font-weight:600;white-space:nowrap;display:inline-block;">
            ${badgeLabel}
          </span>
        </td>
        <td class="py-2.5 text-[10px] text-[color:var(--ink-soft)] whitespace-nowrap">
          ${formattedDate}
        </td>
      </tr>`;
    })
    .join("");
}

// Tambahkan CSS untuk hover effect
const hoverStyle = document.createElement("style");
hoverStyle.textContent = `
  #shodMonitoringBody tr:hover {
    background-color: var(--surface-hover);
    transition: background-color 0.15s ease;
  }
  #shodMonitoringBody tr {
    cursor: pointer;
  }
`;
document.head.appendChild(hoverStyle);

function renderShodaqohMembers() {
  const body = $("shodMembersList");
  if (!body) return;

  const members = state.shodaqoh.members || [];
  const isAdmin = isAdminUser();

  // Tampilkan anggota tanpa data pembayaran
  body.innerHTML = `
    <div class="shod-members-container">
      <div class="shod-members-header">
        <div class="shod-members-title">
          <span>Kelola Anggota</span>
        </div>
        <div class="shod-members-header-right">
          <span class="shod-members-count">${members.length} anggota</span>
          ${
            isAdmin
              ? `
            <button type="button" id="shodAddMemberBtn" class="shod-members-add">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Tambah</span>
            </button>
          `
              : ""
          }
        </div>
      </div>

      <div class="shod-members-scroll" id="shodMembersScroll">
        ${
          members.length === 0
            ? `
          <div class="shod-members-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21a8 8 0 1 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p>Belum ada anggota.</p>
            ${
              isAdmin
                ? `
              <button type="button" id="shodAddFirstMember">+ Tambah anggota pertama</button>
            `
                : ""
            }
          </div>
        `
            : `
          <div class="shod-members-items">
            ${members
              .map(function (m) {
                const statusClass =
                  m.status === "AKTIF" ? "status-active" : "status-inactive";
                const statusLabel = m.status || "AKTIF";

                return `
                <button type="button" class="tx-card w-full text-left ${isAdmin ? "tx-card-clickable" : ""}" 
                        data-shod-member="${escapeHtml(m.member_id)}" role="button" tabindex="0">
                  <div class="flex-1 min-w-0">
                    <p class="tx-title">${escapeHtml(m.nama)}</p>
                    <p class="tx-meta flex items-center gap-2">
                      <span class="mono">${fmtRp(m.nominal_bulanan)}</span>
                      <span class="w-1 h-1 rounded-full bg-[color:var(--ink-faint)]"></span>
                      <span class="status-pill ${statusClass}" style="font-size:8px;padding:2px 10px;">
                        ${escapeHtml(statusLabel)}
                      </span>
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    ${isAdmin ? `<span class="tx-chevron" aria-hidden="true">›</span>` : ""}
                  </div>
                </button>
              `;
              })
              .join("")}
          </div>
        `
        }
      </div>
    </div>
  `;

  // Event listeners untuk tombol tambah
  const addBtn = $("shodAddMemberBtn");
  if (addBtn && isAdmin) {
    addBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof openShodMemberForm === "function") {
        openShodMemberForm(null);
      }
    });
  }

  const addFirstBtn = $("shodAddFirstMember");
  if (addFirstBtn && isAdmin) {
    addFirstBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof openShodMemberForm === "function") {
        openShodMemberForm(null);
      }
    });
  }
}

function renderShodaqohTabs() {
  const container = document.querySelector("#screen-shodaqoh");
  if (!container) return;

  // Hapus tabs container yang lama jika ada
  const oldTabsContainer = container.querySelector(".shod-tabs-container");
  if (oldTabsContainer) oldTabsContainer.remove();

  // Hapus content container yang lama
  const oldContentContainer = container.querySelector(
    ".shod-tabs-content-container",
  );
  if (oldContentContainer) oldContentContainer.remove();

  // Buat tabs container
  const tabsHtml = `
    <div class="shod-tabs-container" style="
      position: relative;
      z-index: 1;
      background: transparent;
      padding: 12px 0 10px 0;
      margin: 0;
    ">
      <div class="shod-tabs" style="
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 6px;
      ">
        <button class="shod-tab active" data-tab="shod-monitoring" style="
          padding: 8px 0;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--brand);
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        ">
          Monitoring
        </button>
        <button class="shod-tab" data-tab="shod-members" style="
          padding: 8px 0;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--surface);
          color: var(--ink-soft);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        ">
          Anggota
        </button>
        <button class="shod-tab" data-tab="shod-payments" style="
          padding: 8px 0;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--surface);
          color: var(--ink-soft);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        ">
          Riwayat
        </button>
      </div>
    </div>
  `;

  // Cari card filter atau allocation untuk menempatkan tabs
  const filterCard = container.querySelector(".card:has(.filter-group)");
  if (filterCard) {
    filterCard.insertAdjacentHTML("afterend", tabsHtml);
  } else {
    const allocationCard = container.querySelector(
      ".card:has(#shodTotalSusulanIr)",
    );
    if (allocationCard) {
      allocationCard.insertAdjacentHTML("afterend", tabsHtml);
    } else {
      container.insertAdjacentHTML("beforeend", tabsHtml);
    }
  }

  // Buat container untuk konten tab
  const tabsContainer = container.querySelector(".shod-tabs-container");
  const contentContainer = document.createElement("div");
  contentContainer.className = "shod-tabs-content-container";
  contentContainer.style.cssText = "margin-top:8px;";

  // === TAB 1: Monitoring ===
  const monitoringContent = document.createElement("div");
  monitoringContent.className =
    "shod-tab-content shod-tab-content-shod-monitoring";
  monitoringContent.style.display = "block";
  monitoringContent.innerHTML = `
    <div class="card p-4">
      <div class="shod-monitoring-wrapper">
        <div class="shod-monitoring-header" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 0 12px 0;
          border-bottom: 1px solid var(--line);
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 6px;
        ">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)]">
              Monitoring
            </span>
            <span class="text-[9px] text-[color:var(--ink-faint)] ml-2" id="shodMemberCount">
              0 anggota
            </span>
          </div>
          <div class="flex items-center gap-3" id="shodStatsBadge">
            <span class="text-[9px] text-[color:var(--pos)]">● 0 Lunas</span>
            <span class="text-[9px] text-[color:var(--neg)]">● 0 Belum</span>
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="border-bottom:1px solid var(--line);">
                <th class="text-left text-[9px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)] py-1.5">Anggota</th>
                <th class="text-left text-[9px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)] py-1.5">Target</th>
                <th class="text-left text-[9px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)] py-1.5">Dibayar</th>
                 <th class="text-left text-[9px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)] py-1.5">Status</th>
                <th class="text-left text-[9px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)] py-1.5">Tgl Bayar</th>
              </tr>
            </thead>
            <tbody id="shodMonitoringBody">
              <tr><td colspan="4" class="py-8 text-center text-[9px] text-[color:var(--ink-faint)]">Memuat data...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // === TAB 2: Members ===
  const membersContent = document.createElement("div");
  membersContent.className = "shod-tab-content shod-tab-content-shod-members";
  membersContent.style.display = "none";
  membersContent.innerHTML = `
    <div class="card p-4">
      <div id="shodMembersList"></div>
    </div>
  `;

  // === TAB 3: Payments ===
  const paymentsContent = document.createElement("div");
  paymentsContent.className = "shod-tab-content shod-tab-content-shod-payments";
  paymentsContent.style.display = "none";
  paymentsContent.innerHTML = `
    <div class="card p-4">
      <h2 class="font-display text-[13px] font-extrabold mb-3">Riwayat Pembayaran</h2>
      <div id="shodPaymentsList" class="space-y-2">
        <p class="py-6 text-center text-xs text-[color:var(--ink-faint)]">Belum ada pembayaran.</p>
      </div>
    </div>
  `;

  contentContainer.appendChild(monitoringContent);
  contentContainer.appendChild(membersContent);
  contentContainer.appendChild(paymentsContent);

  tabsContainer.insertAdjacentElement("afterend", contentContainer);

  // Event listener untuk tab
  container.querySelectorAll(".shod-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      container.querySelectorAll(".shod-tab").forEach((t) => {
        t.classList.remove("active");
        t.style.background = "var(--surface)";
        t.style.color = "var(--ink-soft)";
      });
      this.classList.add("active");
      this.style.background = "var(--brand)";
      this.style.color = "#fff";

      const target = this.dataset.tab;
      container.querySelectorAll(".shod-tab-content").forEach((el) => {
        el.style.display = "none";
      });

      const content = container.querySelector(`.shod-tab-content-${target}`);
      if (content) {
        content.style.display = "block";
        if (target === "shod-monitoring") {
          renderShodaqohMonitoring();
        } else if (target === "shod-members") {
          renderShodaqohMembers();
        } else if (target === "shod-payments") {
          renderPaymentHistory();
        }
      }
    });
  });

  // Render data untuk tab aktif (Monitoring)
  setTimeout(() => {
    renderShodaqohMonitoring();
  }, 100);
}

function renderActiveShodaqohTab() {
  const container = document.querySelector("#screen-shodaqoh");
  if (!container) return;

  const activeTab = container.querySelector(".shod-tab.active");
  const tabName = activeTab?.dataset.tab || "shod-monitoring";

  const monitoringTab = container.querySelector(
    ".shod-tab-content-shod-monitoring",
  );

  const membersTab = container.querySelector(".shod-tab-content-shod-members");

  const paymentsTab = container.querySelector(
    ".shod-tab-content-shod-payments",
  );

  if (monitoringTab) {
    monitoringTab.style.display = tabName === "shod-monitoring" ? "" : "none";
  }

  if (membersTab) {
    membersTab.style.display = tabName === "shod-members" ? "" : "none";
  }

  if (paymentsTab) {
    paymentsTab.style.display = tabName === "shod-payments" ? "" : "none";
  }

  if (tabName === "shod-monitoring") {
    renderShodaqohMonitoring();
  }

  if (tabName === "shod-members") {
    renderShodaqohMembers();
  }

  if (tabName === "shod-payments") {
    renderPaymentHistory();
  }
}

function renderPaymentHistory() {
  const body = $("shodPaymentsList");
  if (!body) return;
  const f = state.shodaqoh.filters;
  const rows = (state.shodaqoh.payments || [])
    .filter((p) => !f.memberId || String(p.member_id) === String(f.memberId))
    .filter((p) => !f.year || String(p.tanggal).slice(0, 4) === String(f.year))
    .filter(
      (p) => !f.month || String(p.tanggal).slice(5, 7) === String(f.month),
    );

  body.innerHTML =
    rows
      .map((p) => {
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

        return `<button type="button" class="tx-card w-full text-left" data-shod-payment="${escapeHtml(
          p.payment_id,
        )}" style="padding: 10px 4px;">
            <div class="flex-1">
              <p class="tx-title">${escapeHtml(p.payment_id)}</p>
              <p class="tx-meta">${escapeHtml(formattedDate)} · ${escapeHtml(
                p.nama,
              )} · ${escapeHtml(p.keterangan || "Tanpa keterangan")}</p>
            </div>
            <div class="text-right">
              <p class="tx-amount mono">${fmtRp(p.total)}</p>
              <p class="tx-meta">
                <span class="status-pill ${statusClass}" style="font-size:8px;padding:2px 10px;">
                  ${escapeHtml(statusLabel)}
                </span>
              </p>
            </div>
          </button>`;
      })
      .join("") ||
    '<p class="py-6 text-center text-xs text-[color:var(--ink-faint)]">Belum ada pembayaran.</p>';
}

async function addShodaqohMember(nama, nominalBulanan = 200000) {
  const session = getSession();
  if (!session) {
    showToast("Sesi admin berakhir, silakan login ulang.", "error");
    return;
  }

  try {
    const res = await apiPost({
      action: "addShodaqohMember",
      token: session.token,
      nama: nama,
      nominalBulanan: nominalBulanan,
    });

    if (!res.success) throw new Error(res.message);
    showToast("Anggota berhasil ditambahkan.");

    // Refresh data shodaqoh saja
    await loadShodaqohData(state.shodaqoh.selectedMonth);
    return res;
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteShodaqohMember(memberId) {
  const session = getSession();
  if (!session) {
    showToast("Sesi admin berakhir, silakan login ulang.", "error");
    return;
  }

  try {
    const res = await apiPost({
      action: "deleteShodaqohMember",
      token: session.token,
      memberId: memberId,
    });

    if (!res.success) throw new Error(res.message);
    showToast(res.message || "Anggota berhasil dihapus.");

    // Refresh data shodaqoh saja
    await loadShodaqohData(state.shodaqoh.selectedMonth);
    return res;
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function editShodaqohMember(memberId, nama, nominalBulanan) {
  const session = getSession();
  if (!session) {
    showToast("Sesi admin berakhir, silakan login ulang.", "error");
    return;
  }

  try {
    const res = await apiPost({
      action: "updateShodaqohMember",
      token: session.token,
      memberId: memberId,
      nama: nama,
      nominalBulanan: nominalBulanan,
    });

    if (!res.success) throw new Error(res.message);
    showToast(res.message || "Anggota berhasil diperbarui.");

    // Refresh data shodaqoh saja
    await loadShodaqohData(state.shodaqoh.selectedMonth);
    return res;
  } catch (err) {
    showToast(err.message, "error");
  }
}

function setupShodaqohAllocationWatcher() {
  const fields = [
    "shodPaymentAmount",
    "shod_susulan_ir",
    "shod_uang_sambung",
    "shod_jimpitan",
    "shod_siar_siar",
    "shod_seribuan",
    "shod_kafan",
    "shod_ukhro_mt",
  ];

  const updateTotal = () => {
    const total = Number($("shodPaymentAmount")?.value || 0);
    const alokasi = [
      "shod_susulan_ir",
      "shod_uang_sambung",
      "shod_jimpitan",
      "shod_siar_siar",
      "shod_seribuan",
      "shod_kafan",
      "shod_ukhro_mt",
    ].reduce((s, id) => s + Number($(id)?.value || 0), 0);

    const selisih = total - alokasi;
    const isBalanced = total > 0 && selisih === 0;

    const statusIcon = $("shodAllocationIcon");
    const statusText = $("shodAllocationText");
    const statusEl = $("shodAllocationStatus");

    if (statusEl && statusText && statusIcon) {
      if (total === 0) {
        statusIcon.innerHTML = `<circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />`;
        statusIcon.style.color = "var(--ink-soft)";
        statusText.textContent = "Masukkan total pembayaran";
        statusText.style.color = "var(--ink-soft)";
      } else if (isBalanced) {
        statusIcon.innerHTML = `<path d="M20 6L9 17l-5-5" />`;
        statusIcon.style.color = "var(--pos)";
        statusText.textContent = "SEIMBANG (Rp0)";
        statusText.style.color = "var(--pos)";
      } else if (selisih > 0) {
        statusIcon.innerHTML = `<circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />`;
        statusIcon.style.color = "var(--neg)";
        statusText.textContent = "Kurang Rp" + selisih.toLocaleString("id-ID");
        statusText.style.color = "var(--neg)";
      } else {
        statusIcon.innerHTML = `<circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />`;
        statusIcon.style.color = "var(--neg)";
        statusText.textContent =
          "Kelebihan Rp" + Math.abs(selisih).toLocaleString("id-ID");
        statusText.style.color = "var(--neg)";
      }
    }

    const btn = $("btnSubmitShodaqohPayment");
    if (btn) btn.disabled = !(total > 0 && isBalanced);
  };

  fields.forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("input", updateTotal);
  });

  setTimeout(updateTotal, 100);
}

let lastNominalsLoading = false;

async function loadLastNominals() {
  if (lastNominalsLoading) return;

  const memberInput = document.getElementById("shodPaymentMember");
  const memberId = memberInput?.value || "";

  if (!memberId) {
    showToast("Pilih anggota terlebih dahulu.", "error");
    return;
  }

  const session = getSession();
  if (!session) {
    showToast("Sesi admin berakhir, silakan login ulang.", "error");
    return;
  }

  const btn = document.getElementById("btnLoadLastNominals");
  const originalText = btn?.innerHTML || "Data Terakhir";

  lastNominalsLoading = true;

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:4px;"></span>
      Memuat...
    `;
  }

  try {
    const selectedMonth = state.shodaqoh.selectedMonth || getCurrentMonthKey();

    const res = await apiPost({
      action: "getShodaqohLastNominals",
      token: session.token,
      memberId: memberId,
      beforeMonth: selectedMonth,
    });

    if (!res.success) {
      showToast(res.message || "Gagal memuat data terakhir.", "error");
      return;
    }

    const values = res.values || {};

    const fieldMap = {
      susulan_ir: "shod_susulan_ir",
      uang_sambung: "shod_uang_sambung",
      jimpitan: "shod_jimpitan",
      siar_siar: "shod_siar_siar",
      seribuan: "shod_seribuan",
      kafan: "shod_kafan",
      ukhro_mt: "shod_ukhro_mt",
    };

    let total = 0;
    let hasData = false;

    Object.keys(fieldMap).forEach((field) => {
      const inputId = fieldMap[field];
      const input = document.getElementById(inputId);
      const value = Number(values[field] || 0);

      if (input) {
        input.value = value > 0 ? value : "";
        if (value > 0) hasData = true;
      }

      total += value;
    });

    const totalInput = document.getElementById("shodPaymentAmount");
    if (totalInput && total > 0) {
      totalInput.value = total;
    }

    const source = res.source || {};
    let sourceInfo = [];
    Object.keys(source).forEach((field) => {
      if (source[field]) {
        const label =
          {
            susulan_ir: "Infak IR",
            uang_sambung: "Uang Sambung",
            jimpitan: "Jimpitan",
            siar_siar: "Siar-siar",
            seribuan: "Seribuan",
            kafan: "Kafan",
            ukhro_mt: "Ukhro MT",
          }[field] || field;
        sourceInfo.push(`${label} (${source[field]})`);
      }
    });

    if (hasData && sourceInfo.length > 0) {
      const monthKeys = sourceInfo
        .map(function (item) {
          const match = item.match(/\((.+)\)$/);
          return match ? match[1] : "";
        })
        .filter(Boolean)
        .map(function (key) {
          return fmtMonthYear(key);
        });

      const uniqueMonths = [...new Set(monthKeys)];
      const monthStr =
        uniqueMonths.length > 0 ? ` (${uniqueMonths.join(", ")})` : "";

      showToast(
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;margin-right:6px;flex-shrink:0;">
      <path d="M20 6L9 17l-5-5" />
    </svg> Data terakhir dimuat${monthStr}`,
        "success",
      );
    } else if (!hasData) {
      showToast(
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;vertical-align:middle;margin-right:6px;flex-shrink:0;">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg> Tidak ada data sebelumnya.`,
        "info",
      );
    }

    if (typeof setupShodaqohAllocationWatcher === "function") {
      setTimeout(() => {
        const fields = Object.values(fieldMap);
        fields.forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.dispatchEvent(new Event("input", { bubbles: true }));
        });
        const totalEl = document.getElementById("shodPaymentAmount");
        if (totalEl)
          totalEl.dispatchEvent(new Event("input", { bubbles: true }));
      }, 100);
    }
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat data: " + err.message, "error");
  } finally {
    lastNominalsLoading = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
      updateLoadLastNominalsButton();
    }
  }
}

function updateLoadLastNominalsButton() {
  const btn = document.getElementById("btnLoadLastNominals");
  const memberInput = document.getElementById("shodPaymentMember");
  const memberId = memberInput?.value || "";

  if (!btn) return;

  const hasMember = memberId && memberId.trim() !== "";

  if (hasMember) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.style.pointerEvents = "auto";
    btn.style.borderColor = "var(--brand)";
    btn.style.color = "var(--brand)";
    btn.title = "Ambil data nominal terakhir dari anggota ini";
  } else {
    btn.disabled = true;
    btn.style.opacity = "0.4";
    btn.style.cursor = "not-allowed";
    btn.style.pointerEvents = "none";
    btn.style.borderColor = "var(--line)";
    btn.style.color = "var(--ink-faint)";
    btn.title = "Pilih anggota terlebih dahulu";
  }
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function openShodaqohPaymentForm(payment) {
  state.shodaqoh.selectedPaymentId = payment?.payment_id || null;

  const f = $("shodaqohPaymentForm");
  if (f) {
    f.reset();
    f.removeEventListener("submit", handleShodaqohSubmit);
    f.addEventListener("submit", handleShodaqohSubmit);
  }

  if (typeof toggleShodMethod === "function") {
    toggleShodMethod("manual");
  }

  if (typeof clearShodUpload === "function") {
    clearShodUpload();
  }

  if (typeof updateLoadLastNominalsButton === "function") {
    setTimeout(updateLoadLastNominalsButton, 100);
  }

  const dateValueDisplay = $("shodDateDropdownValue");
  const dateHidden = $("shodPaymentDate");

  if (payment?.tanggal) {
    const d = new Date(payment.tanggal);
    if (!isNaN(d.getTime())) {
      if (dateValueDisplay) dateValueDisplay.textContent = formatDateDisplay(d);
      if (dateHidden) dateHidden.value = formatDateInput(d);
      datePickerState.selectedDate = d;
      datePickerState.currentMonth = d.getMonth();
      datePickerState.currentYear = d.getFullYear();
    }
  } else {
    const today = new Date();
    if (dateValueDisplay)
      dateValueDisplay.textContent = formatDateDisplay(today);
    if (dateHidden) dateHidden.value = formatDateInput(today);
    datePickerState.selectedDate = today;
    datePickerState.currentMonth = today.getMonth();
    datePickerState.currentYear = today.getFullYear();
  }

  const member = $("shodPaymentMember");
  if (member) {
    member.innerHTML =
      '<option value="">Pilih anggota</option>' +
      (state.shodaqoh.members || [])
        .map(
          (m) =>
            `<option value="${escapeHtml(m.member_id)}">${escapeHtml(
              m.nama,
            )}</option>`,
        )
        .join("");
    member.value = payment?.member_id || "";
  }

  if ($("shodPaymentDate"))
    $("shodPaymentDate").value =
      payment?.tanggal || new Date().toISOString().slice(0, 10);

  if ($("shodPaymentAmount"))
    $("shodPaymentAmount").value = payment?.total || "";

  if ($("shodPaymentNote"))
    $("shodPaymentNote").value = payment?.keterangan || "";

  [
    "susulan_ir",
    "uang_sambung",
    "jimpitan",
    "siar_siar",
    "seribuan",
    "kafan",
    "ukhro_mt",
  ].forEach((pos) => {
    const el = $(`shod_${pos}`);
    if (el) el.value = payment?.[pos] || "";
  });

  const bulanWrap = $("shodSusulanBulan");
  if (bulanWrap) {
    const selected = payment?.susulan_bulan
      ? payment.susulan_bulan.split(",")
      : [];
    const now = new Date();
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key =
        d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");

      const monthNames = {
        Januari: "Jan",
        Februari: "Feb",
        Maret: "Mar",
        April: "Apr",
        Mei: "Mei",
        Juni: "Jun",
        Juli: "Jul",
        Agustus: "Ags",
        September: "Sep",
        Oktober: "Okt",
        November: "Nov",
        Desember: "Des",
      };

      const fullMonth = d.toLocaleDateString("id-ID", { month: "long" });
      const shortLabel = monthNames[fullMonth] || fullMonth.slice(0, 3);
      const year = d.getFullYear();

      months.push({ key, shortLabel, year });
    }

    bulanWrap.innerHTML = months
      .map(
        (m) => `
        <label class="flex items-center gap-2 p-2.5 rounded-lg bg-[color:var(--surface)] cursor-pointer transition-colors hover:bg-[color:var(--surface-alt)] border border-[color:var(--line)]">
          <input 
            type="checkbox" 
            name="shodSusulanBulan" 
            value="${escapeHtml(m.key)}" 
            ${selected.includes(m.key) ? "checked" : ""}
            class="w-4 h-4 rounded border-2 border-[color:var(--line)] text-[color:var(--brand)] focus:ring-2 focus:ring-[color:var(--brand-soft)] focus:ring-offset-0 transition-all cursor-pointer flex-shrink-0"
            style="accent-color: var(--brand);"
          />
          <span class="text-xs text-[color:var(--ink-soft)] font-semibold">${escapeHtml(m.shortLabel)} ${escapeHtml(m.year)}</span>
        </label>
      `,
      )
      .join("");
  }

  setupShodaqohAllocationWatcher();

  $("shodaqohPaymentOverlay")?.classList.remove("hidden");
}

let shodUploadMode = false;

function setupShodUpload() {
  const uploadInput = document.getElementById("shodUploadInput");
  const previewDiv = document.getElementById("shodUploadPreview");
  const previewImg = document.getElementById("shodUploadPreviewImg");
  const fileName = document.getElementById("shodUploadFileName");
  const clearBtn = document.getElementById("shodUploadClear");
  const extractBtn = document.getElementById("shodUploadExtract");
  const ocrResult = document.getElementById("shodOcrResult");

  if (!uploadInput) return;

  if (uploadInput.dataset.shodUploadInitialized === "1") {
    return;
  }

  uploadInput.dataset.shodUploadInitialized = "1";

  uploadInput.addEventListener("change", async function () {
    const file = this.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("File yang dipilih bukan foto.", "error");
      this.value = "";
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      showToast("Ukuran foto maksimal 12 MB.", "error");
      this.value = "";
      return;
    }

    try {
      window.shodUploadedImage = {
        file: file,
        dataUrl: "",
        name: file.name,
        type: file.type,
        size: file.size,
      };

      if (fileName) {
        fileName.textContent = file.name;
      }

      const reader = new FileReader();

      reader.onload = function (event) {
        const dataUrl = event.target.result;

        window.shodUploadedImage.dataUrl = dataUrl;

        if (previewImg) {
          previewImg.src = dataUrl;
          previewImg.style.display = "block";
        }

        if (previewDiv) {
          previewDiv.classList.remove("hidden");
        }

        if (ocrResult) {
          ocrResult.classList.add("hidden");
        }
      };

      reader.onerror = function () {
        showToast("Foto gagal dibaca.", "error");
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload foto gagal:", err);
      showToast("Foto gagal diproses.", "error");
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", clearShodUpload);
  }

  if (extractBtn) {
    extractBtn.addEventListener("click", extractDataFromImage);
  }
}

function clearShodUpload() {
  const uploadInput = document.getElementById("shodUploadInput");
  const previewDiv = document.getElementById("shodUploadPreview");
  const previewImg = document.getElementById("shodUploadPreviewImg");
  const fileName = document.getElementById("shodUploadFileName");
  const ocrResult = document.getElementById("shodOcrResult");
  const ocrData = document.getElementById("shodOcrData");

  window.shodUploadedImage = null;

  if (uploadInput) {
    uploadInput.value = "";
  }

  if (fileName) {
    fileName.textContent = "Pilih foto rekap";
  }

  if (previewDiv) {
    previewDiv.classList.add("hidden");
  }

  if (previewImg) {
    previewImg.removeAttribute("src");
  }

  if (ocrResult) {
    ocrResult.classList.add("hidden");
  }

  if (ocrData) {
    ocrData.innerHTML = "";
  }

  const form = document.getElementById("shodaqohPaymentForm");

  if (form) {
    form.reset();
  }

  const statusText = document.getElementById("shodAllocationText");
  const statusIcon = document.getElementById("shodAllocationIcon");

  if (statusText) {
    statusText.textContent = "BELUM SEIMBANG";
  }

  if (statusIcon) {
    statusIcon.innerHTML = `
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    `;

    statusIcon.style.color = "var(--ink-soft)";
  }

  const submitBtn = document.getElementById("btnSubmitShodaqohPayment");

  if (submitBtn) {
    submitBtn.disabled = true;
  }
}

async function extractDataFromImage() {
  const ocrResult = document.getElementById("shodOcrResult");
  const ocrData = document.getElementById("shodOcrData");

  if (!window.shodUploadedImage || !window.shodUploadedImage.dataUrl) {
    showToast("Pilih foto rekap terlebih dahulu.", "error");
    return;
  }

  const memberInput = document.getElementById("shodPaymentMember");

  if (!memberInput || !memberInput.value) {
    showToast("Pilih anggota terlebih dahulu.", "error");
    return;
  }

  const dateInput = document.getElementById("shodPaymentDate");

  if (!dateInput || !dateInput.value) {
    showToast("Pilih tanggal pembayaran terlebih dahulu.", "error");
    return;
  }

  if (ocrResult) {
    ocrResult.classList.remove("hidden");
    ocrResult.style.display = "";
  }

  if (ocrData) {
    ocrData.innerHTML = `
      <div
        style="
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          padding:18px 12px;
          text-align:center;
        "
      >
        <span
          style="
            display:inline-block;
            width:16px;
            height:16px;
            border:2px solid var(--brand);
            border-right-color:transparent;
            border-radius:50%;
            animation:spin .6s linear infinite;
            flex:none;
          "
        ></span>

        <span style="font-size:12px;">
          Menganalisis foto dengan AI...
        </span>
      </div>
    `;
  }

  try {
    const dataUrl = window.shodUploadedImage.dataUrl;

    if (!dataUrl || typeof dataUrl !== "string") {
      throw new Error("Data foto tidak valid.");
    }

    console.log("MENGIRIM FOTO KE GEMINI...");

    const aiResult = await callShodaqohAI(dataUrl);

    console.log("RESPONSE AI SHODAQOH:", aiResult);

    if (!aiResult || aiResult.success !== true) {
      throw new Error(aiResult?.message || "AI gagal membaca foto.");
    }

    const parsed =
      aiResult.data && typeof aiResult.data === "object" ? aiResult.data : {};

    console.log("DATA SHODAQOH AI:", parsed);

    const aiData = {
      total: Number(parsed.total) || 0,

      susulan_ir: Number(parsed.susulan_ir) || 0,

      susulan_bulan: Array.isArray(parsed.susulan_bulan)
        ? parsed.susulan_bulan
        : [],

      uang_sambung: Number(parsed.uang_sambung) || 0,

      jimpitan: Number(parsed.jimpitan) || 0,

      siar_siar: Number(parsed.siar_siar) || 0,

      seribuan: Number(parsed.seribuan) || 0,

      kafan: Number(parsed.kafan) || 0,

      ukhro_mt: Number(parsed.ukhro_mt) || 0,

      keterangan: parsed.keterangan || "",

      rawText: parsed.rawText || aiResult.rawText || "",
    };

    window.shodAiExtractedData = aiData;

    renderShodaqohAiSusulanBulan(aiData.susulan_bulan);

    console.log("DATA AI DISIMPAN:", window.shodAiExtractedData);

    const total = aiData.total;
    const susulanIr = aiData.susulan_ir;
    const uangSambung = aiData.uang_sambung;
    const jimpitan = aiData.jimpitan;
    const siarSiar = aiData.siar_siar;
    const seribuan = aiData.seribuan;
    const kafan = aiData.kafan;
    const ukhroMt = aiData.ukhro_mt;
    const text = aiData.rawText;

    if (ocrResult) {
      ocrResult.classList.remove("hidden");
      ocrResult.style.display = "";
    }

    if (ocrData) {
      ocrData.innerHTML = `
    <div
      style="
        display:flex;
        flex-direction:column;
        gap:0;
      "
    >

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:10px 0;
          border-bottom:1px solid var(--border);
        "
      >
        <span
          style="
            font-size:12px;
            font-weight:600;
          "
        >
          Total
        </span>

        <b
          class="mono"
          style="font-size:13px;"
        >
          ${fmtRp(total)}
        </b>
      </div>

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:9px 0;
          border-bottom:1px solid var(--border);
        "
      >
        <span class="text-xs">
          Infak IR / Persenan
        </span>

        <span class="mono">
          ${fmtRp(susulanIr)}
        </span>
      </div>

      ${
        susulanIr > 0
          ? `
            <div
              style="
                margin:10px 0 4px;
                padding:11px;
                border:1px solid var(--border);
                border-radius:9px;
                background:var(--surface-2);
              "
            >
              <div
                style="
                  display:flex;
                  align-items:center;
                  justify-content:space-between;
                  gap:8px;
                  margin-bottom:9px;
                "
              >
                <span
                  style="
                    font-size:11px;
                    font-weight:700;
                    color:var(--ink);
                  "
                >
                  Bulan Susulan IR
                </span>

                <span
                  style="
                    font-size:9px;
                    color:var(--muted);
                  "
                >
                  Pilih bulan
                </span>
              </div>

              <div
                id="shodAiSusulanBulan"
                style="
                  display:grid;
                  grid-template-columns:repeat(3,minmax(0,1fr));
                  gap:6px;
                "
              ></div>

              <div
                style="
                  margin-top:7px;
                  font-size:9px;
                  line-height:1.4;
                  color:var(--muted);
                "
              >
                Pilih minimal satu bulan jika terdapat Infak IR / Persenan.
              </div>
            </div>
          `
          : ""
      }

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:9px 0;
          border-bottom:1px solid var(--border);
        "
      >
        <span class="text-xs">
          Uang Sambung
        </span>

        <span class="mono">
          ${fmtRp(uangSambung)}
        </span>
      </div>

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:9px 0;
          border-bottom:1px solid var(--border);
        "
      >
        <span class="text-xs">
          Jimpitan
        </span>

        <span class="mono">
          ${fmtRp(jimpitan)}
        </span>
      </div>

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:9px 0;
          border-bottom:1px solid var(--border);
        "
      >
        <span class="text-xs">
          Siar-Siar
        </span>

        <span class="mono">
          ${fmtRp(siarSiar)}
        </span>
      </div>

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:9px 0;
          border-bottom:1px solid var(--border);
        "
      >
        <span class="text-xs">
          Seribuan
        </span>

        <span class="mono">
          ${fmtRp(seribuan)}
        </span>
      </div>

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:9px 0;
          border-bottom:1px solid var(--border);
        "
      >
        <span class="text-xs">
          Kafan
        </span>

        <span class="mono">
          ${fmtRp(kafan)}
        </span>
      </div>

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:9px 0;
        "
      >
        <span class="text-xs">
          Ukhro MT
        </span>

        <span class="mono">
          ${fmtRp(ukhroMt)}
        </span>
      </div>

    </div>

    ${
      text
        ? `
          <details
            style="
              margin-top:14px;
            "
          >
            <summary
              style="
                font-size:11px;
                cursor:pointer;
                user-select:none;
              "
            >
              Lihat hasil pembacaan AI
            </summary>

            <pre
              style="
                font-size:10px;
                line-height:1.5;
                white-space:pre-wrap;
                word-break:break-word;
                margin-top:8px;
                padding:8px;
                border-radius:8px;
                background:var(--surface-2);
                overflow:auto;
                max-height:240px;
              "
            >${escapeHtml(text)}</pre>
          </details>
        `
        : ""
    }

    <div
      style="
        margin-top:16px;
        padding-top:12px;
        border-top:1px solid var(--border);
      "
    >

      <button
        type="button"
        id="btnSubmitShodaqohAI"
        class="btn btn-primary w-full"
        style="
          min-height:40px;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          font-size:12px;
          font-weight:600;
        "
      >
        Kirim Data Shodaqoh
      </button>

      <div
        style="
          margin-top:7px;
          font-size:10px;
          color:var(--muted);
          text-align:center;
          line-height:1.4;
        "
      >
        Pastikan nama anggota, tanggal pembayaran, dan bulan Susulan IR sudah benar.
      </div>

    </div>
  `;

      ocrData.style.display = "";

      if (susulanIr > 0) {
        renderShodaqohAiSusulanBulan(
          Array.isArray(aiData.susulan_bulan) ? aiData.susulan_bulan : [],
        );
      }

      const submitAiBtn = document.getElementById("btnSubmitShodaqohAI");

      if (submitAiBtn) {
        submitAiBtn.addEventListener("click", submitShodaqohAI);
      }
    }

    console.log("EKSTRAKSI SHODAQOH SELESAI:", aiData);

    showToast(
      "Data berhasil diekstrak. Periksa hasil sebelum mengirim.",
      "success",
    );
  } catch (err) {
    console.error("Ekstraksi AI gagal:", err);

    window.shodAiExtractedData = null;

    const rawError = err?.message || "";

    let errorMessage = "Foto tidak dapat dibaca oleh AI.";

    if (
      rawError.includes("429") ||
      rawError.toLowerCase().includes("rate limit") ||
      rawError.toLowerCase().includes("quota")
    ) {
      errorMessage =
        "AI sedang mencapai batas penggunaan. Silakan tunggu beberapa saat lalu coba lagi.";
    } else if (rawError) {
      errorMessage = rawError;
    }

    showToast(errorMessage, "error");

    if (ocrResult) {
      ocrResult.classList.remove("hidden");
      ocrResult.style.display = "";
    }

    if (ocrData) {
      ocrData.innerHTML = `
        <div
          style="
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            padding:18px 12px 16px;
            text-align:center;
          "
        >

          <div
            style="
              width:38px;
              height:38px;
              display:flex;
              align-items:center;
              justify-content:center;
              border-radius:50%;
              background:rgba(234,179,8,.12);
              color:var(--gold);
              margin-bottom:10px;
              font-size:19px;
              font-weight:700;
            "
          >
            ↻
          </div>

          <div
            style="
              font-size:13px;
              font-weight:600;
              line-height:1.4;
              margin-bottom:5px;
            "
          >
            Gagal membaca foto
          </div>

          <button
            type="button"
            id="btnRegenerateShodaqohAI"
            class="btn w-full"
            style="
              width:100%;
              min-height:40px;
              display:flex;
              align-items:center;
              justify-content:center;
              gap:8px;
              background:var(--gold);
              color:#fff;
              border:1px solid var(--gold);
              border-radius:8px;
              font-size:12px;
              font-weight:600;
              line-height:1;
              cursor:pointer;
              transition:
                opacity .15s ease,
                transform .15s ease,
                filter .15s ease;
            "
          >
            <span
              style="
                font-size:14px;
                line-height:1;
              "
            >
              ↻
            </span>

            <span>
              Generate Ulang
            </span>
          </button>

        </div>
      `;

      ocrData.style.display = "";

      const regenerateBtn = document.getElementById("btnRegenerateShodaqohAI");

      if (regenerateBtn) {
        regenerateBtn.addEventListener("click", async function () {
          if (regenerateBtn.disabled) {
            return;
          }

          regenerateBtn.disabled = true;

          regenerateBtn.style.opacity = "0.7";
          regenerateBtn.style.cursor = "wait";

          regenerateBtn.innerHTML = `
              <span
                style="
                  display:inline-block;
                  width:13px;
                  height:13px;
                  border:2px solid rgba(255,255,255,.45);
                  border-top-color:#fff;
                  border-radius:50%;
                  animation:spin .6s linear infinite;
                "
              ></span>

              <span>
                Mencoba lagi...
              </span>
            `;

          await extractDataFromImage();
        });
      }
    }
  }
}

async function submitShodaqohAI() {
  const data = window.shodAiExtractedData;

  if (!data) {
    showToast("Belum ada hasil ekstraksi AI.", "error");
    return;
  }

  const session = getSession();

  if (!session) {
    showToast("Sesi admin berakhir, silakan login ulang.", "error");
    return;
  }

  const memberId = document.getElementById("shodPaymentMember")?.value || "";
  const tanggal = document.getElementById("shodPaymentDate")?.value || "";

  if (!memberId) {
    showToast("Pilih anggota terlebih dahulu.", "error");
    return;
  }

  if (!tanggal) {
    showToast("Pilih tanggal pembayaran terlebih dahulu.", "error");
    return;
  }

  const susulanBulan = [
    ...document.querySelectorAll(
      '#shodAiSusulanBulan input[type="checkbox"]:checked',
    ),
  ].map((el) => el.value);

  console.log(susulanBulan, "susulanBulan");

  if (Number(data.susulan_ir || 0) > 0 && susulanBulan.length === 0) {
    showToast("Pilih minimal satu bulan untuk Susulan IR.", "error");
    return;
  }

  const payload = {
    action: state.shodaqoh.selectedPaymentId
      ? "updateShodaqohPayment"
      : "createShodaqohPayment",

    token: session.token,

    paymentId: state.shodaqoh.selectedPaymentId || "",

    memberId: memberId,

    tanggalPembayaran: tanggal,

    total: Number(data.total) || 0,

    susulan_ir: Number(data.susulan_ir) || 0,

    susulan_bulan: susulanBulan,

    uang_sambung: Number(data.uang_sambung) || 0,

    jimpitan: Number(data.jimpitan) || 0,

    siar_siar: Number(data.siar_siar) || 0,

    seribuan: Number(data.seribuan) || 0,

    kafan: Number(data.kafan) || 0,

    ukhro_mt: Number(data.ukhro_mt) || 0,

    keterangan:
      data.keterangan ||
      document.getElementById("shodPaymentNote")?.value ||
      "",
  };

  console.log("SUBMIT SHODAQOH AI:", {
    memberId,
    tanggal,
    data,
  });

  console.log("SUSULAN BULAN DARI FORM:", susulanBulan);

  console.log("PAYLOAD SHODAQOH AI YANG DIKIRIM:", payload);

  const btn = document.getElementById("btnSubmitShodaqohAI");

  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.style.cursor = "wait";

    btn.innerHTML = `
      <span
        style="
          display:inline-block;
          width:13px;
          height:13px;
          border:2px solid rgba(255,255,255,.45);
          border-top-color:#fff;
          border-radius:50%;
          animation:spin .6s linear infinite;
        "
      ></span>
      <span>Mengirim...</span>
    `;
  }

  try {
    showToast("Mengirim data...", "info");

    const r = await apiPost(payload);

    console.log("RESPONSE SUBMIT SHODAQOH AI:", r);

    if (!r || r.success !== true) {
      throw new Error(r?.message || "Gagal menyimpan data shodaqoh.");
    }

    showToast(r.message || "Data shodaqoh berhasil dikirim.", "success");

    window.shodAiExtractedData = null;

    if (typeof closeShodaqohPaymentForm === "function") {
      closeShodaqohPaymentForm();
    }

    if (
      typeof loadShodaqohData === "function" &&
      state?.shodaqoh?.selectedMonth
    ) {
      await loadShodaqohData(state.shodaqoh.selectedMonth);
    }
  } catch (err) {
    console.error("GAGAL SUBMIT SHODAQOH AI:", err);

    showToast(err?.message || "Gagal mengirim data shodaqoh.", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = "";
      btn.style.cursor = "";

      btn.innerHTML = `
        Kirim Data Shodaqoh
      `;
    }
  }
}

async function handleShodaqohSubmit(e) {
  e.preventDefault();

  const session = getSession();
  if (!session) {
    showToast("Sesi admin berakhir, silakan login ulang.", "error");
    return;
  }

  const memberId = $("shodPaymentMember").value;
  const tanggal = $("shodPaymentDate").value;

  if (!memberId) {
    showToast("Pilih anggota terlebih dahulu.", "error");
    return;
  }

  if (!tanggal) {
    showToast("Pilih tanggal pembayaran.", "error");
    return;
  }

  const susulanBulan = [
    ...document.querySelectorAll('input[name="shodSusulanBulan"]:checked'),
  ].map((el) => el.value);

  const payload = {
    action: state.shodaqoh.selectedPaymentId
      ? "updateShodaqohPayment"
      : "createShodaqohPayment",
    token: session.token,
    paymentId: state.shodaqoh.selectedPaymentId,
    memberId: memberId,
    tanggalPembayaran: tanggal,
    total: Number($("shodPaymentAmount").value),
    susulan_ir: Number($("shod_susulan_ir")?.value || 0),
    susulan_bulan: susulanBulan,
    uang_sambung: Number($("shod_uang_sambung")?.value || 0),
    jimpitan: Number($("shod_jimpitan")?.value || 0),
    siar_siar: Number($("shod_siar_siar")?.value || 0),
    seribuan: Number($("shod_seribuan")?.value || 0),
    kafan: Number($("shod_kafan")?.value || 0),
    ukhro_mt: Number($("shod_ukhro_mt")?.value || 0),
    keterangan: $("shodPaymentNote").value,
  };

  const btn = $("btnSubmitShodaqohPayment");
  btn.disabled = true;

  try {
    const r = await apiPost(payload);
    if (!r.success) throw new Error(r.message);
    showToast(r.message);
    closeShodaqohPaymentForm();
    await loadShodaqohData(state.shodaqoh.selectedMonth);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

function closeShodaqohPaymentForm() {
  state.shodaqoh.selectedPaymentId = null;
  state.shodaqoh.editingNo = null;

  const form = document.getElementById("shodaqohPaymentForm");
  if (form) {
    form.reset();
    form.querySelectorAll('input[type="number"]').forEach(function (input) {
      input.value = "";
    });
    const note = document.getElementById("shodPaymentNote");
    if (note) note.value = "";
  }

  const statusText = document.getElementById("shodAllocationText");
  const statusIcon = document.getElementById("shodAllocationIcon");
  if (statusText) {
    statusText.textContent = "BELUM SEIMBANG";
    statusText.style.color = "var(--ink-soft)";
  }
  if (statusIcon) {
    statusIcon.innerHTML = `<circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />`;
    statusIcon.style.color = "var(--ink-soft)";
  }

  const submitBtn = document.getElementById("btnSubmitShodaqohPayment");
  if (submitBtn) submitBtn.disabled = true;

  const memberValue = document.getElementById("shodPaymentMemberValue");
  const memberHidden = document.getElementById("shodPaymentMember");
  if (memberValue) memberValue.textContent = "Pilih anggota";
  if (memberHidden) memberHidden.value = "";

  const today = new Date();
  const dateValueDisplay = document.getElementById("shodDateDropdownValue");
  const dateHidden = document.getElementById("shodPaymentDate");
  if (dateValueDisplay) dateValueDisplay.textContent = formatDateDisplay(today);
  if (dateHidden) dateHidden.value = formatDateInput(today);
  datePickerState.selectedDate = today;
  datePickerState.currentMonth = today.getMonth();
  datePickerState.currentYear = today.getFullYear();

  document
    .querySelectorAll('input[name="shodSusulanBulan"]')
    .forEach(function (cb) {
      cb.checked = false;
    });

  if (typeof clearShodUpload === "function") {
    clearShodUpload();
  }

  if (typeof toggleShodMethod === "function") {
    toggleShodMethod("manual");
  }

  if (typeof updateLoadLastNominalsButton === "function") {
    setTimeout(updateLoadLastNominalsButton, 50);
  }

  const overlay = document.getElementById("shodaqohPaymentOverlay");
  if (overlay) overlay.classList.add("hidden");

  removeDatePickerBackdrop();
}

function renderShodaqohAiSusulanBulan(selectedMonths = []) {
  const container = document.getElementById("shodAiSusulanBulan");

  if (!container) return;

  const months = [
    ["01", "Januari"],
    ["02", "Februari"],
    ["03", "Maret"],
    ["04", "April"],
    ["05", "Mei"],
    ["06", "Juni"],
    ["07", "Juli"],
    ["08", "Agustus"],
    ["09", "September"],
    ["10", "Oktober"],
    ["11", "November"],
    ["12", "Desember"],
  ];

  const selected = Array.isArray(selectedMonths)
    ? selectedMonths.map(String)
    : [];

  container.innerHTML = months
    .map(([value, label]) => {
      const checked = selected.includes(value);

      return `
        <label
          style="
            display:flex;
            align-items:center;
            gap:6px;
            min-height:34px;
            padding:6px 7px;
            border:1px solid ${checked ? "var(--brand)" : "var(--border)"};
            border-radius:7px;
            background:${checked ? "var(--brand-soft)" : "var(--surface)"};
            cursor:pointer;
            user-select:none;
            transition:
              background .15s ease,
              border-color .15s ease;
          "
        >
          <input
            type="checkbox"
            name="shodAiSusulanBulan"
            value="${value}"
            ${checked ? "checked" : ""}
            style="
              width:14px;
              height:14px;
              margin:0;
              flex:none;
              accent-color:var(--brand);
            "
          >

          <span
            style="
              font-size:10px;
              line-height:1.2;
              color:var(--ink-soft);
            "
          >
            ${label}
          </span>
        </label>
      `;
    })
    .join("");

  container
    .querySelectorAll('input[name="shodAiSusulanBulan"]')
    .forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const label = this.closest("label");

        if (!label) return;

        label.style.background = this.checked
          ? "var(--brand-soft)"
          : "var(--surface)";

        label.style.borderColor = this.checked
          ? "var(--brand)"
          : "var(--border)";
      });
    });
}

let shodMemberActionId = null;

function openShodMemberActionSheet(memberId) {
  if (!state.shodaqoh.members) {
    console.warn("Members data not loaded");
    return;
  }

  const member = state.shodaqoh.members.find(function (m) {
    return String(m.member_id) === String(memberId);
  });

  if (!member) {
    console.warn("Member not found:", memberId);
    showToast("Anggota tidak ditemukan.", "error");
    return;
  }

  console.log("Opening action sheet for:", member.nama, memberId);
  shodMemberActionId = memberId;

  if ($("shodMemberActionTitle")) {
    $("shodMemberActionTitle").textContent = member.nama;
  }

  const statusClass =
    member.status === "AKTIF" ? "status-active" : "status-inactive";
  const statusLabel = member.status || "AKTIF";

  if ($("shodMemberActionSubtitle")) {
    $("shodMemberActionSubtitle").innerHTML =
      "Nominal bulanan " +
      fmtRp(member.nominal_bulanan) +
      ' <span class="status-pill ' +
      statusClass +
      '" style="font-size:8px;padding:2px 10px;vertical-align:middle;">' +
      statusLabel +
      "</span>";
  }

  const overlay = $("shodMemberActionOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
    void overlay.offsetWidth;

    const sheet = overlay.querySelector(".sheet");
    if (sheet) {
      sheet.scrollTop = 0;
    }
  }
}

function closeShodMemberActionSheet() {
  const overlay = $("shodMemberActionOverlay");
  if (overlay) {
    overlay.classList.add("hidden");
  }
  shodMemberActionId = null;
}

function openShodMemberForm(memberId) {
  const isEdit = memberId !== null && memberId !== undefined;
  const member =
    isEdit && state.shodaqoh.members
      ? state.shodaqoh.members.find(function (m) {
          return String(m.member_id) === String(memberId);
        })
      : null;

  if ($("shodMemberFormTitle")) {
    $("shodMemberFormTitle").textContent = isEdit
      ? "Edit Anggota"
      : "Tambah Anggota";
  }
  if ($("shodMemberFormSubtitle")) {
    $("shodMemberFormSubtitle").textContent = isEdit
      ? "Ubah nominal bulanan anggota."
      : "Masukkan data anggota baru.";
  }

  const nameInput = $("shodMemberFormName");
  const nominalInput = $("shodMemberFormNominal");
  const errorEl = $("shodMemberFormError");

  if (nameInput) nameInput.value = isEdit ? member.nama : "";
  if (nominalInput) nominalInput.value = isEdit ? member.nominal_bulanan : "";
  if (errorEl) errorEl.classList.add("hidden");

  const form = $("shodMemberForm");
  if (form) form.dataset.memberId = isEdit ? memberId : "";

  $("shodMemberFormOverlay")?.classList.remove("hidden");
}

function closeShodMemberForm() {
  $("shodMemberFormOverlay")?.classList.add("hidden");
  const form = $("shodMemberForm");
  if (form) form.reset();
  const errorEl = $("shodMemberFormError");
  if (errorEl) errorEl.classList.add("hidden");
}

function openShodMemberDeleteConfirm(memberId) {
  if (!state.shodaqoh.members) return;

  const member = state.shodaqoh.members.find(function (m) {
    return String(m.member_id) === String(memberId);
  });
  if (!member) return;

  shodMemberActionId = memberId;

  if ($("deleteMemberConfirmDesc")) {
    $("deleteMemberConfirmDesc").innerHTML =
      "Anggota <b>" +
      escapeHtml(member.nama) +
      "</b> akan dihapus permanen. Pembayaran yang sudah tercatat tetap tersimpan.";
  }

  $("deleteMemberConfirmOverlay")?.classList.remove("hidden");
}

function toggleShodMethod(method) {
  const manualBtn = $("shodMethodManual");
  const uploadBtn = $("shodMethodUpload");
  const form = $("shodaqohPaymentForm");
  const uploadSection = $("shodUploadSection");
  const memberField = $("shodPaymentMember")?.closest(".grid");

  const manualIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>`;

  const uploadIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>`;

  if (method === "manual") {
    shodUploadMode = false;
    manualBtn.className = "btn-primary flex-1";
    manualBtn.style.cssText =
      "padding:8px 0;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px;";
    manualBtn.innerHTML = manualIcon + " Manual";

    uploadBtn.className = "btn-ghost flex-1";
    uploadBtn.style.cssText =
      "padding:8px 0;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px;";
    uploadBtn.innerHTML = uploadIcon + " Upload Foto";

    form.classList.remove("hidden");
    uploadSection.classList.add("hidden");
    if (memberField) memberField.style.display = "grid";

    if ($("shodPaymentSubtitle")) {
      $("shodPaymentSubtitle").textContent = "Input data secara manual.";
    }
  } else {
    shodUploadMode = true;
    uploadBtn.className = "btn-primary flex-1";
    uploadBtn.style.cssText =
      "padding:8px 0;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px;background:var(--gold);color:#fff;";
    uploadBtn.innerHTML = uploadIcon + " Upload Foto";

    manualBtn.className = "btn-ghost flex-1";
    manualBtn.style.cssText =
      "padding:8px 0;font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px;";
    manualBtn.innerHTML = manualIcon + " Manual";

    form.classList.add("hidden");
    uploadSection.classList.remove("hidden");
    if (memberField) memberField.style.display = "grid";

    if ($("shodPaymentSubtitle")) {
      $("shodPaymentSubtitle").textContent =
        "Upload foto rekap untuk panduan input.";
    }
  }
}

function closeShodMemberDeleteConfirm() {
  $("deleteMemberConfirmOverlay")?.classList.add("hidden");
  shodMemberActionId = null;
}

async function openShodaqohMemberDetail(memberId) {
  try {
    const body = $("shodMemberDetailBody");
    if (body) {
      body.innerHTML = `
        ${[1, 2, 3, 4, 5]
          .map(
            () => `
          <tr class="skeleton-row border-t border-[color:var(--line)]">
            <td class="py-2"><div class="skeleton-line medium"></div></td>
            <td class="py-2"><div class="skeleton-line medium"></div></td>
            <td class="py-2"><div class="skeleton-line long"></div></td>
            <td class="py-2"><div class="skeleton-line long"></div></td>
            <td class="py-2"><div class="skeleton-line long"></div></td>
            <td class="py-2"><div class="skeleton-line long"></div></td>
            <td class="py-2"><div class="skeleton-line long"></div></td>
            <td class="py-2"><div class="skeleton-line long"></div></td>
            <td class="py-2"><div class="skeleton-line long"></div></td>
            <td class="py-2"><div class="skeleton-line long"></div></td>
          </tr>
        `,
          )
          .join("")}
      `;
    }

    if ($("shodMemberDetailMeta")) {
      $("shodMemberDetailMeta").innerHTML = `
        <span class="skeleton-line" style="width:200px;height:14px;display:inline-block;border-radius:4px;"></span>
      `;
    }

    if ($("shodMemberDetailTitle")) {
      $("shodMemberDetailTitle").textContent = "Memuat...";
    }

    $("shodMemberDetailOverlay")?.classList.remove("hidden");

    const session = getSession();
    const d = await apiPost({
      action: "getShodaqohMemberDetail",
      token: session?.token || "",
      memberId: memberId,
    });

    if (!d.success) throw new Error(d.message || "Gagal memuat detail anggota");

    const m = d.member;

    if ($("shodMemberDetailTitle"))
      $("shodMemberDetailTitle").textContent = m.nama;

    const isActive = m.status === "AKTIF" || m.status === "ACTIVE";
    const statusClass = isActive ? "status-active" : "status-inactive";
    const statusLabel = isActive ? "Aktif" : "Tidak Aktif";

    if ($("shodMemberDetailMeta")) {
      $("shodMemberDetailMeta").innerHTML = `
        Nominal bulanan ${fmtRp(m.nominal_bulanan)}
        <span class="status-pill ${statusClass}" style="font-size:8px;padding:2px 10px;margin-left:4px;vertical-align:middle;">
          ${escapeHtml(statusLabel)}
        </span>
      `;
    }

    if (body) {
      const obligations = (d.obligations || []).sort(function (a, b) {
        return b.periode.localeCompare(a.periode);
      });

      if (obligations.length === 0) {
        body.innerHTML = `
          <tr>
            <td colspan="10" class="py-8 text-center text-xs text-[color:var(--ink-faint)]">
              Belum ada data kewajiban.
            </td>
          </tr>
        `;
      } else {
        // Ambil data payments untuk mendapatkan rincian
        const payments = d.payments || [];
        const paymentMap = {};
        payments.forEach(function (p) {
          paymentMap[p.payment_id] = p;
        });

        body.innerHTML = obligations
          .map(function (o) {
            let allocatedAt = o.allocated_at || "—";
            if (o.allocated_at) {
              const d = new Date(o.allocated_at);
              if (!isNaN(d.getTime())) {
                allocatedAt = fmtDateShort(o.allocated_at);
              }
            }

            const isLunas = o.status === "LUNAS" || o.status === "ACTIVE";
            const obStatusClass = isLunas ? "status-active" : "status-inactive";
            const obStatusLabel = isLunas ? "Lunas" : "Belum";

            // Ambil rincian dari payment jika ada
            let ir = 0;
            let uangSambung = 0;
            let jimpitan = 0;
            let siarSiar = 0;
            let seribuan = 0;
            let kafan = 0;
            let ukhroMt = 0;

            if (o.payment_id && paymentMap[o.payment_id]) {
              const p = paymentMap[o.payment_id];
              // IR = susulan_ir × jumlah bulan susulan
              const susulanBulan = p.susulan_bulan
                ? p.susulan_bulan.split(",").filter(function (b) {
                    return b.trim();
                  })
                : [];
              const bulanCount =
                susulanBulan.length > 0 ? susulanBulan.length : 1;
              ir = (p.susulan_ir || 0) * bulanCount;
              uangSambung = p.uang_sambung || 0;
              jimpitan = p.jimpitan || 0;
              siarSiar = p.siar_siar || 0;
              seribuan = p.seribuan || 0;
              kafan = p.kafan || 0;
              ukhroMt = p.ukhro_mt || 0;
            }

            // Jika tidak ada payment_id tapi status Lunas (kemungkinan data dari monitoring)
            if (!o.payment_id && isLunas) {
              // Gunakan nominal target sebagai dasar
              ir = o.nominal_target || 0;
            }

            // Hitung total
            const total =
              ir +
              uangSambung +
              jimpitan +
              siarSiar +
              seribuan +
              kafan +
              ukhroMt;

            // Format angka dengan pemisah ribuan
            const fmtNum = function (num) {
              return num > 0 ? "Rp" + num.toLocaleString("id-ID") : "—";
            };

            // Warna khusus untuk total (highlight)
            const totalColor = isLunas ? "var(--brand)" : "var(--ink-faint)";
            const totalWeight = isLunas ? "bold" : "normal";

            return `<tr class="border-t border-[color:var(--line)]">
              <td class="py-2 font-medium whitespace-nowrap">${escapeHtml(fmtMonthYear(o.periode))}</td>
              <td class="py-2">
                <span class="status-pill ${obStatusClass}" style="font-size:8px;padding:2px 10px;">
                  ${escapeHtml(obStatusLabel)}
                </span>
              </td>
              <td class="py-2 mono text-right text-[color:var(--ink-soft)]" style="font-size:9px;">${fmtNum(ir)}</td>
              <td class="py-2 mono text-right text-[color:var(--ink-soft)]" style="font-size:9px;">${fmtNum(uangSambung)}</td>
              <td class="py-2 mono text-right text-[color:var(--ink-soft)]" style="font-size:9px;">${fmtNum(jimpitan)}</td>
              <td class="py-2 mono text-right text-[color:var(--ink-soft)]" style="font-size:9px;">${fmtNum(siarSiar)}</td>
              <td class="py-2 mono text-right text-[color:var(--ink-soft)]" style="font-size:9px;">${fmtNum(seribuan)}</td>
              <td class="py-2 mono text-right text-[color:var(--ink-soft)]" style="font-size:9px;">${fmtNum(kafan)}</td>
              <td class="py-2 mono text-right text-[color:var(--ink-soft)]" style="font-size:9px;">${fmtNum(ukhroMt)}</td>
              <td class="py-2 mono text-right font-${totalWeight}" style="font-size:10px;color:${totalColor};">
                ${total > 0 ? "Rp" + total.toLocaleString("id-ID") : "—"}
              </td>
            </tr>`;
          })
          .join("");
      }
    }
  } catch (err) {
    console.error(err);
    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="10" class="py-8 text-center">
            <p class="text-xs text-[color:var(--neg)]">Gagal memuat data: ${escapeHtml(err.message)}</p>
            <button type="button" id="btnRetryMemberDetail" class="mt-3 p-3 text-xs font-bold" style="color:var(--brand);">
              Coba lagi
            </button>
          </td>
        </tr>
      `;

      const retryBtn = document.getElementById("btnRetryMemberDetail");
      if (retryBtn) {
        retryBtn.addEventListener("click", function () {
          openShodaqohMemberDetail(memberId);
        });
      }
    }
    showToast(err.message, "error");
  }
}

function renderShodaqohFilters() {
  const months = [
    { value: "", label: "Semua" },
    { value: "01", label: "Januari" },
    { value: "02", label: "Februari" },
    { value: "03", label: "Maret" },
    { value: "04", label: "April" },
    { value: "05", label: "Mei" },
    { value: "06", label: "Juni" },
    { value: "07", label: "Juli" },
    { value: "08", label: "Agustus" },
    { value: "09", label: "September" },
    { value: "10", label: "Oktober" },
    { value: "11", label: "November" },
    { value: "12", label: "Desember" },
  ];

  const statuses = [
    { value: "ALL", label: "Semua" },
    { value: "LUNAS", label: "Lunas" },
    { value: "BELUM", label: "Belum" },
  ];

  const years = [
    ...new Set(
      state.shodaqoh.payments
        .map((p) => String(p.tanggal).slice(0, 4))
        .filter(Boolean)
        .concat([String(state.shodaqoh.selectedMonth).slice(0, 4)]),
    ),
  ]
    .sort()
    .reverse();

  const members = [
    { value: "", label: "Semua" },
    ...(state.shodaqoh.members || []).map(function (m) {
      return { value: m.member_id, label: m.nama };
    }),
  ];

  renderFilterDropdown("shodYear", years, state.shodaqoh.filters.year || "");
  renderFilterDropdown("shodMonth", months, state.shodaqoh.filters.month || "");
  renderFilterDropdown(
    "shodMember",
    members,
    state.shodaqoh.filters.memberId || "",
  );
  renderFilterDropdown(
    "shodStatus",
    statuses,
    state.shodaqoh.filters.status || "ALL",
  );
}

function renderFilterDropdown(prefix, items, selectedValue) {
  const menu = $(prefix + "DropdownMenu");
  const value = $(prefix + "DropdownValue");
  const trigger = $(prefix + "DropdownTrigger");

  if (!menu || !value) return;

  if (Array.isArray(items) && items.length > 0) {
    const selectedItem = items.find(function (item) {
      const itemVal = item.value !== undefined ? item.value : item;
      return String(itemVal) === String(selectedValue);
    });
    if (selectedItem) {
      value.textContent =
        selectedItem.label || selectedItem.nama || selectedItem;
    } else {
      value.textContent = "Semua";
    }
  }

  menu.innerHTML = items
    .map(function (item) {
      const val = item.value !== undefined ? item.value : item;
      const label = item.label || item.nama || item;
      const isSelected = String(val) === String(selectedValue);
      return `<button type="button"
        class="filter-dropdown-option ${isSelected ? "active" : ""}"
        data-value="${val}"
        role="option"
        aria-selected="${isSelected}">
        <span>${label}</span>
      </button>`;
    })
    .join("");

  trigger.onclick = function (event) {
    event.stopPropagation();
    const dropdown = $(prefix + "Dropdown");
    const isOpen = dropdown.classList.contains("open");
    document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
      if (el.id !== dropdown.id) {
        el.classList.remove("open");
        el.querySelector(".filter-dropdown-trigger")?.setAttribute(
          "aria-expanded",
          "false",
        );
      }
    });
    dropdown.classList.toggle("open");
    dropdown
      .querySelector(".filter-dropdown-trigger")
      ?.setAttribute("aria-expanded", String(!isOpen));
  };

  menu.querySelectorAll(".filter-dropdown-option").forEach(function (option) {
    option.onclick = function (event) {
      event.stopPropagation();
      const val = this.dataset.value;
      const label = this.textContent.trim();
      const dropdown = $(prefix + "Dropdown");
      dropdown.classList.remove("open");
      dropdown
        .querySelector(".filter-dropdown-trigger")
        ?.setAttribute("aria-expanded", "false");

      const filterKey = prefix.replace("shod", "").toLowerCase();

      if (filterKey === "year") {
        state.shodaqoh.filters.year = val || "";
        value.textContent = label || "Semua";
        renderPaymentHistory();
      } else if (filterKey === "month") {
        state.shodaqoh.filters.month = val || "";
        value.textContent = label || "Semua";
        const p =
          state.shodaqoh.filters.year + "-" + state.shodaqoh.filters.month;
        if (state.shodaqoh.filters.year && state.shodaqoh.filters.month) {
          loadShodaqohData(p);
        } else {
          loadShodaqohData("");
        }
      } else if (filterKey === "member") {
        state.shodaqoh.filters.memberId = val || "";
        value.textContent = label || "Semua";
        renderShodaqohMonitoring();
        renderPaymentHistory();
      } else if (filterKey === "status") {
        state.shodaqoh.filters.status = val || "ALL";
        value.textContent = label || "Semua";
        renderShodaqohMonitoring();
      }

      menu.querySelectorAll(".filter-dropdown-option").forEach(function (el) {
        el.classList.toggle("active", el.dataset.value === val);
        el.setAttribute("aria-selected", el.dataset.value === val);
      });
    };
  });
}

document.addEventListener("click", function (event) {
  document
    .querySelectorAll(".filter-dropdown.open")
    .forEach(function (dropdown) {
      if (!dropdown.contains(event.target)) {
        dropdown.classList.remove("open");
        dropdown
          .querySelector(".filter-dropdown-trigger")
          ?.setAttribute("aria-expanded", "false");
      }
    });
});

const shodUploadInput = document.getElementById("shodUploadInput");
const shodUploadFileName = document.getElementById("shodUploadFileName");

if (shodUploadInput && shodUploadFileName) {
  shodUploadInput.addEventListener("change", function (e) {
    const fileName = this.files[0]?.name || "Pilih foto rekap";
    shodUploadFileName.textContent = fileName;
  });
}

function setButtonLoading(btn, isLoading) {
  if (!btn) return;

  if (isLoading) {
    btn._originalContent ||= btn.innerHTML;
    btn.innerHTML =
      btn.id === "fabPostToKas"
        ? `<span style="display:inline-block;width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .6s linear infinite"></span>`
        : `<span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:-2px;margin-right:7px"></span> Memproses...`;

    btn.disabled = true;
    btn.style.opacity = "0.7";
  } else {
    btn.innerHTML =
      btn._originalContent ||
      (btn.id === "fabPostToKas"
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7"/><polyline points="15 3 21 3 21 9"/><line x1="9" y1="15" x2="21" y2="3"/></svg>`
        : "Post ke Kas");

    btn.disabled = false;
    btn.style.opacity = "1";
  }
}

function initShodMemberDropdown() {
  console.log("initShodMemberDropdown dipanggil");
  const dropdown = document.getElementById("shodPaymentMemberDropdown");
  const trigger = document.getElementById("shodPaymentMemberTrigger");
  const valueDisplay = document.getElementById("shodPaymentMemberValue");
  const menu = document.getElementById("shodPaymentMemberMenu");
  const hiddenInput = document.getElementById("shodPaymentMember");

  if (!dropdown || !trigger || !valueDisplay || !menu || !hiddenInput) {
    console.log("Element tidak ditemukan:", {
      dropdown,
      trigger,
      valueDisplay,
      menu,
      hiddenInput,
    });
    return;
  }

  console.log("Element ditemukan, merender dropdown...");

  renderMemberDropdownMenu();

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    console.log("Trigger diklik");
    toggleMemberDropdown();
  });

  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleMemberDropdown();
    }
    if (e.key === "Escape") {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

function toggleMemberDropdown() {
  const dropdown = document.getElementById("shodPaymentMemberDropdown");
  const trigger = document.getElementById("shodPaymentMemberTrigger");
  const isOpen = dropdown.classList.contains("open");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    renderMemberDropdownMenu();
  }
}

function renderMemberDropdownMenu() {
  const menu = document.getElementById("shodPaymentMemberMenu");
  const hiddenInput = document.getElementById("shodPaymentMember");
  if (!menu) return;

  const members = state.shodaqoh.members || [];
  const selectedId = hiddenInput?.value || "";

  console.log("Merender anggota:", members.length, "selected:", selectedId);

  if (members.length === 0) {
    menu.innerHTML = `
      <button type="button" class="filter-dropdown-option" disabled style="opacity:0.5;cursor:not-allowed;">
        Belum ada anggota
      </button>
    `;
    return;
  }

  menu.innerHTML = members
    .map(function (m) {
      const isSelected = String(m.member_id) === String(selectedId);
      return `
      <button type="button" 
        class="filter-dropdown-option ${isSelected ? "active" : ""}"
        data-member-id="${escapeHtml(m.member_id)}"
        data-member-name="${escapeHtml(m.nama)}"
        role="option"
        aria-selected="${isSelected}">
        ${escapeHtml(m.nama)}
      </button>
    `;
    })
    .join("");

  menu.querySelectorAll(".filter-dropdown-option").forEach(function (option) {
    option.addEventListener("click", function (e) {
      e.stopPropagation();
      const memberId = this.dataset.memberId;
      const memberName = this.dataset.memberName;
      console.log("Memilih anggota:", memberId, memberName);
      selectMember(memberId, memberName);
    });
  });
}

function selectMember(memberId, memberName) {
  const valueDisplay = document.getElementById("shodPaymentMemberValue");
  const hiddenInput = document.getElementById("shodPaymentMember");
  const dropdown = document.getElementById("shodPaymentMemberDropdown");
  const trigger = document.getElementById("shodPaymentMemberTrigger");

  if (valueDisplay) valueDisplay.textContent = memberName || "Pilih anggota";
  if (hiddenInput) hiddenInput.value = memberId || "";

  if (dropdown) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  }

  renderMemberDropdownMenu();
}

let datePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

function initShodDatePicker() {
  console.log("initShodDatePicker dipanggil");
  const dropdown = document.getElementById("shodDateDropdown");
  const trigger = document.getElementById("shodDateDropdownTrigger");
  const valueDisplay = document.getElementById("shodDateDropdownValue");
  const menu = document.getElementById("shodDateDropdownMenu");
  const hiddenInput = document.getElementById("shodPaymentDate");

  if (!dropdown || !trigger || !valueDisplay || !menu || !hiddenInput) {
    console.log("Date picker element tidak ditemukan");
    return;
  }

  console.log("Date picker element ditemukan");

  const today = new Date();
  valueDisplay.textContent = formatDateDisplay(today);
  hiddenInput.value = formatDateInput(today);
  datePickerState.selectedDate = today;
  datePickerState.currentMonth = today.getMonth();
  datePickerState.currentYear = today.getFullYear();

  renderDatePickerMenu();

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleDatePicker(dropdown);
  });

  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      closeDatePicker(dropdown);
    }
  });

  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDatePicker(dropdown);
    }
    if (e.key === "Escape") {
      closeDatePicker(dropdown);
    }
  });
}

function toggleDatePicker(dropdown) {
  const isOpen = dropdown.classList.contains("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
    removeDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    renderDatePickerMenu();

    setTimeout(function () {
      const manualInput = document.getElementById("shodDateManualInput");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 100);

    if (window.innerWidth <= 480) {
      addDatePickerBackdrop(dropdown);
    }
  }
}

function addDatePickerBackdrop(dropdown) {
  removeDatePickerBackdrop();
  const backdrop = document.createElement("div");
  backdrop.id = "datePickerBackdrop";
  backdrop.addEventListener("click", function () {
    closeDatePicker(dropdown);
  });
  document.body.appendChild(backdrop);
}

function removeDatePickerBackdrop() {
  const backdrop = document.getElementById("datePickerBackdrop");
  if (backdrop) backdrop.remove();
}

function closeDatePicker(dropdown) {
  dropdown.classList.remove("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");
  trigger?.setAttribute("aria-expanded", "false");
  removeDatePickerBackdrop();
}

function renderDatePickerMenu() {
  const menu = document.getElementById("shodDateDropdownMenu");
  if (!menu) return;

  const year = datePickerState.currentYear;
  const month = datePickerState.currentMonth;

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

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let daysHtml = "";
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const prevMonthDays = firstDay;
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${day}" data-month="${month - 1}" data-year="${year}">${day}</button>`;
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const isToday =
      i === todayDate && month === todayMonth && year === todayYear;
    const isSelected =
      datePickerState.selectedDate &&
      datePickerState.selectedDate.getDate() === i &&
      datePickerState.selectedDate.getMonth() === month &&
      datePickerState.selectedDate.getFullYear() === year;

    let classes = "date-picker-day";
    if (isToday) classes += " today";
    if (isSelected) classes += " selected";

    daysHtml += `<button type="button" class="${classes}" data-day="${i}" data-month="${month}" data-year="${year}">${i}</button>`;
  }

  const totalDays = prevMonthDays + daysInMonth;
  const remainingDays = 42 - totalDays;
  for (let i = 1; i <= remainingDays; i++) {
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${i}" data-month="${month + 1}" data-year="${year}">${i}</button>`;
  }

  const currentDate = datePickerState.selectedDate;
  let currentDateStr = "";
  if (currentDate) {
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const year = currentDate.getFullYear();
    currentDateStr = `${day}-${month}-${year}`;
  }

  menu.innerHTML = `
    <div class="date-picker-input-wrap">
      <input 
        type="text" 
        id="shodDateManualInput"
        class="date-picker-manual-input"
        placeholder="dd-mm-yyyy"
        value="${currentDateStr}"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="button" id="shodDateManualApply" class="date-picker-apply">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </button>
    </div>

    <div class="date-picker-divider"></div>

    <div class="date-picker-header">
      <button type="button" class="date-picker-nav" data-direction="prev">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span class="date-picker-month-year">${monthNames[month]} ${year}</span>
      <button type="button" class="date-picker-nav" data-direction="next">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>

    <div class="date-picker-weekdays">
      <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span>
      <span>Kam</span><span>Jum</span><span>Sab</span>
    </div>

    <div class="date-picker-days">
      ${daysHtml}
    </div>

    <div class="date-picker-footer">
      <button type="button" class="date-picker-today">Hari Ini</button>
      <button type="button" class="date-picker-clear">Hapus</button>
    </div>
  `;

  const manualInput = document.getElementById("shodDateManualInput");
  if (manualInput) {
    manualInput.addEventListener("input", function (e) {
      let value = this.value.replace(/\D/g, "");
      if (value.length > 8) value = value.slice(0, 8);
      if (value.length > 2) {
        value = value.slice(0, 2) + "-" + value.slice(2);
      }
      if (value.length > 5) {
        value = value.slice(0, 5) + "-" + value.slice(5);
      }
      this.value = value;
    });

    manualInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        applyManualDate(this.value);
      }
      if (e.key === "Escape") {
        const dropdown = document.getElementById("shodDateDropdown");
        closeDatePicker(dropdown);
      }
    });
  }

  const applyBtn = document.getElementById("shodDateManualApply");
  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const input = document.getElementById("shodDateManualInput");
      if (input) {
        applyManualDate(input.value);
      }
    });
  }

  menu.querySelectorAll(".date-picker-nav").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const direction = this.dataset.direction;
      if (direction === "prev") {
        datePickerState.currentMonth--;
        if (datePickerState.currentMonth < 0) {
          datePickerState.currentMonth = 11;
          datePickerState.currentYear--;
        }
      } else {
        datePickerState.currentMonth++;
        if (datePickerState.currentMonth > 11) {
          datePickerState.currentMonth = 0;
          datePickerState.currentYear++;
        }
      }
      renderDatePickerMenu();
    });
  });

  menu.querySelectorAll(".date-picker-day").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const day = parseInt(this.dataset.day);
      const month = parseInt(this.dataset.month);
      const year = parseInt(this.dataset.year);
      const date = new Date(year, month, day);
      selectDate(date);
    });
  });

  const todayBtn = menu.querySelector(".date-picker-today");
  if (todayBtn) {
    todayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const today = new Date();
      selectDate(today);
    });
  }

  const clearBtn = menu.querySelector(".date-picker-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      clearDate();
    });
  }
}

function applyManualDate(dateStr) {
  if (!dateStr) return;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return;
  if (day < 1 || day > 31) return;
  if (month < 0 || month > 11) return;
  if (year < 1900 || year > 2100) return;
  const date = new Date(year, month, day);
  if (date.getDate() !== day) return;
  selectDate(date);
}

function selectDate(date) {
  if (!date || isNaN(date.getTime())) return;

  datePickerState.selectedDate = date;
  datePickerState.currentMonth = date.getMonth();
  datePickerState.currentYear = date.getFullYear();

  const valueDisplay = document.getElementById("shodDateDropdownValue");
  const hiddenInput = document.getElementById("shodPaymentDate");
  const manualInput = document.getElementById("shodDateManualInput");

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const formattedManualDate = `${day}-${month}-${year}`;

  if (valueDisplay) {
    valueDisplay.textContent = formatDateDisplay(date);
  }

  if (hiddenInput) {
    hiddenInput.value = formatDateInput(date);
  }

  if (manualInput) {
    manualInput.value = formattedManualDate;
  }

  const dropdown = document.getElementById("shodDateDropdown");

  closeDatePicker(dropdown);

  if (hiddenInput) {
    hiddenInput.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );

    hiddenInput.dispatchEvent(
      new Event("change", {
        bubbles: true,
      }),
    );
  }
}

function clearDate() {
  const valueDisplay = document.getElementById("shodDateDropdownValue");
  const hiddenInput = document.getElementById("shodPaymentDate");
  const manualInput = document.getElementById("shodDateManualInput");

  if (valueDisplay) valueDisplay.textContent = "Pilih tanggal";
  if (hiddenInput) hiddenInput.value = "";
  if (manualInput) manualInput.value = "";

  datePickerState.selectedDate = null;

  const dropdown = document.getElementById("shodDateDropdown");
  closeDatePicker(dropdown);
}

let txDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

function initTxDatePicker() {
  console.log("initTxDatePicker dipanggil");
  const dropdown = document.getElementById("txDateDropdown");
  const trigger = document.getElementById("txDateDropdownTrigger");
  const valueDisplay = document.getElementById("txDateDropdownValue");
  const menu = document.getElementById("txDateDropdownMenu");
  const hiddenInput = document.getElementById("txTanggal");

  if (!dropdown || !trigger || !valueDisplay || !menu || !hiddenInput) {
    console.log("TX Date picker element tidak ditemukan");
    return;
  }

  console.log("TX Date picker element ditemukan");

  const today = new Date();
  valueDisplay.textContent = formatDateDisplay(today);
  hiddenInput.value = formatDateInput(today);
  txDatePickerState.selectedDate = today;
  txDatePickerState.currentMonth = today.getMonth();
  txDatePickerState.currentYear = today.getFullYear();

  renderTxDatePickerMenu();

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleTxDatePicker(dropdown);
  });

  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      closeTxDatePicker(dropdown);
    }
  });

  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTxDatePicker(dropdown);
    }
    if (e.key === "Escape") {
      closeTxDatePicker(dropdown);
    }
  });
}

function toggleTxDatePicker(dropdown) {
  const isOpen = dropdown.classList.contains("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
    removeTxDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    renderTxDatePickerMenu();

    setTimeout(function () {
      const manualInput = document.getElementById("txDateManualInput");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 100);

    if (window.innerWidth <= 480) {
      addTxDatePickerBackdrop(dropdown);
    }
  }
}

function addTxDatePickerBackdrop(dropdown) {
  removeTxDatePickerBackdrop();
  const backdrop = document.createElement("div");
  backdrop.id = "txDatePickerBackdrop";
  backdrop.addEventListener("click", function () {
    closeTxDatePicker(dropdown);
  });
  document.body.appendChild(backdrop);
}

function removeTxDatePickerBackdrop() {
  const backdrop = document.getElementById("txDatePickerBackdrop");
  if (backdrop) backdrop.remove();
}

function closeTxDatePicker(dropdown) {
  dropdown.classList.remove("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");
  trigger?.setAttribute("aria-expanded", "false");
  removeTxDatePickerBackdrop();
}

function renderTxDatePickerMenu() {
  const menu = document.getElementById("txDateDropdownMenu");
  if (!menu) return;

  const year = txDatePickerState.currentYear;
  const month = txDatePickerState.currentMonth;

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

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let daysHtml = "";
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const prevMonthDays = firstDay;
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${day}" data-month="${month - 1}" data-year="${year}">${day}</button>`;
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const isToday =
      i === todayDate && month === todayMonth && year === todayYear;
    const isSelected =
      txDatePickerState.selectedDate &&
      txDatePickerState.selectedDate.getDate() === i &&
      txDatePickerState.selectedDate.getMonth() === month &&
      txDatePickerState.selectedDate.getFullYear() === year;

    let classes = "date-picker-day";
    if (isToday) classes += " today";
    if (isSelected) classes += " selected";

    daysHtml += `<button type="button" class="${classes}" data-day="${i}" data-month="${month}" data-year="${year}">${i}</button>`;
  }

  const totalDays = prevMonthDays + daysInMonth;
  const remainingDays = 42 - totalDays;
  for (let i = 1; i <= remainingDays; i++) {
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${i}" data-month="${month + 1}" data-year="${year}">${i}</button>`;
  }

  const currentDate = txDatePickerState.selectedDate;
  let currentDateStr = "";
  if (currentDate) {
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const year = currentDate.getFullYear();
    currentDateStr = `${day}-${month}-${year}`;
  }

  menu.innerHTML = `
    <div class="date-picker-input-wrap">
      <input 
        type="text" 
        id="txDateManualInput"
        class="date-picker-manual-input"
        placeholder="dd-mm-yyyy"
        value="${currentDateStr}"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="button" id="txDateManualApply" class="date-picker-apply">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </button>
    </div>

    <div class="date-picker-divider"></div>

    <div class="date-picker-header">
      <button type="button" class="date-picker-nav" data-direction="prev">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span class="date-picker-month-year">${monthNames[month]} ${year}</span>
      <button type="button" class="date-picker-nav" data-direction="next">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>

    <div class="date-picker-weekdays">
      <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span>
      <span>Kam</span><span>Jum</span><span>Sab</span>
    </div>

    <div class="date-picker-days">
      ${daysHtml}
    </div>

    <div class="date-picker-footer">
      <button type="button" class="date-picker-today">Hari Ini</button>
      <button type="button" class="date-picker-clear">Hapus</button>
    </div>
  `;

  const manualInput = document.getElementById("txDateManualInput");
  if (manualInput) {
    manualInput.addEventListener("input", function (e) {
      let value = this.value.replace(/\D/g, "");
      if (value.length > 8) value = value.slice(0, 8);
      if (value.length > 2) {
        value = value.slice(0, 2) + "-" + value.slice(2);
      }
      if (value.length > 5) {
        value = value.slice(0, 5) + "-" + value.slice(5);
      }
      this.value = value;
    });

    manualInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        applyTxManualDate(this.value);
      }
      if (e.key === "Escape") {
        const dropdown = document.getElementById("txDateDropdown");
        closeTxDatePicker(dropdown);
      }
    });
  }

  const applyBtn = document.getElementById("txDateManualApply");
  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const input = document.getElementById("txDateManualInput");
      if (input) {
        applyTxManualDate(input.value);
      }
    });
  }

  menu.querySelectorAll(".date-picker-nav").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const direction = this.dataset.direction;
      if (direction === "prev") {
        txDatePickerState.currentMonth--;
        if (txDatePickerState.currentMonth < 0) {
          txDatePickerState.currentMonth = 11;
          txDatePickerState.currentYear--;
        }
      } else {
        txDatePickerState.currentMonth++;
        if (txDatePickerState.currentMonth > 11) {
          txDatePickerState.currentMonth = 0;
          txDatePickerState.currentYear++;
        }
      }
      renderTxDatePickerMenu();
    });
  });

  menu.querySelectorAll(".date-picker-day").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const day = parseInt(this.dataset.day);
      const month = parseInt(this.dataset.month);
      const year = parseInt(this.dataset.year);
      const date = new Date(year, month, day);
      selectTxDate(date);
    });
  });

  const todayBtn = menu.querySelector(".date-picker-today");
  if (todayBtn) {
    todayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const today = new Date();
      selectTxDate(today);
    });
  }

  const clearBtn = menu.querySelector(".date-picker-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      clearTxDate();
    });
  }
}

function applyTxManualDate(dateStr) {
  if (!dateStr) return;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return;
  if (day < 1 || day > 31) return;
  if (month < 0 || month > 11) return;
  if (year < 1900 || year > 2100) return;
  const date = new Date(year, month, day);
  if (date.getDate() !== day) return;
  selectTxDate(date);
}

function selectTxDate(date) {
  if (!date || isNaN(date.getTime())) return;

  txDatePickerState.selectedDate = date;
  txDatePickerState.currentMonth = date.getMonth();
  txDatePickerState.currentYear = date.getFullYear();

  const valueDisplay = document.getElementById("txDateDropdownValue");
  const hiddenInput = document.getElementById("txTanggal");
  const manualInput = document.getElementById("txDateManualInput");

  const formattedDate = formatDateInput(date);

  if (valueDisplay) {
    valueDisplay.textContent = formatDateDisplay(date);
  }

  if (hiddenInput) {
    hiddenInput.value = formattedDate;
  }

  if (manualInput) {
    manualInput.value = formattedDate;
  }

  const dropdown = document.getElementById("txDateDropdown");
  closeTxDatePicker(dropdown);

  if (hiddenInput) {
    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function clearTxDate() {
  const valueDisplay = document.getElementById("txDateDropdownValue");
  const hiddenInput = document.getElementById("txTanggal");
  const manualInput = document.getElementById("txDateManualInput");

  if (valueDisplay) valueDisplay.textContent = "Pilih tanggal";
  if (hiddenInput) hiddenInput.value = "";
  if (manualInput) manualInput.value = "";

  txDatePickerState.selectedDate = null;

  const dropdown = document.getElementById("txDateDropdown");
  closeTxDatePicker(dropdown);
}

const ACCOUNT_CATEGORIES = [
  "SALDO AWAL",
  "PEMASUKAN INFAK SAMBUNG",
  "INFAK IR",
  "PEMASUKAN UANG SAMBUNG",
  "PEMASUKAN INFAK JUMAT",
  "JIMPITAN",
  "SIAR-SIAR",
  "KAFAN",
  "INFAK SERIBUAN",
  "PEMASUKAN UKHRO MT",
  "SETOR INFAK SAMBUNG",
  "SETOR 2/3 INFAK JUMAT",
  "INFAQ SAMBUNG DESA",
  "INFAQ SAMBUNG DAERAH",
  "UKHRO MT",
  "BEBAN OPERASIONAL BULAN BERJALAN",
  "BEBAN PENGELUARAN LAIN-LAIN",
  "PEMASUKAN LAIN-LAIN",
];

function initTxAccountDropdown() {
  console.log("initTxAccountDropdown dipanggil");
  const dropdown = document.getElementById("txAccountDropdown");
  const trigger = document.getElementById("txAccountDropdownTrigger");
  const valueDisplay = document.getElementById("txAccountDropdownValue");
  const menu = document.getElementById("txAccountDropdownMenu");
  const hiddenInput = document.getElementById("txAccount");

  if (!dropdown || !trigger || !valueDisplay || !menu || !hiddenInput) {
    console.log("Account dropdown element tidak ditemukan");
    return;
  }

  console.log("Account dropdown element ditemukan");

  renderTxAccountDropdownMenu();

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleTxAccountDropdown();
  });

  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  trigger.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleTxAccountDropdown();
    }
    if (e.key === "Escape") {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

function toggleTxAccountDropdown() {
  const dropdown = document.getElementById("txAccountDropdown");
  const trigger = document.getElementById("txAccountDropdownTrigger");
  const isOpen = dropdown.classList.contains("open");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");
    renderTxAccountDropdownMenu();
  }
}

function renderTxAccountDropdownMenu() {
  const menu = document.getElementById("txAccountDropdownMenu");
  const hiddenInput = document.getElementById("txAccount");
  if (!menu) return;

  const selectedValue = hiddenInput?.value || "";

  menu.innerHTML = ACCOUNT_CATEGORIES.map(function (account) {
    const isSelected = account === selectedValue;
    return `
        <button type="button" 
          class="filter-dropdown-option ${isSelected ? "active" : ""}"
          data-account="${escapeHtml(account)}"
          role="option"
          aria-selected="${isSelected}">
          ${escapeHtml(account)}
        </button>
      `;
  }).join("");
}

function selectTxAccount(account) {
  const valueDisplay = document.getElementById("txAccountDropdownValue");
  const hiddenInput = document.getElementById("txAccount");
  const dropdown = document.getElementById("txAccountDropdown");
  const trigger = document.getElementById("txAccountDropdownTrigger");

  if (valueDisplay) valueDisplay.textContent = account || "Pilih kategori";
  if (hiddenInput) hiddenInput.value = account || "";

  if (dropdown) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
  }

  renderTxAccountDropdownMenu();
}

function initTxForm() {
  initTxDatePicker();
  initTxAccountDropdown();

  document.addEventListener("click", function (e) {
    const option = e.target.closest(
      "#txAccountDropdownMenu .filter-dropdown-option",
    );
    if (option) {
      e.preventDefault();
      const account = option.dataset.account;
      if (account) {
        selectTxAccount(account);
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    initTxForm();
  }, 200);
});

function formatDateDisplay(date) {
  const bulan = [
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
  const day = String(date.getDate()).padStart(2, "0");
  const month = bulan[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderShodaqohSkeleton() {
  const container = document.querySelector("#screen-shodaqoh");
  if (!container) return;

  // Hapus skeleton lama jika ada
  container
    .querySelectorAll(".shod-skeleton-wrapper")
    .forEach((el) => el.remove());

  // SEMBUNYIKAN SEMUA KONTEN ASLI
  const children = container.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.classList && child.classList.contains("shod-skeleton-wrapper"))
      continue;
    child.style.display = "none";
  }

  // Buat wrapper skeleton
  const wrapper = document.createElement("div");
  wrapper.className = "shod-skeleton-wrapper";
  wrapper.style.cssText = "display:block;width:100%;";

  wrapper.innerHTML = `
    <!-- Skeleton: Header (judul + tombol) -->
    <div class="flex items-center justify-between gap-3 skeleton-loading" style="margin-bottom:12px;">
      <div>
        <div class="skeleton-line" style="width:80px;height:10px;border-radius:4px;margin-bottom:4px;"></div>
        <div class="skeleton-line" style="width:200px;height:24px;border-radius:4px;margin-bottom:4px;"></div>
        <div class="skeleton-line" style="width:120px;height:14px;border-radius:4px;"></div>
      </div>
      <div class="flex items-center gap-2">
        <div class="skeleton-line" style="width:34px;height:34px;border-radius:8px;"></div>
        <div class="skeleton-line" style="width:34px;height:34px;border-radius:8px;"></div>
      </div>
    </div>

    <!-- Skeleton: Dashboard 4 card (grid 2x2) -->
    <div class="grid grid-cols-2 gap-3" style="margin-bottom:12px;">
      ${[1, 2, 3, 4]
        .map(
          () => `
        <div class="card p-4 skeleton-loading">
          <div class="skeleton-line" style="width:40%;height:10px;border-radius:4px;margin-bottom:6px;"></div>
          <div class="skeleton-line" style="width:60%;height:20px;border-radius:4px;"></div>
        </div>
      `,
        )
        .join("")}
    </div>

    <!-- Skeleton: Rincian Alokasi Pembayaran -->
    <div class="card p-4" style="margin-bottom:12px;">
      <div class="skeleton-line" style="width:50%;height:14px;border-radius:4px;margin-bottom:12px;"></div>
      <div class="grid grid-cols-2 gap-2">
        ${[1, 2, 3, 4, 5, 6, 7, 8]
          .map(
            () => `
          <div class="card p-3 skeleton-loading">
            <div class="skeleton-line" style="width:60%;height:8px;border-radius:4px;margin-bottom:4px;"></div>
            <div class="skeleton-line" style="width:50%;height:16px;border-radius:4px;"></div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <!-- Skeleton: Filter (4 dropdown) -->
    <div class="card p-4" style="margin-bottom:12px;">
      <div class="grid grid-cols-2 gap-3 skeleton-loading">
        ${[1, 2, 3, 4]
          .map(
            () => `
          <div>
            <div class="skeleton-line" style="width:30%;height:8px;border-radius:4px;margin-bottom:4px;"></div>
            <div class="skeleton-line" style="width:100%;height:34px;border-radius:8px;"></div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <!-- Skeleton: Tabs (3 tab) -->
    <div style="margin-bottom:8px;">
      <div class="shod-tabs" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
        ${[1, 2, 3]
          .map(
            () => `
          <div style="height:34px;border:1px solid var(--line);border-radius:8px;background:var(--surface);display:flex;align-items:center;justify-content:center;">
            <span class="skeleton-line" style="display:block;width:48px;height:10px;border-radius:4px;"></span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>

    <!-- Skeleton: Monitoring Table -->
    <div class="card p-4">
      <!-- Header table -->
      <div class="flex items-center justify-between mb-3 skeleton-loading">
        <div class="flex items-center gap-3">
          <span class="skeleton-line" style="display:inline-block;width:80px;height:12px;border-radius:4px;"></span>
          <span class="skeleton-line" style="display:inline-block;width:60px;height:10px;border-radius:4px;"></span>
        </div>
        <div class="flex items-center gap-3">
          <span class="skeleton-line" style="display:inline-block;width:50px;height:10px;border-radius:4px;"></span>
          <span class="skeleton-line" style="display:inline-block;width:50px;height:10px;border-radius:4px;"></span>
        </div>
      </div>
      
      <!-- Table header -->
      <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 0.8fr 1fr;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--line);">
        ${["Anggota", "Target", "Dibayar", "Status", "Tgl Bayar"]
          .map(
            () =>
              `<span class="skeleton-line" style="height:10px;border-radius:4px;"></span>`,
          )
          .join("")}
      </div>
      
      <!-- Table rows -->
      ${[1, 2, 3, 4, 5, 6, 7]
        .map(
          () => `
        <div style="display:grid;grid-template-columns:1.5fr 0.8fr 0.8fr 0.8fr 1fr;gap:8px;padding:10px 0;border-bottom:1px solid var(--line);">
          ${[1, 2, 3, 4, 5]
            .map(
              () =>
                `<span class="skeleton-line" style="height:12px;border-radius:4px;"></span>`,
            )
            .join("")}
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  // Masukkan skeleton di awal container (sebelum konten asli)
  container.insertBefore(wrapper, container.firstChild);
}

function renderShodaqohError(message) {
  const container = document.querySelector("#screen-shodaqoh");
  if (!container) return;

  const monitoringTab = container.querySelector(
    ".shod-tab-content-shod-monitoring",
  );

  if (monitoringTab) {
    monitoringTab.innerHTML = `
      <div class="card p-5">
        <div
          class="flex flex-col items-center justify-center text-center py-8"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center"
            style="background:var(--neg-soft);color:var(--neg);"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="9"></circle>
              <path d="M12 8v4"></path>
              <path d="M12 16h.01"></path>
            </svg>
          </div>

          <p
            class="text-xs mt-3"
            style="color:var(--neg);"
          >
            Gagal memuat data
          </p>

          <button
            type="button"
            id="btnRetryShodaqoh"
            class="btn-primary mt-4"
          >
            Coba lagi
          </button>
        </div>
      </div>
    `;

    const retryBtn = $("btnRetryShodaqoh");

    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        loadShodaqohData(state.shodaqoh.selectedMonth);
      });
    }
  }

  const membersTab = container.querySelector(".shod-tab-content-shod-members");

  const paymentsTab = container.querySelector(
    ".shod-tab-content-shod-payments",
  );

  if (membersTab) {
    membersTab.style.display = "none";
  }

  if (paymentsTab) {
    paymentsTab.style.display = "none";
  }
}

function renderHomeSkeleton() {
  const saldoAkhir = $("homeSaldoAkhir");
  if (saldoAkhir) {
    saldoAkhir.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:140px;height:30px;border-radius:4px;"></span>`;
  }

  const periodeText = $("homePeriodeText");
  if (periodeText) {
    periodeText.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:120px;height:14px;border-radius:4px;"></span>`;
  }

  const totalTx = $("homeTotalTx");
  if (totalTx) {
    totalTx.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:60px;height:14px;border-radius:4px;"></span>`;
  }

  const saldoAwal = $("homeSaldoAwal");
  if (saldoAwal) {
    saldoAwal.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:16px;border-radius:4px;"></span>`;
  }

  const debet = $("homeDebet");
  if (debet) {
    debet.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:18px;border-radius:4px;"></span>`;
  }

  const kredit = $("homeKredit");
  if (kredit) {
    kredit.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:18px;border-radius:4px;"></span>`;
  }

  const surplus = $("homeSurplus");
  if (surplus) {
    surplus.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:18px;border-radius:4px;"></span>`;
  }

  const surplusBadge = $("homeSurplusBadge");
  if (surplusBadge) {
    surplusBadge.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:50px;height:16px;border-radius:999px;"></span>`;
  }

  const chartWrapper = document.getElementById("chartWrapper");
  if (chartWrapper) {
    const oldSkeleton = chartWrapper.querySelector(".chart-skeleton");
    if (oldSkeleton) oldSkeleton.remove();

    const canvas = chartWrapper.querySelector("#saldoChart");
    if (canvas) canvas.style.display = "none";

    const skeleton = document.createElement("div");
    skeleton.className = "chart-skeleton";
    skeleton.innerHTML = `
      <div class="chart-skeleton-content">
        <div class="chart-skeleton-grid">
          <div class="chart-skeleton-grid-line"></div>
          <div class="chart-skeleton-grid-line"></div>
          <div class="chart-skeleton-grid-line"></div>
          <div class="chart-skeleton-grid-line"></div>
          <div class="chart-skeleton-grid-line"></div>
        </div>
        <div class="chart-skeleton-wave">
          <div class="chart-skeleton-wave-line"></div>
        </div>
        <div class="chart-skeleton-labels">
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
          <span class="skeleton-line" style="width:28px;height:8px;border-radius:2px;"></span>
        </div>
      </div>
    `;
    chartWrapper.appendChild(skeleton);
  }

  const recentList = $("homeRecentList");
  if (recentList) {
    recentList.innerHTML = `
      ${[1, 2, 3, 4, 5]
        .map(
          () => `
        <div class="tx-card skeleton-loading">
          <div class="tx-icon skeleton-line" style="width:34px;height:34px;border-radius:8px;flex-shrink:0;"></div>
          <div class="flex-1">
            <div class="skeleton-line" style="width:60%;height:16px;border-radius:4px;"></div>
            <div class="skeleton-line mt-2" style="width:40%;height:12px;border-radius:4px;"></div>
            <div class="skeleton-line mt-1" style="width:30%;height:10px;border-radius:4px;"></div>
          </div>
          <div class="text-right">
            <div class="skeleton-line" style="width:60px;height:16px;border-radius:4px;margin-left:auto;"></div>
            <div class="skeleton-line mt-2" style="width:40px;height:12px;border-radius:4px;margin-left:auto;"></div>
          </div>
        </div>
      `,
        )
        .join("")}
    `;
  }

  const chartScope = $("chartScopeLabel");
  if (chartScope) {
    chartScope.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:12px;border-radius:4px;"></span>`;
  }
}

function renderHistorySkeleton() {
  const saldoAwal = $("rySaldoAwal");
  if (saldoAwal) {
    saldoAwal.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:16px;border-radius:4px;"></span>`;
  }

  const saldoAkhir = $("rySaldoAkhir");
  if (saldoAkhir) {
    saldoAkhir.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:80px;height:16px;border-radius:4px;"></span>`;
  }

  const periodHint = $("periodHint");
  if (periodHint) {
    periodHint.innerHTML = `<span class="skeleton-line" style="display:inline-block;width:180px;height:14px;border-radius:4px;"></span>`;
  }

  const txList = $("txList");
  if (txList) {
    txList.innerHTML = `
      ${[1, 2, 3, 4, 5, 6, 7, 8]
        .map(
          () => `
        <div class="tx-card skeleton-loading">
          <div class="tx-icon skeleton-line" style="width:34px;height:34px;border-radius:8px;flex-shrink:0;"></div>
          <div class="flex-1">
            <div class="skeleton-line" style="width:60%;height:16px;border-radius:4px;"></div>
            <div class="skeleton-line mt-2" style="width:40%;height:12px;border-radius:4px;"></div>
            <div class="skeleton-line mt-1" style="width:30%;height:10px;border-radius:4px;"></div>
          </div>
          <div class="text-right">
            <div class="skeleton-line" style="width:60px;height:16px;border-radius:4px;margin-left:auto;"></div>
            <div class="skeleton-line mt-2" style="width:40px;height:12px;border-radius:4px;margin-left:auto;"></div>
          </div>
        </div>
      `,
        )
        .join("")}
    `;
  }

  const txEmpty = $("txEmpty");
  if (txEmpty) {
    txEmpty.classList.add("hidden");
  }
}

function renderRecapSkeleton() {
  const recapList = $("recapList");
  if (recapList) {
    recapList.innerHTML = `
      ${[1, 2, 3, 4, 5, 6]
        .map(
          () => `
        <div class="card p-4 skeleton-loading">
          <div class="flex items-center justify-between">
            <div class="skeleton-line" style="width:120px;height:18px;border-radius:4px;"></div>
            <div class="skeleton-line" style="width:20px;height:16px;border-radius:4px;"></div>
          </div>
          <div class="grid grid-cols-3 gap-2 mt-3">
            <div>
              <div class="skeleton-line" style="width:30px;height:10px;border-radius:4px;"></div>
              <div class="skeleton-line mt-1" style="width:60px;height:14px;border-radius:4px;"></div>
            </div>
            <div>
              <div class="skeleton-line" style="width:30px;height:10px;border-radius:4px;"></div>
              <div class="skeleton-line mt-1" style="width:60px;height:14px;border-radius:4px;"></div>
            </div>
            <div>
              <div class="skeleton-line" style="width:30px;height:10px;border-radius:4px;"></div>
              <div class="skeleton-line mt-1" style="width:60px;height:14px;border-radius:4px;"></div>
            </div>
          </div>
        </div>
      `,
        )
        .join("")}
    `;
  }
}

function normalizeShodOcrText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[|]/g, "i")
    .replace(/[“”"'`]/g, "")
    .replace(/[^a-z0-9.,\-+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeOcrWord(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function shodMatchField(text) {
  const n = normalizeShodOcrText(text);

  if (
    /\bpersenan\b/.test(n) ||
    /\bpersen\b/.test(n) ||
    /\b(infak|infaq)\s+ir\b/.test(n) ||
    /\b(shodaqoh|shodagoh)\s+ir\b/.test(n)
  ) {
    return "susulan_ir";
  }

  if (
    /\bsambung\b/.test(n) ||
    /\buang\s+sambung\b/.test(n) ||
    /\b(shodaqoh|shodagoh)\s+sambung\b/.test(n)
  ) {
    return "uang_sambung";
  }

  if (/\bjimpitan\b/.test(n)) {
    return "jimpitan";
  }

  if (/\bsiar[\s-]*siar\b/.test(n)) {
    return "siar_siar";
  }

  if (/\bseribuan\b/.test(n)) {
    return "seribuan";
  }

  if (n === "kf" || n === "kaf" || /\bkafan\b/.test(n)) {
    return "kafan";
  }

  if (
    n === "mt" ||
    /\bmt\b/.test(n) ||
    /\bukhro\s*mt\b/.test(n) ||
    /\bukro\s*mt\b/.test(n)
  ) {
    return "ukhro_mt";
  }

  return null;
}

function shodAmountFromText(value) {
  let s = String(value || "").trim();

  s = s
    .replace(/[oO]/g, "0")
    .replace(/[lI|]/g, "1")
    .replace(/[sS]/g, "5")
    .replace(/[zZ]/g, "2")
    .replace(/[bB]/g, "8");

  const matches = s.match(/\d{1,3}(?:[.,\-\s]\d{3})+|\d{4,}/g);

  if (!matches || !matches.length) {
    return 0;
  }

  const values = matches
    .map((m) => Number(String(m).replace(/[^\d]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  return values.length ? Math.max(...values) : 0;
}

function shodParseTable(text) {
  const result = {
    total: 0,
    susulan_ir: 0,
    susulan_bulan: [],
    uang_sambung: 0,
    jimpitan: 0,
    siar_siar: 0,
    seribuan: 0,
    kafan: 0,
    ukhro_mt: 0,
    keterangan: "",
    rawText: String(text || ""),
  };

  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const normalized = normalizeShodOcrText(line);

    if (!normalized) continue;

    if (/\btotal\b/.test(normalized)) {
      const total = shodAmountFromText(line);

      if (total > 0) {
        result.total = total;
      }

      continue;
    }

    const field = shodMatchField(normalized);

    if (!field) {
      continue;
    }

    const amount = shodAmountFromText(line);

    if (amount > 0) {
      result[field] = amount;
    }
  }

  if (!result.total) {
    result.total =
      Number(result.susulan_ir || 0) +
      Number(result.uang_sambung || 0) +
      Number(result.jimpitan || 0) +
      Number(result.siar_siar || 0) +
      Number(result.seribuan || 0) +
      Number(result.kafan || 0) +
      Number(result.ukhro_mt || 0);
  }

  return result;
}

async function prepareShodOcrImage(dataUrl, rotation = 0, threshold = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = function () {
      const originalW = img.naturalWidth;
      const originalH = img.naturalHeight;

      const maxSide = 3000;
      const scale = Math.min(1, maxSide / Math.max(originalW, originalH));

      const w = Math.round(originalW * scale);
      const h = Math.round(originalH * scale);

      const rotated = rotation === 90 || rotation === 270;

      const canvas = document.createElement("canvas");

      canvas.width = rotated ? h : w;
      canvas.height = rotated ? w : h;

      const ctx = canvas.getContext("2d", {
        willReadFrequently: true,
      });

      ctx.save();

      ctx.translate(canvas.width / 2, canvas.height / 2);

      ctx.rotate((rotation * Math.PI) / 180);

      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      ctx.restore();

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const pixels = imageData.data;

      for (let i = 0; i < pixels.length; i += 4) {
        let gray =
          0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];

        gray = (gray - 128) * 1.35 + 128;

        gray = Math.max(0, Math.min(255, gray));

        if (threshold) {
          gray = gray > 170 ? 255 : 0;
        }

        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };

    img.onerror = function () {
      reject(new Error("Gagal memproses gambar untuk OCR."));
    };

    img.src = dataUrl;
  });
}

function scoreShodOcrResult(text) {
  const n = normalizeShodOcrText(text);

  let score = 0;

  const keywords = [
    "persenan",
    "persen",
    "sambung",
    "jimpitan",
    "siar",
    "seribuan",
    "kafan",
    "kf",
    "mt",
    "ukhro",
    "total",
    "jumlah",
    "shodaqoh",
    "shodagoh",
    "infak",
    "infaq",
  ];

  keywords.forEach((keyword) => {
    if (n.includes(keyword)) {
      score += 10;
    }
  });

  const numbers = n.match(/\d{3,}/g);

  if (numbers) {
    score += numbers.length * 3;
  }

  const lines = text.split(/\r?\n/).filter((x) => x.trim());

  score += Math.min(lines.length, 20);

  return score;
}

async function runShodOcrMultiPass(dataUrl) {
  if (!window.Tesseract) {
    throw new Error("Tesseract.js belum dimuat.");
  }

  const candidates = [];

  const rotations = [0, 90, 180, 270];

  const thresholds = [false, true];

  for (const rotation of rotations) {
    for (const threshold of thresholds) {
      console.log(`OCR mencoba rotasi ${rotation}°, threshold=${threshold}`);

      try {
        const processed = await prepareShodOcrImage(
          dataUrl,
          rotation,
          threshold,
        );

        const result = await Tesseract.recognize(processed, "eng", {
          logger: function (message) {
            console.log(
              `OCR ${rotation}°`,
              threshold,
              message.status,
              message.progress,
            );
          },
        });

        const text = result?.data?.text || "";

        const words = result?.data?.words || [];

        const score = scoreShodOcrResult(text);

        console.log("OCR candidate:", {
          rotation,
          threshold,
          score,
          text,
        });

        candidates.push({
          rotation,
          threshold,
          score,
          text,
          words,
          confidence: Number(result?.data?.confidence || 0),
        });
      } catch (err) {
        console.warn("OCR candidate gagal:", rotation, threshold, err);
      }
    }
  }

  if (!candidates.length) {
    throw new Error("Semua proses OCR gagal.");
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return b.confidence - a.confidence;
  });

  console.log("SEMUA HASIL OCR:", candidates);

  console.log("HASIL OCR TERBAIK:", candidates[0]);

  return candidates[0];
}

function detectShodField(text) {
  const n = normalizeOcrWord(text);

  if (
    n.includes("persenan") ||
    n.includes("persen") ||
    n.includes("infaqir") ||
    n.includes("infakir") ||
    n.includes("shodaqohir") ||
    n.includes("shodakohir")
  ) {
    return "susulan_ir";
  }

  if (
    n.includes("sambung") ||
    n.includes("uangsambung") ||
    n.includes("shodaqohsambung") ||
    n.includes("shodakohsambung")
  ) {
    return "uang_sambung";
  }

  if (n.includes("jimpitan")) {
    return "jimpitan";
  }

  if (n.includes("siarsiar") || n.includes("siar")) {
    return "siar_siar";
  }

  if (n.includes("seribuan")) {
    return "seribuan";
  }

  if (n === "kf" || n.includes("kafan")) {
    return "kafan";
  }

  if (n === "mt" || n.includes("ukhromt") || n.includes("ukhro")) {
    return "ukhro_mt";
  }

  return null;
}

async function extractShodaqohWithAI() {
  if (!window.shodUploadedImage || !window.shodUploadedImage.dataUrl) {
    showToast("Pilih foto rekap terlebih dahulu.", "error");
    return;
  }

  const extractBtn = document.getElementById("shodUploadExtract");

  const originalText = extractBtn?.innerHTML;

  try {
    if (extractBtn) {
      extractBtn.disabled = true;

      extractBtn.innerHTML = `
        <span
          style="
            width:14px;
            height:14px;
            border:2px solid currentColor;
            border-right-color:transparent;
            border-radius:50%;
            display:inline-block;
            animation:spin .6s linear infinite;
          "
        ></span>

        <span>Menganalisis...</span>
      `;
    }

    const dataUrl = window.shodUploadedImage.dataUrl;

    const result = await callShodaqohAI(dataUrl);

    console.log("HASIL AI GEMINI:", result);

    if (!result || !result.success) {
      throw new Error(result?.message || "AI gagal membaca foto.");
    }

    const data = result.data;

    console.log("DATA SHODAQOH:", data);

    applyShodaqohAIResult(data);

    showToast(
      "Data berhasil dibaca AI. Silakan periksa sebelum menyimpan.",
      "success",
    );
  } catch (err) {
    console.error("Gemini OCR gagal:", err);

    showToast(err.message || "Gagal membaca foto.", "error");
  } finally {
    if (extractBtn) {
      extractBtn.disabled = false;
      extractBtn.innerHTML = originalText;
    }
  }
}

function applyShodaqohAIResult(data) {
  const fieldMap = {
    total: "shodPaymentAmount",

    susulan_ir: "shod_susulan_ir",

    uang_sambung: "shod_uang_sambung",

    jimpitan: "shod_jimpitan",

    siar_siar: "shod_siar_siar",

    seribuan: "shod_seribuan",

    kafan: "shod_kafan",

    ukhro_mt: "shod_ukhro_mt",
  };

  Object.entries(fieldMap).forEach(([key, elementId]) => {
    const input = document.getElementById(elementId);

    if (!input) {
      console.warn("Field tidak ditemukan:", elementId);
      return;
    }

    const value = Number(data?.[key] || 0);

    input.value = value > 0 ? value : "";

    input.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );
  });

  const keterangan = document.getElementById("shodKeterangan");

  if (keterangan && data?.keterangan) {
    keterangan.value = data.keterangan;
  }

  const total = document.getElementById("shodPaymentAmount");

  if (total) {
    total.dispatchEvent(
      new Event("input", {
        bubbles: true,
      }),
    );

    total.dispatchEvent(
      new Event("change", {
        bubbles: true,
      }),
    );
  }
}

async function callShodaqohAI(dataUrl) {
  const response = await fetch(CONFIG.WEB_APP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "extractShodaqoh",
      dataUrl: dataUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server error: HTTP ${response.status}`);
  }

  const result = await response.json();

  console.log("RESPONSE AI SHODAQOH:", result);

  if (!result.success) {
    throw new Error(result.message || "Gagal mengekstrak data dari foto.");
  }

  return result;
}

let chartState = {
  type: "saldo", // 'saldo' | 'infak_ir' | 'uang_sambung' | 'ukhro_mt'
  labels: [],
  data: [],
  colors: {
    saldo: "#10b981",
    infak_ir: "#3b82f6",
    uang_sambung: "#f59e0b",
    ukhro_mt: "#8b5cf6",
  },
  labelsMap: {
    saldo: "Saldo",
    infak_ir: "Infak IR",
    uang_sambung: "Uang Sambung",
    ukhro_mt: "Ukhro MT",
  },
  titlesMap: {
    saldo: "Tren Saldo Bulanan",
    infak_ir: "Tren Pemasukan Infak IR",
    uang_sambung: "Tren Pemasukan Uang Sambung",
    ukhro_mt: "Tren Pemasukan Ukhro MT",
  },
};

// ============================================================
// RENDER CHART
// ============================================================

function renderChart() {
  const ctx = document.getElementById("saldoChart");
  if (!ctx) return;

  // Ambil data berdasarkan tipe chart
  const chartData = getChartData(chartState.type);
  const labels = chartData.labels;
  const data = chartData.data;
  const color = chartState.colors[chartState.type] || "#10b981";
  const label = chartState.labelsMap[chartState.type] || "Saldo";
  const title = chartState.titlesMap[chartState.type] || "Tren Saldo Bulanan";

  // Update judul chart
  const titleEl = document.getElementById("chartTitle");
  if (titleEl) {
    titleEl.textContent = title;
  }

  // Update legend
  const legendDot = document.getElementById("chartLegendDot");
  const legendLabel = document.getElementById("chartLegendLabel");
  if (legendDot) legendDot.style.background = color;
  if (legendLabel) legendLabel.textContent = label;

  // Update scope label
  const scopeLabel = document.getElementById("chartScopeLabel");
  if (scopeLabel) {
    const monthCount = labels.length;
    scopeLabel.textContent =
      monthCount > 0 ? `${monthCount} bulan` : "seluruh periode";
  }

  if (!labels.length) {
    const now = new Date();
    const currentMonthKey =
      now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    labels.push(getMonthShortLabel(currentMonthKey));
    data.push(0);
  }

  // Update nilai terakhir dan perubahan
  const lastValue = data[data.length - 1] || 0;
  const firstValue = data[0] || 0;
  const change =
    firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  const lastValueEl = document.getElementById("chartLastValue");
  if (lastValueEl) {
    lastValueEl.textContent = fmtRp(lastValue);
  }

  const changeEl = document.getElementById("chartChange");
  if (changeEl) {
    if (change > 0) {
      changeEl.textContent = `▲ +${change.toFixed(1)}%`;
      changeEl.style.color = "var(--pos)";
    } else if (change < 0) {
      changeEl.textContent = `▼ ${change.toFixed(1)}%`;
      changeEl.style.color = "var(--neg)";
    } else {
      changeEl.textContent = "▬ 0%";
      changeEl.style.color = "var(--ink-soft)";
    }
  }

  const dark = currentTheme() === "dark";
  const tickColor = dark ? "#475569" : "#94a3b8";
  const gridColor = dark ? "rgba(71,85,105,0.15)" : "rgba(148,163,184,0.12)";

  // Buat gradient fill
  const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 160);
  const gradientColor1 = dark ? `${color}40` : `${color}25`;
  const gradientColor2 = dark ? `${color}05` : `${color}02`;
  gradient.addColorStop(0, gradientColor1);
  gradient.addColorStop(1, gradientColor2);

  if (state.chart) state.chart.destroy();

  state.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
          data: data,
          borderColor: color,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: color,
          pointBorderColor: dark ? "#1e293b" : "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: dark
            ? "rgba(30,41,59,0.92)"
            : "rgba(255,255,255,0.92)",
          titleColor: dark ? "#f1f5f9" : "#0f172a",
          bodyColor: dark ? "#e2e8f0" : "#334155",
          borderColor: dark ? "rgba(71,85,105,0.2)" : "rgba(148,163,184,0.2)",
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          callbacks: {
            label: function (context) {
              return fmtRp(context.parsed.y);
            },
            title: function (items) {
              return items[0].label;
            },
          },
        },
      },
      scales: {
        x: {
          type: "category",
          ticks: {
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0,
            font: {
              size: 8,
              weight: "500",
            },
            color: tickColor,
            padding: 4,
          },
          grid: {
            display: false,
            drawBorder: false,
          },
          border: {
            display: false,
          },
        },
        y: {
          display: true,
          position: "right",
          ticks: {
            font: {
              size: 8,
              weight: "500",
            },
            color: tickColor,
            padding: 6,
            maxTicksLimit: 6,
            callback: function (value) {
              if (value >= 1000000) return (value / 1000000).toFixed(0) + "jt";
              if (value >= 1000) return (value / 1000).toFixed(0) + "rb";
              return value.toFixed(0);
            },
          },
          grid: {
            color: gridColor,
            drawBorder: false,
            lineWidth: 0.8,
          },
          border: {
            display: false,
          },
        },
      },
      elements: {
        line: {
          tension: 0.4,
        },
        point: {
          hoverRadius: 6,
        },
      },
      animation: {
        duration: 800,
        easing: "easeOutQuart",
      },
    },
  });
}

// ============================================================
// GET CHART DATA BERDASARKAN TIPE
// ============================================================

function getChartData(type) {
  const months = [
    ...new Set(state.transactions.map((t) => getMonthKey(t.tanggal))),
  ]
    .filter(Boolean)
    .sort();

  const labels = [];
  const data = [];

  const accountMap = {
    infak_ir: [
      "INFAK IR",
      "PEMASUKAN INFAK IR",
      "INFAQ IR",
      "INFAK IR (SUSULAN)",
    ],
    uang_sambung: [
      "UANG SAMBUNG",
      "PEMASUKAN UANG SAMBUNG",
      "INFAK SAMBUNG",
      "PEMASUKAN INFAK SAMBUNG",
    ],
    ukhro_mt: ["UKHRO MT", "PEMASUKAN UKHRO MT", "UKHRO"],
  };

  months.forEach((m) => {
    const monthTx = state.transactions.filter(
      (t) => getMonthKey(t.tanggal) === m,
    );
    if (!monthTx.length) return;

    let value = 0;

    if (type === "saldo") {
      // Saldo akhir bulan
      const lastTx = monthTx[monthTx.length - 1];
      value = lastTx ? lastTx.saldo || 0 : 0;
    } else {
      // Filter berdasarkan account
      const accountList = accountMap[type] || [];
      value = monthTx
        .filter((t) => {
          const account = (t.account || "").toUpperCase().trim();
          return accountList.some(
            (acc) => account === acc || account.includes(acc),
          );
        })
        .reduce((sum, t) => sum + (t.debet || 0), 0);
    }

    labels.push(getMonthShortLabel(m));
    data.push(value);
  });

  return { labels, data };
}

// ============================================================
// INIT CHART FILTER DROPDOWN
// ============================================================

function initChartFilterDropdown() {
  const dropdown = document.getElementById("chartFilterDropdown");
  const trigger = document.getElementById("chartFilterTrigger");
  const valueDisplay = document.getElementById("chartFilterValue");
  const menu = document.getElementById("chartFilterMenu");

  if (!dropdown || !trigger || !valueDisplay || !menu) return;

  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains("open");

    // Tutup dropdown lain
    document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
      if (el.id !== dropdown.id) {
        el.classList.remove("open");
        el.querySelector(".filter-dropdown-trigger")?.setAttribute(
          "aria-expanded",
          "false",
        );
      }
    });

    dropdown.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(!isOpen));
  });

  menu.querySelectorAll(".filter-dropdown-option").forEach(function (option) {
    option.addEventListener("click", function (e) {
      e.stopPropagation();
      const type = this.dataset.chartType;
      const label = this.textContent.trim();

      // Update active state
      menu.querySelectorAll(".filter-dropdown-option").forEach(function (el) {
        el.classList.remove("active");
        el.setAttribute("aria-selected", "false");
      });
      this.classList.add("active");
      this.setAttribute("aria-selected", "true");

      // Update value display
      valueDisplay.textContent = label;

      // Close dropdown
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");

      // Update chart type dan render ulang
      chartState.type = type;
      renderChart();
    });
  });

  // Tutup dropdown saat klik di luar
  document.addEventListener("click", function (e) {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  initChartFilterDropdown();
});
