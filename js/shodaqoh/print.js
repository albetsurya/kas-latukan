// ============================================================
// PRINT SHODAQOH - VERSI LENGKAP (SATU FUNGSI SAJA)
// ============================================================

function printShodaqohReport() {
  const monthKey = state.shodaqoh.selectedMonth;
  if (!monthKey) {
    showToast("Pilih bulan terlebih dahulu.", "error");
    return;
  }

  const payments = state.shodaqoh.payments || [];
  if (payments.length === 0) {
    showToast("Belum ada data pembayaran untuk bulan ini.", "error");
    return;
  }

  const area = document.getElementById("printShodaqohArea");
  if (!area) return;

  // 1. Set Judul Periode
  const periodEl = document.getElementById("printShodaqohPeriod");
  if (periodEl) {
    periodEl.textContent = "Periode: " + getMonthLabel(monthKey);
  }

  // 2. Filter data berdasarkan bulan yang dipilih
  const filteredPayments = payments.filter(function (p) {
    return String(p.tanggal).slice(0, 7) === monthKey;
  });

  // 3. Kumpulkan semua bulan susulan unik dan URUTKAN TERBALIK (dari terbaru ke terlama)
  let allSusulanMonths = new Set();
  filteredPayments.forEach(function (p) {
    if (p.susulan_bulan) {
      let bulanArray = [];
      if (typeof p.susulan_bulan === "string") {
        bulanArray = p.susulan_bulan.split(",").filter(Boolean);
      } else if (Array.isArray(p.susulan_bulan)) {
        bulanArray = p.susulan_bulan;
      }
      bulanArray.forEach(function (key) {
        if (key.length === 7) {
          allSusulanMonths.add(key);
        }
      });
    }
  });

  // Urutkan dari yang TERBARU ke TERLAMA
  let sortedSusulanMonths = Array.from(allSusulanMonths).sort().reverse();

  // B A T A S I : Hanya ambil 3 BULAN TERAKHIR saja
  if (sortedSusulanMonths.length > 3) {
    sortedSusulanMonths = sortedSusulanMonths.slice(0, 3);
  }

  // Balik urutannya agar tampil dari yang TERLAMA ke TERBARU (untuk tampilan tabel)
  let displaySusulanMonths = [...sortedSusulanMonths].reverse();

  const thead = document.getElementById("printShodaqohHead");
  const body = document.getElementById("printShodaqohBody");
  const tfoot = document.getElementById("printShodaqohFoot");
  if (!thead || !body || !tfoot) return;

  // 3.5 UPDATE COLGROUP dengan kolom IR dinamis
  const table = document.getElementById("printShodaqohTable");
  if (table) {
    let colgroupHTML = `
      <col class="col-no" />
      <col class="col-nama" />
    `;

    // Tambahkan col untuk setiap bulan susulan
    displaySusulanMonths.forEach(function () {
      colgroupHTML += `<col class="col-ir" />`;
    });

    // Tambahkan col untuk kolom lainnya
    colgroupHTML += `
      <col class="col-sambung" />
      <col class="col-jimpitan" />
      <col class="col-siar" />
      <col class="col-seribuan" />
      <col class="col-kafan" />
      <col class="col-ukhro" />
      <col class="col-total" />
    `;

    // Ganti colgroup
    const oldColgroup = table.querySelector("colgroup");
    if (oldColgroup) {
      oldColgroup.innerHTML = colgroupHTML;
    }
  }

  // 4. Siapkan variabel total
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

  // 5. BANGUN HEADER 2 BARIS
  let headerHTML = "";

  // --- BARIS PERTAMA (Header Utama) ---
  headerHTML += `<tr>`;
  headerHTML += `<th rowspan="2" style="text-align:left;width:3%;">No</th>`;
  headerHTML += `<th rowspan="2" style="text-align:left;width:16%;">Nama Anggota</th>`;

  // Kolom Infak IR (colspan untuk 3 bulan)
  const irColspan =
    displaySusulanMonths.length > 0 ? displaySusulanMonths.length : 1;
  headerHTML += `<th colspan="${irColspan}" style="text-align:center;width:${irColspan * 12}%;">Infak IR (Susulan)</th>`;

  // Kolom Lainnya (masing-masing dengan rowspan 2) - RATA KANAN
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Uang Sambung</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Jimpitan</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Siar-siar</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Seribuan</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Kafan</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:8%;">Ukhro MT</th>`;
  headerHTML += `<th rowspan="2" style="text-align:right;width:9%;">Total</th>`;
  headerHTML += `</tr>`;

  // --- BARIS KEDUA (Sub-Header untuk Infak IR) ---
  headerHTML += `<tr>`;

  // Sub-Header untuk Infak IR (Bulan-bulan) - RATA KANAN
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

  // 6. BANGUN BODY TABEL
  let bodyHTML = filteredPayments
    .map(function (p, idx) {
      const no = idx + 1;
      const nama = p.nama || "-";

      const sambung = Number(p.uang_sambung || 0);
      const jimpitan = Number(p.jimpitan || 0);
      const siar = Number(p.siar_siar || 0);
      const seribuan = Number(p.seribuan || 0);
      const kafan = Number(p.kafan || 0);
      const ukhro = Number(p.ukhro_mt || 0);

      // Ambil data IR per bulan
      let irData = {};
      if (p.susulan_bulan) {
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

      // Tampilkan IR per bulan - RATA KANAN
      displaySusulanMonths.forEach(function (key) {
        let val = irData[key] || 0;
        rowHTML += `<td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${val > 0 ? fmtRp(val) : "—"}</td>`;
      });

      // Kolom lainnya - RATA KANAN
      rowHTML += `
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${sambung > 0 ? fmtRp(sambung) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${jimpitan > 0 ? fmtRp(jimpitan) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${siar > 0 ? fmtRp(siar) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${seribuan > 0 ? fmtRp(seribuan) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${kafan > 0 ? fmtRp(kafan) : "—"}</td>
        <td class="num" style="text-align:right;padding:6px 4px;font-size:9.5px;">${ukhro > 0 ? fmtRp(ukhro) : "—"}</td>`;

      // Total per baris - RATA KANAN
      let total = sambung + jimpitan + siar + seribuan + kafan + ukhro;
      displaySusulanMonths.forEach(function (key) {
        total += irData[key] || 0;
      });

      rowHTML += `<td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${fmtRp(total)}</td>
      </tr>`;

      // Akumulasi total footer
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

  // 7. BANGUN FOOTER
  let footerHTML = "";

  // Baris 1: Total Keseluruhan per kolom
  footerHTML += `<tr class="print-total-saldo">`;
  footerHTML += `<td colspan="2" class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">TOTAL KESELURUHAN</td>`;

  // Total per bulan IR - RATA KANAN
  displaySusulanMonths.forEach(function (key) {
    footerHTML += `<td class="num font-bold" style="text-align:right;padding:6px 4px;font-size:9.5px;">${totalIr[key] > 0 ? fmtRp(totalIr[key]) : "—"}</td>`;
  });

  // Total lainnya - RATA KANAN
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

  // Baris 2: Grand Total Infak IR
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

  // 8. GABUNGKAN SEMUA & RENDER
  thead.innerHTML = headerHTML;
  body.innerHTML = bodyHTML;
  tfoot.innerHTML = footerHTML;

  // 9. PROSES PRINT
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
  };

  document.body.classList.add("printing-shodaqoh");
  window.print();
  window.removeEventListener("afterprint", restore);
  window.addEventListener("afterprint", restore, { once: true });
  setTimeout(restore, 2000);
}

