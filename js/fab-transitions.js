/* ============================================================
   FAB TRANSITIONS — enter / idle / exit
   ------------------------------------------------------------
   CATATAN ARSITEKTUR (baca dulu sebelum edit):

   Project ini SPA satu-halaman (index.html + router.js custom),
   BUKAN multi-page site. Ganti "tab"/"screen" terjadi instan lewat
   class .active + .hidden (lihat navigation.js: switchTab,
   updateFabVisibility) — tidak ada page reload / navigasi <a>
   sungguhan untuk di-intercept.

   Titik hook satu-satunya yang konsisten: fungsi global
   `updateFabVisibility()` di navigation.js. Fungsi itu SELALU
   dipanggil tiap kali visibilitas FAB mungkin berubah — baik dari
   switchTab() (ganti tab/screen) maupun setAdminUI() (ganti role).
   Setelah fungsi itu selesai, seluruh state DOM (class .hidden,
   class .screen-*-active di body, class .active di .screen) sudah
   final. Jadi strategi di sini:

     1. Sebelum updateFabVisibility() asli jalan → catat FAB mana
        saja yang sedang terlihat ("before").
     2. Jalankan fungsi asli (logic bisnis TIDAK disentuh sama sekali).
     3. Sesudahnya → catat FAB mana yang terlihat ("after").
     4. Diff before vs after:
          - hilang dari after  → animasikan EXIT
          - baru muncul di after → animasikan ENTER
          - tetap ada di keduanya → dibiarkan (idle animation bawaan
            tiap FAB, seperti fabZakatFloat, tetap jalan normal)

   Kenapa EXIT pakai "clone", bukan menunda hide sungguhan?
   Karena hide di app ini SELALU instan & synchronous (classList
   .hidden → display:none, atau parent .screen kehilangan .active).
   Menunda hide asli berarti harus menduplikasi logic admin/period
   yang ada di updateFabVisibility (rapuh, gampang out-of-sync).
   Solusi lebih aman: biarkan hide asli tetap instan, tapi SEBELUM
   itu kita sudah ambil "foto" (clone) elemen FAB di posisi asalnya,
   lalu animasikan clone itu (fixed-position, di atas semua) untuk
   efek keluar — elemen sungguhan di baliknya sudah disembunyikan
   dengan aman oleh kode asli. Hasilnya: visual identik dengan spec,
   tanpa perlu menunda/nge-block navigasi & tanpa risiko merusak
   logic show/hide yang sudah ada.

   Enter animation TIDAK butuh trik ini karena saat kita capture
   "after", FAB yang baru muncul sudah benar-benar visible & di
   posisi akhirnya (display/opacity sudah di-set oleh kode asli) —
   tinggal animasikan in-place dari opacity:0/scale:0 ke normal.
   ============================================================ */

(function () {
  "use strict";

  // Konfigurasi — dibaca dari CSS custom properties di :root
  // (lihat css/fab-styles.css), supaya bisa dikustomisasi tanpa
  // sentuh file ini.
  function readMs(varName, fallbackMs) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    if (!raw) return fallbackMs;
    if (raw.endsWith("ms")) return parseFloat(raw);
    if (raw.endsWith("s")) return parseFloat(raw) * 1000;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallbackMs;
  }
  function readEasing(varName, fallback) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return raw || fallback;
  }
  function readPx(varName, fallbackPx) {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallbackPx;
  }

  function config() {
    return {
      enterDuration: readMs("--fab-enter-duration", 600),
      enterEasing: readEasing(
        "--fab-enter-easing",
        "cubic-bezier(0.34, 1.56, 0.64, 1)",
      ),
      exitDuration: readMs("--fab-exit-duration", 350),
      exitEasing: readEasing("--fab-exit-easing", "cubic-bezier(0.4, 0, 1, 1)"),
      stagger: readMs("--fab-stagger-delay", 100),
      enterTranslate: readPx("--fab-enter-translate", 20),
      exitTranslate: readPx("--fab-exit-translate", 20),
    };
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  // Deteksi visibilitas FAB yang sesungguhnya (computed style),
  // supaya cocok untuk SEMUA mekanisme hide yang dipakai di project
  // ini: class .hidden (display:none), FAB di dalam .screen yang
  // tidak .active (display:none via ancestor), body.screen-*-active
  // selector (display override), maupun aturan txOverlay
  // (opacity:0 + visibility:hidden + pointer-events:none).
  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    if (cs.display === "none") return false;
    if (cs.visibility === "hidden") return false;
    if (parseFloat(cs.opacity) === 0) return false;
    return true;
  }

  function captureVisibleFabs() {
    const map = new Map();
    document.querySelectorAll(".fab[id]").forEach((el) => {
      if (isVisible(el)) map.set(el.id, el);
    });
    return map;
  }

  // Urutan stagger dari stack visual (dipakai untuk enter naik dari
  // z-index rendah → tinggi, dan exit turun dari z-index tinggi →
  // rendah, sesuai permintaan "FAB terakhir keluar duluan").
  function sortByStack(elements, dir) {
    return elements
      .map((el) => ({ el, z: parseInt(getComputedStyle(el).zIndex, 10) || 0 }))
      .sort((a, b) => (dir === "asc" ? a.z - b.z : b.z - a.z))
      .map((x) => x.el);
  }

  // ENTER — animasikan elemen asli in-place. Idle animation CSS
  // bawaan (fabZakatFloat, dll) dipause sementara ("animation: none
  // !important" inline) supaya tidak rebutan properti `transform`
  // dengan animasi WAAPI, lalu dilepas lagi setelah selesai supaya
  // idle animation lanjut normal.
  function playEnter(el, index, cfg, reduced) {
    const duration = reduced ? 1 : cfg.enterDuration;
    const delay = reduced ? 0 : index * cfg.stagger;

    el.style.setProperty("animation", "none", "important");
    const anim = el.animate(
      [
        {
          opacity: 0,
          transform: `translateY(${cfg.enterTranslate}px) scale(0)`,
        },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration, delay, easing: cfg.enterEasing, fill: "both" },
    );
    anim.onfinish = anim.oncancel = () => {
      el.style.removeProperty("animation"); // kembalikan idle animation bawaan
      try {
        anim.cancel();
      } catch (e) {
        /* noop */
      }
    };
  }

  // EXIT — dibuat dari CLONE fixed-position di posisi asli elemen
  // (lihat catatan arsitektur di atas). Elemen asli sudah
  // disembunyikan secara instan oleh kode aslinya; clone inilah
  // yang tampil "terbang keluar" lalu dibuang dari DOM.
  function playExitClone(el, index, cfg, reduced) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return; // sudah tak terlihat, skip

    const clone = el.cloneNode(true);
    clone.removeAttribute("id"); // hindari duplikat id
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("tabindex", "-1");
    Object.assign(clone.style, {
      position: "fixed",
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      margin: "0",
      zIndex: "9999",
      pointerEvents: "none",
      animation: "none",
      transition: "none",
    });
    document.body.appendChild(clone);

    const duration = reduced ? 1 : cfg.exitDuration;
    const delay = reduced ? 0 : index * cfg.stagger;

    const anim = clone.animate(
      [
        { opacity: 1, transform: "translateY(0) scale(1)" },
        {
          opacity: 0,
          transform: `translateY(${cfg.exitTranslate}px) scale(0)`,
        },
      ],
      { duration, delay, easing: cfg.exitEasing, fill: "forwards" },
    );
    const cleanup = () => clone.remove();
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
    // Jaring pengaman andai event WAAPI tak terpanggil (mis. tab
    // browser di-background lama) — bersihkan clone maksimal setelah
    // durasi + delay + sedikit buffer.
    setTimeout(cleanup, duration + delay + 500);
  }

  // Diff & jalankan animasi
  function animateDiff(before, after) {
    const cfg = config();
    const reduced = prefersReducedMotion();

    const exiting = [];
    before.forEach((el, id) => {
      if (!after.has(id)) exiting.push(el);
    });
    const entering = [];
    after.forEach((el, id) => {
      if (!before.has(id)) entering.push(el);
    });

    sortByStack(exiting, "desc").forEach((el, i) =>
      playExitClone(el, i, cfg, reduced),
    );
    sortByStack(entering, "asc").forEach((el, i) =>
      playEnter(el, i, cfg, reduced),
    );
  }

  // Pasang wrapper di sekitar window.updateFabVisibility.
  // Ditunda sampai DOMContentLoaded + fungsi aslinya benar-benar
  // ada (navigation.js harus sudah di-load sebelum script ini).
  function install() {
    if (typeof window.updateFabVisibility !== "function") {
      console.warn(
        "[fab-transitions] updateFabVisibility() belum tersedia — " +
          "pastikan js/fab-transitions.js dimuat SETELAH js/navigation.js.",
      );
      return;
    }
    if (window.updateFabVisibility.__fabTransitionsWrapped) return;

    const original = window.updateFabVisibility;
    let isFirstRun = true;
    function wrapped() {
      // Beberapa FAB (mis. #fabAiChat) punya "display: flex !important"
      // TANPA syarat di CSS — jadi sudah tampil dari HTML/CSS pertama
      // kali render, sebelum baris JS manapun sempat jalan. Kalau kita
      // pakai snapshot "before" yang sesungguhnya di panggilan pertama,
      // FAB seperti itu sudah kebaca visible duluan → tidak pernah
      // terhitung "baru muncul" → enter animation di boot ter-skip.
      // Maka khusus panggilan PERTAMA, anggap "before" kosong supaya
      // semua FAB yang visible begitu app selesai load tetap animasi
      // masuk, apa pun mekanisme visibility-nya.
      const before = isFirstRun ? new Map() : captureVisibleFabs();

      if (isFirstRun) {
        // Lepas gate "fab-boot-pending" (lihat <head> index.html &
        // css/fab-styles.css) TEPAT di sini — sinkron, dalam satu
        // eksekusi JS yang sama dengan animate() di bawah, jadi
        // browser tidak sempat mengecat frame perantara (tanpa gate,
        // sebelum animasi WAAPI mengambil alih transform/opacity).
        // Selama gate masih aktif, computed opacity SEMUA .fab
        // terpaksa 0 (dipaksa CSS) — makanya harus dilepas sebelum
        // capture "after" di bawah, kalau tidak semua FAB akan
        // kebaca "tidak visible" dan diff jadi kosong.
        document.documentElement.classList.remove("fab-boot-pending");
      }
      isFirstRun = false;

      const result = original.apply(this, arguments);
      const after = captureVisibleFabs();
      animateDiff(before, after);
      return result;
    }
    wrapped.__fabTransitionsWrapped = true;
    window.updateFabVisibility = wrapped;

    // Jaring pengaman: kalau updateFabVisibility() tidak kunjung
    // terpanggil (mis. macet di gate login sebelum enterApp()),
    // jangan biarkan FAB tersembunyi permanen — lepas gate tanpa
    // animasi setelah beberapa detik.
    setTimeout(() => {
      if (isFirstRun) {
        document.documentElement.classList.remove("fab-boot-pending");
      }
    }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }

  // Diekspos untuk debugging/kustomisasi manual jika suatu saat
  // dibutuhkan (mis. trigger enter manual untuk FAB baru yang
  // ditambahkan lewat JS setelah load).
  window.FabTransitions = {
    playEnterFor: function (id) {
      const el = document.getElementById(id);
      if (el && isVisible(el)) playEnter(el, 0, config(), prefersReducedMotion());
    },
  };
})();
