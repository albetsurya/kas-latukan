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

  // ============================================================
  // ZAKAT FITRAH — SUMBER DATA TERPISAH
  // ============================================================
  var fitrah = r.fitrah || {};
  var fitrahPenerimaan = Number(fitrah.penerimaan || 0);

  var fitrahMustahiqPersen = Number(
    (fitrah.mustahiq && fitrah.mustahiq.persen) != null
      ? fitrah.mustahiq.persen
      : 45,
  );
  var fitrahSabilillahPersen = Number(
    (fitrah.sabilillah && fitrah.sabilillah.persen) != null
      ? fitrah.sabilillah.persen
      : 40,
  );
  var fitrahAmilPersen = Number(
    (fitrah.amil && fitrah.amil.persen) != null ? fitrah.amil.persen : 15,
  );
  var fitrahAmilKelompokPersen = Number(
    (fitrah.amil && fitrah.amil.kelompok && fitrah.amil.kelompok.persen) != null
      ? fitrah.amil.kelompok.persen
      : 12,
  );
  var fitrahAmilDesaPersen = Number(
    (fitrah.amil && fitrah.amil.desa && fitrah.amil.desa.persen) != null
      ? fitrah.amil.desa.persen
      : 2,
  );
  var fitrahAmilDaerahPersen = Number(
    (fitrah.amil && fitrah.amil.daerah && fitrah.amil.daerah.persen) != null
      ? fitrah.amil.daerah.persen
      : 1,
  );

  var fitrahMustahiqNominal = Math.round(
    (fitrahPenerimaan * fitrahMustahiqPersen) / 100,
  );
  var fitrahSabilillahNominal = Math.round(
    (fitrahPenerimaan * fitrahSabilillahPersen) / 100,
  );
  var fitrahAmilNominal = Math.round(
    (fitrahPenerimaan * fitrahAmilPersen) / 100,
  );
  var fitrahAmilKelompokNominal = Math.round(
    (fitrahPenerimaan * fitrahAmilKelompokPersen) / 100,
  );
  var fitrahAmilDesaNominal = Math.round(
    (fitrahPenerimaan * fitrahAmilDesaPersen) / 100,
  );
  var fitrahAmilDaerahNominal = Math.round(
    (fitrahPenerimaan * fitrahAmilDaerahPersen) / 100,
  );

  // ============================================================
  // ZAKAT MAAL, TIJAROH, ZURU', TERNAK — SUMBER DATA TERPISAH
  // ============================================================
  var maal = r.maal || {};
  var maalPenerimaan = Number(
    maal.penerimaan != null ? maal.penerimaan : totalZakat || 0,
  );

  var maalMustahiqPersen = Number(
    (maal.mustahiq && maal.mustahiq.persen) != null ? maal.mustahiq.persen : 45,
  );
  var maalMustahiqKelompokPersen = Number(
    (maal.mustahiq &&
      maal.mustahiq.kelompok &&
      maal.mustahiq.kelompok.persen) != null
      ? maal.mustahiq.kelompok.persen
      : 80,
  );
  var maalMustahiqDaerahPersen = Number(
    (maal.mustahiq && maal.mustahiq.daerah && maal.mustahiq.daerah.persen) !=
      null
      ? maal.mustahiq.daerah.persen
      : 20,
  );
  var maalSabilillahPersen = Number(
    (maal.sabilillah && maal.sabilillah.persen) != null
      ? maal.sabilillah.persen
      : 40,
  );
  var maalAmilPersen = Number(
    (maal.amil && maal.amil.persen) != null ? maal.amil.persen : 15,
  );
  var maalAmilKelompokPersen = Number(
    (maal.amil && maal.amil.kelompok && maal.amil.kelompok.persen) != null
      ? maal.amil.kelompok.persen
      : 12,
  );
  var maalAmilDesaPersen = Number(
    (maal.amil && maal.amil.desa && maal.amil.desa.persen) != null
      ? maal.amil.desa.persen
      : 2,
  );
  var maalAmilDaerahPersen = Number(
    (maal.amil && maal.amil.daerah && maal.amil.daerah.persen) != null
      ? maal.amil.daerah.persen
      : 1,
  );

  var maalMustahiqNominal = Math.round(
    (maalPenerimaan * maalMustahiqPersen) / 100,
  );
  var maalMustahiqKelompokNominal = Math.round(
    (maalMustahiqNominal * maalMustahiqKelompokPersen) / 100,
  );
  var maalMustahiqDaerahNominal = Math.round(
    (maalMustahiqNominal * maalMustahiqDaerahPersen) / 100,
  );
  var maalSabilillahNominal = Math.round(
    (maalPenerimaan * maalSabilillahPersen) / 100,
  );
  var maalAmilNominal = Math.round((maalPenerimaan * maalAmilPersen) / 100);
  var maalAmilKelompokNominal = Math.round(
    (maalPenerimaan * maalAmilKelompokPersen) / 100,
  );
  var maalAmilDesaNominal = Math.round(
    (maalPenerimaan * maalAmilDesaPersen) / 100,
  );
  var maalAmilDaerahNominal = Math.round(
    (maalPenerimaan * maalAmilDaerahPersen) / 100,
  );

  // ============================================================
  // SETOR KE DESA — KHUSUS AMIL DESA (FITRAH & MAAL DIPISAH)
  // ============================================================
  var setorDesa = {
    amilDesa: {
      fitrah: fitrahAmilDesaNominal,
      maal: maalAmilDesaNominal,
    },
  };
  var totalSetorDesa = setorDesa.amilDesa.fitrah + setorDesa.amilDesa.maal;

  // ============================================================
  // SETOR KE DAERAH — KHUSUS MAAL (MUSTAHIQ DAERAH, SABILILLAH, AMIL DAERAH)
  // ============================================================
  var setorDaerah = {
    mustahiqDaerah: maalMustahiqDaerahNominal,
    sabilillah: maalSabilillahNominal,
    amilDaerah: maalAmilDaerahNominal,
  };
  var totalSetorDaerah =
    setorDaerah.mustahiqDaerah +
    setorDaerah.sabilillah +
    setorDaerah.amilDaerah;

  // ============================================================
  // BUILD HTML
  // ============================================================
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
              <td class="num">${fmtRp(fitrahPenerimaan)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">2</td>
              <td>MUSTAHIQ (${fitrahMustahiqPersen}%)</td>
              <td class="num">${fmtRp(fitrahMustahiqNominal)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">3</td>
              <td>SABILILLAH (${fitrahSabilillahPersen}%)</td>
              <td class="num">${fmtRp(fitrahSabilillahNominal)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">4</td>
              <td>AMIL (${fitrahAmilPersen}%)</td>
              <td class="num">${fmtRp(fitrahAmilNominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL KELOMPOK (${fitrahAmilKelompokPersen}%)</td>
              <td class="num">${fmtRp(fitrahAmilKelompokNominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL DESA (${fitrahAmilDesaPersen}%)</td>
              <td class="num">${fmtRp(fitrahAmilDesaNominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL DAERAH (${fitrahAmilDaerahPersen}%)</td>
              <td class="num">${fmtRp(fitrahAmilDaerahNominal)}</td>
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
              <td class="num">${fmtRp(maalPenerimaan)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">2</td>
              <td>MUSTAHIQ (${maalMustahiqPersen}%)</td>
              <td class="num">${fmtRp(maalMustahiqNominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* MUSTAHIQ KELOMPOK (${maalMustahiqKelompokPersen}% dari MUSTAHIQ)</td>
              <td class="num">${fmtRp(maalMustahiqKelompokNominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* MUSTAHIQ SE-DAERAH (${maalMustahiqDaerahPersen}% dari MUSTAHIQ)</td>
              <td class="num">${fmtRp(maalMustahiqDaerahNominal)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">3</td>
              <td>SABILILLAH (${maalSabilillahPersen}%)</td>
              <td class="num">${fmtRp(maalSabilillahNominal)}</td>
            </tr>
            <tr class="row-utama">
              <td style="text-align:center;">4</td>
              <td>AMIL (${maalAmilPersen}%)</td>
              <td class="num">${fmtRp(maalAmilNominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL KELOMPOK (${maalAmilKelompokPersen}%)</td>
              <td class="num">${fmtRp(maalAmilKelompokNominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL DESA (${maalAmilDesaPersen}%)</td>
              <td class="num">${fmtRp(maalAmilDesaNominal)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL DAERAH (${maalAmilDaerahPersen}%)</td>
              <td class="num">${fmtRp(maalAmilDaerahNominal)}</td>
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
              <td>AMIL DESA</td>
              <td class="num">${fmtRp(totalSetorDesa)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL ZAKAT FITRAH (${fitrahAmilDesaPersen}%)</td>
              <td class="num">${fmtRp(setorDesa.amilDesa.fitrah)}</td>
            </tr>
            <tr>
              <td></td>
              <td style="padding-left:20px;">* AMIL ZAKAT MAAL & TIJAROH, ZURU' DAN TERNAK (${maalAmilDesaPersen}%)</td>
              <td class="num">${fmtRp(setorDesa.amilDesa.maal)}</td>
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
              <td>MUSTAHIQ SE-DAERAH (${maalMustahiqDaerahPersen}% dari MUSTAHIQ)</td>
              <td class="num">${fmtRp(setorDaerah.mustahiqDaerah)}</td>
            </tr>
            <tr class="row-setor-daerah">
              <td style="text-align:center;">2</td>
              <td>SABILILLAH (${maalSabilillahPersen}%)</td>
              <td class="num">${fmtRp(setorDaerah.sabilillah)}</td>
            </tr>
            <tr class="row-setor-daerah">
              <td style="text-align:center;">3</td>
              <td>AMIL DAERAH (${maalAmilDaerahPersen}%)</td>
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
