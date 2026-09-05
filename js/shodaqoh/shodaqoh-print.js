function setPrintPageSize(sizeValue) {
  removePrintPageSize();
  const style = document.createElement("style");
  style.id = "dynamicPrintPageSize";
  style.textContent = `@media print { @page { size: ${sizeValue}; margin: 0.4cm; } }`;
  document.head.appendChild(style);
}

function removePrintPageSize() {
  const el = document.getElementById("dynamicPrintPageSize");
  if (el) el.remove();
}

function runShodaqohAreaPrint(area, pageSize) {
  const prevDisplay = area.style.display;
  area.style.display = "block";
  area.style.position = "fixed";
  area.style.left = "-9999px";
  area.style.top = "0";
  area.style.zIndex = "999999";
  area.style.background = "white";
  area.style.width = "100%";
  area.style.height = "100%";

  void area.offsetHeight;

  setPrintPageSize(pageSize || "A4 landscape");

  const restore = () => {
    area.style.display = prevDisplay || "none";
    area.style.position = "";
    area.style.left = "";
    area.style.top = "";
    area.style.zIndex = "";
    area.style.background = "";
    area.style.width = "";
    area.style.height = "";

    document.body.classList.remove("printing-shodaqoh");
    removePrintPageSize();
  };

  document.body.classList.add("printing-shodaqoh");
  window.print();
  window.removeEventListener("afterprint", restore);
  window.addEventListener("afterprint", restore, { once: true });
  setTimeout(restore, 2000);
}

// ============================================================
// HELPER: ambil daftar member sesuai urutan sheet Shodaqoh_Members
// Prioritas: state.shodaqoh.monitoring (member aktif, urutan sheet,
// sudah mengandung info payment_id per bulan terpilih).
// Fallback: state.shodaqoh.members (semua member, urutan sheet).
// ============================================================
function getShodaqohMemberRowSource() {
  const monitoring = state.shodaqoh.monitoring;
  if (Array.isArray(monitoring) && monitoring.length > 0) {
    return monitoring.map(function (m) {
      return {
        member_id: m.member_id,
        nama: m.nama,
        payment_id: m.payment_id || "",
      };
    });
  }

  const members = state.shodaqoh.members || [];
  return members.map(function (m) {
    return { member_id: m.member_id, nama: m.nama, payment_id: "" };
  });
}

// ============================================================
// HELPER: bangun map payment_id -> payment (data lengkap)
// dan map member_id -> payment (fallback jika payment_id kosong
// tapi ada payment langsung di bulan tsb via filter tanggal)
// ============================================================
function buildShodaqohPaymentLookup(monthKey) {
  const allPayments = state.shodaqoh.payments || [];
  const byId = {};
  const byMemberForMonth = {};

  allPayments.forEach(function (p) {
    if (p.payment_id) byId[p.payment_id] = p;
    if (String(p.tanggal).slice(0, 7) === monthKey && p.member_id) {
      byMemberForMonth[p.member_id] = p;
    }
  });

  return { byId, byMemberForMonth };
}

function printShodaqohReport() {
  const monthKey = state.shodaqoh.selectedMonth;
  if (!monthKey) {
    showToast("Pilih bulan terlebih dahulu.", "error");
    return;
  }

  const memberRows = getShodaqohMemberRowSource();
  if (memberRows.length === 0) {
    showToast("Belum ada data anggota shodaqoh.", "error");
    return;
  }

  const area = document.getElementById("printShodaqohArea");
  if (!area) return;

  const titleEl = document.getElementById("printShodaqohTitle");
  if (titleEl) titleEl.textContent = "REKAP SHODAQOH BULANAN";

  const periodEl = document.getElementById("printShodaqohPeriod");
  if (periodEl) {
    periodEl.textContent = "Periode: " + getMonthLabel(monthKey);
  }

  const { byId, byMemberForMonth } = buildShodaqohPaymentLookup(monthKey);

  // Resolusi payment penuh untuk tiap baris member
  const resolvedRows = memberRows.map(function (m) {
    let payment = null;
    if (m.payment_id && byId[m.payment_id]) {
      payment = byId[m.payment_id];
    } else if (byMemberForMonth[m.member_id]) {
      payment = byMemberForMonth[m.member_id];
    }
    return { member_id: m.member_id, nama: m.nama, payment: payment };
  });

  // Kumpulkan semua bulan susulan unik (maks 3 bulan terbaru) dari payment yang ada
  let allSusulanMonths = new Set();
  resolvedRows.forEach(function (r) {
    const p = r.payment;
    if (p && p.susulan_bulan) {
      let bulanArray = [];
      if (typeof p.susulan_bulan === "string") {
        bulanArray = p.susulan_bulan.split(",").filter(Boolean);
      } else if (Array.isArray(p.susulan_bulan)) {
        bulanArray = p.susulan_bulan;
      }
      bulanArray.forEach(function (key) {
        if (key.length === 7) allSusulanMonths.add(key);
      });
    }
  });

  let sortedSusulanMonths = Array.from(allSusulanMonths).sort().reverse();
  if (sortedSusulanMonths.length > 3) {
    sortedSusulanMonths = sortedSusulanMonths.slice(0, 3);
  }
  let displaySusulanMonths = [...sortedSusulanMonths].reverse();

  const thead = document.getElementById("printShodaqohHead");
  const body = document.getElementById("printShodaqohBody");
  const tfoot = document.getElementById("printShodaqohFoot");
  if (!thead || !body || !tfoot) return;

  const table = document.getElementById("printShodaqohTable");
  if (table) {
    let colgroupHTML = `
      <col class="col-no" />
      <col class="col-nama" />
    `;

    displaySusulanMonths.forEach(function () {
      colgroupHTML += `<col class="col-ir" />`;
    });

    colgroupHTML += `
      <col class="col-sambung" />
      <col class="col-jimpitan" />
      <col class="col-siar" />
      <col class="col-seribuan" />
      <col class="col-kafan" />
      <col class="col-ukhro" />
      <col class="col-total" />
    `;

    const oldColgroup = table.querySelector("colgroup");
    if (oldColgroup) {
      oldColgroup.innerHTML = colgroupHTML;
    }
  }

  let totalIr = {};
  let totalSambung = 0,
    totalJimpitan = 0,
    totalSiar = 0;
  let totalSeribuan = 0,
    totalKafan = 0,
    totalUkhro = 0,
    grandTotal = 0;

  displaySusulanMonths.forEach(function (m) {
    totalIr[m] = 0;
  });

  let headerHTML = "";

  headerHTML += `<tr>`;
  headerHTML += `<th rowspan="2" style="text-align:left;width:3%;">No</th>`;
  headerHTML += `<th rowspan="2" style="text-align:left;width:16%;">Nama Anggota</th>`;

  const irColspan =
    displaySusulanMonths.length > 0 ? displaySusulanMonths.length : 1;
  headerHTML += `<th colspan="${irColspan}" style="text-align:center;width:${irColspan * 12}%;">Infak IR (Susulan)</th>`;

  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Uang Sambung</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Jimpitan</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Siar-siar</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Seribuan</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Kafan</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Ukhro MT</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:9%;">Total</th>`;
  headerHTML += `</tr>`;

  headerHTML += `<tr>`;

  if (displaySusulanMonths.length > 0) {
    displaySusulanMonths.forEach(function (key) {
      const y = key.slice(2, 4);
      const m = parseInt(key.slice(5, 7));
      const monthNames = [
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
      headerHTML += `<th style="text-align:right;width:12%;">${monthNames[m - 1]}'${y}</th>`;
    });
  } else {
    headerHTML += `<th style="text-align:right;width:12%;">—</th>`;
  }
  headerHTML += `</tr>`;

  // 6. BANGUN BODY TABEL — SEMUA MEMBER, URUTAN SESUAI SHEET
  let bodyHTML = resolvedRows
    .map(function (r, idx) {
      const no = idx + 1;
      const nama = r.nama || "-";
      const p = r.payment;

      const sambung = p ? Number(p.uang_sambung || 0) : 0;
      const jimpitan = p ? Number(p.jimpitan || 0) : 0;
      const siar = p ? Number(p.siar_siar || 0) : 0;
      const seribuan = p ? Number(p.seribuan || 0) : 0;
      const kafan = p ? Number(p.kafan || 0) : 0;
      const ukhro = p ? Number(p.ukhro_mt || 0) : 0;

      let irData = {};
      if (p && p.susulan_bulan) {
        let bulanArray = [];
        if (typeof p.susulan_bulan === "string") {
          bulanArray = p.susulan_bulan.split(",").filter(Boolean);
        } else if (Array.isArray(p.susulan_bulan)) {
          bulanArray = p.susulan_bulan;
        }

        if (bulanArray.length > 0) {
          const totalIR = Number(p.susulan_ir || 0);
          let irPerBulan = Math.round(totalIR / bulanArray.length);

          bulanArray.forEach(function (key) {
            if (key.length === 7 && displaySusulanMonths.includes(key)) {
              irData[key] = irPerBulan;
              if (totalIr[key] !== undefined) {
                totalIr[key] += irPerBulan;
              }
            }
          });
        }
      }

      let rowHTML = `<tr>
        <td style="text-align:left;padding:6px 4px;font-size:9.5px;">${no}</td>
        <td style="text-align:left;padding:6px 4px;font-size:9.5px;">${escapeHtml(nama)}</td>`;

      displaySusulanMonths.forEach(function (key) {
        let val = irData[key] || 0;
        rowHTML += `<td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${val > 0 ? fmtRp(val) : "—"}</td>`;
      });

      rowHTML += `
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${sambung > 0 ? fmtRp(sambung) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${jimpitan > 0 ? fmtRp(jimpitan) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${siar > 0 ? fmtRp(siar) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${seribuan > 0 ? fmtRp(seribuan) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${kafan > 0 ? fmtRp(kafan) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${ukhro > 0 ? fmtRp(ukhro) : "—"}</td>`;

      let total = sambung + jimpitan + siar + seribuan + kafan + ukhro;
      displaySusulanMonths.forEach(function (key) {
        total += irData[key] || 0;
      });

      rowHTML += `<td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${total > 0 ? fmtRp(total) : "—"}</td>
      </tr>`;

      totalSambung += sambung;
      totalJimpitan += jimpitan;
      totalSiar += siar;
      totalSeribuan += seribuan;
      totalKafan += kafan;
      totalUkhro += ukhro;
      grandTotal += total;

      return rowHTML;
    })
    .join("");

  let footerHTML = "";

  footerHTML += `<tr class="print-total-saldo">`;
  footerHTML += `<td colspan="2" class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">TOTAL KESELURUHAN</td>`;

  displaySusulanMonths.forEach(function (key) {
    footerHTML += `<td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${totalIr[key] > 0 ? fmtRp(totalIr[key]) : "—"}</td>`;
  });

  footerHTML += `
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalSambung)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalJimpitan)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalSiar)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalSeribuan)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalKafan)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(totalUkhro)}</td>
    <td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(grandTotal)}</td>
  `;
  footerHTML += `</tr>`;

  if (displaySusulanMonths.length > 0) {
    footerHTML += `<tr class="print-grand-total-ir" style="background: #e8f5e9 !important;">`;
    footerHTML += `<td colspan="2" class="num font-bold" style="background: #e8f5e9 !important; color: #1e293b !important; text-align:right;padding:6px 4px;font-size:9.5px;">GRAND TOTAL IR</td>`;

    displaySusulanMonths.forEach(function (key) {
      footerHTML += `<td class="num font-bold" style="background: #e8f5e9 !important; color: #1e293b !important; text-align:right;padding:6px 4px;font-size:9.5px; border-top: 2px solid #16a34a;">${totalIr[key] > 0 ? fmtRp(totalIr[key]) : "—"}</td>`;
    });

    const otherCols = 7;
    footerHTML += `<td colspan="${otherCols}" style="background: #e8f5e9 !important; border-top: 2px solid #16a34a; padding:6px 4px;"></td>`;
    footerHTML += `</tr>`;
  }

  thead.innerHTML = headerHTML;
  body.innerHTML = bodyHTML;
  tfoot.innerHTML = footerHTML;

  runShodaqohAreaPrint(area, "A4 landscape");
}

function printInfakIrReport() {
  const monthKey = state.shodaqoh.selectedMonth;
  if (!monthKey) {
    showToast("Pilih bulan terlebih dahulu.", "error");
    return;
  }

  const memberRows = getShodaqohMemberRowSource();
  if (memberRows.length === 0) {
    showToast("Belum ada data anggota shodaqoh.", "error");
    return;
  }

  const area = document.getElementById("printShodaqohArea");
  if (!area) return;

  const titleEl = document.getElementById("printShodaqohTitle");
  if (titleEl) titleEl.textContent = "REKAP INFAK IR BULANAN";

  const periodEl = document.getElementById("printShodaqohPeriod");
  if (periodEl) periodEl.textContent = "Periode: " + getMonthLabel(monthKey);

  const { byId, byMemberForMonth } = buildShodaqohPaymentLookup(monthKey);

  const resolvedRows = memberRows.map(function (m) {
    let payment = null;
    if (m.payment_id && byId[m.payment_id]) {
      payment = byId[m.payment_id];
    } else if (byMemberForMonth[m.member_id]) {
      payment = byMemberForMonth[m.member_id];
    }
    return { member_id: m.member_id, nama: m.nama, payment: payment };
  });

  let allSusulanMonths = new Set();
  resolvedRows.forEach(function (r) {
    const p = r.payment;
    if (p && p.susulan_bulan) {
      let bulanArray = [];
      if (typeof p.susulan_bulan === "string") {
        bulanArray = p.susulan_bulan.split(",").filter(Boolean);
      } else if (Array.isArray(p.susulan_bulan)) {
        bulanArray = p.susulan_bulan;
      }
      bulanArray.forEach(function (key) {
        if (key.length === 7) allSusulanMonths.add(key);
      });
    }
  });

  let sortedSusulanMonths = Array.from(allSusulanMonths).sort().reverse();
  if (sortedSusulanMonths.length > 3)
    sortedSusulanMonths = sortedSusulanMonths.slice(0, 3);
  const displaySusulanMonths = [...sortedSusulanMonths].reverse();

  const thead = document.getElementById("printShodaqohHead");
  const body = document.getElementById("printShodaqohBody");
  const tfoot = document.getElementById("printShodaqohFoot");
  if (!thead || !body || !tfoot) return;

  const table = document.getElementById("printShodaqohTable");
  if (table) {
    const irCount =
      displaySusulanMonths.length > 0 ? displaySusulanMonths.length : 1;
    const irWidth = (55 / irCount).toFixed(2);
    let colgroupHTML = `<col style="width:5%" /><col style="width:25%" />`;
    for (let i = 0; i < irCount; i++)
      colgroupHTML += `<col style="width:${irWidth}%" />`;
    colgroupHTML += `<col style="width:15%" />`;
    const oldColgroup = table.querySelector("colgroup");
    if (oldColgroup) oldColgroup.innerHTML = colgroupHTML;
  }

  let totalIr = {};
  displaySusulanMonths.forEach(function (m) {
    totalIr[m] = 0;
  });
  let grandTotalIr = 0;
  const monthNames = [
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

  let headerHTML = `<tr>
    <th rowspan="2" style="text-align:left;width:5%;">No</th>
    <th rowspan="2" style="text-align:left;width:25%;">Nama Anggota</th>`;
  const irColspan =
    displaySusulanMonths.length > 0 ? displaySusulanMonths.length : 1;
  headerHTML += `<th colspan="${irColspan}" style="text-align:center;">Infak IR (Susulan)</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:15%;">Total Infak IR</th></tr>`;

  headerHTML += `<tr>`;
  if (displaySusulanMonths.length > 0) {
    displaySusulanMonths.forEach(function (key) {
      const y = key.slice(2, 4);
      const m = parseInt(key.slice(5, 7));
      headerHTML += `<th style="text-align:right;">${monthNames[m - 1]}'${y}</th>`;
    });
  } else {
    headerHTML += `<th style="text-align:right;">—</th>`;
  }
  headerHTML += `</tr>`;

  // Body — semua member, urutan sesuai sheet
  let bodyHTML = resolvedRows
    .map(function (r, idx) {
      const no = idx + 1;
      const nama = r.nama || "-";
      const p = r.payment;
      let irData = {};

      if (p && p.susulan_bulan) {
        let bulanArray = [];
        if (typeof p.susulan_bulan === "string") {
          bulanArray = p.susulan_bulan.split(",").filter(Boolean);
        } else if (Array.isArray(p.susulan_bulan)) {
          bulanArray = p.susulan_bulan;
        }
        if (bulanArray.length > 0) {
          const totalIR = Number(p.susulan_ir || 0);
          const irPerBulan = Math.round(totalIR / bulanArray.length);
          bulanArray.forEach(function (key) {
            if (key.length === 7 && displaySusulanMonths.includes(key)) {
              irData[key] = irPerBulan;
              if (totalIr[key] !== undefined) totalIr[key] += irPerBulan;
            }
          });
        }
      }

      let rowTotal = 0;
      let rowHTML = `<tr>
        <td style="text-align:left;padding:6px 4px;font-size:9.5px;">${no}</td>
        <td style="text-align:left;padding:6px 4px;font-size:9.5px;">${escapeHtml(nama)}</td>`;

      displaySusulanMonths.forEach(function (key) {
        const val = irData[key] || 0;
        rowTotal += val;
        rowHTML += `<td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${val > 0 ? fmtRp(val) : "—"}</td>`;
      });

      rowHTML += `<td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${rowTotal > 0 ? fmtRp(rowTotal) : "—"}</td></tr>`;

      grandTotalIr += rowTotal;
      return rowHTML;
    })
    .join("");

  let footerHTML = `<tr class="print-total-saldo">
    <td colspan="2" class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">TOTAL KESELURUHAN</td>`;
  displaySusulanMonths.forEach(function (key) {
    footerHTML += `<td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${totalIr[key] > 0 ? fmtRp(totalIr[key]) : "—"}</td>`;
  });
  footerHTML += `<td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(grandTotalIr)}</td></tr>`;

  thead.innerHTML = headerHTML;
  body.innerHTML = bodyHTML;
  tfoot.innerHTML = footerHTML;

  runShodaqohAreaPrint(area, "A4 portrait");
}

document.addEventListener("DOMContentLoaded", function () {
  const shodDropdownBtn = document.getElementById("shodBtnPrintDropdown");
  const shodDropdownMenu = document.getElementById("shodPrintDropdownMenu");

  if (shodDropdownBtn && shodDropdownMenu) {
    shodDropdownBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const isOpen = shodDropdownMenu.classList.contains("hidden");
      shodDropdownMenu.classList.toggle("hidden");
      shodDropdownBtn.setAttribute("aria-expanded", isOpen);
    });

    document.addEventListener("click", function (e) {
      if (
        !shodDropdownBtn.contains(e.target) &&
        !shodDropdownMenu.contains(e.target)
      ) {
        shodDropdownMenu.classList.add("hidden");
        shodDropdownBtn.setAttribute("aria-expanded", "false");
      }
    });

    shodDropdownMenu
      .querySelectorAll(".print-dropdown-item")
      .forEach((item) => {
        item.addEventListener("click", function () {
          shodDropdownMenu.classList.add("hidden");
          shodDropdownBtn.setAttribute("aria-expanded", "false");
        });
      });
  }

  const btnPrintInfakIR = document.getElementById("btnPrintInfakIR");
  if (btnPrintInfakIR) {
    btnPrintInfakIR.addEventListener("click", printInfakIrReport);
  }
});
