// ============================================================
// PRINT LAPORAN KEUANGAN
// ============================================================

function buildPrintTable(rows) {
  const body = document.getElementById("printTableBody");
  if (!body) return;

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

function groupByAccount(rows, type) {
  const grouped = {};

  rows.forEach((t) => {
    const amount = Number(t[type]) || 0;
    if (amount === 0) return;

    const key =
      t.account && t.account.trim()
        ? t.account.trim().toLowerCase()
        : t.keterangan
          ? t.keterangan.trim().toLowerCase()
          : "lainnya";

    if (!grouped[key]) {
      grouped[key] = {
        account: t.account || t.keterangan || "Lainnya",
        total: 0,
        items: [],
        tanggal: t.tanggal,
      };
    }
    grouped[key].total += amount;
    grouped[key].items.push(t);
  });

  return grouped;
}

function buildLaporanKas(rows, saldoAwal) {
  const body = document.getElementById("printLaporanBody");
  if (!body) return;

  const periodEl = document.getElementById("printLaporanPeriod");
  if (periodEl) {
    const monthKey = state.selectedMonth || "all";
    const label =
      monthKey === "all" ? getPeriodRangeLabel() : getMonthLabel(monthKey);

    const parts = label.split(" ");
    if (parts.length === 2) {
      periodEl.textContent = `BULAN: ${parts[0].toUpperCase()} TAHUN: ${parts[1]}`;
    } else {
      periodEl.textContent = `PERIODE: ${label.toUpperCase()}`;
    }
  }

  if (!rows || rows.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;font-size:9px;">
          TIDAK ADA TRANSAKSI UNTUK PERIODE INI.
        </td>
      </tr>
    `;
    return;
  }

  const saldoAwalTrans = rows.find((t) => {
    return (
      (t.keterangan && t.keterangan.toUpperCase().includes("SALDO AWAL")) ||
      (t.account && t.account.toUpperCase().includes("SALDO AWAL"))
    );
  });

  let saldoAwalValue = saldoAwal;
  if (saldoAwalTrans) {
    saldoAwalValue =
      Number(saldoAwalTrans.saldo) || Number(saldoAwalTrans.debet) || saldoAwal;
  }

  const penerimaan = rows.filter((t) => {
    const isSaldoAwal =
      (t.keterangan && t.keterangan.toUpperCase().includes("SALDO AWAL")) ||
      (t.account && t.account.toUpperCase().includes("SALDO AWAL"));
    return !isSaldoAwal && (Number(t.debet) || 0) > 0;
  });

  const pengeluaran = rows.filter((t) => (Number(t.kredit) || 0) > 0);

  const groupedPenerimaan = {};
  penerimaan.forEach((t) => {
    const key = t.account
      ? t.account.trim().toUpperCase()
      : t.keterangan
        ? t.keterangan.trim().toUpperCase()
        : "LAINNYA";
    if (!groupedPenerimaan[key]) {
      groupedPenerimaan[key] = {
        account: (t.account || t.keterangan || "Lainnya").toUpperCase(),
        total: 0,
        tanggal: t.tanggal,
      };
    }
    groupedPenerimaan[key].total += Number(t.debet) || 0;
  });

  const groupedPengeluaran = {};
  pengeluaran.forEach((t) => {
    const key = t.account
      ? t.account.trim().toUpperCase()
      : t.keterangan
        ? t.keterangan.trim().toUpperCase()
        : "LAINNYA";
    if (!groupedPengeluaran[key]) {
      groupedPengeluaran[key] = {
        account: (t.account || t.keterangan || "Lainnya").toUpperCase(),
        total: 0,
        tanggal: t.tanggal,
      };
    }
    groupedPengeluaran[key].total += Number(t.kredit) || 0;
  });

  const totalDebet = Object.values(groupedPenerimaan).reduce(
    (sum, g) => sum + g.total,
    0,
  );
  const totalKredit = Object.values(groupedPengeluaran).reduce(
    (sum, g) => sum + g.total,
    0,
  );
  const saldoBulan = totalDebet - totalKredit;
  const saldoAkhir = saldoAwalValue + saldoBulan;

  let html = "";

  html += `
    <tr class="row-saldo-awal">
      <td></td>
      <td>SALDO AWAL</td>
      <td></td>
      <td></td>
      <td class="num">${fmtRp(saldoAwalValue)}</td>
    </tr>
  `;

  html += `<tr class="spacer"><td colspan="5"></td></tr>`;

  html += `
    <tr class="row-category">
      <td></td>
      <td><strong>PENERIMAAN</strong></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  `;

  const penerimaanKeys = Object.keys(groupedPenerimaan);
  if (penerimaanKeys.length === 0) {
    html += `
      <tr>
        <td colspan="5" style="text-align:center;color:#94a3b8;font-style:italic;padding:4px 6px;">
          TIDAK ADA PENERIMAAN
        </td>
      </tr>
    `;
  } else {
    penerimaanKeys.sort(
      (a, b) => groupedPenerimaan[b].total - groupedPenerimaan[a].total,
    );

    penerimaanKeys.forEach((key) => {
      const g = groupedPenerimaan[key];

      html += `
        <tr>
          <td></td>
          <td>${g.account}</td>
          <td class="num">${fmtRp(g.total)}</td>
          <td></td>
          <td></td>
        </tr>
      `;
    });
  }

  html += `<tr class="spacer"><td colspan="5"></td></tr>`;

  html += `
    <tr class="row-category">
      <td></td>
      <td><strong>PENGELUARAN</strong></td>
      <td></td>
      <td></td>
      <td></td>
    </tr>
  `;

  const pengeluaranKeys = Object.keys(groupedPengeluaran);
  if (pengeluaranKeys.length === 0) {
    html += `
      <tr>
        <td colspan="5" style="text-align:center;color:#94a3b8;font-style:italic;padding:4px 6px;">
          TIDAK ADA PENGELUARAN
        </td>
      </tr>
    `;
  } else {
    pengeluaranKeys.sort(
      (a, b) => groupedPengeluaran[b].total - groupedPengeluaran[a].total,
    );

    pengeluaranKeys.forEach((key) => {
      const g = groupedPengeluaran[key];

      html += `
        <tr>
          <td></td>
          <td>${g.account}</td>
          <td></td>
          <td class="num">${fmtRp(g.total)}</td>
          <td></td>
        </tr>
      `;
    });
  }

  html += `<tr class="spacer"><td colspan="5"></td></tr>`;

  html += `
    <tr class="row-total">
      <td></td>
      <td><strong>JUMLAH</strong></td>
      <td class="num"><strong>${fmtRp(totalDebet)}</strong></td>
      <td class="num"><strong>${fmtRp(totalKredit)}</strong></td>
      <td></td>
    </tr>
  `;

  html += `<tr class="spacer"><td colspan="5"></td></tr>`;

  html += `
    <tr class="row-saldo-bulan">
      <td></td>
      <td><strong>SALDO BULAN</strong></td>
      <td></td>
      <td></td>
      <td class="num"><strong>${fmtRp(saldoBulan)}</strong></td>
    </tr>
  `;

  html += `
    <tr class="row-saldo-akhir">
      <td></td>
      <td><strong>SALDO AKHIR</strong></td>
      <td></td>
      <td></td>
      <td class="num"><strong>${fmtRp(saldoAkhir)}</strong></td>
    </tr>
  `;

  body.innerHTML = html;
}

function printLaporanKas() {
  const area = document.getElementById("printLaporanArea");
  if (!area) {
    toast("Area print tidak ditemukan", "error");
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

  rows = [...rows].sort((a, b) => {
    if (a.tanggal < b.tanggal) return -1;
    if (a.tanggal > b.tanggal) return 1;
    return 0;
  });

  let saldoAwal = scope.saldoAwal || 0;

  const saldoAwalTrans = rows.find((t) => {
    return (
      (t.keterangan && t.keterangan.toUpperCase().includes("SALDO AWAL")) ||
      (t.account && t.account.toUpperCase().includes("SALDO AWAL"))
    );
  });

  if (saldoAwalTrans) {
    saldoAwal =
      Number(saldoAwalTrans.saldo) || Number(saldoAwalTrans.debet) || saldoAwal;
  }

  buildLaporanKas(rows, saldoAwal);

  document.body.classList.add("printing-laporan");

  const restore = () => {
    document.body.classList.remove("printing-laporan");
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
  area.style.zIndex = "999997";
  area.style.background = "white";
  area.style.width = "100%";
  area.style.height = "100%";

  void area.offsetHeight;

  window.addEventListener("afterprint", restore, { once: true });

  window.print();

  setTimeout(restore, 2000);
}

document.addEventListener("DOMContentLoaded", function () {
  const dropdownBtn = document.getElementById("btnPrintDropdown");
  const dropdownMenu = document.getElementById("printDropdownMenu");

  if (dropdownBtn && dropdownMenu) {
    dropdownBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = dropdownMenu.classList.contains("hidden");
      dropdownMenu.classList.toggle("hidden");
      dropdownBtn.setAttribute("aria-expanded", isOpen);
    });

    document.addEventListener("click", function (e) {
      if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add("hidden");
        dropdownBtn.setAttribute("aria-expanded", "false");
      }
    });

    dropdownMenu.querySelectorAll(".print-dropdown-item").forEach((item) => {
      item.addEventListener("click", function () {
        dropdownMenu.classList.add("hidden");
        dropdownBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  const btnPrintLaporan = document.getElementById("btnPrintLaporan");
  if (btnPrintLaporan) {
    btnPrintLaporan.addEventListener("click", printLaporanKas);
  }
});
