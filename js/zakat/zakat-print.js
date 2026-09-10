// ============================================================
// ZAKAT PRINT - CETAK LAPORAN DETAIL ZAKAT (REVISI)
// ============================================================

/**
 * Cetak laporan detail zakat berdasarkan ID zakat
 * @param {string} zakatId - ID zakat yang akan dicetak
 */
function printZakatReport(zakatId) {
  if (!zakatId) {
    showToast("ID Zakat tidak ditemukan.", "error");
    return;
  }

  var zakat = getZakatById(zakatId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var area = document.getElementById("printZakatArea");
  if (!area) {
    showToast("Area print tidak ditemukan.", "error");
    return;
  }

  // Build print content
  buildZakatPrintContent(zakat);

  // Tandai bahwa yang sedang dicetak adalah laporan zakat
  document.body.classList.add("printing-zakat");

  var restore = function () {
    document.body.classList.remove("printing-zakat");
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

/**
 * Build konten print untuk detail zakat
 * @param {Object} zakat - Data zakat
 */
function buildZakatPrintContent(zakat) {
  if (!zakat) return;

  // Header
  updateZakatPrintHeader(zakat);

  // Rincian (hanya rincian yang ditampilkan)
  updateZakatPrintRincian(zakat);
}

/**
 * Update header print zakat
 */
function updateZakatPrintHeader(zakat) {
  var titleEl = document.getElementById("printZakatTitle");
  var subtitleEl = document.getElementById("printZakatSubtitle");
  var metaEl = document.getElementById("printZakatMeta");

  if (titleEl) {
    titleEl.textContent =
      "REKAP LAPORAN ZAKAT MAL-TIJAROH, ZURU', TERNAK DAN FITRAH";
  }

  if (subtitleEl) {
    var kelompok = zakat.kelompok || "LATUKAN";
    var tahun = zakat.tahun || "2026";
    var jenis = zakat.jenis || "ZURU' RENDENG";
    subtitleEl.textContent =
      "KELOMPOK : " +
      kelompok.toUpperCase() +
      "\nZAKAT " +
      jenis.toUpperCase() +
      " " +
      tahun;
  }
}

/**
 * Update rincian print zakat - format sesuai PDF
 */
function updateZakatPrintRincian(zakat) {
  var container = document.getElementById("printZakatRincianContainer");
  if (!container) return;

  var r = zakat.rincian || {};
  var totalZakat = zakat.total || 0;

  // Data Zakat Fitrah
  var fitrah = r.fitrah || {
    penerimaan: 0,
    mustahiq: { persen: 45, nominal: 0 },
    sabilillah: { persen: 40, nominal: 0 },
    amil: {
      persen: 15,
      nominal: 0,
      kelompok: { persen: 12, nominal: 0 },
      desa: { persen: 2, nominal: 0 },
      daerah: { persen: 1, nominal: 0 },
    },
  };

  // Data Zakat Maal, Tijaroh, Zuru', Ternak
  var maal = r.maal || {
    penerimaan: totalZakat || 0,
    mustahiq: {
      persen: 45,
      nominal: 0,
      kelompok: { persen: 80, nominal: 0 },
      daerah: { persen: 20, nominal: 0 },
    },
    sabilillah: { persen: 40, nominal: 0 },
    amil: {
      persen: 15,
      nominal: 0,
      kelompok: { persen: 12, nominal: 0 },
      desa: { persen: 2, nominal: 0 },
      daerah: { persen: 1, nominal: 0 },
    },
  };

  // Hitung nominal berdasarkan persentase
  var totalMaal = maal.penerimaan || totalZakat || 0;

  fitrah.amil.nominal = Math.round(
    ((fitrah.penerimaan || totalZakat || 0) * fitrah.amil.persen) / 100,
  );
  fitrah.amil.kelompok.nominal = Math.round(
    ((fitrah.penerimaan || totalZakat || 0) * fitrah.amil.kelompok.persen) / 100,
  );
  fitrah.amil.desa.nominal = Math.round(
    ((fitrah.penerimaan || totalZakat || 0) * fitrah.amil.desa.persen) / 100,
  );
  fitrah.amil.daerah.nominal = Math.round(
    ((fitrah.penerimaan || totalZakat || 0) * fitrah.amil.daerah.persen) / 100,
  );

  // Mustahiq
  maal.mustahiq.nominal = Math.round((totalMaal * maal.mustahiq.persen) / 100);
  maal.mustahiq.kelompok.nominal = Math.round(
    (maal.mustahiq.nominal * maal.mustahiq.kelompok.persen) / 100,
  );
  maal.mustahiq.daerah.nominal = Math.round(
    (maal.mustahiq.nominal * maal.mustahiq.daerah.persen) / 100,
  );

  // Sabilillah
  maal.sabilillah.nominal = Math.round(
    (totalMaal * maal.sabilillah.persen) / 100,
  );

  // Amil
  maal.amil.nominal = Math.round((totalMaal * maal.amil.persen) / 100);
  maal.amil.kelompok.nominal = Math.round(
    (totalMaal * maal.amil.kelompok.persen) / 100,
  );
  maal.amil.desa.nominal = Math.round(
    (totalMaal * maal.amil.desa.persen) / 100,
  );
  maal.amil.daerah.nominal = Math.round(
    (totalMaal * maal.amil.daerah.persen) / 100,
  );

  // Setor ke Desa
  var setorDesa = {
    amilDesa: {
      fitrah: fitrah.amil?.desa?.nominal || 0,
      maal: maal.amil?.desa?.nominal || 0,
    },
  };
  var totalSetorDesa =
    (setorDesa.amilDesa.fitrah || 0) + (setorDesa.amilDesa.maal || 0);

  // Setor ke Daerah
  var setorDaerah = {
    mustahiqDaerah: maal.mustahiq?.daerah?.nominal || 0,
    sabilillah: maal.sabilillah?.nominal || 0,
    amilDaerah: maal.amil?.daerah?.nominal || 0,
  };
  var totalSetorDaerah =
    (setorDaerah.mustahiqDaerah || 0) +
    (setorDaerah.sabilillah || 0) +
    (setorDaerah.amilDaerah || 0);

  // Build HTML sesuai format PDF
  var html = `
    <div class="print-rincian-wrapper">
      <!-- ZAKAT FITRAH -->
      <div class="print-rincian-section">
        <h4 class="print-rincian-section-title yellow-bg">ZAKAT FITRAH</h4>
        <table class="print-rincian-table">
          <thead>
            <tr>
              <th style="width:8%;">NO</th>
              <th style="width:52%;">URAIAN</th>
              <th style="width:40%;text-align:right;">JUMLAH</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-penerimaan">
              <td style="text-align:center;">1</td>
              <td>JUMLAH PENERIMAAN ZAKAT FITRAH (100%)</td>
              <td class="num">${fmtRp(fitrah.penerimaan || 0)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">2</td>
              <td>MUSTAHIQ (${fitrah.mustahiq?.persen || 45}%)</td>
              <td class="num">${fmtRp(fitrah.mustahiq?.nominal || 0)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">3</td>
              <td>SABILILLAH (${fitrah.sabilillah?.persen || 40}%)</td>
              <td class="num">${fmtRp(fitrah.sabilillah?.nominal || 0)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">4</td>
              <td>AMIL (${fitrah.amil?.persen || 15}%)</td>
              <td class="num">${fmtRp(fitrah.amil?.nominal || 0)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL KELOMPOK (${fitrah.amil?.kelompok?.persen || 12}%)</td>
              <td class="num">${fmtRp(fitrah.amil?.kelompok?.nominal || 0)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL DESA (${fitrah.amil?.desa?.persen || 2}%)</td>
              <td class="num">${fmtRp(fitrah.amil?.desa?.nominal || 0)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL DAERAH (${fitrah.amil?.daerah?.persen || 1}%)</td>
              <td class="num">${fmtRp(fitrah.amil?.daerah?.nominal || 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ZAKAT MAAL & TIJAROH, ZURU' DAN TERNAK -->
      <div class="print-rincian-section">
        <h4 class="print-rincian-section-title yellow-bg">ZAKAT MAAL & TIJAROH, ZURU' DAN TERNAK</h4>
        <table class="print-rincian-table">
          <thead>
            <tr>
              <th style="width:8%;">NO</th>
              <th style="width:52%;">URAIAN</th>
              <th style="width:40%;text-align:right;">JUMLAH</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-penerimaan">
              <td style="text-align:center;">1</td>
              <td>JUMLAH PENERIMAAN ZAKAT MAAL & TIJAROH, ZURU' DAN TERNAK (100%)</td>
              <td class="num">${fmtRp(totalMaal)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">2</td>
              <td>MUSTAHIQ (${maal.mustahiq.persen}%)</td>
              <td class="num">${fmtRp(maal.mustahiq.nominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* MUSTAHIQ KELOMPOK (${maal.mustahiq.kelompok.persen}% dari MUSTAHIQ)</td>
              <td class="num">${fmtRp(maal.mustahiq.kelompok.nominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* MUSTAHIQ SE-DAERAH (${maal.mustahiq.daerah.persen}% dari MUSTAHIQ)</td>
              <td class="num">${fmtRp(maal.mustahiq.daerah.nominal)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">3</td>
              <td>SABILILLAH (${maal.sabilillah.persen}%)</td>
              <td class="num">${fmtRp(maal.sabilillah.nominal)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">4</td>
              <td>AMIL (${maal.amil.persen}%)</td>
              <td class="num">${fmtRp(maal.amil.nominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL KELOMPOK (${maal.amil.kelompok.persen}%)</td>
              <td class="num">${fmtRp(maal.amil.kelompok.nominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL DESA (${maal.amil.desa.persen}%)</td>
              <td class="num">${fmtRp(maal.amil.desa.nominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL DAERAH (${maal.amil.daerah.persen}%)</td>
              <td class="num">${fmtRp(maal.amil.daerah.nominal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SETOR KE DESA -->
      <div class="print-rincian-section">
        <h4 class="print-rincian-section-title green-bg">SETOR KE DESA</h4>
        <table class="print-rincian-table">
          <thead>
            <tr>
              <th style="width:8%;">NO</th>
              <th style="width:52%;">URAIAN</th>
              <th style="width:40%;text-align:right;">JUMLAH</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-setor-desa">
              <td style="text-align:center;">1</td>
              <td>AMIL DESA (2%)</td>
              <td class="num">${fmtRp(totalSetorDesa)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* % AMIL ZAKAT FITRAH</td>
              <td class="num">${fmtRp(setorDesa.amilDesa.fitrah || 0)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* % AMIL ZAKAT MAAL & TIJAROH, ZURU' DAN TERNAK</td>
              <td class="num">${fmtRp(setorDesa.amilDesa.maal || 0)}</td>
            </tr>
            <tr class="row-setor-desa">
              <td></td>
              <td style="padding-left:20px;font-weight:700;">JUMLAH</td>
              <td class="num" style="font-weight:700;">${fmtRp(totalSetorDesa)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SETOR KE DAERAH -->
      <div class="print-rincian-section">
        <h4 class="print-rincian-section-title blue-bg">SETOR KE DAERAH</h4>
        <table class="print-rincian-table">
          <thead>
            <tr>
              <th style="width:8%;">NO</th>
              <th style="width:52%;">URAIAN</th>
              <th style="width:40%;text-align:right;">JUMLAH</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-setor-daerah">
              <td style="text-align:center;">1</td>
              <td>MUSTAHIQ SE-DAERAH (20% dari MUSTAHIQ)</td>
              <td class="num">${fmtRp(setorDaerah.mustahiqDaerah)}</td>
            </tr>
            <tr class="row-setor-daerah">
              <td style="text-align:center;">2</td>
              <td>SABILILLAH (40%)</td>
              <td class="num">${fmtRp(setorDaerah.sabilillah)}</td>
            </tr>
            <tr class="row-setor-daerah">
              <td style="text-align:center;">3</td>
              <td>AMIL DAERAH (1%)</td>
              <td class="num">${fmtRp(setorDaerah.amilDaerah)}</td>
            </tr>
            <tr class="row-setor-daerah">
              <td></td>
              <td style="padding-left:20px;font-weight:700;">JUMLAH</td>
              <td class="num" style="font-weight:700;">${fmtRp(totalSetorDaerah)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TANDA TANGAN -->
      <div class="print-rincian-signature">
        <!-- TANGGAL - Di luar row -->
        <div class="print-signature-date-wrapper">
            ${getFormattedDate()}
        </div>
        <div class="print-signature-row">
            <div class="print-signature-item">
              <div class="print-signature-wrapper">
                <p class="print-signature-label">KYAI KELOMPOK</p>
                <p class="print-signature-line">( ......................... )</p>
              </div>
            </div>
            <div class="print-signature-item">
              <div class="print-signature-wrapper">
                <p class="print-signature-label">KU KELOMPOK</p>
                <p class="print-signature-line">( ......................... )</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Format tanggal untuk tanda tangan
 */
function getFormattedDate() {
  var now = new Date();
  var months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return (
    '<div class="print-signature-date" style="text-align:right;">' +
    "……………………………., " +
    now.getDate() +
    " " +
    months[now.getMonth()] +
    " " +
    now.getFullYear() +
    "</div>"
  );
}

/**
 * Format tanggal panjang (dengan nama hari)
 */
function fmtDateLong(dateStr) {
  if (!dateStr) return "-";
  var date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  var days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  var months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return (
    days[date.getDay()] +
    ", " +
    date.getDate() +
    " " +
    months[date.getMonth()] +
    " " +
    date.getFullYear()
  );
}

/**
 * Buat area print zakat jika belum ada
 */
function ensureZakatPrintArea() {
  if (document.getElementById("printZakatArea")) return;

  var area = document.createElement("div");
  area.id = "printZakatArea";
  area.className = "print-zakat-area";
  area.style.display = "none";
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.width = "100%";
  area.style.height = "100%";
  area.style.background = "white";
  area.style.zIndex = "999998";
  area.style.overflow = "auto";
  area.style.padding = "0";
  area.style.margin = "0";
  area.style.color = "#1e293b";

  area.innerHTML = `
    <div class="print-zakat-wrapper">
      <!-- HEADER -->
      <div class="print-zakat-header">
        <h1 id="printZakatTitle">REKAP LAPORAN ZAKAT MAL-TIJAROH, ZURU', TERNAK DAN FITRAH</h1>
        <h2 id="printZakatSubtitle">KELOMPOK : LATUKAN<br>ZAKAT ZURU' RENDENG 2026</h2>
      </div>

      <!-- RINCIAN -->
      <div id="printZakatRincianContainer">
        <!-- Akan di-render oleh JavaScript -->
      </div>
    </div>
  `;

  document.body.appendChild(area);
}

// ============================================================
// INISIALISASI
// ============================================================

// Pastikan area print tersedia saat DOM siap
document.addEventListener("DOMContentLoaded", function () {
  ensureZakatPrintArea();
});

// Ekspor fungsi ke global
window.printZakatReport = printZakatReport;
window.ensureZakatPrintArea = ensureZakatPrintArea;
