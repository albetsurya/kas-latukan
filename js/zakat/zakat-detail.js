var zakatEventListenersInitialized = false;
var isSubmittingMuzaki = false;
var isSubmittingMustahik = false;
var isSubmittingRincian = false;

function initZakatSheetEventListeners() {
  if (zakatEventListenersInitialized) {
    return;
  }
  zakatEventListenersInitialized = true;

  initCountAdjustButtons();

  var muzakiCancel = document.getElementById("zakatMuzakiSheetCancel");
  var muzakiSubmit = document.getElementById("zakatMuzakiSheetSubmit");
  var muzakiSheet = document.getElementById("zakatMuzakiSheet");

  if (muzakiCancel) {
    muzakiCancel.addEventListener("click", closeZakatMuzakiSheet);
  }

  if (muzakiSubmit) {
    var newMuzakiSubmit = muzakiSubmit.cloneNode(true);
    muzakiSubmit.parentNode.replaceChild(newMuzakiSubmit, muzakiSubmit);
    newMuzakiSubmit.addEventListener("click", submitZakatMuzakiSheet);
  }

  if (muzakiSheet) {
    muzakiSheet.addEventListener("click", function (e) {
      if (e.target === this) closeZakatMuzakiSheet();
    });
  }

  var mustahikApply = document.getElementById("zakatMustahikSheetApplyCount");
  var mustahikCancel = document.getElementById("zakatMustahikSheetCancel");
  var mustahikSubmit = document.getElementById("zakatMustahikSheetSubmit");
  var mustahikSheet = document.getElementById("zakatMustahikSheet");

  if (mustahikCancel) {
    mustahikCancel.addEventListener("click", closeZakatMustahikSheet);
  }

  if (mustahikSubmit) {
    var newMustahikSubmit = mustahikSubmit.cloneNode(true);
    mustahikSubmit.parentNode.replaceChild(newMustahikSubmit, mustahikSubmit);
    newMustahikSubmit.addEventListener("click", submitZakatMustahikSheet);
  }

  if (mustahikSheet) {
    mustahikSheet.addEventListener("click", function (e) {
      if (e.target === this) closeZakatMustahikSheet();
    });
  }

  var rincianCancel = document.getElementById("zakatRincianSheetCancel");
  var rincianSubmit = document.getElementById("zakatRincianSheetSubmit");
  var rincianSheet = document.getElementById("zakatRincianSheet");

  if (rincianCancel) {
    rincianCancel.addEventListener("click", closeZakatRincianSheet);
  }

  if (rincianSubmit) {
    var newRincianSubmit = rincianSubmit.cloneNode(true);
    rincianSubmit.parentNode.replaceChild(newRincianSubmit, rincianSubmit);
    newRincianSubmit.addEventListener("click", submitZakatRincianSheet);
  }

  if (rincianSheet) {
    rincianSheet.addEventListener("click", function (e) {
      if (e.target === this) closeZakatRincianSheet();
    });
  }

  var muzakiEdit = document.getElementById("zakatMuzakiEdit");
  var mustahikEdit = document.getElementById("zakatMustahikEdit");
  var rincianEdit = document.getElementById("zakatRincianEdit");

  if (muzakiEdit) {
    muzakiEdit.addEventListener("click", openZakatMuzakiSheet);
  }

  if (mustahikEdit) {
    mustahikEdit.addEventListener("click", openZakatMustahikSheet);
  }

  if (rincianEdit) {
    rincianEdit.addEventListener("click", openZakatRincianSheet);
  }

  var muzakiCountInput = document.getElementById("zakatMuzakiSheetCount");
  if (muzakiCountInput) {
    muzakiCountInput.addEventListener("change", function () {
      var val = parseInt(this.value) || 1;
      var min = parseInt(this.min) || 1;
      var max = parseInt(this.max) || 20;
      val = Math.max(min, Math.min(max, val));
      this.value = val;

      var zakat = getZakatById(state.zakat.currentId);
      if (zakat) {
        var activeMuzaki = zakat.muzaki.filter(function (m) {
          return m._deleted !== true;
        });

        var filledCount = activeMuzaki.filter(function (m) {
          return (
            (m.nama && m.nama.trim() !== "") || (m.nominal && m.nominal > 0)
          );
        }).length;

        if (val < activeMuzaki.length) {
          var akanKehilanganData = false;
          for (var i = val; i < activeMuzaki.length; i++) {
            var item = activeMuzaki[i];
            if (
              (item.nama && item.nama.trim() !== "") ||
              (item.nominal && item.nominal > 0)
            ) {
              akanKehilanganData = true;
              break;
            }
          }

          if (akanKehilanganData) {
            showToast(
              "Tidak dapat mengurangi jumlah. Hapus baris yang tidak diperlukan menggunakan tombol hapus terlebih dahulu.",
              "warning",
            );
            this.value = activeMuzaki.length;
            return;
          }
        }
      }

      applyMuzakiCountChange(val);
    });
  }

  var mustahikCountInput = document.getElementById("zakatMustahikSheetCount");
  if (mustahikCountInput) {
    mustahikCountInput.addEventListener("change", function () {
      var val = parseInt(this.value) || 1;
      var min = parseInt(this.min) || 1;
      var max = parseInt(this.max) || 20;
      val = Math.max(min, Math.min(max, val));
      this.value = val;

      var zakat = getZakatById(state.zakat.currentId);
      if (zakat) {
        var activeMustahik = zakat.mustahik.filter(function (m) {
          return m._deleted !== true;
        });

        var filledCount = activeMustahik.filter(function (m) {
          return (
            (m.nama && m.nama.trim() !== "") || (m.nominal && m.nominal > 0)
          );
        }).length;

        if (val < activeMustahik.length) {
          var akanKehilanganData = false;
          for (var i = val; i < activeMustahik.length; i++) {
            var item = activeMustahik[i];
            if (
              (item.nama && item.nama.trim() !== "") ||
              (item.nominal && item.nominal > 0)
            ) {
              akanKehilanganData = true;
              break;
            }
          }

          if (akanKehilanganData) {
            showToast(
              "Tidak dapat mengurangi jumlah. Hapus baris yang tidak diperlukan menggunakan tombol hapus terlebih dahulu.",
              "warning",
            );
            this.value = activeMustahik.length;
            return;
          }
        }
      }

      applyMustahikCountChange(val);
    });
  }
}

function markMuzakiForDeletion(zakatId, muzakiId) {
  if (!zakatId || !muzakiId) {
    showToast("Data tidak valid.", "error");
    return;
  }

  var zakat = getZakatById(zakatId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  if (isZakatCompleted(zakat)) {
    showToast("Tidak dapat menghapus muzaki. Zakat sudah selesai.", "error");
    return;
  }

  // Simpan dulu input baris lain yang sudah diketik user sebelum baris
  // ini ditandai hapus & sheet di-render ulang (mencegah data tertumpuk
  // atau hilang).
  if (typeof captureMuzakiSheetInputs === "function") {
    captureMuzakiSheetInputs(zakat);
  }

  var activeMuzaki = zakat.muzaki.filter(function (m) {
    return m._deleted !== true;
  });

  if (activeMuzaki.length <= 1) {
    showToast("Minimal harus ada 1 Muzaki.", "warning");
    return;
  }

  var muzaki = zakat.muzaki.find(function (m) {
    return m.id === muzakiId;
  });

  if (!muzaki) {
    showToast("Muzaki tidak ditemukan.", "error");
    return;
  }

  if (muzaki._deleted === true) {
    showToast("Muzaki sudah ditandai untuk dihapus.", "info");
    return;
  }

  muzaki._deleted = true;

  // ✅ Sinkronkan jumlah pending dengan jumlah baris aktif terbaru supaya
  // tombol +/- tidak menambah/mengurangi baris secara tidak tepat.
  if (typeof pendingMuzakiCount !== "undefined") {
    pendingMuzakiCount = zakat.muzaki.filter(function (m) {
      return m._deleted !== true;
    }).length;
  }

  renderMuzakiSheetRows(zakat);
  updateMuzakiSheetTotal(zakat);

  showToast(
    "Muzaki ditandai untuk dihapus. Simpan untuk mengkonfirmasi.",
    "warning",
  );
}

function showMarkMuzakiConfirm(zakatId, muzakiId) {
  var zakat = getZakatById(zakatId);
  if (!zakat) return;

  var muzaki = zakat.muzaki.find(function (m) {
    return m.id === muzakiId;
  });

  if (!muzaki) return;

  var existingModal = document.getElementById("markMuzakiConfirm");
  if (existingModal) {
    existingModal.remove();
  }

  var overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "markMuzakiConfirm";
  overlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:380px;">
      <div class="modal-icon" style="background:var(--neg-soft);color:var(--neg);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>
        </svg>
      </div>
      <h3 class="font-display text-[15.5px] font-extrabold text-center mt-3">Tandai Muzaki untuk Dihapus?</h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        Muzaki <strong>${escapeHtml(muzaki.nama)}</strong> (${fmtRp(muzaki.nominal)}) 
        akan ditandai untuk dihapus dari zakat "<strong>${escapeHtml(zakat.title)}</strong>".
        <br><br>
        <span style="font-size:11px;color:var(--gold);">Penghapusan akan dikonfirmasi saat Anda menekan tombol Simpan.</span>
      </p>
      <div class="flex gap-2.5 pt-4">
        <button type="button" id="markMuzakiCancel" class="btn-ghost flex-1">Batal</button>
        <button type="button" id="markMuzakiConfirm" class="btn-primary flex-1" style="background:var(--neg);">Tandai Hapus</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay
    .querySelector("#markMuzakiCancel")
    .addEventListener("click", function () {
      overlay.remove();
    });

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) overlay.remove();
  });

  overlay
    .querySelector("#markMuzakiConfirm")
    .addEventListener("click", function () {
      overlay.remove();
      markMuzakiForDeletion(zakatId, muzakiId);
    });
}

function markMustahikForDeletion(zakatId, mustahikId) {
  if (!zakatId || !mustahikId) {
    showToast("Data tidak valid.", "error");
    return;
  }

  var zakat = getZakatById(zakatId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  if (isZakatCompleted(zakat)) {
    showToast("Tidak dapat menghapus mustahik. Zakat sudah selesai.", "error");
    return;
  }

  // Simpan dulu input baris lain yang sudah diketik user sebelum baris
  // ini ditandai hapus & sheet di-render ulang (mencegah data tertumpuk
  // atau hilang).
  if (typeof captureMustahikSheetInputs === "function") {
    captureMustahikSheetInputs(zakat);
  }

  var activeMustahik = zakat.mustahik.filter(function (m) {
    return m._deleted !== true;
  });

  if (activeMustahik.length <= 1) {
    showToast("Minimal harus ada 1 Mustahik.", "warning");
    return;
  }

  var mustahik = zakat.mustahik.find(function (m) {
    return m.id === mustahikId;
  });

  if (!mustahik) {
    showToast("Mustahik tidak ditemukan.", "error");
    return;
  }

  if (mustahik._deleted === true) {
    showToast("Mustahik sudah ditandai untuk dihapus.", "info");
    return;
  }

  mustahik._deleted = true;

  // ✅ Sinkronkan jumlah pending dengan jumlah baris aktif terbaru supaya
  // tombol +/- tidak menambah/mengurangi baris secara tidak tepat.
  if (typeof pendingMustahikCount !== "undefined") {
    pendingMustahikCount = zakat.mustahik.filter(function (m) {
      return m._deleted !== true;
    }).length;
  }

  renderMustahikSheetRows(zakat);
  updateMustahikSheetTotal(zakat);

  showToast(
    "Mustahik ditandai untuk dihapus. Simpan untuk mengkonfirmasi.",
    "warning",
  );
}

function showMarkMustahikConfirm(zakatId, mustahikId) {
  var zakat = getZakatById(zakatId);
  if (!zakat) return;

  var mustahik = zakat.mustahik.find(function (m) {
    return m.id === mustahikId;
  });

  if (!mustahik) return;

  var existingModal = document.getElementById("markMustahikConfirm");
  if (existingModal) {
    existingModal.remove();
  }

  var overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "markMustahikConfirm";
  overlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:380px;">
      <div class="modal-icon" style="background:var(--neg-soft);color:var(--neg);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>
        </svg>
      </div>
      <h3 class="font-display text-[15.5px] font-extrabold text-center mt-3">Tandai Mustahik untuk Dihapus?</h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        Mustahik "<strong>${escapeHtml(mustahik.nama)}</strong>" (${fmtRp(mustahik.nominal)}) 
        akan ditandai untuk dihapus dari zakat <strong>${escapeHtml(zakat.title)}</strong>.
        <br><br>
        <span style="font-size:11px;color:var(--gold);">Penghapusan akan dikonfirmasi saat Anda menekan tombol Simpan.</span>
      </p>
      <div class="flex gap-2.5 pt-4">
        <button type="button" id="markMustahikCancel" class="btn-ghost flex-1">Batal</button>
        <button type="button" id="markMustahikConfirm" class="btn-primary flex-1" style="background:var(--neg);">Tandai Hapus</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay
    .querySelector("#markMustahikCancel")
    .addEventListener("click", function () {
      overlay.remove();
    });

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) overlay.remove();
  });

  overlay
    .querySelector("#markMustahikConfirm")
    .addEventListener("click", function () {
      overlay.remove();
      markMustahikForDeletion(zakatId, mustahikId);
    });
}

function initZakatActionsDropdown() {
  var moreBtn = document.getElementById("btnMoreActions");
  var menu = document.getElementById("zakatActionsDropdownMenu");

  if (!moreBtn || !menu) return;

  moreBtn.removeEventListener("click", toggleZakatDropdown);
  moreBtn.addEventListener("click", toggleZakatDropdown);

  document.removeEventListener("click", closeZakatDropdownOutside);
  document.addEventListener("click", closeZakatDropdownOutside);
}

function toggleZakatDropdown(e) {
  e.stopPropagation();
  var menu = document.getElementById("zakatActionsDropdownMenu");
  if (menu) {
    menu.classList.toggle("hidden");
  }
}

function closeZakatDropdownOutside(e) {
  var menu = document.getElementById("zakatActionsDropdownMenu");
  if (!menu || menu.classList.contains("hidden")) return;

  var target = e.target.closest(".zakat-actions-dropdown");
  if (!target) {
    menu.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (!zakatEventListenersInitialized) {
    initZakatSheetEventListeners();
  }
  initZakatActionsDropdown();
});
