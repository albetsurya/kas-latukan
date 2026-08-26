// Fungsi untuk menampilkan skeleton loader di Muzaki Sheet
function showMuzakiSheetSkeleton() {
  var container = document.getElementById("zakatMuzakiSheetList");
  if (!container) return;

  var skeletonHtml = `
    <div class="skeleton-loader">
      ${Array(3)
        .fill(
          `
        <div class="skeleton-row">
          <div class="skeleton-number"></div>
          <div class="skeleton-name"></div>
          <div class="skeleton-nominal"></div>
          <div class="skeleton-actions"></div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  container.innerHTML = skeletonHtml;

  var totalEl = document.getElementById("zakatMuzakiSheetTotal");
  if (totalEl) {
    totalEl.textContent = "Memuat...";
    totalEl.style.color = "var(--ink-faint)";
    totalEl.style.background = "transparent";
    totalEl.style.display = "inline-block";
    totalEl.style.width = "auto";
  }
}

// Fungsi untuk menampilkan skeleton loader di Mustahik Sheet
function showMustahikSheetSkeleton() {
  var container = document.getElementById("zakatMustahikSheetList");
  if (!container) return;

  var skeletonHtml = `
    <div class="skeleton-loader">
      ${Array(3)
        .fill(
          `
        <div class="skeleton-row">
          <div class="skeleton-number"></div>
          <div class="skeleton-name"></div>
          <div class="skeleton-nominal"></div>
          <div class="skeleton-actions"></div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;

  container.innerHTML = skeletonHtml;

  var danaEl = document.getElementById("zakatMustahikSheetDana");
  if (danaEl) {
    danaEl.textContent = "Memuat...";
    danaEl.style.color = "var(--ink-faint)";
  }

  var dialokasikanEl = document.getElementById(
    "zakatMustahikSheetDialokasikan",
  );
  if (dialokasikanEl) {
    dialokasikanEl.textContent = "Memuat...";
    dialokasikanEl.style.color = "var(--ink-faint)";
  }

  var sisaEl = document.getElementById("zakatMustahikSheetSisa");
  if (sisaEl) {
    sisaEl.textContent = "Memuat...";
    sisaEl.style.color = "var(--ink-faint)";
  }

  var statusEl = document.getElementById("zakatMustahikSheetStatus");
  if (statusEl) {
    statusEl.textContent = "● Memuat...";
    statusEl.style.color = "var(--ink-faint)";
    statusEl.style.background = "transparent";
    statusEl.style.padding = "0";
    statusEl.style.borderRadius = "0";
  }

  var progressEl = document.getElementById("zakatMustahikSheetProgress");
  if (progressEl) {
    progressEl.style.width = "30%";
    progressEl.style.background = "var(--surface-alt)";
    progressEl.style.animation = "skeletonPulse 1.5s ease-in-out infinite";
  }

  var progressLabel = document.getElementById(
    "zakatMustahikSheetProgressLabel",
  );
  if (progressLabel) {
    progressLabel.textContent = "";
  }

  var totalEl = document.getElementById("zakatMustahikSheetTotal");
  if (totalEl) {
    totalEl.textContent = "Memuat...";
    totalEl.style.color = "var(--ink-faint)";
    totalEl.style.background = "transparent";
    totalEl.style.display = "inline-block";
    totalEl.style.width = "auto";
  }
}

// Fungsi untuk menampilkan skeleton loader di Rincian Sheet - OPSI 1 (Overlay)
function showRincianSheetSkeleton() {
  var container = document.querySelector(".zakat-rincian-container");
  if (!container) return;

  // Jika sudah ada skeleton overlay, jangan tambahkan lagi
  if (container.querySelector(".skeleton-rincian-overlay")) {
    return;
  }

  // Sembunyikan semua section dengan opacity rendah
  var sections = container.querySelectorAll(".zakat-rincian-section");
  sections.forEach(function (section) {
    section.style.opacity = "0.15";
    section.style.pointerEvents = "none";
    section.style.transition = "opacity 0.3s ease";
  });

  var totalSection = container.querySelector(".zakat-rincian-total");
  if (totalSection) {
    totalSection.style.opacity = "0.15";
    totalSection.style.pointerEvents = "none";
    totalSection.style.transition = "opacity 0.3s ease";
  }

  // Beri posisi relative pada container
  container.style.position = "relative";

  // Buat overlay skeleton
  var skeletonOverlay = document.createElement("div");
  skeletonOverlay.className = "skeleton-rincian-overlay";
  skeletonOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 8px 0;
    background: var(--surface);
    z-index: 5;
    border-radius: 12px;
    pointer-events: none;
  `;

  skeletonOverlay.innerHTML = `
    ${["Mustahik", "Sabilillah", "Amil"]
      .map(function (title) {
        var fieldCount =
          title === "Sabilillah" ? 1 : title === "Mustahik" ? 3 : 4;
        return `
        <div style="opacity:0.6;animation:skeletonPulse 1.5s ease-in-out infinite;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <div style="height:20px;width:100px;background:var(--surface-alt);border-radius:4px;"></div>
            <div style="height:28px;width:100px;background:var(--surface-alt);border-radius:6px;"></div>
          </div>
          <div style="height:14px;width:150px;background:var(--surface-alt);border-radius:4px;margin:4px 0 12px;"></div>
          ${Array(fieldCount)
            .fill(
              `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
              <div style="height:12px;width:60px;background:var(--surface-alt);border-radius:4px;"></div>
              <div style="height:38px;width:70px;background:var(--surface-alt);border-radius:6px;"></div>
              <div style="height:14px;width:30px;background:var(--surface-alt);border-radius:4px;"></div>
              <div style="height:18px;width:80px;background:var(--surface-alt);border-radius:4px;"></div>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
      })
      .join("")}
    <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid var(--border);opacity:0.6;animation:skeletonPulse 1.5s ease-in-out infinite;flex-wrap:wrap;gap:8px;">
      ${["Total Persentase", "Total Nominal", "Status"]
        .map(function () {
          return `
          <div>
            <div style="height:12px;width:80px;background:var(--surface-alt);border-radius:4px;"></div>
            <div style="height:20px;width:80px;background:var(--surface-alt);border-radius:4px;margin-top:4px;"></div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;

  container.appendChild(skeletonOverlay);
}

// Fungsi untuk menghapus skeleton di Rincian Sheet
function removeRincianSheetSkeleton() {
  var container = document.querySelector(".zakat-rincian-container");
  if (!container) return;

  // Hapus overlay skeleton
  var overlay = container.querySelector(".skeleton-rincian-overlay");
  if (overlay) {
    overlay.remove();
  }

  // Tampilkan kembali semua section
  var sections = container.querySelectorAll(".zakat-rincian-section");
  sections.forEach(function (section) {
    section.style.opacity = "1";
    section.style.pointerEvents = "auto";
    section.style.transition = "opacity 0.3s ease";
  });

  var totalSection = container.querySelector(".zakat-rincian-total");
  if (totalSection) {
    totalSection.style.opacity = "1";
    totalSection.style.pointerEvents = "auto";
    totalSection.style.transition = "opacity 0.3s ease";
  }

  container.style.position = "";
}
