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
