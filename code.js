// index.html

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
            <div class="relative flex items-center">
              <input
                required
                id="authPassword"
                type="password"
                autocomplete="current-password"
                placeholder="Masukkan password"
                class="field-input pr-10 w-full"
              />
              <button
                type="button"
                id="btnTogglePassword"
                class="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label="Tampilkan password"
              >
                <!-- Ikon Mata (Tertutup / Hidden secara default) -->
                <svg
                  id="iconEye"
                  class="w-5 h-5 hidden"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg
                  id="iconEyeOff"
                  class="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.025 10.025 0 012.122-.138c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21f-18-18"
                  />
                </svg>
              </button>
            </div>
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

        <!-- ============ SCREEN: SHODAQOH IR ============ -->
        <section id="screen-shodaqoh" class="screen space-y-5">
          <div class="home-period-filter">
            <div class="home-period-label">
              <span class="home-period-label-dot"></span>
              <span>Bulan</span>
            </div>
            <div class="month-dropdown" id="shodaqohMonthDropdown">
              <button
                type="button"
                id="shodaqohMonthDropdownTrigger"
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
                  id="shodaqohMonthDropdownValue"
                  class="month-dropdown-value"
                  >Bulan ini</span
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
                id="shodaqohMonthDropdownMenu"
                class="month-dropdown-menu"
                role="listbox"
                aria-label="Pilih bulan"
              ></div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="stat-chip p-4">
              <p class="eyebrow">Total Disetor Bulan Ini</p>
              <p class="mono text-sm font-extrabold mt-1" id="shodTotalDisetor">
                Rp 0
              </p>
            </div>
            <div class="stat-chip p-4">
              <p class="eyebrow">Jumlah Setoran</p>
              <p class="mono text-sm font-extrabold mt-1" id="shodJumlahOrang">
                0 orang
              </p>
            </div>
          </div>

          <div class="card p-5">
            <h2 class="font-display text-[13px] font-extrabold mb-3">
              Rincian per Kategori
            </h2>
            <div id="shodKategoriList" class="space-y-2"></div>
          </div>

          <div id="shodPostWrap" class="hidden">
            <button
              type="button"
              id="btnShodaqohPost"
              class="btn-primary w-full"
            >
              Posting Total Bulan Ini ke Kas
            </button>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-display text-[13px] font-extrabold">
                Sudah Bayar
              </h2>
              <span
                class="text-[10px] mono text-[color:var(--ink-faint)]"
                id="shodPaidCount"
                >0</span
              >
            </div>
            <div id="shodPaidList"></div>
            <div
              id="shodPaidEmpty"
              class="hidden text-center py-6 text-[color:var(--ink-faint)] text-xs"
            >
              Belum ada yang setor bulan ini.
            </div>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between mb-2">
              <h2 class="font-display text-[13px] font-extrabold">
                Belum Bayar
              </h2>
              <span
                class="text-[10px] mono text-[color:var(--ink-faint)]"
                id="shodUnpaidCount"
                >0</span
              >
            </div>
            <div id="shodUnpaidList"></div>
            <div
              id="shodUnpaidEmpty"
              class="hidden text-center py-6 text-[color:var(--ink-faint)] text-xs"
            >
              Semua nama tercatat sudah setor bulan ini.
            </div>
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
        <button class="nav-btn" data-tab="shodaqoh">
          <span class="nav-pill">
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.1"
            >
              <path
                d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0L12 5.35l-.77-.77a5.4 5.4 0 0 0-7.65 7.65L12 20.36l8.42-8.13a5.4 5.4 0 0 0 0-7.65z"
              />
            </svg>
          </span>
          <span>Shodaqoh IR</span>
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
                <!-- Kategori persis sama dengan SHODAQOH_CATEGORY_MAP di backend,
                     supaya transaksi manual & hasil posting Shodaqoh IR konsisten
                     satu kategori (huruf besar/kecil ikut disamakan). -->
                <option value="Infak IR"></option>
                <option value="Pemasukan Uang Sambung"></option>
                <option value="Pemasukan Jimpitan"></option>
                <option value="Pemasukan Siar-siar"></option>
                <option value="Pemasukan Seribuan"></option>
                <option value="Pemasukan Kafan"></option>
                <option value="Pemasukan Ukhro MT"></option>
                <option value="Pemasukan Dana Kesehatan"></option>
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
              id="btnActionDuplicate"
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
                  <rect x="8" y="8" width="12" height="12" rx="2" />
                  <path
                    d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                  />
                </svg>
              </span>

              <span class="font-display text-[13.5px] font-bold flex-1">
                Duplikasi Transaksi
              </span>
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

      <!-- ===================== CARRY FORWARD CONFIRM ===================== -->

      <div id="carryForwardOverlay" class="sheet-overlay hidden">
        <div class="sheet">
          <div class="sheet-handle"></div>

          <h3 class="font-display text-[16px] font-extrabold">
            Jadikan Saldo Awal
          </h3>

          <p
            id="carryForwardDesc"
            class="text-[12.5px] text-[color:var(--ink-soft)] mt-2 mb-5"
          ></p>

          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="btnCarryForwardCancel" class="btn-ghost">
              Batal
            </button>

            <button
              type="button"
              id="btnCarryForwardConfirm"
              class="btn-primary"
            >
              Lanjutkan
            </button>
          </div>
        </div>
      </div>

      <!-- ===================== SHODAQOH: ADD/EDIT SHEET ===================== -->
      <div id="shodaqohOverlay" class="sheet-overlay hidden">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <h3
            class="font-display text-[16px] font-extrabold"
            id="shodaqohSheetTitle"
          >
            Tambah Setoran
          </h3>
          <p class="text-[12.5px] text-[color:var(--ink-soft)] mt-1 mb-4">
            Satu baris = satu orang untuk satu bulan.
          </p>
          <form id="shodaqohForm" class="space-y-3 create-form">
            <div class="field-group">
              <label class="field-label">Nama</label>
              <select required id="shodNama" class="field-input">
                <option value="">Pilih nama anggota</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label">Bulan</label>
              <input required id="shodBulan" type="month" class="field-input" />
            </div>
            <div id="shodSusulanFields" class="space-y-3"></div>
            <div class="field-group">
              <label class="field-label">Uang Sambung (Rp)</label>
              <input
                id="shodUangSambung"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="field-input mono"
              />
            </div>
            <div class="field-group">
              <label class="field-label">Jimpitan (Rp)</label>
              <input
                id="shodJimpitan"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="field-input mono"
              />
            </div>
            <div class="field-group">
              <label class="field-label">Siar-siar (Rp)</label>
              <input
                id="shodSiarSiar"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="field-input mono"
              />
            </div>
            <div class="field-group">
              <label class="field-label">Seribuan (Rp)</label>
              <input
                id="shodSeribuan"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="field-input mono"
              />
            </div>
            <div class="field-group">
              <label class="field-label">Kafan (Rp)</label>
              <input
                id="shodKafan"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="field-input mono"
              />
            </div>
            <div class="field-group">
              <label class="field-label">Ukhro MT (Rp)</label>
              <input
                id="shodUkhroMT"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="field-input mono"
              />
            </div>
            <div class="field-group">
              <label class="field-label">Dana Kesehatan (Rp)</label>
              <input
                id="shodDanaKesehatan"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                class="field-input mono"
              />
            </div>
            <p
              id="shodaqohError"
              class="hidden text-xs px-3 py-2.5 form-error"
              style="color: var(--neg); background: var(--neg-soft)"
            ></p>
            <div class="flex gap-2.5 pt-1">
              <button
                type="button"
                id="btnCancelShodaqoh"
                class="btn-ghost flex-1"
              >
                Batal
              </button>
              <button
                type="submit"
                id="btnSubmitShodaqoh"
                class="btn-primary flex-1"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ===================== SHODAQOH: ACTION SHEET (Edit/Hapus) ===================== -->
      <div id="shodaqohActionOverlay" class="sheet-overlay hidden">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <h3 class="font-display text-[16px] font-extrabold">Setoran</h3>
          <p
            class="text-[12.5px] text-[color:var(--ink-soft)] mt-1 mb-4"
            id="shodaqohActionSubtitle"
          ></p>
          <div class="card p-1 divide-y divide-[color:var(--line)]">
            <button
              type="button"
              id="btnShodaqohActionEdit"
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
                >Edit Setoran</span
              >
            </button>
            <button
              type="button"
              id="btnShodaqohActionDelete"
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
                >Hapus Setoran</span
              >
            </button>
          </div>
          <button
            type="button"
            id="btnShodaqohActionCancel"
            class="btn-ghost w-full mt-3"
          >
            Batal
          </button>
        </div>
      </div>

      <!-- ===================== SHODAQOH: MODAL KONFIRMASI HAPUS ===================== -->
      <div id="shodaqohDeleteConfirmOverlay" class="modal-overlay hidden">
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
            Hapus data setoran ini?
          </h3>
          <p
            class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5"
            id="shodaqohDeleteConfirmDesc"
          >
            Tindakan ini tidak bisa dibatalkan.
          </p>
          <div class="flex gap-2.5 pt-4">
            <button
              type="button"
              id="btnShodaqohDeleteCancel"
              class="btn-ghost flex-1"
            >
              Batal
            </button>
            <button
              type="button"
              id="btnShodaqohDeleteConfirm"
              class="btn-primary flex-1"
              style="background: var(--neg)"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>

      <!-- ===================== SHODAQOH: KONFIRMASI POSTING KE KAS ===================== -->
      <div id="shodaqohPostOverlay" class="sheet-overlay hidden">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <h3 class="font-display text-[16px] font-extrabold">
            Posting ke Kas
          </h3>
          <p
            id="shodaqohPostDesc"
            class="text-[12.5px] text-[color:var(--ink-soft)] mt-2 mb-5"
          ></p>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" id="btnShodaqohPostCancel" class="btn-ghost">
              Batal
            </button>
            <button
              type="button"
              id="btnShodaqohPostConfirm"
              class="btn-primary"
            >
              Lanjutkan
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


// events.js
// events.js
document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  // Theme
  if ($("btnTheme")) {
    $("btnTheme").addEventListener("click", () =>
      applyTheme(currentTheme() === "dark" ? "light" : "dark"),
    );
  }
  if ($("themeLightBtn"))
    $("themeLightBtn").addEventListener("click", () => applyTheme("light"));
  if ($("themeDarkBtn"))
    $("themeDarkBtn").addEventListener("click", () => applyTheme("dark"));

  // Refresh
  if ($("btnRefresh")) {
    $("btnRefresh").addEventListener("click", () => {
      $("btnRefresh").classList.add("spin");
      loadData().finally(() =>
        setTimeout(() => $("btnRefresh").classList.remove("spin"), 400),
      );
    });
  }

  // Search / Tabs
  if ($("searchInput"))
    $("searchInput").addEventListener("input", applyFilters);
  if ($("btnSeeAll"))
    $("btnSeeAll").addEventListener("click", () => switchTab("history"));
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Cetak / Ekspor PDF
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

  // Logout
  if ($("btnLogout")) {
    $("btnLogout").addEventListener("click", () => {
      const session = getSession();
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

  // Tambah / Edit Transaksi
  if ($("segDebet"))
    $("segDebet").addEventListener("click", () => setTxJenis("debet"));
  if ($("segKredit"))
    $("segKredit").addEventListener("click", () => setTxJenis("kredit"));

  if ($("fabAdd")) {
    $("fabAdd").addEventListener("click", () => {
      if (state.isAdmin !== true) return;

      if (state.activeTab === "shodaqoh") {
        openShodaqohSheet(null);
        return;
      }

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

  // Action Sheet Transaksi
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

  // Duplikasi Transaksi
  if ($("btnActionDuplicate")) {
    $("btnActionDuplicate").addEventListener("click", () => {
      const no = state.actionNo;
      const tx = state.transactions.find((t) => String(t.no) === String(no));
      closeTxActionSheet();
      if (!tx) return;

      state.editingNo = null;
      if ($("txSheetTitle"))
        $("txSheetTitle").textContent = "Duplikasi Transaksi";
      if ($("btnSubmitTx")) $("btnSubmitTx").textContent = "Simpan";
      $("txError")?.classList.add("hidden");

      $("txTanggal").value = tx.tanggal;
      $("txAccount").value = tx.account;
      $("txKeterangan").value = tx.keterangan;
      $("txJumlah").value = tx.debet > 0 ? tx.debet : tx.kredit;
      setTxJenis(tx.debet > 0 ? "debet" : "kredit");
      $("txOverlay")?.classList.remove("hidden");
    });
  }

  // Carry Forward Saldo
  function closeCarryForwardConfirm() {
    $("carryForwardOverlay")?.classList.add("hidden");
    state.carryForwardMonth = null;
    state.carryForwardNextMonth = null;
  }

  if ($("btnCarryForwardCancel")) {
    $("btnCarryForwardCancel").addEventListener(
      "click",
      closeCarryForwardConfirm,
    );
  }

  if ($("carryForwardOverlay")) {
    $("carryForwardOverlay").addEventListener("click", (event) => {
      if (event.target === $("carryForwardOverlay")) {
        closeCarryForwardConfirm();
      }
    });
  }

  if ($("btnCarryForwardConfirm")) {
    $("btnCarryForwardConfirm").addEventListener("click", async () => {
      if (!state.carryForwardMonth) return;

      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        closeCarryForwardConfirm();
        return;
      }

      const monthKey = state.carryForwardMonth;
      $("btnCarryForwardConfirm").disabled = true;
      $("btnCarryForwardConfirm").textContent = "Memproses…";

      try {
        const res = await apiPost({
          action: "carryForwardSaldo",
          token: session.token,
          monthKey: monthKey,
        });

        if (!res.success) {
          showToast(res.message || "Gagal membuat saldo awal.", "error");
          return;
        }

        showToast(res.message || "Saldo awal berhasil dibuat.");
        closeCarryForwardConfirm();
        await loadData();
      } catch (err) {
        showToast("Tidak dapat menghubungi server: " + err.message, "error");
      } finally {
        $("btnCarryForwardConfirm").disabled = false;
        $("btnCarryForwardConfirm").textContent = "Lanjutkan";
      }
    });
  }

  // ===================== SHODAQOH IR =====================

  function renderShodaqohMemberOptions(selectedName) {
    const select = $("shodNama");
    if (!select) return;

    const names = state.shodaqoh.memberNames || [];

    select.innerHTML =
      '<option value="">Pilih nama anggota</option>' +
      names
        .map((nama) => {
          const selected = nama === selectedName ? " selected" : "";
          return `<option value="${escapeHtml(nama)}"${selected}>${escapeHtml(nama)}</option>`;
        })
        .join("");
  }

  function openShodaqohSheet(no) {
    const existingRow =
      no !== null && no !== undefined ? findShodaqohRowByNo(no) : null;
    state.shodaqoh.editingNo = existingRow ? existingRow.no : null;

    if ($("shodaqohSheetTitle"))
      $("shodaqohSheetTitle").textContent = existingRow
        ? "Edit Setoran"
        : "Tambah Setoran";
    if ($("btnSubmitShodaqoh"))
      $("btnSubmitShodaqoh").textContent = existingRow ? "Update" : "Simpan";
    $("shodaqohError")?.classList.add("hidden");
    $("shodaqohForm")?.reset();

    renderShodaqohSusulanFields(existingRow);

    renderShodaqohMemberOptions(existingRow ? existingRow.nama : "");
    if ($("shodNama"))
      $("shodNama").value = existingRow ? existingRow.nama : "";
    if ($("shodBulan"))
      $("shodBulan").value = existingRow
        ? existingRow.bulan
        : state.shodaqoh.selectedMonth || state.shodaqoh.currentMonth;
    if ($("shodUangSambung"))
      $("shodUangSambung").value = existingRow
        ? existingRow.uangSambung || ""
        : "";
    if ($("shodJimpitan"))
      $("shodJimpitan").value = existingRow ? existingRow.jimpitan || "" : "";
    if ($("shodSiarSiar"))
      $("shodSiarSiar").value = existingRow ? existingRow.siarSiar || "" : "";
    if ($("shodSeribuan"))
      $("shodSeribuan").value = existingRow ? existingRow.seribuan || "" : "";
    if ($("shodKafan"))
      $("shodKafan").value = existingRow ? existingRow.kafan || "" : "";
    if ($("shodUkhroMT"))
      $("shodUkhroMT").value = existingRow ? existingRow.ukhroMT || "" : "";
    if ($("shodDanaKesehatan"))
      $("shodDanaKesehatan").value = existingRow
        ? existingRow.danaKesehatan || ""
        : "";

    $("shodaqohOverlay")?.classList.remove("hidden");
  }

  function closeShodaqohSheet() {
    state.shodaqoh.editingNo = null;
    $("shodaqohOverlay")?.classList.add("hidden");
  }

  if ($("btnCancelShodaqoh"))
    $("btnCancelShodaqoh").addEventListener("click", closeShodaqohSheet);
  if ($("shodaqohOverlay")) {
    $("shodaqohOverlay").addEventListener("click", (e) => {
      if (e.target === $("shodaqohOverlay")) closeShodaqohSheet();
    });
  }

  if ($("shodaqohForm")) {
    $("shodaqohForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const nama = $("shodNama").value.trim();
      const bulan = $("shodBulan").value;

      if (!nama) {
        $("shodaqohError").textContent = "Nama wajib diisi.";
        $("shodaqohError").classList.remove("hidden");
        return;
      }
      if (!bulan) {
        $("shodaqohError").textContent = "Bulan wajib dipilih.";
        $("shodaqohError").classList.remove("hidden");
        return;
      }
      if (state.isAdmin !== true) {
        $("shodaqohError").textContent =
          "Hanya admin yang dapat menyimpan data shodaqoh.";
        $("shodaqohError").classList.remove("hidden");
        return;
      }

      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        $("shodaqohOverlay").classList.add("hidden");
        setAdminUI(false);
        return;
      }

      const isEditing = state.shodaqoh.editingNo !== null;
      const existingRow = isEditing
        ? findShodaqohRowByNo(state.shodaqoh.editingNo)
        : null;

      $("btnSubmitShodaqoh").disabled = true;
      $("btnSubmitShodaqoh").textContent = isEditing
        ? "Memperbarui…"
        : "Menyimpan…";

      try {
        const payload = {
          action: "saveShodaqohRow",
          token: session.token,
          nama,
          bulan,
          susulan: buildShodaqohSusulanPayload(existingRow),
          uangSambung: Number($("shodUangSambung").value) || 0,
          jimpitan: Number($("shodJimpitan").value) || 0,
          siarSiar: Number($("shodSiarSiar").value) || 0,
          seribuan: Number($("shodSeribuan").value) || 0,
          kafan: Number($("shodKafan").value) || 0,
          ukhroMT: Number($("shodUkhroMT").value) || 0,
          danaKesehatan: Number($("shodDanaKesehatan").value) || 0,
        };
        if (isEditing) payload.no = state.shodaqoh.editingNo;

        const res = await apiPost(payload);
        if (!res.success) {
          $("shodaqohError").textContent =
            res.message || "Gagal menyimpan data shodaqoh.";
          $("shodaqohError").classList.remove("hidden");
          return;
        }
        $("shodaqohOverlay").classList.add("hidden");
        showToast(
          isEditing
            ? "Data shodaqoh berhasil diperbarui."
            : "Data shodaqoh berhasil ditambahkan.",
        );
        state.shodaqoh.editingNo = null;
        await loadShodaqohData(bulan);
      } catch (err) {
        $("shodaqohError").textContent =
          "Tidak dapat menghubungi server: " + err.message;
        $("shodaqohError").classList.remove("hidden");
      } finally {
        $("btnSubmitShodaqoh").disabled = false;
        $("btnSubmitShodaqoh").textContent = isEditing ? "Update" : "Simpan";
      }
    });
  }

  // Action Sheet Setoran (Edit / Hapus)
  function openShodaqohActionSheet(no) {
    const row = findShodaqohRowByNo(no);
    if (!row) return;
    state.shodaqoh.actionNo = row.no;
    if ($("shodaqohActionSubtitle")) {
      $("shodaqohActionSubtitle").textContent =
        row.nama + " · " + getMonthLabel(row.bulan);
    }
    $("shodaqohActionOverlay")?.classList.remove("hidden");
  }

  function closeShodaqohActionSheet() {
    $("shodaqohActionOverlay")?.classList.add("hidden");
  }

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".shod-card-clickable");
    if (!card) return;
    openShodaqohActionSheet(card.dataset.no);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest && e.target.closest(".shod-card-clickable");
    if (!card) return;
    e.preventDefault();
    openShodaqohActionSheet(card.dataset.no);
  });

  if ($("btnShodaqohActionCancel"))
    $("btnShodaqohActionCancel").addEventListener(
      "click",
      closeShodaqohActionSheet,
    );
  if ($("shodaqohActionOverlay")) {
    $("shodaqohActionOverlay").addEventListener("click", (e) => {
      if (e.target === $("shodaqohActionOverlay")) closeShodaqohActionSheet();
    });
  }

  if ($("btnShodaqohActionEdit")) {
    $("btnShodaqohActionEdit").addEventListener("click", () => {
      const no = state.shodaqoh.actionNo;
      closeShodaqohActionSheet();
      if (no === null || no === undefined) return;
      openShodaqohSheet(no);
    });
  }

  function openShodaqohDeleteConfirm() {
    const row = findShodaqohRowByNo(state.shodaqoh.actionNo);
    if ($("shodaqohDeleteConfirmDesc")) {
      $("shodaqohDeleteConfirmDesc").innerHTML = row
        ? `<b>${row.nama}</b> · ${getMonthLabel(row.bulan)} akan dihapus permanen dan tidak bisa dibatalkan.`
        : "Tindakan ini tidak bisa dibatalkan.";
    }
    $("shodaqohDeleteConfirmOverlay")?.classList.remove("hidden");
  }

  function closeShodaqohDeleteConfirm() {
    $("shodaqohDeleteConfirmOverlay")?.classList.add("hidden");
  }

  if ($("btnShodaqohActionDelete")) {
    $("btnShodaqohActionDelete").addEventListener("click", () => {
      closeShodaqohActionSheet();
      openShodaqohDeleteConfirm();
    });
  }

  if ($("btnShodaqohDeleteCancel"))
    $("btnShodaqohDeleteCancel").addEventListener("click", () => {
      state.shodaqoh.actionNo = null;
      closeShodaqohDeleteConfirm();
    });
  if ($("shodaqohDeleteConfirmOverlay")) {
    $("shodaqohDeleteConfirmOverlay").addEventListener("click", (e) => {
      if (e.target === $("shodaqohDeleteConfirmOverlay")) {
        state.shodaqoh.actionNo = null;
        closeShodaqohDeleteConfirm();
      }
    });
  }

  if ($("btnShodaqohDeleteConfirm")) {
    $("btnShodaqohDeleteConfirm").addEventListener("click", () => {
      const no = state.shodaqoh.actionNo;
      if (no === null || no === undefined) {
        closeShodaqohDeleteConfirm();
        return;
      }
      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        closeShodaqohDeleteConfirm();
        return;
      }

      $("btnShodaqohDeleteConfirm").disabled = true;
      $("btnShodaqohDeleteConfirm").textContent = "Menghapus…";

      apiPost({
        action: "deleteShodaqohRow",
        token: session.token,
        no,
      })
        .then((res) => {
          if (!res.success) {
            showToast(res.message || "Gagal menghapus data shodaqoh.", "error");
            return;
          }
          showToast("Data shodaqoh berhasil dihapus.");
          loadShodaqohData();
        })
        .catch((err) =>
          showToast("Tidak dapat menghubungi server: " + err.message, "error"),
        )
        .finally(() => {
          state.shodaqoh.actionNo = null;
          $("btnShodaqohDeleteConfirm").disabled = false;
          $("btnShodaqohDeleteConfirm").textContent = "Hapus";
          closeShodaqohDeleteConfirm();
        });
    });
  }

  // Posting Total Shodaqoh Bulan Ini ke Kas
  function closeShodaqohPostConfirm() {
    $("shodaqohPostOverlay")?.classList.add("hidden");
  }

  if ($("btnShodaqohPost")) {
    $("btnShodaqohPost").addEventListener("click", () => {
      const monthKey = state.shodaqoh.selectedMonth;
      if (!monthKey) return;
      if ($("shodaqohPostDesc")) {
        $("shodaqohPostDesc").textContent =
          "Total setiap kategori shodaqoh " +
          getMonthLabel(monthKey) +
          " akan dicatat sebagai transaksi pemasukan baru di Kas, sesuai kategori masing-masing (mis. Susulan IR → Infak IR, Uang Sambung → Pemasukan Uang Sambung). Lanjutkan?";
      }
      $("shodaqohPostOverlay")?.classList.remove("hidden");
    });
  }

  if ($("btnShodaqohPostCancel"))
    $("btnShodaqohPostCancel").addEventListener(
      "click",
      closeShodaqohPostConfirm,
    );
  if ($("shodaqohPostOverlay")) {
    $("shodaqohPostOverlay").addEventListener("click", (e) => {
      if (e.target === $("shodaqohPostOverlay")) closeShodaqohPostConfirm();
    });
  }

  if ($("btnShodaqohPostConfirm")) {
    $("btnShodaqohPostConfirm").addEventListener("click", async () => {
      const monthKey = state.shodaqoh.selectedMonth;
      if (!monthKey) return;

      const session = getSession();
      if (!session) {
        showToast("Sesi admin berakhir, silakan login ulang.", "error");
        closeShodaqohPostConfirm();
        return;
      }

      $("btnShodaqohPostConfirm").disabled = true;
      $("btnShodaqohPostConfirm").textContent = "Memproses…";

      try {
        const res = await apiPost({
          action: "postShodaqohToKas",
          token: session.token,
          monthKey,
        });

        if (!res.success) {
          showToast(res.message || "Gagal posting ke Kas.", "error");
          return;
        }

        showToast(res.message || "Berhasil diposting ke Kas.");
        closeShodaqohPostConfirm();
        await loadData();
        await loadShodaqohData(monthKey);
      } catch (err) {
        showToast("Tidak dapat menghubungi server: " + err.message, "error");
      } finally {
        $("btnShodaqohPostConfirm").disabled = false;
        $("btnShodaqohPostConfirm").textContent = "Lanjutkan";
      }
    });
  }

  // Konfirmasi Hapus
  function openDeleteConfirm() {
    const tx = state.transactions.find(
      (t) => String(t.no) === String(state.actionNo),
    );
    if ($("deleteConfirmDesc")) {
      $("deleteConfirmDesc").innerHTML = tx
        ? `<b>${tx.account}</b> · ${fmtDateShort(tx.tanggal)} akan dihapus permanen dan tidak bisa dibatalkan.`
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

  // Auth Gate & Toggle Password
  if ($("btnTogglePassword")) {
    $("btnTogglePassword").addEventListener("click", () => {
      const pwdInput = $("authPassword");
      const iconEye = $("iconEye");
      const iconEyeOff = $("iconEyeOff");
      const isPassword = pwdInput.type === "password";

      pwdInput.type = isPassword ? "text" : "password";
      iconEye?.classList.toggle("hidden", !isPassword);
      iconEyeOff?.classList.toggle("hidden", isPassword);
    });
  }

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

        const role = String(res.role || "pengurus").toLowerCase();
        saveSession(res.token, res.nama || username, role, res.expiresAt);
        setAdminUI(role === "admin", res.nama || username);
        $("authError").classList.add("hidden");

        $("authForm").reset();
        if ($("authPassword")) $("authPassword").type = "password";
        $("iconEye")?.classList.add("hidden");
        $("iconEyeOff")?.classList.remove("hidden");

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

  // Global Keydown & Outside Click Handlers
  document.addEventListener("click", (event) => {
    const homeDropdown = $("homeMonthDropdown");
    const historyDropdown = $("historyMonthDropdown");
    const shodaqohDropdown = $("shodaqohMonthDropdown");
    if (
      (!homeDropdown || !homeDropdown.contains(event.target)) &&
      (!historyDropdown || !historyDropdown.contains(event.target)) &&
      (!shodaqohDropdown || !shodaqohDropdown.contains(event.target))
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
      $("shodaqohOverlay")?.classList.add("hidden");
      $("shodaqohActionOverlay")?.classList.add("hidden");
      $("shodaqohDeleteConfirmOverlay")?.classList.add("hidden");
      $("shodaqohPostOverlay")?.classList.add("hidden");
      state.shodaqoh.actionNo = null;
      state.shodaqoh.editingNo = null;
    }
  });

  // Init Session
  const existing = getSession();
  if (existing) {
    setAdminUI(
      String(existing.role || "").toLowerCase() === "admin",
      existing.nama,
    );
    enterApp();
  }
});



// main.js

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
  carryForwardMonth: null,
  carryForwardNextMonth: null,
  shodaqoh: {
    loaded: false,
    selectedMonth: null, // null = belum ditentukan, diisi dari currentMonth backend
    currentMonth: "",
    allMonths: [],
    susulanMonths: [],
    susulanActiveMonths: [],
    rows: [],
    totals: {},
    knownNames: [],
    memberNames: [],
    paidNames: [],
    unpaidNames: [],
    editingNo: null,
    actionNo: null,
  },
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
    month: "long",
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

async function apiGetShodaqoh(monthKey) {
  const url =
    `${CONFIG.WEB_APP_URL}?action=getShodaqohData` +
    (monthKey ? `&month=${encodeURIComponent(monthKey)}` : "");
  const res = await fetch(url);
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

      const [year, month] = m.split("-");

      const nextMonthDate = new Date(Number(year), Number(month), 1);

      // PENTING: jangan pakai toISOString() di sini — itu mengonversi ke UTC,
      // dan untuk zona waktu di depan UTC (misalnya WIB/UTC+7), tanggal 1
      // tengah malam lokal akan mundur ke bulan sebelumnya saat dikonversi
      // ke UTC. Akibatnya label tombol "Jadikan Saldo Awal ..." menunjukkan
      // bulan yang salah (bulan yang sama, bukan bulan berikutnya).
      // Gunakan komponen tanggal lokal saja.
      const nextMonthKey =
        nextMonthDate.getFullYear() +
        "-" +
        String(nextMonthDate.getMonth() + 1).padStart(2, "0");

      return `
        <div
          class="card p-4 recap-card"
          data-month="${m}"
        >

          <!-- HEADER BULAN -->
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


          <!-- AKSI CARRY FORWARD -->
          ${
            state.isAdmin
              ? `
                <div
                  class="mt-3 pt-3"
                  style="
                    border-top:1px solid var(--line);
                  "
                >

                  <button
                    type="button"
                    class="btn-carry-forward w-full flex items-center justify-center gap-2"
                    data-month="${m}"
                    data-next-month="${nextMonthKey}"
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
                        d="M5 12h14"
                      />
                      <path
                        d="m13 6 6 6-6 6"
                      />
                    </svg>

                    <span>
                      Jadikan Saldo Awal ${getMonthLabel(nextMonthKey)}
                    </span>

                  </button>

                </div>
              `
              : ""
          }

        </div>
      `;
    })
    .join("");

  // ----------------------------------------------------------
  // BUKA RIWAYAT BULAN
  // ----------------------------------------------------------

  wrap.querySelectorAll(".recap-open-history").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedMonth = button.dataset.month;

      renderAllMonthChipRows();
      refreshScopedUI();
      switchTab("history");
    });
  });

  // ----------------------------------------------------------
  // CARRY FORWARD
  // ----------------------------------------------------------

  wrap.querySelectorAll(".btn-carry-forward").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      openCarryForwardConfirm(button.dataset.month, button.dataset.nextMonth);
    });
  });
}

// ---------- CARRY FORWARD SALDO (Saldo Akhir -> Saldo Awal Bulan Berikutnya) ----------
// Dipanggil dari tombol "Jadikan Saldo Awal ..." pada kartu Rekap Bulanan.
// Menyiapkan state lalu menampilkan modal konfirmasi (lihat events.js untuk
// handler tombol Batal/Lanjutkan yang memanggil action "carryForwardSaldo").
function openCarryForwardConfirm(monthKey, nextMonthKey) {
  if (!monthKey || !nextMonthKey) return;

  const scope = computeScope(monthKey);

  state.carryForwardMonth = monthKey;
  state.carryForwardNextMonth = nextMonthKey;

  if ($("carryForwardDesc")) {
    $("carryForwardDesc").textContent =
      `Saldo akhir ${getMonthLabel(monthKey)} sebesar ${fmtRp(scope.akhir)} akan dijadikan Saldo Awal ${getMonthLabel(nextMonthKey)}. Lanjutkan?`;
  }

  $("carryForwardOverlay")?.classList.remove("hidden");
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
    const now = new Date();
    const currentMonthKey =
      now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    labels.push(getMonthShortLabel(currentMonthKey));
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
  shodaqoh: "Shodaqoh IR",
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
  if (tab === "shodaqoh" && !state.shodaqoh.loaded) {
    loadShodaqohData();
  }
}

function updateFabVisibility() {
  const fab = $("fabAdd");
  if (!fab) return;
  const isAdmin = state.isAdmin === true || state.isAdmin === "true";
  const isAllowedTab =
    state.activeTab === "home" ||
    state.activeTab === "history" ||
    state.activeTab === "shodaqoh";
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
  switchTab("home");
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

// =========================================================================
// SHODAQOH IR
// =========================================================================

const SHOD_CATEGORY_LABELS = {
  susulanIR: "Susulan IR",
  uangSambung: "Uang Sambung",
  jimpitan: "Jimpitan",
  siarSiar: "Siar-siar",
  seribuan: "Seribuan",
  kafan: "Kafan",
  ukhroMT: "Ukhro MT",
  danaKesehatan: "Dana Kesehatan",
};

async function loadShodaqohData(monthKey) {
  try {
    const month = monthKey || state.shodaqoh.selectedMonth || "";

    let data = await apiGetShodaqoh(month);

    if (!data.success) {
      throw new Error(data.message || "Gagal memuat data");
    }

    // Jika pertama kali membuka Shodaqoh IR,
    // gunakan bulan berjalan.
    if (!month && data.currentMonth) {
      data = await apiGetShodaqoh(data.currentMonth);

      if (!data.success) {
        throw new Error(data.message || "Gagal memuat data");
      }
    }

    // =====================================================
    // NORMALISASI RESPONSE BACKEND
    // =====================================================

    function getEmptyShodaqohTotals() {
      return {
        susulanIR: 0,
        uangSambung: 0,
        jimpitan: 0,
        siarSiar: 0,
        seribuan: 0,
        kafan: 0,
        ukhroMT: 0,
        danaKesehatan: 0,
        total: 0,
      };
    }

    const rows = Array.isArray(data.rows) ? data.rows : [];

    const totals =
      data.totals && typeof data.totals === "object"
        ? data.totals
        : getEmptyShodaqohTotals();

    const allMonths = Array.isArray(data.allMonths) ? data.allMonths : [];

    const susulanMonths = Array.isArray(data.susulanMonths)
      ? data.susulanMonths
      : [];

    const susulanActiveMonths = Array.isArray(data.susulanActiveMonths)
      ? data.susulanActiveMonths
      : [];

    const memberNames = Array.isArray(data.memberNames) ? data.memberNames : [];

    const knownNames = Array.isArray(data.knownNames)
      ? data.knownNames
      : memberNames;

    const paidNames = Array.isArray(data.paidNames) ? data.paidNames : [];

    const unpaidNames = Array.isArray(data.unpaidNames) ? data.unpaidNames : [];

    // =====================================================
    // SIMPAN KE STATE
    // =====================================================

    state.shodaqoh.loaded = true;

    state.shodaqoh.currentMonth = data.currentMonth || "";

    state.shodaqoh.allMonths = allMonths;

    state.shodaqoh.susulanMonths = susulanMonths;

    state.shodaqoh.susulanActiveMonths = susulanActiveMonths;

    state.shodaqoh.rows = rows;

    state.shodaqoh.totals = totals;

    state.shodaqoh.knownNames = knownNames;

    state.shodaqoh.memberNames = memberNames.length ? memberNames : knownNames;

    state.shodaqoh.paidNames = paidNames;

    state.shodaqoh.unpaidNames = unpaidNames;

    state.shodaqoh.selectedMonth =
      data.selectedMonth || data.currentMonth || month;

    // =====================================================
    // RENDER
    // =====================================================

    renderShodaqohScreen();
  } catch (err) {
    console.error("loadShodaqohData error:", err);

    showToast("Gagal memuat data shodaqoh: " + err.message, "error");
  }
}

function renderShodaqohScreen() {
  renderShodaqohMonthDropdown();
  renderShodaqohSummary();
  renderShodaqohLists();
}

// ---- Dropdown bulan (khusus Shodaqoh, terpisah dari dropdown Kas) ----
function renderShodaqohMonthDropdown() {
  const trigger = $("shodaqohMonthDropdownTrigger");
  const value = $("shodaqohMonthDropdownValue");
  const menu = $("shodaqohMonthDropdownMenu");
  const dropdown = $("shodaqohMonthDropdown");
  if (!trigger || !value || !menu || !dropdown) return;

  const cur = state.shodaqoh.currentMonth;
  const sel = state.shodaqoh.selectedMonth;

  // Gabungkan semua bulan yang punya data + bulan berjalan, supaya bulan
  // berjalan tetap bisa dipilih walau belum ada satu pun setoran masuk.
  const months = [...new Set([cur, ...state.shodaqoh.allMonths])]
    .filter(Boolean)
    .sort()
    .reverse();

  value.textContent =
    sel === cur ? `Bulan ini · ${getMonthLabel(sel)}` : getMonthLabel(sel);

  menu.innerHTML = months
    .map(
      (m) => `
      <button type="button"
        class="month-dropdown-option ${m === sel ? "active" : ""}"
        data-month="${m}" role="option"
        aria-selected="${m === sel}">
        <span class="month-dropdown-check" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="m5 12 4 4L19 6"></path>
          </svg>
        </span>
        <span>${getMonthLabel(m)}${m === cur ? " (bulan ini)" : ""}</span>
      </button>`,
    )
    .join("");

  trigger.onclick = (event) => {
    event.stopPropagation();
    const willOpen = !dropdown.classList.contains("open");
    closeAllMonthDropdowns();
    dropdown.classList.toggle("open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  };

  menu.querySelectorAll(".month-dropdown-option").forEach((option) => {
    option.onclick = (event) => {
      event.stopPropagation();
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
      loadShodaqohData(option.dataset.month);
    };
  });
}

function renderShodaqohSummary() {
  const totals = state.shodaqoh.totals || {};
  const grandTotal = Object.values(totals).reduce(
    (s, v) => s + (Number(v) || 0),
    0,
  );

  if ($("shodTotalDisetor"))
    $("shodTotalDisetor").textContent = fmtRp(grandTotal);
  if ($("shodJumlahOrang")) {
    const totalMembers =
      state.shodaqoh.memberNames?.length ||
      state.shodaqoh.knownNames?.length ||
      0;

    $("shodJumlahOrang").textContent = totalMembers + " anggota";
  }

  if ($("shodKategoriList")) {
    $("shodKategoriList").innerHTML = Object.keys(SHOD_CATEGORY_LABELS)
      .map((key) => {
        const val = Number(totals[key]) || 0;
        return `
        <div class="flex items-center justify-between">
          <span class="text-[12px] text-[color:var(--ink-soft)]">${SHOD_CATEGORY_LABELS[key]}</span>
          <span class="mono text-[12.5px] font-bold">${fmtRp(val)}</span>
        </div>`;
      })
      .join("");
  }

  const postWrap = $("shodPostWrap");
  if (postWrap) {
    postWrap.classList.toggle(
      "hidden",
      !(state.isAdmin === true && grandTotal > 0),
    );
  }
}

function renderShodaqohLists() {
  const rows = state.shodaqoh.rows || [];
  const unpaid = state.shodaqoh.unpaidNames || [];
  const isAdmin = state.isAdmin === true;

  if ($("shodPaidCount")) $("shodPaidCount").textContent = String(rows.length);
  if ($("shodUnpaidCount"))
    $("shodUnpaidCount").textContent = String(unpaid.length);

  const paidBody = $("shodPaidList");
  if (paidBody) {
    if (!rows.length) {
      paidBody.innerHTML = "";
      $("shodPaidEmpty")?.classList.remove("hidden");
    } else {
      $("shodPaidEmpty")?.classList.add("hidden");
      paidBody.innerHTML = [...rows]
        .sort((a, b) => String(a.nama).localeCompare(String(b.nama), "id"))
        .map((r) => {
          const clickable = isAdmin
            ? ` data-no="${r.no}" role="button" tabindex="0"`
            : "";
          const chevron = isAdmin
            ? '<svg class="tx-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>'
            : "";
          return `
          <div class="tx-card${isAdmin ? " shod-card-clickable" : ""}"${clickable}>
            <div class="tx-icon" style="background:var(--pos-soft)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pos)" stroke-width="2.3"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="tx-title">${escapeHtml(r.nama)}</p>
              <p class="tx-meta">${r.tanggalBayar ? "Dibayar " + escapeHtml(r.tanggalBayar) : "-"}</p>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="tx-amount mono" style="color:var(--pos)">${fmtRp(r.total)}</p>
            </div>
            ${chevron}
          </div>`;
        })
        .join("");
    }
  }

  const unpaidBody = $("shodUnpaidList");
  if (unpaidBody) {
    if (!unpaid.length) {
      unpaidBody.innerHTML = "";
      $("shodUnpaidEmpty")?.classList.remove("hidden");
    } else {
      $("shodUnpaidEmpty")?.classList.add("hidden");
      unpaidBody.innerHTML = unpaid
        .map(
          (nama) => `
          <div class="tx-card">
            <div class="tx-icon" style="background:var(--neg-soft)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neg)" stroke-width="2.3"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="tx-title">${escapeHtml(nama)}</p>
              <p class="tx-meta">Belum ada setoran bulan ini</p>
            </div>
          </div>`,
        )
        .join("");
    }
  }
}

// ---- Sheet tambah/edit: bangun input Susulan IR untuk jendela 5 bulan aktif ----
function renderShodaqohSusulanFields(existingRow) {
  const wrap = $("shodSusulanFields");
  if (!wrap) return;

  const allMonths = state.shodaqoh.susulanMonths || [];
  const activeMonths = state.shodaqoh.susulanActiveMonths || [];

  wrap.innerHTML = activeMonths
    .map((bulan) => {
      const idx = allMonths.indexOf(bulan);
      const existingVal =
        existingRow && idx !== -1 ? Number(existingRow.susulan[idx]) || 0 : "";
      return `
      <div class="field-group">
        <label class="field-label">Susulan IR ${escapeHtml(bulan)} (Rp)</label>
        <input
          data-susulan-month="${escapeHtml(bulan)}"
          type="number" min="0" step="1" placeholder="0"
          class="field-input mono shod-susulan-input"
          value="${existingVal}"
        />
      </div>`;
    })
    .join("");
}

// Menyusun array susulan LENGKAP (sepanjang susulanMonths permanen) untuk
// dikirim ke backend — nilai di luar jendela 5 bulan aktif (kalau sedang
// edit baris lama) tetap dipertahankan, hanya bulan aktif yang ditimpa
// dengan isian form saat ini.
function buildShodaqohSusulanPayload(existingRow) {
  const allMonths = state.shodaqoh.susulanMonths || [];
  const base = allMonths.map((bulan, idx) =>
    existingRow ? Number(existingRow.susulan[idx]) || 0 : 0,
  );

  document.querySelectorAll(".shod-susulan-input").forEach((input) => {
    const bulan = input.dataset.susulanMonth;
    const idx = allMonths.indexOf(bulan);
    if (idx !== -1) base[idx] = Number(input.value) || 0;
  });

  return base;
}

function findShodaqohRowByNo(no) {
  return (state.shodaqoh.rows || []).find((r) => String(r.no) === String(no));
}


// Code.gs
// code.gs
const SHEET_TRANSAKSI = 'Transaksi';
const SHEET_USERS = 'Users';
const SHEET_SESSIONS = 'Sessions';
const SHEET_SHODAQOH = 'Shodaqoh IR';

const SALDO_AWAL_PROP_KEY = 'SALDO_AWAL';
const SALDO_AWAL_LABEL = 'SALDO AWAL';

const HEADERS_TRANSAKSI = [
  'No',
  'Tanggal',
  'Account',
  'Keterangan',
  'Debet',
  'Kredit',
  'Saldo',
  'Created_By'
];

const HEADERS_USERS = [
  'Username',
  'Password',
  'Nama',
  'Role'
];

const HEADERS_SESSIONS = [
  'Token',
  'Username',
  'Role',
  'Nama',
  'ExpiresAt'
];

const DEFAULT_ADMIN = [
  'admin',
  'admin123',
  'Admin Kas',
  'admin'
];

const VALID_ROLES = ['admin', 'pengurus'];
const DEFAULT_ROLE = 'pengurus';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// ============================================================
// KONFIGURASI SHODAQOH BULANAN
// ============================================================
//
// Struktur baru (per fitur "Shodaqoh IR"):
//
//   No | Nama | Bulan | Susulan IR <bulan1..N> | Uang Sambung | Jimpitan |
//   Siar-siar | Seribuan | Kafan | Ukhro MT | Total Disetor Bulan Ini |
//   Dana Kesehatan | Tanggal Bayar
//
// PERUBAHAN vs versi lama:
// 1) Kolom "Bulan" (YYYY-MM) ditambahkan — SATU BARIS = SATU ORANG UNTUK
//    SATU BULAN. Versi lama hanya punya 1 baris per orang tanpa penanda
//    bulan, sehingga data "Uang Sambung/Jimpitan/dst" bulan lalu otomatis
//    tertimpa begitu diedit untuk bulan berikutnya — tidak ada riwayat
//    sama sekali dan siapa "sudah/belum bayar bulan ini" tidak bisa
//    dijawab. Dengan kolom Bulan, setiap bulan cukup tambah baris baru
//    per orang, riwayat lama tetap utuh.
// 2) Kolom "Tanggal Bayar" ditambahkan — otomatis diisi tanggal+jam saat
//    baris disimpan/diupdate (skema "1 tanggal per baris").
// 3) postShodaqohToKas() SEBELUMNYA menjumlah SELURUH isi sheet tanpa
//    peduli bulan (parameter monthKey cuma dipakai untuk label & anti
//    double-posting), jadi kalau dipanggil di bulan berikutnya tanpa
//    data lama dibersihkan, angka bulan lalu ikut ke-posting lagi
//    (double count). Sekarang totalnya dihitung HANYA dari baris yang
//    Bulan-nya cocok dengan monthKey yang diposting.
//
// Kolom "Susulan IR" TIDAK memakai daftar bulan yang di-hardcode.
// Setiap kali sheet dibuka/diperbarui (lewat getSheet atau menu Kas
// Setup), sistem otomatis menghitung 5 bulan terakhir relatif ke
// tanggal hari itu, lalu MENAMBAHKAN kolom bulan yang belum ada.
//
// PENTING: proses ini hanya pernah MENAMBAH kolom baru (lewat
// insertColumnBefore, bukan menimpa teks header), dan bulan yang sudah
// pernah dibuat DISIMPAN PERMANEN di Script Properties sehingga urutan
// dan isi kolom lama tidak pernah berubah / salah label ketika jendela
// 5 bulan bergeser ke bulan berikutnya.
//
const SHODAQOH_SUSULAN_JUMLAH_BULAN = 5;

const SHODAQOH_ANGGOTA_TETAP = [
  "Umam, H, Bp dan Istri",
  "Didik, H, Bp dan Istri",
  "Budi, H, Bp dan Istri",
  "Orlon, H, Bp dan Istri",
  "Umar, H, Bp dan Istri",
  "Adi, Bp dan Istri",
  "Naskop, Bp dan Istri",
  "Usman, H, Bp dan Istri",
  "Tasminten, Hj, Ibu",
  "Suwarto, H, Bp dan Istri",
  "Puji, Bp dan Istri",
  "Eko, Bp dan Istri",
  "Jajuk, Ibu dan istri",
  "Rofik, Bp dan Istri",
  "Alis, Bp",
  "Galih, MM",
  "Albet, Bp dan Istri",
  "Udin, Bp dan Istri",
  "A'an, Bp dan istri",
  "Yayuk, Ibu",
  "Stevi, Ibu",
  "Anis, Ibu",
  "Naseri, Bp",
  "Kabit, Bp",
  "Raji, Bp",
  "Rasminto, Bp",
  "Tamyis, Bp",
  "Yacop, Bp",
  "Asri, Ibu",
  "Lia, Ibu dan suami",
  "Karawang, MM",
  "M. Zainuddin, Bp"
];

const BULAN_ID_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
];

function formatBulanTahunSingkat(date) {
  const bulan = BULAN_ID_SINGKAT[date.getMonth()];
  const tahun2 = String(date.getFullYear()).slice(-2);
  return bulan + '-' + tahun2;
}

function getCurrentMonthKey() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM'
  );
}

function getShodaqohSusulanWindow() {
  const months = [];
  const now = new Date();

  for (let i = SHODAQOH_SUSULAN_JUMLAH_BULAN - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(formatBulanTahunSingkat(d));
  }

  return months;
}

const SHODAQOH_MONTHS_PROP_KEY = 'SHODAQOH_SUSULAN_MONTHS_LIST';

function getShodaqohSusulanMonths() {
  const props = PropertiesService.getScriptProperties();
  const stored = props.getProperty(SHODAQOH_MONTHS_PROP_KEY);

  let months = [];

  try {
    months = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(months)) months = [];
  } catch (err) {
    months = [];
  }

  const window = getShodaqohSusulanWindow();
  let changed = false;

  window.forEach(function (bulan) {
    if (months.indexOf(bulan) === -1) {
      months.push(bulan);
      changed = true;
    }
  });

  if (changed || !stored) {
    props.setProperty(
      SHODAQOH_MONTHS_PROP_KEY,
      JSON.stringify(months)
    );
  }

  return months;
}

function getShodaqohMemberNames() {
  return SHODAQOH_ANGGOTA_TETAP.slice();
}

// Pemetaan kolom Shodaqoh -> kategori (Account) di Transaksi Kas.
const SHODAQOH_CATEGORY_MAP = {
  susulanIR: 'Infak IR',
  uangSambung: 'Pemasukan Uang Sambung',
  jimpitan: 'Pemasukan Jimpitan',
  siarSiar: 'Pemasukan Siar-siar',
  seribuan: 'Pemasukan Seribuan',
  kafan: 'Pemasukan Kafan',
  ukhroMT: 'Pemasukan Ukhro MT',
  danaKesehatan: 'Pemasukan Dana Kesehatan'
};


// ============================================================
// MENU
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Kas Setup')
    .addItem('Pastikan Sheet & Header Sudah Benar', 'setupSheets')
    .addItem('Migrasi Kolom Saldo ke Formula', 'migrateSaldoToFormula')
    .addSeparator()
    .addItem('Perbarui Header Shodaqoh', 'refreshShodaqohHeaders')
    .addItem('Posting Shodaqoh Bulanan ke Kas', 'promptPostShodaqohToKas')
    .addToUi();
}


function setupSheets() {
  getSheet(SHEET_TRANSAKSI);
  getSheet(SHEET_USERS);
  getSheet(SHEET_SESSIONS);
  getSheet(SHEET_SHODAQOH);

  return {
    success: true,
    message: 'Sheet "Transaksi", "Users", "Sessions", dan "Shodaqoh Bulanan" siap digunakan.'
  };
}


// ============================================================
// GET
// ============================================================

function doGet(e) {
  try {
    const action = e && e.parameter
      ? (e.parameter.action || 'getData')
      : 'getData';

    if (action === 'getData') {
      return jsonResponse(getAllData());
    }

    if (action === 'getShodaqohData') {
      const monthKey = e.parameter && e.parameter.month ? e.parameter.month : '';
      return jsonResponse(getShodaqohData(monthKey));
    }

    return jsonResponse({
      success: false,
      message: 'Action tidak dikenali.'
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      message: 'Error: ' + err.message
    });
  }
}


// ============================================================
// POST
// ============================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        message: 'Request body kosong.'
      });
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'login') {
      return jsonResponse(
        handleLogin(body.username, body.password)
      );
    }

    if (action === 'logout') {
      revokeToken(body.token);
      return jsonResponse({ success: true });
    }

    if (action === 'addTransaction') {

      const auth = validateToken(body.token);

      if (!auth.success) {
        return jsonResponse({
          success: false,
          message: auth.message || 'Sesi tidak valid. Silakan login ulang.'
        });
      }

      if (auth.role !== 'admin') {
        return jsonResponse({
          success: false,
          message:
            'Akun Anda (pengurus) hanya memiliki akses lihat, tidak dapat menambah transaksi.'
        });
      }

      return jsonResponse(
        addTransaction(
          body,
          auth.nama || auth.username
        )
      );
    }

    if (action === 'editTransaction') {

      const auth = validateToken(body.token);

      if (!auth.success) {
        return jsonResponse({
          success: false,
          message: auth.message || 'Sesi tidak valid. Silakan login ulang.'
        });
      }

      if (auth.role !== 'admin') {
        return jsonResponse({
          success: false,
          message:
            'Akun Anda (pengurus) hanya memiliki akses lihat, tidak dapat mengedit transaksi.'
        });
      }

      return jsonResponse(
        editTransaction(
          body,
          auth.nama || auth.username
        )
      );
    }

    // --------------------------------------------------------
    // CARRY FORWARD SALDO AKHIR KE SALDO AWAL BULAN BERIKUTNYA
    // --------------------------------------------------------

    if (action === 'carryForwardSaldo') {

      const auth = validateToken(body.token);

      if (!auth.success) {
        return jsonResponse({
          success: false,
          message:
            auth.message || 'Sesi tidak valid. Silakan login ulang.'
        });
      }

      if (auth.role !== 'admin') {
        return jsonResponse({
          success: false,
          message:
            'Akun Anda (pengurus) hanya memiliki akses lihat.'
        });
      }

      return jsonResponse(
        carryForwardSaldo(
          body,
          auth.nama || auth.username
        )
      );
    }

    if (action === 'duplicateTransaction') {

    const auth = validateToken(body.token);

        if (!auth.success) {
        return jsonResponse({
          success: false,
          message:
            auth.message || 'Sesi tidak valid. Silakan login ulang.'
        });
      }

      if (auth.role !== 'admin') {
        return jsonResponse({
          success: false,
          message:
            'Akun Anda (pengurus) hanya memiliki akses lihat, tidak dapat menduplikasi transaksi.'
        });
      }

      return jsonResponse(
        duplicateTransaction(
          body,
          auth.nama || auth.username
        )
      );
    }

    if (action === 'deleteTransaction') {

      const auth = validateToken(body.token);

      if (!auth.success) {
        return jsonResponse({
          success: false,
          message: auth.message || 'Sesi tidak valid. Silakan login ulang.'
        });
      }

      if (auth.role !== 'admin') {
        return jsonResponse({
          success: false,
          message:
            'Akun Anda (pengurus) hanya memiliki akses lihat, tidak dapat menghapus transaksi.'
        });
      }

      return jsonResponse(
        deleteTransaction(body)
      );
    }

    // --------------------------------------------------------
    // SHODAQOH BULANAN / SHODAQOH IR
    // --------------------------------------------------------

    if (action === 'saveShodaqohRow') {

      const auth = validateToken(body.token);

      if (!auth.success) {
        return jsonResponse({
          success: false,
          message: auth.message || 'Sesi tidak valid. Silakan login ulang.'
        });
      }

      if (auth.role !== 'admin') {
        return jsonResponse({
          success: false,
          message:
            'Akun Anda (pengurus) hanya memiliki akses lihat, tidak dapat menyimpan data shodaqoh.'
        });
      }

      return jsonResponse(saveShodaqohRow(body));
    }

    if (action === 'deleteShodaqohRow') {

      const auth = validateToken(body.token);

      if (!auth.success) {
        return jsonResponse({
          success: false,
          message: auth.message || 'Sesi tidak valid. Silakan login ulang.'
        });
      }

      if (auth.role !== 'admin') {
        return jsonResponse({
          success: false,
          message:
            'Akun Anda (pengurus) hanya memiliki akses lihat, tidak dapat menghapus data shodaqoh.'
        });
      }

      return jsonResponse(deleteShodaqohRow(body));
    }

    if (action === 'postShodaqohToKas') {

      const auth = validateToken(body.token);

      if (!auth.success) {
        return jsonResponse({
          success: false,
          message: auth.message || 'Sesi tidak valid. Silakan login ulang.'
        });
      }

      if (auth.role !== 'admin') {
        return jsonResponse({
          success: false,
          message:
            'Akun Anda (pengurus) hanya memiliki akses lihat.'
        });
      }

      return jsonResponse(
        postShodaqohToKas(body, auth.nama || auth.username)
      );
    }

    return jsonResponse({
      success: false,
      message: 'Action tidak dikenali.'
    });

  } catch (err) {

    return jsonResponse({
      success: false,
      message: 'Error: ' + err.message
    });

  }
}


// ============================================================
// LOGIN
// ============================================================

function handleLogin(username, password) {

  const auth = validateUser(
    username,
    password
  );

  if (!auth.success) {
    return {
      success: false,
      message: 'Username atau password salah.'
    };
  }

  const session = createSession(
    username,
    auth.role,
    auth.nama
  );

  return {
    success: true,
    token: session.token,
    expiresAt: session.expiresAt,
    nama: auth.nama,
    role: auth.role
  };
}


function validateUser(username, password) {

  if (!username || !password) {
    return {
      success: false
    };
  }

  const sheet = getSheet(SHEET_USERS);

  const data = sheet
    .getDataRange()
    .getValues();

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    if (
      String(row[0]).trim() !== String(username).trim()
    ) {
      continue;
    }

    const storedPassword = String(row[1] || '');
    const inputHash = hashPassword(password);

    let passwordMatches = false;

    if (isHashedPassword(storedPassword)) {

      passwordMatches =
        storedPassword === inputHash;

    } else {

      passwordMatches =
        storedPassword.trim() ===
        String(password).trim();

      if (passwordMatches) {
        sheet
          .getRange(i + 1, 2)
          .setValue(inputHash);
      }
    }

    if (!passwordMatches) {
      return {
        success: false
      };
    }

    const nama =
      row[2] || username;

    const role =
      normalizeRole(
        row[3],
        row[0]
      );

    return {
      success: true,
      nama: nama,
      role: role
    };
  }

  return {
    success: false
  };
}


function normalizeRole(rawRole, username) {

  const role =
    String(rawRole || '')
      .trim()
      .toLowerCase();

  if (
    VALID_ROLES.indexOf(role) !== -1
  ) {
    return role;
  }

  return String(username || '')
    .trim()
    .toLowerCase() === 'admin'
    ? 'admin'
    : DEFAULT_ROLE;
}


// ============================================================
// PASSWORD HASHING
// ============================================================

function hashPassword(password) {

  const rawHash =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(password),
      Utilities.Charset.UTF_8
    );

  return rawHash
    .map(function (byte) {

      const v =
        (byte < 0 ? byte + 256 : byte)
          .toString(16);

      return v.length === 1
        ? '0' + v
        : v;

    })
    .join('');
}


function isHashedPassword(value) {

  return (
    typeof value === 'string' &&
    /^[a-f0-9]{64}$/.test(value)
  );
}


// ============================================================
// SESSIONS
// ============================================================

function createSession(
  username,
  role,
  nama
) {

  const sheet =
    getSheet(SHEET_SESSIONS);

  purgeExpiredSessions(sheet);

  const token =
    Utilities.getUuid();

  const expiresAt =
    Date.now() + SESSION_TTL_MS;

  sheet.appendRow([
    token,
    username,
    role,
    nama,
    expiresAt
  ]);

  return {
    token: token,
    expiresAt: expiresAt
  };
}


function validateToken(token) {

  if (!token) {
    return {
      success: false,
      message:
        'Sesi tidak ditemukan. Silakan login ulang.'
    };
  }

  const sheet =
    getSheet(SHEET_SESSIONS);

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return {
      success: false,
      message:
        'Sesi tidak valid. Silakan login ulang.'
    };
  }

  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        HEADERS_SESSIONS.length
      )
      .getValues();

  for (let i = 0; i < data.length; i++) {

    const row = data[i];

    if (
      String(row[0]) !== String(token)
    ) {
      continue;
    }

    const expiresAt =
      Number(row[4]) || 0;

    if (Date.now() > expiresAt) {

      sheet.deleteRow(i + 2);

      return {
        success: false,
        message:
          'Sesi telah berakhir. Silakan login ulang.'
      };
    }

    return {
      success: true,
      username: row[1],
      role:
        String(row[2] || '')
          .trim()
          .toLowerCase(),
      nama: row[3] || row[1]
    };
  }

  return {
    success: false,
    message:
      'Sesi tidak valid. Silakan login ulang.'
  };
}


function revokeToken(token) {

  if (!token) return;

  const sheet =
    getSheet(SHEET_SESSIONS);

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) return;

  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getValues();

  for (let i = 0; i < data.length; i++) {

    if (
      String(data[i][0]) ===
      String(token)
    ) {

      sheet.deleteRow(i + 2);

      return;
    }
  }
}


function purgeExpiredSessions(sheet) {

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) return;

  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        HEADERS_SESSIONS.length
      )
      .getValues();

  const now =
    Date.now();

  for (
    let i = data.length - 1;
    i >= 0;
    i--
  ) {

    const expiresAt =
      Number(data[i][4]) || 0;

    if (now > expiresAt) {
      sheet.deleteRow(i + 2);
    }
  }
}


// ============================================================
// GET ALL DATA
// ============================================================

function getAllData() {

  const sheet =
    getSheet(SHEET_TRANSAKSI);

  const range =
    sheet
      .getDataRange()
      .getValues();

  const rows =
    range.slice(1);

  const transactions =
    rows
      .filter(function (r) {

        return (
          r[1] !== '' &&
          r[1] !== null
        );

      })
      .map(function (r) {

        return {

          no: r[0],

          tanggal:
            formatDate(r[1]),

          account:
            r[2],

          keterangan:
            r[3],

          debet:
            Number(r[4]) || 0,

          kredit:
            Number(r[5]) || 0,

          saldo:
            Number(r[6]) || 0,

          createdBy:
            r[7]
        };

      });


  const saldoAwal =
    getInitialSaldoAwal(
      transactions
    );


  const totalDebet =
    transactions
      .filter(function (t) {
        return !isSaldoAwal(t);
      })
      .reduce(function (sum, t) {

        return sum + t.debet;

      }, 0);


  const totalKredit =
    transactions
      .filter(function (t) {
        return !isSaldoAwal(t);
      })
      .reduce(function (sum, t) {

        return sum + t.kredit;

      }, 0);


  const saldoAkhir =
    transactions.length > 0
      ? transactions[
          transactions.length - 1
        ].saldo
      : saldoAwal;


  return {

    success: true,

    saldoAwal:
      saldoAwal,

    totalDebet:
      totalDebet,

    totalKredit:
      totalKredit,

    saldoAkhir:
      saldoAkhir,

    transactions:
      transactions
  };
}


// ============================================================
// SALDO AWAL
// ============================================================

function isSaldoAwal(transaction) {

  return normalizeAccount(
    transaction.account
  ) === SALDO_AWAL_LABEL;
}


function getInitialSaldoAwal(transactions) {

  const first =
    transactions.find(function (t) {

      return isSaldoAwal(t);

    });


  if (first) {

    return (
      Number(first.debet || 0) -
      Number(first.kredit || 0)
    );

  }

  return getSaldoAwal();
}


function normalizeAccount(account) {

  return String(account || '')
    .trim()
    .toUpperCase();
}


// ============================================================
// ADD TRANSACTION
// ============================================================

function addTransaction(
  body,
  createdBy
) {

  const tanggal =
    body.tanggal;

  const account =
    String(body.account || '')
      .trim();

  const keterangan =
    String(body.keterangan || '')
      .trim();

  const jenis =
    String(body.jenis || '')
      .trim()
      .toLowerCase();

  const jumlah =
    Number(body.jumlah);


  if (
    !tanggal ||
    !account ||
    !jenis ||
    isNaN(jumlah) ||
    jumlah <= 0
  ) {

    return {
      success: false,
      message:
        'Data tidak valid. Pastikan semua field wajib terisi dan jumlah lebih dari 0.'
    };
  }


  if (
    jenis !== 'debet' &&
    jenis !== 'kredit'
  ) {

    return {
      success: false,
      message:
        'Jenis transaksi harus debet atau kredit.'
    };
  }


  const debet =
    jenis === 'debet'
      ? jumlah
      : 0;

  const kredit =
    jenis === 'kredit'
      ? jumlah
      : 0;


  const sheet =
    getSheet(SHEET_TRANSAKSI);

  const lastRow =
    sheet.getLastRow();

  const newRow =
    lastRow + 1;

  const newNo =
    lastRow > 1
      ? lastRow
      : 1;


  sheet
    .getRange(
      newRow,
      1,
      1,
      8
    )
    .setValues([[
      newNo,
      tanggal,
      account,
      keterangan,
      debet,
      kredit,
      '',
      createdBy
    ]]);


  applySaldoFormula(
    sheet,
    newRow
  );

  SpreadsheetApp.flush();


  const saldo =
    Number(
      sheet
        .getRange(
          newRow,
          7
        )
        .getValue()
    ) || 0;


  return {

    success: true,

    message:
      'Transaksi berhasil disimpan.',

    data: {

      no:
        newNo,

      tanggal:
        tanggal,

      account:
        account,

      keterangan:
        keterangan,

      debet:
        debet,

      kredit:
        kredit,

      saldo:
        saldo,

      createdBy:
        createdBy
    }
  };
}


// ============================================================
// EDIT TRANSACTION
// ============================================================

function editTransaction(
  body,
  editedBy
) {

  const no =
    body.no;

  const tanggal =
    body.tanggal;

  const account =
    String(body.account || '')
      .trim();

  const keterangan =
    String(body.keterangan || '')
      .trim();

  const jenis =
    String(body.jenis || '')
      .trim()
      .toLowerCase();

  const jumlah =
    Number(body.jumlah);


  if (
    no === undefined ||
    no === null ||
    no === ''
  ) {

    return {
      success: false,
      message:
        'Nomor transaksi tidak valid.'
    };
  }


  if (
    !tanggal ||
    !account ||
    !jenis ||
    isNaN(jumlah) ||
    jumlah <= 0
  ) {

    return {
      success: false,
      message:
        'Data tidak valid. Pastikan semua field wajib terisi dan jumlah lebih dari 0.'
    };
  }


  if (
    jenis !== 'debet' &&
    jenis !== 'kredit'
  ) {

    return {
      success: false,
      message:
        'Jenis transaksi harus debet atau kredit.'
    };
  }


  const sheet =
    getSheet(SHEET_TRANSAKSI);

  const row =
    findRowIndexByNo(
      sheet,
      no
    );


  if (row === -1) {

    return {
      success: false,
      message:
        'Transaksi tidak ditemukan.'
    };
  }


  const debet =
    jenis === 'debet'
      ? jumlah
      : 0;

  const kredit =
    jenis === 'kredit'
      ? jumlah
      : 0;


  sheet
    .getRange(
      row,
      2,
      1,
      5
    )
    .setValues([[
      tanggal,
      account,
      keterangan,
      debet,
      kredit
    ]]);


  sheet
    .getRange(row, 8)
    .setValue(editedBy);


  recalculateSaldoFromRow(
    sheet,
    row
  );

  SpreadsheetApp.flush();


  const saldo =
    Number(
      sheet
        .getRange(
          row,
          7
        )
        .getValue()
    ) || 0;


  return {

    success: true,

    message:
      'Transaksi berhasil diperbarui.',

    data: {

      no:
        no,

      tanggal:
        tanggal,

      account:
        account,

      keterangan:
        keterangan,

      debet:
        debet,

      kredit:
        kredit,

      saldo:
        saldo,

      createdBy:
        editedBy
    }
  };
}

function carryForwardSaldo(body, createdBy) {

  const monthKey =
    String(body.monthKey || '').trim();


  if (!/^\d{4}-\d{2}$/.test(monthKey)) {

    return {
      success: false,
      message:
        'Bulan tidak valid. Gunakan format YYYY-MM.'
    };
  }


  const parts =
    monthKey.split('-');

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);


  if (
    month < 1 ||
    month > 12
  ) {

    return {
      success: false,
      message:
        'Bulan tidak valid.'
    };
  }


  const sheet =
    getSheet(SHEET_TRANSAKSI);


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return {
      success: false,
      message:
        'Belum ada transaksi.'
    };
  }


  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        8
      )
      .getValues();


  let lastMonthRow = -1;
  let saldoAkhir = 0;


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const tanggal =
      normalizeDateValue(
        data[i][1]
      );


    if (!tanggal) {
      continue;
    }


    const rowMonth =
      Utilities.formatDate(
        tanggal,
        Session.getScriptTimeZone(),
        'yyyy-MM'
      );


    if (rowMonth !== monthKey) {
      continue;
    }


    lastMonthRow =
      i + 2;


    saldoAkhir =
      Number(data[i][6]) || 0;
  }


  if (lastMonthRow === -1) {

    return {
      success: false,
      message:
        'Tidak ditemukan transaksi pada bulan ' +
        monthKey + '.'
    };
  }


  const nextMonthDate =
    new Date(
      year,
      month,
      1
    );


  const nextMonthKey =
    Utilities.formatDate(
      nextMonthDate,
      Session.getScriptTimeZone(),
      'yyyy-MM'
    );


  const nextMonthTanggal =
    Utilities.formatDate(
      nextMonthDate,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );


  let existingSaldoAwalRow =
    -1;


  for (
    let i = 0;
    i < data.length;
    i++
  ) {

    const account =
      normalizeAccount(
        data[i][2]
      );


    if (
      account !== SALDO_AWAL_LABEL
    ) {
      continue;
    }


    const tanggal =
      normalizeDateValue(
        data[i][1]
      );


    if (!tanggal) {
      continue;
    }


    const rowMonth =
      Utilities.formatDate(
        tanggal,
        Session.getScriptTimeZone(),
        'yyyy-MM'
      );


    if (
      rowMonth === nextMonthKey
    ) {

      existingSaldoAwalRow =
        i + 2;

      break;
    }
  }


  if (
    existingSaldoAwalRow !== -1
  ) {

    return {
      success: false,
      alreadyExists: true,
      message:
        'SALDO AWAL untuk ' +
        nextMonthKey +
        ' sudah ada.'
    };
  }


  let insertBeforeRow =
    sheet.getLastRow() + 1;


  const refreshedLastRow =
    sheet.getLastRow();


  if (refreshedLastRow >= 2) {

    const refreshedData =
      sheet
        .getRange(
          2,
          1,
          refreshedLastRow - 1,
          8
        )
        .getValues();


    for (
      let i = 0;
      i < refreshedData.length;
      i++
    ) {

      const tanggal =
        normalizeDateValue(
          refreshedData[i][1]
        );


      if (!tanggal) {
        continue;
      }


      if (
        tanggal >= nextMonthDate
      ) {

        insertBeforeRow =
          i + 2;

        break;
      }
    }
  }


  sheet.insertRowsBefore(
    insertBeforeRow,
    1
  );


  sheet
    .getRange(
      insertBeforeRow,
      1,
      1,
      8
    )
    .setValues([[
      0,
      nextMonthTanggal,
      SALDO_AWAL_LABEL,
      'Saldo awal dari ' +
        getMonthLabelServer(monthKey),
      saldoAkhir,
      0,
      '',
      createdBy
    ]]);


  renumberRows(sheet);


  SpreadsheetApp.flush();


  return {

    success: true,

    message:
      'Saldo akhir ' +
      getMonthLabelServer(monthKey) +
      ' berhasil dijadikan saldo awal ' +
      getMonthLabelServer(nextMonthKey) +
      '.',

    data: {

      monthFrom:
        monthKey,

      monthTo:
        nextMonthKey,

      saldo:
        saldoAkhir,

      tanggal:
        nextMonthTanggal
    }
  };
}


function duplicateTransaction(
  body,
  duplicatedBy
) {

  const no =
    body.no;


  if (
    no === undefined ||
    no === null ||
    no === ''
  ) {

    return {
      success: false,
      message:
        'Nomor transaksi tidak valid.'
    };
  }


  const sheet =
    getSheet(SHEET_TRANSAKSI);


  const row =
    findRowIndexByNo(
      sheet,
      no
    );


  if (row === -1) {

    return {
      success: false,
      message:
        'Transaksi yang akan diduplikasi tidak ditemukan.'
    };
  }


  const values =
    sheet
      .getRange(
        row,
        1,
        1,
        8
      )
      .getValues()[0];


  const tanggal =
    values[1];

  const account =
    String(values[2] || '')
      .trim();

  const keterangan =
    String(values[3] || '')
      .trim();

  const debet =
    Number(values[4]) || 0;

  const kredit =
    Number(values[5]) || 0;


  if (
    !tanggal ||
    !account
  ) {

    return {
      success: false,
      message:
        'Data transaksi asli tidak lengkap.'
    };
  }


  if (
    debet <= 0 &&
    kredit <= 0
  ) {

    return {
      success: false,
      message:
        'Nilai Debet/Kredit transaksi tidak valid.'
    };
  }


  const lastRow =
    sheet.getLastRow();


  const newRow =
    lastRow + 1;


  const newNo =
    lastRow > 1
      ? lastRow
      : 1;


  sheet
    .getRange(
      newRow,
      1,
      1,
      8
    )
    .setValues([[
      newNo,
      tanggal,
      account,
      keterangan,
      debet,
      kredit,
      '',
      duplicatedBy
    ]]);


  applySaldoFormula(
    sheet,
    newRow
  );


  SpreadsheetApp.flush();


  const saldo =
    Number(
      sheet
        .getRange(
          newRow,
          7
        )
        .getValue()
    ) || 0;


  return {

    success: true,

    message:
      'Transaksi berhasil diduplikasi.',

    data: {

      no:
        newNo,

      tanggal:
        tanggal,

      account:
        account,

      keterangan:
        keterangan,

      debet:
        debet,

      kredit:
        kredit,

      saldo:
        saldo,

      createdBy:
        duplicatedBy
    }
  };
}


// ============================================================
// DELETE TRANSACTION
// ============================================================

function deleteTransaction(body) {

  const no =
    body.no;


  if (
    no === undefined ||
    no === null ||
    no === ''
  ) {

    return {
      success: false,
      message:
        'Nomor transaksi tidak valid.'
    };
  }


  const sheet =
    getSheet(SHEET_TRANSAKSI);


  const row =
    findRowIndexByNo(
      sheet,
      no
    );


  if (row === -1) {

    return {
      success: false,
      message:
        'Transaksi tidak ditemukan.'
    };
  }


  sheet.deleteRow(row);


  renumberRows(sheet);


  SpreadsheetApp.flush();


  return {

    success: true,

    message:
      'Transaksi berhasil dihapus.'
  };
}


// ============================================================
// FIND ROW (dipakai bersama oleh Transaksi & Shodaqoh)
// ============================================================

function findRowIndexByNo(
  sheet,
  no
) {

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return -1;
  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      Number(values[i][0]) ===
      Number(no)
    ) {

      return i + 2;
    }
  }


  return -1;
}


// ============================================================
// SALDO
// ============================================================

function applySaldoFormula(
  sheet,
  row
) {

  const baseRef =
    row === 2
      ? String(
          Number(
            getSaldoAwal()
          ) || 0
        )
      : `G${row - 1}`;


  const formula =
    `=IF(C${row}="${SALDO_AWAL_LABEL}";E${row}-F${row};${baseRef}+E${row}-F${row})`;


  sheet
    .getRange(
      row,
      7
    )
    .setFormula(formula);
}


function recalculateAllSaldoFormulas(
  sheet
) {

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {
    return;
  }


  for (
    let row = 2;
    row <= lastRow;
    row++
  ) {

    applySaldoFormula(
      sheet,
      row
    );
  }


  SpreadsheetApp.flush();
}


function recalculateSaldoFromRow(
  sheet,
  startRow
) {

  const lastRow =
    sheet.getLastRow();


  if (
    lastRow < 2 ||
    startRow < 2
  ) {
    return;
  }


  for (
    let row = startRow;
    row <= lastRow;
    row++
  ) {

    applySaldoFormula(
      sheet,
      row
    );
  }


  SpreadsheetApp.flush();
}


function migrateSaldoToFormula() {

  const sheet =
    getSheet(
      SHEET_TRANSAKSI
    );


  recalculateAllSaldoFormulas(
    sheet
  );


  SpreadsheetApp.flush();


  return {

    success: true,

    message:
      'Kolom Saldo sudah dipasangi formula pada semua baris.'
  };
}


// ============================================================
// RENUMBER (khusus sheet Transaksi, karena ikut recalc saldo)
// ============================================================

function renumberRows(sheet) {

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {
    return;
  }


  const count =
    lastRow - 1;


  const numbers = [];


  for (
    let i = 1;
    i <= count;
    i++
  ) {

    numbers.push([
      i
    ]);
  }


  sheet
    .getRange(
      2,
      1,
      count,
      1
    )
    .setValues(numbers);


  recalculateAllSaldoFormulas(
    sheet
  );
}


// ============================================================
// SALDO AWAL PROPERTY
// ============================================================

function getSaldoAwal() {

  const props =
    PropertiesService
      .getScriptProperties();


  const val =
    props.getProperty(
      SALDO_AWAL_PROP_KEY
    );


  return val
    ? Number(val)
    : 0;
}


function setSaldoAwal(nilai) {

  PropertiesService
    .getScriptProperties()
    .setProperty(
      SALDO_AWAL_PROP_KEY,
      String(nilai)
    );
}


// ============================================================
// SHEET
// ============================================================

function getSheet(name) {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(name);

  // Migrasi nama sheet lama secara otomatis.
  // Versi sebelumnya memakai "Shodaqoh Bulanan"; sekarang nama resmi
  // modul adalah "Shodaqoh IR". Jika sheet baru belum ada, gunakan
  // sheet lama agar histori pembayaran tidak terputus.
  if (
    !sheet &&
    name === SHEET_SHODAQOH
  ) {
    const legacySheet =
      ss.getSheetByName('Shodaqoh Bulanan');

    if (legacySheet) {
      legacySheet.setName(SHEET_SHODAQOH);
      sheet = legacySheet;
    }
  }

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }


  ensureHeaders(
    sheet,
    name
  );


  if (
    name === SHEET_USERS
  ) {

    migrateUsersRoleColumn(
      sheet
    );
  }

  if (
    name === SHEET_SHODAQOH
  ) {

    // Migrasi sheet lama (dibuat sebelum kolom Bulan/Tanggal Bayar ada)
    // TANPA menghapus/menimpa data yang sudah ada.
    migrateShodaqohBulanColumn(sheet);
    migrateShodaqohTanggalBayarColumn(sheet);

    // Menambahkan kolom bulan Susulan IR yang belum ada TANPA menimpa
    // kolom/data yang sudah ada (lihat catatan di getShodaqohSusulanMonths).
    syncShodaqohSusulanColumns(sheet);
  }


  return sheet;
}


// ============================================================
// HEADER
// ============================================================

function ensureHeaders(
  sheet,
  name
) {

  const firstCell =
    sheet
      .getRange(1, 1)
      .getValue();


  if (firstCell) {
    return;
  }


  if (
    name === SHEET_TRANSAKSI
  ) {

    sheet
      .getRange(
        1,
        1,
        1,
        HEADERS_TRANSAKSI.length
      )
      .setValues([
        HEADERS_TRANSAKSI
      ]);


    formatHeaderRow(
      sheet,
      HEADERS_TRANSAKSI.length
    );

  } else if (
    name === SHEET_USERS
  ) {

    sheet
      .getRange(
        1,
        1,
        1,
        HEADERS_USERS.length
      )
      .setValues([
        HEADERS_USERS
      ]);


    formatHeaderRow(
      sheet,
      HEADERS_USERS.length
    );


    sheet
      .getRange(
        2,
        1,
        1,
        DEFAULT_ADMIN.length
      )
      .setValues([
        DEFAULT_ADMIN
      ]);

  } else if (
    name === SHEET_SESSIONS
  ) {

    sheet
      .getRange(
        1,
        1,
        1,
        HEADERS_SESSIONS.length
      )
      .setValues([
        HEADERS_SESSIONS
      ]);


    formatHeaderRow(
      sheet,
      HEADERS_SESSIONS.length
    );

  } else if (
    name === SHEET_SHODAQOH
  ) {

    // Sheet baru: belum ada data sama sekali, jadi aman membangun
    // seluruh header dari nol (tidak ada risiko salah label).
    const headers =
      buildShodaqohHeaders();

    sheet
      .getRange(
        1,
        1,
        1,
        headers.length
      )
      .setValues([
        headers
      ]);

    formatHeaderRow(
      sheet,
      headers.length
    );
  }
}


// ============================================================
// MIGRATE USER ROLE
// ============================================================

function migrateUsersRoleColumn(sheet) {

  const lastCol =
    Math.max(
      sheet.getLastColumn(),
      1
    );


  const headerRow =
    sheet
      .getRange(
        1,
        1,
        1,
        lastCol
      )
      .getValues()[0];


  const hasRoleHeader =
    headerRow.some(function (h) {

      return String(h)
        .trim()
        .toLowerCase() === 'role';

    });


  if (hasRoleHeader) {
    return;
  }


  const roleCol =
    HEADERS_USERS.length;


  const roleHeaderCell =
    sheet.getRange(
      1,
      roleCol
    );


  roleHeaderCell
    .setValue('Role')
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#ffffff');


  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {
    return;
  }


  const usernames =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getValues();


  const roles =
    usernames.map(function (r) {

      return [

        String(r[0])
          .trim()
          .toLowerCase() === 'admin'

          ? 'admin'

          : DEFAULT_ROLE

      ];

    });


  sheet
    .getRange(
      2,
      roleCol,
      roles.length,
      1
    )
    .setValues(roles);
}

function normalizeDateValue(value) {

  if (
    value instanceof Date &&
    !isNaN(value.getTime())
  ) {
    return value;
  }


  if (!value) {
    return null;
  }


  const d =
    new Date(value);


  return isNaN(d.getTime())
    ? null
    : d;
}


function getMonthLabelServer(monthKey) {

  const parts =
    monthKey.split('-');

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);


  return new Date(
    year,
    month - 1,
    1
  ).toLocaleDateString(
    'id-ID',
    {
      month: 'long',
      year: 'numeric'
    }
  );
}


// ============================================================
// FORMAT HEADER
// ============================================================

function formatHeaderRow(
  sheet,
  numCols
) {

  const headerRange =
    sheet.getRange(
      1,
      1,
      1,
      numCols
    );


  headerRange
    .setFontWeight('bold')
    .setBackground('#1e293b')
    .setFontColor('#ffffff');


  sheet.setFrozenRows(1);


  try {

    sheet.autoResizeColumns(
      1,
      numCols
    );

  } catch (e) {}
}


// ============================================================
// DATE
// ============================================================

function formatDate(value) {

  if (
    value instanceof Date
  ) {

    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );
  }


  return value;
}


// ============================================================
// JSON RESPONSE
// ============================================================

function jsonResponse(obj) {

  return ContentService
    .createTextOutput(
      JSON.stringify(obj)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


// ============================================================
// ============================================================
// SHODAQOH BULANAN / SHODAQOH IR — SHEET, CRUD, DAN POSTING KE KAS
// ============================================================
// ============================================================
//
// Struktur kolom (dinamis, tergantung getShodaqohSusulanMonths()):
//
// No | Nama | Bulan | Susulan IR <bulan1..N> | Uang Sambung | Jimpitan |
// Siar-siar | Seribuan | Kafan | Ukhro MT | Total Disetor Bulan Ini |
// Dana Kesehatan | Tanggal Bayar
//
// SATU BARIS = SATU ORANG UNTUK SATU BULAN ("Bulan", format YYYY-MM).
// "Tanggal Bayar" otomatis diisi (tanggal+jam) tiap kali baris itu
// disimpan/diupdate lewat saveShodaqohRow().
//
// "Total Disetor Bulan Ini" TIDAK ikut diposting ke Kas — dia
// hanya ringkasan per orang. Yang diposting ke Kas adalah TOTAL
// PER KATEGORI (per kolom) UNTUK BULAN YANG DIPILIH SAJA, sesuai
// SHODAQOH_CATEGORY_MAP.
//

function buildShodaqohHeaders() {

  const headers = ['No', 'Nama', 'Bulan'];

  getShodaqohSusulanMonths().forEach(function (bulan) {
    headers.push('Susulan IR ' + bulan);
  });

  headers.push(
    'Uang Sambung',
    'Jimpitan',
    'Siar-siar',
    'Seribuan',
    'Kafan',
    'Ukhro MT',
    'Total Disetor Bulan Ini',
    'Dana Kesehatan',
    'Tanggal Bayar'
  );

  return headers;
}


function getShodaqohColumnMap() {

  const susulanCount =
    getShodaqohSusulanMonths().length;

  const colNo = 1;
  const colNama = 2;
  const colBulan = 3;
  const colSusulanStart = 4;
  const colSusulanEnd = colSusulanStart + susulanCount - 1;
  const colUangSambung = colSusulanEnd + 1;
  const colJimpitan = colUangSambung + 1;
  const colSiarSiar = colJimpitan + 1;
  const colSeribuan = colSiarSiar + 1;
  const colKafan = colSeribuan + 1;
  const colUkhroMT = colKafan + 1;
  const colTotal = colUkhroMT + 1;
  const colDanaKesehatan = colTotal + 1;
  const colTanggalBayar = colDanaKesehatan + 1;

  return {
    colNo: colNo,
    colNama: colNama,
    colBulan: colBulan,
    colSusulanStart: colSusulanStart,
    colSusulanEnd: colSusulanEnd,
    colUangSambung: colUangSambung,
    colJimpitan: colJimpitan,
    colSiarSiar: colSiarSiar,
    colSeribuan: colSeribuan,
    colKafan: colKafan,
    colUkhroMT: colUkhroMT,
    colTotal: colTotal,
    colDanaKesehatan: colDanaKesehatan,
    colTanggalBayar: colTanggalBayar,
    totalCols: colTanggalBayar
  };
}


function columnToLetter(column) {

  let temp;
  let letter = '';

  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = Math.floor((column - temp - 1) / 26);
  }

  return letter;
}


function applyShodaqohTotalFormula(sheet, row, map) {

  const susulanStartLetter = columnToLetter(map.colSusulanStart);
  const susulanEndLetter = columnToLetter(map.colSusulanEnd);
  const uangSambungLetter = columnToLetter(map.colUangSambung);
  const jimpitanLetter = columnToLetter(map.colJimpitan);
  const siarSiarLetter = columnToLetter(map.colSiarSiar);
  const seribuanLetter = columnToLetter(map.colSeribuan);
  const kafanLetter = columnToLetter(map.colKafan);
  const ukhroMTLetter = columnToLetter(map.colUkhroMT);
  const danaKesehatanLetter = columnToLetter(map.colDanaKesehatan);

  const formula =
    `=SUM(${susulanStartLetter}${row}:${susulanEndLetter}${row})` +
    `+${uangSambungLetter}${row}` +
    `+${jimpitanLetter}${row}` +
    `+${siarSiarLetter}${row}` +
    `+${seribuanLetter}${row}` +
    `+${kafanLetter}${row}` +
    `+${ukhroMTLetter}${row}` +
    `+${danaKesehatanLetter}${row}`;

  sheet
    .getRange(row, map.colTotal)
    .setFormula(formula);
}


// ------------------------------------------------------------
// SETUP / SINKRONISASI KOLOM (append-only, aman untuk data lama)
// ------------------------------------------------------------

function setupShodaqohSheet() {

  getSheet(SHEET_SHODAQOH);

  return {
    success: true,
    message: 'Sheet "Shodaqoh IR" siap digunakan.'
  };
}


// Migrasi sheet Shodaqoh versi lama (tanpa kolom "Bulan") — kolom baru
// disisipkan TEPAT SETELAH "Nama" lewat insertColumnBefore, jadi seluruh
// kolom & data di sebelah kanannya (susulan, kategori, dst) bergeser utuh
// tanpa ada nilai yang salah label. Baris lama akan tampil tanpa nilai
// Bulan (kosong) — silakan diisi manual kalau ingin dipetakan ke riwayat.
function migrateShodaqohBulanColumn(sheet) {

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headerRow =
    sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const hasBulanHeader = headerRow.some(function (h) {
    return String(h || '').trim() === 'Bulan';
  });

  if (hasBulanHeader) {
    return;
  }

  // Sisipkan kolom baru persis di posisi ke-3 (setelah No, Nama).
  sheet.insertColumnBefore(3);
  sheet.getRange(1, 3).setValue('Bulan');
  formatHeaderRow(sheet, sheet.getLastColumn());
}


// Migrasi sheet Shodaqoh versi lama (tanpa kolom "Tanggal Bayar") —
// ditambahkan sebagai kolom PALING KANAN supaya tidak menggeser/menabrak
// kolom kategori & formula Total yang sudah ada.
function migrateShodaqohTanggalBayarColumn(sheet) {

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headerRow =
    sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const hasTanggalBayarHeader = headerRow.some(function (h) {
    return String(h || '').trim() === 'Tanggal Bayar';
  });

  if (hasTanggalBayarHeader) {
    return;
  }

  const newCol = lastCol + 1;
  sheet.getRange(1, newCol).setValue('Tanggal Bayar');
  formatHeaderRow(sheet, newCol);
}


// Menyisipkan kolom "Susulan IR <bulan>" yang belum ada di sheet, TEPAT
// SEBELUM kolom "Uang Sambung" (atau setelah kolom Bulan kalau belum ada
// kolom susulan sama sekali). insertColumnBefore menggeser seluruh kolom
// & data di sebelah kanannya secara utuh, jadi tidak ada data yang
// tertukar/salah label seperti pada implementasi lama.
function syncShodaqohSusulanColumns(sheet) {

  const months = getShodaqohSusulanMonths();

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headerRow =
    sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const existingCols = {};
  let lastSusulanCol = 3; // fallback: tepat setelah kolom "Bulan"

  headerRow.forEach(function (h, idx) {
    const label = String(h || '').trim();
    if (label.indexOf('Susulan IR ') === 0) {
      const bulan = label.substring('Susulan IR '.length).trim();
      existingCols[bulan] = idx + 1;
      lastSusulanCol = Math.max(lastSusulanCol, idx + 1);
    }
  });

  let inserted = false;

  months.forEach(function (bulan) {

    if (existingCols[bulan]) {
      return; // kolom bulan ini sudah ada, jangan disentuh
    }

    lastSusulanCol += 1;
    sheet.insertColumnBefore(lastSusulanCol);
    sheet.getRange(1, lastSusulanCol).setValue('Susulan IR ' + bulan);
    existingCols[bulan] = lastSusulanCol;
    inserted = true;
  });

  if (!inserted) {
    return;
  }

  const newLastCol = sheet.getLastColumn();
  formatHeaderRow(sheet, newLastCol);

  const map = getShodaqohColumnMap();
  const lastRow = sheet.getLastRow();

  // Kolom baru otomatis berisi 0/kosong (default Sheets), cukup pasang
  // ulang formula Total supaya ikut menghitung kolom bulan yang baru.
  for (let row = 2; row <= lastRow; row++) {
    applyShodaqohTotalFormula(sheet, row, map);
  }

  SpreadsheetApp.flush();
}


// Dipanggil manual lewat menu "Perbarui Header Shodaqoh".
function refreshShodaqohHeaders() {

  const sheet = getSheet(SHEET_SHODAQOH); // getSheet() sudah otomatis sync

  return {
    success: true,
    message: 'Header "Shodaqoh IR" sudah disamakan dengan bulan berjalan (data lama tidak diubah).'
  };
}


// ------------------------------------------------------------
// RENUMBER (khusus Shodaqoh — TIDAK menyentuh formula saldo Kas)
// ------------------------------------------------------------

function renumberShodaqohRows(sheet) {

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const count = lastRow - 1;
  const numbers = [];

  for (let i = 1; i <= count; i++) {
    numbers.push([i]);
  }

  sheet
    .getRange(2, 1, count, 1)
    .setValues(numbers);

  const map = getShodaqohColumnMap();

  for (let row = 2; row <= lastRow; row++) {
    applyShodaqohTotalFormula(sheet, row, map);
  }
}


// ------------------------------------------------------------
// SIMPAN / EDIT SATU BARIS (SATU ORANG, SATU BULAN)
// ------------------------------------------------------------
//
// body: {
//   no          : (opsional, isi jika mengedit baris yang sudah ada)
//   nama        : string (wajib)
//   bulan       : string 'YYYY-MM' (opsional, default bulan berjalan)
//   susulan     : [nilaiBulan1, nilaiBulan2, ...] sesuai urutan
//                 getShodaqohSusulanMonths() (array penuh permanen, bukan
//                 hanya jendela 5 bulan aktif)
//   uangSambung, jimpitan, siarSiar, seribuan, kafan, ukhroMT,
//   danaKesehatan : angka
// }
//
// Baris baru (tanpa "no") DITOLAK kalau kombinasi nama+bulan itu sudah
// ada — supaya tidak ada 2 baris ganda untuk orang & bulan yang sama.
// Edit baris (dengan "no") selalu diizinkan.

function saveShodaqohRow(body) {

  const namaInput = String(body.nama || '').trim();

  if (!namaInput) {
    return {
      success: false,
      message: 'Nama wajib diisi.'
    };
  }

  // Nama hanya boleh berasal dari daftar anggota tetap.
  const nama = getShodaqohMemberNames().find(function (item) {
    return item.toLowerCase() === namaInput.toLowerCase();
  });

  if (!nama) {
    return {
      success: false,
      message: 'Nama tidak terdaftar dalam daftar Anggota Shodaqoh IR.'
    };
  }

  const bulan = String(
    body.bulan || getCurrentMonthKey()
  ).trim();

  if (!/^\d{4}-\d{2}$/.test(bulan)) {
    return {
      success: false,
      message: 'Bulan tidak valid. Gunakan format YYYY-MM.'
    };
  }

  const sheet = getSheet(SHEET_SHODAQOH);
  const map = getShodaqohColumnMap();
  const susulanMonths = getShodaqohSusulanMonths();
  const susulanValues =
    Array.isArray(body.susulan) ? body.susulan : [];

  let row;
  let no;

  const isEditing =
    body.no !== undefined &&
    body.no !== null &&
    body.no !== '';

  if (isEditing) {

    row = findRowIndexByNo(sheet, body.no);

    if (row === -1) {
      return {
        success: false,
        message: 'Baris shodaqoh tidak ditemukan.'
      };
    }

    no = body.no;

    // Saat edit, cegah perubahan nama/bulan menjadi pasangan
    // yang sudah dimiliki baris lain.
    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {
      const existing =
        sheet.getRange(
          2,
          1,
          lastRow - 1,
          map.colBulan
        ).getValues();

      const duplicate = existing.some(function (r, index) {
        const actualRow = index + 2;

        if (actualRow === row) return false;

        return (
          String(r[map.colNama - 1] || '').trim().toLowerCase() === nama.toLowerCase() &&
          String(r[map.colBulan - 1] || '').trim() === bulan
        );
      });

      if (duplicate) {
        return {
          success: false,
          message:
            'Data ' + nama + ' untuk ' +
            getMonthLabelServer(bulan) +
            ' sudah ada.'
        };
      }
    }

  } else {

    // Satu orang hanya boleh memiliki satu baris pembayaran
    // untuk satu bulan.
    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {

      const existing =
        sheet
          .getRange(
            2,
            1,
            lastRow - 1,
            map.colBulan
          )
          .getValues();

      const dup = existing.some(function (r) {
        return (
          String(r[map.colNama - 1] || '').trim().toLowerCase() === nama.toLowerCase() &&
          String(r[map.colBulan - 1] || '').trim() === bulan
        );
      });

      if (dup) {
        return {
          success: false,
          message:
            'Data ' + nama + ' untuk ' +
            getMonthLabelServer(bulan) +
            ' sudah ada. Silakan edit data yang sudah ada.'
        };
      }
    }

    row = lastRow + 1;
    no = lastRow > 1 ? lastRow : 1;
  }

  sheet.getRange(row, map.colNo).setValue(no);
  sheet.getRange(row, map.colNama).setValue(nama);
  sheet.getRange(row, map.colBulan).setValue(bulan);

  for (let i = 0; i < susulanMonths.length; i++) {
    const col = map.colSusulanStart + i;
    const val = Number(susulanValues[i]) || 0;
    sheet.getRange(row, col).setValue(val);
  }

  sheet.getRange(row, map.colUangSambung)
    .setValue(Number(body.uangSambung) || 0);

  sheet.getRange(row, map.colJimpitan)
    .setValue(Number(body.jimpitan) || 0);

  sheet.getRange(row, map.colSiarSiar)
    .setValue(Number(body.siarSiar) || 0);

  sheet.getRange(row, map.colSeribuan)
    .setValue(Number(body.seribuan) || 0);

  sheet.getRange(row, map.colKafan)
    .setValue(Number(body.kafan) || 0);

  sheet.getRange(row, map.colUkhroMT)
    .setValue(Number(body.ukhroMT) || 0);

  sheet.getRange(row, map.colDanaKesehatan)
    .setValue(Number(body.danaKesehatan) || 0);

  // "Tanggal Bayar" mengikuti pilihan sebelumnya:
  // satu tanggal per baris, yaitu waktu terakhir data disimpan/diupdate.
  const tanggalBayar =
    Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd HH:mm"
    );

  sheet.getRange(row, map.colTanggalBayar)
    .setValue(tanggalBayar);

  applyShodaqohTotalFormula(sheet, row, map);

  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'Data shodaqoh berhasil disimpan.',
    data: {
      no: no,
      nama: nama,
      bulan: bulan,
      tanggalBayar: tanggalBayar
    }
  };
}

function deleteShodaqohRow(body) {

  const no = body.no;

  if (no === undefined || no === null || no === '') {
    return {
      success: false,
      message: 'Nomor tidak valid.'
    };
  }

  const sheet = getSheet(SHEET_SHODAQOH);
  const row = findRowIndexByNo(sheet, no);

  if (row === -1) {
    return {
      success: false,
      message: 'Data shodaqoh tidak ditemukan.'
    };
  }

  sheet.deleteRow(row);
  renumberShodaqohRows(sheet);
  SpreadsheetApp.flush();

  return {
    success: true,
    message: 'Data shodaqoh berhasil dihapus.'
  };
}


// ------------------------------------------------------------
// BACA SEMUA DATA + TOTAL PER KOLOM
// ------------------------------------------------------------
//
// monthKey (opsional, 'YYYY-MM'): kalau diisi, "rows" & "totals" hanya
// berisi baris bulan itu, dan "unpaidNames" dihitung (nama yang pernah
// tercatat tapi belum ada baris di bulan ini). Kalau kosong, "rows"
// berisi SEMUA baris (semua bulan) dan "unpaidNames" selalu kosong.

function computeEmptyShodaqohTotals() {
  return {
    susulanIR: 0,
    uangSambung: 0,
    jimpitan: 0,
    siarSiar: 0,
    seribuan: 0,
    kafan: 0,
    ukhroMT: 0,
    danaKesehatan: 0,
    total: 0
  };
}

function getShodaqohData(monthKey) {

  monthKey = String(monthKey || '').trim();

  const sheet = getSheet(SHEET_SHODAQOH);
  const map = getShodaqohColumnMap();
  const susulanMonths = getShodaqohSusulanMonths();
  const memberNames = getShodaqohMemberNames();
  const lastRow = sheet.getLastRow();

  const emptyResult = {
    success: true,
    memberNames: memberNames,
    susulanMonths: susulanMonths,
    susulanActiveMonths: getShodaqohSusulanWindow(),
    currentMonth: getCurrentMonthKey(),
    selectedMonth: monthKey,
    allMonths: [],
    rows: [],
    totals: computeEmptyShodaqohTotals(),
    knownNames: memberNames,
    paidNames: [],
    unpaidNames: monthKey ? memberNames.slice() : []
  };

  if (lastRow < 2) {
    return emptyResult;
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        map.totalCols
      )
      .getValues();

  const allRows =
    values
      .filter(function (r) {
        return (
          r[map.colNama - 1] !== '' &&
          r[map.colNama - 1] !== null
        );
      })
      .map(function (r) {

        const susulan = [];

        for (let i = 0; i < susulanMonths.length; i++) {
          susulan.push(
            Number(
              r[map.colSusulanStart - 1 + i]
            ) || 0
          );
        }

        return {
          no: r[map.colNo - 1],
          nama: String(r[map.colNama - 1] || '').trim(),
          bulan: String(
            r[map.colBulan - 1] || ''
          ).trim(),

          susulan: susulan,

          uangSambung:
            Number(r[map.colUangSambung - 1]) || 0,

          jimpitan:
            Number(r[map.colJimpitan - 1]) || 0,

          siarSiar:
            Number(r[map.colSiarSiar - 1]) || 0,

          seribuan:
            Number(r[map.colSeribuan - 1]) || 0,

          kafan:
            Number(r[map.colKafan - 1]) || 0,

          ukhroMT:
            Number(r[map.colUkhroMT - 1]) || 0,

          total:
            Number(r[map.colTotal - 1]) || 0,

          danaKesehatan:
            Number(r[map.colDanaKesehatan - 1]) || 0,

          tanggalBayar:
            r[map.colTanggalBayar - 1]
              ? String(r[map.colTanggalBayar - 1])
              : ''
        };
      });

  const allMonths =
    [
      ...new Set(
        allRows
          .map(function (r) {
            return r.bulan;
          })
          .filter(Boolean)
      )
    ]
      .sort()
      .reverse();

  const rows =
    monthKey
      ? allRows.filter(function (r) {
          return r.bulan === monthKey;
        })
      : allRows;

  // Hanya nama dari roster tetap yang dianggap sudah bayar.
  // Ini juga mencegah data lama dengan nama typo mengacaukan
  // daftar sudah/belum bayar.
  const paidSet = new Set(
    rows
      .map(function (r) {
        return String(r.nama).trim().toLowerCase();
      })
      .filter(function (nama) {
        return nama !== '';
      })
  );

  const paidNames =
    memberNames.filter(function (nama) {
      return paidSet.has(
        String(nama).trim().toLowerCase()
      );
    });

  const unpaidNames =
    monthKey
      ? memberNames.filter(function (nama) {
          return !paidSet.has(
            String(nama).trim().toLowerCase()
          );
        })
      : [];

  const totals =
    computeShodaqohTotals(rows);

  return {
    success: true,

    // Master nama tetap — selalu sama setiap bulan.
    memberNames: memberNames,
    knownNames: memberNames,

    susulanMonths: susulanMonths,
    susulanActiveMonths: getShodaqohSusulanWindow(),

    currentMonth: getCurrentMonthKey(),
    selectedMonth: monthKey,

    allMonths: allMonths,
    rows: rows,

    totals: totals,

    paidNames: paidNames,
    unpaidNames: unpaidNames
  };
}

// ------------------------------------------------------------
// POSTING TOTAL PER KATEGORI KE TRANSAKSI KAS (HANYA BULAN TERPILIH)
// ------------------------------------------------------------

function postShodaqohToKas(body, createdBy) {

  const monthKey =
    String(body.monthKey || '').trim();

  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return {
      success: false,
      message: 'Bulan tidak valid. Gunakan format YYYY-MM.'
    };
  }

  const props = PropertiesService.getScriptProperties();
  const postedKey = 'SHODAQOH_POSTED_' + monthKey;

  if (props.getProperty(postedKey) && !body.force) {
    return {
      success: false,
      alreadyExists: true,
      message:
        'Shodaqoh bulan ' + getMonthLabelServer(monthKey) +
        ' sudah pernah diposting ke Kas. Gunakan opsi "force" jika ingin posting ulang.'
    };
  }

  // PENTING: totals dihitung HANYA dari baris shodaqoh yang "Bulan"-nya
  // sama dengan monthKey yang sedang diposting — bukan seluruh sheet.
  const data = getShodaqohData(monthKey);
  const totals = data.totals;

  const parts = monthKey.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);

  const tanggal =
    body.tanggal ||
    Utilities.formatDate(
      new Date(year, month, 0),
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );

  const monthLabel = getMonthLabelServer(monthKey);
  const keteranganBase = 'Shodaqoh Bulanan ' + monthLabel;

  const kasSheet = getSheet(SHEET_TRANSAKSI);
  const posted = [];

  const entries = [
    { key: 'susulanIR', account: SHODAQOH_CATEGORY_MAP.susulanIR },
    { key: 'uangSambung', account: SHODAQOH_CATEGORY_MAP.uangSambung },
    { key: 'jimpitan', account: SHODAQOH_CATEGORY_MAP.jimpitan },
    { key: 'siarSiar', account: SHODAQOH_CATEGORY_MAP.siarSiar },
    { key: 'seribuan', account: SHODAQOH_CATEGORY_MAP.seribuan },
    { key: 'kafan', account: SHODAQOH_CATEGORY_MAP.kafan },
    { key: 'ukhroMT', account: SHODAQOH_CATEGORY_MAP.ukhroMT },
    { key: 'danaKesehatan', account: SHODAQOH_CATEGORY_MAP.danaKesehatan }
  ];

  entries.forEach(function (entry) {

    const jumlah = Number(totals[entry.key]) || 0;

    if (jumlah <= 0) {
      return;
    }

    const result = insertKasTransactionRow(
      kasSheet,
      tanggal,
      entry.account,
      keteranganBase,
      'debet',
      jumlah,
      createdBy
    );

    posted.push({
      account: entry.account,
      jumlah: jumlah,
      no: result.no,
      saldo: result.saldo
    });
  });

  if (posted.length === 0) {
    return {
      success: false,
      message: 'Tidak ada nilai shodaqoh yang bisa diposting untuk bulan ' + monthLabel + '.'
    };
  }

  props.setProperty(
    postedKey,
    JSON.stringify({
      postedAt: Date.now(),
      postedBy: createdBy,
      entries: posted
    })
  );

  return {
    success: true,
    message: 'Shodaqoh bulan ' + monthLabel + ' berhasil diposting ke Kas.',
    data: {
      monthKey: monthKey,
      tanggal: tanggal,
      posted: posted
    }
  };
}


// ------------------------------------------------------------
// INSERT BARIS KE TRANSAKSI KAS (helper generik, dipakai oleh
// posting Shodaqoh — TIDAK menggantikan addTransaction() yang
// sudah ada, supaya alur lama tidak berubah sama sekali)
// ------------------------------------------------------------

function insertKasTransactionRow(sheet, tanggal, account, keterangan, jenis, jumlah, createdBy) {

  const debet = jenis === 'debet' ? jumlah : 0;
  const kredit = jenis === 'kredit' ? jumlah : 0;

  const lastRow = sheet.getLastRow();
  const newRow = lastRow + 1;
  const newNo = lastRow > 1 ? lastRow : 1;

  sheet
    .getRange(newRow, 1, 1, 8)
    .setValues([[
      newNo,
      tanggal,
      account,
      keterangan,
      debet,
      kredit,
      '',
      createdBy
    ]]);

  applySaldoFormula(sheet, newRow);

  SpreadsheetApp.flush();

  const saldo =
    Number(sheet.getRange(newRow, 7).getValue()) || 0;

  return { no: newNo, saldo: saldo };
}


// ------------------------------------------------------------
// MENU HELPER — posting lewat UI (prompt bulan)
// ------------------------------------------------------------

function promptPostShodaqohToKas() {

  const ui = SpreadsheetApp.getUi();

  const resp = ui.prompt(
    'Posting Shodaqoh ke Kas',
    'Masukkan bulan yang mau diposting (format YYYY-MM, contoh 2025-12):',
    ui.ButtonSet.OK_CANCEL
  );

  if (resp.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const monthKey = resp.getResponseText().trim();

  const result = postShodaqohToKas(
    { monthKey: monthKey },
    Session.getActiveUser().getEmail() || 'Admin'
  );

  ui.alert(result.message);
}
