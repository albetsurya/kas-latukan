##events.js

document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  // ---------- THEME ----------
  if ($("btnTheme")) {
    $("btnTheme").addEventListener("click", () =>
      applyTheme(currentTheme() === "dark" ? "light" : "dark"),
    );
  }
  if ($("themeLightBtn"))
    $("themeLightBtn").addEventListener("click", () => applyTheme("light"));
  if ($("themeDarkBtn"))
    $("themeDarkBtn").addEventListener("click", () => applyTheme("dark"));

  // ---------- REFRESH ----------
  if ($("btnRefresh")) {
    $("btnRefresh").addEventListener("click", () => {
      $("btnRefresh").classList.add("spin");
      loadData().finally(() =>
        setTimeout(() => $("btnRefresh").classList.remove("spin"), 400),
      );
    });
  }

  // ---------- SEARCH / TABS ----------
  if ($("searchInput"))
    $("searchInput").addEventListener("input", applyFilters);
  if ($("btnSeeAll"))
    $("btnSeeAll").addEventListener("click", () => switchTab("history"));
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // ---------- CETAK / EKSPOR PDF ----------
  // Selalu mencetak data RIWAYAT untuk bulan yang sedang dipilih di dropdown
  // periode (state.selectedMonth), lengkap dengan judul laporan, penomoran
  // ulang 1..n, dan ringkasan total di bagian bawah tabel — diskalakan
  // otomatis supaya selalu muat dalam 1 halaman A4.
  if ($("btnPrint")) {
    $("btnPrint").addEventListener("click", () => {
      const monthKey = state.selectedMonth;
      const scope = computeScope(monthKey);

      if ($("printPeriod"))
        $("printPeriod").textContent = "Periode: " + getMonthLabel(monthKey);
      buildPrintTable(scope.list);

      if ($("printTotalDebet"))
        $("printTotalDebet").textContent = fmtRp(scope.debet);
      if ($("printTotalKredit"))
        $("printTotalKredit").textContent = fmtRp(scope.kredit);
      if ($("printTotalSaldo"))
        $("printTotalSaldo").textContent = fmtRp(scope.akhir);

      fitPrintToOnePage();
      window.print();
    });
  }
  window.addEventListener("afterprint", () => {
    document.documentElement.style.setProperty("--print-scale", "1");
  });

  // ---------- LOGOUT ----------
  if ($("btnLogout")) {
    $("btnLogout").addEventListener("click", () => {
      const session = getSession();
      // Cabut token di server dulu (best-effort) supaya token lama itu
      // langsung tidak bisa dipakai lagi, baru bersihkan sesi lokal.
      if (session && session.token) {
        apiPost({ action: "logout", token: session.token }).catch(() => {});
      }
      clearSession();
      document.documentElement.classList.remove("authenticated");
      document.documentElement.classList.add("auth-locked");
      $("shell")?.classList.add("hidden");
      $("authScreen")?.classList.remove("hidden");
      $("authForm")?.reset();
      showToast("Berhasil keluar.");
    });
  }

  // ---------- TAMBAH TRANSAKSI ----------
  if ($("segDebet"))
    $("segDebet").addEventListener("click", () => setTxJenis("debet"));
  if ($("segKredit"))
    $("segKredit").addEventListener("click", () => setTxJenis("kredit"));

  if ($("fabAdd")) {
    $("fabAdd").addEventListener("click", () => {
      if (state.isAdmin !== true) return;
      state.editingNo = null;
      if ($("txSheetTitle")) $("txSheetTitle").textContent = "Tambah Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Simpan";
      $("txError")?.classList.add("hidden");
      $("txForm")?.reset();
      setTxJenis("debet");
      if ($("txTanggal")) $("txTanggal").valueAsDate = new Date();
      $("txOverlay")?.classList.remove("hidden");
    });
  }
  $("btnCancelTx").addEventListener("click", () => {
    state.editingNo = null;
    $("txOverlay")?.classList.add("hidden");
  });
  if ($("txOverlay")) {
    $("txOverlay").addEventListener("click", (e) => {
      if (e.target === $("txOverlay")) $("txOverlay").classList.add("hidden");
    });
  }

  if ($("txForm")) {
    $("txForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const jumlah = Number($("txJumlah").value);
      if (!jumlah || jumlah <= 0) {
        $("txError").textContent = "Jumlah nominal harus lebih dari 0.";
        $("txError").classList.remove("hidden");
        return;
      }
      if (state.isAdmin !== true) {
        $("txError").textContent =
          "Hanya admin yang dapat menyimpan transaksi.";
        $("txError").classList.remove("hidden");
        return;
      }

      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        $("txOverlay").classList.add("hidden");
        setAdminUI(false);
        return;
      }

      const isEditing = state.editingNo !== null;
      $("btnSubmitTx").disabled = true;
      $("btnSubmitTx").textContent = isEditing ? "Memperbarui…" : "Menyimpan…";
      try {
        const payload = {
          action: isEditing ? "editTransaction" : "addTransaction",
          token: session.token,
          tanggal: $("txTanggal").value,
          account: $("txAccount").value.trim(),
          keterangan: $("txKeterangan").value.trim(),
          jenis: state.txJenis,
          jumlah,
        };
        if (isEditing) payload.no = state.editingNo;

        const res = await apiPost(payload);
        if (!res.success) {
          $("txError").textContent =
            res.message || "Gagal menyimpan transaksi.";
          $("txError").classList.remove("hidden");
          return;
        }
        $("txOverlay").classList.add("hidden");
        showToast(
          isEditing
            ? "Transaksi berhasil diperbarui."
            : "Transaksi berhasil ditambahkan.",
        );
        state.editingNo = null;
        await loadData();
      } catch (err) {
        $("txError").textContent =
          "Tidak dapat menghubungi server: " + err.message;
        $("txError").classList.remove("hidden");
      } finally {
        $("btnSubmitTx").disabled = false;
        $("btnSubmitTx").textContent = isEditing ? "Update" : "Simpan";
      }
    });
  }

  // ---------- KARTU TRANSAKSI: ketuk untuk membuka menu aksi (Edit/Hapus) ----------
  // Menggantikan tombol icon edit/hapus inline yang sebelumnya menempel di
  // setiap baris. Sekarang seluruh kartu (mode admin) bisa diketuk, lalu
  // muncul action sheet berisi dua pilihan.
  function openTxActionSheet(no) {
    const tx = state.transactions.find((t) => String(t.no) === String(no));
    if (!tx) return;
    state.actionNo = tx.no;
    if ($("txActionSubtitle")) {
      $("txActionSubtitle").textContent =
        fmtDateShort(tx.tanggal) + " · " + tx.account;
    }
    $("txActionOverlay")?.classList.remove("hidden");
  }

  function closeTxActionSheet() {
    $("txActionOverlay")?.classList.add("hidden");
  }

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".tx-card-clickable");
    if (!card) return;
    openTxActionSheet(card.dataset.no);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest && e.target.closest(".tx-card-clickable");
    if (!card) return;
    e.preventDefault();
    openTxActionSheet(card.dataset.no);
  });

  if ($("btnActionCancel"))
    $("btnActionCancel").addEventListener("click", closeTxActionSheet);
  if ($("txActionOverlay")) {
    $("txActionOverlay").addEventListener("click", (e) => {
      if (e.target === $("txActionOverlay")) closeTxActionSheet();
    });
  }

  if ($("btnActionEdit")) {
    $("btnActionEdit").addEventListener("click", () => {
      const no = state.actionNo;
      const tx = state.transactions.find((t) => String(t.no) === String(no));
      closeTxActionSheet();
      if (!tx) return;

      state.editingNo = tx.no;
      if ($("txSheetTitle")) $("txSheetTitle").textContent = "Edit Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Update";
      $("txError")?.classList.add("hidden");
      $("txTanggal").value = tx.tanggal;
      $("txAccount").value = tx.account;
      $("txKeterangan").value = tx.keterangan;
      $("txJumlah").value = tx.debet > 0 ? tx.debet : tx.kredit;
      setTxJenis(tx.debet > 0 ? "debet" : "kredit");
      $("txOverlay")?.classList.remove("hidden");
    });
  }

  // ---------- MODAL KONFIRMASI HAPUS ----------
  function openDeleteConfirm() {
    const tx = state.transactions.find(
      (t) => String(t.no) === String(state.actionNo),
    );
    if ($("deleteConfirmDesc")) {
      $("deleteConfirmDesc").textContent = tx
        ? `"${tx.account}" · ${fmtDateShort(tx.tanggal)} akan dihapus permanen dan tidak bisa dibatalkan.`
        : "Tindakan ini tidak bisa dibatalkan.";
    }
    $("deleteConfirmOverlay")?.classList.remove("hidden");
  }

  function closeDeleteConfirm() {
    $("deleteConfirmOverlay")?.classList.add("hidden");
  }

  if ($("btnActionDelete")) {
    $("btnActionDelete").addEventListener("click", () => {
      closeTxActionSheet();
      openDeleteConfirm();
    });
  }

  if ($("btnDeleteCancel"))
    $("btnDeleteCancel").addEventListener("click", () => {
      state.actionNo = null;
      closeDeleteConfirm();
    });
  if ($("deleteConfirmOverlay")) {
    $("deleteConfirmOverlay").addEventListener("click", (e) => {
      if (e.target === $("deleteConfirmOverlay")) {
        state.actionNo = null;
        closeDeleteConfirm();
      }
    });
  }

  if ($("btnDeleteConfirm")) {
    $("btnDeleteConfirm").addEventListener("click", () => {
      const no = state.actionNo;
      if (no === null || no === undefined) {
        closeDeleteConfirm();
        return;
      }
      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        closeDeleteConfirm();
        return;
      }

      $("btnDeleteConfirm").disabled = true;
      $("btnDeleteConfirm").textContent = "Menghapus…";

      apiPost({
        action: "deleteTransaction",
        token: session.token,
        no,
      })
        .then((res) => {
          if (!res.success) {
            showToast(res.message || "Gagal menghapus transaksi.", "error");
            return;
          }
          showToast("Transaksi berhasil dihapus.");
          loadData();
        })
        .catch((err) =>
          showToast("Tidak dapat menghubungi server: " + err.message, "error"),
        )
        .finally(() => {
          state.actionNo = null;
          $("btnDeleteConfirm").disabled = false;
          $("btnDeleteConfirm").textContent = "Hapus";
          closeDeleteConfirm();
        });
    });
  }

  // ---------- AUTH GATE (login pengurus) ----------
  if ($("authForm")) {
    $("authForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = $("authUsername").value.trim();
      const password = $("authPassword").value;
      $("btnAuthSubmit").disabled = true;
      $("btnAuthSubmit").textContent = "Memeriksa…";
      try {
        const res = await apiPost({ action: "login", username, password });
        if (!res.success) {
          $("authError").textContent =
            res.message || "Username atau password salah.";
          $("authError").classList.remove("hidden");
          return;
        }
        // Peran ditentukan dari backend (res.role) bila tersedia; jika tidak,
        // username "admin" mendapat hak input, selain itu hanya lihat (pengurus).
        // Password TIDAK disimpan — hanya token sesi yang diterbitkan backend.
        const role = String(res.role || "pengurus").toLowerCase();
        saveSession(res.token, res.nama || username, role, res.expiresAt);
        setAdminUI(role === "admin", res.nama || username);
        $("authError").classList.add("hidden");
        $("authForm").reset();
        enterApp();
      } catch (err) {
        $("authError").textContent =
          "Tidak dapat menghubungi server: " + err.message;
        $("authError").classList.remove("hidden");
      } finally {
        $("btnAuthSubmit").disabled = false;
        $("btnAuthSubmit").textContent = "Masuk";
      }
    });
  }

  // ---------- DROPDOWN PERIODE / OVERLAY: tutup saat klik di luar / tekan Escape ----------
  document.addEventListener("click", (event) => {
    const homeDropdown = $("homeMonthDropdown");
    const historyDropdown = $("historyMonthDropdown");
    if (
      (!homeDropdown || !homeDropdown.contains(event.target)) &&
      (!historyDropdown || !historyDropdown.contains(event.target))
    ) {
      closeAllMonthDropdowns();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllMonthDropdowns();
      closeTxActionSheet();
      state.actionNo = null;
      closeDeleteConfirm();
    }
  });

  // ---------- INIT: pulihkan sesi bila masih berlaku (maks. 30 hari) ----------
  const existing = getSession();
  if (existing) {
    setAdminUI(
      String(existing.role || "").toLowerCase() === "admin",
      existing.nama,
    );
    enterApp();
  }
});


##main.js

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
// tab/browser ditutup. Sesi HANYA menyimpan token (bukan username/password) —
// backend yang menentukan kapan token itu kedaluwarsa (lihat expiresAt yang
// dikirim balik saat login) dan bisa mencabutnya lewat logout.
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


## index.html
<!doctype html>
<html lang="id" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, viewport-fit=cover"
    />
    <meta name="theme-color" content="#0B0E14" />

    <!-- Favicon Inline SVG (Kas/Keuangan) -->
    <link
      rel="icon"
      type="image/svg+xml"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%236cc06a'/><stop offset='100%25' stop-color='%234f9e51'/></linearGradient></defs><rect width='100' height='100' rx='24' fill='%230B0E14'/><rect x='20' y='30' width='60' height='44' rx='10' fill='url(%23g)'/><path d='M20 42h60' stroke='%230B0E14' stroke-width='4'/><circle cx='62' cy='54' r='4' fill='%23F59E0B'/></svg>"
    />

    <title>Kas · Kelompok Latukan</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="css/style.css" />
    <style>
      /* Modal konfirmasi hapus (bukan bottom sheet) — backdrop + kotak di tengah */
      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 70;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(2px);
      }
      .modal-overlay.hidden {
        display: none;
      }
      .modal-box {
        width: 100%;
        max-width: 320px;
      }
      .modal-icon {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
      }
      /* Kartu transaksi yang bisa diketuk (mode admin) untuk membuka menu Edit/Hapus */
      .tx-card-clickable {
        cursor: pointer;
        transition: opacity 0.15s ease;
      }
      .tx-card-clickable:active {
        opacity: 0.65;
      }
      .tx-chevron {
        flex-shrink: 0;
        margin-left: 2px;
      }
    </style>
  </head>
  <body>
    <!-- ===================== AUTH GATE ===================== -->
    <div id="authScreen">
      <div id="authCard">
        <div
          class="app-icon-badge"
          style="
            width: 52px;
            height: 52px;
            border-radius: 16px;
            margin: 0 auto 18px;
          "
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1fd8a4"
            stroke-width="2"
          >
            <path
              d="M3 10h18M3 6h18M5 14h14a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 1 2-2z"
            />
          </svg>
        </div>
        <h1 class="font-display font-extrabold text-[19px] text-center">
          Kas Kelompok Latukan
        </h1>
        <p
          class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5 mb-6"
        >
          Masuk dengan akun pengurus untuk membuka aplikasi.
        </p>
        <form id="authForm" class="space-y-3">
          <div>
            <label class="field-label">Username</label>
            <input
              required
              id="authUsername"
              type="text"
              autocomplete="username"
              placeholder="Masukkan username"
              class="field-input"
            />
          </div>
          <div>
            <label class="field-label">Password</label>
            <input
              required
              id="authPassword"
              type="password"
              autocomplete="current-password"
              placeholder="Masukkan password"
              class="field-input"
            />
          </div>
          <p
            id="authError"
            class="hidden text-xs rounded-xl px-3 py-2.5"
            style="color: var(--neg); background: var(--neg-soft)"
          ></p>
          <button
            type="submit"
            id="btnAuthSubmit"
            class="btn-primary w-full mt-1"
          >
            Masuk
          </button>
        </form>
        <p class="text-[11px] text-[color:var(--ink-faint)] text-center mt-6">
          Khusus pengurus kas. Hubungi admin bila belum memiliki akun.
        </p>
      </div>
    </div>

    <div id="shell" class="hidden">
      <!-- ===================== TOP BAR ===================== -->
      <div
        id="topbar"
        class="px-5 pt-4 pb-3 flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="app-icon-badge">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1fd8a4"
              stroke-width="2"
            >
              <path
                d="M3 10h18M3 6h18M5 14h14a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 1 2-2z"
              />
            </svg>
          </div>
          <div class="min-w-0">
            <h1
              id="screenTitle"
              class="font-display font-extrabold text-[15px] leading-tight"
            >
              Beranda
            </h1>
            <p
              class="text-[10.5px] mono text-[color:var(--ink-faint)] truncate"
              id="lastSync"
            >
              menyambungkan…
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="btnTheme" class="icon-btn"></button>
          <button id="btnRefresh" class="icon-btn">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v6h-6" />
            </svg>
          </button>
        </div>
      </div>

      <!-- ===================== CONTENT ===================== -->
      <main class="flex-1 overflow-y-auto pb-28 px-5 space-y-5">
        <!-- CONFIG WARNING -->
        <div
          id="configWarning"
          class="hidden fade-in border border-amber-300/60 bg-[color:var(--gold-soft)] text-[color:var(--gold)] text-xs rounded-2xl px-4 py-3"
        >
          <b>Belum terhubung.</b> Isi
          <span class="mono bg-black/10 px-1 rounded">WEB_APP_URL</span>
          di bagian atas <code>js/main.js</code>, lalu muat ulang halaman.
        </div>

        <!-- ============ SCREEN: BERANDA ============ -->
        <section id="screen-home" class="screen active space-y-5">
          <div class="home-period-filter">
            <div class="home-period-label">
              <span class="home-period-label-dot"></span>
              <span>Periode</span>
            </div>

            <div class="month-dropdown" id="homeMonthDropdown">
              <button
                type="button"
                id="homeMonthDropdownTrigger"
                class="month-dropdown-trigger"
                aria-haspopup="listbox"
                aria-expanded="false"
              >
                <span class="month-dropdown-calendar" aria-hidden="true">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="3" y="4.5" width="18" height="17" rx="2.5"></rect>
                    <path d="M8 2.5v4M16 2.5v4M3 9h18"></path>
                  </svg>
                </span>
                <span id="homeMonthDropdownValue" class="month-dropdown-value"
                  >Semua Periode</span
                >
                <svg
                  class="month-dropdown-chevron"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>

              <div
                id="homeMonthDropdownMenu"
                class="month-dropdown-menu"
                role="listbox"
                aria-label="Pilih periode"
              ></div>
            </div>
          </div>

          <div class="hero-card px-6 pt-6 pb-5">
            <p
              class="eyebrow white-text font-bold text-[12px] tracking-wider uppercase"
              style="color: rgba(255, 255, 255, 0.9)"
            >
              Saldo Kas
            </p>

            <p
              class="mono font-display text-[30px] font-extrabold mt-1.5 leading-none"
              id="homeSaldoAkhir"
            >
              Rp 0
            </p>

            <p
              class="text-[11.5px] mt-2 white-text font-semibold tracking-wide"
              style="color: rgba(255, 255, 255, 0.95)"
            >
              <span id="homePeriodeText">Semua Periode</span>
              <span style="color: rgba(255, 255, 255, 0.5)" class="mx-1"
                >·</span
              >
              <span id="homeTotalTx" class="font-extrabold">0 transaksi</span>
            </p>

            <div
              class="flex items-center gap-1.5 mt-2.5 pt-2"
              style="border-top: 1px solid rgba(255, 255, 255, 0.22)"
            >
              <span
                class="text-[11px] white-text font-bold"
                style="color: rgba(255, 255, 255, 0.85)"
                id="homeLabelSaldoAwal"
              >
                Saldo Awal (Awal Tahun)
              </span>
              <span
                class="text-[10.5px] white-text"
                style="color: rgba(255, 255, 255, 0.45)"
                >·</span
              >
              <span
                class="mono text-[12px] font-extrabold white-text"
                id="homeSaldoAwal"
                >Rp 0</span
              >
            </div>
          </div>
          <div class="receipt-edge -mt-4"></div>

          <div class="grid grid-cols-2 gap-3 -mt-1">
            <div class="stat-chip p-4">
              <p class="eyebrow" style="color: var(--pos)">Pemasukan</p>
              <p
                class="mono text-base font-extrabold mt-1"
                style="color: var(--pos)"
                id="homeDebet"
              >
                Rp 0
              </p>
            </div>
            <div class="stat-chip p-4">
              <p class="eyebrow" style="color: var(--neg)">Pengeluaran</p>
              <p
                class="mono text-base font-extrabold mt-1"
                style="color: var(--neg)"
                id="homeKredit"
              >
                Rp 0
              </p>
            </div>
          </div>

          <div class="stat-chip p-4 flex items-center justify-between">
            <div>
              <p class="eyebrow" id="homeSurplusLabel">Surplus Periode Ini</p>
              <p class="mono text-base font-extrabold mt-1" id="homeSurplus">
                Rp 0
              </p>
            </div>
            <div
              id="homeSurplusBadge"
              class="text-[10.5px] font-display font-bold px-2.5 py-1 rounded-full"
            >
              Surplus
            </div>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-display text-[13px] font-extrabold">
                Tren Saldo Bulanan
              </h2>
              <span
                class="text-[10px] mono text-[color:var(--ink-faint)]"
                id="chartScopeLabel"
                >seluruh periode</span
              >
            </div>
            <div class="h-40">
              <canvas id="saldoChart"></canvas>
            </div>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-display text-[13px] font-extrabold">
                Transaksi Terbaru
              </h2>
              <button
                id="btnSeeAll"
                class="font-display text-[11px] font-bold"
                style="color: var(--brand)"
              >
                Lihat semua
              </button>
            </div>
            <div id="homeRecentList"></div>
          </div>
        </section>

        <!-- ============ SCREEN: RIWAYAT ============ -->
        <section id="screen-history" class="screen space-y-5">
          <div class="relative">
            <svg
              class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--ink-faint)]"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              id="searchInput"
              type="text"
              placeholder="Cari tanggal, kategori, keterangan…"
              class="field-input mt-0 pl-9"
            />
          </div>

          <div class="home-period-filter">
            <div class="home-period-label">
              <span class="home-period-label-dot"></span>
              <span>Periode</span>
            </div>
            <div class="month-dropdown" id="historyMonthDropdown">
              <button
                type="button"
                id="historyMonthDropdownTrigger"
                class="month-dropdown-trigger"
                aria-haspopup="listbox"
                aria-expanded="false"
              >
                <span class="month-dropdown-calendar" aria-hidden="true">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <rect x="3" y="4.5" width="18" height="17" rx="2.5"></rect>
                    <path d="M8 2.5v4M16 2.5v4M3 9h18"></path>
                  </svg>
                </span>
                <span
                  id="historyMonthDropdownValue"
                  class="month-dropdown-value"
                  >Semua Periode</span
                >
                <svg
                  class="month-dropdown-chevron"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              <div
                id="historyMonthDropdownMenu"
                class="month-dropdown-menu"
                role="listbox"
                aria-label="Pilih periode"
              ></div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="stat-chip p-4">
              <p class="eyebrow">Saldo Awal</p>
              <p class="mono text-sm font-extrabold mt-1" id="rySaldoAwal">
                Rp 0
              </p>
            </div>
            <div
              class="stat-chip p-4"
              style="
                background: var(--brand-dark);
                border-color: var(--brand-dark);
              "
            >
              <p class="eyebrow" style="color: rgba(255, 255, 255, 0.7)">
                Saldo Akhir
              </p>
              <p
                class="mono text-sm font-extrabold mt-1"
                style="color: #06120d"
                id="rySaldoAkhir"
              >
                Rp 0
              </p>
            </div>
          </div>
          <p
            class="text-[11px] text-[color:var(--ink-faint)] -mt-2"
            id="periodHint"
          ></p>

          <div class="card p-5">
            <div id="txList"></div>
            <div
              id="txEmpty"
              class="hidden text-center py-10 text-[color:var(--ink-faint)] text-xs"
            >
              Tidak ada transaksi pada periode/pencarian ini.
            </div>
          </div>
        </section>

        <!-- ============ SCREEN: REKAP ============ -->
        <section id="screen-recap" class="screen space-y-4">
          <p class="text-[11.5px] text-[color:var(--ink-soft)] px-1">
            Ketuk salah satu bulan untuk membuka riwayat lengkapnya.
          </p>
          <div id="recapList" class="space-y-2.5"></div>
        </section>

        <!-- ============ SCREEN: PROFIL ============ -->
        <section id="screen-profile" class="screen space-y-5">
          <div class="card p-5 flex items-center gap-4">
            <div
              id="profileAvatar"
              class="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style="background: var(--brand-soft)"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brand)"
                stroke-width="2"
              >
                <path d="M20 21a8 8 0 1 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p
                class="font-display font-extrabold text-[15px]"
                id="profileName"
              >
                Pengurus
              </p>
              <p
                class="text-[11.5px] text-[color:var(--ink-soft)]"
                id="profileStatus"
              >
                Mode lihat saja
              </p>
            </div>
          </div>

          <button
            id="btnLogout"
            class="btn-ghost w-full"
            style="color: var(--neg); border-color: var(--neg-soft)"
          >
            Keluar
          </button>

          <div class="card p-5">
            <p class="eyebrow mb-3">Tampilan</p>
            <div class="opt-toggle">
              <button type="button" id="themeLightBtn" class="opt-btn">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.3"
                >
                  <circle cx="12" cy="12" r="4.2" />
                  <path
                    d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"
                  />
                </svg>
                Terang
              </button>
              <button type="button" id="themeDarkBtn" class="opt-btn">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.3"
                >
                  <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
                </svg>
                Gelap
              </button>
            </div>
          </div>

          <div class="card p-1 divide-y divide-[color:var(--line)]">
            <button
              id="btnPrint"
              class="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <span class="icon-btn" style="pointer-events: none">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"
                  />
                </svg>
              </span>
              <span class="font-display text-[13.5px] font-bold flex-1"
                >Cetak / Ekspor PDF</span
              >
            </button>
          </div>

          <div class="card p-5">
            <p class="eyebrow mb-1.5">Sinkronisasi</p>
            <p class="text-[12.5px] text-[color:var(--ink-soft)]">
              Data tersambung otomatis dari Google Spreadsheet setiap 20 detik.
            </p>
          </div>
        </section>
      </main>

      <!-- ===================== FAB ===================== -->
      <button
        id="fabAdd"
        class="hidden"
        data-action="create"
        aria-label="Tambah transaksi"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1a1204"
          stroke-width="2.4"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <!-- ===================== BOTTOM NAV ===================== -->
      <nav id="bottomnav" class="flex">
        <button class="nav-btn active" data-tab="home">
          <span class="nav-pill">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.1"
            >
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
            </svg>
          </span>
          <span>Beranda</span>
        </button>
        <button class="nav-btn" data-tab="history">
          <span class="nav-pill">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.1"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7M3 5v5h5" />
              <path d="M12 8v4l3 2" />
            </svg>
          </span>
          <span>Riwayat</span>
        </button>
        <button class="nav-btn" data-tab="recap">
          <span class="nav-pill">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.1"
            >
              <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
              <path d="M3.5 9.5h17M8 3v3M16 3v3" />
            </svg>
          </span>
          <span>Rekap</span>
        </button>
        <button class="nav-btn" data-tab="profile">
          <span class="nav-pill">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.1"
            >
              <path d="M20 21a8 8 0 1 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span>Profil</span>
        </button>
      </nav>

      <!-- ===================== ADD TRANSACTION SHEET ===================== -->
      <div id="txOverlay" class="sheet-overlay hidden">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <h3 class="font-display text-[16px] font-extrabold" id="txSheetTitle">
            Tambah Transaksi
          </h3>
          <p class="text-[12.5px] text-[color:var(--ink-soft)] mt-1 mb-4">
            Saldo akan dihitung otomatis dari saldo berjalan.
          </p>
          <form id="txForm" class="space-y-3 create-form">
            <div class="field-group">
              <label class="field-label">Jenis Transaksi</label>
              <div class="seg-toggle">
                <button
                  type="button"
                  id="segDebet"
                  class="seg-btn active-debet"
                >
                  Pemasukan
                </button>
                <button type="button" id="segKredit" class="seg-btn">
                  Pengeluaran
                </button>
              </div>
            </div>
            <div class="field-group">
              <label class="field-label">Tanggal</label>
              <input required id="txTanggal" type="date" class="field-input" />
            </div>
            <div class="field-group">
              <label class="field-label">Account (Kategori)</label>
              <input
                required
                id="txAccount"
                type="text"
                list="accountCategories"
                placeholder="Pilih atau ketik kategori…"
                class="field-input"
              />
              <datalist id="accountCategories">
                <option value="SALDO AWAL"></option>
                <option value="PEMASUKAN INFAK SAMBUNG"></option>
                <option value="INFAK IR"></option>
                <option value="PEMASUKAN UANG SAMBUNG"></option>
                <option value="PEMASUKAN INFAK JUMAT"></option>
                <option value="JIMPITAN"></option>
                <option value="SIAR-SIAR"></option>
                <option value="KAFAN"></option>
                <option value="INFAK SERIBUAN"></option>
                <option value="PEMASUKAN UKHRO MT"></option>
                <option value="SETOR INFAK SAMBUNG"></option>
                <option value="SETOR 2/3 INFAK JUMAT"></option>
                <option value="INFAQ SAMBUNG DESA"></option>
                <option value="INFAQ SAMBUNG DAERAH"></option>
                <option value="UKHRO MT"></option>
                <option value="BEBAN OPERASIONAL BULAN BERJALAN"></option>
                <option value="BEBAN PENGELUARAN LAIN-LAIN"></option>
                <option value="PEMASUKAN LAIN-LAIN"></option>
              </datalist>
            </div>
            <div class="field-group">
              <label class="field-label">Keterangan</label>
              <textarea
                required
                id="txKeterangan"
                rows="2"
                placeholder="Deskripsi rinci transaksi"
                class="field-input"
              ></textarea>
            </div>
            <div class="field-group">
              <label class="field-label">Jumlah Nominal (Rp)</label>
              <input
                required
                id="txJumlah"
                type="number"
                min="1"
                step="1"
                placeholder="0"
                class="field-input mono"
              />
            </div>
            <p
              id="txError"
              class="hidden text-xs px-3 py-2.5 form-error"
              style="color: var(--neg); background: var(--neg-soft)"
            ></p>
            <div class="flex gap-2.5 pt-1">
              <button type="button" id="btnCancelTx" class="btn-ghost flex-1">
                Batal
              </button>
              <button type="submit" id="btnSubmitTx" class="btn-primary flex-1">
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ===================== TX ACTION SHEET (pilih Edit / Hapus) ===================== -->
      <div id="txActionOverlay" class="sheet-overlay hidden">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <h3
            class="font-display text-[16px] font-extrabold"
            id="txActionTitle"
          >
            Transaksi
          </h3>
          <p
            class="text-[12.5px] text-[color:var(--ink-soft)] mt-1 mb-4"
            id="txActionSubtitle"
          ></p>
          <div class="card p-1 divide-y divide-[color:var(--line)]">
            <button
              type="button"
              id="btnActionEdit"
              class="w-full flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <span class="icon-btn" style="pointer-events: none">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
                  />
                </svg>
              </span>
              <span class="font-display text-[13.5px] font-bold flex-1"
                >Edit Transaksi</span
              >
            </button>
            <button
              type="button"
              id="btnActionDelete"
              class="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              style="color: var(--neg)"
            >
              <span
                class="icon-btn"
                style="pointer-events: none; color: var(--neg)"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"
                  />
                </svg>
              </span>
              <span class="font-display text-[13.5px] font-bold flex-1"
                >Hapus Transaksi</span
              >
            </button>
          </div>
          <button
            type="button"
            id="btnActionCancel"
            class="btn-ghost w-full mt-3"
          >
            Batal
          </button>
        </div>
      </div>

      <!-- ===================== MODAL KONFIRMASI HAPUS ===================== -->
      <div id="deleteConfirmOverlay" class="modal-overlay hidden">
        <div class="card modal-box p-5">
          <div
            class="modal-icon"
            style="background: var(--neg-soft); color: var(--neg)"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"
              />
            </svg>
          </div>
          <h3
            class="font-display text-[15.5px] font-extrabold text-center mt-3"
          >
            Hapus transaksi ini?
          </h3>
          <p
            class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5"
            id="deleteConfirmDesc"
          >
            Tindakan ini tidak bisa dibatalkan.
          </p>
          <div class="flex gap-2.5 pt-4">
            <button type="button" id="btnDeleteCancel" class="btn-ghost flex-1">
              Batal
            </button>
            <button
              type="button"
              id="btnDeleteConfirm"
              class="btn-primary flex-1"
              style="background: var(--neg)"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div id="toast" class="hidden"></div>
    </div>

    <!-- ===================== PRINT-ONLY REPORT ===================== -->
    <div id="printArea">
      <div class="print-header">
        <h1>REKAP LAPORAN KEUANGAN OPERASIONAL</h1>
        <h2>KELOMPOK LATUKAN</h2>
        <p id="printPeriod"></p>
      </div>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Account</th>
            <th>Keterangan</th>
            <th class="num">Debet</th>
            <th class="num">Kredit</th>
            <th class="num">Saldo</th>
          </tr>
        </thead>
        <tbody id="printTableBody"></tbody>
        <tfoot>
          <tr>
            <td colspan="4">TOTAL PEMASUKAN</td>
            <td class="num" id="printTotalDebet">Rp 0</td>
            <td class="num">—</td>
            <td class="num">—</td>
          </tr>
          <tr>
            <td colspan="4">TOTAL PENGELUARAN</td>
            <td class="num">—</td>
            <td class="num" id="printTotalKredit">Rp 0</td>
            <td class="num">—</td>
          </tr>
          <tr class="print-total-saldo">
            <td colspan="4">SALDO AKHIR</td>
            <td class="num">—</td>
            <td class="num">—</td>
            <td class="num" id="printTotalSaldo">Rp 0</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ===================== SCRIPTS ===================== -->
    <!-- Urutan penting: session-gate lebih dulu (menentukan layar mana yang
         tampil), lalu main.js (state + logic + render), lalu role.js
         (didefinisikan sebelum dipakai oleh main.js), baru events.js yang
         mengikat semua tombol/form dan boot aplikasi. -->
    <script src="js/session-gate.js"></script>
    <script src="js/role.js"></script>
    <script src="js/main.js"></script>
    <script src="js/events.js"></script>
  </body>
</html>
