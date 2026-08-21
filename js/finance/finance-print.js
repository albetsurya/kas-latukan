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
