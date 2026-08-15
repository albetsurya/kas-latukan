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
};

const $ = (id) => document.getElementById(id);

// ---------- FORMAT HELPERS ----------
const fmtRp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");

const getMonthKey = (tanggal) => (tanggal || "").slice(0, 7); // 'YYYY-MM'

const getMonthLabel = (key) => {
  if (key === "all") return "Semua Periode";
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};

// Label rentang periode untuk "Semua Periode" — menampilkan bulan pertama
// s/d terakhir yang benar-benar ada transaksinya.
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
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Label "Saldo Awal (Awal Tahun/Bulan)" di kartu Beranda, mengikuti apakah
// periode yang dipilih adalah bulan spesifik atau "Semua Periode".
function updateHeroCardLabel(filterType) {
  const elLabelSaldoAwal = $("homeLabelSaldoAwal");
  if (!elLabelSaldoAwal) return;
  elLabelSaldoAwal.textContent =
    filterType === "monthly"
      ? "Saldo Awal (Awal Bulan)"
      : "Saldo Awal (Awal Tahun)";
}

// Baris berkategori "SALDO AWAL" adalah saldo bawaan/carry-over, BUKAN transaksi
// pemasukan/pengeluaran baru — dikecualikan dari Total Pemasukan/Pengeluaran,
// meskipun tetap ikut dihitung dalam Saldo berjalan (kolom saldo dari backend).
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

// ---------- SESSION (login pengurus, bertahan 30 hari meski tab/browser ditutup) ----------
// Menggunakan localStorage (bukan sessionStorage) agar sesi tidak hilang saat
// tab/browser ditutup. Sesi hanya dihapus lewat logout eksplisit atau otomatis
// setelah 30 hari (SESSION_TTL_MS) sejak login.
const SESSION_KEY = "kas_user";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

function saveSession(username, password, nama, role) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      username,
      password,
      nama,
      role,
      expiresAt: Date.now() + SESSION_TTL_MS,
    }),
  );
}
function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
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

async function apiPost(payload) {
  const res = await fetch(CONFIG.WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // hindari CORS preflight
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
      (m) => `
      <button type="button"
        class="month-dropdown-option ${m === state.selectedMonth ? "active" : ""}"
        data-month="${m}" role="option"
        aria-selected="${m === state.selectedMonth}">
        <span class="month-dropdown-check" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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

// Alias untuk pemanggilan lama.
function renderAllMonthChipRows() {
  renderAllMonthDropdowns();
}

function refreshScopedUI() {
  renderHome();
  applyFilters();
}

// Hitung ringkasan (saldo awal/pemasukan/pengeluaran/saldo akhir) untuk satu bulan
// atau untuk seluruh periode jika monthKey === 'all'.
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
  return { awal, debet, kredit, akhir, list: monthTx };
}

// Rangkuman saldo AKHIR setiap bulan, satu titik data per bulan — dipakai
// oleh chart "Tren Saldo Berjalan" supaya sumbu-X selalu per bulan, bukan
// per transaksi (yang jumlahnya bisa ratusan dan membuat chart penuh sesak).
function computeMonthlySeries() {
  const months = [
    ...new Set(state.transactions.map((t) => getMonthKey(t.tanggal))),
  ]
    .filter(Boolean)
    .sort(); // kronologis, lama ke baru

  const labels = [];
  const data = [];
  months.forEach((m) => {
    const monthTx = state.transactions.filter(
      (t) => getMonthKey(t.tanggal) === m,
    );
    if (!monthTx.length) return;
    labels.push(getMonthShortLabel(m));
    data.push(monthTx[monthTx.length - 1].saldo); // saldo akhir bulan tsb
  });
  return { labels, data };
}

// ---------- REKAP (kartu bulan) ----------
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
      return `
    <button class="card w-full text-left p-4 recap-card" data-month="${m}">
      <div class="flex items-center justify-between">
        <p class="font-display font-extrabold text-[13.5px]">${getMonthLabel(m)}</p>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-3">
        <div>
          <p class="eyebrow" style="font-size:9.5px">Masuk</p>
          <p class="mono text-[11.5px] font-bold mt-0.5" style="color:var(--pos)">${fmtRp(s.debet)}</p>
        </div>
        <div>
          <p class="eyebrow" style="font-size:9.5px">Keluar</p>
          <p class="mono text-[11.5px] font-bold mt-0.5" style="color:var(--neg)">${fmtRp(s.kredit)}</p>
        </div>
        <div>
          <p class="eyebrow" style="font-size:9.5px">Akhir</p>
          <p class="mono text-[11.5px] font-bold mt-0.5">${fmtRp(s.akhir)}</p>
        </div>
      </div>
    </button>`;
    })
    .join("");

  wrap.querySelectorAll(".recap-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.selectedMonth = card.dataset.month;
      renderAllMonthChipRows();
      refreshScopedUI();
      switchTab("history");
    });
  });
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

  // Surplus/defisit = selisih pemasukan dan pengeluaran pada periode terpilih.
  // Istilah kas: "Surplus" bila pemasukan > pengeluaran, "Defisit" bila
  // sebaliknya, dan "Impas" bila persis sama.
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
    labels.push(getMonthShortLabel(new Date().toISOString().slice(0, 7)));
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
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => fmtRp(c.parsed.y) } },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxRotation: 0,
            font: { size: 9 },
            color: tickColor,
          },
          grid: { display: false },
        },
        y: { display: false },
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

  // Cukup daftarkan kata pendek yang PUNYA VOKAL tapi tetap harus UPPERCASE (sangat sedikit)
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

  // Kata hubung kecil bahasa Indonesia yang sebaiknya tetap lowercase (huruf kecil)
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
  ]);

  return str
    .split(" ")
    .map((word, index) => {
      const upperWord = word.toUpperCase();
      const cleanUpper = upperWord.replace(/[^A-Z0-9]/g, "");

      // 1. Cek whitelist ringkas
      if (specialUpper.has(cleanUpper)) return upperWord;

      // 2. OTOMATIS UPPERCASE jika:
      //    - Panjangnya 2-4 huruf DAN tidak ada huruf vokal A, E, I, O, U (Contoh: PPH, PPN, BKM, MT, KTP, ADM, DP)
      //    - ATAU input aslinya memang sudah KAPITAL SEMUA dan panjangnya <= 3 huruf
      const hasNoVowels = !/[AEIOUaeiou]/.test(cleanUpper);
      if (
        cleanUpper.length >= 2 &&
        cleanUpper.length <= 4 &&
        (hasNoVowels || word === upperWord)
      ) {
        return upperWord;
      }

      // 3. Kata hubung kecil tetap lowercase (kecuali di awal kalimat)
      const lowerWord = word.toLowerCase();
      if (index > 0 && lowerWords.has(lowerWord)) {
        return lowerWord;
      }

      // 4. Sisanya Title Case biasa (Huruf pertama kapital)
      return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    })
    .join(" ");
}

// Setiap kartu transaksi kini hanya menampilkan info (tanpa tombol icon
// edit/hapus inline). Saat mode admin aktif, seluruh kartu bisa diketuk
// (tx-card-clickable) untuk membuka menu aksi (lihat txActionOverlay di
// events.js) berisi pilihan "Edit Transaksi" / "Hapus Transaksi".
function renderTxList(rows, containerId, emptyId, opts) {
  opts = opts || {};
  const body = $(containerId);
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = opts.compact
      ? '<p class="text-center py-6 text-[color:var(--ink-faint)] text-xs">Belum ada transaksi.</p>'
      : "";
    if (emptyId && $(emptyId)) $(emptyId).classList.remove("hidden");
    return;
  }
  if (emptyId && $(emptyId)) $(emptyId).classList.add("hidden");

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
    <div class="tx-icon" style="background:${iconBg}">${icon}</div>
    <div class="flex-1 min-w-0">
      <p class="tx-title">${escapeHtml(toTitleCase(t.keterangan))}</p>
      <p class="tx-sub">${escapeHtml(toTitleCase(t.account))}</p>
      <p class="tx-meta">${fmtDateShort(t.tanggal)}${t.createdBy ? " · " + escapeHtml(t.createdBy) : ""}</p>
    </div>
    <div class="text-right flex-shrink-0">
      <p class="tx-amount mono" style="color:${amountColor}">${amountPrefix}${fmtRp(amount)}</p>
      <p class="text-[9.5px] mono text-[color:var(--ink-faint)] mt-0.5">${fmtRp(t.saldo)}</p>
    </div>
    ${chevron}
  </div>`;
    })
    .join("");
}

function buildPrintTable(rows) {
  if (!$("printTableBody")) return;
  // Nomor urut tabel cetak selalu dimulai dari 1 dan berurutan,
  // terlepas dari nomor baris asli di database/backend.
  $("printTableBody").innerHTML = rows
    .map(
      (t, idx) => `
  <tr>
    <td>${idx + 1}</td>
    <td>${t.tanggal}</td>
    <td>${escapeHtml(t.account)}</td>
    <td>${escapeHtml(t.keterangan)}</td>
    <td class="num">${t.debet ? fmtRp(t.debet) : "-"}</td>
    <td class="num">${t.kredit ? fmtRp(t.kredit) : "-"}</td>
    <td class="num">${fmtRp(t.saldo)}</td>
  </tr>`,
    )
    .join("");
}

// Menyesuaikan skala tabel cetak (via CSS transform) agar seluruh baris
// transaksi pada bulan terpilih selalu muat dalam 1 halaman A4, berapa
// pun jumlah transaksinya.
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
  area.style.width = "186mm"; // lebar A4 dikurangi margin kiri+kanan 12mm

  const mmToPx = 96 / 25.4;
  const availableHeightPx = (297 - 24) * mmToPx; // tinggi A4 dikurangi margin atas+bawah 12mm
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
  document.querySelector("main")?.scrollTo({ top: 0 });
}

function updateFabVisibility() {
  const fab = $("fabAdd");
  if (!fab) return;
  const isAdmin = state.isAdmin === true || state.isAdmin === "true";
  const isAllowedTab =
    state.activeTab === "home" || state.activeTab === "history";
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
  if (typeof applyRoleBasedCreateVisibility === "function")
    applyRoleBasedCreateVisibility();
}

function enterApp() {
  document.documentElement.classList.add("authenticated");
  document.documentElement.classList.remove("auth-locked");
  if ($("authScreen")) $("authScreen").classList.add("hidden");
  if ($("shell")) $("shell").classList.remove("hidden");
  loadData();
  setInterval(() => loadData(), CONFIG.POLL_INTERVAL_MS);
}

// ---- Tambah transaksi: toggle jenis ----
function setTxJenis(jenis) {
  state.txJenis = jenis;
  if ($("segDebet"))
    $("segDebet").classList.toggle("active-debet", jenis === "debet");
  if ($("segKredit"))
    $("segKredit").classList.toggle("active-kredit", jenis === "kredit");
}
