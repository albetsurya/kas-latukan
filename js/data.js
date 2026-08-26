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

  let chartWrapper = document.getElementById("chartWrapper");
  if (!chartWrapper) {
    // Cari berdasarkan canvas
    const canvas = document.getElementById("saldoChart");
    if (canvas) {
      const parent = canvas.closest(".card");
      if (parent) {
        parent.id = "chartWrapper";
        chartWrapper = parent;
      }
    }
  }

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

  // ✅ RENDER CHART DENGAN DELAY KECIL UNTUK MEMASTIKAN DOM SIAP
  setTimeout(function () {
    renderChart();
  }, 50);
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
