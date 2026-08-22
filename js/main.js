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

function setupEventListeners() {
  console.log("🔄 Setting up event listeners...");

  // Inisialisasi router
  if (typeof initRouter === "function") {
    initRouter();
  }

  // Load data
  if (typeof loadData === "function") {
    loadData();
  }

  // Init zakat module
  if (typeof initZakatModule === "function") {
    initZakatModule();
  }

  console.log("✅ Event listeners setup complete");
}

// Buat global
window.setupEventListeners = setupEventListeners;
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

  // Update header info
  const memberCountEl = $("shodMemberCount");
  if (memberCountEl) {
    memberCountEl.textContent = `${filteredCount} dari ${totalMembers} anggota`;
  }

  const lunasCountEl = $("shodLunasCount");
  if (lunasCountEl) {
    lunasCountEl.textContent = lunasCount;
  }

  const belumCountEl = $("shodBelumCount");
  if (belumCountEl) {
    belumCountEl.textContent = belumCount;
  }

  if (rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 30px 8px; text-align: center; font-size: 14px; color: var(--ink-faint);">
          Tidak ada data sesuai filter.
        </td>
      </tr>
    `;
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

      // ============================================================
      // TRUNCATE NAMA MENJADI 3 KATA PERTAMA
      // ============================================================
      const displayName = truncateNameToThreeWords(r.nama);

      const clickAction = paymentId
        ? `openShodaqohPaymentDetail('${escapeHtml(paymentId)}')`
        : `showToast('Member ini belum melakukan pembayaran untuk bulan ini', 'warning')`;

      return `
        <tr 
          onclick="${clickAction}"
          title="${paymentId ? "Klik untuk lihat detail pembayaran" : "Belum ada pembayaran"}"
        >
          <td class="shod-td-name">${escapeHtml(displayName)}</td>
          <td class="shod-td-number">${fmtRp(r.target)}</td>
          <td class="shod-td-number" style="color: ${totalPaid > 0 ? "var(--pos)" : "var(--ink-soft)"};">${fmtRp(totalPaid)}</td>
          <td class="shod-td-status">
            <span class="badge-status ${badgeClass}">${badgeLabel}</span>
          </td>
          <td class="shod-td-date">${formattedDate}</td>
        </tr>
      `;
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
            <button type="button" id="shodAddMemberBtn" class="shod-members-add btn-outline-brand">
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
              <button type="button" id="shodAddFirstMember" class="btn-outline-brand">+ Tambah anggota pertama</button>
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
        padding: 4px 0 14px 0;
        border-bottom: 1px solid var(--line);
        margin-bottom: 12px;
        flex-wrap: wrap;
        gap: 8px;
      ">
        <div>
          <span class="text-[12px] font-bold uppercase tracking-wider text-[color:var(--ink-faint)]">
            Monitoring
          </span>
          <span class="text-[11px] text-[color:var(--ink-faint)] ml-2" id="shodMemberCount">
            0 anggota
          </span>
        </div>
        <div class="flex items-center gap-4" id="shodStatsBadge">
          <span class="text-[11px] font-semibold text-[color:var(--pos)]">● <span id="shodLunasCount">0</span> Lunas</span>
          <span class="text-[11px] font-semibold text-[color:var(--neg)]">● <span id="shodBelumCount">0</span> Belum</span>
        </div>
      </div>
      <div style="overflow-x:auto; -webkit-overflow-scrolling: touch;">
        <table style="
          width: 100%;
          min-width: 600px;
          border-collapse: collapse;
          font-size: 13px;
          table-layout: fixed;
        ">
          <thead>
            <tr style="border-bottom: 2px solid var(--line);">
              <th style="
                padding: 10px 8px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--ink-faint);
                text-align: left;
                width: 20%;
              ">Anggota</th>
              <th style="
                padding: 10px 8px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--ink-faint);
                text-align: right;
                width: 15%;
              ">Target</th>
              <th style="
                padding: 10px 8px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--ink-faint);
                text-align: right;
                width: 15%;
              ">Dibayar</th>
              <th style="
                padding: 10px 8px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--ink-faint);
                text-align: center;
                width: 13%;
              ">Status</th>
              <th style="
                padding: 10px 8px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--ink-faint);
                text-align: center;
                width: 15%;
              ">Tgl Bayar</th>
            </tr>
          </thead>
          <tbody id="shodMonitoringBody">
            <tr>
              <td colspan="5" style="padding: 30px 8px; text-align: center; font-size: 12px; color: var(--ink-faint);">
                Memuat data...
              </td>
            </tr>
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

  // ============================================================
  // SET TANGGAL
  // ============================================================
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

  // ============================================================
  // SET MEMBER
  // ============================================================
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

    // Update dropdown display
    const memberValueDisplay = $("shodPaymentMemberValue");
    if (memberValueDisplay && payment?.member_id) {
      const foundMember = (state.shodaqoh.members || []).find(
        (m) => String(m.member_id) === String(payment.member_id),
      );
      if (foundMember) {
        memberValueDisplay.textContent = foundMember.nama;
      }
    }
  }

  // ============================================================
  // SET FIELD LAINNYA
  // ============================================================
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

  // ============================================================
  // RENDER SUSULAN BULAN DENGAN INPUT NOMINAL
  // ============================================================
  let selectedMonths = {};

  // Cek apakah ada susulan_rincian (format baru)
  if (payment?.susulan_rincian) {
    try {
      selectedMonths = JSON.parse(payment.susulan_rincian);
    } catch (e) {
      // Fallback: jika ada susulan_bulan tapi tidak ada rincian
      if (payment.susulan_bulan) {
        const bulanArray = String(payment.susulan_bulan)
          .split(",")
          .filter(Boolean);
        const totalIR = Number(payment.susulan_ir) || 0;
        const perBulan =
          bulanArray.length > 0 ? Math.round(totalIR / bulanArray.length) : 0;
        let sisa = totalIR;
        bulanArray.forEach(function (bulan, index) {
          const nilai = index === bulanArray.length - 1 ? sisa : perBulan;
          selectedMonths[bulan.trim()] = nilai;
          sisa -= nilai;
        });
      }
    }
  }
  // Jika hanya ada susulan_bulan (format lama)
  else if (payment?.susulan_bulan) {
    const bulanArray = String(payment.susulan_bulan).split(",").filter(Boolean);
    const totalIR = Number(payment.susulan_ir) || 0;
    const perBulan =
      bulanArray.length > 0 ? Math.round(totalIR / bulanArray.length) : 0;
    let sisa = totalIR;
    bulanArray.forEach(function (bulan, index) {
      const nilai = index === bulanArray.length - 1 ? sisa : perBulan;
      selectedMonths[bulan.trim()] = nilai;
      sisa -= nilai;
    });
  }

  // Panggil fungsi render (HANYA SATU KALI)
  renderShodSusulanBulan(selectedMonths);

  // ============================================================
  // SETUP WATCHER & TAMPILKAN OVERLAY
  // ============================================================
  setupShodaqohAllocationWatcher();

  // Update status alokasi setelah render
  setTimeout(function () {
    updateShodAllocationStatus();
  }, 200);

  $("shodaqohPaymentOverlay")?.classList.remove("hidden");
}

// Fungsi untuk render checkbox bulan susulan dengan input nominal
function renderShodSusulanBulan(selectedMonths = {}) {
  const container = document.getElementById("shodSusulanBulan");
  if (!container) {
    console.warn("shodSusulanBulan container not found");
    return;
  }

  const now = new Date();
  const months = [];

  // Generate 12 bulan terakhir
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

  container.innerHTML = months
    .map(function (m) {
      const hasValue = m.key in selectedMonths;
      const existingValue = selectedMonths[m.key] || "";

      return `
        <div class="shod-susulan-item ${hasValue ? "checked" : ""}" data-bulan="${m.key}">
          <label class="shod-susulan-label">
            <input 
              type="checkbox" 
              class="shod-susulan-checkbox" 
              value="${m.key}"
              ${hasValue ? "checked" : ""}
            />
            <span>${m.shortLabel} ${m.year}</span>
          </label>
          <div class="shod-susulan-nominal-wrap" style="${hasValue ? "" : "display: none;"}">
            <input 
              type="number" 
              class="shod-susulan-nominal" 
              placeholder="Nominal"
              min="0"
              step="1000"
              data-bulan="${m.key}"
              value="${existingValue}"
            />
          </div>
        </div>
      `;
    })
    .join("");

  // Event listener: toggle visibility input nominal
  container.querySelectorAll(".shod-susulan-checkbox").forEach(function (cb) {
    cb.addEventListener("change", function () {
      const parent = this.closest(".shod-susulan-item");
      const nominalWrap = parent.querySelector(".shod-susulan-nominal-wrap");
      const nominalInput = parent.querySelector(".shod-susulan-nominal");

      if (this.checked) {
        parent.classList.add("checked");
        nominalWrap.style.display = "block";
        setTimeout(function () {
          if (nominalInput) nominalInput.focus();
        }, 100);
      } else {
        parent.classList.remove("checked");
        nominalWrap.style.display = "none";
        if (nominalInput) nominalInput.value = "";
      }

      validateShodSusulanRincian();
      updateShodAllocationStatus();
    });
  });

  // Event listener: validasi saat input nominal berubah
  container.querySelectorAll(".shod-susulan-nominal").forEach(function (input) {
    input.addEventListener("input", function () {
      const parent = this.closest(".shod-susulan-item");
      const cb = parent.querySelector(".shod-susulan-checkbox");
      const val = Number(this.value) || 0;

      if (val > 0) {
        if (cb) cb.checked = true;
        parent.classList.add("checked");
        parent.querySelector(".shod-susulan-nominal-wrap").style.display =
          "block";
        this.classList.remove("invalid");
        this.classList.add("valid");
      } else {
        this.classList.remove("valid");
        this.classList.add("invalid");
      }

      validateShodSusulanRincian();
      updateShodAllocationStatus();
    });
  });

  // Initial validation
  setTimeout(function () {
    validateShodSusulanRincian();
    updateShodAllocationStatus();
  }, 200);
}

// Fungsi validasi rincian susulan
function validateShodSusulanRincian() {
  const totalIR = Number(
    document.getElementById("shod_susulan_ir")?.value || 0,
  );
  const bulanItems = document.querySelectorAll(".shod-susulan-item");
  let totalRincian = 0;
  let validCount = 0;
  let rincianData = {};

  bulanItems.forEach(function (item) {
    const cb = item.querySelector(".shod-susulan-checkbox");
    const nominalInput = item.querySelector(".shod-susulan-nominal");

    if (cb && cb.checked && nominalInput) {
      const nilai = Number(nominalInput.value) || 0;
      const bulan = cb.value;

      if (nilai > 0) {
        totalRincian += nilai;
        validCount++;
        rincianData[bulan] = nilai;
        nominalInput.classList.remove("invalid");
        nominalInput.classList.add("valid");
      } else {
        nominalInput.classList.remove("valid");
        nominalInput.classList.add("invalid");
      }
    }
  });

  // Update total display
  const totalDisplay = document.getElementById("shodSusulanTotalDisplay");
  if (totalDisplay) {
    totalDisplay.textContent = fmtRp(totalRincian);
    totalDisplay.style.color =
      totalRincian === totalIR && totalIR > 0 ? "var(--pos)" : "var(--ink)";
  }

  // Update status validation
  const statusEl = document.getElementById("shodSusulanStatus");
  if (statusEl) {
    if (totalIR === 0) {
      statusEl.textContent = "✓ Tidak ada Susulan IR";
      statusEl.style.color = "var(--ink-faint)";
    } else if (totalRincian === totalIR && validCount > 0) {
      statusEl.textContent = "✓ Seimbang: " + fmtRp(totalRincian);
      statusEl.style.color = "var(--pos)";
    } else if (validCount === 0) {
      statusEl.textContent = "⚠️ Centang bulan dan isi nominal masing-masing";
      statusEl.style.color = "var(--neg)";
    } else {
      const selisih = totalRincian - totalIR;
      if (selisih > 0) {
        statusEl.textContent =
          "⚠️ Kelebihan " + fmtRp(selisih) + " dari target " + fmtRp(totalIR);
      } else {
        statusEl.textContent =
          "⚠️ Kurang " +
          fmtRp(Math.abs(selisih)) +
          " dari target " +
          fmtRp(totalIR);
      }
      statusEl.style.color = "var(--neg)";
    }
  }

  return {
    totalRincian,
    validCount,
    rincianData,
    isBalanced: totalIR > 0 && totalRincian === totalIR,
  };
}

function updateShodAllocationStatus() {
  const total = Number(
    document.getElementById("shodPaymentAmount")?.value || 0,
  );
  const susulanIR = Number(
    document.getElementById("shod_susulan_ir")?.value || 0,
  );
  const uangSambung = Number(
    document.getElementById("shod_uang_sambung")?.value || 0,
  );
  const jimpitan = Number(document.getElementById("shod_jimpitan")?.value || 0);
  const siarSiar = Number(
    document.getElementById("shod_siar_siar")?.value || 0,
  );
  const seribuan = Number(document.getElementById("shod_seribuan")?.value || 0);
  const kafan = Number(document.getElementById("shod_kafan")?.value || 0);
  const ukhroMt = Number(document.getElementById("shod_ukhro_mt")?.value || 0);

  // Validasi rincian susulan
  const { totalRincian, isBalanced } = validateShodSusulanRincian();

  // Total alokasi
  const alokasiTotal =
    susulanIR + uangSambung + jimpitan + siarSiar + seribuan + kafan + ukhroMt;
  const selisih = alokasiTotal - total;

  const statusText = document.getElementById("shodAllocationText");
  const statusIcon = document.getElementById("shodAllocationIcon");
  const submitBtn = document.getElementById("btnSubmitShodaqohPayment");

  // Cek apakah ada susulan IR yang perlu divalidasi
  const hasSusulanIR = susulanIR > 0;
  const susulanValid = !hasSusulanIR || (hasSusulanIR && isBalanced);

  if (total <= 0) {
    // Total belum diisi
    if (statusText) {
      statusText.textContent = "Masukkan total pembayaran";
      statusText.style.color = "var(--ink-soft)";
    }
    if (statusIcon) {
      statusIcon.innerHTML = `<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />`;
      statusIcon.style.color = "var(--ink-soft)";
    }
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (!susulanValid) {
    // Susulan IR belum valid
    if (statusText) {
      statusText.textContent = "⚠️ Periksa rincian Susulan IR";
      statusText.style.color = "var(--neg)";
    }
    if (statusIcon) {
      statusIcon.innerHTML = `<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />`;
      statusIcon.style.color = "var(--neg)";
    }
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  if (selisih === 0) {
    // SEIMBANG
    if (statusText) {
      statusText.textContent = "✓ SEIMBANG (Rp 0)";
      statusText.style.color = "var(--pos)";
    }
    if (statusIcon) {
      statusIcon.innerHTML = `<path d="M20 6L9 17l-5-5" />`;
      statusIcon.style.color = "var(--pos)";
    }
    if (submitBtn) submitBtn.disabled = false;
  } else if (selisih > 0) {
    // KURANG
    if (statusText) {
      statusText.textContent = "⚠️ Kurang " + fmtRp(Math.abs(selisih));
      statusText.style.color = "var(--neg)";
    }
    if (statusIcon) {
      statusIcon.innerHTML = `<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />`;
      statusIcon.style.color = "var(--neg)";
    }
    if (submitBtn) submitBtn.disabled = true;
  } else {
    // KELEBIHAN
    if (statusText) {
      statusText.textContent = "⚠️ Kelebihan " + fmtRp(Math.abs(selisih));
      statusText.style.color = "var(--neg)";
    }
    if (statusIcon) {
      statusIcon.innerHTML = `<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />`;
      statusIcon.style.color = "var(--neg)";
    }
    if (submitBtn) submitBtn.disabled = true;
  }
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
  const total = Number($("shodPaymentAmount").value);
  const susulan_ir = Number($("shod_susulan_ir")?.value || 0);

  if (!memberId) {
    showToast("Pilih anggota terlebih dahulu.", "error");
    return;
  }

  if (!tanggal) {
    showToast("Pilih tanggal pembayaran.", "error");
    return;
  }

  // AMBIL RINCIAN PER BULAN DARI INPUT
  const susulanRincian = {};
  const bulanItems = document.querySelectorAll(".shod-susulan-item");

  bulanItems.forEach(function (item) {
    const cb = item.querySelector(".shod-susulan-checkbox");
    const nominalInput = item.querySelector(".shod-susulan-nominal");

    if (cb && cb.checked && nominalInput) {
      const bulan = cb.value;
      const nominal = Number(nominalInput.value) || 0;
      if (nominal > 0) {
        susulanRincian[bulan] = nominal;
      }
    }
  });

  // Validasi: jika ada susulan_ir, pastikan ada rincian
  if (susulan_ir > 0) {
    const totalRincian = Object.values(susulanRincian).reduce(function (
      sum,
      val,
    ) {
      return sum + val;
    }, 0);

    if (totalRincian !== susulan_ir) {
      showToast(
        "Total rincian per bulan harus sama dengan Susulan IR!",
        "error",
      );
      return;
    }

    if (Object.keys(susulanRincian).length === 0) {
      showToast("Pilih minimal satu bulan untuk Susulan IR.", "error");
      return;
    }
  }

  const payload = {
    action: state.shodaqoh.selectedPaymentId
      ? "updateShodaqohPayment"
      : "createShodaqohPayment",
    token: session.token,
    paymentId: state.shodaqoh.selectedPaymentId || "",
    memberId: memberId,
    tanggalPembayaran: tanggal,
    total: total,
    susulan_ir: susulan_ir,
    susulan_bulan: Object.keys(susulanRincian), // Array bulan
    susulan_rincian: susulanRincian, // Object { "2026-01": 100000, ... }
    uang_sambung: Number($("shod_uang_sambung")?.value || 0),
    jimpitan: Number($("shod_jimpitan")?.value || 0),
    siar_siar: Number($("shod_siar_siar")?.value || 0),
    seribuan: Number($("shod_seribuan")?.value || 0),
    kafan: Number($("shod_kafan")?.value || 0),
    ukhro_mt: Number($("shod_ukhro_mt")?.value || 0),
    keterangan: $("shodPaymentNote")?.value || "",
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
            <td colspan="10" class="py-8 text-center text-sm text-[color:var(--ink-faint)]">
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

          // Parse susulan_rincian jika ada
          if (p.susulan_rincian) {
            try {
              p.susulan_rincian_parsed = JSON.parse(p.susulan_rincian);
            } catch (e) {
              p.susulan_rincian_parsed = {};
            }
          } else {
            p.susulan_rincian_parsed = {};
          }

          // Simpan informasi susulan untuk referensi
          p.susulan_bulan_array = p.susulan_bulan
            ? String(p.susulan_bulan)
                .split(",")
                .filter(function (b) {
                  return b.trim();
                })
            : [];
        });

        body.innerHTML = obligations
          .map(function (o) {
            let allocatedAt = o.allocated_at || "—";
            let paymentDate = "";
            if (o.allocated_at) {
              const d = new Date(o.allocated_at);
              if (!isNaN(d.getTime())) {
                allocatedAt = fmtDateShort(o.allocated_at);
                paymentDate = o.allocated_at.slice(0, 7); // YYYY-MM
              }
            }

            const isLunas = o.status === "LUNAS" || o.status === "ACTIVE";
            const obStatusClass = isLunas ? "status-active" : "status-inactive";
            const obStatusLabel = isLunas ? "Lunas" : "Belum";

            // ============================================================
            // AMBIL RINCIAN DARI PAYMENT
            // ============================================================
            let ir = 0;
            let uangSambung = 0;
            let jimpitan = 0;
            let siarSiar = 0;
            let seribuan = 0;
            let kafan = 0;
            let ukhroMt = 0;

            // Informasi tambahan untuk IR
            let susulanInfo = "";
            let hasSusulanRincian = false; // Flag apakah ada susulan rincian

            if (o.payment_id && paymentMap[o.payment_id]) {
              const p = paymentMap[o.payment_id];

              // Cek apakah ada susulan rincian
              const rincianKeys = Object.keys(p.susulan_rincian_parsed).filter(
                function (key) {
                  return p.susulan_rincian_parsed[key] > 0;
                },
              );
              hasSusulanRincian = rincianKeys.length > 0;

              // ============================================================
              // IR: Ambil dari susulan_rincian
              // ============================================================
              if (hasSusulanRincian) {
                // TOTAL IR yang dibayarkan pada bulan pembayaran (paymentDate)
                const totalIRPayment = rincianKeys.reduce(function (sum, key) {
                  return sum + p.susulan_rincian_parsed[key];
                }, 0);

                // Jika bulan ini adalah bulan pembayaran, tampilkan total IR
                if (paymentDate === o.periode) {
                  ir = totalIRPayment;

                  // Buat keterangan susulan jika ada lebih dari 1 bulan
                  if (rincianKeys.length > 1) {
                    const monthLabels = rincianKeys
                      .map(getShortMonthLabel)
                      .join(", ");
                    susulanInfo = `↻ ${monthLabels}`;
                  } else {
                    susulanInfo = "";
                  }
                } else {
                  // Bulan susulan: cek apakah periode ini ada di rincian
                  const isInRincian = rincianKeys.some(function (key) {
                    return key === o.periode;
                  });

                  if (isInRincian) {
                    ir = 0; // Tidak tampil di sini, karena sudah tampil di bulan pembayaran
                    susulanInfo = `✓ Dibayar di ${getShortMonthLabel(paymentDate)}`;
                  } else {
                    ir = 0;
                    susulanInfo = "";
                  }
                }
              } else {
                // Fallback: jika tidak ada rincian, gunakan metode lama
                const susulanBulan = p.susulan_bulan_array || [];
                const totalIR = Number(p.susulan_ir) || 0;
                const bulanCount =
                  susulanBulan.length > 0 ? susulanBulan.length : 1;

                const isPaymentMonth = paymentDate === o.periode;
                const isInSusulan = susulanBulan.some(function (b) {
                  return b.trim() === o.periode;
                });

                if (isPaymentMonth && totalIR > 0) {
                  ir = totalIR;
                  if (susulanBulan.length > 1) {
                    susulanInfo = `↻ ${susulanBulan.map(getShortMonthLabel).join(", ")}`;
                  } else {
                    susulanInfo = "";
                  }
                } else if (isInSusulan && !isPaymentMonth) {
                  ir = 0;
                  susulanInfo = `✓ Dibayar di ${getShortMonthLabel(paymentDate)}`;
                } else {
                  ir = 0;
                  susulanInfo = "";
                }
              }

              // Ambil nilai lainnya (langsung dari payment)
              uangSambung = p.uang_sambung || 0;
              jimpitan = p.jimpitan || 0;
              siarSiar = p.siar_siar || 0;
              seribuan = p.seribuan || 0;
              kafan = p.kafan || 0;
              ukhroMt = p.ukhro_mt || 0;
            }

            // Jika tidak ada payment_id tapi status Lunas (kemungkinan data dari monitoring)
            if (!o.payment_id && isLunas) {
              ir = o.nominal_target || 0;
              susulanInfo = "";
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

            // ============================================================
            // FONT SIZE DIPERBESAR & KOLOM PERIODE STICKY
            // ============================================================
            // Di bagian row, gunakan class khusus untuk setiap kolom:

            return `<tr class="border-t border-[color:var(--line)]">
                      <td class="shod-member-detail-period">${escapeHtml(fmtMonthYear(o.periode))}</td>
                      <td class="shod-member-detail-status">
                        <span class="status-pill ${obStatusClass}">${escapeHtml(obStatusLabel)}</span>
                      </td>
                      <td class="shod-member-detail-ir">
                        ${ir > 0 ? `<span class="ir-value">${fmtNum(ir)}</span>` : fmtNum(ir)}
                        ${
                          susulanInfo
                            ? `<span class="ir-susulan-tooltip">${escapeHtml(susulanInfo)}</span>`
                            : ""
                        }
                      </td>
                      <td class="shod-member-detail-sambung">${fmtNum(uangSambung)}</td>
                      <td class="shod-member-detail-jimpitan">${fmtNum(jimpitan)}</td>
                      <td class="shod-member-detail-siar">${fmtNum(siarSiar)}</td>
                      <td class="shod-member-detail-seribuan">${fmtNum(seribuan)}</td>
                      <td class="shod-member-detail-kafan">${fmtNum(kafan)}</td>
                      <td class="shod-member-detail-mt">${fmtNum(ukhroMt)}</td>
                      <td class="shod-member-detail-total" style="font-weight:${totalWeight};color:${totalColor};">
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
            <p class="text-sm text-[color:var(--neg)]">Gagal memuat data: ${escapeHtml(err.message)}</p>
            <button type="button" id="btnRetryMemberDetail" class="mt-3 p-3 text-sm font-bold" style="color:var(--brand);">
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

// ============================================================
// HELPER FUNCTIONS UNTUK LABEL BULAN
// ============================================================

function getShortMonthLabel(monthKey) {
  if (!monthKey || monthKey.length !== 7) return monthKey;
  const [y, m] = monthKey.split("-");
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
  return monthNames[parseInt(m) - 1] + "-" + y.slice(2, 4);
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

    // ✅ TAMBAHKAN INI
    adjustDatePickerPosition(dropdown);

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

    // ✅ TAMBAHKAN INI
    adjustDatePickerPosition(dropdown);

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

// ============================================================
// ZAKAT - STATE & CONSTANTS
// ============================================================

const ZAKAT_STATE_KEY = "zakat_data";

// Default suggestions untuk autocomplete
const ZAKAT_SUGGESTIONS = {
  muzaki: [
    "Bp Eko",
    "Bu Wiwid",
    "Bu Mar'atus",
    "Bp Usman",
    "Bp Nasekup",
    "Bp Naseri",
    "Bp Choirul Umam",
    "Bp Budi",
    "Bp Didik",
    "Bu Resnowati",
    "H Budi",
    "H Didik",
    "Bu Rismawati",
    "Bp Qomarudin",
    "H Olron",
  ],
  mustahik: [
    "Ibnu Sabil",
    "Bu Asri",
    "Bp Kabit",
    "Bu Tun",
    "Bu Samilah",
    "Bu Kasmija",
    "Bp Rasminto",
    "Bu Julaini",
    "Bp Tamyis",
    "Mas Noval",
    "Bp Yakop",
  ],
};

// ============================================================
// ZAKAT - HELPERS
// ============================================================

function generateZakatId() {
  return (
    "ZK" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substring(2, 5).toUpperCase()
  );
}

function getZakatData() {
  try {
    const raw = localStorage.getItem(ZAKAT_STATE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveZakatData(list) {
  localStorage.setItem(ZAKAT_STATE_KEY, JSON.stringify(list));
  state.zakat.list = list;
}

function getZakatById(id) {
  return state.zakat.list.find((z) => z.id === id) || null;
}

function createZakatItem(data) {
  return {
    id: generateZakatId(),
    title: data.title || "Zakat Baru",
    keterangan: data.keterangan || "",
    tanggal: data.tanggal || new Date().toISOString().slice(0, 10),
    tempat: data.tempat || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    muzaki: [],
    mustahik: [],
    total: 0,
    rincian: {
      mustahik: { total: 45, kelompok: 80, daerah: 20 },
      sabilillah: 40,
      amil: { total: 15, kelompok: 12, desa: 2, daerah: 1 },
    },
  };
}

function getUniqueNames(list) {
  const seen = new Set();
  const result = [];
  list.forEach((name) => {
    const key = name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(name);
    }
  });
  return result;
}

function getAllMuzakiNames() {
  const names = new Set();
  ZAKAT_SUGGESTIONS.muzaki.forEach((n) => names.add(n.trim()));
  state.zakat.list.forEach((z) => {
    if (z.muzaki) {
      z.muzaki.forEach((m) => {
        if (m.nama) names.add(m.nama.trim());
      });
    }
  });
  return Array.from(names).sort();
}

function getAllMustahikNames() {
  const names = new Set();
  ZAKAT_SUGGESTIONS.mustahik.forEach((n) => names.add(n.trim()));
  state.zakat.list.forEach((z) => {
    if (z.mustahik) {
      z.mustahik.forEach((m) => {
        if (m.nama) names.add(m.nama.trim());
      });
    }
  });
  return Array.from(names).sort();
}

// ============================================================
// ZAKAT - API CALLS (BACKEND INTEGRATION)
// ============================================================

async function apiGetZakatList() {
  try {
    const url = `${CONFIG.WEB_APP_URL}?action=getZakatList`;
    console.log("📡 Fetching zakat list from:", url);

    const res = await fetch(url);
    console.log("📡 Response status:", res.status);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    console.log("📡 Zakat list response:", data);

    // ✅ Pastikan selalu return dengan format yang benar
    // Apapun response dari server, kita normalize
    if (data && typeof data === "object") {
      // Jika success: true, return data
      if (data.success === true) {
        return {
          success: true,
          data: Array.isArray(data.data) ? data.data : [],
          message: data.message || "",
        };
      }

      // Jika success: false, tetap return dengan data kosong
      // tapi tandai sebagai gagal
      return {
        success: false,
        data: [],
        message: data.message || "Gagal mengambil data",
      };
    }

    // Jika response tidak valid
    return {
      success: false,
      data: [],
      message: "Response tidak valid",
    };
  } catch (e) {
    console.error("❌ apiGetZakatList error:", e);
    return {
      success: false,
      data: [],
      message: e.message || "Gagal mengambil data zakat",
    };
  }
}

async function apiGetZakatDetail(id) {
  const session = getSession();
  const payload = {
    action: "getZakatDetail",
    id: id,
  };
  if (session && session.token) {
    payload.token = session.token;
  }
  return apiPost(payload);
}

async function apiCreateZakat(data) {
  const session = getSession();
  const payload = {
    action: "createZakat",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiUpdateZakat(data) {
  const session = getSession();
  const payload = {
    action: "updateZakat",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiDeleteZakat(id) {
  const session = getSession();
  const payload = {
    action: "deleteZakat",
    token: session?.token || "",
    id: id,
  };
  return apiPost(payload);
}

// ============================================================
// ZAKAT - API CALLS PARSIAL
// ============================================================

async function apiUpdateZakatHeader(data) {
  const session = getSession();
  const payload = {
    action: "updateZakatHeader",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiUpdateZakatMuzaki(data) {
  const session = getSession();
  const payload = {
    action: "updateZakatMuzaki",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiUpdateZakatRincian(data) {
  const session = getSession();
  const payload = {
    action: "updateZakatRincian",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiUpdateZakatMustahik(data) {
  const session = getSession();
  const payload = {
    action: "updateZakatMustahik",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

// ============================================================
// ZAKAT - LOAD DATA DENGAN LOADER
// ============================================================

let zakatDataLoading = false;
let zakatDataLoaded = false;

async function loadZakatData() {
  // Jika sudah loading, tunggu
  if (zakatDataLoading) {
    console.log("⏳ Zakat data already loading, waiting...");
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!zakatDataLoading) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  // Jika sudah loaded dan ada data, skip loading
  if (zakatDataLoaded && state.zakat.list && state.zakat.list.length > 0) {
    console.log("✅ Zakat data already loaded, using cache");
    renderZakatList();
    return;
  }

  zakatDataLoading = true;

  try {
    // Tampilkan loader
    showZakatLoader("Memuat data zakat...");

    // Coba ambil dari API
    const response = await apiGetZakatList();

    if (response && response.success === true) {
      const data = response.data || [];
      state.zakat.list = data;
      saveZakatData(state.zakat.list);
      console.log("✅ Zakat data loaded from API:", data.length, "items");
      zakatDataLoaded = true;
    } else {
      // Fallback ke localStorage
      console.warn("⚠️ API gagal, gunakan data lokal");
      state.zakat.list = getZakatData();
      if (response && response.message) {
        showToast(response.message, "warning");
      }
      zakatDataLoaded = true;
    }

    renderZakatList();
    hideZakatLoader();
  } catch (err) {
    console.error("❌ Error loading zakat:", err);
    // Fallback ke localStorage
    state.zakat.list = getZakatData();
    renderZakatList();
    hideZakatLoader();
    showToast("Gagal sync data zakat, menggunakan data lokal", "warning");
  } finally {
    zakatDataLoading = false;
  }
}

async function refreshZakatData() {
  // Reset cache
  zakatDataLoaded = false;
  // Load ulang
  await loadZakatData();
}

async function syncZakatToBackend(data) {
  try {
    // Cek apakah data sudah ada
    const existing = state.zakat.list.find((z) => z.id === data.id);

    if (existing) {
      // UPDATE
      const result = await apiUpdateZakat(data);
      if (result && result.success) {
        // Update local
        const idx = state.zakat.list.findIndex((z) => z.id === data.id);
        if (idx !== -1) {
          state.zakat.list[idx] = data;
          saveZakatData(state.zakat.list);
        }
        return {
          success: true,
          message: result.message || "Zakat berhasil diperbarui",
        };
      } else {
        // Jika API gagal, tetap simpan di local
        const idx = state.zakat.list.findIndex((z) => z.id === data.id);
        if (idx !== -1) {
          state.zakat.list[idx] = data;
          saveZakatData(state.zakat.list);
        }
        return {
          success: false,
          message: result?.message || "Gagal update zakat, data disimpan lokal",
          offline: true,
        };
      }
    } else {
      // CREATE
      const result = await apiCreateZakat(data);
      if (result && result.success) {
        // Update ID dari backend jika ada
        if (result.data && result.data.id) {
          data.id = result.data.id;
        }
        // Tambahkan ke local
        if (!state.zakat.list.find((z) => z.id === data.id)) {
          state.zakat.list.push(data);
          saveZakatData(state.zakat.list);
        }
        return {
          success: true,
          message: result.message || "Zakat berhasil dibuat",
        };
      } else {
        // Jika API gagal, tetap simpan di local
        if (!state.zakat.list.find((z) => z.id === data.id)) {
          state.zakat.list.push(data);
          saveZakatData(state.zakat.list);
        }
        return {
          success: false,
          message: result?.message || "Gagal create zakat, data disimpan lokal",
          offline: true,
        };
      }
    }
  } catch (err) {
    console.error("Sync zakat error:", err);
    // Save local
    const existing = state.zakat.list.find((z) => z.id === data.id);
    if (!existing) {
      state.zakat.list.push(data);
    } else {
      const idx = state.zakat.list.findIndex((z) => z.id === data.id);
      if (idx !== -1) {
        state.zakat.list[idx] = data;
      }
    }
    saveZakatData(state.zakat.list);
    renderZakatList();

    return {
      success: false,
      message: err.message || "Gagal sync, data disimpan lokal",
      offline: true,
    };
  }
}

// ============================================================
// ZAKAT - CRUD
// ============================================================

async function createZakat() {
  const now = new Date();
  const newZakat = createZakatItem({
    title: `Zakat ${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`,
    tanggal: now.toISOString().slice(0, 10),
  });

  showZakatLoader("Membuat zakat baru...");

  try {
    const result = await syncZakatToBackend(newZakat);
    if (result.success) {
      renderZakatList();
      openZakatDetail(newZakat.id);
      showToast("Zakat baru berhasil dibuat!", "success");
    } else {
      // Sudah disimpan di local oleh syncZakatToBackend
      renderZakatList();
      openZakatDetail(newZakat.id);
      showToast("Zakat dibuat (offline mode)", "warning");
    }
  } catch (err) {
    console.error("Create zakat error:", err);
    // Fallback: simpan local
    state.zakat.list.push(newZakat);
    saveZakatData(state.zakat.list);
    renderZakatList();
    openZakatDetail(newZakat.id);
    showToast("Zakat dibuat (offline mode)", "warning");
  } finally {
    hideZakatLoader();
  }
}

async function deleteZakat(id) {
  showZakatLoader("Menghapus zakat...");

  try {
    const result = await apiDeleteZakat(id);
    if (result.success) {
      state.zakat.list = state.zakat.list.filter((z) => z.id !== id);
      saveZakatData(state.zakat.list);
      renderZakatList();
      if (state.zakat.currentId === id) {
        closeZakatDetail();
      }
      showToast("Zakat berhasil dihapus.", "info");
    } else {
      // Fallback: hapus local
      state.zakat.list = state.zakat.list.filter((z) => z.id !== id);
      saveZakatData(state.zakat.list);
      renderZakatList();
      if (state.zakat.currentId === id) {
        closeZakatDetail();
      }
      showToast("Zakat dihapus (offline mode)", "warning");
    }
  } catch (err) {
    // Fallback: hapus local
    state.zakat.list = state.zakat.list.filter((z) => z.id !== id);
    saveZakatData(state.zakat.list);
    renderZakatList();
    if (state.zakat.currentId === id) {
      closeZakatDetail();
    }
    showToast("Zakat dihapus (offline mode)", "warning");
  } finally {
    hideZakatLoader();
  }
}

function showZakatDeleteConfirm(id) {
  const zakat = getZakatById(id);
  if (!zakat) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "zakatDeleteConfirm";
  overlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:380px;">
      <div class="modal-icon" style="background:var(--neg-soft);color:var(--neg);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>
        </svg>
      </div>
      <h3 class="font-display text-[15.5px] font-extrabold text-center mt-3">Hapus Zakat?</h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        Zakat "<strong>${escapeHtml(zakat.title)}</strong>" akan dihapus permanen.
      </p>
      <div class="flex gap-2.5 pt-4">
        <button type="button" id="zakatDeleteCancel" class="btn-ghost flex-1">Batal</button>
        <button type="button" id="zakatDeleteConfirm" class="btn-primary flex-1" style="background:var(--neg);">Hapus</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay
    .querySelector("#zakatDeleteCancel")
    .addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay
    .querySelector("#zakatDeleteConfirm")
    .addEventListener("click", async () => {
      overlay.remove();
      await deleteZakat(id);
    });
}

// ============================================================
// ZAKAT - BOTTOM SHEET FORM
// ============================================================

let zakatEditingId = null;

function openZakatForm(zakatId = null) {
  const overlay = document.getElementById("zakatFormOverlay");
  const titleEl = document.getElementById("zakatFormSheetTitle");
  const subtitleEl = document.getElementById("zakatFormSheetSubtitle");
  const titleInput = document.getElementById("zakatFormTitleInput");
  const keteranganInput = document.getElementById("zakatFormKeterangan");
  const tanggalInput = document.getElementById("zakatFormTanggal");
  const tempatInput = document.getElementById("zakatFormTempat");

  if (!overlay) {
    console.warn("⚠️ zakatFormOverlay not found");
    return;
  }

  zakatEditingId = zakatId;

  if (zakatId) {
    // EDIT MODE
    if (titleEl) titleEl.textContent = "Edit Zakat";
    if (subtitleEl) subtitleEl.textContent = "Ubah data kegiatan zakat";

    const zakat = getZakatById(zakatId);
    if (zakat) {
      if (titleInput) titleInput.value = zakat.title || "";
      if (keteranganInput) keteranganInput.value = zakat.keterangan || "";
      if (tanggalInput) tanggalInput.value = zakat.tanggal || "";
      if (tempatInput) tempatInput.value = zakat.tempat || "";
    }
  } else {
    // CREATE MODE
    if (titleEl) titleEl.textContent = "Buat Zakat Baru";
    if (subtitleEl) subtitleEl.textContent = "Isi data kegiatan zakat";

    if (titleInput) titleInput.value = "";
    if (keteranganInput) keteranganInput.value = "";
    if (tanggalInput)
      tanggalInput.value = new Date().toISOString().slice(0, 10);
    if (tempatInput) tempatInput.value = "";
  }

  overlay.classList.remove("hidden");

  // ============================================================
  // INISIALISASI DATE PICKER - PASTIKAN ELEMEN SUDAH ADA
  // ============================================================
  setTimeout(function () {
    initZakatDatePicker();
  }, 200);
}

function closeZakatForm(showList = true) {
  const overlay = document.getElementById("zakatFormOverlay");
  const listContainer = document.getElementById("zakatListContainer");
  const fabZakat = document.getElementById("fabZakat");

  // Tutup overlay
  if (overlay) {
    overlay.classList.add("hidden");
  }

  // Tampilkan list jika diperlukan
  if (showList && listContainer) {
    listContainer.style.display = "block";
  }

  // Tampilkan FAB
  if (fabZakat) {
    fabZakat.classList.remove("hidden");
  }

  zakatEditingId = null;

  // Reset form
  const titleInput = document.getElementById("zakatFormTitleInput");
  const keteranganInput = document.getElementById("zakatFormKeterangan");
  const tempatInput = document.getElementById("zakatFormTempat");

  if (titleInput) titleInput.value = "";
  if (keteranganInput) keteranganInput.value = "";
  if (tempatInput) tempatInput.value = "";

  // Kembali ke list
  const screenTitle = document.getElementById("zakatScreenTitle");
  if (screenTitle) {
    screenTitle.textContent = "Manajemen Zakat";
  }

  // Jika ada detail yang terbuka, tutup
  if (state.zakat && state.zakat.isViewOpen) {
    closeZakatDetail();
  }

  setTimeout(function () {
    initZakatDatePicker();
  }, 300);

  renderZakatList();
}

// ============================================================
// ZAKAT - SUBMIT FORM
// ============================================================

async function submitZakatForm() {
  const title = document.getElementById("zakatFormTitleInput").value.trim();
  const keterangan = document
    .getElementById("zakatFormKeterangan")
    .value.trim();
  const tanggal = document.getElementById("zakatFormTanggal").value;
  const tempat = document.getElementById("zakatFormTempat").value.trim();

  // Validasi
  if (!title) {
    showToast("Judul zakat wajib diisi.", "error");
    return;
  }

  if (!tanggal) {
    showToast("Tanggal pelaksanaan wajib diisi.", "error");
    return;
  }

  const btn = document.getElementById("zakatFormSubmit");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    let zakatData;
    let isEdit = false;

    if (zakatEditingId) {
      // EDIT
      const existing = getZakatById(zakatEditingId);
      if (!existing) {
        showToast("Zakat tidak ditemukan.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      isEdit = true;
      zakatData = {
        ...existing,
        title: title,
        keterangan: keterangan,
        tanggal: tanggal,
        tempat: tempat,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // CREATE
      zakatData = createZakatItem({
        title: title,
        keterangan: keterangan,
        tanggal: tanggal,
        tempat: tempat,
      });
    }

    // Simpan ke backend & local
    showZakatLoader(isEdit ? "Mengupdate zakat..." : "Membuat zakat baru...");
    const result = await syncZakatToBackend(zakatData);

    // Tutup form terlebih dahulu
    closeZakatForm();

    if (result.success) {
      showToast(
        isEdit ? "Zakat berhasil diperbarui!" : "Zakat berhasil dibuat!",
        "success",
      );
    } else {
      // Jika offline, tampilkan warning
      if (result.offline) {
        showToast(result.message || "Data disimpan lokal", "warning");
      } else {
        showToast(result.message || "Gagal menyimpan zakat", "error");
      }
    }

    renderZakatList();

    // Jika create, langsung buka detail
    if (!isEdit) {
      const newZakat = getZakatById(zakatData.id);
      if (newZakat) {
        openZakatDetail(newZakat.id);
      }
    } else {
      // Jika edit, refresh detail jika terbuka
      if (state.zakat.isViewOpen && state.zakat.currentId === zakatData.id) {
        openZakatDetail(zakatData.id);
      }
    }
  } catch (err) {
    console.error("Submit zakat error:", err);
    showToast("Gagal menyimpan zakat: " + err.message, "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

// ============================================================
// ZAKAT - FAB HANDLER
// ============================================================

document.getElementById("fabZakat").addEventListener("click", function () {
  // Tutup detail jika terbuka
  if (state.zakat.isViewOpen) {
    closeZakatDetail();
  }
  // Buka form create
  openZakatForm(null);
});

// ============================================================
// UPDATE - LIST ITEM (Edit & Delete)
// ============================================================

// ============================================================
// ZAKAT - DETAIL (FIXED)
// ============================================================

function openZakatDetail(id) {
  const zakat = getZakatById(id);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  state.zakat.currentId = id;
  state.zakat.isViewOpen = true;

  const listContainer = document.getElementById("zakatListContainer");
  const formContainer = document.getElementById("zakatFormContainer");
  const detailContainer = document.getElementById("zakatDetailContainer");
  const fabZakat = document.getElementById("fabZakat");
  const screenTitle = document.getElementById("zakatScreenTitle");

  if (listContainer) listContainer.style.display = "none";
  if (formContainer) formContainer.classList.add("hidden");
  if (detailContainer) detailContainer.classList.remove("hidden");
  if (fabZakat) fabZakat.classList.add("hidden");
  if (screenTitle) screenTitle.textContent = "Detail Zakat";

  // Update header
  updateZakatDetailHeader(zakat);

  // Reset tabs ke Muzaki
  const tabs = document.querySelectorAll(".zakat-tab");
  const panels = {
    muzaki: document.getElementById("zakatTabMuzaki"),
    rincian: document.getElementById("zakatTabRincian"),
    mustahik: document.getElementById("zakatTabMustahik"),
  };

  tabs.forEach((t) => t.classList.remove("active"));
  const firstTab = document.querySelector(
    '.zakat-tab[data-zakat-tab="muzaki"]',
  );
  if (firstTab) firstTab.classList.add("active");

  if (panels.muzaki) panels.muzaki.classList.add("active");
  if (panels.rincian) panels.rincian.classList.remove("active");
  if (panels.mustahik) panels.mustahik.classList.remove("active");

  renderZakatMuzakiTab(zakat);
  renderZakatRincianTab(zakat);
  renderZakatMustahikTab(zakat);
}

function updateZakatDetailHeader(zakat) {
  const titleEl = document.getElementById("zakatDetailTitle");
  const metaEl = document.getElementById("zakatDetailMeta");
  const keteranganEl = document.getElementById("zakatDetailKeterangan");
  const totalEl = document.getElementById("zakatDetailTotal");

  if (titleEl) titleEl.textContent = escapeHtml(zakat.title || "Zakat");
  if (metaEl) {
    metaEl.textContent = `${zakat.tanggal ? fmtDateShort(zakat.tanggal) : "-"} · ${escapeHtml(zakat.tempat || "Tempat tidak ditentukan")}`;
  }
  if (keteranganEl) {
    keteranganEl.textContent = zakat.keterangan || "Tidak ada keterangan";
    keteranganEl.style.display = zakat.keterangan ? "block" : "none";
  }
  if (totalEl) totalEl.textContent = fmtRp(zakat.total || 0);
}

// ============================================================
// ZAKAT - EDIT HEADER (BOTTOM SHEET)
// ============================================================

function openEditZakatHeader() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const overlay = document.getElementById("zakatEditHeaderOverlay");
  if (!overlay) return;

  // Isi data
  document.getElementById("zakatEditHeaderTitle").value = zakat.title || "";
  document.getElementById("zakatEditHeaderKeterangan").value =
    zakat.keterangan || "";
  document.getElementById("zakatEditHeaderTanggal").value = zakat.tanggal || "";
  document.getElementById("zakatEditHeaderTempat").value = zakat.tempat || "";

  overlay.classList.remove("hidden");
}

function closeEditZakatHeader() {
  const overlay = document.getElementById("zakatEditHeaderOverlay");
  if (overlay) overlay.classList.add("hidden");
}

async function submitEditZakatHeader() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const title = document.getElementById("zakatEditHeaderTitle").value.trim();
  const keterangan = document
    .getElementById("zakatEditHeaderKeterangan")
    .value.trim();
  const tanggal = document.getElementById("zakatEditHeaderTanggal").value;
  const tempat = document.getElementById("zakatEditHeaderTempat").value.trim();

  if (!title) {
    showToast("Judul zakat wajib diisi.", "error");
    return;
  }

  if (!tanggal) {
    showToast("Tanggal pelaksanaan wajib diisi.", "error");
    return;
  }

  const btn = document.getElementById("zakatEditHeaderSubmit");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    // Update lokal
    zakat.title = title;
    zakat.keterangan = keterangan;
    zakat.tanggal = tanggal;
    zakat.tempat = tempat;
    zakat.updatedAt = new Date().toISOString();

    const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    // Kirim ke backend (HANYA HEADER)
    showZakatLoader("Menyimpan data header...");
    const result = await apiUpdateZakatHeader({
      id: zakat.id,
      title: zakat.title,
      keterangan: zakat.keterangan,
      tanggal: zakat.tanggal,
      tempat: zakat.tempat,
    });

    if (result.success) {
      updateZakatDetailHeader(zakat);
      closeEditZakatHeader();
      showToast("Data zakat berhasil diperbarui!", "success");
    } else {
      // Offline mode
      updateZakatDetailHeader(zakat);
      closeEditZakatHeader();
      showToast("Data header disimpan (offline mode)", "warning");
    }

    renderZakatList();
  } catch (err) {
    console.error("Edit header error:", err);
    showToast("Gagal menyimpan: " + err.message, "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

const zakatSaveMuzaki = document.getElementById("zakatSaveMuzaki");
if (zakatSaveMuzaki) {
  zakatSaveMuzaki.onclick = async function () {
    const btn = this;
    const zakat = getZakatById(state.zakat.currentId);
    if (!zakat) {
      showToast("Zakat tidak ditemukan.", "error");
      return;
    }

    showZakatButtonLoading(btn, "Menyimpan Muzaki...");

    try {
      const container = document.getElementById("zakatMuzakiList");
      if (!container) {
        showToast("Container muzaki tidak ditemukan.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      const rows = container.querySelectorAll(".zakat-muzaki-row");
      const newMuzaki = [];
      let hasDuplicate = false;
      const names = [];
      let total = 0;

      rows.forEach((row) => {
        const nameInput = row.querySelector(".zakat-muzaki-name");
        const nominalInput = row.querySelector(".zakat-muzaki-nominal");

        const name = nameInput ? nameInput.value.trim() : "";
        const nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
        total += nominal;

        if (name) {
          const key = name.toLowerCase().trim();
          if (names.includes(key)) {
            hasDuplicate = true;
          } else {
            names.push(key);
            newMuzaki.push({
              id:
                "MZ" +
                Date.now().toString(36).toUpperCase() +
                Math.random().toString(36).substring(2, 5),
              nama: name,
              nominal: nominal,
              createdAt: new Date().toISOString(),
            });
          }
        } else if (nominal > 0) {
          newMuzaki.push({
            id:
              "MZ" +
              Date.now().toString(36).toUpperCase() +
              Math.random().toString(36).substring(2, 5),
            nama: "Muzaki " + (newMuzaki.length + 1),
            nominal: nominal,
            createdAt: new Date().toISOString(),
          });
        }
      });

      if (hasDuplicate) {
        showToast("Ada nama yang sama! Periksa kembali.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      if (newMuzaki.length === 0) {
        showToast("Tambahkan minimal satu muzaki.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      // Update lokal
      zakat.muzaki = newMuzaki;
      zakat.total = total;
      zakat.updatedAt = new Date().toISOString();

      const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
        saveZakatData(state.zakat.list);
      }

      // Kirim ke backend
      showZakatLoader("Menyimpan data muzaki...");
      const result = await apiUpdateZakatMuzaki({
        id: zakat.id,
        muzaki: zakat.muzaki,
        total: zakat.total,
      });

      const totalEl = document.getElementById("zakatDetailTotal");
      if (totalEl) {
        totalEl.textContent = fmtRp(zakat.total);
      }

      if (result.success) {
        showToast("Muzaki berhasil disimpan!", "success");
      } else {
        showToast("Muzaki disimpan (offline mode)", "warning");
      }

      renderZakatList();
    } catch (err) {
      console.error("Save muzaki error:", err);
      showToast("Gagal menyimpan muzaki", "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
} else {
  console.warn("⚠️ zakatSaveMuzaki element not found");
}

const zakatSaveRincian = document.getElementById("zakatSaveRincian");
if (zakatSaveRincian) {
  zakatSaveRincian.onclick = async function () {
    const btn = this;
    const zakat = getZakatById(state.zakat.currentId);
    if (!zakat) {
      showToast("Zakat tidak ditemukan.", "error");
      return;
    }

    // Ambil persentase dari form
    const mustahikPersen = Number(
      document.getElementById("zakatPersenMustahik")?.value || 0,
    );
    const sabilillahPersen = Number(
      document.getElementById("zakatPersenSabilillah")?.value || 0,
    );
    const amilPersen = Number(
      document.getElementById("zakatPersenAmil")?.value || 0,
    );

    // Validasi total persentase = 100%
    const totalPersen = mustahikPersen + sabilillahPersen + amilPersen;
    if (totalPersen !== 100) {
      showToast("Total persentase harus 100%!", "error");
      return;
    }

    // Ambil persentase rincian Mustahik
    const mustahikKelompokPersen = Number(
      document.getElementById("zakatPersenMustahikKelompok")?.value || 0,
    );
    const mustahikDaerahPersen = Number(
      document.getElementById("zakatPersenMustahikDaerah")?.value || 0,
    );

    // Validasi Mustahik sub-total = 100%
    if (mustahikKelompokPersen + mustahikDaerahPersen !== 100) {
      showToast("Mustahik Kelompok + Daerah harus 100%!", "error");
      return;
    }

    // Ambil persentase rincian Amil
    const amilKelompokPersen = Number(
      document.getElementById("zakatPersenAmilKelompok")?.value || 0,
    );
    const amilDesaPersen = Number(
      document.getElementById("zakatPersenAmilDesa")?.value || 0,
    );
    const amilDaerahPersen = Number(
      document.getElementById("zakatPersenAmilDaerah")?.value || 0,
    );

    // Validasi Amil sub-total = persentase Amil
    if (amilKelompokPersen + amilDesaPersen + amilDaerahPersen !== amilPersen) {
      showToast(
        "Amil Kelompok + Desa + Daerah harus sama dengan persentase Amil!",
        "error",
      );
      return;
    }

    showZakatButtonLoading(btn, "Menyimpan Rincian...");

    try {
      // HITUNG NOMINAL dari persentase
      const totalZakat = zakat.total || 0;

      // Nominal utama
      const mustahikNominal = Math.round((totalZakat * mustahikPersen) / 100);
      const sabilillahNominal = Math.round(
        (totalZakat * sabilillahPersen) / 100,
      );
      const amilNominal = Math.round((totalZakat * amilPersen) / 100);

      // Rincian Mustahik (Nominal)
      const mustahikKelompokNominal = Math.round(
        (mustahikNominal * mustahikKelompokPersen) / 100,
      );
      const mustahikDaerahNominal = Math.round(
        (mustahikNominal * mustahikDaerahPersen) / 100,
      );

      // Rincian Amil (Nominal)
      const amilKelompokNominal = Math.round(
        (amilNominal * amilKelompokPersen) / 100,
      );
      const amilDesaNominal = Math.round((amilNominal * amilDesaPersen) / 100);
      const amilDaerahNominal = Math.round(
        (amilNominal * amilDaerahPersen) / 100,
      );

      // Simpan rincian dengan persentase DAN nominal hasil perhitungan
      zakat.rincian = {
        // Data utama dengan persentase dan nominal
        mustahik: {
          persen: mustahikPersen,
          nominal: mustahikNominal,
          kelompok: {
            persen: mustahikKelompokPersen,
            nominal: mustahikKelompokNominal,
          },
          daerah: {
            persen: mustahikDaerahPersen,
            nominal: mustahikDaerahNominal,
          },
        },
        sabilillah: {
          persen: sabilillahPersen,
          nominal: sabilillahNominal,
        },
        amil: {
          persen: amilPersen,
          nominal: amilNominal,
          kelompok: {
            persen: amilKelompokPersen,
            nominal: amilKelompokNominal,
          },
          desa: {
            persen: amilDesaPersen,
            nominal: amilDesaNominal,
          },
          daerah: {
            persen: amilDaerahPersen,
            nominal: amilDaerahNominal,
          },
        },
      };

      zakat.updatedAt = new Date().toISOString();

      // Update lokal
      const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
        saveZakatData(state.zakat.list);
      }

      showZakatLoader("Menyimpan rincian zakat...");

      // Kirim ke backend - kirimkan data lengkap dengan nominal
      const result = await apiUpdateZakatRincian({
        id: zakat.id,
        rincian: zakat.rincian,
        // Kirim juga total agar backend bisa verifikasi
        total: zakat.total,
      });

      if (result.success) {
        showToast("Rincian berhasil disimpan!", "success");
      } else {
        showToast("Rincian disimpan (offline mode)", "warning");
      }

      renderZakatList();

      // Refresh tampilan rincian untuk menampilkan nominal
      renderZakatRincianTab(zakat);
    } catch (err) {
      console.error("Save rincian error:", err);
      showToast("Gagal menyimpan rincian: " + err.message, "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
} else {
  console.warn("⚠️ zakatSaveRincian not found");
}

// 3. SAVE MUSTAHIK
const zakatSaveMustahik = document.getElementById("zakatSaveMustahik");
if (zakatSaveMustahik) {
  zakatSaveMustahik.onclick = async function () {
    const btn = this;
    const zakat = getZakatById(state.zakat.currentId);
    if (!zakat) {
      showToast("Zakat tidak ditemukan.", "error");
      return;
    }

    showZakatButtonLoading(btn, "Menyimpan Mustahik...");

    try {
      const container = document.getElementById("zakatMustahikList");
      if (!container) {
        showToast("Container mustahik tidak ditemukan.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      const rows = container.querySelectorAll(".zakat-muzaki-row");
      const newMustahik = [];
      let totalDistributed = 0;
      let hasDuplicate = false;
      const names = [];

      rows.forEach((row) => {
        const nameInput = row.querySelector(".zakat-mustahik-name");
        const nominalInput = row.querySelector(".zakat-mustahik-nominal");

        const name = nameInput ? nameInput.value.trim() : "";
        const nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
        totalDistributed += nominal;

        if (name) {
          const key = name.toLowerCase().trim();
          if (names.includes(key)) {
            hasDuplicate = true;
          } else {
            names.push(key);
            newMustahik.push({
              id:
                "MS" +
                Date.now().toString(36).toUpperCase() +
                Math.random().toString(36).substring(2, 5),
              nama: name,
              nominal: nominal,
              createdAt: new Date().toISOString(),
            });
          }
        } else if (nominal > 0) {
          newMustahik.push({
            id:
              "MS" +
              Date.now().toString(36).toUpperCase() +
              Math.random().toString(36).substring(2, 5),
            nama: "Mustahik " + (newMustahik.length + 1),
            nominal: nominal,
            createdAt: new Date().toISOString(),
          });
        }
      });

      if (hasDuplicate) {
        showToast("Ada nama yang sama! Periksa kembali.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      if (newMustahik.length === 0) {
        showToast("Tambahkan minimal satu mustahik.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      const r = zakat.rincian || {};
      const mustahik = r.mustahik || { total: 45, kelompok: 80, daerah: 20 };
      const danaMustahik =
        ((zakat.total * mustahik.total) / 100) * (mustahik.kelompok / 100);

      if (totalDistributed > danaMustahik) {
        showToast("Total nominal melebihi dana mustahik!", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      zakat.mustahik = newMustahik;
      zakat.updatedAt = new Date().toISOString();

      const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
        saveZakatData(state.zakat.list);
      }

      showZakatLoader("Menyimpan data mustahik...");
      const result = await apiUpdateZakatMustahik({
        id: zakat.id,
        mustahik: zakat.mustahik,
      });

      if (result.success) {
        showToast("Mustahik berhasil disimpan!", "success");
      } else {
        showToast("Mustahik disimpan (offline mode)", "warning");
      }

      renderZakatList();
    } catch (err) {
      console.error("Save mustahik error:", err);
      showToast("Gagal menyimpan mustahik", "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
} else {
  console.warn("⚠️ zakatSaveMustahik not found");
}

// ============================================================
// ZAKAT - SAVE ALL (Kirim ke Database)
// ============================================================

async function saveAllZakat() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  // Validasi Rincian
  const totalPersen = Number(
    document.getElementById("zakatTotalPersen")?.textContent || 0,
  );
  if (totalPersen !== 100) {
    showToast("Total persentase harus 100%! Cek tab Rincian.", "error");
    return;
  }

  // Validasi Muzaki
  if (!zakat.muzaki || zakat.muzaki.length === 0) {
    showToast("Tambahkan minimal satu Muzaki.", "error");
    return;
  }

  // Validasi Mustahik
  if (!zakat.mustahik || zakat.mustahik.length === 0) {
    showToast("Tambahkan minimal satu Mustahik.", "error");
    return;
  }

  const btn = document.getElementById("zakatSaveAll");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    showZakatLoader("Menyimpan semua data zakat...");
    const result = await syncZakatToBackend(zakat);

    if (result.success) {
      showToast("Semua data berhasil disimpan!", "success");
    } else {
      if (result.offline) {
        showToast(result.message || "Data disimpan lokal", "warning");
      } else {
        showToast(result.message || "Gagal menyimpan data", "error");
      }
    }

    renderZakatList();
  } catch (err) {
    console.error("Save all error:", err);
    showToast("Gagal menyimpan: " + err.message, "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

// ============================================================
// ZAKAT - EVENT LISTENERS
// ============================================================

// Edit Header Button
document
  .getElementById("btnEditZakatHeader")
  ?.addEventListener("click", function () {
    openEditZakatHeader();
  });

// Edit Header Cancel
document
  .getElementById("zakatEditHeaderCancel")
  ?.addEventListener("click", function () {
    closeEditZakatHeader();
  });

// Edit Header Submit
const zakatEditHeaderSubmit = document.getElementById("zakatEditHeaderSubmit");
if (zakatEditHeaderSubmit) {
  zakatEditHeaderSubmit.onclick = async function () {
    const zakat = getZakatById(state.zakat.currentId);
    if (!zakat) {
      showToast("Zakat tidak ditemukan.", "error");
      return;
    }

    const titleEl = document.getElementById("zakatEditHeaderTitle");
    const keteranganEl = document.getElementById("zakatEditHeaderKeterangan");
    const tanggalEl = document.getElementById("zakatEditHeaderTanggal");
    const tempatEl = document.getElementById("zakatEditHeaderTempat");

    const title = titleEl ? titleEl.value.trim() : "";
    const keterangan = keteranganEl ? keteranganEl.value.trim() : "";
    const tanggal = tanggalEl ? tanggalEl.value : "";
    const tempat = tempatEl ? tempatEl.value.trim() : "";

    if (!title) {
      showToast("Judul zakat wajib diisi.", "error");
      return;
    }

    if (!tanggal) {
      showToast("Tanggal pelaksanaan wajib diisi.", "error");
      return;
    }

    const btn = this;
    showZakatButtonLoading(btn, "Menyimpan...");

    try {
      zakat.title = title;
      zakat.keterangan = keterangan;
      zakat.tanggal = tanggal;
      zakat.tempat = tempat;
      zakat.updatedAt = new Date().toISOString();

      const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
        saveZakatData(state.zakat.list);
      }

      showZakatLoader("Menyimpan data header...");
      const result = await apiUpdateZakatHeader({
        id: zakat.id,
        title: zakat.title,
        keterangan: zakat.keterangan,
        tanggal: zakat.tanggal,
        tempat: zakat.tempat,
      });

      if (result.success) {
        updateZakatDetailHeader(zakat);
        const overlay = document.getElementById("zakatEditHeaderOverlay");
        if (overlay) overlay.classList.add("hidden");
        showToast("Data zakat berhasil diperbarui!", "success");
      } else {
        updateZakatDetailHeader(zakat);
        const overlay = document.getElementById("zakatEditHeaderOverlay");
        if (overlay) overlay.classList.add("hidden");
        showToast("Data header disimpan (offline mode)", "warning");
      }

      renderZakatList();
    } catch (err) {
      console.error("Edit header error:", err);
      showToast("Gagal menyimpan: " + err.message, "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
} else {
  console.warn("⚠️ zakatEditHeaderSubmit not found");
}

// Save All Button
document.getElementById("zakatSaveAll")?.addEventListener("click", function () {
  saveAllZakat();
});

// Close on overlay click
document
  .getElementById("zakatEditHeaderOverlay")
  ?.addEventListener("click", function (e) {
    if (e.target === this) {
      closeEditZakatHeader();
    }
  });

// ============================================================
// ZAKAT - LIST ITEM ACTION SHEET (Seperti contoh)
// ============================================================

// Buat fungsi untuk membuka action sheet pada item zakat
function openZakatActionSheet(zakatId) {
  const zakat = getZakatById(zakatId);
  if (!zakat) return;

  // Gunakan sheet overlay yang sudah ada atau buat baru
  // Rekomendasi: buat sheet action dengan pola yang sama seperti txActionOverlay

  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay sheet-action";
  overlay.id = "zakatActionOverlay";
  overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-header sheet-header-action">
        <div class="sheet-handle"></div>
        <h3 class="sheet-title">${escapeHtml(zakat.title)}</h3>
        <p class="sheet-subtitle">${zakat.tanggal ? fmtDateShort(zakat.tanggal) : "-"} · ${escapeHtml(zakat.tempat || "Tempat tidak ditentukan")}</p>
      </div>

      <div class="sheet-scroll">
        <div class="action-list">
          <button type="button" id="zakatActionEdit" class="action-item">
            <span class="icon-btn" style="pointer-events:none;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
              </svg>
            </span>
            <span>Edit Zakat</span>
            <svg class="action-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" stroke-width="1.7">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          <button type="button" id="zakatActionDelete" class="action-item danger">
            <span class="icon-btn" style="pointer-events:none;color:var(--neg);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>
              </svg>
            </span>
            <span>Hapus Zakat</span>
            <svg class="action-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neg)" stroke-width="1.7">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

      <button type="button" id="zakatActionCancel" class="btn-cancel">Batal</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event listeners
  overlay
    .querySelector("#zakatActionCancel")
    .addEventListener("click", function () {
      overlay.remove();
    });

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) overlay.remove();
  });

  overlay
    .querySelector("#zakatActionEdit")
    .addEventListener("click", function () {
      overlay.remove();
      if (state.zakat.isViewOpen) closeZakatDetail();
      openZakatForm(zakatId);
    });

  overlay
    .querySelector("#zakatActionDelete")
    .addEventListener("click", function () {
      overlay.remove();
      showZakatDeleteConfirm(zakatId);
    });
}

// ============================================================
// UPDATE - RENDER ZAKAT LIST (Gunakan action sheet)
// ============================================================

function renderZakatList() {
  const container = document.getElementById("zakatList");
  if (!container) return;

  const list = state.zakat.list || [];

  if (list.length === 0) {
    container.innerHTML = `
      <div class="zakat-list-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          <circle cx="12" cy="12" r="4"/>
        </svg>
        <p>Belum ada kegiatan Zakat.</p>
        <p style="font-size:11px;margin-top:4px;">Klik tombol + untuk membuat baru.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map(
      (z) => `
    <div class="zakat-item" data-zakat-id="${z.id}">
      <div class="zakat-item-content" data-zakat-id="${z.id}">
        <div class="zakat-item-title">${escapeHtml(z.title)}</div>
        <div class="zakat-item-meta">
          <span>${z.tanggal ? fmtDateShort(z.tanggal) : "-"}</span>
          <span>•</span>
          <span>${escapeHtml(z.tempat || "Tempat tidak ditentukan")}</span>
          <span>•</span>
          <span>${z.muzaki ? z.muzaki.length : 0} Muzaki</span>
        </div>
        <div class="zakat-item-total">${fmtRp(z.total || 0)}</div>
      </div>
    </div>
  `,
    )
    .join("");

  // Event listener untuk klik item (buka detail)
  container.querySelectorAll(".zakat-item-content").forEach((item) => {
    item.addEventListener("click", function (e) {
      const id = this.dataset.zakatId;
      if (id) openZakatDetail(id);
    });
  });

  // Long press atau right click untuk action sheet (opsional)
  container.querySelectorAll(".zakat-item").forEach((item) => {
    // Klik kanan untuk action sheet
    item.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      const id = this.dataset.zakatId;
      if (id) openZakatActionSheet(id);
    });

    // Tap tahan untuk action sheet (mobile)
    let pressTimer = null;
    item.addEventListener("touchstart", function (e) {
      pressTimer = setTimeout(() => {
        const id = this.dataset.zakatId;
        if (id) openZakatActionSheet(id);
      }, 600);
    });
    item.addEventListener("touchend", function () {
      clearTimeout(pressTimer);
    });
    item.addEventListener("touchmove", function () {
      clearTimeout(pressTimer);
    });
  });
}

function closeZakatDetail() {
  state.zakat.currentId = null;
  state.zakat.isViewOpen = false;

  const listContainer = document.getElementById("zakatListContainer");
  const detailContainer = document.getElementById("zakatDetailContainer");
  const fabZakat = document.getElementById("fabZakat");
  const screenTitle = document.getElementById("zakatScreenTitle");

  if (listContainer) {
    listContainer.style.display = "block";
  }

  if (detailContainer) {
    detailContainer.classList.add("hidden");
  }

  if (fabZakat) {
    fabZakat.classList.remove("hidden");
  }

  if (screenTitle) {
    screenTitle.textContent = "Manajemen Zakat";
  }

  renderZakatList();
}

// ============================================================
// ZAKAT - TAB MUZAKI
// ============================================================

function renderZakatMuzakiTab(zakat) {
  const container = document.getElementById("zakatMuzakiList");
  const countInput = document.getElementById("zakatMuzakiCount");
  const totalDisplay = document.getElementById("zakatMuzakiTotal");

  if (!container || !countInput) return;

  const muzakiList = zakat.muzaki || [];
  const count = Math.max(muzakiList.length || 1, 1);
  countInput.value = count;

  const allNames = getAllMuzakiNames();

  function renderMuzakiRows() {
    const currentCount = parseInt(countInput.value) || 1;

    // Simpan data yang sudah ada
    const existingData = [];
    for (let i = 0; i < Math.min(currentCount, muzakiList.length); i++) {
      if (muzakiList[i]) {
        existingData.push(muzakiList[i]);
      }
    }
    while (existingData.length < currentCount) {
      existingData.push({ id: "", nama: "", nominal: 0 });
    }

    // Kumpulkan nama yang sudah dipilih di row sebelumnya
    const selectedNames = [];
    let rows = [];
    for (let i = 0; i < currentCount; i++) {
      const existing = existingData[i] || { nama: "", nominal: 0 };

      // Nama yang sudah dipilih di row sebelumnya (untuk filter)
      const usedNames = [];
      for (let j = 0; j < i; j++) {
        const prevRow = document.querySelector(
          `.zakat-muzaki-row[data-index="${j}"]`,
        );
        if (prevRow) {
          const nameInput = prevRow.querySelector(".zakat-muzaki-name");
          if (nameInput && nameInput.value) {
            usedNames.push(nameInput.value);
          }
        }
      }

      rows.push(`
        <div class="zakat-muzaki-row" data-index="${i}">
          <div class="zakat-name-wrapper" style="position:relative;flex:1;">
            <input type="text" class="field-input zakat-muzaki-name" 
                   placeholder="Nama Muzaki ${i + 1}" 
                   value="${escapeHtml(existing.nama || "")}" 
                   data-index="${i}"
                   list="suggest-muzaki-${i}"
                   autocomplete="off"
                   style="width:100%;">
            <datalist id="suggest-muzaki-${i}">
              ${allNames
                .filter((n) => {
                  const lower = n.toLowerCase().trim();
                  const isUsed = usedNames.some(
                    (s) => s.toLowerCase().trim() === lower,
                  );
                  const isSelf = n === existing.nama;
                  return !isUsed || isSelf;
                })
                .map((n) => `<option value="${escapeHtml(n)}">`)
                .join("")}
            </datalist>
            ${existing.nama ? `<span class="zakat-name-badge">✓</span>` : ""}
          </div>
          <input type="number" class="field-input zakat-muzaki-nominal" 
                 placeholder="Nominal" 
                 value="${existing.nominal || ""}" 
                 data-index="${i}" 
                 min="0" step="1000"
                 style="max-width:140px;">
        </div>
      `);
    }

    container.innerHTML = rows.join("");

    // Event listener untuk update total
    container.querySelectorAll(".zakat-muzaki-nominal").forEach((input) => {
      input.addEventListener("input", updateMuzakiTotal);
    });

    // Event listener untuk input nama - update suggestion & validation
    container.querySelectorAll(".zakat-muzaki-name").forEach((input) => {
      const idx = parseInt(input.dataset.index);

      input.addEventListener("input", function () {
        const val = this.value.toLowerCase().trim();
        const datalist = document.getElementById("suggest-muzaki-" + idx);
        if (datalist) {
          // Kumpulkan nama yang dipilih di row lain
          const selectedNames = [];
          container.querySelectorAll(".zakat-muzaki-row").forEach((row) => {
            if (row !== this.closest(".zakat-muzaki-row")) {
              const nameInput = row.querySelector(".zakat-muzaki-name");
              if (nameInput && nameInput.value) {
                selectedNames.push(nameInput.value);
              }
            }
          });

          datalist.innerHTML = "";
          allNames
            .filter((n) => {
              const lower = n.toLowerCase().trim();
              const match = val === "" || lower.includes(val);
              const notSelected = !selectedNames.some(
                (s) => s.toLowerCase().trim() === lower,
              );
              return match && notSelected;
            })
            .forEach((n) => {
              const opt = document.createElement("option");
              opt.value = n;
              datalist.appendChild(opt);
            });
        }
        updateMuzakiTotal();
      });

      input.addEventListener("blur", function () {
        const val = this.value.trim();
        if (val) {
          let isDuplicate = false;
          container.querySelectorAll(".zakat-muzaki-row").forEach((row) => {
            if (row !== this.closest(".zakat-muzaki-row")) {
              const nameInput = row.querySelector(".zakat-muzaki-name");
              if (
                nameInput &&
                nameInput.value.toLowerCase().trim() ===
                  val.toLowerCase().trim()
              ) {
                isDuplicate = true;
              }
            }
          });

          if (isDuplicate) {
            this.style.borderColor = "var(--neg)";
            this.style.boxShadow = "0 0 0 2px var(--neg-soft)";
            showToast("Nama sudah dipilih oleh Muzaki lain!", "warning");
          } else {
            this.style.borderColor = "";
            this.style.boxShadow = "";
          }
        }
      });
    });

    updateMuzakiTotal();
  }

  function updateMuzakiTotal() {
    const inputs = container.querySelectorAll(".zakat-muzaki-nominal");
    let total = 0;
    inputs.forEach((input) => {
      total += Number(input.value) || 0;
    });
    totalDisplay.textContent = fmtRp(total);
  }

  countInput.addEventListener("change", () => {
    const newCount = parseInt(countInput.value) || 1;
    // Simpan data lama
    const currentData = [];
    container.querySelectorAll(".zakat-muzaki-row").forEach((row) => {
      const name = row.querySelector(".zakat-muzaki-name").value;
      const nominal =
        Number(row.querySelector(".zakat-muzaki-nominal").value) || 0;
      currentData.push({ nama: name, nominal });
    });

    // Update muzakiList
    while (zakat.muzaki.length < newCount) {
      zakat.muzaki.push({
        id:
          "MZ" +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 5),
        nama: "",
        nominal: 0,
        createdAt: new Date().toISOString(),
      });
    }
    if (zakat.muzaki.length > newCount) {
      zakat.muzaki = zakat.muzaki.slice(0, newCount);
    }

    // Restore data
    for (let i = 0; i < Math.min(newCount, currentData.length); i++) {
      if (zakat.muzaki[i]) {
        zakat.muzaki[i].nama = currentData[i].nama;
        zakat.muzaki[i].nominal = currentData[i].nominal;
      }
    }

    renderMuzakiRows();
  });

  renderMuzakiRows();

  // ============================================================
  // ZAKAT - SAVE MUZAKI DENGAN LOADER
  // ============================================================

  // Update fungsi save muzaki di renderZakatMuzakiTab:
  document.getElementById("zakatSaveMuzaki").onclick = async function () {
    const btn = this;
    showZakatButtonLoading(btn, "Menyimpan Muzaki...");

    try {
      const rows = container.querySelectorAll(".zakat-muzaki-row");
      const newMuzaki = [];
      let hasDuplicate = false;
      const names = [];

      rows.forEach((row) => {
        const name = row.querySelector(".zakat-muzaki-name").value.trim();
        const nominal =
          Number(row.querySelector(".zakat-muzaki-nominal").value) || 0;

        if (name) {
          const key = name.toLowerCase().trim();
          if (names.includes(key)) {
            hasDuplicate = true;
          } else {
            names.push(key);
            newMuzaki.push({
              id:
                "MZ" +
                Date.now().toString(36).toUpperCase() +
                Math.random().toString(36).substring(2, 5),
              nama: name,
              nominal: nominal,
              createdAt: new Date().toISOString(),
            });
          }
        } else if (nominal > 0) {
          newMuzaki.push({
            id:
              "MZ" +
              Date.now().toString(36).toUpperCase() +
              Math.random().toString(36).substring(2, 5),
            nama: "Muzaki " + (newMuzaki.length + 1),
            nominal: nominal,
            createdAt: new Date().toISOString(),
          });
        }
      });

      if (hasDuplicate) {
        showToast("Ada nama yang sama! Periksa kembali.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      if (newMuzaki.length === 0) {
        showToast("Tambahkan minimal satu muzaki.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      zakat.muzaki = newMuzaki;
      zakat.total = newMuzaki.reduce((sum, m) => sum + m.nominal, 0);
      zakat.updatedAt = new Date().toISOString();

      showZakatLoader("Menyimpan data muzaki...");
      const result = await syncZakatToBackend(zakat);

      if (result.success) {
        document.getElementById("zakatDetailTotal").textContent = fmtRp(
          zakat.total,
        );
        showToast("Muzaki berhasil disimpan!", "success");
      } else {
        showToast("Muzaki disimpan (offline mode)", "warning");
      }
      renderZakatList();
    } catch (err) {
      console.error("Save muzaki error:", err);
      showToast("Gagal menyimpan muzaki", "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
}

// ============================================================
// ZAKAT - TAB RINCIAN
// ============================================================

function renderZakatRincianTab(zakat) {
  const totalZakat = zakat.total || 0;

  // Ambil data rincian
  const r = zakat.rincian || {};

  // Data persentase (default)
  const mustahikPersen = r.mustahik?.persen || 45;
  const sabilillahPersen = r.sabilillah?.persen || 40;
  const amilPersen = r.amil?.persen || 15;

  // Data nominal hasil perhitungan (jika ada)
  const mustahikNominal =
    r.mustahik?.nominal || Math.round((totalZakat * mustahikPersen) / 100);
  const sabilillahNominal =
    r.sabilillah?.nominal || Math.round((totalZakat * sabilillahPersen) / 100);
  const amilNominal =
    r.amil?.nominal || Math.round((totalZakat * amilPersen) / 100);

  const mustahikKelompokPersen = r.mustahik?.kelompok?.persen || 80;
  const mustahikDaerahPersen = r.mustahik?.daerah?.persen || 20;
  const mustahikKelompokNominal =
    r.mustahik?.kelompok?.nominal ||
    Math.round((mustahikNominal * mustahikKelompokPersen) / 100);
  const mustahikDaerahNominal =
    r.mustahik?.daerah?.nominal ||
    Math.round((mustahikNominal * mustahikDaerahPersen) / 100);

  const amilKelompokPersen = r.amil?.kelompok?.persen || 12;
  const amilDesaPersen = r.amil?.desa?.persen || 2;
  const amilDaerahPersen = r.amil?.daerah?.persen || 1;
  const amilKelompokNominal =
    r.amil?.kelompok?.nominal ||
    Math.round((amilNominal * amilKelompokPersen) / 100);
  const amilDesaNominal =
    r.amil?.desa?.nominal || Math.round((amilNominal * amilDesaPersen) / 100);
  const amilDaerahNominal =
    r.amil?.daerah?.nominal ||
    Math.round((amilNominal * amilDaerahPersen) / 100);

  // Set nilai ke input
  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };

  setValue("zakatPersenMustahik", mustahikPersen);
  setValue("zakatPersenMustahikKelompok", mustahikKelompokPersen);
  setValue("zakatPersenMustahikDaerah", mustahikDaerahPersen);
  setValue("zakatPersenSabilillah", sabilillahPersen);
  setValue("zakatPersenAmil", amilPersen);
  setValue("zakatPersenAmilKelompok", amilKelompokPersen);
  setValue("zakatPersenAmilDesa", amilDesaPersen);
  setValue("zakatPersenAmilDaerah", amilDaerahPersen);

  // Tampilkan nominal hasil perhitungan
  const nominalDisplay = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = fmtRp(value);
      el.style.color = value > 0 ? "var(--pos)" : "var(--ink-faint)";
    }
  };

  // Tambahkan elemen display nominal jika belum ada
  // Atau gunakan elemen yang sudah ada
  nominalDisplay("zakatMustahikNominalDisplay", mustahikNominal);
  nominalDisplay("zakatSabilillahNominalDisplay", sabilillahNominal);
  nominalDisplay("zakatAmilNominalDisplay", amilNominal);
  nominalDisplay(
    "zakatMustahikKelompokNominalDisplay",
    mustahikKelompokNominal,
  );
  nominalDisplay("zakatMustahikDaerahNominalDisplay", mustahikDaerahNominal);
  nominalDisplay("zakatAmilKelompokNominalDisplay", amilKelompokNominal);
  nominalDisplay("zakatAmilDesaNominalDisplay", amilDesaNominal);
  nominalDisplay("zakatAmilDaerahNominalDisplay", amilDaerahNominal);

  // Update fungsi validasi
  function updateRincian() {
    const getVal = (id) => Number(document.getElementById(id)?.value || 0);

    const pMustahik = getVal("zakatPersenMustahik");
    const pSabilillah = getVal("zakatPersenSabilillah");
    const pAmil = getVal("zakatPersenAmil");

    const pKelompok = getVal("zakatPersenMustahikKelompok");
    const pDaerah = getVal("zakatPersenMustahikDaerah");
    const pAmilKelompok = getVal("zakatPersenAmilKelompok");
    const pAmilDesa = getVal("zakatPersenAmilDesa");
    const pAmilDaerah = getVal("zakatPersenAmilDaerah");

    // Validasi Mustahik sub-total
    const mustahikSub = pKelompok + pDaerah;
    const mustahikSubEl = document.getElementById("zakatMustahikSubTotal");
    if (mustahikSubEl) {
      mustahikSubEl.textContent = `Subtotal: ${pKelompok}% + ${pDaerah}% = ${mustahikSub}%`;
      mustahikSubEl.className =
        "zakat-rincian-sub-total " +
        (mustahikSub === 100 ? "valid" : "invalid");
    }

    // Validasi Amil sub-total
    const amilSub = pAmilKelompok + pAmilDesa + pAmilDaerah;
    const amilSubEl = document.getElementById("zakatAmilSubTotal");
    if (amilSubEl) {
      amilSubEl.textContent = `Subtotal: ${pAmilKelompok}% + ${pAmilDesa}% + ${pAmilDaerah}% = ${amilSub}%`;
      amilSubEl.className =
        "zakat-rincian-sub-total " + (amilSub === pAmil ? "valid" : "invalid");
    }

    // Total persentase
    const totalPersen = pMustahik + pSabilillah + pAmil;
    const totalEl = document.getElementById("zakatTotalPersen");
    if (totalEl) {
      totalEl.textContent = totalPersen;
      totalEl.style.color = totalPersen === 100 ? "var(--pos)" : "var(--neg)";
    }

    // Update nominal preview (live preview)
    const totalZakat = zakat.total || 0;
    const mustahikNominalPreview = Math.round((totalZakat * pMustahik) / 100);
    const sabilillahNominalPreview = Math.round(
      (totalZakat * pSabilillah) / 100,
    );
    const amilNominalPreview = Math.round((totalZakat * pAmil) / 100);

    const nominalEl = document.getElementById("zakatTotalNominal");
    if (nominalEl) {
      if (totalPersen === 100) {
        const totalNominal =
          mustahikNominalPreview +
          sabilillahNominalPreview +
          amilNominalPreview;
        nominalEl.textContent = fmtRp(totalNominal);
        nominalEl.style.color = "var(--brand)";
      } else {
        nominalEl.textContent = "⚠️ Harus 100%";
        nominalEl.style.color = "var(--neg)";
      }
    }

    // Update preview nominal rincian
    const previewEls = {
      zakatMustahikNominalPreview: mustahikNominalPreview,
      zakatSabilillahNominalPreview: sabilillahNominalPreview,
      zakatAmilNominalPreview: amilNominalPreview,
    };

    Object.keys(previewEls).forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = fmtRp(previewEls[id]);
        el.style.color = previewEls[id] > 0 ? "var(--pos)" : "var(--ink-faint)";
      }
    });
  }

  // Event listener untuk update real-time
  const rincianInputs = [
    "zakatPersenMustahik",
    "zakatPersenMustahikKelompok",
    "zakatPersenMustahikDaerah",
    "zakatPersenSabilillah",
    "zakatPersenAmil",
    "zakatPersenAmilKelompok",
    "zakatPersenAmilDesa",
    "zakatPersenAmilDaerah",
  ];

  rincianInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", updateRincian);
    }
  });

  // Set Default buttons
  document.querySelectorAll(".zakat-default-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const target = this.dataset.target;
      const defaults = {
        mustahik: {
          persen: 45,
          kelompok: { persen: 80 },
          daerah: { persen: 20 },
        },
        sabilillah: { persen: 40 },
        amil: {
          persen: 15,
          kelompok: { persen: 12 },
          desa: { persen: 2 },
          daerah: { persen: 1 },
        },
      };

      if (target === "mustahik") {
        setValue("zakatPersenMustahik", defaults.mustahik.persen);
        setValue(
          "zakatPersenMustahikKelompok",
          defaults.mustahik.kelompok.persen,
        );
        setValue("zakatPersenMustahikDaerah", defaults.mustahik.daerah.persen);
      } else if (target === "sabilillah") {
        setValue("zakatPersenSabilillah", defaults.sabilillah.persen);
      } else if (target === "amil") {
        setValue("zakatPersenAmil", defaults.amil.persen);
        setValue("zakatPersenAmilKelompok", defaults.amil.kelompok.persen);
        setValue("zakatPersenAmilDesa", defaults.amil.desa.persen);
        setValue("zakatPersenAmilDaerah", defaults.amil.daerah.persen);
      }
      updateRincian();
      showToast("Default diterapkan!", "info");
    });
  });

  // Initial update
  updateRincian();
}
// ============================================================
// ZAKAT - TAB MUSTAHIK
// ============================================================

function renderZakatMustahikTab(zakat) {
  const container = document.getElementById("zakatMustahikList");
  const countInput = document.getElementById("zakatMustahikCount");
  const danaDisplay = document.getElementById("zakatMustahikDana");
  const sisaDisplay = document.getElementById("zakatMustahikSisa");

  if (!container || !countInput) return;

  const totalZakat = zakat.total || 0;
  const r = zakat.rincian || {};
  const mustahik = r.mustahik || { total: 45, kelompok: 80, daerah: 20 };
  const danaMustahik =
    ((totalZakat * mustahik.total) / 100) * (mustahik.kelompok / 100);

  danaDisplay.textContent = fmtRp(danaMustahik);

  const mustahikList = zakat.mustahik || [];
  const count = Math.max(mustahikList.length || 1, 1);
  countInput.value = count;

  const allNames = getAllMustahikNames();

  function renderMustahikRows() {
    const currentCount = parseInt(countInput.value) || 1;
    let totalDistributed = 0;

    // Simpan data yang sudah ada
    const existingData = [];
    for (let i = 0; i < Math.min(currentCount, mustahikList.length); i++) {
      if (mustahikList[i]) {
        existingData.push(mustahikList[i]);
      }
    }
    while (existingData.length < currentCount) {
      existingData.push({ id: "", nama: "", nominal: 0 });
    }

    let rows = [];
    for (let i = 0; i < currentCount; i++) {
      const existing = existingData[i] || { nama: "", nominal: 0 };
      totalDistributed += existing.nominal || 0;

      rows.push(`
        <div class="zakat-muzaki-row" data-mustahik-index="${i}">
          <div class="zakat-name-wrapper" style="position:relative;flex:1;">
            <input type="text" class="field-input zakat-mustahik-name" 
                   placeholder="Nama Mustahik ${i + 1}" 
                   value="${escapeHtml(existing.nama || "")}" 
                   data-index="${i}"
                   list="suggest-mustahik-${i}"
                   autocomplete="off"
                   style="width:100%;">
            <datalist id="suggest-mustahik-${i}">
              ${allNames
                .filter((n) => {
                  const lower = n.toLowerCase().trim();
                  const isUsed = mustahikList.some(
                    (m) =>
                      m.nama &&
                      m.nama.toLowerCase().trim() === lower &&
                      m !== existing,
                  );
                  const isSelf = n === existing.nama;
                  return !isUsed || isSelf;
                })
                .map((n) => `<option value="${escapeHtml(n)}">`)
                .join("")}
            </datalist>
            ${existing.nama ? `<span class="zakat-name-badge">✓</span>` : ""}
          </div>
          <input type="number" class="field-input zakat-mustahik-nominal" 
                 placeholder="Nominal" 
                 value="${existing.nominal || ""}" 
                 data-index="${i}" 
                 min="0" step="1000"
                 style="max-width:140px;">
        </div>
      `);
    }

    container.innerHTML = rows.join("");

    updateSisa();

    container.querySelectorAll(".zakat-mustahik-nominal").forEach((input) => {
      input.addEventListener("input", updateSisa);
    });

    container.querySelectorAll(".zakat-mustahik-name").forEach((input) => {
      input.addEventListener("input", function () {
        const val = this.value.toLowerCase().trim();
        const idx = parseInt(this.dataset.index);
        const datalist = document.getElementById("suggest-mustahik-" + idx);
        if (datalist) {
          const selectedNames = [];
          container
            .querySelectorAll(".zakat-mustahik-name")
            .forEach((other) => {
              if (other !== this && other.value) {
                selectedNames.push(other.value);
              }
            });

          datalist.innerHTML = "";
          allNames
            .filter((n) => {
              const lower = n.toLowerCase().trim();
              const match = val === "" || lower.includes(val);
              const notSelected = !selectedNames.some(
                (s) => s.toLowerCase().trim() === lower,
              );
              return match && notSelected;
            })
            .forEach((n) => {
              const opt = document.createElement("option");
              opt.value = n;
              datalist.appendChild(opt);
            });
        }
      });
    });
  }

  function updateSisa() {
    let totalDistributed = 0;
    container.querySelectorAll(".zakat-mustahik-nominal").forEach((input) => {
      totalDistributed += Number(input.value) || 0;
    });
    const sisa = Math.max(0, danaMustahik - totalDistributed);
    sisaDisplay.textContent = fmtRp(sisa);
    sisaDisplay.style.color = sisa > 0 ? "var(--pos)" : "var(--ink-soft)";

    const progress =
      danaMustahik > 0 ? (totalDistributed / danaMustahik) * 100 : 0;
    const progressEl = document.getElementById("zakatMustahikProgress");
    if (progressEl) {
      progressEl.style.width = Math.min(100, progress) + "%";
      progressEl.style.background =
        progress >= 100 ? "var(--pos)" : "var(--brand)";
    }
  }

  countInput.addEventListener("change", () => {
    const newCount = parseInt(countInput.value) || 1;
    while (zakat.mustahik.length < newCount) {
      zakat.mustahik.push({
        id:
          "MS" +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 5),
        nama: "",
        nominal: 0,
        createdAt: new Date().toISOString(),
      });
    }
    if (zakat.mustahik.length > newCount) {
      zakat.mustahik = zakat.mustahik.slice(0, newCount);
    }
    renderMustahikRows();
  });

  renderMustahikRows();

  document.getElementById("zakatSaveMustahik").onclick = async function () {
    const btn = this;
    showZakatButtonLoading(btn, "Menyimpan Mustahik...");

    try {
      const rows = container.querySelectorAll(".zakat-muzaki-row");
      const newMustahik = [];
      let totalDistributed = 0;
      let hasDuplicate = false;
      const names = [];

      rows.forEach((row) => {
        const name = row.querySelector(".zakat-mustahik-name").value.trim();
        const nominal =
          Number(row.querySelector(".zakat-mustahik-nominal").value) || 0;
        totalDistributed += nominal;

        if (name) {
          const key = name.toLowerCase().trim();
          if (names.includes(key)) {
            hasDuplicate = true;
          } else {
            names.push(key);
            newMustahik.push({
              id:
                "MS" +
                Date.now().toString(36).toUpperCase() +
                Math.random().toString(36).substring(2, 5),
              nama: name,
              nominal: nominal,
              createdAt: new Date().toISOString(),
            });
          }
        } else if (nominal > 0) {
          newMustahik.push({
            id:
              "MS" +
              Date.now().toString(36).toUpperCase() +
              Math.random().toString(36).substring(2, 5),
            nama: "Mustahik " + (newMustahik.length + 1),
            nominal: nominal,
            createdAt: new Date().toISOString(),
          });
        }
      });

      if (hasDuplicate) {
        showToast("Ada nama yang sama! Periksa kembali.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      if (newMustahik.length === 0) {
        showToast("Tambahkan minimal satu mustahik.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      if (totalDistributed > danaMustahik) {
        showToast("Total nominal melebihi dana mustahik!", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      zakat.mustahik = newMustahik;
      zakat.updatedAt = new Date().toISOString();

      showZakatLoader("Menyimpan data mustahik...");
      const result = await syncZakatToBackend(zakat);

      if (result.success) {
        showToast("Mustahik berhasil disimpan!", "success");
      } else {
        showToast("Mustahik disimpan (offline mode)", "warning");
      }
      renderZakatList();
    } catch (err) {
      console.error("Save mustahik error:", err);
      showToast("Gagal menyimpan mustahik", "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
}

// ============================================================
// ZAKAT - TABS NAVIGATION
// ============================================================

function initZakatTabs() {
  const tabs = document.querySelectorAll(".zakat-tab");

  // ✅ CEK: Pastikan ada tabs
  if (!tabs || tabs.length === 0) {
    console.warn("⚠️ No zakat tabs found");
    return;
  }

  const panels = {
    muzaki: document.getElementById("zakatTabMuzaki"),
    rincian: document.getElementById("zakatTabRincian"),
    mustahik: document.getElementById("zakatTabMustahik"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const target = this.dataset.zakatTab;
      const zakat = getZakatById(state.zakat?.currentId);
      if (!zakat) return;

      // Update tab aktif
      tabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      // ✅ Update panel dengan aman
      Object.keys(panels).forEach((key) => {
        const panel = panels[key];
        if (panel) {
          if (key === target) {
            panel.classList.add("active");
          } else {
            panel.classList.remove("active");
          }
        }
      });

      // Render konten sesuai tab
      if (target === "muzaki") {
        renderZakatMuzakiTab(zakat);
      } else if (target === "rincian") {
        renderZakatRincianTab(zakat);
      } else if (target === "mustahik") {
        renderZakatMustahikTab(zakat);
      }
    });
  });
}

// ============================================================
// ZAKAT - SCREEN NAVIGATION (DENGAN LOADER & MENUTUPI BOTTOM NAV)
// ============================================================

window.openZakatScreen = function () {
  console.log("🔄 openZakatScreen called");

  // Gunakan router untuk navigasi
  if (
    typeof router !== "undefined" &&
    router &&
    typeof router.navigateTo === "function"
  ) {
    router.navigateTo("zakat");
  } else {
    // Fallback: langsung tampilkan screen
    const screen = document.getElementById("screen-zakat");
    if (!screen) {
      console.error("❌ screen-zakat not found");
      showToast("Screen Zakat tidak ditemukan", "error");
      return;
    }

    // Sembunyikan bottom nav
    const bottomNav = document.getElementById("bottomnav");
    if (bottomNav) {
      bottomNav.style.display = "none";
    }

    screen.classList.add("active");
    showZakatLoader("Memuat data zakat...");
    loadZakatData();
  }
};

// Tutup Zakat Screen dan kembali ke Profile
window.closeZakatScreen = function () {
  console.log("🔄 closeZakatScreen called");

  // Kembali ke profile via router
  if (
    typeof router !== "undefined" &&
    router &&
    typeof router.navigateTo === "function"
  ) {
    router.navigateTo("profile");
  } else {
    // Fallback
    const screen = document.getElementById("screen-zakat");
    if (screen) {
      screen.classList.remove("active");
    }

    // Kembalikan bottom nav
    const bottomNav = document.getElementById("bottomnav");
    if (bottomNav) {
      bottomNav.style.display = "";
    }
  }

  state.zakat.isViewOpen = false;
  state.zakat.currentId = null;

  // Tutup semua sheet zakat
  const sheets = [
    "zakatMuzakiSheet",
    "zakatRincianSheet",
    "zakatMustahikSheet",
    "zakatFormOverlay",
    "zakatEditHeaderOverlay",
  ];

  sheets.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
};

// ============================================================
// ZAKAT - LOADER FUNCTIONS (PASTIKAN TERSEDIA)
// ============================================================

function showZakatLoader(message = "Memuat data...") {
  const loader = document.getElementById("zakatLoader");
  const text = document.getElementById("zakatLoaderText");
  if (loader) {
    loader.classList.remove("hidden");
    if (text) text.textContent = message;
  }
}

function hideZakatLoader() {
  const loader = document.getElementById("zakatLoader");
  if (loader) {
    loader.classList.add("hidden");
  }
}

function showZakatButtonLoading(btn, text = "Menyimpan...") {
  if (!btn) return;
  btn._originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = `
    <span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:8px;"></span>
    ${text}
  `;
}

function hideZakatButtonLoading(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = btn._originalText || "Simpan";
}

// ============================================================
// ZAKAT - INISIALISASI (FIXED - SEMUA ELEMEN DI-CEK)
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  console.log("🔄 Zakat module initializing...");

  // Inisialisasi state
  if (!state.zakat) {
    state.zakat = {
      list: getZakatData(),
      currentId: null,
      isViewOpen: false,
      _loaded: false,
      _loading: false,
    };
  }

  document.addEventListener("click", function (e) {
    const btn = e.target.closest("#btnOpenZakat");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      console.log("🔄 btnOpenZakat clicked via delegation");

      // Panggil fungsi openZakatScreen
      if (typeof openZakatScreen === "function") {
        openZakatScreen();
      } else if (typeof window.openZakatScreen === "function") {
        window.openZakatScreen();
      } else {
        console.error("❌ openZakatScreen is not defined");
        showToast("Fungsi Zakat belum siap", "error");
      }
    }
  });

  // ✅ Tombol Back
  const btnZakatBack = document.getElementById("btnZakatBack");
  if (btnZakatBack) {
    btnZakatBack.addEventListener("click", function () {
      const formContainer = document.getElementById("zakatFormContainer");
      const screenTitle = document.getElementById("zakatScreenTitle");

      if (formContainer && !formContainer.classList.contains("hidden")) {
        closeZakatForm(true);
        return;
      }

      if (state.zakat && state.zakat.isViewOpen) {
        closeZakatDetail();
        renderZakatList();
        if (screenTitle) {
          screenTitle.textContent = "Manajemen Zakat";
        }
        return;
      }

      if (typeof closeZakatScreen === "function") {
        closeZakatScreen();
      } else if (window.closeZakatScreen) {
        window.closeZakatScreen();
      }
    });
  } else {
    console.warn("⚠️ btnZakatBack not found in DOM");
  }

  // ✅ FAB Zakat
  const fabZakat = document.getElementById("fabZakat");
  if (fabZakat) {
    fabZakat.addEventListener("click", function () {
      if (state.zakat && state.zakat.isViewOpen) {
        closeZakatDetail();
      }
      openZakatForm(null);
    });
  } else {
    console.warn("⚠️ fabZakat not found in DOM");
  }

  // ✅ Init tabs
  initZakatTabs();

  // ✅ Event listener untuk form
  const zakatFormCancel = document.getElementById("zakatFormCancel");
  if (zakatFormCancel) {
    zakatFormCancel.addEventListener("click", function () {
      closeZakatForm(true);
    });
  }

  const zakatFormSubmit = document.getElementById("zakatFormSubmit");
  if (zakatFormSubmit) {
    zakatFormSubmit.addEventListener("click", function () {
      submitZakatForm();
    });
  }

  // ✅ Close on overlay click
  const zakatFormOverlay = document.getElementById("zakatFormOverlay");
  if (zakatFormOverlay) {
    zakatFormOverlay.addEventListener("click", function (e) {
      if (e.target === this) {
        closeZakatForm(true);
      }
    });
  }

  // ✅ Enter key support
  const zakatFormTitleInput = document.getElementById("zakatFormTitleInput");
  if (zakatFormTitleInput) {
    zakatFormTitleInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const submitBtn = document.getElementById("zakatFormSubmit");
        if (submitBtn) submitBtn.click();
      }
    });
  }

  console.log("✅ Zakat module initialized");
});

// ============================================================
// ZAKAT - RENDER TAB VIEW (TABEL)
// ============================================================

// Render Muzaki Tab (Mode Lihat - Tabel)
function renderZakatMuzakiView(zakat) {
  const tbody = document.getElementById("zakatMuzakiTableBody");
  const totalEl = document.getElementById("zakatMuzakiTableTotal");
  const countEl = document.getElementById("zakatMuzakiCountDisplay");

  if (!tbody) return;

  const muzaki = zakat.muzaki || [];
  const total = muzaki.reduce((sum, m) => sum + (m.nominal || 0), 0);

  // Update count
  if (countEl) {
    countEl.textContent = muzaki.length + " orang";
  }

  if (muzaki.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="zakat-table-empty">Belum ada data muzaki.</td>
      </tr>
    `;
    if (totalEl) totalEl.textContent = fmtRp(0);
    return;
  }

  tbody.innerHTML = muzaki
    .map(
      (m, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(m.nama || "-")}</td>
      <td class="text-right mono">${fmtRp(m.nominal || 0)}</td>
    </tr>
  `,
    )
    .join("");

  if (totalEl) totalEl.textContent = fmtRp(total);
}

// Render Rincian Tab (Mode Lihat)
function renderZakatRincianView(zakat) {
  const totalZakat = zakat.total || 0;
  const r = zakat.rincian || {};

  // Data dengan default
  const mustahik = r.mustahik || {
    persen: 45,
    nominal: 0,
    kelompok: { persen: 80, nominal: 0 },
    daerah: { persen: 20, nominal: 0 },
  };
  const sabilillah = r.sabilillah || { persen: 40, nominal: 0 };
  const amil = r.amil || {
    persen: 15,
    nominal: 0,
    kelompok: { persen: 12, nominal: 0 },
    desa: { persen: 2, nominal: 0 },
    daerah: { persen: 1, nominal: 0 },
  };

  // Hitung nominal jika belum ada
  const mustahikNominal =
    mustahik.nominal || Math.round((totalZakat * mustahik.persen) / 100);
  const sabilillahNominal =
    sabilillah.nominal || Math.round((totalZakat * sabilillah.persen) / 100);
  const amilNominal =
    amil.nominal || Math.round((totalZakat * amil.persen) / 100);

  const mustahikKelompokNominal =
    mustahik.kelompok?.nominal ||
    Math.round((mustahikNominal * mustahik.kelompok.persen) / 100);
  const mustahikDaerahNominal =
    mustahik.daerah?.nominal ||
    Math.round((mustahikNominal * mustahik.daerah.persen) / 100);

  const amilKelompokNominal =
    amil.kelompok?.nominal ||
    Math.round((amilNominal * amil.kelompok.persen) / 100);
  const amilDesaNominal =
    amil.desa?.nominal || Math.round((amilNominal * amil.desa.persen) / 100);
  const amilDaerahNominal =
    amil.daerah?.nominal ||
    Math.round((amilNominal * amil.daerah.persen) / 100);

  // Update display
  const setDisplay = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setDisplay(
    "zakatRincianMustahik",
    `${mustahik.persen}% · ${fmtRp(mustahikNominal)}`,
  );
  setDisplay(
    "zakatRincianMustahikKelompok",
    `${mustahik.kelompok.persen}% · ${fmtRp(mustahikKelompokNominal)}`,
  );
  setDisplay(
    "zakatRincianMustahikDaerah",
    `${mustahik.daerah.persen}% · ${fmtRp(mustahikDaerahNominal)}`,
  );
  setDisplay(
    "zakatRincianSabilillah",
    `${sabilillah.persen}% · ${fmtRp(sabilillahNominal)}`,
  );
  setDisplay("zakatRincianAmil", `${amil.persen}% · ${fmtRp(amilNominal)}`);
  setDisplay(
    "zakatRincianAmilKelompok",
    `${amil.kelompok.persen}% · ${fmtRp(amilKelompokNominal)}`,
  );
  setDisplay(
    "zakatRincianAmilDesa",
    `${amil.desa.persen}% · ${fmtRp(amilDesaNominal)}`,
  );
  setDisplay(
    "zakatRincianAmilDaerah",
    `${amil.daerah.persen}% · ${fmtRp(amilDaerahNominal)}`,
  );

  // Update status
  const statusEl = document.getElementById("zakatRincianStatus");
  if (statusEl) {
    const isSaved = r.mustahik && r.mustahik.nominal > 0;
    statusEl.textContent = isSaved ? "✓ Tersimpan" : "● Belum disimpan";
    statusEl.className = "zakat-tab-status " + (isSaved ? "saved" : "unsaved");
  }
}

// Render Mustahik Tab (Mode Lihat - Tabel)
function renderZakatMustahikView(zakat) {
  const tbody = document.getElementById("zakatMustahikTableBody");
  const totalEl = document.getElementById("zakatMustahikTableTotal");
  const countEl = document.getElementById("zakatMustahikCountDisplay");
  const danaEl = document.getElementById("zakatMustahikDanaView");
  const tersalurkanEl = document.getElementById("zakatMustahikTersalurkan");
  const sisaEl = document.getElementById("zakatMustahikSisaView");
  const progressEl = document.getElementById("zakatMustahikProgressView");

  if (!tbody) return;

  const mustahik = zakat.mustahik || [];
  const total = mustahik.reduce((sum, m) => sum + (m.nominal || 0), 0);

  // Hitung dana mustahik
  const r = zakat.rincian || {};
  const mustahikData = r.mustahik || {
    persen: 45,
    nominal: 0,
    kelompok: { persen: 80, nominal: 0 },
  };
  const danaMustahik = mustahikData.nominal || 0;
  const sisa = Math.max(0, danaMustahik - total);
  const progress = danaMustahik > 0 ? (total / danaMustahik) * 100 : 0;

  // Update info bar
  if (danaEl) danaEl.textContent = fmtRp(danaMustahik);
  if (tersalurkanEl) {
    tersalurkanEl.textContent = fmtRp(total);
    tersalurkanEl.style.color = total > 0 ? "var(--pos)" : "var(--ink-soft)";
  }
  if (sisaEl) {
    sisaEl.textContent = fmtRp(sisa);
    sisaEl.style.color = sisa > 0 ? "var(--pos)" : "var(--ink-soft)";
  }
  if (progressEl) {
    progressEl.style.width = Math.min(100, progress) + "%";
    progressEl.style.background =
      progress >= 100 ? "var(--pos)" : "var(--brand)";
  }

  // Update count
  if (countEl) {
    countEl.textContent = mustahik.length + " orang";
  }

  if (mustahik.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="zakat-table-empty">Belum ada data mustahik.</td>
      </tr>
    `;
    if (totalEl) totalEl.textContent = fmtRp(0);
    return;
  }

  tbody.innerHTML = mustahik
    .map(
      (m, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(m.nama || "-")}</td>
      <td class="text-right mono">${fmtRp(m.nominal || 0)}</td>
    </tr>
  `,
    )
    .join("");

  if (totalEl) totalEl.textContent = fmtRp(total);
}

// ============================================================
// ZAKAT - BOTTOM SHEET HANDLERS
// ============================================================

// ============================================================
// 1. MUZAKI SHEET
// ============================================================

function openZakatMuzakiSheet() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const overlay = document.getElementById("zakatMuzakiSheet");
  if (!overlay) return;

  // Isi data ke sheet
  const muzakiList = zakat.muzaki || [];
  const count = Math.max(muzakiList.length || 1, 1);

  document.getElementById("zakatMuzakiSheetCount").value = count;
  renderMuzakiSheetRows(zakat);
  updateMuzakiSheetTotal(zakat);

  overlay.classList.remove("hidden");
}

function closeZakatMuzakiSheet() {
  const overlay = document.getElementById("zakatMuzakiSheet");
  if (overlay) overlay.classList.add("hidden");
}

function renderMuzakiSheetRows(zakat) {
  const container = document.getElementById("zakatMuzakiSheetList");
  const countInput = document.getElementById("zakatMuzakiSheetCount");
  if (!container || !countInput) return;

  const muzakiList = zakat.muzaki || [];
  const currentCount = parseInt(countInput.value) || 1;
  const allNames = getAllMuzakiNames();

  let rows = [];
  for (let i = 0; i < currentCount; i++) {
    const existing = muzakiList[i] || { nama: "", nominal: 0 };
    rows.push(`
      <div class="zakat-muzaki-row" data-sheet-index="${i}">
        <div class="zakat-name-wrapper" style="position:relative;flex:1;">
          <input type="text" class="field-input zakat-muzaki-sheet-name" 
                 placeholder="Nama Muzaki ${i + 1}" 
                 value="${escapeHtml(existing.nama || "")}" 
                 data-index="${i}"
                 list="sheet-suggest-muzaki-${i}"
                 autocomplete="off"
                 style="width:100%;">
          <datalist id="sheet-suggest-muzaki-${i}">
            ${allNames
              .filter((n) => {
                const lower = n.toLowerCase().trim();
                return !muzakiList.some(
                  (m) =>
                    m.nama &&
                    m.nama.toLowerCase().trim() === lower &&
                    m !== existing,
                );
              })
              .map((n) => `<option value="${escapeHtml(n)}">`)
              .join("")}
          </datalist>
        </div>
        <input type="number" class="field-input zakat-muzaki-sheet-nominal" 
               placeholder="Nominal" 
               value="${existing.nominal || ""}" 
               data-index="${i}" 
               min="0" step="1000"
               style="max-width:140px;">
      </div>
    `);
  }

  container.innerHTML = rows.join("");

  // Event listener untuk update total
  container.querySelectorAll(".zakat-muzaki-sheet-nominal").forEach((input) => {
    input.addEventListener("input", () => updateMuzakiSheetTotal(zakat));
  });
}

function updateMuzakiSheetTotal(zakat) {
  const container = document.getElementById("zakatMuzakiSheetList");
  const totalEl = document.getElementById("zakatMuzakiSheetTotal");
  if (!container || !totalEl) return;

  let total = 0;
  container.querySelectorAll(".zakat-muzaki-sheet-nominal").forEach((input) => {
    total += Number(input.value) || 0;
  });
  totalEl.textContent = fmtRp(total);
}

// Submit Muzaki Sheet
async function submitZakatMuzakiSheet() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const container = document.getElementById("zakatMuzakiSheetList");
  const btn = document.getElementById("zakatMuzakiSheetSubmit");

  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    const rows = container.querySelectorAll(".zakat-muzaki-row");
    const newMuzaki = [];
    let hasDuplicate = false;
    const names = [];
    let total = 0;

    rows.forEach((row) => {
      const nameInput = row.querySelector(".zakat-muzaki-sheet-name");
      const nominalInput = row.querySelector(".zakat-muzaki-sheet-nominal");

      const name = nameInput ? nameInput.value.trim() : "";
      const nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
      total += nominal;

      if (name) {
        const key = name.toLowerCase().trim();
        if (names.includes(key)) {
          hasDuplicate = true;
        } else {
          names.push(key);
          newMuzaki.push({
            id:
              "MZ" +
              Date.now().toString(36).toUpperCase() +
              Math.random().toString(36).substring(2, 5),
            nama: name,
            nominal: nominal,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (nominal > 0) {
        newMuzaki.push({
          id:
            "MZ" +
            Date.now().toString(36).toUpperCase() +
            Math.random().toString(36).substring(2, 5),
          nama: "Muzaki " + (newMuzaki.length + 1),
          nominal: nominal,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (hasDuplicate) {
      showToast("Ada nama yang sama! Periksa kembali.", "error");
      hideZakatButtonLoading(btn);
      return;
    }

    if (newMuzaki.length === 0) {
      showToast("Tambahkan minimal satu muzaki.", "error");
      hideZakatButtonLoading(btn);
      return;
    }

    // Update zakat
    zakat.muzaki = newMuzaki;
    zakat.total = total;
    zakat.updatedAt = new Date().toISOString();

    const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    // Kirim ke backend
    showZakatLoader("Menyimpan data muzaki...");
    const result = await apiUpdateZakatMuzaki({
      id: zakat.id,
      muzaki: zakat.muzaki,
      total: zakat.total,
    });

    if (result.success) {
      showToast("Muzaki berhasil disimpan!", "success");
    } else {
      showToast("Muzaki disimpan (offline mode)", "warning");
    }

    // Refresh view
    renderZakatMuzakiView(zakat);
    document.getElementById("zakatDetailTotal").textContent = fmtRp(
      zakat.total,
    );
    closeZakatMuzakiSheet();
    renderZakatList();
  } catch (err) {
    console.error("Save muzaki error:", err);
    showToast("Gagal menyimpan muzaki", "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

// ============================================================
// 2. RINCIAN SHEET
// ============================================================

function openZakatRincianSheet() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const overlay = document.getElementById("zakatRincianSheet");
  if (!overlay) return;

  // Isi data ke sheet
  const r = zakat.rincian || {};
  const mustahik = r.mustahik || {
    persen: 45,
    kelompok: { persen: 80 },
    daerah: { persen: 20 },
  };
  const sabilillah = r.sabilillah || { persen: 40 };
  const amil = r.amil || {
    persen: 15,
    kelompok: { persen: 12 },
    desa: { persen: 2 },
    daerah: { persen: 1 },
  };

  // Set value ke input (gunakan ID dengan suffix Sheet)
  document.getElementById("zakatPersenMustahikSheet").value =
    mustahik.persen || 45;
  document.getElementById("zakatPersenMustahikKelompokSheet").value =
    mustahik.kelompok?.persen || 80;
  document.getElementById("zakatPersenMustahikDaerahSheet").value =
    mustahik.daerah?.persen || 20;
  document.getElementById("zakatPersenSabilillahSheet").value =
    sabilillah.persen || 40;
  document.getElementById("zakatPersenAmilSheet").value = amil.persen || 15;
  document.getElementById("zakatPersenAmilKelompokSheet").value =
    amil.kelompok?.persen || 12;
  document.getElementById("zakatPersenAmilDesaSheet").value =
    amil.desa?.persen || 2;
  document.getElementById("zakatPersenAmilDaerahSheet").value =
    amil.daerah?.persen || 1;

  updateRincianSheet(zakat);

  overlay.classList.remove("hidden");
}

function closeZakatRincianSheet() {
  const overlay = document.getElementById("zakatRincianSheet");
  if (overlay) overlay.classList.add("hidden");
}

function updateRincianSheet(zakat) {
  const totalZakat = zakat.total || 0;

  const getVal = (id) => Number(document.getElementById(id)?.value || 0);

  const pMustahik = getVal("zakatPersenMustahikSheet");
  const pSabilillah = getVal("zakatPersenSabilillahSheet");
  const pAmil = getVal("zakatPersenAmilSheet");

  const pKelompok = getVal("zakatPersenMustahikKelompokSheet");
  const pDaerah = getVal("zakatPersenMustahikDaerahSheet");
  const pAmilKelompok = getVal("zakatPersenAmilKelompokSheet");
  const pAmilDesa = getVal("zakatPersenAmilDesaSheet");
  const pAmilDaerah = getVal("zakatPersenAmilDaerahSheet");

  // Validasi Mustahik sub-total
  const mustahikSub = pKelompok + pDaerah;
  const mustahikSubEl = document.getElementById("zakatMustahikSubTotalSheet");
  if (mustahikSubEl) {
    mustahikSubEl.textContent = `Subtotal: ${pKelompok}% + ${pDaerah}% = ${mustahikSub}%`;
    mustahikSubEl.className =
      "zakat-rincian-sub-total " + (mustahikSub === 100 ? "valid" : "invalid");
  }

  // Validasi Amil sub-total
  const amilSub = pAmilKelompok + pAmilDesa + pAmilDaerah;
  const amilSubEl = document.getElementById("zakatAmilSubTotalSheet");
  if (amilSubEl) {
    amilSubEl.textContent = `Subtotal: ${pAmilKelompok}% + ${pAmilDesa}% + ${pAmilDaerah}% = ${amilSub}%`;
    amilSubEl.className =
      "zakat-rincian-sub-total " + (amilSub === pAmil ? "valid" : "invalid");
  }

  // Total persentase
  const totalPersen = pMustahik + pSabilillah + pAmil;
  const totalEl = document.getElementById("zakatTotalPersenSheet");
  if (totalEl) {
    totalEl.textContent = totalPersen;
    totalEl.style.color = totalPersen === 100 ? "var(--pos)" : "var(--neg)";
  }

  // Total nominal
  const nominalEl = document.getElementById("zakatTotalNominalSheet");
  if (nominalEl) {
    if (totalPersen === 100) {
      const totalNominal =
        Math.round((totalZakat * pMustahik) / 100) +
        Math.round((totalZakat * pSabilillah) / 100) +
        Math.round((totalZakat * pAmil) / 100);
      nominalEl.textContent = fmtRp(totalNominal);
      nominalEl.style.color = "var(--brand)";
    } else {
      nominalEl.textContent = "⚠️ Harus 100%";
      nominalEl.style.color = "var(--neg)";
    }
  }
}

async function submitZakatRincianSheet() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const getVal = (id) => Number(document.getElementById(id)?.value || 0);

  const mustahikPersen = getVal("zakatPersenMustahikSheet");
  const sabilillahPersen = getVal("zakatPersenSabilillahSheet");
  const amilPersen = getVal("zakatPersenAmilSheet");

  // Validasi total = 100%
  if (mustahikPersen + sabilillahPersen + amilPersen !== 100) {
    showToast("Total persentase harus 100%!", "error");
    return;
  }

  const mustahikKelompokPersen = getVal("zakatPersenMustahikKelompokSheet");
  const mustahikDaerahPersen = getVal("zakatPersenMustahikDaerahSheet");
  if (mustahikKelompokPersen + mustahikDaerahPersen !== 100) {
    showToast("Mustahik Kelompok + Daerah harus 100%!", "error");
    return;
  }

  const amilKelompokPersen = getVal("zakatPersenAmilKelompokSheet");
  const amilDesaPersen = getVal("zakatPersenAmilDesaSheet");
  const amilDaerahPersen = getVal("zakatPersenAmilDaerahSheet");
  if (amilKelompokPersen + amilDesaPersen + amilDaerahPersen !== amilPersen) {
    showToast(
      "Amil Kelompok + Desa + Daerah harus sama dengan persentase Amil!",
      "error",
    );
    return;
  }

  const btn = document.getElementById("zakatRincianSheetSubmit");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    const totalZakat = zakat.total || 0;

    // Hitung nominal
    const mustahikNominal = Math.round((totalZakat * mustahikPersen) / 100);
    const sabilillahNominal = Math.round((totalZakat * sabilillahPersen) / 100);
    const amilNominal = Math.round((totalZakat * amilPersen) / 100);

    const mustahikKelompokNominal = Math.round(
      (mustahikNominal * mustahikKelompokPersen) / 100,
    );
    const mustahikDaerahNominal = Math.round(
      (mustahikNominal * mustahikDaerahPersen) / 100,
    );

    const amilKelompokNominal = Math.round(
      (amilNominal * amilKelompokPersen) / 100,
    );
    const amilDesaNominal = Math.round((amilNominal * amilDesaPersen) / 100);
    const amilDaerahNominal = Math.round(
      (amilNominal * amilDaerahPersen) / 100,
    );

    zakat.rincian = {
      mustahik: {
        persen: mustahikPersen,
        nominal: mustahikNominal,
        kelompok: {
          persen: mustahikKelompokPersen,
          nominal: mustahikKelompokNominal,
        },
        daerah: {
          persen: mustahikDaerahPersen,
          nominal: mustahikDaerahNominal,
        },
      },
      sabilillah: {
        persen: sabilillahPersen,
        nominal: sabilillahNominal,
      },
      amil: {
        persen: amilPersen,
        nominal: amilNominal,
        kelompok: {
          persen: amilKelompokPersen,
          nominal: amilKelompokNominal,
        },
        desa: {
          persen: amilDesaPersen,
          nominal: amilDesaNominal,
        },
        daerah: {
          persen: amilDaerahPersen,
          nominal: amilDaerahNominal,
        },
      },
    };
    zakat.updatedAt = new Date().toISOString();

    const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    showZakatLoader("Menyimpan rincian zakat...");
    const result = await apiUpdateZakatRincian({
      id: zakat.id,
      rincian: zakat.rincian,
    });

    if (result.success) {
      showToast("Rincian berhasil disimpan!", "success");
    } else {
      showToast("Rincian disimpan (offline mode)", "warning");
    }

    renderZakatRincianView(zakat);
    closeZakatRincianSheet();
    renderZakatList();
  } catch (err) {
    console.error("Save rincian error:", err);
    showToast("Gagal menyimpan rincian", "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

// ============================================================
// ZAKAT - EVENT LISTENERS (TAMBAHAN)
// ============================================================

// Tombol Edit Muzaki
document
  .getElementById("zakatMuzakiEdit")
  ?.addEventListener("click", function () {
    openZakatMuzakiSheet();
  });

// Tombol Edit Rincian
document
  .getElementById("zakatRincianEdit")
  ?.addEventListener("click", function () {
    openZakatRincianSheet();
  });

// Tombol Edit Mustahik
document
  .getElementById("zakatMustahikEdit")
  ?.addEventListener("click", function () {
    // Buka sheet mustahik (implementasi serupa)
    openZakatMustahikSheet();
  });

// ============================================================
// MUZAKI SHEET EVENT LISTENERS
// ============================================================

document
  .getElementById("zakatMuzakiSheetCancel")
  ?.addEventListener("click", function () {
    closeZakatMuzakiSheet();
  });

document
  .getElementById("zakatMuzakiSheetSubmit")
  ?.addEventListener("click", function () {
    submitZakatMuzakiSheet();
  });

document
  .getElementById("zakatMuzakiSheetCount")
  ?.addEventListener("change", function () {
    const zakat = getZakatById(state.zakat.currentId);
    if (zakat) {
      const newCount = parseInt(this.value) || 1;
      while (zakat.muzaki.length < newCount) {
        zakat.muzaki.push({
          id:
            "MZ" +
            Date.now().toString(36).toUpperCase() +
            Math.random().toString(36).substring(2, 5),
          nama: "",
          nominal: 0,
        });
      }
      if (zakat.muzaki.length > newCount) {
        zakat.muzaki = zakat.muzaki.slice(0, newCount);
      }
      renderMuzakiSheetRows(zakat);
      updateMuzakiSheetTotal(zakat);
    }
  });

// Close on overlay click
document
  .getElementById("zakatMuzakiSheet")
  ?.addEventListener("click", function (e) {
    if (e.target === this) {
      closeZakatMuzakiSheet();
    }
  });

// ============================================================
// RINCIAN SHEET EVENT LISTENERS
// ============================================================

document
  .getElementById("zakatRincianSheetCancel")
  ?.addEventListener("click", function () {
    closeZakatRincianSheet();
  });

document
  .getElementById("zakatRincianSheetSubmit")
  ?.addEventListener("click", function () {
    submitZakatRincianSheet();
  });

// Event listener untuk update real-time rincian sheet
const rincianSheetInputs = [
  "zakatPersenMustahikSheet",
  "zakatPersenMustahikKelompokSheet",
  "zakatPersenMustahikDaerahSheet",
  "zakatPersenSabilillahSheet",
  "zakatPersenAmilSheet",
  "zakatPersenAmilKelompokSheet",
  "zakatPersenAmilDesaSheet",
  "zakatPersenAmilDaerahSheet",
];

rincianSheetInputs.forEach((id) => {
  document.getElementById(id)?.addEventListener("input", function () {
    const zakat = getZakatById(state.zakat.currentId);
    if (zakat) {
      updateRincianSheet(zakat);
    }
  });
});

// Set Default buttons di sheet
document
  .querySelectorAll("#zakatRincianSheet .zakat-default-btn")
  .forEach((btn) => {
    btn.addEventListener("click", function () {
      const target = this.dataset.target;
      const defaults = {
        mustahik: {
          persen: 45,
          kelompok: { persen: 80 },
          daerah: { persen: 20 },
        },
        sabilillah: { persen: 40 },
        amil: {
          persen: 15,
          kelompok: { persen: 12 },
          desa: { persen: 2 },
          daerah: { persen: 1 },
        },
      };

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };

      if (target === "mustahik") {
        setVal("zakatPersenMustahikSheet", defaults.mustahik.persen);
        setVal(
          "zakatPersenMustahikKelompokSheet",
          defaults.mustahik.kelompok.persen,
        );
        setVal(
          "zakatPersenMustahikDaerahSheet",
          defaults.mustahik.daerah.persen,
        );
      } else if (target === "sabilillah") {
        setVal("zakatPersenSabilillahSheet", defaults.sabilillah.persen);
      } else if (target === "amil") {
        setVal("zakatPersenAmilSheet", defaults.amil.persen);
        setVal("zakatPersenAmilKelompokSheet", defaults.amil.kelompok.persen);
        setVal("zakatPersenAmilDesaSheet", defaults.amil.desa.persen);
        setVal("zakatPersenAmilDaerahSheet", defaults.amil.daerah.persen);
      }

      const zakat = getZakatById(state.zakat.currentId);
      if (zakat) {
        updateRincianSheet(zakat);
      }
      showToast("Default diterapkan!", "info");
    });
  });

// Close on overlay click
document
  .getElementById("zakatRincianSheet")
  ?.addEventListener("click", function (e) {
    if (e.target === this) {
      closeZakatRincianSheet();
    }
  });

// ============================================================
// ZAKAT DATE PICKER - STATE
// ============================================================

let zakatDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

let zakatEditDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

// ============================================================
// INIT ZAKAT DATE PICKER - PASTIKAN ELEMEN ADA
// ============================================================

function initZakatDatePicker() {
  console.log("🔄 initZakatDatePicker dipanggil");

  // ============================================================
  // FORM CREATE - ZAKAT DATE PICKER
  // ============================================================
  const dropdown = document.getElementById("zakatDateDropdown");
  const trigger = document.getElementById("zakatDateDropdownTrigger");
  const valueDisplay = document.getElementById("zakatDateDropdownValue");
  const menu = document.getElementById("zakatDateDropdownMenu");
  const hiddenInput = document.getElementById("zakatFormTanggal");

  // CEK ELEMEN DENGAN LEBIH DETAIL
  console.log("🔍 Zakat Date elements:", {
    dropdown: !!dropdown,
    trigger: !!trigger,
    valueDisplay: !!valueDisplay,
    menu: !!menu,
    hiddenInput: !!hiddenInput,
  });

  if (dropdown && trigger && valueDisplay && menu && hiddenInput) {
    console.log("✅ Zakat Date picker element ditemukan");

    // Set default date
    const today = new Date();
    valueDisplay.textContent = formatDateDisplay(today);
    hiddenInput.value = formatDateInput(today);
    zakatDatePickerState.selectedDate = today;
    zakatDatePickerState.currentMonth = today.getMonth();
    zakatDatePickerState.currentYear = today.getFullYear();

    // Render menu awal
    renderZakatDatePickerMenu(
      dropdown,
      menu,
      valueDisplay,
      hiddenInput,
      zakatDatePickerState,
    );

    // Hapus event listener lama untuk menghindari duplikasi
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    const newTriggerElement = document.getElementById(
      "zakatDateDropdownTrigger",
    );
    if (newTriggerElement) {
      newTriggerElement.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log("🔔 Zakat Date trigger clicked");
        const dd = document.getElementById("zakatDateDropdown");
        const isOpen = dd.classList.contains("open");

        // Tutup semua dropdown lain
        document
          .querySelectorAll(".filter-dropdown.open")
          .forEach(function (el) {
            if (el.id !== dd.id) {
              el.classList.remove("open");
              el.querySelector(".filter-dropdown-trigger")?.setAttribute(
                "aria-expanded",
                "false",
              );
            }
          });

        if (isOpen) {
          dd.classList.remove("open");
          this.setAttribute("aria-expanded", "false");
          removeZakatDatePickerBackdrop();
        } else {
          dd.classList.add("open");
          this.setAttribute("aria-expanded", "true");

          // Re-render menu
          const m = document.getElementById("zakatDateDropdownMenu");
          const vd = document.getElementById("zakatDateDropdownValue");
          const hi = document.getElementById("zakatFormTanggal");
          if (m) {
            renderZakatDatePickerMenu(dd, m, vd, hi, zakatDatePickerState);
          }

          setTimeout(function () {
            const manualInput = m?.querySelector(".date-picker-manual-input");
            if (manualInput) {
              manualInput.focus();
              manualInput.select();
            }
          }, 100);

          if (window.innerWidth <= 480) {
            addZakatDatePickerBackdrop(dd);
          }
        }
      });
    }

    // Close on outside click
    document.addEventListener("click", function (e) {
      const dd = document.getElementById("zakatDateDropdown");
      if (dd && !dd.contains(e.target)) {
        dd.classList.remove("open");
        const trig = document.getElementById("zakatDateDropdownTrigger");
        if (trig) trig.setAttribute("aria-expanded", "false");
        removeZakatDatePickerBackdrop();
      }
    });
  } else {
    console.warn("⚠️ Zakat Date picker element tidak ditemukan");
  }

  // ============================================================
  // FORM EDIT - ZAKAT EDIT DATE PICKER
  // ============================================================
  const editDropdown = document.getElementById("zakatEditDateDropdown");
  const editTrigger = document.getElementById("zakatEditDateDropdownTrigger");
  const editValueDisplay = document.getElementById(
    "zakatEditDateDropdownValue",
  );
  const editMenu = document.getElementById("zakatEditDateDropdownMenu");
  const editHiddenInput = document.getElementById("zakatEditHeaderTanggal");

  console.log("🔍 Zakat Edit Date elements:", {
    editDropdown: !!editDropdown,
    editTrigger: !!editTrigger,
    editValueDisplay: !!editValueDisplay,
    editMenu: !!editMenu,
    editHiddenInput: !!editHiddenInput,
  });

  if (
    editDropdown &&
    editTrigger &&
    editValueDisplay &&
    editMenu &&
    editHiddenInput
  ) {
    console.log("✅ Zakat Edit Date picker element ditemukan");

    const today = new Date();
    editValueDisplay.textContent = formatDateDisplay(today);
    editHiddenInput.value = formatDateInput(today);
    zakatEditDatePickerState.selectedDate = today;
    zakatEditDatePickerState.currentMonth = today.getMonth();
    zakatEditDatePickerState.currentYear = today.getFullYear();

    renderZakatDatePickerMenu(
      editDropdown,
      editMenu,
      editValueDisplay,
      editHiddenInput,
      zakatEditDatePickerState,
    );

    // Clone trigger untuk menghindari duplikasi event
    const newEditTrigger = editTrigger.cloneNode(true);
    editTrigger.parentNode.replaceChild(newEditTrigger, editTrigger);

    const newEditTriggerElement = document.getElementById(
      "zakatEditDateDropdownTrigger",
    );
    if (newEditTriggerElement) {
      newEditTriggerElement.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log("🔔 Zakat Edit Date trigger clicked");
        const dd = document.getElementById("zakatEditDateDropdown");
        const isOpen = dd.classList.contains("open");

        document
          .querySelectorAll(".filter-dropdown.open")
          .forEach(function (el) {
            if (el.id !== dd.id) {
              el.classList.remove("open");
              el.querySelector(".filter-dropdown-trigger")?.setAttribute(
                "aria-expanded",
                "false",
              );
            }
          });

        if (isOpen) {
          dd.classList.remove("open");
          this.setAttribute("aria-expanded", "false");
          removeZakatDatePickerBackdrop();
        } else {
          dd.classList.add("open");
          this.setAttribute("aria-expanded", "true");

          const m = document.getElementById("zakatEditDateDropdownMenu");
          const vd = document.getElementById("zakatEditDateDropdownValue");
          const hi = document.getElementById("zakatEditHeaderTanggal");
          if (m) {
            renderZakatDatePickerMenu(dd, m, vd, hi, zakatEditDatePickerState);
          }

          setTimeout(function () {
            const manualInput = m?.querySelector(".date-picker-manual-input");
            if (manualInput) {
              manualInput.focus();
              manualInput.select();
            }
          }, 100);

          if (window.innerWidth <= 480) {
            addZakatDatePickerBackdrop(dd);
          }
        }
      });
    }

    document.addEventListener("click", function (e) {
      const dd = document.getElementById("zakatEditDateDropdown");
      if (dd && !dd.contains(e.target)) {
        dd.classList.remove("open");
        const trig = document.getElementById("zakatEditDateDropdownTrigger");
        if (trig) trig.setAttribute("aria-expanded", "false");
        removeZakatDatePickerBackdrop();
      }
    });
  } else {
    console.warn("⚠️ Zakat Edit Date picker element tidak ditemukan");
  }
}

// ============================================================
// TOGGLE HANDLERS
// ============================================================

function zakatDateToggleHandler(e) {
  e.stopPropagation();
  const dropdown = this._dropdown;
  const menu = this._menu;
  const valueDisplay = this._valueDisplay;
  const hiddenInput = this._hiddenInput;
  const state = this._state;

  if (!dropdown) return;

  const isOpen = dropdown.classList.contains("open");

  // Tutup semua dropdown lain
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
    this.setAttribute("aria-expanded", "false");
    removeZakatDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    this.setAttribute("aria-expanded", "true");

    // Re-render menu
    if (menu) {
      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        state,
      );
    }

    setTimeout(function () {
      const manualInput = menu?.querySelector(".date-picker-manual-input");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 100);

    if (window.innerWidth <= 480) {
      addZakatDatePickerBackdrop(dropdown);
    }
  }
}

function zakatEditDateToggleHandler(e) {
  e.stopPropagation();
  const dropdown = this._dropdown;
  const menu = this._menu;
  const valueDisplay = this._valueDisplay;
  const hiddenInput = this._hiddenInput;
  const state = this._state;

  if (!dropdown) return;

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
    this.setAttribute("aria-expanded", "false");
    removeZakatDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    this.setAttribute("aria-expanded", "true");

    if (menu) {
      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        state,
      );
    }

    setTimeout(function () {
      const manualInput = menu?.querySelector(".date-picker-manual-input");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 100);

    if (window.innerWidth <= 480) {
      addZakatDatePickerBackdrop(dropdown);
    }
  }
}

// ============================================================
// CLOSE ZAKAT DATE PICKER
// ============================================================

function closeZakatDatePicker(dropdown) {
  if (!dropdown) return;
  dropdown.classList.remove("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }
  removeZakatDatePickerBackdrop();
}

// ============================================================
// BACKDROP
// ============================================================

function addZakatDatePickerBackdrop(dropdown) {
  removeZakatDatePickerBackdrop();
  const backdrop = document.createElement("div");
  backdrop.id = "zakatDatePickerBackdrop";
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 150;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(2px);
    animation: fadeIn 0.2s ease;
  `;
  backdrop.addEventListener("click", function () {
    closeZakatDatePicker(dropdown);
  });
  document.body.appendChild(backdrop);
}

function removeZakatDatePickerBackdrop() {
  const backdrop = document.getElementById("zakatDatePickerBackdrop");
  if (backdrop) backdrop.remove();
}

// ============================================================
// RENDER ZAKAT DATE PICKER MENU
// ============================================================

function renderZakatDatePickerMenu(
  dropdown,
  menu,
  valueDisplay,
  hiddenInput,
  state,
) {
  if (!menu || !dropdown) {
    console.warn("⚠️ renderZakatDatePickerMenu: menu atau dropdown null");
    return;
  }

  const pickerState = state || zakatDatePickerState;
  const year = pickerState.currentYear;
  const month = pickerState.currentMonth;

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
      pickerState.selectedDate &&
      pickerState.selectedDate.getDate() === i &&
      pickerState.selectedDate.getMonth() === month &&
      pickerState.selectedDate.getFullYear() === year;

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

  const currentDate = pickerState.selectedDate;
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
        class="date-picker-manual-input"
        placeholder="dd-mm-yyyy"
        value="${currentDateStr}"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="button" class="date-picker-apply">
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

  // ============================================================
  // EVENT LISTENERS - PASTIKAN MENGGUNAKAN addEventListener
  // ============================================================

  const manualInput = menu.querySelector(".date-picker-manual-input");
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
        applyZakatManualDate(
          this.value,
          dropdown,
          valueDisplay,
          hiddenInput,
          pickerState,
        );
      }
      if (e.key === "Escape") {
        closeZakatDatePicker(dropdown);
      }
    });
  }

  const applyBtn = menu.querySelector(".date-picker-apply");
  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const input = this.closest(".date-picker-input-wrap").querySelector(
        ".date-picker-manual-input",
      );
      if (input) {
        applyZakatManualDate(
          input.value,
          dropdown,
          valueDisplay,
          hiddenInput,
          pickerState,
        );
      }
    });
  }

  menu.querySelectorAll(".date-picker-nav").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const direction = this.dataset.direction;
      if (direction === "prev") {
        pickerState.currentMonth--;
        if (pickerState.currentMonth < 0) {
          pickerState.currentMonth = 11;
          pickerState.currentYear--;
        }
      } else {
        pickerState.currentMonth++;
        if (pickerState.currentMonth > 11) {
          pickerState.currentMonth = 0;
          pickerState.currentYear++;
        }
      }
      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        pickerState,
      );
    });
  });

  menu.querySelectorAll(".date-picker-day").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const day = parseInt(this.dataset.day);
      const month = parseInt(this.dataset.month);
      const year = parseInt(this.dataset.year);
      const date = new Date(year, month, day);
      selectZakatDate(date, dropdown, valueDisplay, hiddenInput, pickerState);
    });
  });

  const todayBtn = menu.querySelector(".date-picker-today");
  if (todayBtn) {
    todayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const today = new Date();
      selectZakatDate(today, dropdown, valueDisplay, hiddenInput, pickerState);
    });
  }

  const clearBtn = menu.querySelector(".date-picker-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      clearZakatDate(dropdown, valueDisplay, hiddenInput, pickerState);
    });
  }

  setTimeout(function () {
    const rect = dropdown.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Jika menu terpotong di bagian bawah, pindahkan ke atas
    if (menuRect.bottom > viewportHeight - 20) {
      menu.style.top = "auto";
      menu.style.bottom = "calc(100% + 8px)";
      menu.style.maxHeight =
        Math.min(280, viewportHeight - rect.top - 40) + "px";
    }

    // Jika menu terpotong di bagian atas, pindahkan ke bawah
    if (menuRect.top < 20) {
      menu.style.top = "calc(100% + 8px)";
      menu.style.bottom = "auto";
      menu.style.maxHeight =
        Math.min(280, viewportHeight - rect.bottom - 40) + "px";
    }
  }, 50);
}

function toggleZakatDatePicker(dropdown) {
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
    removeZakatDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");

    const menu = dropdown.querySelector(".filter-dropdown-menu");
    const valueDisplay = dropdown.parentElement?.querySelector(
      ".filter-dropdown-value",
    );
    const hiddenInput = dropdown.parentElement?.querySelector(
      'input[type="hidden"]',
    );

    if (menu) {
      const state =
        dropdown.id === "zakatDateDropdown"
          ? zakatDatePickerState
          : zakatEditDatePickerState;
      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        state,
      );
    }

    // ✅ TAMBAHKAN INI
    adjustDatePickerPosition(dropdown);

    setTimeout(function () {
      const manualInput = dropdown.querySelector(".date-picker-manual-input");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 150);

    if (window.innerWidth <= 480) {
      addZakatDatePickerBackdrop(dropdown);
    }
  }
}

// ============================================================
// SELECT ZAKAT DATE
// ============================================================

function selectZakatDate(date, dropdown, valueDisplay, hiddenInput, state) {
  if (!date || isNaN(date.getTime())) return;

  state.selectedDate = date;
  state.currentMonth = date.getMonth();
  state.currentYear = date.getFullYear();

  if (valueDisplay) {
    valueDisplay.textContent = formatDateDisplay(date);
  }

  if (hiddenInput) {
    hiddenInput.value = formatDateInput(date);
  }

  closeZakatDatePicker(dropdown);

  if (hiddenInput) {
    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
    hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// ============================================================
// APPLY ZAKAT MANUAL DATE
// ============================================================

function applyZakatManualDate(
  dateStr,
  dropdown,
  valueDisplay,
  hiddenInput,
  state,
) {
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
  selectZakatDate(date, dropdown, valueDisplay, hiddenInput, state);
}

function adjustDatePickerPosition(dropdown) {
  const menu = dropdown.querySelector(".filter-dropdown-menu");
  if (!menu) return;

  // Tunggu sebentar agar menu sudah visible
  setTimeout(function () {
    const rect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownRect = dropdown.getBoundingClientRect();

    // Reset dulu
    menu.style.top = "";
    menu.style.bottom = "";
    menu.style.maxHeight = "";

    // Cek apakah menu terpotong di bagian bawah
    if (rect.bottom > viewportHeight - 10) {
      // Jika terpotong, munculkan di ATAS trigger
      menu.style.top = "auto";
      menu.style.bottom = "calc(100% + 4px)";
      menu.style.maxHeight = Math.min(320, dropdownRect.top - 20) + "px";
    } else {
      // Normal: di bawah trigger
      menu.style.top = "calc(100% + 4px)";
      menu.style.bottom = "auto";
      // Sesuaikan max-height dengan ruang tersisa
      const availableHeight = viewportHeight - rect.top - 20;
      if (availableHeight < 200) {
        menu.style.maxHeight = Math.min(320, availableHeight) + "px";
      }
    }
  }, 50);
}

// ============================================================
// CLEAR ZAKAT DATE
// ============================================================

function clearZakatDate(dropdown, valueDisplay, hiddenInput, state) {
  if (valueDisplay) valueDisplay.textContent = "Pilih tanggal";
  if (hiddenInput) hiddenInput.value = "";
  state.selectedDate = null;
  closeZakatDatePicker(dropdown);
}

function truncateNameToThreeWords(name) {
  if (!name) return "";

  // Split nama menjadi array kata
  const words = name.trim().split(/\s+/);

  // Ambil 3 kata pertama
  const firstThree = words.slice(0, 3);

  // Gabungkan kembali
  return firstThree.join(" ");
}
// ============================================================
// ZAKAT - UPDATE LAST SYNC (Tambahan)
// ============================================================

// Modifikasi refreshAllDataWithShodaqoh untuk include zakat
// Cari fungsi refreshAllDataWithShodaqoh dan tambahkan:

// async function refreshAllDataWithShodaqoh() {
//   try {
//     await refreshAllData();
//     if (state.shodaqoh.loaded || state.activeTab === "shodaqoh") {
//       const monthKey = state.shodaqoh.selectedMonth || "";
//       await loadShodaqohData(monthKey);
//     }
//     // TAMBAHKAN INI:
//     await loadZakatData();
//     updateLastSyncTime();
//   } catch (err) {
//     console.error(err);
//     showToast("Gagal refresh data: " + err.message, "error");
//   }
// }
