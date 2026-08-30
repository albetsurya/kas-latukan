const CONFIG = {
  WEB_APP_URL:
    "https://script.google.com/macros/s/AKfycbwqCvr9HQvij6g1q3r0tlxfCu3Slb8xhTCdIZ80jYNXdJIVTOtHHSwmEauU3CLt-yd2/exec",
};

let state = {
  kasType: "main",
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
    filters: { year: "", month: "", status: "ALL" },
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
const KAS_TYPE_KEY = "kas_type";

function saveKasType(kasType) {
  try {
    localStorage.setItem(KAS_TYPE_KEY, kasType);
  } catch (e) {}
}

function getSavedKasType() {
  try {
    return localStorage.getItem(KAS_TYPE_KEY) || "main";
  } catch (e) {
    return "main";
  }
}

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

async function apiPost(payload) {
  const session = getSession();
  if (session && !payload.token) {
    payload.token = session.token;
  }

  if (!payload.kasType) {
    payload.kasType = state.kasType || "main";
  }

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

async function apiGet() {
  const kasType = state.kasType || "main";
  const url = `${CONFIG.WEB_APP_URL}?action=getData&kasType=${kasType}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");
  return res.json();
}

async function apiGetShodaqoh(monthKey) {
  const url =
    `${CONFIG.WEB_APP_URL}?action=getShodaqohData` +
    (monthKey ? `&month=${encodeURIComponent(monthKey)}` : "");

  const res = await fetch(url);
  if (!res.ok) throw new Error("Gagal mengambil data (" + res.status + ")");

  const data = await res.json();

  return data;
}

function switchKasType(kasType) {
  if (state.kasType === kasType) return;

  state.kasType = kasType;
  saveKasType(kasType);

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

  updateKasTypeUI(kasType);

  if (getSession()) {
    loadData();
  }
}

function updateKasTypeUI(kasType) {
  const triggerValue = document.getElementById("kasTypeDropdownValue");
  const options = document.querySelectorAll(".kas-type-dropdown-option");
  const trigger = document.getElementById("kasTypeDropdownTrigger");

  const labels = {
    main: "Kas Utama",
    kas_amil: "Kas Amil",
  };

  const icons = {
    main: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M8 10h8" />
      <circle cx="16" cy="12" r="1" />
    </svg>`,
    kas_amil: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M20 7h-4.5A2.5 2.5 0 0 0 13 9.5v5a2.5 2.5 0 0 0 2.5 2.5H20" />
      <path d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
      <circle cx="17" cy="12" r="1" />
    </svg>`,
  };

  if (triggerValue) {
    triggerValue.innerHTML = `
      ${icons[kasType]}
      <span>${labels[kasType]}</span>
    `;
  }

  options.forEach((btn) => {
    const isActive = btn.dataset.kasType === kasType;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }

  const dropdownMenu = document.getElementById("kasTypeDropdownMenu");
  if (dropdownMenu) {
    dropdownMenu.classList.remove("open");
  }

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
}

function toggleKasTypeDropdown() {
  const menu = document.getElementById("kasTypeDropdownMenu");
  const trigger = document.getElementById("kasTypeDropdownTrigger");
  if (!menu || !trigger) return;

  const isOpen = menu.classList.contains("open");
  menu.classList.toggle("open", !isOpen);
  trigger.setAttribute("aria-expanded", String(!isOpen));
}

function closeKasTypeDropdown() {
  const menu = document.getElementById("kasTypeDropdownMenu");
  const trigger = document.getElementById("kasTypeDropdownTrigger");
  if (menu) menu.classList.remove("open");
  if (trigger) trigger.setAttribute("aria-expanded", "false");
}

function restoreKasType() {
  const saved = getSavedKasType();
  if (saved === "main" || saved === "kas_amil") {
    state.kasType = saved;
    updateKasTypeUI(saved);
  }
}

async function handleLogin(username, password) {
  const result = await apiPost({
    action: "login",
    username: username,
    password: password,
    kasType: state.kasType || "main",
  });

  if (result.success) {
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    saveSession(
      result.data.token,
      result.data.nama,
      result.data.role,
      expiresAt,
    );
    state.isAdmin = result.data.role === "admin";
    state.adminName = result.data.nama;
    showToastWithIcon("Login berhasil!", "success");
    await loadData();
  } else {
    showToastWithIcon(result.message || "Login gagal", "error");
  }

  return result;
}

async function logout() {
  const result = await apiPost({
    action: "logout",
    token: getSession()?.token,
    kasType: state.kasType || "main",
  });

  clearSession();
  state.isAdmin = false;
  state.adminName = "";
  state.transactions = [];
  state.saldoAwal = 0;
  state.totalDebet = 0;
  state.totalKredit = 0;
  state.saldoAkhir = 0;

  showLoginForm();
  showToastWithIcon("Logout berhasil", "info");
  return result;
}

async function addTransaction(data) {
  const result = await apiPost({
    action: "addTransaction",
    ...data,
  });
  if (result.success) {
    showToastWithIcon(
      result.message || "Transaksi berhasil ditambahkan",
      "success",
    );
    await loadData();
  } else {
    showToastWithIcon(result.message || "Gagal menambahkan transaksi", "error");
  }
  return result;
}

async function editTransaction(data) {
  const result = await apiPost({
    action: "editTransaction",
    ...data,
  });
  if (result.success) {
    showToastWithIcon(
      result.message || "Transaksi berhasil diupdate",
      "success",
    );
    await loadData();
  } else {
    showToastWithIcon(result.message || "Gagal mengupdate transaksi", "error");
  }
  return result;
}

async function duplicateTransaction(data) {
  const result = await apiPost({
    action: "duplicateTransaction",
    ...data,
  });
  if (result.success) {
    showToastWithIcon(
      result.message || "Transaksi berhasil diduplikasi",
      "success",
    );
    await loadData();
  } else {
    showToastWithIcon(
      result.message || "Gagal menduplikasi transaksi",
      "error",
    );
  }
  return result;
}

async function deleteTransaction(data) {
  if (!confirm("Yakin ingin menghapus transaksi ini?")) return;

  const result = await apiPost({
    action: "deleteTransaction",
    ...data,
  });
  if (result.success) {
    showToastWithIcon(
      result.message || "Transaksi berhasil dihapus",
      "success",
    );
    await loadData();
  } else {
    showToastWithIcon(result.message || "Gagal menghapus transaksi", "error");
  }
  return result;
}

async function carryForwardSaldo(data) {
  const result = await apiPost({
    action: "carryForwardSaldo",
    ...data,
  });
  if (result.success) {
    showToastWithIcon(
      result.message || "Saldo berhasil dibawa ke bulan berikutnya",
      "success",
    );
    await loadData();
  } else if (result.alreadyExists) {
    showToastWithIcon(result.message, "warning");
  } else {
    showToastWithIcon(result.message || "Gagal membawa saldo", "error");
  }
  return result;
}

function renderDashboard() {
  const elSaldoAwal = $("homeSaldoAwal");
  const elTotalDebet = $("homeTotalDebet");
  const elTotalKredit = $("homeTotalKredit");
  const elSaldoAkhir = $("homeSaldoAkhir");
  const elPeriode = $("homePeriode");
  const elLabelSaldoAwal = $("homeLabelSaldoAwal");

  if (elSaldoAwal) elSaldoAwal.textContent = fmtRp(state.saldoAwal);
  if (elTotalDebet) elTotalDebet.textContent = fmtRp(state.totalDebet);
  if (elTotalKredit) elTotalKredit.textContent = fmtRp(state.totalKredit);
  if (elSaldoAkhir) elSaldoAkhir.textContent = fmtRp(state.saldoAkhir);
  if (elPeriode) elPeriode.textContent = getPeriodRangeLabel();

  if (elLabelSaldoAwal) {
    const filterType = state.selectedMonth === "all" ? "yearly" : "monthly";
    elLabelSaldoAwal.textContent =
      filterType === "monthly"
        ? "Saldo Awal (Awal Bulan)"
        : "Saldo Awal (Awal Tahun)";
  }
}

function renderTable() {
  const tbody = $("tableBody");
  if (!tbody) return;

  let filtered = [...state.transactions];

  if (state.selectedMonth !== "all") {
    filtered = filtered.filter((t) => {
      const key = getMonthKey(t.tanggal);
      return key === state.selectedMonth;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--muted);">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;margin:0 auto 8px;">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <path d="M8 2v4M16 2v4M2 10h20"/>
      </svg>
      Belum ada transaksi
    </td></tr>`;
    return;
  }

  let rows = "";
  filtered.forEach((t) => {
    const isSaldoAwal = (t.account || "").trim().toUpperCase() === "SALDO AWAL";
    const rowClass = isSaldoAwal ? "saldo-awal-row" : "";
    const no = t.no || "-";
    const tanggal = fmtDateShort(t.tanggal);
    const account = escapeHtml(t.account || "-");
    const keterangan = escapeHtml(t.keterangan || "-");
    const debet = t.debet > 0 ? fmtRp(t.debet) : "-";
    const kredit = t.kredit > 0 ? fmtRp(t.kredit) : "-";
    const saldo = fmtRp(t.saldo);
    const createdBy = escapeHtml(t.createdBy || "-");

    rows += `<tr class="${rowClass}">
      <td>${no}</td>
      <td>${tanggal}</td>
      <td>${account}</td>
      <td>${keterangan}</td>
      <td>${debet}</td>
      <td>${kredit}</td>
      <td>${saldo}</td>
      <td>${createdBy}</td>
    </tr>`;
  });

  tbody.innerHTML = rows;
}

function renderChart() {
  // Implementasi chart rendering
}

function renderMonthFilter() {
  const container = $("monthFilter");
  if (!container) return;

  const months = [
    ...new Set(state.transactions.map((t) => getMonthKey(t.tanggal))),
  ]
    .filter(Boolean)
    .sort();

  if (months.length === 0) {
    container.innerHTML = `<button class="chip active" data-month="all">Semua</button>`;
    return;
  }

  let html = `<button class="chip ${state.selectedMonth === "all" ? "active" : ""}" data-month="all">Semua</button>`;
  months.forEach((m) => {
    const active = m === state.selectedMonth ? "active" : "";
    const label = getMonthChipLabel(m);
    html += `<button class="chip ${active}" data-month="${m}">${label}</button>`;
  });

  container.innerHTML = html;

  container.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", function () {
      const month = this.dataset.month;
      state.selectedMonth = month;
      renderMonthFilter();
      renderTable();
      renderDashboard();
      renderChart();
    });
  });
}

function showLoginForm() {
  const loginForm = document.getElementById("authScreen");
  const shell = document.getElementById("shell");
  if (loginForm) loginForm.classList.remove("hidden");
  if (shell) shell.classList.add("hidden");
  document.documentElement.classList.add("auth-locked");
  document.documentElement.classList.remove("authenticated");
}

function hideLoginForm() {
  const loginForm = document.getElementById("authScreen");
  const shell = document.getElementById("shell");
  if (loginForm) loginForm.classList.add("hidden");
  if (shell) shell.classList.remove("hidden");
  document.documentElement.classList.remove("auth-locked");
  document.documentElement.classList.add("authenticated");
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

  const btnTheme = document.getElementById("btnTheme");
  if (btnTheme) {
    btnTheme.innerHTML = mode === "dark" ? ICON_SUN : ICON_MOON;
  }

  const themeLightBtn = document.getElementById("themeLightBtn");
  const themeDarkBtn = document.getElementById("themeDarkBtn");

  if (themeLightBtn) {
    themeLightBtn.classList.toggle("active", mode === "light");
  }
  if (themeDarkBtn) {
    themeDarkBtn.classList.toggle("active", mode === "dark");
  }

  if (state.chart) {
    renderChart();
  }
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem("kas_theme");
  } catch (e) {}

  if (!saved) {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    saved = prefersDark ? "dark" : "light";
  }

  applyTheme(saved);
}

window.applyTheme = applyTheme;
window.initTheme = initTheme;

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}

let toastTimer;

function showToast(msg, type = "success") {
  const el = $("toast");
  if (!el) return;

  el.innerHTML = msg;
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.flexWrap = "wrap";
  el.style.textAlign = "center";
  el.style.gap = "4px";
  el.style.background =
    type === "error"
      ? "var(--neg)"
      : type === "warning"
        ? "var(--gold)"
        : "var(--brand-dark)";

  el.classList.remove("hidden");
  clearTimeout(toastTimer);

  toastTimer = setTimeout(function () {
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

document.addEventListener("DOMContentLoaded", function () {
  initTheme();

  restoreKasType();

  const trigger = document.getElementById("kasTypeDropdownTrigger");
  if (trigger) {
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleKasTypeDropdown();
    });
  }

  document.querySelectorAll(".kas-type-dropdown-option").forEach((btn) => {
    btn.addEventListener("click", function () {
      const kasType = this.dataset.kasType;
      closeKasTypeDropdown();
      switchKasType(kasType);
    });
  });

  document.addEventListener("click", function () {
    closeKasTypeDropdown();
  });

  const authForm = document.getElementById("authForm");
  if (authForm) {
    authForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const username = document.getElementById("authUsername").value;
      const password = document.getElementById("authPassword").value;
      handleLogin(username, password);
    });
  }

  const session = getSession();
  if (session) {
    state.isAdmin = session.role === "admin";
    state.adminName = session.nama;
    hideLoginForm();
    loadData();
  } else {
    showLoginForm();
  }
});

window.switchKasType = switchKasType;
window.handleLogin = handleLogin;
window.logout = logout;
window.loadData = loadData;
window.addTransaction = addTransaction;
window.editTransaction = editTransaction;
window.duplicateTransaction = duplicateTransaction;
window.deleteTransaction = deleteTransaction;
window.carryForwardSaldo = carryForwardSaldo;
window.fmtRp = fmtRp;
window.isAdminUser = isAdminUser;
window.showToast = showToast;
window.showToastWithIcon = showToastWithIcon;
window.toggleKasTypeDropdown = toggleKasTypeDropdown;
window.closeKasTypeDropdown = closeKasTypeDropdown;
window.restoreKasType = restoreKasType;
