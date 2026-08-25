var zakatEventListenersInitialized = false;
var isSubmittingMuzaki = false;
var isSubmittingMustahik = false;
var isSubmittingRincian = false;

function initZakatSheetEventListeners() {
  if (zakatEventListenersInitialized) {
    return;
  }
  zakatEventListenersInitialized = true;

  var muzakiApply = document.getElementById("zakatMuzakiSheetApplyCount");
  var muzakiCancel = document.getElementById("zakatMuzakiSheetCancel");
  var muzakiSubmit = document.getElementById("zakatMuzakiSheetSubmit");
  var muzakiSheet = document.getElementById("zakatMuzakiSheet");

  if (muzakiApply) {
    muzakiApply.addEventListener("click", applyMuzakiSheetCount);
  }

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

  if (mustahikApply) {
    mustahikApply.addEventListener("click", applyMustahikSheetCount);
  }

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
}

function openZakatMuzakiSheet() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var overlay = document.getElementById("zakatMuzakiSheet");
  if (!overlay) return;

  isSubmittingMuzaki = false;

  if (!state.masterMuzaki || state.masterMuzaki.length === 0) {
    loadMastersData().then(function () {
      renderMuzakiSheetRows(zakat);
      updateMuzakiSheetTotal(zakat);
    });
  }

  var muzakiList = zakat.muzaki || [];
  var activeMuzaki = muzakiList.filter(function (m) {
    return m._deleted !== true;
  });

  if (activeMuzaki.length === 0) {
    zakat.muzaki.push({
      id: "",
      nama: "",
      nominal: 0,
    });
  }

  var count = Math.max(activeMuzaki.length || 1, 1);
  var countInput = document.getElementById("zakatMuzakiSheetCount");
  if (countInput) countInput.value = count;

  renderMuzakiSheetRows(zakat);
  updateMuzakiSheetTotal(zakat);

  overlay.classList.remove("hidden");
}

function closeZakatMuzakiSheet() {
  var overlay = document.getElementById("zakatMuzakiSheet");
  if (overlay) {
    overlay.classList.add("hidden");
  }
  isSubmittingMuzaki = false;
}

function renderMuzakiSheetRows(zakat) {
  var container = document.getElementById("zakatMuzakiSheetList");
  var countInput = document.getElementById("zakatMuzakiSheetCount");
  if (!container || !countInput) return;

  var muzakiList = zakat.muzaki || [];
  var activeMuzaki = muzakiList.filter(function (m) {
    return m._deleted !== true;
  });

  if (activeMuzaki.length === 0) {
    activeMuzaki = [
      {
        id: "",
        nama: "",
        nominal: 0,
      },
    ];
  }

  var currentCount = activeMuzaki.length;
  countInput.value = currentCount;

  var allNames = loadMuzakiSuggestions();
  var isCompleted = isZakatCompleted(zakat);

  var rows = [];
  for (var i = 0; i < activeMuzaki.length; i++) {
    var existing = activeMuzaki[i];
    var rowNumber = i + 1;
    var muzakiId = existing.id || "";
    var isDeleted = existing._deleted === true;

    var rowClass = isDeleted ? "zakat-muzaki-row deleted" : "zakat-muzaki-row";
    var nameValue = isDeleted
      ? existing.nama + " (akan dihapus)"
      : existing.nama || "";

    var master = getMasterMuzakiById(muzakiId);
    var isFromMaster = master !== null;

    var usedNames = [];
    for (var j = 0; j < activeMuzaki.length; j++) {
      var m = activeMuzaki[j];
      if (m.id !== existing.id && m._deleted !== true && m.nama) {
        usedNames.push(m.nama.toLowerCase().trim());
      }
    }

    var availableNames = allNames.filter(function (n) {
      var lower = n.toLowerCase().trim();
      return usedNames.indexOf(lower) === -1;
    });

    if (nameValue && !isFromMaster) {
      var isInSuggestions = allNames.indexOf(nameValue) !== -1;
      if (!isInSuggestions) {
        availableNames.push(nameValue);
        availableNames.sort();
      }
    }

    var deleteBtnHtml = "";
    if (!isCompleted && !isDeleted && muzakiId) {
      deleteBtnHtml = `
        <button type="button" class="zakat-row-delete-btn" data-muzaki-id="${muzakiId}" data-index="${i}" title="Hapus Muzaki ${rowNumber}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>
          </svg>
        </button>
      `;
    }

    var undeleteBtnHtml = "";
    if (isDeleted) {
      undeleteBtnHtml = `
        <button type="button" class="zakat-row-undelete-btn" data-muzaki-id="${muzakiId}" data-index="${i}" title="Batalkan penghapusan">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 5v5h5"/>
            <path d="M12 8v4l3 2"/>
          </svg>
        </button>
      `;
    }

    var lockHtml = isCompleted
      ? '<span style="font-size:10px;color:var(--ink-faint);">\uD83D\uDD12</span>'
      : "";

    rows.push(`
      <div class="${rowClass}" data-sheet-index="${i}" data-muzaki-id="${muzakiId}" style="${isDeleted ? "opacity:0.5;background:var(--neg-soft);" : ""}">
        <div class="zakat-row-label">${rowNumber}.</div>
        <div class="zakat-name-wrapper" style="position:relative;flex:1;min-width:0;">
          <input type="text" class="field-input zakat-muzaki-sheet-name" 
                 placeholder="Nama Muzaki ${rowNumber}" 
                 value="${escapeHtml(nameValue)}" 
                 data-index="${i}"
                 list="sheet-suggest-muzaki-${i}"
                 autocomplete="off"
                 style="width:100%;${isDeleted ? "text-decoration:line-through;" : ""}"
                 ${isCompleted || isDeleted ? "disabled" : ""}>
          <datalist id="sheet-suggest-muzaki-${i}">
            ${availableNames
              .map(function (n) {
                return '<option value="' + escapeHtml(n) + '">';
              })
              .join("")}
          </datalist>
          ${existing.nama ? '<span class="zakat-name-badge">✓</span>' : ""}
          ${isDeleted ? '<span class="zakat-deleted-badge" style="color:var(--neg);font-size:10px;font-weight:700;margin-left:4px;">\uD83D\uDDD1\uFE0F</span>' : ""}
        </div>
        <div class="zakat-nominal-wrapper" style="flex-shrink:0;">
          <span class="zakat-nominal-label">Rp</span>
          <input type="number" class="field-input zakat-muzaki-sheet-nominal" 
                 placeholder="0" 
                 value="${existing.nominal || ""}" 
                 data-index="${i}" 
                 min="0" step="1000"
                 style="${isDeleted ? "text-decoration:line-through;" : ""}"
                 ${isCompleted || isDeleted ? "disabled" : ""}>
        </div>
        <div class="zakat-actions-wrapper" style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
          ${deleteBtnHtml}
          ${undeleteBtnHtml}
          ${lockHtml}
        </div>
      </div>
    `);
  }

  container.innerHTML = rows.join("");

  container.querySelectorAll(".zakat-row-delete-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var muzakiId = this.dataset.muzakiId;
      var zakatId = state.zakat.currentId;
      if (muzakiId && zakatId) {
        showMarkMuzakiConfirm(zakatId, muzakiId);
      }
    });
  });

  container.querySelectorAll(".zakat-row-undelete-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var muzakiId = this.dataset.muzakiId;
      var zakat = getZakatById(state.zakat.currentId);
      if (zakat && muzakiId) {
        var muzaki = zakat.muzaki.find(function (m) {
          return m.id === muzakiId;
        });
        if (muzaki) {
          delete muzaki._deleted;
          renderMuzakiSheetRows(zakat);
          updateMuzakiSheetTotal(zakat);
          showToast("Penghapusan dibatalkan.", "info");
        }
      }
    });
  });

  container
    .querySelectorAll(".zakat-muzaki-sheet-name")
    .forEach(function (input) {
      if (!isCompleted) {
        input.addEventListener("blur", function () {
          var row = this.closest(".zakat-muzaki-row");
          if (!row) return;

          var name = this.value.trim();
          var master = getMasterMuzakiByName(name);
          var masterId = master ? master.id : "";

          if (master && masterId) {
            row.dataset.muzakiId = masterId;
          }

          updateMuzakiSheetTotal(zakat);
        });
      }
    });

  container
    .querySelectorAll(".zakat-muzaki-sheet-nominal")
    .forEach(function (input) {
      if (!isCompleted) {
        input.addEventListener("input", function () {
          updateMuzakiSheetTotal(zakat);
        });
      }
    });

  var submitBtn = document.getElementById("zakatMuzakiSheetSubmit");
  if (submitBtn) {
    submitBtn.disabled = isCompleted;
    submitBtn.style.opacity = isCompleted ? "0.5" : "1";
  }

  countInput.disabled = isCompleted;
  countInput.style.opacity = isCompleted ? "0.5" : "1";

  updateMuzakiSheetTotal(zakat);
}

function updateMuzakiSheetTotal(zakat) {
  var container = document.getElementById("zakatMuzakiSheetList");
  var totalEl = document.getElementById("zakatMuzakiSheetTotal");
  var countInput = document.getElementById("zakatMuzakiSheetCount");

  if (!container || !totalEl) return;

  var total = 0;
  var activeCount = 0;

  container
    .querySelectorAll(".zakat-muzaki-sheet-nominal")
    .forEach(function (input) {
      var row = input.closest(".zakat-muzaki-row");
      if (row) {
        var isDeleted = row.classList.contains("deleted");
        if (!isDeleted) {
          var val = Number(input.value) || 0;
          total += val;
          activeCount++;
        }
      }
    });

  totalEl.textContent = fmtRp(total);

  if (countInput) {
    var currentCount = Math.max(activeCount || 1, 1);
    if (Number(countInput.value) !== currentCount) {
      countInput.value = currentCount;
    }
  }
}

function applyMuzakiSheetCount() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  syncMuzakiSheetRowsToData(zakat);

  var countInput = document.getElementById("zakatMuzakiSheetCount");
  if (!countInput) return;

  var newCount = parseInt(countInput.value) || 1;
  newCount = Math.max(1, Math.min(20, newCount));
  countInput.value = newCount;

  var activeMuzaki = zakat.muzaki.filter(function (m) {
    return m._deleted !== true;
  });

  while (activeMuzaki.length < newCount) {
    activeMuzaki.push({
      id: "",
      nama: "",
      nominal: 0,
    });
  }

  var deletedMuzaki = zakat.muzaki.filter(function (m) {
    return m._deleted === true;
  });

  zakat.muzaki = activeMuzaki.concat(deletedMuzaki);

  renderMuzakiSheetRows(zakat);
  updateMuzakiSheetTotal(zakat);
  showToast("Jumlah muzaki diterapkan: " + newCount, "info");
}

function syncMuzakiSheetRowsToData(zakat) {
  var container = document.getElementById("zakatMuzakiSheetList");
  if (!container) {
    return { success: false, error: "Container not found" };
  }

  var rows = container.querySelectorAll(".zakat-muzaki-row");
  var processedIds = new Set();
  var updatedMuzaki = [];
  var deletedIds = [];

  rows.forEach(function (row) {
    var nameInput = row.querySelector(".zakat-muzaki-sheet-name");
    var nominalInput = row.querySelector(".zakat-muzaki-sheet-nominal");
    var muzakiId = row.dataset.muzakiId || "";

    var name = nameInput ? nameInput.value.trim() : "";
    var nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;

    var isDeleted = row.classList.contains("deleted");

    if (!name && nominal === 0 && !muzakiId) {
      return;
    }

    var existing = null;
    if (muzakiId) {
      existing = zakat.muzaki.find(function (m) {
        return m.id === muzakiId;
      });
    }

    if (isDeleted && existing) {
      existing._deleted = true;
      deletedIds.push(muzakiId);
      processedIds.add(muzakiId);
      return;
    }

    var master = null;
    if (name) {
      master = getMasterMuzakiByName(name);
    }

    var finalId = muzakiId;
    if (master && master.id) {
      finalId = master.id;
    }

    if (existing) {
      existing.nama = name || existing.nama;
      existing.nominal = nominal;
      existing._deleted = false;
      if (finalId && finalId !== existing.id) {
        existing.id = finalId;
      }
      processedIds.add(existing.id);
      updatedMuzaki.push(existing);
    } else {
      var newMuzaki = {
        id: finalId || "",
        nama: name || "Muzaki " + (updatedMuzaki.length + 1),
        nominal: nominal,
        _new: true,
      };
      processedIds.add(newMuzaki.id);
      updatedMuzaki.push(newMuzaki);
    }
  });

  var preservedMuzaki = zakat.muzaki.filter(function (m) {
    return m._deleted !== true && !processedIds.has(m.id);
  });

  var finalMuzaki = preservedMuzaki.concat(updatedMuzaki);
  finalMuzaki = finalMuzaki.filter(function (m) {
    return m._deleted !== true;
  });

  var seenIds = new Set();
  finalMuzaki = finalMuzaki.filter(function (m) {
    if (!m.id) return true;
    if (seenIds.has(m.id)) {
      return false;
    }
    seenIds.add(m.id);
    return true;
  });

  zakat.muzaki = finalMuzaki;

  var total = zakat.muzaki.reduce(function (sum, m) {
    return sum + (m.nominal || 0);
  }, 0);
  zakat.total = total;

  return {
    success: true,
    deletedIds: deletedIds,
    total: total,
    count: zakat.muzaki.length,
  };
}

function deleteMuzakiSheetRow(idx) {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) return;

  syncMuzakiSheetRowsToData(zakat);

  if (!zakat.muzaki || zakat.muzaki.length <= 1) {
    showToast("Minimal harus ada 1 Muzaki.", "warning");
    return;
  }

  zakat.muzaki.splice(idx, 1);

  var countInput = document.getElementById("zakatMuzakiSheetCount");
  if (countInput) countInput.value = zakat.muzaki.length;

  renderMuzakiSheetRows(zakat);
  updateMuzakiSheetTotal(zakat);
  showToast("Baris muzaki dihapus.", "info");
}

async function submitZakatMuzakiSheet() {
  if (isSubmittingMuzaki) {
    showToast("Proses sedang berjalan, harap tunggu...", "warning");
    return;
  }

  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  if (isZakatCompleted(zakat)) {
    showToast("Tidak dapat mengedit. Zakat sudah selesai.", "error");
    return;
  }

  var btn = document.getElementById("zakatMuzakiSheetSubmit");
  if (!btn) {
    showToast("Tombol submit tidak ditemukan.", "error");
    return;
  }

  isSubmittingMuzaki = true;
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    var syncResult = syncMuzakiSheetRowsToData(zakat);
    if (!syncResult || !syncResult.success) {
      showToast("Gagal menyinkronkan data dari sheet.", "error");
      return;
    }

    var nameMap = new Map();
    var hasDuplicate = false;
    var duplicateNames = [];

    zakat.muzaki.forEach(function (m) {
      if (m._deleted !== true && m.nama) {
        var key = m.nama.toLowerCase().trim();
        if (nameMap.has(key)) {
          hasDuplicate = true;
          duplicateNames.push(m.nama);
        } else {
          nameMap.set(key, m.id);
        }
      }
    });

    if (hasDuplicate) {
      showToast(
        "Ada nama yang sama: " +
          duplicateNames.join(", ") +
          "! Periksa kembali.",
        "error",
      );
      return;
    }

    var idx = state.zakat.list.findIndex(function (z) {
      return z.id === zakat.id;
    });
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    showZakatLoader("Menyimpan data muzaki...");

    var cleanMuzaki = zakat.muzaki.map(function (m) {
      return {
        id: m.id || "",
        nama: m.nama || "",
        nominal: m.nominal || 0,
      };
    });

    var result = await apiUpdateZakatMuzaki({
      id: zakat.id,
      muzaki: cleanMuzaki,
      total: zakat.total,
    });

    if (result && result.success) {
      showToast("Muzaki berhasil disimpan!", "success");
    } else {
      showToast("Muzaki disimpan (offline mode)", "warning");
    }

    renderZakatMuzakiView(zakat);
    var totalEl = document.getElementById("zakatDetailTotal");
    if (totalEl) totalEl.textContent = fmtRp(zakat.total);
    closeZakatMuzakiSheet();
    renderZakatList();
  } catch (err) {
    showToast("Gagal menyimpan muzaki: " + err.message, "error");
  } finally {
    isSubmittingMuzaki = false;
    hideZakatLoader();
    hideZakatButtonLoading(btn);
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
        Muzaki "<strong>${escapeHtml(muzaki.nama)}</strong>" (${fmtRp(muzaki.nominal)}) 
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

function openZakatMustahikSheet() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var overlay = document.getElementById("zakatMustahikSheet");
  if (!overlay) return;

  // Panggil render view untuk tab Mustahik
  renderZakatMustahikView(zakat);

  var mustahikList = zakat.mustahik || [];
  var activeMustahik = mustahikList.filter(function (m) {
    return m._deleted !== true;
  });

  if (activeMustahik.length === 0) {
    zakat.mustahik.push({
      id: "",
      nama: "",
      nominal: 0,
    });
  }

  var count = Math.max(activeMustahik.length || 1, 1);
  var countInput = document.getElementById("zakatMustahikSheetCount");
  if (countInput) countInput.value = count;

  renderMustahikSheetRows(zakat);
  updateMustahikSheetTotal(zakat);

  overlay.classList.remove("hidden");
}

function closeZakatMustahikSheet() {
  var overlay = document.getElementById("zakatMustahikSheet");
  if (overlay) overlay.classList.add("hidden");
}

function renderMustahikSheetRows(zakat) {
  var container = document.getElementById("zakatMustahikSheetList");
  var countInput = document.getElementById("zakatMustahikSheetCount");

  if (!container || !countInput) return;

  var mustahikList = zakat.mustahik || [];
  var activeMustahik = mustahikList.filter(function (m) {
    return m._deleted !== true;
  });

  if (activeMustahik.length === 0) {
    activeMustahik = [
      {
        id: "",
        nama: "",
        nominal: 0,
      },
    ];
  }

  var currentCount = Math.max(activeMustahik.length || 1, 1);
  countInput.value = currentCount;

  var allNames = loadMustahikSuggestions();
  var isCompleted = isZakatCompleted(zakat);

  var rows = [];
  for (var i = 0; i < activeMustahik.length; i++) {
    var existing = activeMustahik[i];
    var rowNumber = i + 1;
    var mustahikId = existing.id || "";
    var isDeleted = existing._deleted === true;

    var rowClass = isDeleted ? "zakat-muzaki-row deleted" : "zakat-muzaki-row";
    var nameValue = isDeleted
      ? existing.nama + " (akan dihapus)"
      : existing.nama || "";

    var master = getMasterMustahikById(mustahikId);
    var isFromMaster = master !== null;

    var usedNames = [];
    for (var j = 0; j < activeMustahik.length; j++) {
      var m = activeMustahik[j];
      if (m.id !== existing.id && m._deleted !== true && m.nama) {
        usedNames.push(m.nama.toLowerCase().trim());
      }
    }

    var availableNames = allNames.filter(function (n) {
      var lower = n.toLowerCase().trim();
      return usedNames.indexOf(lower) === -1;
    });

    if (nameValue && !isFromMaster) {
      var isInSuggestions = allNames.indexOf(nameValue) !== -1;
      if (!isInSuggestions) {
        availableNames.push(nameValue);
        availableNames.sort();
      }
    }

    var deleteBtnHtml = "";
    if (!isCompleted && !isDeleted && mustahikId) {
      deleteBtnHtml = `
        <button type="button" class="zakat-row-delete-btn" data-mustahik-id="${mustahikId}" data-index="${i}" title="Hapus Mustahik ${rowNumber}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>
          </svg>
        </button>
      `;
    }

    var undeleteBtnHtml = "";
    if (isDeleted) {
      undeleteBtnHtml = `
        <button type="button" class="zakat-row-undelete-btn" data-mustahik-id="${mustahikId}" data-index="${i}" title="Batalkan penghapusan">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 5v5h5"/>
            <path d="M12 8v4l3 2"/>
          </svg>
        </button>
      `;
    }

    var lockHtml = isCompleted
      ? '<span style="font-size:10px;color:var(--ink-faint);">\uD83D\uDD12</span>'
      : "";

    rows.push(`
      <div class="${rowClass}" data-sheet-index="${i}" data-mustahik-id="${mustahikId}" style="${isDeleted ? "opacity:0.5;background:var(--neg-soft);" : ""}">
        <div class="zakat-row-label">${rowNumber}.</div>
        <div class="zakat-name-wrapper" style="position:relative;flex:1;min-width:0;">
          <input type="text" class="field-input zakat-mustahik-sheet-name" 
                 placeholder="Nama Mustahik ${rowNumber}" 
                 value="${escapeHtml(nameValue)}" 
                 data-index="${i}"
                 list="sheet-suggest-mustahik-${i}"
                 autocomplete="off"
                 style="width:100%;${isDeleted ? "text-decoration:line-through;" : ""}"
                 ${isCompleted || isDeleted ? "disabled" : ""}>
          <datalist id="sheet-suggest-mustahik-${i}">
            ${availableNames
              .map(function (n) {
                return '<option value="' + escapeHtml(n) + '">';
              })
              .join("")}
          </datalist>
          ${existing.nama ? '<span class="zakat-name-badge">✓</span>' : ""}
          ${isDeleted ? '<span class="zakat-deleted-badge" style="color:var(--neg);font-size:10px;font-weight:700;margin-left:4px;">\uD83D\uDDD1\uFE0F</span>' : ""}
        </div>
        <div class="zakat-nominal-wrapper" style="flex-shrink:0;">
          <span class="zakat-nominal-label">Rp</span>
          <input type="number" class="field-input zakat-mustahik-sheet-nominal" 
                 placeholder="0" 
                 value="${existing.nominal || ""}" 
                 data-index="${i}" 
                 min="0" step="1000"
                 style="${isDeleted ? "text-decoration:line-through;" : ""}"
                 ${isCompleted || isDeleted ? "disabled" : ""}>
        </div>
        <div class="zakat-actions-wrapper" style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
          ${deleteBtnHtml}
          ${undeleteBtnHtml}
          ${lockHtml}
        </div>
      </div>
    `);
  }

  if (activeMustahik.length === 0) {
    rows.push(`
      <div class="zakat-muzaki-row" data-sheet-index="0" style="padding:12px 0;text-align:center;color:var(--ink-faint);font-size:12px;">
        Belum ada data mustahik. Klik "Terapkan" untuk menambah.
      </div>
    `);
  }

  container.innerHTML = rows.join("");

  container.querySelectorAll(".zakat-row-delete-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var mustahikId = this.dataset.mustahikId;
      var zakatId = state.zakat.currentId;
      if (mustahikId && zakatId) {
        showMarkMustahikConfirm(zakatId, mustahikId);
      }
    });
  });

  container.querySelectorAll(".zakat-row-undelete-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var mustahikId = this.dataset.mustahikId;
      var zakat = getZakatById(state.zakat.currentId);
      if (zakat && mustahikId) {
        var mustahik = zakat.mustahik.find(function (m) {
          return m.id === mustahikId;
        });
        if (mustahik) {
          delete mustahik._deleted;
          renderMustahikSheetRows(zakat);
          updateMustahikSheetTotal(zakat);
          showToast("Penghapusan dibatalkan.", "info");
        }
      }
    });
  });

  container
    .querySelectorAll(".zakat-mustahik-sheet-name")
    .forEach(function (input) {
      if (!isCompleted) {
        input.addEventListener("blur", function () {
          var row = this.closest(".zakat-muzaki-row");
          if (!row) return;

          var name = this.value.trim();
          var master = getMasterMustahikByName(name);
          var masterId = master ? master.id : "";

          if (master && masterId) {
            row.dataset.mustahikId = masterId;
          }

          updateMustahikSheetTotal(zakat);
        });
      }
    });

  container
    .querySelectorAll(".zakat-mustahik-sheet-nominal")
    .forEach(function (input) {
      if (!isCompleted) {
        input.addEventListener("input", function () {
          updateMustahikSheetTotal(zakat);
        });
      }
    });

  var submitBtn = document.getElementById("zakatMustahikSheetSubmit");
  if (submitBtn) {
    submitBtn.disabled = isCompleted;
    submitBtn.style.opacity = isCompleted ? "0.5" : "1";
  }

  if (isCompleted) {
    countInput.disabled = true;
    countInput.style.opacity = "0.5";
  } else {
    countInput.disabled = false;
    countInput.style.opacity = "1";
  }

  updateMustahikSheetTotal(zakat);
}

function updateMustahikSheetTotal(zakat) {
  var container = document.getElementById("zakatMustahikSheetList");
  var totalEl = document.getElementById("zakatMustahikSheetTotal");
  var danaEl = document.getElementById("zakatMustahikSheetDana");
  var dialokasikanEl = document.getElementById(
    "zakatMustahikSheetDialokasikan",
  );
  var sisaEl = document.getElementById("zakatMustahikSheetSisa");
  var statusEl = document.getElementById("zakatMustahikSheetStatus");
  var progressEl = document.getElementById("zakatMustahikSheetProgress");
  var progressLabelEl = document.getElementById(
    "zakatMustahikSheetProgressLabel",
  );
  var countInput = document.getElementById("zakatMustahikSheetCount");

  if (!container) return;

  var total = 0;
  var activeCount = 0;

  container
    .querySelectorAll(".zakat-mustahik-sheet-nominal")
    .forEach(function (input) {
      var row = input.closest(".zakat-muzaki-row");
      if (row) {
        var isDeleted = row.classList.contains("deleted");
        if (!isDeleted) {
          var val = Number(input.value) || 0;
          total += val;
          activeCount++;
        }
      }
    });

  if (countInput) {
    var currentCount = Math.max(activeCount || 1, 1);
    countInput.value = currentCount;
  }

  var r = zakat.rincian || {};
  var mustahikData = r.mustahik || {
    persen: 45,
    nominal: 0,
    kelompok: { persen: 80, nominal: 0 },
  };

  var danaMustahik =
    (mustahikData.kelompok && mustahikData.kelompok.nominal) || 0;

  if (danaMustahik === 0) {
    danaMustahik = mustahikData.nominal || 0;
  }

  var sisa = Math.max(0, danaMustahik - total);
  var progress = danaMustahik > 0 ? (total / danaMustahik) * 100 : 0;

  if (totalEl) {
    totalEl.textContent = fmtRp(total);
    totalEl.style.color = "var(--brand)";
  }

  if (danaEl) {
    danaEl.textContent = fmtRp(danaMustahik);
    danaEl.style.color = danaMustahik > 0 ? "var(--brand)" : "var(--ink-faint)";
  }

  if (dialokasikanEl) {
    dialokasikanEl.textContent = fmtRp(total);
    dialokasikanEl.style.color = total > 0 ? "var(--pos)" : "var(--ink-soft)";
  }

  if (sisaEl) {
    sisaEl.textContent = fmtRp(sisa);
    sisaEl.style.color = sisa > 0 ? "var(--pos)" : "var(--ink-soft)";
  }

  if (statusEl) {
    if (danaMustahik === 0) {
      statusEl.textContent = "\u25CF Belum diatur";
      statusEl.style.color = "var(--ink-faint)";
      statusEl.style.background = "var(--surface-alt)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    } else if (total === 0) {
      statusEl.textContent = "\u26A0\uFE0F Belum ada alokasi";
      statusEl.style.color = "var(--gold)";
      statusEl.style.background = "var(--gold-soft)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    } else if (total === danaMustahik) {
      statusEl.textContent = "\u2713 Seimbang";
      statusEl.style.color = "var(--pos)";
      statusEl.style.background = "var(--pos-soft)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    } else if (total < danaMustahik) {
      statusEl.textContent =
        "\u26A0\uFE0F Kurang " + fmtRp(danaMustahik - total);
      statusEl.style.color = "var(--gold)";
      statusEl.style.background = "var(--gold-soft)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    } else {
      statusEl.textContent =
        "\u26A0\uFE0F Kelebihan " + fmtRp(total - danaMustahik);
      statusEl.style.color = "var(--neg)";
      statusEl.style.background = "var(--neg-soft)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    }
  }

  if (progressEl) {
    var clampedProgress = Math.min(100, Math.max(0, progress));
    progressEl.style.width = clampedProgress + "%";
    progressEl.style.background =
      clampedProgress >= 100
        ? "var(--pos)"
        : clampedProgress > 0
          ? "var(--brand)"
          : "var(--brand)";
  }

  if (progressLabelEl) {
    var roundedProgress = Math.round(progress);
    progressLabelEl.textContent = roundedProgress + "%";
    progressLabelEl.style.color =
      roundedProgress >= 100
        ? "var(--pos)"
        : roundedProgress > 0
          ? "var(--ink-soft)"
          : "var(--ink-faint)";
  }
}

function applyMustahikSheetCount() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  syncMustahikSheetRowsToData(zakat);

  var countInput = document.getElementById("zakatMustahikSheetCount");
  var newCount = parseInt(countInput.value) || 1;
  newCount = Math.max(1, Math.min(20, newCount));
  countInput.value = newCount;

  var activeMustahik = zakat.mustahik.filter(function (m) {
    return m._deleted !== true;
  });

  while (activeMustahik.length < newCount) {
    activeMustahik.push({
      id: "",
      nama: "",
      nominal: 0,
    });
  }

  var deletedMustahik = zakat.mustahik.filter(function (m) {
    return m._deleted === true;
  });
  zakat.mustahik = activeMustahik.concat(deletedMustahik);

  renderMustahikSheetRows(zakat);
  updateMustahikSheetTotal(zakat);
  showToast("Jumlah mustahik diterapkan: " + newCount, "info");
}

function syncMustahikSheetRowsToData(zakat) {
  var container = document.getElementById("zakatMustahikSheetList");
  if (!container) return;

  var rows = container.querySelectorAll(".zakat-muzaki-row");
  var processedIds = new Set();
  var updatedMustahik = [];
  var deletedIds = [];

  rows.forEach(function (row) {
    var nameInput = row.querySelector(".zakat-mustahik-sheet-name");
    var nominalInput = row.querySelector(".zakat-mustahik-sheet-nominal");
    var mustahikId = row.dataset.mustahikId || "";

    var name = nameInput ? nameInput.value.trim() : "";
    var nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;

    var isDeleted = row.classList.contains("deleted");

    if (!name && nominal === 0 && !mustahikId) {
      return;
    }

    var existing = null;
    if (mustahikId) {
      existing = zakat.mustahik.find(function (m) {
        return m.id === mustahikId;
      });
    }

    if (isDeleted && existing) {
      existing._deleted = true;
      deletedIds.push(mustahikId);
      processedIds.add(mustahikId);
      return;
    }

    var master = null;
    if (name) {
      master = getMasterMustahikByName(name);
    }

    var finalId = mustahikId;
    if (master && master.id) {
      finalId = master.id;
    }

    if (existing) {
      existing.nama = name || existing.nama;
      existing.nominal = nominal;
      existing._deleted = false;
      if (finalId && finalId !== existing.id) {
        existing.id = finalId;
      }
      processedIds.add(existing.id);
      updatedMustahik.push(existing);
    } else {
      var newMustahik = {
        id: finalId || "",
        nama: name || "Mustahik " + (updatedMustahik.length + 1),
        nominal: nominal,
        _new: true,
      };
      processedIds.add(newMustahik.id);
      updatedMustahik.push(newMustahik);
    }
  });

  var preservedMustahik = zakat.mustahik.filter(function (m) {
    return m._deleted !== true && !processedIds.has(m.id);
  });

  var finalMustahik = preservedMustahik.concat(updatedMustahik);
  finalMustahik = finalMustahik.filter(function (m) {
    return m._deleted !== true;
  });

  var seenIds = new Set();
  finalMustahik = finalMustahik.filter(function (m) {
    if (!m.id) return true;
    if (seenIds.has(m.id)) {
      return false;
    }
    seenIds.add(m.id);
    return true;
  });

  zakat.mustahik = finalMustahik;

  return {
    success: true,
    deletedIds: deletedIds,
    count: zakat.mustahik.length,
  };
}

function deleteMustahikSheetRow(idx) {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) return;

  syncMustahikSheetRowsToData(zakat);

  if (!zakat.mustahik || zakat.mustahik.length <= 1) {
    showToast("Minimal harus ada 1 Mustahik.", "warning");
    return;
  }

  zakat.mustahik.splice(idx, 1);

  var countInput = document.getElementById("zakatMustahikSheetCount");
  if (countInput) countInput.value = zakat.mustahik.length;

  renderMustahikSheetRows(zakat);
  updateMustahikSheetTotal(zakat);
  showToast("Baris mustahik dihapus.", "info");
}

async function submitZakatMustahikSheet() {
  if (isSubmittingMustahik) {
    showToast("Proses sedang berjalan, harap tunggu...", "warning");
    return;
  }

  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  if (isZakatCompleted(zakat)) {
    showToast("Tidak dapat mengedit. Zakat sudah selesai.", "error");
    return;
  }

  var container = document.getElementById("zakatMustahikSheetList");
  var btn = document.getElementById("zakatMustahikSheetSubmit");

  if (!container || !btn) {
    showToast("Elemen sheet tidak ditemukan.", "error");
    return;
  }

  isSubmittingMustahik = true;
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    var syncResult = syncMustahikSheetRowsToData(zakat);
    if (!syncResult || !syncResult.success) {
      showToast("Gagal menyinkronkan data dari sheet.", "error");
      return;
    }

    var nameMap = new Map();
    var hasDuplicate = false;
    var duplicateNames = [];

    zakat.mustahik.forEach(function (m) {
      if (m._deleted !== true && m.nama) {
        var key = m.nama.toLowerCase().trim();
        if (nameMap.has(key)) {
          hasDuplicate = true;
          duplicateNames.push(m.nama);
        } else {
          nameMap.set(key, m.id);
        }
      }
    });

    if (hasDuplicate) {
      showToast(
        "Ada nama yang sama: " +
          duplicateNames.join(", ") +
          "! Periksa kembali.",
        "error",
      );
      return;
    }

    var idx = state.zakat.list.findIndex(function (z) {
      return z.id === zakat.id;
    });
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    showZakatLoader("Menyimpan data mustahik...");

    var cleanMustahik = zakat.mustahik.map(function (m) {
      return {
        id: m.id || "",
        nama: m.nama || "",
        nominal: m.nominal || 0,
      };
    });

    var result = await apiUpdateZakatMustahik({
      id: zakat.id,
      mustahik: cleanMustahik,
    });

    if (result.success) {
      showToast("Mustahik berhasil disimpan!", "success");
    } else {
      showToast("Mustahik disimpan (offline mode)", "warning");
    }

    // Refresh view setelah submit
    renderZakatMustahikView(zakat);
    renderZakatMustahikView(zakat);
    closeZakatMustahikSheet();
    renderZakatList();
  } catch (err) {
    showToast("Gagal menyimpan mustahik: " + err.message, "error");
  } finally {
    isSubmittingMustahik = false;
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
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
        akan ditandai untuk dihapus dari zakat "<strong>${escapeHtml(zakat.title)}</strong>".
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

function openZakatRincianSheet() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var overlay = document.getElementById("zakatRincianSheet");
  if (!overlay) return;

  var r = zakat.rincian || {};
  var mustahik = r.mustahik || {
    persen: 45,
    kelompok: { persen: 80 },
    daerah: { persen: 20 },
  };
  var sabilillah = r.sabilillah || { persen: 40 };
  var amil = r.amil || {
    persen: 15,
    kelompok: { persen: 12 },
    desa: { persen: 2 },
    daerah: { persen: 1 },
  };

  setValueIfExists("zakatPersenMustahikSheet", mustahik.persen || 45);
  setValueIfExists(
    "zakatPersenMustahikKelompokSheet",
    mustahik.kelompok?.persen || 80,
  );
  setValueIfExists(
    "zakatPersenMustahikDaerahSheet",
    mustahik.daerah?.persen || 20,
  );
  setValueIfExists("zakatPersenSabilillahSheet", sabilillah.persen || 40);
  setValueIfExists("zakatPersenAmilSheet", amil.persen || 15);
  setValueIfExists("zakatPersenAmilKelompokSheet", amil.kelompok?.persen || 12);
  setValueIfExists("zakatPersenAmilDesaSheet", amil.desa?.persen || 2);
  setValueIfExists("zakatPersenAmilDaerahSheet", amil.daerah?.persen || 1);

  updateRincianSheet(zakat);

  overlay.classList.remove("hidden");
}

function closeZakatRincianSheet() {
  var overlay = document.getElementById("zakatRincianSheet");
  if (overlay) overlay.classList.add("hidden");
}

function updateRincianSheet(zakat) {
  var totalZakat = zakat.total || 0;

  var getVal = function (id) {
    var el = document.getElementById(id);
    return el ? Number(el.value) || 0 : 0;
  };

  var setNominal = function (id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = fmtRp(value);
      el.style.color = value > 0 ? "var(--brand)" : "var(--ink-faint)";
    }
  };

  var pMustahik = getVal("zakatPersenMustahikSheet");
  var pSabilillah = getVal("zakatPersenSabilillahSheet");
  var pAmil = getVal("zakatPersenAmilSheet");

  var pKelompok = getVal("zakatPersenMustahikKelompokSheet");
  var pDaerah = getVal("zakatPersenMustahikDaerahSheet");
  var pAmilKelompok = getVal("zakatPersenAmilKelompokSheet");
  var pAmilDesa = getVal("zakatPersenAmilDesaSheet");
  var pAmilDaerah = getVal("zakatPersenAmilDaerahSheet");

  // Hitung nominal
  var mustahikNominal = Math.round((totalZakat * pMustahik) / 100);
  var sabilillahNominal = Math.round((totalZakat * pSabilillah) / 100);
  var amilNominal = Math.round((totalZakat * pAmil) / 100);

  var mustahikKelompokNominal = Math.round((mustahikNominal * pKelompok) / 100);
  var mustahikDaerahNominal = Math.round((mustahikNominal * pDaerah) / 100);

  var amilKelompokNominal = Math.round((amilNominal * pAmilKelompok) / 100);
  var amilDesaNominal = Math.round((amilNominal * pAmilDesa) / 100);
  var amilDaerahNominal = Math.round((amilNominal * pAmilDaerah) / 100);

  // Tampilkan nominal di samping input
  setNominal("zakatNominalMustahikSheet", mustahikNominal);
  setNominal("zakatNominalSabilillahSheet", sabilillahNominal);
  setNominal("zakatNominalAmilSheet", amilNominal);
  setNominal("zakatNominalMustahikKelompokSheet", mustahikKelompokNominal);
  setNominal("zakatNominalMustahikDaerahSheet", mustahikDaerahNominal);
  setNominal("zakatNominalAmilKelompokSheet", amilKelompokNominal);
  setNominal("zakatNominalAmilDesaSheet", amilDesaNominal);
  setNominal("zakatNominalAmilDaerahSheet", amilDaerahNominal);

  // Validasi subtotal
  var mustahikSub = pKelompok + pDaerah;
  var mustahikSubEl = document.getElementById("zakatMustahikSubTotalSheet");
  if (mustahikSubEl) {
    mustahikSubEl.textContent =
      "Subtotal: " + pKelompok + "% + " + pDaerah + "% = " + mustahikSub + "%";
    mustahikSubEl.className =
      "zakat-rincian-sub-total " + (mustahikSub === 100 ? "valid" : "invalid");
  }

  var amilSub = pAmilKelompok + pAmilDesa + pAmilDaerah;
  var amilSubEl = document.getElementById("zakatAmilSubTotalSheet");
  if (amilSubEl) {
    amilSubEl.textContent =
      "Subtotal: " +
      pAmilKelompok +
      "% + " +
      pAmilDesa +
      "% + " +
      pAmilDaerah +
      "% = " +
      amilSub +
      "%";
    amilSubEl.className =
      "zakat-rincian-sub-total " + (amilSub === pAmil ? "valid" : "invalid");
  }

  // Total persentase
  var totalPersen = pMustahik + pSabilillah + pAmil;
  var totalEl = document.getElementById("zakatTotalPersenSheet");
  if (totalEl) {
    totalEl.textContent = totalPersen + "%";
    totalEl.style.color = totalPersen === 100 ? "var(--pos)" : "var(--neg)";
  }

  // Total nominal
  var nominalEl = document.getElementById("zakatTotalNominalSheet");
  if (nominalEl) {
    if (totalPersen === 100) {
      var totalNominal = mustahikNominal + sabilillahNominal + amilNominal;
      nominalEl.textContent = fmtRp(totalNominal);
      nominalEl.style.color = "var(--brand)";
    } else {
      nominalEl.textContent = "⚠️ Harus 100%";
      nominalEl.style.color = "var(--neg)";
    }
  }

  // Status
  var statusEl = document.getElementById("zakatRincianStatusSheet");
  if (statusEl) {
    if (totalZakat === 0) {
      statusEl.textContent = "● Total Rp 0";
      statusEl.style.color = "var(--ink-faint)";
    } else if (totalPersen === 100) {
      statusEl.textContent = "✓ Seimbang";
      statusEl.style.color = "var(--pos)";
    } else if (totalPersen < 100) {
      statusEl.textContent = "⚠️ Kurang " + (100 - totalPersen) + "%";
      statusEl.style.color = "var(--gold)";
    } else {
      statusEl.textContent = "⚠️ Kelebihan " + (totalPersen - 100) + "%";
      statusEl.style.color = "var(--neg)";
    }
  }

  // Preview nominal di bawah
  var previewNominal = function (id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = fmtRp(value);
      el.style.color = value > 0 ? "var(--pos)" : "var(--ink-faint)";
    }
  };

  previewNominal("zakatMustahikNominalPreview", mustahikNominal);
  previewNominal("zakatSabilillahNominalPreview", sabilillahNominal);
  previewNominal("zakatAmilNominalPreview", amilNominal);
}

function setValueIfExists(id, value) {
  var el = document.getElementById(id);
  if (el) {
    el.value = value;
  }
}

async function submitZakatRincianSheet() {
  if (isSubmittingRincian) {
    showToast("Proses sedang berjalan, harap tunggu...", "warning");
    return;
  }

  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  if (isZakatCompleted(zakat)) {
    showToast("Tidak dapat mengedit. Zakat sudah selesai.", "error");
    return;
  }

  var getVal = function (id) {
    return Number(document.getElementById(id)?.value || 0);
  };

  var mustahikPersen = getVal("zakatPersenMustahikSheet");
  var sabilillahPersen = getVal("zakatPersenSabilillahSheet");
  var amilPersen = getVal("zakatPersenAmilSheet");

  if (mustahikPersen + sabilillahPersen + amilPersen !== 100) {
    showToast("Total persentase harus 100%!", "error");
    return;
  }

  var mustahikKelompokPersen = getVal("zakatPersenMustahikKelompokSheet");
  var mustahikDaerahPersen = getVal("zakatPersenMustahikDaerahSheet");
  if (mustahikKelompokPersen + mustahikDaerahPersen !== 100) {
    showToast("Mustahik Kelompok + Daerah harus 100%!", "error");
    return;
  }

  var amilKelompokPersen = getVal("zakatPersenAmilKelompokSheet");
  var amilDesaPersen = getVal("zakatPersenAmilDesaSheet");
  var amilDaerahPersen = getVal("zakatPersenAmilDaerahSheet");
  if (amilKelompokPersen + amilDesaPersen + amilDaerahPersen !== amilPersen) {
    showToast(
      "Amil Kelompok + Desa + Daerah harus sama dengan persentase Amil!",
      "error",
    );
    return;
  }

  var btn = document.getElementById("zakatRincianSheetSubmit");
  isSubmittingRincian = true;
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    var totalZakat = zakat.total || 0;

    var mustahikNominal = Math.round((totalZakat * mustahikPersen) / 100);
    var sabilillahNominal = Math.round((totalZakat * sabilillahPersen) / 100);
    var amilNominal = Math.round((totalZakat * amilPersen) / 100);

    var mustahikKelompokNominal = Math.round(
      (mustahikNominal * mustahikKelompokPersen) / 100,
    );
    var mustahikDaerahNominal = Math.round(
      (mustahikNominal * mustahikDaerahPersen) / 100,
    );

    var amilKelompokNominal = Math.round(
      (amilNominal * amilKelompokPersen) / 100,
    );
    var amilDesaNominal = Math.round((amilNominal * amilDesaPersen) / 100);
    var amilDaerahNominal = Math.round((amilNominal * amilDaerahPersen) / 100);

    zakat.rincian = sanitizeZakatRincian({
      mustahik: {
        persen: mustahikPersen,
        nominal: mustahikNominal,
        kelompok: {
          persen: mustahikKelompokPersen,
          nominal: mustahikKelompokNominal,
        },
        daerah: {
          persen: mustahikDaerahPersen,
          nominal: mustahikDaerahNominal,
        },
      },
      sabilillah: {
        persen: sabilillahPersen,
        nominal: sabilillahNominal,
      },
      amil: {
        persen: amilPersen,
        nominal: amilNominal,
        kelompok: {
          persen: amilKelompokPersen,
          nominal: amilKelompokNominal,
        },
        desa: {
          persen: amilDesaPersen,
          nominal: amilDesaNominal,
        },
        daerah: {
          persen: amilDaerahPersen,
          nominal: amilDaerahNominal,
        },
      },
    });
    zakat.updatedAt = new Date().toISOString();
    zakat.updatedAt = new Date().toISOString();

    var idx = state.zakat.list.findIndex(function (z) {
      return z.id === zakat.id;
    });
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    showZakatLoader("Menyimpan rincian zakat...");
    var result = await apiUpdateZakatRincian({
      id: zakat.id,
      rincian: zakat.rincian,
    });

    if (result.success) {
      showToast("Rincian berhasil disimpan!", "success");
    } else {
      showToast("Rincian disimpan (offline mode)", "warning");
    }

    renderZakatRincianView(zakat);
    closeZakatRincianSheet();
    renderZakatList();
  } catch (err) {
    showToast("Gagal menyimpan rincian", "error");
  } finally {
    isSubmittingRincian = false;
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
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
