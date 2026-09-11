var pendingMuzakiCount = 1;
var pendingMustahikCount = 1;

const ZAKAT_JENIS_ORDER = [
  "ZAKAT FITRAH",
  "ZAKAT MAAL",
  "ZAKAT TIJAROH",
  "ZAKAT ZURU'",
  "ZAKAT TERNAK",
  "LAINNYA",
];

const ZAKAT_JENIS_LABEL = {
  "ZAKAT FITRAH": "Zakat Fitrah",
  "ZAKAT MAAL": "Zakat Maal",
  "ZAKAT TIJAROH": "Zakat Tijaroh",
  "ZAKAT ZURU'": "Zakat Zuru'",
  "ZAKAT TERNAK": "Zakat Ternak",
  LAINNYA: "Lainnya",
};

function normalizeJenisZakat(jenis) {
  var j = String(jenis || "")
    .toUpperCase()
    .trim();
  if (ZAKAT_JENIS_ORDER.indexOf(j) !== -1 && j !== "LAINNYA") return j;
  return "LAINNYA";
}

function getJenisZakatLabel(jenis) {
  return ZAKAT_JENIS_LABEL[jenis] || jenis;
}

function getMaxSheetIndex(list) {
  var maxIndex = 0;
  (list || []).forEach(function (item) {
    if (typeof item._sheetIndex === "number" && item._sheetIndex > maxIndex) {
      maxIndex = item._sheetIndex;
    }
  });
  return maxIndex;
}

function ensureSheetIndexes(list) {
  var maxIndex = getMaxSheetIndex(list);
  list.forEach(function (item) {
    if (typeof item._sheetIndex !== "number") {
      maxIndex += 1;
      item._sheetIndex = maxIndex;
    }
  });
  return maxIndex;
}

function createNewSheetRow(nextIndex, jenis) {
  return {
    id: "",
    nama: "",
    nominal: 0,
    jenis_zakat: jenis || "",
    jumlah_anggota_keluarga: 0,
    _sheetIndex: nextIndex,
    _new: true,
  };
}

function getSortedMuzakiForSheet(zakat) {
  var list = zakat.muzaki || [];
  if (list.length === 0) {
    list.push({
      id: "",
      nama: "",
      nominal: 0,
      jenis_zakat: "",
      jumlah_anggota_keluarga: 0,
      _sheetIndex: 1,
    });
    zakat.muzaki = list;
  }
  ensureSheetIndexes(list);
  return list.slice().sort(function (a, b) {
    return a._sheetIndex - b._sheetIndex;
  });
}

function getSortedMustahikForSheet(zakat) {
  var list = zakat.mustahik || [];
  if (list.length === 0) {
    list.push({
      id: "",
      nama: "",
      nominal: 0,
      jenis_zakat: "",
      _sheetIndex: 1,
    });
    zakat.mustahik = list;
  }
  ensureSheetIndexes(list);
  return list.slice().sort(function (a, b) {
    return a._sheetIndex - b._sheetIndex;
  });
}

function captureMuzakiSheetInputs(zakat) {
  var container = document.getElementById("zakatMuzakiSheetList");
  if (!container) return;
  var rows = container.querySelectorAll(".zakat-muzaki-row");
  rows.forEach(function (row) {
    if (row.classList.contains("deleted")) return;
    var sheetIndex = Number(row.dataset.sheetIndex);
    var target = (zakat.muzaki || []).find(function (m) {
      return m._sheetIndex === sheetIndex && m._deleted !== true;
    });
    if (!target) return;
    var nameInput = row.querySelector(".zakat-muzaki-sheet-name");
    var nominalInput = row.querySelector(".zakat-muzaki-sheet-nominal");
    if (nameInput) target.nama = nameInput.value.trim();
    if (nominalInput) target.nominal = Number(nominalInput.value) || 0;
  });
}

function captureMustahikSheetInputs(zakat) {
  var container = document.getElementById("zakatMustahikSheetList");
  if (!container) return;
  var rows = container.querySelectorAll(".zakat-muzaki-row");
  rows.forEach(function (row) {
    if (row.classList.contains("deleted")) return;
    var sheetIndex = Number(row.dataset.sheetIndex);
    var target = (zakat.mustahik || []).find(function (m) {
      return m._sheetIndex === sheetIndex && m._deleted !== true;
    });
    if (!target) return;
    var nameInput = row.querySelector(".zakat-mustahik-sheet-name");
    var nominalInput = row.querySelector(".zakat-mustahik-sheet-nominal");
    if (nameInput) target.nama = nameInput.value.trim();
    if (nominalInput) target.nominal = Number(nominalInput.value) || 0;
  });
}

function initCountAdjustButtons() {
  document.querySelectorAll(".btn-count-adjust").forEach(function (btn) {
    btn.removeEventListener("click", handleCountAdjust);
    btn.addEventListener("click", handleCountAdjust);
  });
}

function handleCountAdjust(e) {
  e.preventDefault();
  e.stopPropagation();
  var btn = e.currentTarget;
  var targetId = btn.dataset.target;
  var min = parseInt(btn.dataset.min) || 1;
  var max = parseInt(btn.dataset.max) || 20;
  var isPlus = btn.classList.contains("btn-count-plus");
  var input = document.getElementById(targetId);
  if (!input) return;
  if (input.disabled) {
    showToast(
      "Tidak dapat mengubah jumlah karena zakat sudah selesai.",
      "warning",
    );
    return;
  }
  var currentValue = parseInt(input.value) || 1;
  var newValue = isPlus ? currentValue + 1 : currentValue - 1;
  newValue = Math.max(min, Math.min(max, newValue));
  if (newValue !== currentValue) {
    if (!isPlus) {
      var zakat = getZakatById(state.zakat.currentId);
      if (!zakat) {
        showToast("Zakat tidak ditemukan.", "error");
        return;
      }
      var targetList =
        targetId === "zakatMuzakiSheetCount" ? zakat.muzaki : zakat.mustahik;
      if (targetList) {
        var activeData = targetList.filter(function (item) {
          return item._deleted !== true;
        });
        var filledCount = activeData.filter(function (item) {
          return (
            (item.nama && item.nama.trim() !== "") ||
            (item.nominal && item.nominal > 0)
          );
        }).length;
        if (filledCount > 0 && newValue < activeData.length) {
          var existingFilled = activeData.filter(function (item) {
            return (
              (item.nama && item.nama.trim() !== "") ||
              (item.nominal && item.nominal > 0)
            );
          });
          var willDeleteFilled = existingFilled.some(function (item, index) {
            return index >= newValue;
          });
          if (willDeleteFilled) {
            showToast(
              "Tidak dapat mengurangi jumlah karena ada data yang sudah terisi. Hapus baris menggunakan tombol hapus terlebih dahulu.",
              "warning",
            );
            return;
          }
        }
      }
    }
    input.value = newValue;
    if (targetId === "zakatMuzakiSheetCount") {
      applyMuzakiCountChange(newValue);
    } else if (targetId === "zakatMustahikSheetCount") {
      applyMustahikCountChange(newValue);
    }
  }
}

function applyMuzakiCountChange(newCount) {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }
  captureMuzakiSheetInputs(zakat);
  newCount = Math.max(1, Math.min(20, Number(newCount) || 1));
  var activeMuzaki = zakat.muzaki.filter(function (m) {
    return m._deleted !== true;
  });
  if (newCount < activeMuzaki.length) {
    for (var i = newCount; i < activeMuzaki.length; i++) {
      var item = activeMuzaki[i];
      if ((item.nama && item.nama.trim() !== "") || Number(item.nominal) > 0) {
        showToast(
          "Tidak dapat mengurangi jumlah. Hapus baris yang tidak diperlukan menggunakan tombol hapus terlebih dahulu.",
          "warning",
        );
        var countInput = document.getElementById("zakatMuzakiSheetCount");
        if (countInput) countInput.value = activeMuzaki.length;
        pendingMuzakiCount = activeMuzaki.length;
        return;
      }
    }
  }
  var nextMuzakiIndex = ensureSheetIndexes(zakat.muzaki);
  while (activeMuzaki.length < newCount) {
    nextMuzakiIndex += 1;
    activeMuzaki.push(createNewSheetRow(nextMuzakiIndex, ""));
  }
  if (newCount < activeMuzaki.length) {
    activeMuzaki = activeMuzaki.slice(0, newCount);
  }
  var deletedMuzaki = zakat.muzaki.filter(function (m) {
    return m._deleted === true;
  });
  zakat.muzaki = activeMuzaki.concat(deletedMuzaki).sort(function (a, b) {
    return a._sheetIndex - b._sheetIndex;
  });
  pendingMuzakiCount = newCount;
  renderMuzakiSheetRows(zakat);
  updateMuzakiSheetTotal(zakat);
}

function applyMustahikCountChange(newCount) {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }
  captureMustahikSheetInputs(zakat);
  newCount = Math.max(1, Math.min(20, Number(newCount) || 1));
  var activeMustahik = zakat.mustahik.filter(function (m) {
    return m._deleted !== true;
  });
  if (newCount < activeMustahik.length) {
    for (var i = newCount; i < activeMustahik.length; i++) {
      var item = activeMustahik[i];
      if ((item.nama && item.nama.trim() !== "") || Number(item.nominal) > 0) {
        showToast(
          "Tidak dapat mengurangi jumlah. Hapus baris yang tidak diperlukan menggunakan tombol hapus terlebih dahulu.",
          "warning",
        );
        var countInput = document.getElementById("zakatMustahikSheetCount");
        if (countInput) countInput.value = activeMustahik.length;
        pendingMustahikCount = activeMustahik.length;
        return;
      }
    }
  }
  var nextMustahikIndex = ensureSheetIndexes(zakat.mustahik);
  while (activeMustahik.length < newCount) {
    nextMustahikIndex += 1;
    activeMustahik.push(createNewSheetRow(nextMustahikIndex, ""));
  }
  if (newCount < activeMustahik.length) {
    activeMustahik = activeMustahik.slice(0, newCount);
  }
  var deletedMustahik = zakat.mustahik.filter(function (m) {
    return m._deleted === true;
  });
  zakat.mustahik = activeMustahik.concat(deletedMustahik).sort(function (a, b) {
    return a._sheetIndex - b._sheetIndex;
  });
  pendingMustahikCount = newCount;
  renderMustahikSheetRows(zakat);
  updateMustahikSheetTotal(zakat);
}

function buildSheetSectionHeader(jenis, opts) {
  opts = opts || {};
  var label = getJenisZakatLabel(jenis);
  var total = opts.total || 0;
  var addAttr = opts.addAttr || "";
  var showAdd = opts.showAdd === true;
  var addBtn = showAdd
    ? '<button type="button" class="btn-ghost btn-sm zakat-sheet-add-btn" ' +
      addAttr +
      ' style="font-size:11px;padding:4px 10px;">+ Tambah</button>'
    : "";
  return (
    '<div class="zakat-sheet-section-header" data-jenis="' +
    escapeHtml(jenis) +
    '" style="display:flex;justify-content:space-between;align-items:center;' +
    "padding:8px 12px;background:var(--surface-alt);border-radius:8px;margin:12px 0 8px;" +
    'gap:8px;">' +
    '<span style="font-weight:700;font-size:12px;color:var(--ink);">' +
    escapeHtml(label) +
    "</span>" +
    '<span style="display:flex;align-items:center;gap:8px;">' +
    (total > 0
      ? '<span style="font-weight:700;font-size:11.5px;color:var(--brand);">' +
        fmtRp(total) +
        "</span>"
      : "") +
    addBtn +
    "</span>" +
    "</div>"
  );
}

var ZAKAT_SHEET_DEBUG = true;

function zakatSheetLog() {
  if (!ZAKAT_SHEET_DEBUG) return;
  var args = Array.prototype.slice.call(arguments);
  console.log.apply(
    console,
    ["%c[MuzakiSheet]", "color:#0ea5e9;font-weight:bold"].concat(args),
  );
}

function zakatSheetWarn() {
  var args = Array.prototype.slice.call(arguments);
  console.warn.apply(console, ["[MuzakiSheet]"].concat(args));
}

function zakatSheetError() {
  var args = Array.prototype.slice.call(arguments);
  console.error.apply(console, ["[MuzakiSheet]"].concat(args));
}

function zakatWithTimeout(promise, ms, label) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      reject(new Error((label || "Operation") + " timeout after " + ms + "ms"));
    }, ms);
    Promise.resolve(promise)
      .then(function (result) {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(function (err) {
        clearTimeout(timer);
        reject(err);
      });
  });
}

openZakatMuzakiSheet = async function () {
  zakatSheetLog("========== OPEN MUZAKI SHEET ==========");
  zakatSheetLog("state.zakat.currentId:", state.zakat && state.zakat.currentId);

  var zakatId = state.zakat && state.zakat.currentId;
  var zakat = getZakatById(zakatId);

  if (!zakat) {
    zakatSheetError("Zakat tidak ditemukan, id:", zakatId);
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  zakatSheetLog("Zakat ditemukan:", {
    id: zakat.id,
    title: zakat.title,
    muzakiCount: (zakat.muzaki || []).length,
    status: zakat.status,
  });

  var overlay = document.getElementById("zakatMuzakiSheet");
  if (!overlay) {
    zakatSheetError("Overlay #zakatMuzakiSheet TIDAK ADA di DOM!");
    showToast("Elemen sheet tidak ditemukan.", "error");
    return;
  }

  isSubmittingMuzaki = false;

  var lockedZakatId = zakat.id;
  zakatSheetLog("Locked zakat ID:", lockedZakatId);

  zakatSheetLog("Menampilkan skeleton...");
  showMuzakiSheetSkeleton();
  overlay.classList.remove("hidden");
  zakatSheetLog("Overlay visible, skeleton ditampilkan");

  try {
    zakatSheetLog("Memanggil refreshSingleZakat...");
    var t0 = Date.now();

    var refreshed = false;
    try {
      refreshed = await zakatWithTimeout(
        refreshSingleZakat(lockedZakatId),
        10000,
        "refreshSingleZakat",
      );
      zakatSheetLog(
        "refreshSingleZakat selesai dalam",
        Date.now() - t0,
        "ms, result:",
        refreshed,
      );
    } catch (refreshErr) {
      zakatSheetWarn("refreshSingleZakat gagal/timeout:", refreshErr.message);
      refreshed = false;
    }

    if (!refreshed) {
      zakatSheetLog("Fallback ke loadZakatData...");
      var t1 = Date.now();
      try {
        refreshed = await zakatWithTimeout(
          loadZakatData().then(function () {
            return getZakatById(lockedZakatId) !== null;
          }),
          15000,
          "loadZakatData",
        );
        zakatSheetLog(
          "loadZakatData selesai dalam",
          Date.now() - t1,
          "ms, result:",
          refreshed,
        );
      } catch (loadErr) {
        zakatSheetWarn("loadZakatData gagal/timeout:", loadErr.message);
        refreshed = false;
      }
    }

    if (!refreshed) {
      zakatSheetWarn("Gagal refresh dari server, pakai data cache");
      showToast(
        "Gagal memuat data terbaru dari server. Menampilkan data terakhir yang tersedia.",
        "warning",
      );
    }

    zakat = getZakatById(lockedZakatId);
    if (!zakat) {
      zakatSheetError("Zakat hilang setelah refresh, id:", lockedZakatId);
      showToast("Zakat tidak ditemukan.", "error");
      closeZakatMuzakiSheet();
      return;
    }

    zakatSheetLog("Zakat loaded ulang:", {
      id: zakat.id,
      muzakiCount: (zakat.muzaki || []).length,
    });

    var muzakiList = zakat.muzaki || [];
    var activeMuzaki = muzakiList.filter(function (m) {
      return m._deleted !== true;
    });

    zakatSheetLog(
      "Active muzaki:",
      activeMuzaki.length,
      "dari total:",
      muzakiList.length,
    );

    if (activeMuzaki.length === 0) {
      zakatSheetLog("Tidak ada muzaki aktif, menambahkan 1 baris kosong");
      if (!zakat.muzaki) zakat.muzaki = [];
      zakat.muzaki.push({
        id: "",
        nama: "",
        nominal: 0,
        jenis_zakat: "",
        jumlah_anggota_keluarga: 0,
        _sheetIndex: 1,
      });
      activeMuzaki = zakat.muzaki;
    }

    var count = Math.max(activeMuzaki.length || 1, 1);
    pendingMuzakiCount = count;
    var countInput = document.getElementById("zakatMuzakiSheetCount");
    if (countInput) {
      countInput.value = count;
      zakatSheetLog("Count input diset:", count);
    } else {
      zakatSheetLog(
        "Count input #zakatMuzakiSheetCount tidak ada — mode tanpa count control",
      );
    }

    zakatSheetLog("Cek master data:", {
      hasMasterMuzaki: !!(state.masterMuzaki && state.masterMuzaki.length),
      masterMuzakiCount: state.masterMuzaki ? state.masterMuzaki.length : 0,
    });

    if (!state.masterMuzaki || state.masterMuzaki.length === 0) {
      zakatSheetLog("Master muzaki kosong, memanggil loadMastersData...");
      var t2 = Date.now();
      try {
        await zakatWithTimeout(loadMastersData(), 10000, "loadMastersData");
        zakatSheetLog("loadMastersData selesai dalam", Date.now() - t2, "ms");
      } catch (masterErr) {
        zakatSheetWarn("loadMastersData gagal/timeout:", masterErr.message);
      }
    } else {
      zakatSheetLog("Master muzaki sudah ada di state, skip load");
    }

    zakatSheetLog("Memanggil renderMuzakiSheetRows...");
    var t3 = Date.now();
    try {
      await zakatWithTimeout(
        renderMuzakiSheetRows(zakat),
        15000,
        "renderMuzakiSheetRows",
      );
      zakatSheetLog(
        "renderMuzakiSheetRows selesai dalam",
        Date.now() - t3,
        "ms",
      );
    } catch (renderErr) {
      zakatSheetError("renderMuzakiSheetRows GAGAL:", renderErr);
      throw renderErr;
    }

    zakatSheetLog("Update total...");
    updateMuzakiSheetTotal(zakat);

    zakatSheetLog("========== OPEN MUZAKI SHEET SELESAI ==========");
  } catch (fatalErr) {
    zakatSheetError("========== FATAL ERROR ==========");
    zakatSheetError("Message:", fatalErr.message);
    zakatSheetError("Stack:", fatalErr.stack);

    var container = document.getElementById("zakatMuzakiSheetList");
    if (container) {
      container.innerHTML =
        '<div style="padding:24px 12px;text-align:center;color:var(--neg);font-size:13px;">' +
        "<p><strong>Gagal memuat data muzaki</strong></p>" +
        '<p style="font-size:11px;margin-top:6px;color:var(--ink-soft);">' +
        escapeHtml(fatalErr.message || "Unknown error") +
        "</p>" +
        '<button type="button" class="btn-ghost" style="margin-top:12px;" ' +
        'onclick="closeZakatMuzakiSheet(); openZakatMuzakiSheet();">' +
        "Coba Lagi" +
        "</button>" +
        "</div>";
    }

    showToast(
      "Gagal memuat data muzaki: " + (fatalErr.message || "Unknown error"),
      "error",
    );
  }
};

closeZakatMuzakiSheet = function () {
  zakatSheetLog("closeZakatMuzakiSheet dipanggil");
  var overlay = document.getElementById("zakatMuzakiSheet");
  if (overlay) overlay.classList.add("hidden");
  isSubmittingMuzaki = false;
};

renderMuzakiSheetRows = async function (zakat) {
  zakatSheetLog("--- renderMuzakiSheetRows START ---");
  zakatSheetLog("Zakat ID:", zakat && zakat.id);

  var container = document.getElementById("zakatMuzakiSheetList");
  var countInput = document.getElementById("zakatMuzakiSheetCount");

  if (!container) {
    zakatSheetError("Container #zakatMuzakiSheetList TIDAK ADA!");
    return;
  }

  if (!countInput) {
    zakatSheetLog(
      "Count input #zakatMuzakiSheetCount tidak ada — render tetap dilanjutkan",
    );
  }

  zakatSheetLog("Container OK. Count input:", countInput ? "ADA" : "TIDAK ADA");

  zakatSheetLog("loadMastersData...");
  var t0 = Date.now();
  try {
    await loadMastersData();
    zakatSheetLog("loadMastersData OK dalam", Date.now() - t0, "ms");
  } catch (e) {
    zakatSheetWarn("loadMastersData error (lanjut):", e.message);
  }

  var allMuzaki = getSortedMuzakiForSheet(zakat);
  zakatSheetLog("allMuzaki count:", allMuzaki.length);

  var activeOnlyCount =
    allMuzaki.filter(function (m) {
      return m._deleted !== true;
    }).length || 1;
  var currentCount =
    pendingMuzakiCount > 0 ? pendingMuzakiCount : activeOnlyCount;

  if (countInput) {
    countInput.value = currentCount;
    zakatSheetLog(
      "currentCount:",
      currentCount,
      "pendingMuzakiCount:",
      pendingMuzakiCount,
    );
  } else {
    zakatSheetLog(
      "Skip set count input — pakai pendingMuzakiCount:",
      pendingMuzakiCount,
    );
  }

  var allNames = loadMuzakiSuggestions();
  zakatSheetLog("allNames (suggestions):", allNames.length);

  var isCompleted = isZakatCompleted(zakat);
  zakatSheetLog("isCompleted:", isCompleted);

  var html = "";
  var renderedAny = false;
  var renderedRowCount = 0;

  ZAKAT_JENIS_ORDER.forEach(function (jenis) {
    try {
      var groupItems = allMuzaki.filter(function (m) {
        return normalizeJenisZakat(m.jenis_zakat) === jenis;
      });

      if (groupItems.length === 0) return;
      renderedAny = true;

      zakatSheetLog("Rendering jenis:", jenis, "items:", groupItems.length);

      var sectionTotal = groupItems.reduce(function (sum, m) {
        return sum + (Number(m.nominal) || 0);
      }, 0);

      html += buildSheetSectionHeader(jenis, {
        total: sectionTotal,
        showAdd: !isCompleted,
        addAttr: 'data-add-muzaki="' + escapeHtml(jenis) + '"',
      });

      html +=
        '<div class="zakat-sheet-section-rows" data-jenis="' +
        escapeHtml(jenis) +
        '">';

      groupItems.forEach(function (existing) {
        try {
          renderedRowCount++;

          var rowNumber = existing._sheetIndex;
          var muzakiId = existing.id || "";
          var isDeleted = existing._deleted === true;

          var rowClass = isDeleted
            ? "zakat-muzaki-row deleted"
            : "zakat-muzaki-row";
          var nameValue = isDeleted
            ? (existing.nama || "") + " (akan dihapus)"
            : existing.nama || "";

          var master = getMasterMuzakiById(muzakiId);
          var isFromMaster = master !== null;

          var usedNames = [];
          allMuzaki.forEach(function (m) {
            if (
              m.id !== existing.id &&
              m._deleted !== true &&
              m.nama &&
              normalizeJenisZakat(m.jenis_zakat) === jenis
            ) {
              usedNames.push(m.nama.toLowerCase().trim());
            }
          });

          var availableNames = allNames.filter(function (n) {
            var lower = n.toLowerCase().trim();
            return usedNames.indexOf(lower) === -1;
          });

          if (nameValue && !isFromMaster) {
            var cleanNameValue = nameValue.replace(
              /\s*\(akan dihapus\)\s*$/,
              "",
            );
            var isInSuggestions = allNames.indexOf(cleanNameValue) !== -1;
            if (!isInSuggestions && cleanNameValue) {
              availableNames.push(cleanNameValue);
              availableNames.sort();
            }
          }

          var actionBtnHtml = "";
          if (isDeleted) {
            actionBtnHtml =
              '<button type="button" class="zakat-row-undelete-btn" data-muzaki-id="' +
              muzakiId +
              '" data-index="' +
              existing._sheetIndex +
              '" title="Batalkan penghapusan">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<path d="M3 12a9 9 0 1 0 3-6.7M3 5v5h5"/>' +
              '<path d="M12 8v4l3 2"/>' +
              "</svg>" +
              "</button>";
          } else if (!isCompleted && muzakiId) {
            actionBtnHtml =
              '<button type="button" class="zakat-row-delete-btn" data-muzaki-id="' +
              muzakiId +
              '" data-index="' +
              existing._sheetIndex +
              '" title="Hapus Muzaki ' +
              rowNumber +
              '">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>' +
              "</svg>" +
              "</button>";
          }

          var lockHtml = isCompleted
            ? '<span style="font-size:10px;color:var(--ink-faint);">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
              '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>' +
              "</svg>" +
              "</span>"
            : "";

          var safeNameValue = escapeHtml(nameValue);
          var datalistId = "sheet-suggest-muzaki-" + existing._sheetIndex;

          html +=
            '<div class="' +
            rowClass +
            '" data-sheet-index="' +
            existing._sheetIndex +
            '" data-muzaki-id="' +
            muzakiId +
            '" data-jenis="' +
            escapeHtml(jenis) +
            '" style="' +
            (isDeleted ? "opacity:0.5;background:var(--neg-soft);" : "") +
            '">' +
            '<div class="zakat-row-label">' +
            rowNumber +
            ".</div>" +
            '<div class="zakat-name-wrapper" style="position:relative;flex:1;min-width:0;">' +
            '<input type="text" class="field-input zakat-muzaki-sheet-name" ' +
            'placeholder="Nama Muzaki ' +
            rowNumber +
            '" ' +
            'value="' +
            safeNameValue +
            '" ' +
            'data-index="' +
            existing._sheetIndex +
            '" ' +
            'data-jenis="' +
            escapeHtml(jenis) +
            '" ' +
            'list="' +
            datalistId +
            '" ' +
            'autocomplete="off" ' +
            'style="width:100%;' +
            (isDeleted ? "text-decoration:line-through;" : "") +
            '" ' +
            (isCompleted || isDeleted ? "disabled" : "") +
            ">" +
            '<datalist id="' +
            datalistId +
            '">' +
            availableNames
              .map(function (n) {
                return '<option value="' + escapeHtml(n) + '">';
              })
              .join("") +
            "</datalist>" +
            (existing.nama ? '<span class="zakat-name-badge">✓</span>' : "") +
            "</div>" +
            '<div class="zakat-nominal-wrapper" style="flex-shrink:0;">' +
            '<span class="zakat-nominal-label">Rp</span>' +
            '<input type="number" class="field-input zakat-muzaki-sheet-nominal" ' +
            'placeholder="0" ' +
            'value="' +
            (existing.nominal || "") +
            '" ' +
            'data-index="' +
            existing._sheetIndex +
            '" ' +
            'data-jenis="' +
            escapeHtml(jenis) +
            '" ' +
            'min="0" step="1000" ' +
            'style="' +
            (isDeleted ? "text-decoration:line-through;" : "") +
            '" ' +
            (isCompleted || isDeleted ? "disabled" : "") +
            ">" +
            "</div>" +
            '<div class="zakat-actions-wrapper" style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
            actionBtnHtml +
            lockHtml +
            "</div>" +
            "</div>";
        } catch (rowErr) {
          zakatSheetError("Error render row:", existing, rowErr);
        }
      });

      html += "</div>";
    } catch (jenisErr) {
      zakatSheetError("Error render jenis:", jenis, jenisErr);
    }
  });

  zakatSheetLog("Total rows dirender:", renderedRowCount);

  if (!renderedAny) {
    zakatSheetLog(
      "Tidak ada grup jenis zakat yang dirender, tampilkan empty state",
    );
    html =
      '<div style="padding:12px 0;text-align:center;color:var(--ink-faint);font-size:12px;">' +
      'Belum ada data muzaki. Klik "+ Tambah" untuk memulai.' +
      "</div>";
  }

  zakatSheetLog("Set innerHTML ke container, panjang html:", html.length);
  container.innerHTML = html;
  zakatSheetLog("Container children:", container.children.length);

  zakatSheetLog("Pasang event listeners...");

  var deleteBtns = container.querySelectorAll(".zakat-row-delete-btn");
  zakatSheetLog("Delete buttons:", deleteBtns.length);
  deleteBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var muzakiId = this.dataset.muzakiId;
      var zakatId = state.zakat.currentId;
      if (muzakiId && zakatId) {
        showMarkMuzakiConfirm(zakatId, muzakiId);
      }
    });
  });

  var undeleteBtns = container.querySelectorAll(".zakat-row-undelete-btn");
  zakatSheetLog("Undelete buttons:", undeleteBtns.length);
  undeleteBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var muzakiId = this.dataset.muzakiId;
      var zakat = getZakatById(state.zakat.currentId);
      if (zakat && muzakiId) {
        captureMuzakiSheetInputs(zakat);
        var muzaki = zakat.muzaki.find(function (m) {
          return m.id === muzakiId;
        });
        if (muzaki) {
          delete muzaki._deleted;
          pendingMuzakiCount = zakat.muzaki.filter(function (m) {
            return m._deleted !== true;
          }).length;
          renderMuzakiSheetRows(zakat);
          updateMuzakiSheetTotal(zakat);
          showToast("Penghapusan dibatalkan.", "info");
        }
      }
    });
  });

  var nameInputs = container.querySelectorAll(".zakat-muzaki-sheet-name");
  zakatSheetLog("Name inputs:", nameInputs.length);
  nameInputs.forEach(function (input) {
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

  var nominalInputs = container.querySelectorAll(".zakat-muzaki-sheet-nominal");
  zakatSheetLog("Nominal inputs:", nominalInputs.length);
  nominalInputs.forEach(function (input) {
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

  if (countInput) {
    countInput.disabled = isCompleted;
    countInput.style.opacity = isCompleted ? "0.5" : "1";
  }

  zakatSheetLog("Update total akhir...");
  updateMuzakiSheetTotal(zakat);

  zakatSheetLog("--- renderMuzakiSheetRows END ---");
};

updateMuzakiSheetTotal = function (zakat) {
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
};

applyMuzakiSheetCount = function () {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  syncMuzakiSheetRowsToData(zakat);

  var countInput = document.getElementById("zakatMuzakiSheetCount");
  if (!countInput) {
    var activeCount =
      zakat.muzaki.filter(function (m) {
        return m._deleted !== true;
      }).length || 1;
    pendingMuzakiCount = activeCount;
    renderMuzakiSheetRows(zakat);
    updateMuzakiSheetTotal(zakat);
    return;
  }

  var newCount = parseInt(countInput.value) || 1;
  newCount = Math.max(1, Math.min(20, newCount));
  countInput.value = newCount;
  pendingMuzakiCount = newCount;
  syncMuzakiSheetRowsToData(zakat);

  var activeMuzaki = zakat.muzaki.filter(function (m) {
    return m._deleted !== true;
  });

  var nextMuzakiIndex = ensureSheetIndexes(zakat.muzaki);

  while (activeMuzaki.length < newCount) {
    nextMuzakiIndex += 1;
    activeMuzaki.push(createNewSheetRow(nextMuzakiIndex, ""));
  }

  if (activeMuzaki.length > newCount) {
    activeMuzaki = activeMuzaki.slice(0, newCount);
  }

  var deletedMuzaki = zakat.muzaki.filter(function (m) {
    return m._deleted === true;
  });

  zakat.muzaki = activeMuzaki.concat(deletedMuzaki).sort(function (a, b) {
    return a._sheetIndex - b._sheetIndex;
  });

  renderMuzakiSheetRows(zakat);
  updateMuzakiSheetTotal(zakat);
  showToast("Jumlah muzaki diterapkan: " + newCount, "info");
};

syncMuzakiSheetRowsToData = function (zakat) {
  var container = document.getElementById("zakatMuzakiSheetList");
  if (!container) {
    return { success: false, error: "Container not found" };
  }

  var rows = container.querySelectorAll(".zakat-muzaki-row");
  var processedIds = new Set();
  var updatedMuzaki = [];
  var deletedIds = [];
  var invalidRows = [];

  rows.forEach(function (row) {
    var isDeletedRow = row.classList.contains("deleted");
    if (isDeletedRow) return;
    var nameInput = row.querySelector(".zakat-muzaki-sheet-name");
    var nameVal = nameInput ? nameInput.value.trim() : "";
    if (!nameVal) {
      invalidRows.push(row.dataset.sheetIndex || "?");
    }
  });

  rows.forEach(function (row) {
    var nameInput = row.querySelector(".zakat-muzaki-sheet-name");
    var nominalInput = row.querySelector(".zakat-muzaki-sheet-nominal");
    var muzakiId = row.dataset.muzakiId || "";
    var jenisRow = normalizeJenisZakat(row.dataset.jenis);

    var name = nameInput ? nameInput.value.trim() : "";
    var nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
    var isDeleted = row.classList.contains("deleted");

    if (!name && nominal === 0 && !muzakiId) return;

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
      if (jenisRow && jenisRow !== "LAINNYA") {
        existing.jenis_zakat = jenisRow;
      }
      processedIds.add(existing.id);
      updatedMuzaki.push(existing);
    } else {
      var newMuzaki = {
        id: finalId || "",
        nama: name,
        nominal: nominal,
        jenis_zakat: jenisRow !== "LAINNYA" ? jenisRow : "",
        jumlah_anggota_keluarga: 0,
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

  if (invalidRows.length > 0) {
    return {
      success: false,
      error:
        "Baris " +
        invalidRows.join(", ") +
        ": nama Muzaki wajib diisi. Isi namanya atau hapus baris tersebut terlebih dahulu.",
      total: total,
      count: zakat.muzaki.length,
    };
  }

  var hasFilledData = zakat.muzaki.some(function (m) {
    return (m.nama && m.nama.trim() !== "") || (m.nominal && m.nominal > 0);
  });

  if (!hasFilledData) {
    return {
      success: false,
      error:
        "Belum ada data Muzaki yang diisi. Isi nama dan/atau nominal terlebih dahulu sebelum menyimpan.",
      total: total,
      count: zakat.muzaki.length,
    };
  }

  return {
    success: true,
    deletedIds: deletedIds,
    total: total,
    count: zakat.muzaki.length,
  };
};

deleteMuzakiSheetRow = function (idx) {
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
};

submitZakatMuzakiSheet = async function () {
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
      showToast(
        (syncResult && syncResult.error) ||
          "Gagal menyinkronkan data dari sheet.",
        "error",
      );
      return;
    }

    var nameMap = new Map();
    var hasDuplicate = false;
    var duplicateNames = [];

    zakat.muzaki.forEach(function (m) {
      if (m._deleted !== true && m.nama) {
        var key =
          m.nama.toLowerCase().trim() +
          "::" +
          normalizeJenisZakat(m.jenis_zakat);
        if (nameMap.has(key)) {
          hasDuplicate = true;
          duplicateNames.push(
            m.nama +
              " (" +
              getJenisZakatLabel(normalizeJenisZakat(m.jenis_zakat)) +
              ")",
          );
        } else {
          nameMap.set(key, m.id);
        }
      }
    });

    if (hasDuplicate) {
      showToast(
        "Ada nama yang sama dalam satu jenis: " +
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
        jenis_zakat: m.jenis_zakat || "",
        jumlah_anggota_keluarga: m.jumlah_anggota_keluarga || 0,
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
};

openZakatMustahikSheet = async function () {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var overlay = document.getElementById("zakatMustahikSheet");
  if (!overlay) return;

  isSubmittingMustahik = false;
  showMustahikSheetSkeleton();
  overlay.classList.remove("hidden");

  var refreshed = await refreshSingleZakat(zakat.id);
  if (!refreshed) {
    refreshed = await loadZakatData().then(function () {
      return getZakatById(state.zakat.currentId) !== null;
    });
  }

  if (!refreshed) {
    showToast(
      "Gagal memuat data terbaru dari server. Menampilkan data terakhir yang tersedia.",
      "warning",
    );
  }

  zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    closeZakatMustahikSheet();
    return;
  }

  var mustahikList = zakat.mustahik || [];
  var activeMustahik = mustahikList.filter(function (m) {
    return m._deleted !== true;
  });

  if (activeMustahik.length === 0) {
    zakat.mustahik.push({
      id: "",
      nama: "",
      nominal: 0,
      jenis_zakat: "",
    });
  }

  var count = Math.max(activeMustahik.length || 1, 1);
  pendingMustahikCount = count;
  var countInput = document.getElementById("zakatMustahikSheetCount");
  if (countInput) {
    countInput.value = count;
  }

  loadMastersData()
    .then(function () {
      renderZakatMustahikView(zakat);
      renderMustahikSheetRows(zakat);
      updateMustahikSheetTotal(zakat);
    })
    .catch(function () {
      renderZakatMustahikView(zakat);
      renderMustahikSheetRows(zakat);
      updateMustahikSheetTotal(zakat);
    });
};

closeZakatMustahikSheet = function () {
  var overlay = document.getElementById("zakatMustahikSheet");
  if (overlay) overlay.classList.add("hidden");
};

renderMustahikSheetRows = async function (zakat) {
  var container = document.getElementById("zakatMustahikSheetList");
  var countInput = document.getElementById("zakatMustahikSheetCount");

  if (!container) {
    zakatSheetError("Container #zakatMustahikSheetList TIDAK ADA!");
    return;
  }

  if (!countInput) {
    zakatSheetLog(
      "Count input #zakatMustahikSheetCount tidak ada — render tetap dilanjutkan",
    );
  }

  await loadMastersData();

  var allMustahik = getSortedMustahikForSheet(zakat);

  var activeOnlyCount =
    allMustahik.filter(function (m) {
      return m._deleted !== true;
    }).length || 1;
  var currentCount =
    pendingMustahikCount > 0 ? pendingMustahikCount : activeOnlyCount;

  if (countInput) {
    countInput.value = currentCount;
  }

  var allNames = loadMustahikSuggestions();
  var isCompleted = isZakatCompleted(zakat);

  var html = "";
  var renderedAny = false;

  ZAKAT_JENIS_ORDER.forEach(function (jenis) {
    var groupItems = allMustahik.filter(function (m) {
      return normalizeJenisZakat(m.jenis_zakat) === jenis;
    });

    if (groupItems.length === 0) return;
    renderedAny = true;

    var sectionTotal = groupItems.reduce(function (sum, m) {
      return sum + (Number(m.nominal) || 0);
    }, 0);

    html += buildSheetSectionHeader(jenis, {
      total: sectionTotal,
      showAdd: !isCompleted,
      addAttr: 'data-add-mustahik="' + escapeHtml(jenis) + '"',
    });

    html +=
      '<div class="zakat-sheet-section-rows" data-jenis="' +
      escapeHtml(jenis) +
      '">';

    groupItems.forEach(function (existing) {
      var rowNumber = existing._sheetIndex;
      var mustahikId = existing.id || "";
      var isDeleted = existing._deleted === true;

      var rowClass = isDeleted
        ? "zakat-muzaki-row deleted"
        : "zakat-muzaki-row";
      var nameValue = isDeleted
        ? (existing.nama || "") + " (akan dihapus)"
        : existing.nama || "";

      var master = getMasterMustahikById(mustahikId);
      var isFromMaster = master !== null;

      var usedNames = [];
      allMustahik.forEach(function (m) {
        if (
          m.id !== existing.id &&
          m._deleted !== true &&
          m.nama &&
          normalizeJenisZakat(m.jenis_zakat) === jenis
        ) {
          usedNames.push(m.nama.toLowerCase().trim());
        }
      });

      var availableNames = allNames.filter(function (n) {
        var lower = n.toLowerCase().trim();
        return usedNames.indexOf(lower) === -1;
      });

      if (nameValue && !isFromMaster) {
        var cleanNameValue = nameValue.replace(/\s*\(akan dihapus\)\s*$/, "");
        var isInSuggestions = allNames.indexOf(cleanNameValue) !== -1;
        if (!isInSuggestions && cleanNameValue) {
          availableNames.push(cleanNameValue);
          availableNames.sort();
        }
      }

      var actionBtnHtml = "";
      if (isDeleted) {
        actionBtnHtml =
          '<button type="button" class="zakat-row-undelete-btn" data-mustahik-id="' +
          mustahikId +
          '" data-index="' +
          existing._sheetIndex +
          '" title="Batalkan penghapusan">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M3 12a9 9 0 1 0 3-6.7M3 5v5h5"/>' +
          '<path d="M12 8v4l3 2"/>' +
          "</svg>" +
          "</button>";
      } else if (!isCompleted && mustahikId) {
        actionBtnHtml =
          '<button type="button" class="zakat-row-delete-btn" data-mustahik-id="' +
          mustahikId +
          '" data-index="' +
          existing._sheetIndex +
          '" title="Hapus Mustahik ' +
          rowNumber +
          '">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>' +
          "</svg>" +
          "</button>";
      }

      var lockHtml = isCompleted
        ? '<span style="font-size:10px;color:var(--ink-faint);">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>' +
          '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>' +
          "</svg>" +
          "</span>"
        : "";

      var safeNameValue = escapeHtml(nameValue);
      var datalistId = "sheet-suggest-mustahik-" + existing._sheetIndex;

      html +=
        '<div class="' +
        rowClass +
        '" data-sheet-index="' +
        existing._sheetIndex +
        '" data-mustahik-id="' +
        mustahikId +
        '" data-jenis="' +
        escapeHtml(jenis) +
        '" style="' +
        (isDeleted ? "opacity:0.5;background:var(--neg-soft);" : "") +
        '">' +
        '<div class="zakat-row-label">' +
        rowNumber +
        ".</div>" +
        '<div class="zakat-name-wrapper" style="position:relative;flex:1;min-width:0;">' +
        '<input type="text" class="field-input zakat-mustahik-sheet-name" ' +
        'placeholder="Nama Mustahik ' +
        rowNumber +
        '" ' +
        'value="' +
        safeNameValue +
        '" ' +
        'data-index="' +
        existing._sheetIndex +
        '" ' +
        'data-jenis="' +
        escapeHtml(jenis) +
        '" ' +
        'list="' +
        datalistId +
        '" ' +
        'autocomplete="off" ' +
        'style="width:100%;' +
        (isDeleted ? "text-decoration:line-through;" : "") +
        '" ' +
        (isCompleted || isDeleted ? "disabled" : "") +
        ">" +
        '<datalist id="' +
        datalistId +
        '">' +
        availableNames
          .map(function (n) {
            return '<option value="' + escapeHtml(n) + '">';
          })
          .join("") +
        "</datalist>" +
        (existing.nama ? '<span class="zakat-name-badge">✓</span>' : "") +
        "</div>" +
        '<div class="zakat-nominal-wrapper" style="flex-shrink:0;">' +
        '<span class="zakat-nominal-label">Rp</span>' +
        '<input type="number" class="field-input zakat-mustahik-sheet-nominal" ' +
        'placeholder="0" ' +
        'value="' +
        (existing.nominal || "") +
        '" ' +
        'data-index="' +
        existing._sheetIndex +
        '" ' +
        'data-jenis="' +
        escapeHtml(jenis) +
        '" ' +
        'min="0" step="1000" ' +
        'style="' +
        (isDeleted ? "text-decoration:line-through;" : "") +
        '" ' +
        (isCompleted || isDeleted ? "disabled" : "") +
        ">" +
        "</div>" +
        '<div class="zakat-actions-wrapper" style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
        actionBtnHtml +
        lockHtml +
        "</div>" +
        "</div>";
    });

    html += "</div>";
  });

  if (!renderedAny) {
    html =
      '<div style="padding:12px 0;text-align:center;color:var(--ink-faint);font-size:12px;">' +
      'Belum ada data mustahik. Klik "+ Tambah" untuk memulai.' +
      "</div>";
  }

  container.innerHTML = html;

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
        captureMustahikSheetInputs(zakat);
        var mustahik = zakat.mustahik.find(function (m) {
          return m.id === mustahikId;
        });
        if (mustahik) {
          delete mustahik._deleted;
          pendingMustahikCount = zakat.mustahik.filter(function (m) {
            return m._deleted !== true;
          }).length;
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

  if (countInput) {
    countInput.disabled = isCompleted;
    countInput.style.opacity = isCompleted ? "0.5" : "1";
  }

  updateMustahikSheetTotal(zakat);
};

updateMustahikSheetTotal = function (zakat) {
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
  var danaMustahik = 0;

  if (r.maal && r.maal.mustahik) {
    danaMustahik += Number((r.maal.mustahik.kelompok || {}).nominal) || 0;
  }
  if (r.fitrah && r.fitrah.mustahik) {
    danaMustahik += Number(r.fitrah.mustahik.nominal) || 0;
  }
  if (danaMustahik === 0 && r.mustahik) {
    danaMustahik =
      Number((r.mustahik.kelompok || {}).nominal) ||
      Number(r.mustahik.nominal) ||
      0;
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
};

applyMustahikSheetCount = function () {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  syncMustahikSheetRowsToData(zakat);

  var countInput = document.getElementById("zakatMustahikSheetCount");
  if (!countInput) {
    var activeCount =
      zakat.mustahik.filter(function (m) {
        return m._deleted !== true;
      }).length || 1;
    pendingMustahikCount = activeCount;
    renderMustahikSheetRows(zakat);
    updateMustahikSheetTotal(zakat);
    return;
  }

  var newCount = parseInt(countInput.value) || 1;
  newCount = Math.max(1, Math.min(20, newCount));
  countInput.value = newCount;
  pendingMustahikCount = newCount;
  syncMustahikSheetRowsToData(zakat);

  var activeMustahik = zakat.mustahik.filter(function (m) {
    return m._deleted !== true;
  });

  var nextMustahikIndex = ensureSheetIndexes(zakat.mustahik);

  while (activeMustahik.length < newCount) {
    nextMustahikIndex += 1;
    activeMustahik.push(createNewSheetRow(nextMustahikIndex, ""));
  }

  if (activeMustahik.length > newCount) {
    activeMustahik = activeMustahik.slice(0, newCount);
  }

  var deletedMustahik = zakat.mustahik.filter(function (m) {
    return m._deleted === true;
  });
  zakat.mustahik = activeMustahik.concat(deletedMustahik).sort(function (a, b) {
    return a._sheetIndex - b._sheetIndex;
  });

  renderMustahikSheetRows(zakat);
  updateMustahikSheetTotal(zakat);
  showToast("Jumlah mustahik diterapkan: " + newCount, "info");
};

syncMustahikSheetRowsToData = function (zakat) {
  var container = document.getElementById("zakatMustahikSheetList");
  if (!container) {
    return { success: false, error: "Container not found" };
  }

  var rows = container.querySelectorAll(".zakat-muzaki-row");
  var processedIds = new Set();
  var updatedMustahik = [];
  var deletedIds = [];
  var invalidRows = [];

  rows.forEach(function (row) {
    var isDeletedRow = row.classList.contains("deleted");
    if (isDeletedRow) return;
    var nameInput = row.querySelector(".zakat-mustahik-sheet-name");
    var nameVal = nameInput ? nameInput.value.trim() : "";
    if (!nameVal) {
      invalidRows.push(row.dataset.sheetIndex || "?");
    }
  });

  rows.forEach(function (row) {
    var nameInput = row.querySelector(".zakat-mustahik-sheet-name");
    var nominalInput = row.querySelector(".zakat-mustahik-sheet-nominal");
    var mustahikId = row.dataset.mustahikId || "";
    var jenisRow = normalizeJenisZakat(row.dataset.jenis);

    var name = nameInput ? nameInput.value.trim() : "";
    var nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
    var isDeleted = row.classList.contains("deleted");

    if (!name && nominal === 0 && !mustahikId) return;

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
      if (jenisRow && jenisRow !== "LAINNYA") {
        existing.jenis_zakat = jenisRow;
      }
      processedIds.add(existing.id);
      updatedMustahik.push(existing);
    } else {
      var newMustahik = {
        id: finalId || "",
        nama: name,
        nominal: nominal,
        jenis_zakat: jenisRow !== "LAINNYA" ? jenisRow : "",
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

  if (invalidRows.length > 0) {
    return {
      success: false,
      error:
        "Baris " +
        invalidRows.join(", ") +
        ": nama Mustahik wajib diisi. Isi namanya atau hapus baris tersebut terlebih dahulu.",
      count: zakat.mustahik.length,
    };
  }

  var hasFilledData = zakat.mustahik.some(function (m) {
    return (m.nama && m.nama.trim() !== "") || (m.nominal && m.nominal > 0);
  });

  if (!hasFilledData) {
    return {
      success: false,
      error:
        "Belum ada data Mustahik yang diisi. Isi nama dan/atau nominal terlebih dahulu sebelum menyimpan.",
      count: zakat.mustahik.length,
    };
  }

  return {
    success: true,
    deletedIds: deletedIds,
    count: zakat.mustahik.length,
  };
};

deleteMustahikSheetRow = function (idx) {
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
};

submitZakatMustahikSheet = async function () {
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
      showToast(
        (syncResult && syncResult.error) ||
          "Gagal menyinkronkan data dari sheet.",
        "error",
      );
      return;
    }

    var nameMap = new Map();
    var hasDuplicate = false;
    var duplicateNames = [];

    zakat.mustahik.forEach(function (m) {
      if (m._deleted !== true && m.nama) {
        var key =
          m.nama.toLowerCase().trim() +
          "::" +
          normalizeJenisZakat(m.jenis_zakat);
        if (nameMap.has(key)) {
          hasDuplicate = true;
          duplicateNames.push(
            m.nama +
              " (" +
              getJenisZakatLabel(normalizeJenisZakat(m.jenis_zakat)) +
              ")",
          );
        } else {
          nameMap.set(key, m.id);
        }
      }
    });

    if (hasDuplicate) {
      showToast(
        "Ada nama yang sama dalam satu jenis: " +
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
        jenis_zakat: m.jenis_zakat || "",
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

    await forceReloadMasters();

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
};

openZakatRincianSheet = async function () {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var overlay = document.getElementById("zakatRincianSheet");
  if (!overlay) return;

  showRincianSheetSkeleton();
  overlay.classList.remove("hidden");

  var refreshed = await refreshSingleZakat(zakat.id);
  if (!refreshed) {
    refreshed = await loadZakatData().then(function () {
      return getZakatById(state.zakat.currentId) !== null;
    });
  }

  if (!refreshed) {
    showToast(
      "Gagal memuat data terbaru dari server. Menampilkan data terakhir yang tersedia.",
      "warning",
    );
  }

  zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    closeZakatRincianSheet();
    return;
  }

  setTimeout(function () {
    removeRincianSheetSkeleton();

    if (typeof renderRincianSheet === "function") {
      renderRincianSheet(zakat);
    } else {
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
      setValueIfExists(
        "zakatPersenAmilKelompokSheet",
        amil.kelompok?.persen || 12,
      );
      setValueIfExists("zakatPersenAmilDesaSheet", amil.desa?.persen || 2);
      setValueIfExists("zakatPersenAmilDaerahSheet", amil.daerah?.persen || 1);
    }

    updateRincianSheet(zakat);
  }, 300);
};

closeZakatRincianSheet = function () {
  var overlay = document.getElementById("zakatRincianSheet");
  if (overlay) overlay.classList.add("hidden");
};

updateRincianSheet = function (zakat) {
  var r = zakat.rincian || {};

  if (typeof renderRincianSheet === "function") {
    var allInputs = document.querySelectorAll(
      "#zakatRincianSheetGroups .zakat-persen-input",
    );
    if (allInputs.length > 0) {
      allInputs.forEach(function (input) {
        var jenisKey = input.dataset.jenis;
        var fieldKey = input.dataset.field;
        var value = Number(input.value) || 0;

        var totalForJenis = 0;
        if (jenisKey === "fitrah") {
          totalForJenis = Number((r.fitrah || {}).total) || 0;
        } else if (jenisKey === "maal") {
          totalForJenis = Number((r.maal || {}).total) || 0;
        }

        var nominalEl = input.parentElement.querySelector(".field-nominal");
        if (nominalEl) {
          var nominalValue = 0;
          if (
            fieldKey === "mustahik" ||
            fieldKey === "sabilillah" ||
            fieldKey === "amil"
          ) {
            nominalValue = Math.round((totalForJenis * value) / 100);
          } else if (
            fieldKey === "mustahikKelompok" ||
            fieldKey === "mustahikDaerah"
          ) {
            var mustahikInput = document.querySelector(
              '#zakatRincianSheetGroups [data-jenis="' +
                jenisKey +
                '"][data-field="mustahik"]',
            );
            var mustahikPersen = mustahikInput
              ? Number(mustahikInput.value) || 0
              : 0;
            var mustahikNominal = Math.round(
              (totalForJenis * mustahikPersen) / 100,
            );
            nominalValue = Math.round((mustahikNominal * value) / 100);
          } else if (
            fieldKey === "amilKelompok" ||
            fieldKey === "amilDesa" ||
            fieldKey === "amilDaerah"
          ) {
            nominalValue = Math.round((totalForJenis * value) / 100);
          }
          nominalEl.textContent = fmtRp(nominalValue);
          nominalEl.style.color =
            nominalValue > 0 ? "var(--brand)" : "var(--ink-faint)";
        }
      });
      return;
    }
  }

  var maalData = r.maal || r;
  var totalZakat = Number(maalData.total) || Number(zakat.total) || 0;

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

  var mustahikNominal = Math.round((totalZakat * pMustahik) / 100);
  var sabilillahNominal = Math.round((totalZakat * pSabilillah) / 100);
  var amilNominal = Math.round((totalZakat * pAmil) / 100);

  var mustahikKelompokNominal = Math.round((mustahikNominal * pKelompok) / 100);
  var mustahikDaerahNominal = Math.round((mustahikNominal * pDaerah) / 100);

  var amilKelompokNominal = Math.round((totalZakat * pAmilKelompok) / 100);
  var amilDesaNominal = Math.round((totalZakat * pAmilDesa) / 100);
  var amilDaerahNominal = Math.round((totalZakat * pAmilDaerah) / 100);

  setNominal("zakatNominalMustahikSheet", mustahikNominal);
  setNominal("zakatNominalSabilillahSheet", sabilillahNominal);
  setNominal("zakatNominalAmilSheet", amilNominal);
  setNominal("zakatNominalMustahikKelompokSheet", mustahikKelompokNominal);
  setNominal("zakatNominalMustahikDaerahSheet", mustahikDaerahNominal);
  setNominal("zakatNominalAmilKelompokSheet", amilKelompokNominal);
  setNominal("zakatNominalAmilDesaSheet", amilDesaNominal);
  setNominal("zakatNominalAmilDaerahSheet", amilDaerahNominal);

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

  var totalPersen = pMustahik + pSabilillah + pAmil;
  var totalEl = document.getElementById("zakatTotalPersenSheet");
  if (totalEl) {
    totalEl.textContent = totalPersen + "%";
    totalEl.style.color = totalPersen === 100 ? "var(--pos)" : "var(--neg)";
  }

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
};

setValueIfExists = function (id, value) {
  var el = document.getElementById(id);
  if (el) {
    el.value = value;
  }
};

collectRincianFromSheet = function (zakat) {
  var groupsEl = document.getElementById("zakatRincianSheetGroups");
  if (!groupsEl)
    return { success: false, error: "Container rincian tidak ditemukan." };

  var result = { fitrah: null, maal: null };

  var jenisList = ["fitrah", "maal"];

  for (var k = 0; k < jenisList.length; k++) {
    var jenisKey = jenisList[k];
    var section = groupsEl.querySelector(
      '.zakat-rincian-section[data-jenis="' + jenisKey + '"]',
    );
    if (!section) continue;

    function getVal(field) {
      var input = section.querySelector(
        '.zakat-persen-input[data-field="' + field + '"]',
      );
      return input ? Number(input.value) || 0 : 0;
    }

    var mustahikPersen = getVal("mustahik");
    var sabilillahPersen = getVal("sabilillah");
    var amilPersen = getVal("amil");

    if (mustahikPersen + sabilillahPersen + amilPersen !== 100) {
      return {
        success: false,
        error:
          "Total persentase " +
          (jenisKey === "fitrah" ? "Zakat Fitrah" : "Zakat Maal") +
          " harus 100%!",
      };
    }

    var kelompokPersen = getVal("mustahikKelompok");
    var daerahPersen = getVal("mustahikDaerah");
    if (kelompokPersen + daerahPersen !== 100) {
      return {
        success: false,
        error:
          "Mustahik Kelompok + Daerah pada " +
          (jenisKey === "fitrah" ? "Zakat Fitrah" : "Zakat Maal") +
          " harus 100%!",
      };
    }

    var amilKelompokPersen = getVal("amilKelompok");
    var amilDesaPersen = getVal("amilDesa");
    var amilDaerahPersen = getVal("amilDaerah");
    if (amilKelompokPersen + amilDesaPersen + amilDaerahPersen !== amilPersen) {
      return {
        success: false,
        error:
          "Amil Kelompok + Desa + Daerah pada " +
          (jenisKey === "fitrah" ? "Zakat Fitrah" : "Zakat Maal") +
          " harus sama dengan persentase Amil!",
      };
    }

    var totalJenis = 0;
    if (zakat.rincian && zakat.rincian[jenisKey]) {
      totalJenis = Number(zakat.rincian[jenisKey].total) || 0;
    }

    var mustahikNominal = Math.round((totalJenis * mustahikPersen) / 100);
    var sabilillahNominal = Math.round((totalJenis * sabilillahPersen) / 100);
    var amilNominal = Math.round((totalJenis * amilPersen) / 100);

    var mustahikKelompokNominal = Math.round(
      (mustahikNominal * kelompokPersen) / 100,
    );
    var mustahikDaerahNominal = Math.round(
      (mustahikNominal * daerahPersen) / 100,
    );

    var amilKelompokNominal = Math.round(
      (totalJenis * amilKelompokPersen) / 100,
    );
    var amilDesaNominal = Math.round((totalJenis * amilDesaPersen) / 100);
    var amilDaerahNominal = Math.round((totalJenis * amilDaerahPersen) / 100);

    result[jenisKey] = {
      total: totalJenis,
      mustahik: {
        persen: mustahikPersen,
        nominal: mustahikNominal,
        kelompok: { persen: kelompokPersen, nominal: mustahikKelompokNominal },
        daerah: { persen: daerahPersen, nominal: mustahikDaerahNominal },
      },
      sabilillah: {
        persen: sabilillahPersen,
        nominal: sabilillahNominal,
      },
      amil: {
        persen: amilPersen,
        nominal: amilNominal,
        kelompok: { persen: amilKelompokPersen, nominal: amilKelompokNominal },
        desa: { persen: amilDesaPersen, nominal: amilDesaNominal },
        daerah: { persen: amilDaerahPersen, nominal: amilDaerahNominal },
      },
    };
  }

  return { success: true, rincian: result };
};

submitZakatRincianSheet = async function () {
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

  var btn = document.getElementById("zakatRincianSheetSubmit");
  isSubmittingRincian = true;
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    var newRincian = { fitrah: null, maal: null };

    if (typeof collectRincianFromSheet === "function") {
      var collected = collectRincianFromSheet(zakat);
      if (!collected || !collected.success) {
        showToast(
          (collected && collected.error) || "Rincian tidak valid.",
          "error",
        );
        return;
      }
      newRincian = collected.rincian;
    } else {
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
      if (
        amilKelompokPersen + amilDesaPersen + amilDaerahPersen !==
        amilPersen
      ) {
        showToast(
          "Amil Kelompok + Desa + Daerah harus sama dengan persentase Amil!",
          "error",
        );
        return;
      }

      var maalTotal =
        Number(
          (zakat.rincian && zakat.rincian.maal && zakat.rincian.maal.total) ||
            0,
        ) ||
        Number(zakat.total) ||
        0;

      var mustahikNominal = Math.round((maalTotal * mustahikPersen) / 100);
      var sabilillahNominal = Math.round((maalTotal * sabilillahPersen) / 100);
      var amilNominal = Math.round((maalTotal * amilPersen) / 100);

      var mustahikKelompokNominal = Math.round(
        (mustahikNominal * mustahikKelompokPersen) / 100,
      );
      var mustahikDaerahNominal = Math.round(
        (mustahikNominal * mustahikDaerahPersen) / 100,
      );

      var amilKelompokNominal = Math.round(
        (maalTotal * amilKelompokPersen) / 100,
      );
      var amilDesaNominal = Math.round((maalTotal * amilDesaPersen) / 100);
      var amilDaerahNominal = Math.round((maalTotal * amilDaerahPersen) / 100);

      newRincian.maal = {
        total: maalTotal,
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
          desa: { persen: amilDesaPersen, nominal: amilDesaNominal },
          daerah: { persen: amilDaerahPersen, nominal: amilDaerahNominal },
        },
      };
    }

    var merged = {};
    if (typeof sanitizeZakatRincian === "function") {
      merged = sanitizeZakatRincian({
        fitrah:
          newRincian.fitrah || (zakat.rincian && zakat.rincian.fitrah) || null,
        maal: newRincian.maal || (zakat.rincian && zakat.rincian.maal) || null,
      });
    } else {
      merged = {
        fitrah:
          newRincian.fitrah || (zakat.rincian && zakat.rincian.fitrah) || null,
        maal: newRincian.maal || (zakat.rincian && zakat.rincian.maal) || null,
      };
    }

    zakat.rincian = merged;
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
};

document.addEventListener("click", function (e) {
  var addMuzakiBtn = e.target.closest("[data-add-muzaki]");
  if (addMuzakiBtn) {
    e.preventDefault();
    var jenis = addMuzakiBtn.dataset.addMuzaki;
    var zakat = getZakatById(state.zakat.currentId);
    if (!zakat) return;
    if (!zakat.muzaki) zakat.muzaki = [];

    captureMuzakiSheetInputs(zakat);

    var nextIdx = ensureSheetIndexes(zakat.muzaki) + 1;
    zakat.muzaki.push(createNewSheetRow(nextIdx, jenis));

    pendingMuzakiCount = zakat.muzaki.filter(function (m) {
      return m._deleted !== true;
    }).length;

    renderMuzakiSheetRows(zakat);
    updateMuzakiSheetTotal(zakat);
    return;
  }

  var addMustahikBtn = e.target.closest("[data-add-mustahik]");
  if (addMustahikBtn) {
    e.preventDefault();
    var jenis2 = addMustahikBtn.dataset.addMustahik;
    var zakat2 = getZakatById(state.zakat.currentId);
    if (!zakat2) return;
    if (!zakat2.mustahik) zakat2.mustahik = [];

    captureMustahikSheetInputs(zakat2);

    var nextIdx2 = ensureSheetIndexes(zakat2.mustahik) + 1;
    zakat2.mustahik.push(createNewSheetRow(nextIdx2, jenis2));

    pendingMustahikCount = zakat2.mustahik.filter(function (m) {
      return m._deleted !== true;
    }).length;

    renderMustahikSheetRows(zakat2);
    updateMustahikSheetTotal(zakat2);
    return;
  }
});
