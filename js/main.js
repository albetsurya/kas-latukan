// main.js

/* =========================================================================
   KONFIGURASI — GANTI URL INI DENGAN URL WEB APP APPS SCRIPT ANDA
   Contoh: https://script.google.com/macros/s/AKfycb.../exec
   ========================================================================= */
const CONFIG = {
  WEB_APP_URL:
    "https://script.google.com/macros/s/AKfycbwqCvr9HQvij6g1q3r0tlxfCu3Slb8xhTCdIZ80jYNXdJIVTOtHHSwmEauU3CLt-yd2/exec",
  POLL_INTERVAL_MS: 20000,
};

// ---------- STATE ----------
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

// ---------- FORMAT HELPERS ----------
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

// ---------- SESSION ----------
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

// ---------- THEME ----------
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

// ---------- TOAST ----------
let toastTimer;

function showToast(msg, type = "success") {
  const el = $("toast");
  if (!el) return;

  el.textContent = msg;
  el.style.background = type === "error" ? "var(--neg)" : "var(--brand-dark)";

  el.classList.remove("hidden");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => el.classList.add("hidden"), 3200);
}

// ---------- API ----------
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

// ---------- LOAD DATA ----------
async function loadData() {
  try {
    if (CONFIG.WEB_APP_URL.includes("GANTI_DENGAN")) {
      if ($("configWarning")) $("configWarning").classList.remove("hidden");

      renderTxList([], "txList", "txEmpty");
      return;
    }

    const data = await apiGet();

    if (!data.success) throw new Error(data.message || "Gagal memuat data");

    state.saldoAwal = data.saldoAwal;
    state.totalDebet = data.totalDebet;
    state.totalKredit = data.totalKredit;
    state.saldoAkhir = data.saldoAkhir;
    state.transactions = data.transactions || [];

    renderAllMonthChipRows();
    renderRecapList();
    refreshScopedUI();

    if ($("lastSync")) {
      $("lastSync").textContent =
        "tersinkron " + new Date().toLocaleTimeString("id-ID");
    }

    if ($("configWarning")) $("configWarning").classList.add("hidden");
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat data: " + err.message, "error");
  }
}

// ---------- BULAN / DROPDOWN PERIODE ----------
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

// ---------- REKAP ----------
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
                    class="btn-carry-forward w-full flex items-center justify-center gap-2"
                    data-month="${m}"
                    data-next-month="${nextMonthKey}"
                  >

                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>

                    <span>
                      Jadikan Saldo Awal
                      ${getMonthLabel(nextMonthKey)}
                    </span>

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

// ---------- CARRY FORWARD ----------
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

// ---------- HOME ----------
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

  if ($("chartScopeLabel"))
    $("chartScopeLabel").textContent = labels.length + " bulan tercatat";

  const dark = currentTheme() === "dark";

  const lineColor = dark ? "#1fd8a4" : "#0e9f6e";

  const fillColor = dark ? "rgba(31,216,164,0.14)" : "rgba(14,159,110,0.10)";

  const tickColor = dark ? "#8b94a3" : "#626c7a";

  if (state.chart) state.chart.destroy();

  state.chart = new Chart(ctx, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Saldo Akhir Bulan",

          data,

          borderColor: lineColor,

          backgroundColor: fillColor,

          fill: true,

          tension: 0.35,

          pointRadius: 2.5,

          pointHoverRadius: 5,

          pointBackgroundColor: lineColor,

          borderWidth: 2,
        },
      ],
    },

    options: {
      responsive: true,

      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false,
        },

        tooltip: {
          callbacks: {
            label: (c) => fmtRp(c.parsed.y),
          },
        },
      },

      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            font: {
              size: 9,
            },
            color: tickColor,
          },

          grid: {
            display: false,
          },
        },

        y: {
          display: false,
        },
      },
    },
  });
}

// ---------- RIWAYAT ----------
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

function buildPrintTable(rows) {
  if (!$("printTableBody")) return;

  $("printTableBody").innerHTML = rows
    .map(
      (t, idx) =>
        `
  <tr>
    <td>${idx + 1}</td>
    <td>${t.tanggal}</td>
    <td>${escapeHtml(t.account)}</td>
    <td>${escapeHtml(t.keterangan)}</td>
    <td class="num">
      ${t.debet ? fmtRp(t.debet) : "-"}
    </td>
    <td class="num">
      ${t.kredit ? fmtRp(t.kredit) : "-"}
    </td>
    <td class="num">
      ${fmtRp(t.saldo)}
    </td>
  </tr>`,
    )
    .join("");
}

function fitPrintToOnePage() {
  const area = $("printArea");

  if (!area) return;

  const prevDisplay = area.style.display;

  const prevPosition = area.style.position;

  const prevLeft = area.style.left;

  const prevTop = area.style.top;

  const prevWidth = area.style.width;

  const prevTransform = area.style.transform;

  document.documentElement.style.setProperty("--print-scale", "1");

  area.style.transform = "none";

  area.style.display = "block";

  area.style.position = "fixed";

  area.style.left = "-9999px";

  area.style.top = "0";

  area.style.width = "186mm";

  const mmToPx = 96 / 25.4;

  const availableHeightPx = (297 - 24) * mmToPx;

  const contentHeightPx = area.scrollHeight;

  let scale = 1;

  if (contentHeightPx > availableHeightPx) {
    scale = Math.max(0.35, availableHeightPx / contentHeightPx);
  }

  document.documentElement.style.setProperty("--print-scale", scale);

  area.style.display = prevDisplay;

  area.style.position = prevPosition;

  area.style.left = prevLeft;

  area.style.top = prevTop;

  area.style.width = prevWidth;

  area.style.transform = prevTransform;
}

// ---------- FILTER / SEARCH ----------
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

// ---------- TABS ----------
const TAB_TITLES = {
  home: "Beranda",
  history: "Riwayat",
  recap: "Rekap Bulanan",
  profile: "Profil",
  shodaqoh: "Shodaqoh IR",
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

  if (tab === "shodaqoh" && !state.shodaqoh.loaded) {
    loadShodaqohData();
  }
}

function updateFabVisibility() {
  const fab = $("fabAdd");

  if (!fab) return;

  const isAdmin = state.isAdmin === true || state.isAdmin === "true";

  const isAllowedTab =
    state.activeTab === "home" ||
    state.activeTab === "history" ||
    state.activeTab === "shodaqoh";

  const shouldShow = isAdmin && isAllowedTab;

  fab.classList.toggle("hidden", !shouldShow);
}

// ---------- AUTH UI ----------
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
  document.documentElement.classList.add("authenticated");

  document.documentElement.classList.remove("auth-locked");

  if ($("authScreen")) $("authScreen").classList.add("hidden");

  if ($("shell")) $("shell").classList.remove("hidden");

  switchTab("home");

  loadData();

  setInterval(() => loadData(), CONFIG.POLL_INTERVAL_MS);
}

// ---------- TRANSAKSI ----------
function setTxJenis(jenis) {
  state.txJenis = jenis;

  if ($("segDebet"))
    $("segDebet").classList.toggle("active-debet", jenis === "debet");

  if ($("segKredit"))
    $("segKredit").classList.toggle("active-kredit", jenis === "kredit");
}

// =========================================================================
// SHODAQOH IR — FRONTEND SEDERHANA
// =========================================================================

const SHOD_STATUS_LABELS = {
  ALL: "Semua",
  LUNAS: "Lunas",
  BELUM: "Belum",
};

async function loadShodaqohData(monthKey) {
  try {
    const month = monthKey || state.shodaqoh.selectedMonth || "";
    const data = await apiGetShodaqoh(month);
    if (!data.success) throw new Error(data.message || "Gagal memuat data");

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

    renderShodaqohScreen();
  } catch (err) {
    console.error(err);
    showToast("Gagal memuat Shodaqoh IR: " + err.message, "error");
  }
}

function renderShodaqohScreen() {
  renderShodaqohDashboard();
  renderShodaqohFilters();
  renderShodaqohMonitoring();
  renderShodaqohMembers();
  renderPaymentHistory();
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
}

function renderShodaqohFilters() {
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

  const yearSel = $("shodFilterYear");
  const monthSel = $("shodFilterMonth");
  const memberSel = $("shodFilterMember");
  const statusSel = $("shodFilterStatus");

  if (yearSel) {
    yearSel.innerHTML = years
      .map((y) => `<option value="${y}">${y}</option>`)
      .join("");
    yearSel.value = state.shodaqoh.filters.year;
  }
  if (monthSel) monthSel.value = state.shodaqoh.filters.month;
  if (memberSel) {
    memberSel.innerHTML =
      '<option value="">Semua anggota</option>' +
      state.shodaqoh.members
        .map(
          (m) =>
            `<option value="${escapeHtml(m.member_id)}">${escapeHtml(
              m.nama,
            )}</option>`,
        )
        .join("");
    memberSel.value = state.shodaqoh.filters.memberId || "";
  }
  if (statusSel) statusSel.value = state.shodaqoh.filters.status || "ALL";
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

  // Update count
  const countEl = $("shodMemberCount");
  if (countEl) countEl.textContent = rows.length + " anggota";

  if (rows.length === 0) {
    body.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-xs text-[color:var(--ink-faint)]">
      Tidak ada data sesuai filter.
    </td></tr>`;
    return;
  }

  body.innerHTML = rows
    .map(function (r) {
      return `<tr class="border-t border-[color:var(--line)]">
        <td class="py-3 pr-3 font-semibold">${escapeHtml(r.nama)}</td>
        <td class="py-3 mono">${fmtRp(r.target)}</td>
        <td class="py-3">
          <span class="status-pill ${r.status === "LUNAS" ? "status-positive" : "status-negative"}">
            ${r.status}
          </span>
        </td>
        <td class="py-3 mono text-xs">
          ${r.payment_id ? escapeHtml(r.payment_id) : "—"}
        </td>
        <td class="py-3 text-xs">
          ${r.allocated_at || "—"}
        </td>
      </tr>`;
    })
    .join("");
}

function renderShodaqohMembers() {
  const body = $("shodMembersList");
  if (!body) return;
  body.innerHTML =
    (state.shodaqoh.members || [])
      .map(
        (m) =>
          `<button type="button" class="tx-card w-full text-left" data-shod-member="${escapeHtml(
            m.member_id,
          )}">
            <div class="flex-1">
              <p class="tx-title">${escapeHtml(m.nama)}</p>
              <p class="tx-meta">Nominal bulanan ${fmtRp(
                m.nominal_bulanan,
              )} · ${escapeHtml(m.status)}</p>
            </div>
            <span class="tx-chevron">›</span>
          </button>`,
      )
      .join("") ||
    '<p class="text-xs text-[color:var(--ink-faint)]">Belum ada anggota.</p>';
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
      .map(
        (p) =>
          `<button type="button" class="tx-card w-full text-left" data-shod-payment="${escapeHtml(
            p.payment_id,
          )}">
            <div class="flex-1">
              <p class="tx-title">${escapeHtml(p.payment_id)}</p>
              <p class="tx-meta">${escapeHtml(p.tanggal)} · ${escapeHtml(
                p.nama,
              )} · ${escapeHtml(p.keterangan || "Tanpa keterangan")}</p>
            </div>
            <div class="text-right">
              <p class="tx-amount mono">${fmtRp(p.total)}</p>
              <p class="tx-meta">${escapeHtml(p.status)}</p>
            </div>
          </button>`,
      )
      .join("") ||
    '<p class="py-6 text-center text-xs text-[color:var(--ink-faint)]">Belum ada pembayaran.</p>';
}

// ============================================================
// SHODAQOH PAYMENT FORM — WATCHER
// ============================================================

function setupShodaqohAllocationWatcher() {
  const fields = [
    "shodPaymentAmount",
    "shod_susulan_ir",
    "shod_uang",
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
      "shod_uang",
      "shod_jimpitan",
      "shod_siar_siar",
      "shod_seribuan",
      "shod_kafan",
      "shod_ukhro_mt",
    ].reduce((s, id) => s + Number($(id)?.value || 0), 0);

    const statusEl = $("shodAllocationStatus");
    if (statusEl) {
      const isBalanced = total > 0 && alokasi === total;
      statusEl.textContent = isBalanced ? "✅ SEIMBANG" : "❌ BELUM SEIMBANG";
      statusEl.style.color = isBalanced ? "var(--pos)" : "var(--neg)";
    }

    const btn = $("btnSubmitShodaqohPayment");
    if (btn) btn.disabled = !(total > 0 && alokasi === total);
  };

  fields.forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener("input", updateTotal);
  });

  setTimeout(updateTotal, 100);
}

// ============================================================
// SHODAQOH PAYMENT FORM — OPEN / CLOSE
// ============================================================

function openShodaqohPaymentForm(payment) {
  state.shodaqoh.selectedPaymentId = payment?.payment_id || null;

  const f = $("shodaqohPaymentForm");
  if (f) f.reset();

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
    "uang",
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
      const label = d.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
      months.push({ key, label });
    }
    bulanWrap.innerHTML = months
      .map(
        (m) =>
          `<label class="flex items-center gap-2 p-2 rounded-lg bg-[color:var(--surface-2)]">
            <input type="checkbox" name="shodSusulanBulan" value="${escapeHtml(
              m.key,
            )}" ${selected.includes(m.key) ? "checked" : ""}>
            <span class="text-xs">${escapeHtml(m.label)}</span>
          </label>`,
      )
      .join("");
  }

  setupShodaqohAllocationWatcher();

  $("shodaqohPaymentOverlay")?.classList.remove("hidden");
}

function closeShodaqohPaymentForm() {
  state.shodaqoh.selectedPaymentId = null;
  $("shodaqohPaymentOverlay")?.classList.add("hidden");
}

// ============================================================
// SHODAQOH IR — FUNGSI DETAIL
// ============================================================

async function openShodaqohMemberDetail(memberId) {
  try {
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

    if ($("shodMemberDetailMeta")) {
      $("shodMemberDetailMeta").textContent =
        `Nominal bulanan ${fmtRp(m.nominal_bulanan)} · ${m.status}`;
    }

    const body = $("shodMemberDetailBody");
    if (body) {
      // Urutkan dari yang terbaru
      const obligations = (d.obligations || []).sort(function (a, b) {
        return b.periode.localeCompare(a.periode);
      });

      body.innerHTML =
        obligations.length === 0
          ? '<tr><td colspan="5" class="py-6 text-center text-xs text-[color:var(--ink-faint)]">Belum ada data.</td></tr>'
          : obligations
              .map(function (o) {
                return `<tr class="border-t border-[color:var(--line)]">
              <td class="py-2">${escapeHtml(fmtMonthYear(o.periode))}</td>
              <td class="py-2 mono">${fmtRp(o.nominal_target)}</td>
              <td class="py-2">
                <span class="status-pill ${o.status === "LUNAS" ? "status-positive" : "status-negative"}">
                  ${escapeHtml(o.status || "—")}
                </span>
              </td>
              <td class="py-2 mono">${escapeHtml(o.payment_id || "—")}</td>
              <td class="py-2">${escapeHtml(o.allocated_at || "—")}</td>
            </tr>`;
              })
              .join("");
    }

    $("shodMemberDetailOverlay")?.classList.remove("hidden");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function openShodaqohPaymentDetail(paymentId) {
  try {
    const d = await apiGetShodaqohPaymentDetail(paymentId);

    if (!d.success)
      throw new Error(d.message || "Gagal memuat detail pembayaran");

    const p = d.payment;

    if ($("shodPaymentDetailTitle"))
      $("shodPaymentDetailTitle").textContent = p.payment_id;

    if ($("shodPaymentDetailMeta")) {
      $("shodPaymentDetailMeta").textContent =
        `${p.nama} · ${p.tanggal} · ${fmtRp(p.total)} · ${p.status}`;
    }

    const body = $("shodPaymentDetailBody");
    if (body) {
      const allocations = d.allocations || [];
      body.innerHTML = allocations.length
        ? allocations
            .map(
              (a) =>
                `<div class="tx-card">
                  <div class="flex-1">
                    <p class="tx-title">${escapeHtml(
                      getMonthLabel(a.periode),
                    )}</p>
                    <p class="tx-meta">Allocation ${escapeHtml(
                      a.allocation_id || "",
                    )}</p>
                  </div>
                  <div class="text-right">
                    <p class="tx-amount mono">${fmtRp(a.nominal_target || 0)}</p>
                  </div>
                </div>`,
            )
            .join("")
        : '<p class="text-xs text-[color:var(--ink-faint)] text-center py-6">Tidak ada alokasi.</p>';
    }

    if ($("btnShodEditPayment"))
      $("btnShodEditPayment").dataset.paymentId = paymentId;

    if ($("btnShodReversePayment"))
      $("btnShodReversePayment").dataset.paymentId = paymentId;

    $("shodPaymentDetailOverlay")?.classList.remove("hidden");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function apiGetShodaqohPaymentDetail(paymentId) {
  const session = getSession();
  return apiPost({
    action: "getShodaqohPaymentDetail",
    token: session?.token || "",
    paymentId: paymentId,
  });
}
