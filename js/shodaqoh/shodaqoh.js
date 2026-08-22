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
          min-width: 500px;
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
                width: 10%;
              ">Target</th>
              <th style="
                padding: 10px 8px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--ink-faint);
                text-align: right;
                width: 12%;
              ">Dibayar</th>
              <th style="
                padding: 10px 8px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--ink-faint);
                text-align: center;
                width: 11%;
              ">Status</th>
              <th style="
                padding: 10px 8px;
                font-size: 10px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--ink-faint);
                text-align: center;
                width: 11%;
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
  const overlay = document.getElementById("shodMemberDetailOverlay");
  overlay?.classList.add("loading");
  overlay?.classList.remove("hidden");

  try {
    const body = $("shodMemberDetailBody");
    if (body) {
      body.innerHTML = `
        ${[1, 2, 3, 4, 5]
          .map(
            () => `
          <tr class="skeleton-row">
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

    const session = getSession();
    const d = await apiPost({
      action: "getShodaqohMemberDetail",
      token: session?.token || "",
      memberId: memberId,
    });

    if (!d.success) throw new Error(d.message || "Gagal memuat detail anggota");

    overlay?.classList.remove("loading");

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
        const payments = d.payments || [];
        const paymentMap = {};
        payments.forEach(function (p) {
          paymentMap[p.payment_id] = p;

          if (p.susulan_rincian) {
            try {
              p.susulan_rincian_parsed = JSON.parse(p.susulan_rincian);
            } catch (e) {
              p.susulan_rincian_parsed = {};
            }
          } else {
            p.susulan_rincian_parsed = {};
          }

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
                paymentDate = o.allocated_at.slice(0, 7);
              }
            }

            const isLunas = o.status === "LUNAS" || o.status === "ACTIVE";
            const obStatusClass = isLunas ? "status-active" : "status-inactive";
            const obStatusLabel = isLunas ? "Lunas" : "Belum";

            let ir = 0;
            let uangSambung = 0;
            let jimpitan = 0;
            let siarSiar = 0;
            let seribuan = 0;
            let kafan = 0;
            let ukhroMt = 0;
            let susulanInfo = "";
            let hasSusulanRincian = false;

            if (o.payment_id && paymentMap[o.payment_id]) {
              const p = paymentMap[o.payment_id];

              const rincianKeys = Object.keys(p.susulan_rincian_parsed).filter(
                function (key) {
                  return p.susulan_rincian_parsed[key] > 0;
                },
              );
              hasSusulanRincian = rincianKeys.length > 0;

              if (hasSusulanRincian) {
                const totalIRPayment = rincianKeys.reduce(function (sum, key) {
                  return sum + p.susulan_rincian_parsed[key];
                }, 0);

                if (paymentDate === o.periode) {
                  ir = totalIRPayment;
                  if (rincianKeys.length > 1) {
                    const monthLabels = rincianKeys
                      .map(getShortMonthLabel)
                      .join(", ");
                    susulanInfo = `↻ ${monthLabels}`;
                  } else {
                    susulanInfo = "";
                  }
                } else {
                  const isInRincian = rincianKeys.some(function (key) {
                    return key === o.periode;
                  });

                  if (isInRincian) {
                    ir = 0;
                    susulanInfo = `✓ Dibayar di ${getShortMonthLabel(paymentDate)}`;
                  } else {
                    ir = 0;
                    susulanInfo = "";
                  }
                }
              } else {
                const susulanBulan = p.susulan_bulan_array || [];
                const totalIR = Number(p.susulan_ir) || 0;

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

              uangSambung = p.uang_sambung || 0;
              jimpitan = p.jimpitan || 0;
              siarSiar = p.siar_siar || 0;
              seribuan = p.seribuan || 0;
              kafan = p.kafan || 0;
              ukhroMt = p.ukhro_mt || 0;
            }

            if (!o.payment_id && isLunas) {
              ir = o.nominal_target || 0;
              susulanInfo = "";
            }

            const total =
              ir +
              uangSambung +
              jimpitan +
              siarSiar +
              seribuan +
              kafan +
              ukhroMt;

            const fmtNum = function (num) {
              return num > 0 ? "Rp" + num.toLocaleString("id-ID") : "—";
            };

            const totalColor = isLunas ? "var(--brand)" : "var(--ink-faint)";
            const totalWeight = isLunas ? "bold" : "normal";

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
