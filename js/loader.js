// ============================================================
// LOADER - REUSABLE FUNCTIONS
// ============================================================

function showLoader(message) {
  var loader = document.getElementById("appLoader");
  var text = document.getElementById("loaderText");
  if (loader) {
    loader.classList.remove("hidden");
    if (text) text.textContent = message || "Memuat...";
  } else {
    console.warn("⚠️ appLoader element not found!");
  }
}

function hideLoader() {
  var loader = document.getElementById("appLoader");
  if (loader) {
    loader.classList.add("hidden");
  }
}

function showZakatLoader(message) {
  showLoader(message || "Memuat data zakat...");
}

function hideZakatLoader() {
  hideLoader();
}

function showButtonLoading(btn, text) {
  text = text || "Menyimpan...";
  if (!btn) return;
  btn._originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = `
    <span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:8px;"></span>
    ${text}
  `;
}

function hideButtonLoading(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = btn._originalText || "Simpan";
}

function showZakatButtonLoading(btn, text) {
  showButtonLoading(btn, text || "Menyimpan...");
}

function hideZakatButtonLoading(btn) {
  hideButtonLoading(btn);
}
