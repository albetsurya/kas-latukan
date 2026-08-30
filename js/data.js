function normalizeKasDate(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return String(value).trim();
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function normalizeKasTransaction(tx, index) {
  if (!tx || typeof tx !== "object") {
    return null;
  }
  return {
    no:
      tx.no !== undefined && tx.no !== null && tx.no !== ""
        ? Number(tx.no)
        : index + 1,
    tanggal: normalizeKasDate(tx.tanggal),
    account: String(tx.account ?? "").trim(),
    keterangan: String(tx.keterangan ?? "").trim(),
    debet: Number(tx.debet) || 0,
    kredit: Number(tx.kredit) || 0,
    saldo: Number(tx.saldo) || 0,
    createdBy: String(tx.createdBy ?? "").trim(),
  };
}

function normalizeKasData(data) {
  if (!data || typeof data !== "object") {
    return {
      success: false,
      saldoAwal: 0,
      totalDebet: 0,
      totalKredit: 0,
      saldoAkhir: 0,
      transactions: [],
    };
  }
  const rawTransactions = Array.isArray(data.transactions)
    ? data.transactions
    : [];
  const transactions = rawTransactions
    .map(function (tx, index) {
      return normalizeKasTransaction(tx, index);
    })
    .filter(Boolean)
    .filter(function (tx) {
      return tx.tanggal;
    });
  transactions.sort(function (a, b) {
    var dateCompare = a.tanggal.localeCompare(b.tanggal);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return (a.no || 0) - (b.no || 0);
  });
  return {
    success: data.success !== false,
    saldoAwal: Number(data.saldoAwal) || 0,
    totalDebet: Number(data.totalDebet) || 0,
    totalKredit: Number(data.totalKredit) || 0,
    saldoAkhir:
      data.saldoAkhir !== undefined &&
      data.saldoAkhir !== null &&
      data.saldoAkhir !== ""
        ? Number(data.saldoAkhir) || 0
        : transactions.length
          ? transactions[transactions.length - 1].saldo
          : Number(data.saldoAwal) || 0,
    transactions: transactions,
  };
}

function updateLastSyncTime() {
  var now = new Date();
  var timeString = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  var lastSyncEl = document.getElementById("lastSync");
  var lastSyncProfileEl = document.getElementById("lastSyncProfile");
  if (lastSyncEl) {
    lastSyncEl.textContent = "tersinkron " + timeString;
  }
  if (lastSyncProfileEl) {
    lastSyncProfileEl.textContent = timeString;
  }
}

async function refreshAllData() {
  try {
    var data = await apiGet();
    var normalized = normalizeKasData(data);
    if (!normalized.success) {
      throw new Error(data?.message || "Gagal mengambil data kas.");
    }
    state.saldoAwal = normalized.saldoAwal;
    state.totalDebet = normalized.totalDebet;
    state.totalKredit = normalized.totalKredit;
    state.saldoAkhir = normalized.saldoAkhir;
    state.transactions = normalized.transactions;
    var availableMonths = [];
    var monthSet = {};
    state.transactions.forEach(function (t) {
      var key = getMonthKey(t.tanggal);
      if (key && !monthSet[key]) {
        monthSet[key] = true;
        availableMonths.push(key);
      }
    });
    if (
      state.selectedMonth !== "all" &&
      availableMonths.indexOf(state.selectedMonth) === -1
    ) {
      state.selectedMonth = "all";
    }
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
    await refreshAllData();
    if (state.shodaqoh.loaded || state.activeTab === "shodaqoh") {
      var monthKey = state.shodaqoh.selectedMonth || "";
      await loadShodaqohData(monthKey);
    }
    updateLastSyncTime();
  } catch (err) {
    console.error(err);
    showToast("Gagal refresh data: " + err.message, "error");
  }
}

var isSyncing = false;

async function manualSync() {
  if (isSyncing) {
    showToast("Sinkronisasi sedang berjalan...", "info");
    return;
  }
  var btn = document.getElementById("btnRefresh");
  if (!btn) return;
  isSyncing = true;
  btn.classList.add("syncing", "spin");
  btn.disabled = true;
  var originalHtml = btn.innerHTML;
  btn.innerHTML =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v6h-6" /></svg>';
  try {
    await refreshAllDataWithShodaqoh();
    showToast("Data berhasil disinkronkan!", "success");
  } catch (err) {
    console.error(err);
    showToast("Gagal sinkron: " + err.message, "error");
  } finally {
    isSyncing = false;
    btn.classList.remove("syncing", "spin");
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

var loadDataPromise = null;

async function loadData() {
  if (loadDataPromise) {
    return loadDataPromise;
  }
  loadDataPromise = (async function () {
    try {
      if (!document.documentElement.classList.contains("authenticated")) {
        console.warn("loadData dipanggil tanpa authenticated");
        return;
      }
      if (CONFIG.WEB_APP_URL.includes("GANTI_DENGAN")) {
        if ($("configWarning")) {
          $("configWarning").classList.remove("hidden");
        }
        renderTxList([], "txList", "txEmpty");
        return;
      }
      renderHomeSkeleton();
      renderHistorySkeleton();
      renderRecapSkeleton();
      await refreshAllData();
      updateLastSyncTime();
    } finally {
      loadDataPromise = null;
    }
  })();
  return loadDataPromise;
}

function getMonthsDesc() {
  var months = [];
  var monthSet = {};
  state.transactions.forEach(function (t) {
    var key = getMonthKey(t.tanggal);
    if (key && !monthSet[key]) {
      monthSet[key] = true;
      months.push(key);
    }
  });
  return months.sort().reverse();
}

function getMonthDropdownRefs(prefix) {
  return {
    dropdown: $(prefix + "MonthDropdown"),
    trigger: $(prefix + "MonthDropdownTrigger"),
    value: $(prefix + "MonthDropdownValue"),
    menu: $(prefix + "MonthDropdownMenu"),
  };
}

function closeMonthDropdown(prefix) {
  var refs = getMonthDropdownRefs(prefix);
  if (!refs.dropdown) return;
  refs.dropdown.classList.remove("open");
  if (refs.trigger) {
    refs.trigger.setAttribute("aria-expanded", "false");
  }
}

function closeAllMonthDropdowns() {
  closeMonthDropdown("home");
  closeMonthDropdown("history");
  closeMonthDropdown("shodaqoh");
}

function toggleMonthDropdown(prefix) {
  var refs = getMonthDropdownRefs(prefix);
  if (!refs.dropdown) return;
  var willOpen = !refs.dropdown.classList.contains("open");
  closeAllMonthDropdowns();
  refs.dropdown.classList.toggle("open", willOpen);
  if (refs.trigger) {
    refs.trigger.setAttribute("aria-expanded", String(willOpen));
  }
}

function renderMonthDropdown(prefix, months) {
  var refs = getMonthDropdownRefs(prefix);
  if (!refs.trigger || !refs.value || !refs.menu) return;
  refs.value.textContent = getMonthLabel(state.selectedMonth);
  var allMonths = ["all"].concat(months);
  refs.menu.innerHTML = allMonths
    .map(function (m) {
      var active = m === state.selectedMonth ? "active" : "";
      var checked = m === state.selectedMonth;
      return (
        '<button type="button" class="month-dropdown-option ' +
        active +
        '" data-month="' +
        m +
        '" role="option" aria-selected="' +
        checked +
        '"><span class="month-dropdown-check" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m5 12 4 4L19 6"></path></svg></span><span>' +
        getMonthLabel(m) +
        "</span></button>"
      );
    })
    .join("");
  refs.trigger.onclick = function (event) {
    event.stopPropagation();
    toggleMonthDropdown(prefix);
  };
  refs.menu
    .querySelectorAll(".month-dropdown-option")
    .forEach(function (option) {
      option.onclick = function (event) {
        event.stopPropagation();
        state.selectedMonth = option.dataset.month;
        closeAllMonthDropdowns();
        renderAllMonthDropdowns();
        refreshScopedUI();
      };
    });
}

function renderAllMonthDropdowns() {
  var months = getMonthsDesc();
  if (
    months.indexOf(state.selectedMonth) === -1 &&
    state.selectedMonth !== "all"
  ) {
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
  var chartWrapper = document.getElementById("chartWrapper");
  if (!chartWrapper) {
    var canvas = document.getElementById("saldoChart");
    if (canvas) {
      var parent = canvas.closest(".card");
      if (parent) {
        parent.id = "chartWrapper";
        chartWrapper = parent;
      }
    }
  }
  if (chartWrapper) {
    var skeleton = chartWrapper.querySelector(".chart-skeleton");
    if (skeleton) skeleton.remove();
    var canvas = chartWrapper.querySelector("#saldoChart");
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
  var all = state.transactions;
  var monthTx = all.filter(function (t) {
    return getMonthKey(t.tanggal) === monthKey;
  });
  var before = all.filter(function (t) {
    return getMonthKey(t.tanggal) < monthKey;
  });
  var awal = before.length ? before[before.length - 1].saldo : state.saldoAwal;
  var debet = 0;
  var kredit = 0;
  monthTx.forEach(function (t) {
    if (!isSaldoAwalRow(t)) {
      debet += t.debet;
      kredit += t.kredit;
    }
  });
  var akhir = monthTx.length ? monthTx[monthTx.length - 1].saldo : awal;
  return {
    awal: awal,
    debet: debet,
    kredit: kredit,
    akhir: akhir,
    list: monthTx,
  };
}

function computeMonthlySeries() {
  var months = [];
  var monthSet = {};
  state.transactions.forEach(function (t) {
    var key = getMonthKey(t.tanggal);
    if (key && !monthSet[key]) {
      monthSet[key] = true;
      months.push(key);
    }
  });
  months.sort();
  var labels = [];
  var data = [];
  months.forEach(function (m) {
    var monthTx = state.transactions.filter(function (t) {
      return getMonthKey(t.tanggal) === m;
    });
    if (!monthTx.length) return;
    labels.push(getMonthShortLabel(m));
    data.push(monthTx[monthTx.length - 1].saldo);
  });
  return {
    labels: labels,
    data: data,
  };
}

function renderRecapList() {
  var months = getMonthsDesc();
  var wrap = $("recapList");
  if (!wrap) return;
  if (!months.length) {
    wrap.innerHTML =
      '<div class="card p-6 text-center text-[color:var(--ink-faint)] text-xs">Belum ada transaksi.</div>';
    return;
  }
  wrap.innerHTML = months
    .map(function (m) {
      var s = computeScope(m);
      var parts = m.split("-");
      var year = Number(parts[0]);
      var month = Number(parts[1]);
      var nextMonthDate = new Date(year, month, 1);
      var nextMonthKey =
        nextMonthDate.getFullYear() +
        "-" +
        String(nextMonthDate.getMonth() + 1).padStart(2, "0");
      var adminButton = state.isAdmin
        ? '<div class="mt-3 pt-3" style="border-top:1px solid var(--line);"><button type="button" class="btn-carry-forward w-full flex items-center justify-center gap-1.5" data-month="' +
          m +
          '" data-next-month="' +
          nextMonthKey +
          '" style="padding:4px 12px;border:1.5px solid var(--pos);border-radius:6px;background:transparent;color:var(--pos);font-size:10px;font-weight:600;font-family:\'Plus Jakarta Sans\',sans-serif;cursor:pointer;transition:all 0.15s ease;width:100%;" onmouseover="this.style.background=\'var(--pos-soft)\'" onmouseout="this.style.background=\'transparent\'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--pos)" stroke-width="2.2" style="flex-shrink:0;"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg><span>Saldo Awal ' +
          getMonthLabel(nextMonthKey) +
          "</span></button></div>"
        : "";
      return (
        '<div class="card p-4 recap-card" data-month="' +
        m +
        '"><button type="button" class="w-full text-left recap-open-history" data-month="' +
        m +
        '"><div class="flex items-center justify-between"><p class="font-display font-extrabold text-[13.5px]">' +
        getMonthLabel(m) +
        '</p><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg></div><div class="grid grid-cols-3 gap-2 mt-3"><div><p class="eyebrow" style="font-size:9.5px">Masuk</p><p class="mono text-[11.5px] font-bold mt-0.5" style="color:var(--pos)">' +
        fmtRp(s.debet) +
        '</p></div><div><p class="eyebrow" style="font-size:9.5px">Keluar</p><p class="mono text-[11.5px] font-bold mt-0.5" style="color:var(--neg)">' +
        fmtRp(s.kredit) +
        '</p></div><div><p class="eyebrow" style="font-size:9.5px">Akhir</p><p class="mono text-[11.5px] font-bold mt-0.5">' +
        fmtRp(s.akhir) +
        "</p></div></div></button>" +
        adminButton +
        "</div>"
      );
    })
    .join("");
  wrap.querySelectorAll(".recap-open-history").forEach(function (button) {
    button.addEventListener("click", function () {
      state.selectedMonth = button.dataset.month;
      renderAllMonthChipRows();
      refreshScopedUI();
      switchTab("history");
    });
  });
  wrap.querySelectorAll(".btn-carry-forward").forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.stopPropagation();
      openCarryForwardConfirm(button.dataset.month, button.dataset.nextMonth);
    });
  });
}

function openCarryForwardConfirm(monthKey, nextMonthKey) {
  if (!monthKey || !nextMonthKey) return;
  var scope = computeScope(monthKey);
  state.carryForwardMonth = monthKey;
  state.carryForwardNextMonth = nextMonthKey;
  if ($("carryForwardDesc")) {
    $("carryForwardDesc").textContent =
      "Saldo akhir " +
      getMonthLabel(monthKey) +
      " sebesar " +
      fmtRp(scope.akhir) +
      " akan dijadikan Saldo Awal " +
      getMonthLabel(nextMonthKey) +
      ". Lanjutkan?";
  }
  var overlay = $("carryForwardOverlay");
  if (overlay) overlay.classList.remove("hidden");
}

function renderHome() {
  var scope = computeScope(state.selectedMonth);
  updateHeroCardLabel(state.selectedMonth === "all" ? "all" : "monthly");
  var el = $("homeSaldoAkhir");
  if (el) el.textContent = fmtRp(scope.akhir);
  el = $("homePeriodeText");
  if (el) {
    el.textContent =
      state.selectedMonth === "all"
        ? getPeriodRangeLabel()
        : getMonthLabel(state.selectedMonth);
  }
  el = $("homeTotalTx");
  if (el) el.textContent = scope.list.length + " transaksi";
  el = $("homeSaldoAwal");
  if (el) el.textContent = fmtRp(scope.awal);
  el = $("homeDebet");
  if (el) el.textContent = fmtRp(scope.debet);
  el = $("homeKredit");
  if (el) el.textContent = fmtRp(scope.kredit);
  var selisih = scope.debet - scope.kredit;
  var surplusEl = $("homeSurplus");
  var badgeEl = $("homeSurplusBadge");
  var labelEl = $("homeSurplusLabel");
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
  var recent = scope.list.slice(-5).reverse();
  renderTxList(recent, "homeRecentList", null, { compact: true });
  setTimeout(function () {
    renderChart();
  }, 50);
}

function renderSummaryHistory(scope, monthKey) {
  var el = $("rySaldoAwal");
  if (el) el.textContent = fmtRp(scope.awal);
  el = $("rySaldoAkhir");
  if (el) el.textContent = fmtRp(scope.akhir);
  el = $("periodHint");
  if (el) {
    el.textContent =
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
  var specialUpper = new Set([
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
  var lowerWords = new Set([
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
    .map(function (word, index) {
      var upperWord = word.toUpperCase();
      var cleanUpper = upperWord.replace(/[^A-Z0-9]/g, "");
      if (specialUpper.has(cleanUpper)) return upperWord;
      var hasNoVowels = !/[AEIOU]/.test(cleanUpper);
      if (cleanUpper.length >= 2 && cleanUpper.length <= 4 && hasNoVowels) {
        return upperWord;
      }
      var lowerWord = word.toLowerCase();
      if (index > 0 && lowerWords.has(lowerWord)) {
        return lowerWord;
      }
      return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
    })
    .join(" ");
}

function renderTxList(rows, containerId, emptyId, opts) {
  opts = opts || {};
  var body = $(containerId);
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
    .map(function (t) {
      var isAwal = isSaldoAwalRow(t);
      var isDebet = Number(t.debet) > 0;
      var amount = isDebet ? t.debet : t.kredit;
      var amountColor = isAwal
        ? "var(--ink-soft)"
        : isDebet
          ? "var(--pos)"
          : "var(--neg)";
      var amountPrefix = isAwal ? "" : isDebet ? "+" : "-";
      var iconBg = isAwal
        ? "var(--gold-soft)"
        : isDebet
          ? "var(--pos-soft)"
          : "var(--neg-soft)";
      var icon = isAwal
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.3"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>'
        : txIconSvg(isDebet);
      var isClickable = state.isAdmin === true;
      var chevron = isClickable
        ? '<svg class="tx-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>'
        : "";
      var clickAttr = isClickable
        ? ' data-no="' + t.no + '" role="button" tabindex="0"'
        : "";
      return (
        '<div class="tx-card' +
        (isClickable ? " tx-card-clickable" : "") +
        '"' +
        clickAttr +
        '><div class="tx-icon" style="background:' +
        iconBg +
        '">' +
        icon +
        '</div><div class="flex-1 min-w-0"><p class="tx-title">' +
        escapeHtml(toTitleCase(t.keterangan)) +
        '</p><p class="tx-sub">' +
        escapeHtml(toTitleCase(t.account)) +
        '</p><p class="tx-meta">' +
        fmtDateShort(t.tanggal) +
        (t.createdBy ? " · " + escapeHtml(t.createdBy) : "") +
        '</p></div><div class="text-right flex-shrink-0"><p class="tx-amount mono" style="color:' +
        amountColor +
        '">' +
        amountPrefix +
        fmtRp(amount) +
        '</p><p class="text-[9.5px] mono text-[color:var(--ink-faint)] mt-0.5">' +
        fmtRp(t.saldo) +
        "</p></div>" +
        chevron +
        "</div>"
      );
    })
    .join("");
}
