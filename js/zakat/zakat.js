let zakatDataLoading = false;
let zakatDataLoaded = false;

// normalizeJenisZakat/getJenisZakatLabel: definisi tunggal di zakat-helpers.js.

function groupMuzakiByJenis(muzakiList) {
  var groups = {};
  ZAKAT_JENIS_ORDER.forEach(function (j) {
    groups[j] = [];
  });

  (muzakiList || []).forEach(function (m) {
    if (m._deleted === true) return;
    var id = m.muzakki_id || m.muzaki_id || m.id;
    var name = m.muzakki_name || m.nama || "";
    if (!id || !String(id).startsWith("MZ")) return;
    if (!name || name.trim() === "") return;

    var j = normalizeJenisZakat(m.zakat_type || m.jenis_zakat);
    if (!groups[j]) j = "LAINNYA";
    groups[j].push(m);
  });

  return groups;
}

function groupMustahikByJenis(mustahikList) {
  var groups = {};
  ZAKAT_JENIS_ORDER.forEach(function (j) {
    groups[j] = [];
  });

  (mustahikList || []).forEach(function (m) {
    if (m._deleted === true) return;
    var id = m.mustahik_id || m.id;
    var name = m.mustahik_name || m.nama || "";
    if (!id || !String(id).startsWith("MS")) return;
    if (!name || name === "Unknown" || name.trim() === "") return;

    var j = normalizeJenisZakat(m.zakat_type || m.jenis_zakat);
    if (!groups[j]) j = "LAINNYA";
    groups[j].push(m);
  });

  return groups;
}

function sumNominal(list) {
  return (list || []).reduce(function (s, m) {
    return s + (Number(m.amount !== undefined ? m.amount : m.nominal) || 0);
  }, 0);
}

function ensureZakatState() {
  if (!state.zakat) {
    state.zakat = {
      list: [],
      currentId: null,
      isViewOpen: false,
      activeTab: "muzaki",
      _loaded: false,
      _loading: false,
    };
  }
  return state.zakat;
}

ensureZakatState();

var cachedZakat = getZakatData();
if (cachedZakat && cachedZakat.length > 0) {
  state.zakat.list = cachedZakat;
}

async function loadZakatData() {
  ensureZakatState();

  if (zakatDataLoading) {
    return new Promise(function (resolve) {
      var checkInterval = setInterval(function () {
        if (!zakatDataLoading) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  zakatDataLoading = true;

  try {
    showZakatLoader("Memuat data...");

    var zakatResult = await apiGetZakatList();

    if (zakatResult && zakatResult.success === true) {
      var data = zakatResult.data || [];
      if (Array.isArray(data) && data.length > 0) {
        state.zakat.list = data;
        saveZakatData(state.zakat.list);
        zakatDataLoaded = true;
      } else {
        var cached = getZakatData();
        if (cached && cached.length > 0) {
          state.zakat.list = cached;
        } else {
          state.zakat.list = [];
        }
        zakatDataLoaded = true;
      }
    } else {
      var cached = getZakatData();
      if (cached && cached.length > 0) {
        state.zakat.list = cached;
      } else {
        state.zakat.list = [];
      }
      zakatDataLoaded = true;
    }

    renderZakatList();

    if (state.zakat.isViewOpen && state.zakat.currentId) {
      var zakat = getZakatById(state.zakat.currentId);
      if (zakat) {
        setTimeout(function () {
          renderZakatMuzakiView(zakat);
          renderZakatRincianView(zakat);
          renderZakatMustahikView(zakat);
        }, 50);
      }
    }

    hideZakatLoader();
  } catch (err) {
    var cached = getZakatData();
    if (cached && cached.length > 0) {
      state.zakat.list = cached;
    } else {
      state.zakat.list = [];
    }
    renderZakatList();
    hideZakatLoader();
  } finally {
    zakatDataLoading = false;
  }
}

async function forceLoadZakat() {
  ensureZakatState();
  showZakatLoader("Memuat ulang data...");
  try {
    var result = await apiGetZakatList();
    if (result && result.success && result.data && result.data.length > 0) {
      state.zakat.list = result.data;
      saveZakatData(state.zakat.list);
      zakatDataLoaded = true;
      renderZakatList();
      hideZakatLoader();
      showToast(
        "Data berhasil dimuat (" + state.zakat.list.length + " zakat)",
        "success",
      );
      return true;
    } else {
      hideZakatLoader();
      showToast("Tidak ada data dari server", "warning");
      return false;
    }
  } catch (e) {
    hideZakatLoader();
    showToast("Error: " + e.message, "error");
    return false;
  }
}

async function forceReloadZakatData() {
  zakatDataLoaded = false;
  showZakatLoader("Memuat ulang data...");
  try {
    var result = await apiGetZakatList();
    if (result && result.success && result.data && result.data.length > 0) {
      state.zakat.list = result.data;
      saveZakatData(state.zakat.list);
      zakatDataLoaded = true;
      renderZakatList();
      hideZakatLoader();
      showToast("Data berhasil dimuat ulang!", "success");
    } else {
      hideZakatLoader();
      showToast("Gagal memuat data dari server", "error");
    }
  } catch (e) {
    hideZakatLoader();
    showToast("Error: " + e.message, "error");
  }
}

async function loadMastersData(forceRefresh) {
  try {
    var cacheExpiry = 5 * 60 * 1000;
    var lastFetch = localStorage.getItem("master_last_fetch");
    var now = Date.now();

    if (forceRefresh || !lastFetch || now - parseInt(lastFetch) > cacheExpiry) {
      masterMuzakiCache = {};
      masterMustahikCache = {};

      var result = await apiGetMasters();
      if (result && result.success) {
        var data = result.data || {};
        state.masterMuzaki = data.muzaki || [];
        state.masterMustahik = data.mustahik || [];
        localStorage.setItem(
          "master_muzaki",
          JSON.stringify(state.masterMuzaki),
        );
        localStorage.setItem(
          "master_mustahik",
          JSON.stringify(state.masterMustahik),
        );
        localStorage.setItem("master_last_fetch", String(now));
        return true;
      }
      return false;
    }

    var storedMuzaki = localStorage.getItem("master_muzaki");
    var storedMustahik = localStorage.getItem("master_mustahik");

    if (storedMuzaki && storedMustahik) {
      try {
        state.masterMuzaki = JSON.parse(storedMuzaki);
        state.masterMustahik = JSON.parse(storedMustahik);
        return true;
      } catch (e) {}
    }

    return false;
  } catch (e) {
    console.error("Failed to load masters data:", e);
    return false;
  }
}

function loadMuzakiSuggestions() {
  if (state && state.masterMuzaki && state.masterMuzaki.length > 0) {
    const names = state.masterMuzaki
      .filter(function (m) {
        return m.status !== "DELETED";
      })
      .map(function (m) {
        return m.nama || "";
      })
      .filter(function (n) {
        return n.trim() !== "";
      });
    return names.sort();
  }

  try {
    const stored = localStorage.getItem("master_muzaki");
    if (stored) {
      const parsed = JSON.parse(stored);
      const names = parsed
        .filter(function (m) {
          return m.status !== "DELETED";
        })
        .map(function (m) {
          return m.nama || "";
        })
        .filter(function (n) {
          return n.trim() !== "";
        });
      return names.sort();
    }
  } catch (e) {
    console.warn("Failed to load muzaki from localStorage:", e);
  }

  console.warn("⚠️ No muzaki suggestions found");
  return [];
}

function loadMustahikSuggestions() {
  if (!state.masterMustahik || state.masterMustahik.length === 0) {
    loadMastersData();
  }

  if (!state.masterMustahik || state.masterMustahik.length === 0) {
    return [];
  }

  return state.masterMustahik.map(function (m) {
    return m.nama;
  });
}

function refreshMasterMustahikData() {
  return new Promise(function (resolve, reject) {
    loadMastersData()
      .then(function () {
        showToast("Data master mustahik berhasil di-refresh.", "success");
        resolve(true);
      })
      .catch(function (err) {
        showToast("Gagal refresh data master.", "error");
        reject(err);
      });
  });
}

async function refreshZakatData() {
  zakatDataLoaded = false;
  await loadZakatData();
}

function forceReloadMasters() {
  return new Promise(function (resolve, reject) {
    state.masterMuzaki = null;
    state.masterMustahik = null;
    masterMuzakiCache = {};
    masterMustahikCache = {};
    localStorage.removeItem("master_muzaki");
    localStorage.removeItem("master_mustahik");

    loadMastersData(true)
      .then(function (result) {
        if (result) {
          resolve(true);
        } else {
          reject(new Error("Failed to load masters data"));
        }
      })
      .catch(function (err) {
        reject(err);
      });
  });
}

async function refreshSingleZakat(id) {
  try {
    var result = await apiGetZakatDetail(id);

    var fresh = null;
    if (result && result.success && result.data) {
      fresh = Array.isArray(result.data) ? result.data[0] : result.data;
    } else if (result && result.id) {
      fresh = result;
    }

    if (!fresh) return false;

    var idx = state.zakat.list.findIndex(function (z) {
      return z.id === id;
    });

    if (idx !== -1) {
      state.zakat.list[idx] = fresh;
    } else {
      state.zakat.list.push(fresh);
    }

    saveZakatData(state.zakat.list);
    return true;
  } catch (e) {
    return false;
  }
}

async function syncZakatToBackend(data) {
  ensureZakatState();

  try {
    var existing = state.zakat.list.find(function (z) {
      return z.id === data.id;
    });

    if (existing) {
      var result = await apiUpdateZakat(data);
      if (result && result.success) {
        var idx = state.zakat.list.findIndex(function (z) {
          return z.id === data.id;
        });
        if (idx !== -1) {
          state.zakat.list[idx] = data;
          saveZakatData(state.zakat.list);
        }
        return {
          success: true,
          message: result.message || "Zakat berhasil diperbarui",
        };
      } else {
        var idx = state.zakat.list.findIndex(function (z) {
          return z.id === data.id;
        });
        if (idx !== -1) {
          state.zakat.list[idx] = data;
          saveZakatData(state.zakat.list);
        }
        return {
          success: false,
          message: result?.message || "Gagal update zakat, data disimpan lokal",
          offline: true,
        };
      }
    } else {
      var result = await apiCreateZakat(data);
      if (result && result.success) {
        if (result.data && result.data.id) {
          data.id = result.data.id;
        }
        if (
          !state.zakat.list.find(function (z) {
            return z.id === data.id;
          })
        ) {
          state.zakat.list.push(data);
          saveZakatData(state.zakat.list);
        }
        return {
          success: true,
          message: result.message || "Zakat berhasil dibuat",
        };
      } else {
        if (
          !state.zakat.list.find(function (z) {
            return z.id === data.id;
          })
        ) {
          state.zakat.list.push(data);
          saveZakatData(state.zakat.list);
        }
        return {
          success: false,
          message: result?.message || "Gagal create zakat, data disimpan lokal",
          offline: true,
        };
      }
    }
  } catch (err) {
    var existing = state.zakat.list.find(function (z) {
      return z.id === data.id;
    });
    if (!existing) {
      state.zakat.list.push(data);
    } else {
      var idx = state.zakat.list.findIndex(function (z) {
        return z.id === data.id;
      });
      if (idx !== -1) {
        state.zakat.list[idx] = data;
      }
    }
    saveZakatData(state.zakat.list);
    renderZakatList();

    return {
      success: false,
      message: err.message || "Gagal sync, data disimpan lokal",
      offline: true,
    };
  }
}

async function createZakat() {
  var now = new Date();
  var newZakat = createZakatItem({
    title:
      "Zakat " +
      now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    tanggal: now.toISOString().slice(0, 10),
  });

  showZakatLoader("Membuat zakat baru...");

  try {
    var result = await syncZakatToBackend(newZakat);
    if (result.success) {
      renderZakatList();
      openZakatDetail(newZakat.id);
      showToast("Zakat baru berhasil dibuat!", "success");
    } else {
      renderZakatList();
      openZakatDetail(newZakat.id);
      showToast("Zakat dibuat (offline mode)", "warning");
    }
  } catch (err) {
    state.zakat.list.push(newZakat);
    saveZakatData(state.zakat.list);
    renderZakatList();
    openZakatDetail(newZakat.id);
    showToast("Zakat dibuat (offline mode)", "warning");
  } finally {
    hideZakatLoader();
  }
}

async function deleteZakat(id) {
  showZakatLoader("Menghapus zakat...");

  try {
    var result = await apiDeleteZakat(id);
    if (result.success) {
      state.zakat.list = state.zakat.list.filter(function (z) {
        return z.id !== id;
      });
      saveZakatData(state.zakat.list);
      renderZakatList();
      if (state.zakat.currentId === id) {
        closeZakatDetail();
      }
      showToast("Zakat berhasil dihapus.", "info");
    } else {
      state.zakat.list = state.zakat.list.filter(function (z) {
        return z.id !== id;
      });
      saveZakatData(state.zakat.list);
      renderZakatList();
      if (state.zakat.currentId === id) {
        closeZakatDetail();
      }
      showToast("Zakat dihapus (offline mode)", "warning");
    }
  } catch (err) {
    state.zakat.list = state.zakat.list.filter(function (z) {
      return z.id !== id;
    });
    saveZakatData(state.zakat.list);
    renderZakatList();
    if (state.zakat.currentId === id) {
      closeZakatDetail();
    }
    showToast("Zakat dihapus (offline mode)", "warning");
  } finally {
    hideZakatLoader();
  }
}

function showZakatDeleteConfirm(id) {
  var zakat = getZakatById(id);
  if (!zakat) return;

  var overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "zakatDeleteConfirm";
  overlay.innerHTML = `
    <div class="card modal-box p-5" style="max-width:380px;">
      <div class="modal-icon" style="background:var(--neg-soft);color:var(--neg);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>
        </svg>
      </div>
      <h3 class="font-display text-[15.5px] font-extrabold text-center mt-3">Hapus Zakat?</h3>
      <p class="text-[12.5px] text-[color:var(--ink-soft)] text-center mt-1.5">
        Zakat "<strong>${escapeHtml(zakat.title)}</strong>" akan dihapus permanen.
      </p>
      <div class="flex gap-2.5 pt-4">
        <button type="button" id="zakatDeleteCancel" class="btn-ghost flex-1">Batal</button>
        <button type="button" id="zakatDeleteConfirm" class="btn-primary flex-1" style="background:var(--neg);">Hapus</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay
    .querySelector("#zakatDeleteCancel")
    .addEventListener("click", function () {
      overlay.remove();
    });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) overlay.remove();
  });

  overlay
    .querySelector("#zakatDeleteConfirm")
    .addEventListener("click", async function () {
      overlay.remove();
      await deleteZakat(id);
    });
}

let zakatEditingId = null;

function openZakatForm(zakatId) {
  zakatId = zakatId || null;
  var overlay = document.getElementById("zakatFormOverlay");
  var titleEl = document.getElementById("zakatFormSheetTitle");
  var subtitleEl = document.getElementById("zakatFormSheetSubtitle");
  var titleInput = document.getElementById("zakatFormTitleInput");
  var keteranganInput = document.getElementById("zakatFormKeterangan");
  var tanggalInput = document.getElementById("zakatFormTanggal");
  var tempatInput = document.getElementById("zakatFormTempat");

  if (!overlay) return;

  zakatEditingId = zakatId;

  if (zakatId) {
    if (titleEl) titleEl.textContent = "Edit Zakat";
    if (subtitleEl) subtitleEl.textContent = "Ubah data kegiatan zakat";

    var zakat = getZakatById(zakatId);
    if (zakat) {
      if (titleInput) titleInput.value = zakat.title || "";
      if (keteranganInput) keteranganInput.value = zakat.keterangan || "";
      if (tanggalInput) tanggalInput.value = zakat.tanggal || "";
      if (tempatInput) tempatInput.value = zakat.tempat || "";
    }
  } else {
    if (titleEl) titleEl.textContent = "Buat Zakat Baru";
    if (subtitleEl) subtitleEl.textContent = "Isi data kegiatan zakat";

    if (titleInput) titleInput.value = "";
    if (keteranganInput) keteranganInput.value = "";
    if (tanggalInput)
      tanggalInput.value = new Date().toISOString().slice(0, 10);
    if (tempatInput) tempatInput.value = "";
  }

  overlay.classList.remove("hidden");

  setTimeout(function () {
    initZakatDatePicker();
  }, 200);
}

function closeZakatForm(showList) {
  showList = showList !== undefined ? showList : true;
  var overlay = document.getElementById("zakatFormOverlay");
  var listContainer = document.getElementById("zakatListContainer");
  var fabZakat = document.getElementById("fabZakat");

  if (overlay) {
    overlay.classList.add("hidden");
  }

  if (showList && listContainer) {
    listContainer.style.display = "block";
  }

  if (fabZakat) {
    fabZakat.classList.remove("hidden");
  }

  zakatEditingId = null;

  var titleInput = document.getElementById("zakatFormTitleInput");
  var keteranganInput = document.getElementById("zakatFormKeterangan");
  var tempatInput = document.getElementById("zakatFormTempat");

  if (titleInput) titleInput.value = "";
  if (keteranganInput) keteranganInput.value = "";
  if (tempatInput) tempatInput.value = "";

  var screenTitle = document.getElementById("zakatScreenTitle");
  if (screenTitle) {
    screenTitle.textContent = "Manajemen Zakat";
  }

  if (state.zakat && state.zakat.isViewOpen) {
    closeZakatDetail();
  }

  setTimeout(function () {
    initZakatDatePicker();
  }, 300);

  renderZakatList();
}

async function submitZakatForm() {
  var title = document.getElementById("zakatFormTitleInput").value.trim();
  var keterangan = document.getElementById("zakatFormKeterangan").value.trim();
  var tanggal = document.getElementById("zakatFormTanggal").value;
  var tempat = document.getElementById("zakatFormTempat").value.trim();

  if (title.length < 3 || title.length > 120) {
    showToast("Judul wajib 3–120 karakter.", "error");
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal || "")) {
    showToast("Tanggal tidak valid (format: YYYY-MM-DD).", "error");
    return;
  }
  var parts = tanggal.split("-");
  var check = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (
    check.getFullYear() !== Number(parts[0]) ||
    check.getMonth() !== Number(parts[1]) - 1 ||
    check.getDate() !== Number(parts[2])
  ) {
    showToast("Tanggal tidak valid (mis. 30 Februari).", "error");
    return;
  }
  if (tempat.length > 120) {
    showToast("Tempat maksimal 120 karakter.", "error");
    return;
  }

  var btn = document.getElementById("zakatFormSubmit");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    var zakatData;
    var isEdit = false;

    if (zakatEditingId) {
      var existing = getZakatById(zakatEditingId);
      if (!existing) {
        showToast("Zakat tidak ditemukan.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      isEdit = true;
      zakatData = {
        ...existing,
        zakat_id: existing.zakat_id || existing.id,
        title: title,
        notes: keterangan,
        transaction_date: tanggal,
        location: tempat,
        updated_at: new Date().toISOString(),
      };
    } else {
      zakatData = createZakatItem({
        title: title,
        notes: keterangan,
        transaction_date: tanggal,
        location: tempat,
      });
    }

    showZakatLoader(isEdit ? "Mengupdate zakat..." : "Membuat zakat baru...");
    var result = await syncZakatToBackend(zakatData);

    closeZakatForm();

    if (result.success) {
      showToast(
        isEdit ? "Zakat berhasil diperbarui!" : "Zakat berhasil dibuat!",
        "success",
      );
    } else {
      if (result.offline) {
        showToast(result.message || "Data disimpan lokal", "warning");
      } else {
        showToast(result.message || "Gagal menyimpan zakat", "error");
      }
    }

    renderZakatList();

    if (!isEdit) {
      var newZakat = getZakatById(zakatData.id);
      if (newZakat) {
        openZakatDetail(newZakat.id);
      }
    } else {
      if (state.zakat.isViewOpen && state.zakat.currentId === zakatData.id) {
        openZakatDetail(zakatData.id);
      }
    }
  } catch (err) {
    showToast("Gagal menyimpan zakat: " + err.message, "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

function openEditZakatHeader() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var overlay = document.getElementById("zakatEditHeaderOverlay");
  if (!overlay) return;

  document.getElementById("zakatEditHeaderTitle").value = zakat.title || "";
  document.getElementById("zakatEditHeaderKeterangan").value =
    zakat.notes || zakat.keterangan || "";
  document.getElementById("zakatEditHeaderTanggal").value =
    zakat.transaction_date || zakat.tanggal || "";
  document.getElementById("zakatEditHeaderTempat").value =
    zakat.location || zakat.tempat || "";

  overlay.classList.remove("hidden");
}

function closeEditZakatHeader() {
  var overlay = document.getElementById("zakatEditHeaderOverlay");
  if (overlay) overlay.classList.add("hidden");
}

async function submitEditZakatHeader() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var title = document.getElementById("zakatEditHeaderTitle").value.trim();
  var keterangan = document
    .getElementById("zakatEditHeaderKeterangan")
    .value.trim();
  var tanggal = document.getElementById("zakatEditHeaderTanggal").value;
  var tempat = document.getElementById("zakatEditHeaderTempat").value.trim();

  if (title.length < 3 || title.length > 120) {
    showToast("Judul wajib 3–120 karakter.", "error");
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal || "")) {
    showToast("Tanggal tidak valid (format: YYYY-MM-DD).", "error");
    return;
  }

  var btn = document.getElementById("zakatEditHeaderSubmit");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    zakat.title = title;
    zakat.notes = keterangan;
    zakat.keterangan = keterangan;
    zakat.transaction_date = tanggal;
    zakat.tanggal = tanggal;
    zakat.location = tempat;
    zakat.tempat = tempat;
    zakat.updated_at = new Date().toISOString();
    zakat.updatedAt = zakat.updated_at;

    var idx = state.zakat.list.findIndex(function (z) {
      return (z.zakat_id || z.id) === (zakat.zakat_id || zakat.id);
    });
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    showZakatLoader("Menyimpan data header...");
    var result = await apiUpdateZakatHeader({
      zakat_id: zakat.zakat_id || zakat.id,
      title: zakat.title,
      notes: keterangan,
      transaction_date: tanggal,
      location: tempat,
    });

    if (result.success) {
      updateZakatDetailHeader(zakat);
      closeEditZakatHeader();
      showToast("Data zakat berhasil diperbarui!", "success");
    } else {
      updateZakatDetailHeader(zakat);
      closeEditZakatHeader();
      showToast("Data header disimpan (offline mode)", "warning");
    }

    renderZakatList();
  } catch (err) {
    showToast("Gagal menyimpan: " + err.message, "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

async function completeZakat(zakatId) {
  var zakat = state.zakat.list.find(function (z) {
    return z.id === zakatId;
  });

  if (!zakat) {
    showToast("Zakat tidak ditemukan", "error");
    return;
  }

  if (isZakatCompleted(zakat)) {
    showToast("Zakat sudah ditandai selesai", "warning");
    return;
  }

  var previousStatus = zakat.status;
  var previousCompletedAt = zakat.completedAt;

  zakat.status = ZAKAT_STATUS.COMPLETED;
  zakat.completedAt = new Date().toISOString();

  var idx = state.zakat.list.findIndex(function (z) {
    return z.id === zakatId;
  });
  if (idx !== -1) {
    state.zakat.list[idx] = zakat;
  }

  saveZakatData(state.zakat.list);

  renderZakatList(state.zakat.list);
  if (state.zakat.isViewOpen) {
    renderZakatDetailDirect(zakatId);
  }

  showToast("Menyimpan perubahan...", "info");

  try {
    var result = await apiCompleteZakat({ id: zakatId });

    if (result && result.success) {
      showToast(
        "Zakat <strong>" +
          escapeHtml(zakat.title) +
          "</strong> ditandai selesai.",
        "success",
      );
      await loadZakatData();
      if (state.zakat.isViewOpen) {
        renderZakatDetailDirect(zakatId);
      }
    } else {
      zakat.status = previousStatus;
      zakat.completedAt = previousCompletedAt;
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
      }
      saveZakatData(state.zakat.list);
      renderZakatList(state.zakat.list);
      if (state.zakat.isViewOpen) {
        renderZakatDetailDirect(zakatId);
      }
      showToast(result?.message || "Gagal menyimpan perubahan", "error");
    }
  } catch (err) {
    zakat.status = previousStatus;
    zakat.completedAt = previousCompletedAt;
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
    }
    saveZakatData(state.zakat.list);
    renderZakatList(state.zakat.list);
    if (state.zakat.isViewOpen) {
      renderZakatDetailDirect(zakatId);
    }
    showToast("Gagal terhubung ke server", "error");
  }
}

async function cancelCompleteZakat(zakatId) {
  var zakat = state.zakat.list.find(function (z) {
    return z.id === zakatId;
  });

  if (!zakat) {
    showToast("Zakat tidak ditemukan", "error");
    return;
  }

  if (!isZakatCompleted(zakat)) {
    showToast("Zakat tidak dalam status selesai", "warning");
    return;
  }

  var previousStatus = zakat.status;
  var previousCompletedAt = zakat.completedAt;

  zakat.status = ZAKAT_STATUS.ACTIVE;
  delete zakat.completedAt;

  var idx = state.zakat.list.findIndex(function (z) {
    return z.id === zakatId;
  });
  if (idx !== -1) {
    state.zakat.list[idx] = zakat;
  }

  saveZakatData(state.zakat.list);

  renderZakatList(state.zakat.list);
  if (state.zakat.isViewOpen) {
    renderZakatDetailDirect(zakatId);
  }

  showToast("Menyimpan perubahan...", "info");

  try {
    var result = await apiCancelCompleteZakat({ id: zakatId });

    if (result && result.success) {
      showToast(
        `Status selesai dibatalkan. Zakat <strong>${escapeHtml(zakat.title)}</strong> kembali aktif.`,
        "success",
      );
      await loadZakatData();
      if (state.zakat.isViewOpen) {
        renderZakatDetailDirect(zakatId);
      }
    } else {
      zakat.status = previousStatus;
      zakat.completedAt = previousCompletedAt;
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
      }
      saveZakatData(state.zakat.list);
      renderZakatList(state.zakat.list);
      if (state.zakat.isViewOpen) {
        renderZakatDetailDirect(zakatId);
      }
      showToast(result?.message || "Gagal menyimpan perubahan", "error");
    }
  } catch (err) {
    zakat.status = previousStatus;
    zakat.completedAt = previousCompletedAt;
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
    }
    saveZakatData(state.zakat.list);
    renderZakatList(state.zakat.list);
    if (state.zakat.isViewOpen) {
      renderZakatDetailDirect(zakatId);
    }
    showToast("Gagal terhubung ke server", "error");
  }
}

function updateZakatDetailActions(zakat) {
  var btnToggle = document.getElementById("btnToggleCompleteZakat");
  var iconComplete = document.getElementById("iconComplete");
  var iconCancelComplete = document.getElementById("iconCancelComplete");
  var toggleLabel = document.getElementById("btnToggleCompleteLabel");
  var btnPrint = document.getElementById("btnPrintZakat");
  var btnDelete = document.getElementById("btnDeleteZakat");

  var isCompleted = isZakatCompleted(zakat);
  var isActive = zakat.status === "ACTIVE";

  if (btnToggle) {
    if (isCompleted) {
      btnToggle.className = "dropdown-item";
      if (iconComplete) iconComplete.style.display = "none";
      if (iconCancelComplete) iconCancelComplete.style.display = "inline-block";
      if (toggleLabel) toggleLabel.textContent = "Batalkan Selesai";
      btnToggle.title = "Batalkan Status Selesai";
      btnToggle.style.opacity = "1";
      btnToggle.style.pointerEvents = "auto";
    } else {
      btnToggle.className = "dropdown-item";
      if (iconComplete) iconComplete.style.display = "inline-block";
      if (iconCancelComplete) iconCancelComplete.style.display = "none";
      if (toggleLabel) toggleLabel.textContent = "Tandai Selesai";
      btnToggle.title = "Tandai Zakat Selesai";
      btnToggle.style.opacity = isActive ? "1" : "0.4";
      btnToggle.style.pointerEvents = isActive ? "auto" : "none";
    }
  }

  if (btnPrint) {
    btnPrint.style.opacity = "1";
    btnPrint.style.pointerEvents = "auto";
  }

  var btnEdit = document.getElementById("btnEditZakatHeader");
  if (btnEdit) {
    btnEdit.style.opacity = isActive ? "1" : "0.4";
    btnEdit.style.pointerEvents = isActive ? "auto" : "none";
  }

  if (btnDelete) {
    if (isCompleted) {
      btnDelete.style.opacity = "0.4";
      btnDelete.style.pointerEvents = "none";
      btnDelete.title = "Tidak dapat menghapus zakat yang sudah selesai";
    } else {
      btnDelete.style.opacity = isActive ? "1" : "0.4";
      btnDelete.style.pointerEvents = isActive ? "auto" : "none";
      btnDelete.title = "Hapus Zakat";
    }
  }
}

function updateZakatDetailStatus(zakat) {
  var statusContainer = document.getElementById("zakatDetailStatus");
  if (!statusContainer) {
    statusContainer = document.querySelector(".zakat-detail-status");
  }
  if (!statusContainer) return;

  var status = zakat.status || "ACTIVE";
  var statusClass = ZAKAT_STATUS_CLASSES[status] || "active";
  var statusLabel = ZAKAT_STATUS_LABELS[status] || status;

  statusContainer.className = "zakat-detail-status-badge " + statusClass;
  statusContainer.innerHTML = `
    <span class="status-dot"></span>
    <span class="status-label">${statusLabel}</span>
  `;
}

function openZakatDetail(id) {
  if (typeof router !== "undefined" && router) {
    router.navigateTo("zakat-detail", true, { id: id });
    return;
  }

  renderZakatDetailDirect(id);
}

async function initZakatDetailRoute(id) {
  if (!id) return;

  state.zakat.currentId = id;
  state.zakat.isViewOpen = true;

  var cachedZakat = getZakatById(id);
  if (cachedZakat) {
    renderZakatDetailDirect(id);
  }

  var refreshed = await refreshSingleZakat(id);

  if (!refreshed) {
    await loadZakatData();
  }

  var zakat = getZakatById(id);

  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  renderZakatDetailDirect(id, { keepTab: true });
  updateZakatFilterVisibility();
}

function renderZakatDetailDirect(id, options) {
  options = options || {};
  var keepTab = options.keepTab === true;

  var zakat = getZakatById(id);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var isSameZakat = state.zakat.currentId === id;
  if (!isSameZakat) {
    state.zakat.activeTab = "muzaki";
  }

  state.zakat.currentId = id;
  state.zakat.isViewOpen = true;

  var zakatScreen = document.getElementById("screen-zakat");
  if (zakatScreen) {
    zakatScreen.classList.add("active");
  }

  closeZakatFilterSheet();
  updateZakatFilterVisibility();

  var listContainer = document.getElementById("zakatListContainer");
  var formContainer = document.getElementById("zakatFormContainer");
  var detailContainer = document.getElementById("zakatDetailContainer");
  var fabZakat = document.getElementById("fabZakat");
  var screenTitle = document.getElementById("zakatScreenTitle");

  if (listContainer) listContainer.style.display = "none";
  if (formContainer) formContainer.classList.add("hidden");
  if (detailContainer) detailContainer.classList.remove("hidden");
  if (fabZakat) fabZakat.classList.add("hidden");
  if (screenTitle) screenTitle.textContent = "Detail Zakat";

  updateZakatDetailHeader(zakat);
  updateZakatDetailStatus(zakat);
  updateZakatDetailActions(zakat);

  renderZakatMuzakiView(zakat);
  renderZakatRincianView(zakat);
  renderZakatMustahikView(zakat);

  setTimeout(function () {
    initZakatActionsDropdown();
  }, 100);

  if (!keepTab) {
    var tabs = document.querySelectorAll(".zakat-tab");
    var panels = {
      muzaki: document.getElementById("zakatTabMuzaki"),
      rincian: document.getElementById("zakatTabRincian"),
      mustahik: document.getElementById("zakatTabMustahik"),
    };

    var targetTab = state.zakat.activeTab || "muzaki";
    if (!panels[targetTab]) targetTab = "muzaki";

    tabs.forEach(function (t) {
      t.classList.remove("active");
      t.style.background = "var(--surface)";
      t.style.color = "var(--ink-soft)";
    });

    Object.keys(panels).forEach(function (key) {
      var panel = panels[key];
      if (panel) {
        panel.classList.remove("active");
        panel.style.display = "none";
      }
    });

    var activeTabBtn = document.querySelector(
      '.zakat-tab[data-zakat-tab="' + targetTab + '"]',
    );
    if (activeTabBtn) {
      activeTabBtn.classList.add("active");
      activeTabBtn.style.background = "var(--brand)";
      activeTabBtn.style.color = "#fff";
    }

    var activePanel = panels[targetTab];
    if (activePanel) {
      activePanel.classList.add("active");
      activePanel.style.display = "block";
    }

    if (targetTab === "rincian") {
      renderZakatRincianTab(zakat);
    } else if (targetTab === "mustahik") {
      renderZakatMustahikTab(zakat);
    } else {
      renderZakatMuzakiTab(zakat);
    }
  }
}

function closeZakatDetail() {
  if (typeof router !== "undefined" && router) {
    router.navigateTo("zakat", true);
    return;
  }

  closeZakatDetailDirect();
}

function closeZakatDetailDirect() {
  var listContainer = document.getElementById("zakatListContainer");
  var detailContainer = document.getElementById("zakatDetailContainer");
  var fabZakat = document.getElementById("fabZakat");
  var screenTitle = document.getElementById("zakatScreenTitle");

  if (listContainer) {
    listContainer.style.display = "block";
  }

  if (detailContainer) {
    detailContainer.classList.add("hidden");
  }

  if (fabZakat) {
    fabZakat.classList.remove("hidden");
  }

  if (screenTitle) {
    screenTitle.textContent = "Manajemen Zakat";
  }

  state.zakat.isViewOpen = false;
  state.zakat.currentId = null;

  updateZakatFilterVisibility();
  closeZakatFilterSheet();

  renderZakatList(state.zakat.list);

  var tabs = document.querySelectorAll(".zakat-tab");
  tabs.forEach(function (tab) {
    tab.classList.remove("active");
    tab.style.background = "var(--surface)";
    tab.style.color = "var(--ink-soft)";
  });

  var firstTab = document.querySelector('.zakat-tab[data-zakat-tab="muzaki"]');
  if (firstTab) {
    firstTab.classList.add("active");
    firstTab.style.background = "var(--brand)";
    firstTab.style.color = "#fff";
  }

  var panels = ["zakatTabMuzaki", "zakatTabRincian", "zakatTabMustahik"];
  panels.forEach(function (id) {
    var panel = document.getElementById(id);
    if (panel) {
      panel.classList.remove("active");
      panel.style.display = "none";
    }
  });

  var muzakiPanel = document.getElementById("zakatTabMuzaki");
  if (muzakiPanel) {
    muzakiPanel.classList.add("active");
    muzakiPanel.style.display = "block";
  }
}

function updateZakatDetailHeader(zakat) {
  var titleEl = document.getElementById("zakatDetailTitle");
  var metaEl = document.getElementById("zakatDetailMeta");
  var ketEl = document.getElementById("zakatDetailKeterangan");
  var totalEl = document.getElementById("zakatDetailTotal");
  var statusEl = document.getElementById("zakatDetailStatus");

  if (titleEl) titleEl.textContent = zakat.title || "Judul Zakat";

  if (metaEl) {
    var tanggal = zakat.tanggal ? fmtDateShort(zakat.tanggal) : "-";
    var tempat = zakat.tempat || "Tempat tidak ditentukan";
    metaEl.textContent = tanggal + " · " + tempat;
  }

  if (ketEl) {
    ketEl.textContent = zakat.keterangan || "Tidak ada keterangan";
  }

  if (totalEl) {
    totalEl.textContent = fmtRp(zakat.total || 0);
  }

  if (statusEl) {
    updateZakatDetailStatus(zakat);
  }
}

function renderZakatMuzakiTab(zakat) {
  var container = document.getElementById("zakatMuzakiList");
  var countInput = document.getElementById("zakatMuzakiCount");
  var totalDisplay = document.getElementById("zakatMuzakiTotal");

  if (!container || !countInput) return;

  var muzakiList = zakat.muzaki || [];
  var count = Math.max(muzakiList.length || 1, 1);
  countInput.value = count;

  var allNames = getAllMuzakiNames();

  function renderMuzakiRows() {
    var currentCount = parseInt(countInput.value) || 1;

    var existingData = [];
    for (var i = 0; i < Math.min(currentCount, muzakiList.length); i++) {
      if (muzakiList[i]) {
        existingData.push(muzakiList[i]);
      }
    }
    while (existingData.length < currentCount) {
      existingData.push({ id: "", nama: "", nominal: 0 });
    }

    var rows = [];
    for (var i = 0; i < currentCount; i++) {
      var existing = existingData[i] || { nama: "", nominal: 0 };

      var usedNames = [];
      for (var j = 0; j < i; j++) {
        var prevRow = document.querySelector(
          '.zakat-muzaki-row[data-index="' + j + '"]',
        );
        if (prevRow) {
          var nameInput = prevRow.querySelector(".zakat-muzaki-name");
          if (nameInput && nameInput.value) {
            usedNames.push(nameInput.value);
          }
        }
      }

      rows.push(`
        <div class="zakat-muzaki-row" data-index="${i}">
          <div class="zakat-name-wrapper" style="position:relative;flex:1;">
            <input type="text" class="field-input zakat-muzaki-name" 
                   placeholder="Nama Muzaki ${i + 1}" 
                   value="${escapeHtml(existing.nama || "")}" 
                   data-index="${i}"
                   list="suggest-muzaki-${i}"
                   autocomplete="off"
                   style="width:100%;">
            <datalist id="suggest-muzaki-${i}">
              ${allNames
                .filter(function (n) {
                  var lower = n.toLowerCase().trim();
                  var isUsed = usedNames.some(function (s) {
                    return s.toLowerCase().trim() === lower;
                  });
                  var isSelf = n === existing.nama;
                  return !isUsed || isSelf;
                })
                .map(function (n) {
                  return '<option value="' + escapeHtml(n) + '">';
                })
                .join("")}
            </datalist>
            ${existing.nama ? '<span class="zakat-name-badge">✓</span>' : ""}
          </div>
          <input type="number" class="field-input zakat-muzaki-nominal" 
                 placeholder="Nominal" 
                 value="${existing.nominal || ""}" 
                 data-index="${i}" 
                 min="0" step="1000"
                 style="max-width:140px;">
        </div>
      `);
    }

    container.innerHTML = rows.join("");

    container
      .querySelectorAll(".zakat-muzaki-nominal")
      .forEach(function (input) {
        input.addEventListener("input", updateMuzakiTotal);
      });

    container.querySelectorAll(".zakat-muzaki-name").forEach(function (input) {
      var idx = parseInt(input.dataset.index);

      input.addEventListener("input", function () {
        var val = this.value.toLowerCase().trim();
        var datalist = document.getElementById("suggest-muzaki-" + idx);
        if (datalist) {
          var selectedNames = [];
          container.querySelectorAll(".zakat-muzaki-row").forEach(
            function (row) {
              if (row !== this.closest(".zakat-muzaki-row")) {
                var nameInput = row.querySelector(".zakat-muzaki-name");
                if (nameInput && nameInput.value) {
                  selectedNames.push(nameInput.value);
                }
              }
            }.bind(this),
          );

          datalist.innerHTML = "";
          allNames
            .filter(function (n) {
              var lower = n.toLowerCase().trim();
              var match = val === "" || lower.indexOf(val) !== -1;
              var notSelected = !selectedNames.some(function (s) {
                return s.toLowerCase().trim() === lower;
              });
              return match && notSelected;
            })
            .forEach(function (n) {
              var opt = document.createElement("option");
              opt.value = n;
              datalist.appendChild(opt);
            });
        }
        updateMuzakiTotal();
      });

      input.addEventListener("blur", function () {
        var val = this.value.trim();
        if (val) {
          var isDuplicate = false;
          container.querySelectorAll(".zakat-muzaki-row").forEach(
            function (row) {
              if (row !== this.closest(".zakat-muzaki-row")) {
                var nameInput = row.querySelector(".zakat-muzaki-name");
                if (
                  nameInput &&
                  nameInput.value.toLowerCase().trim() ===
                    val.toLowerCase().trim()
                ) {
                  isDuplicate = true;
                }
              }
            }.bind(this),
          );

          if (isDuplicate) {
            this.style.borderColor = "var(--neg)";
            this.style.boxShadow = "0 0 0 2px var(--neg-soft)";
            showToast("Nama sudah dipilih oleh Muzaki lain!", "warning");
          } else {
            this.style.borderColor = "";
            this.style.boxShadow = "";
          }
        }
      });
    });

    updateMuzakiTotal();
  }

  function updateMuzakiTotal() {
    var inputs = container.querySelectorAll(".zakat-muzaki-nominal");
    var total = 0;
    inputs.forEach(function (input) {
      total += Number(input.value) || 0;
    });
    totalDisplay.textContent = fmtRp(total);
  }

  countInput.addEventListener("change", function () {
    var newCount = parseInt(this.value) || 1;
    while (zakat.muzaki.length < newCount) {
      zakat.muzaki.push({
        id:
          "MZ" +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 5),
        nama: "",
        nominal: 0,
        jenis_zakat: "",
        jumlah_anggota_keluarga: 0,
        createdAt: new Date().toISOString(),
      });
    }
    if (zakat.muzaki.length > newCount) {
      zakat.muzaki = zakat.muzaki.slice(0, newCount);
    }
    renderMuzakiRows();
  });

  renderMuzakiRows();
}

function renderZakatRincianTab(zakat) {
  var r = zakat.rincian || {};

  var maalData = r.maal || r;
  var totalZakat = Number(maalData.total) || Number(zakat.total) || 0;

  var mustahikPersen = Number(maalData.mustahik?.persen) || 0;
  var sabilillahPersen = Number(maalData.sabilillah?.persen) || 0;
  var amilPersen = Number(maalData.amil?.persen) || 0;

  var mustahikKelompokPersen = Number(maalData.mustahik?.kelompok?.persen) || 0;
  var mustahikDaerahPersen = Number(maalData.mustahik?.daerah?.persen) || 0;
  var amilKelompokPersen = Number(maalData.amil?.kelompok?.persen) || 0;
  var amilDesaPersen = Number(maalData.amil?.desa?.persen) || 0;
  var amilDaerahPersen = Number(maalData.amil?.daerah?.persen) || 0;

  var mustahikNominal = Number(maalData.mustahik?.nominal) || 0;
  var sabilillahNominal = Number(maalData.sabilillah?.nominal) || 0;
  var amilNominal = Number(maalData.amil?.nominal) || 0;
  var mustahikKelompokNominal =
    Number(maalData.mustahik?.kelompok?.nominal) || 0;
  var mustahikDaerahNominal = Number(maalData.mustahik?.daerah?.nominal) || 0;
  var amilKelompokNominal = Math.round((totalZakat * amilKelompokPersen) / 100);
  var amilDesaNominal = Math.round((totalZakat * amilDesaPersen) / 100);
  var amilDaerahNominal = Math.round((totalZakat * amilDaerahPersen) / 100);

  var setDisplay = function (id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = value;
    }
  };

  setDisplay(
    "zakatRincianMustahik",
    mustahikPersen + "% · " + fmtRp(mustahikNominal),
  );
  setDisplay(
    "zakatRincianMustahikKelompok",
    mustahikKelompokPersen + "% · " + fmtRp(mustahikKelompokNominal),
  );
  setDisplay(
    "zakatRincianMustahikDaerah",
    mustahikDaerahPersen + "% · " + fmtRp(mustahikDaerahNominal),
  );
  setDisplay(
    "zakatRincianSabilillah",
    sabilillahPersen + "% · " + fmtRp(sabilillahNominal),
  );
  setDisplay("zakatRincianAmil", amilPersen + "% · " + fmtRp(amilNominal));
  setDisplay(
    "zakatRincianAmilKelompok",
    amilKelompokPersen + "% · " + fmtRp(amilKelompokNominal),
  );
  setDisplay(
    "zakatRincianAmilDesa",
    amilDesaPersen + "% · " + fmtRp(amilDesaNominal),
  );
  setDisplay(
    "zakatRincianAmilDaerah",
    amilDaerahPersen + "% · " + fmtRp(amilDaerahNominal),
  );

  updateRincianProgressBar(mustahikPersen, sabilillahPersen, amilPersen);

  var statusEl = document.getElementById("zakatRincianStatus");
  if (statusEl) {
    var totalPersen = mustahikPersen + sabilillahPersen + amilPersen;
    var badgeClass = "";
    var badgeIcon = "";
    var badgeText = "";

    if (totalZakat === 0) {
      badgeClass = "idle";
      badgeText = "Total Rp 0";
    } else if (
      totalPersen === 100 &&
      mustahikNominal > 0 &&
      sabilillahNominal > 0 &&
      amilNominal > 0
    ) {
      badgeClass = "saved";
      badgeText = "Tersimpan " + fmtRp(totalZakat);
    } else if (totalPersen === 100) {
      badgeClass = "warning";
      badgeText = "Belum dihitung";
    } else {
      badgeClass = "invalid";
      badgeText = "Total " + totalPersen + "% (harus 100%)";
    }

    statusEl.innerHTML =
      '<span class="zakat-status-badge ' +
      badgeClass +
      '">' +
      badgeText +
      "</span>";
  }

  var setValue = function (id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value;
  };

  setValue("zakatPersenMustahik", mustahikPersen);
  setValue("zakatPersenMustahikKelompok", mustahikKelompokPersen);
  setValue("zakatPersenMustahikDaerah", mustahikDaerahPersen);
  setValue("zakatPersenSabilillah", sabilillahPersen);
  setValue("zakatPersenAmil", amilPersen);
  setValue("zakatPersenAmilKelompok", amilKelompokPersen);
  setValue("zakatPersenAmilDesa", amilDesaPersen);
  setValue("zakatPersenAmilDaerah", amilDaerahPersen);

  function updateRincian() {
    var getVal = function (id) {
      return Number(document.getElementById(id)?.value || 0);
    };

    var pMustahik = getVal("zakatPersenMustahik");
    var pSabilillah = getVal("zakatPersenSabilillah");
    var pAmil = getVal("zakatPersenAmil");

    var pKelompok = getVal("zakatPersenMustahikKelompok");
    var pDaerah = getVal("zakatPersenMustahikDaerah");
    var pAmilKelompok = getVal("zakatPersenAmilKelompok");
    var pAmilDesa = getVal("zakatPersenAmilDesa");
    var pAmilDaerah = getVal("zakatPersenAmilDaerah");

    var mustahikSub = pKelompok + pDaerah;
    var mustahikSubEl = document.getElementById("zakatMustahikSubTotal");
    if (mustahikSubEl) {
      mustahikSubEl.textContent =
        "Subtotal: " +
        pKelompok +
        "% + " +
        pDaerah +
        "% = " +
        mustahikSub +
        "%";
      mustahikSubEl.className =
        "zakat-rincian-sub-total " +
        (mustahikSub === 100 ? "valid" : "invalid");
    }

    var amilSub = pAmilKelompok + pAmilDesa + pAmilDaerah;
    var amilSubEl = document.getElementById("zakatAmilSubTotal");
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
    var totalEl = document.getElementById("zakatTotalPersen");
    if (totalEl) {
      totalEl.textContent = totalPersen + "%";
      totalEl.style.color = totalPersen === 100 ? "var(--pos)" : "var(--neg)";
    }

    var totalZakatCalc = maalData.total || zakat.total || 0;
    var mustahikNominalPreview = Math.round((totalZakatCalc * pMustahik) / 100);
    var sabilillahNominalPreview = Math.round(
      (totalZakatCalc * pSabilillah) / 100,
    );
    var amilNominalPreview = Math.round((totalZakatCalc * pAmil) / 100);

    var nominalEl = document.getElementById("zakatTotalNominal");
    if (nominalEl) {
      if (totalPersen === 100) {
        var totalNominal =
          mustahikNominalPreview +
          sabilillahNominalPreview +
          amilNominalPreview;
        nominalEl.textContent = fmtRp(totalNominal);
        nominalEl.style.color = "var(--brand)";
      } else {
        nominalEl.textContent = "⚠️ Harus 100%";
        nominalEl.style.color = "var(--neg)";
      }
    }

    var previewEls = {
      zakatMustahikNominalPreview: mustahikNominalPreview,
      zakatSabilillahNominalPreview: sabilillahNominalPreview,
      zakatAmilNominalPreview: amilNominalPreview,
    };

    Object.keys(previewEls).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.textContent = fmtRp(previewEls[id]);
        el.style.color = previewEls[id] > 0 ? "var(--pos)" : "var(--ink-faint)";
      }
    });
  }

  var rincianInputs = [
    "zakatPersenMustahik",
    "zakatPersenMustahikKelompok",
    "zakatPersenMustahikDaerah",
    "zakatPersenSabilillah",
    "zakatPersenAmil",
    "zakatPersenAmilKelompok",
    "zakatPersenAmilDesa",
    "zakatPersenAmilDaerah",
  ];

  rincianInputs.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", updateRincian);
    }
  });

  document.querySelectorAll(".zakat-default-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = this.dataset.target;
      var defaults = {
        mustahik: {
          persen: 45,
          kelompok: { persen: 80 },
          daerah: { persen: 20 },
        },
        sabilillah: { persen: 40 },
        amil: {
          persen: 15,
          kelompok: { persen: 12 },
          desa: { persen: 2 },
          daerah: { persen: 1 },
        },
      };

      if (target === "mustahik") {
        setValue("zakatPersenMustahik", defaults.mustahik.persen);
        setValue(
          "zakatPersenMustahikKelompok",
          defaults.mustahik.kelompok.persen,
        );
        setValue("zakatPersenMustahikDaerah", defaults.mustahik.daerah.persen);
      } else if (target === "sabilillah") {
        setValue("zakatPersenSabilillah", defaults.sabilillah.persen);
      } else if (target === "amil") {
        setValue("zakatPersenAmil", defaults.amil.persen);
        setValue("zakatPersenAmilKelompok", defaults.amil.kelompok.persen);
        setValue("zakatPersenAmilDesa", defaults.amil.desa.persen);
        setValue("zakatPersenAmilDaerah", defaults.amil.daerah.persen);
      }
      updateRincian();
      showToast("Default diterapkan!", "info");
    });
  });

  updateRincian();
}

function updateRincianProgressBar(mustahik, sabilillah, amil) {
  var segments = document.querySelectorAll(".zakat-rincian-progress-segment");
  if (segments.length === 3) {
    var total = mustahik + sabilillah + amil;
    if (total === 0) {
      segments[0].style.width = "0%";
      segments[0].querySelector("span").textContent = "Mustahik 0%";
      segments[1].style.width = "0%";
      segments[1].querySelector("span").textContent = "Sabilillah 0%";
      segments[2].style.width = "0%";
      segments[2].querySelector("span").textContent = "Amil 0%";
    } else {
      segments[0].style.width = mustahik + "%";
      segments[0].querySelector("span").textContent =
        "Mustahik " + mustahik + "%";
      segments[1].style.width = sabilillah + "%";
      segments[1].querySelector("span").textContent =
        "Sabilillah " + sabilillah + "%";
      segments[2].style.width = amil + "%";
      segments[2].querySelector("span").textContent = "Amil " + amil + "%";
    }
  }
}

function renderZakatMustahikTab(zakat) {
  var container = document.getElementById("zakatMustahikList");
  var countInput = document.getElementById("zakatMustahikCount");
  var danaDisplay = document.getElementById("zakatMustahikDana");
  var sisaDisplay = document.getElementById("zakatMustahikSisa");

  if (!container || !countInput) return;

  var r = zakat.rincian || {};
  var danaMustahik = 0;

  if (r.maal && r.maal.mustahik) {
    danaMustahik += Number(r.maal.mustahik.kelompok?.nominal) || 0;
  }
  if (r.fitrah && r.fitrah.mustahik) {
    danaMustahik += Number(r.fitrah.mustahik.nominal) || 0;
  }
  if (danaMustahik === 0 && r.mustahik) {
    danaMustahik =
      Number(r.mustahik.kelompok?.nominal) || Number(r.mustahik.nominal) || 0;
  }

  if (danaDisplay) danaDisplay.textContent = fmtRp(danaMustahik);

  var mustahikList = zakat.mustahik || [];
  var count = Math.max(mustahikList.length || 1, 1);
  countInput.value = count;

  var allNames = getAllMustahikNames();

  function renderMustahikRows() {
    var currentCount = parseInt(countInput.value) || 1;
    var totalDistributed = 0;

    var existingData = [];
    for (var i = 0; i < Math.min(currentCount, mustahikList.length); i++) {
      if (mustahikList[i]) {
        existingData.push(mustahikList[i]);
      }
    }
    while (existingData.length < currentCount) {
      existingData.push({ id: "", nama: "", nominal: 0 });
    }

    var rows = [];
    for (var i = 0; i < currentCount; i++) {
      var existing = existingData[i] || { nama: "", nominal: 0 };
      totalDistributed += existing.nominal || 0;

      rows.push(`
        <div class="zakat-muzaki-row" data-mustahik-index="${i}">
          <div class="zakat-name-wrapper" style="position:relative;flex:1;">
            <input type="text" class="field-input zakat-mustahik-name" 
                   placeholder="Nama Mustahik ${i + 1}" 
                   value="${escapeHtml(existing.nama || "")}" 
                   data-index="${i}"
                   list="suggest-mustahik-${i}"
                   autocomplete="off"
                   style="width:100%;">
            <datalist id="suggest-mustahik-${i}">
              ${allNames
                .filter(function (n) {
                  var lower = n.toLowerCase().trim();
                  var isUsed = mustahikList.some(function (m) {
                    return (
                      m.nama &&
                      m.nama.toLowerCase().trim() === lower &&
                      m !== existing
                    );
                  });
                  var isSelf = n === existing.nama;
                  return !isUsed || isSelf;
                })
                .map(function (n) {
                  return '<option value="' + escapeHtml(n) + '">';
                })
                .join("")}
            </datalist>
            ${existing.nama ? '<span class="zakat-name-badge">✓</span>' : ""}
          </div>
          <input type="number" class="field-input zakat-mustahik-nominal" 
                 placeholder="Nominal" 
                 value="${existing.nominal || ""}" 
                 data-index="${i}" 
                 min="0" step="1000"
                 style="max-width:140px;">
        </div>
      `);
    }

    container.innerHTML = rows.join("");

    updateSisa();

    container
      .querySelectorAll(".zakat-mustahik-nominal")
      .forEach(function (input) {
        input.addEventListener("input", updateSisa);
      });

    container
      .querySelectorAll(".zakat-mustahik-name")
      .forEach(function (input) {
        var idx = parseInt(input.dataset.index);

        input.addEventListener("input", function () {
          var val = this.value.toLowerCase().trim();
          var datalist = document.getElementById("suggest-mustahik-" + idx);
          if (datalist) {
            var selectedNames = [];
            container.querySelectorAll(".zakat-mustahik-name").forEach(
              function (other) {
                if (other !== this && other.value) {
                  selectedNames.push(other.value);
                }
              }.bind(this),
            );

            datalist.innerHTML = "";
            allNames
              .filter(function (n) {
                var lower = n.toLowerCase().trim();
                var match = val === "" || lower.indexOf(val) !== -1;
                var notSelected = !selectedNames.some(function (s) {
                  return s.toLowerCase().trim() === lower;
                });
                return match && notSelected;
              })
              .forEach(function (n) {
                var opt = document.createElement("option");
                opt.value = n;
                datalist.appendChild(opt);
              });
          }
        });
      });
  }

  function updateSisa() {
    var totalDistributed = 0;
    container
      .querySelectorAll(".zakat-mustahik-nominal")
      .forEach(function (input) {
        totalDistributed += Number(input.value) || 0;
      });
    var sisa = Math.max(0, danaMustahik - totalDistributed);
    sisaDisplay.textContent = fmtRp(sisa);
    sisaDisplay.style.color = sisa > 0 ? "var(--pos)" : "var(--ink-soft)";

    var progress =
      danaMustahik > 0 ? (totalDistributed / danaMustahik) * 100 : 0;
    var progressEl = document.getElementById("zakatMustahikProgress");
    if (progressEl) {
      progressEl.style.width = Math.min(100, progress) + "%";
      progressEl.style.background =
        progress >= 100 ? "var(--pos)" : "var(--brand)";
    }
  }

  countInput.addEventListener("change", function () {
    var newCount = parseInt(this.value) || 1;
    while (zakat.mustahik.length < newCount) {
      zakat.mustahik.push({
        id:
          "MS" +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 5),
        nama: "",
        nominal: 0,
        jenis_zakat: "",
        createdAt: new Date().toISOString(),
      });
    }
    if (zakat.mustahik.length > newCount) {
      zakat.mustahik = zakat.mustahik.slice(0, newCount);
    }
    renderMustahikRows();
  });

  renderMustahikRows();
}

function initZakatTabs() {
  var tabs = document.querySelectorAll(".zakat-tab");
  if (!tabs || tabs.length === 0) return;

  var panels = {
    muzaki: document.getElementById("zakatTabMuzaki"),
    rincian: document.getElementById("zakatTabRincian"),
    mustahik: document.getElementById("zakatTabMustahik"),
  };

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = this.dataset.zakatTab;
      var zakat = getZakatById(state.zakat?.currentId);
      if (!zakat) return;

      if (state.zakat) state.zakat.activeTab = target;

      tabs.forEach(function (t) {
        t.classList.remove("active");
        t.style.background = "var(--surface)";
        t.style.color = "var(--ink-soft)";
      });

      this.classList.add("active");
      this.style.background = "var(--brand)";
      this.style.color = "#fff";

      Object.keys(panels).forEach(function (key) {
        var panel = panels[key];
        if (panel) {
          panel.classList.remove("active");
          panel.style.display = "none";
        }
      });

      var targetPanel = panels[target];
      if (targetPanel) {
        targetPanel.classList.add("active");
        targetPanel.style.display = "block";
      }

      if (target === "muzaki") {
        renderZakatMuzakiTab(zakat);
      } else if (target === "rincian") {
        renderZakatRincianTab(zakat);
      } else if (target === "mustahik") {
        renderZakatMustahikTab(zakat);
      }
    });
  });
}

var zakatFilters = {
  tahun: "semua",
  status: "semua",
};

function initZakatFilters() {
  var trigger = document.getElementById("btnOpenZakatFilter");
  var sheet = document.getElementById("zakatFilterSheet");

  if (!trigger || !sheet) return;

  var newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);

  var freshTrigger = document.getElementById("btnOpenZakatFilter");
  freshTrigger.addEventListener("click", handleFilterTriggerClick);
  freshTrigger.dataset.filterBound = "true";

  var newSheet = sheet.cloneNode(true);
  sheet.parentNode.replaceChild(newSheet, sheet);

  var freshSheet = document.getElementById("zakatFilterSheet");

  freshSheet.addEventListener("click", function (e) {
    if (e.target === this) {
      window.closeZakatFilterSheet();
    }
  });

  var handle = freshSheet.querySelector(".sheet-handle");
  if (handle) {
    handle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.closeZakatFilterSheet();
    });
  }

  freshSheet.querySelectorAll(".filter-chip-option").forEach(function (btn) {
    btn.addEventListener("click", handleFilterOptionClick);
  });

  var applyBtn = document.getElementById("btnApplyZakatFilter");
  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      applyZakatFilterFromSheet();
    });
  }

  var resetBtn = document.getElementById("btnResetZakatFilter");
  if (resetBtn) {
    resetBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      resetZakatFilters();
    });
  }

  updateFilterBadge();
  updateActiveFiltersDisplay();
  updateFilterSheetState();
}

function handleFilterTriggerClick(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (state.zakat && state.zakat.isViewOpen) {
    closeZakatDetail();
    setTimeout(function () {
      window.openZakatFilterSheet();
    }, 300);
    return;
  }

  window.openZakatFilterSheet();
}

function openZakatFilterSheet() {
  var trigger = document.getElementById("btnOpenZakatFilter");
  var sheet = document.getElementById("zakatFilterSheet");

  if (!trigger || !sheet) return;

  if (state.zakat && state.zakat.isViewOpen) return;

  updateFilterSheetState();

  sheet.classList.remove("hidden");
  sheet.style.display = "flex";

  document.body.classList.add("zakat-filter-open");
}

function closeZakatFilterSheet() {
  var sheet = document.getElementById("zakatFilterSheet");
  if (!sheet) return;

  sheet.classList.add("hidden");
  sheet.style.display = "none";

  document.body.classList.remove("zakat-filter-open");
}

function handleFilterOptionClick() {
  var group = this.dataset.filter;
  var value = this.dataset.value;

  document
    .querySelectorAll('.filter-chip-option[data-filter="' + group + '"]')
    .forEach(function (b) {
      b.classList.remove("active");
    });
  this.classList.add("active");
}

function updateFilterSheetState() {
  document.querySelectorAll(".filter-chip-option").forEach(function (btn) {
    var group = btn.dataset.filter;
    var value = btn.dataset.value;
    if (zakatFilters[group] === value) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function applyZakatFilterFromSheet() {
  var activeTahun = document.querySelector(
    '.filter-chip-option[data-filter="tahun"].active',
  );
  var activeStatus = document.querySelector(
    '.filter-chip-option[data-filter="status"].active',
  );

  zakatFilters.tahun = activeTahun ? activeTahun.dataset.value : "semua";
  zakatFilters.status = activeStatus ? activeStatus.dataset.value : "semua";

  closeZakatFilterSheet();

  updateFilterBadge();
  updateActiveFiltersDisplay();

  applyZakatFilters();
}

function resetZakatFilters() {
  zakatFilters = {
    tahun: "semua",
    status: "semua",
  };

  document.querySelectorAll(".filter-chip-option").forEach(function (btn) {
    btn.classList.remove("active");
    if (btn.dataset.value === "semua") {
      btn.classList.add("active");
    }
  });

  closeZakatFilterSheet();

  updateFilterBadge();
  updateActiveFiltersDisplay();

  applyZakatFilters();
}

function updateFilterBadge() {
  var badge = document.getElementById("zakatFilterBadge");
  if (!badge) return;

  var activeCount = 0;
  if (zakatFilters.tahun !== "semua") activeCount++;
  if (zakatFilters.status !== "semua") activeCount++;

  if (activeCount > 0) {
    badge.textContent = activeCount;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function updateActiveFiltersDisplay() {
  var container = document.getElementById("zakatActiveFilters");
  if (!container) return;

  var activeFilters = [];

  if (zakatFilters.tahun !== "semua") {
    activeFilters.push({ label: zakatFilters.tahun, filter: "tahun" });
  }

  var statusLabels = {
    selesai: "Selesai",
    muzaki_belum: "Muzaki Belum",
    muzaki_sudah: "Muzaki Sudah",
    rincian_belum: "Rincian Belum",
    rincian_sudah: "Rincian Sudah",
    mustahik_belum: "Mustahik Belum",
    mustahik_sudah: "Mustahik Sudah",
  };

  if (zakatFilters.status !== "semua" && statusLabels[zakatFilters.status]) {
    activeFilters.push({
      label: statusLabels[zakatFilters.status],
      filter: "status",
    });
  }

  if (activeFilters.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = activeFilters
    .map(function (f) {
      return (
        '<span class="zakat-active-filter-chip">' +
        f.label +
        '<button class="remove-filter" data-filter="' +
        f.filter +
        '" aria-label="Hapus filter ' +
        f.label +
        '">×</button>' +
        "</span>"
      );
    })
    .join("");

  container.querySelectorAll(".remove-filter").forEach(function (btn) {
    btn.removeEventListener("click", handleRemoveFilter);
    btn.addEventListener("click", handleRemoveFilter);
  });
}

function handleRemoveFilter(e) {
  e.stopPropagation();
  var filter = this.dataset.filter;
  zakatFilters[filter] = "semua";

  updateFilterSheetState();
  updateFilterBadge();
  updateActiveFiltersDisplay();

  applyZakatFilters();
}

function applyZakatFilters() {
  var list = state.zakat.list || [];

  var filtered = list.filter(function (z) {
    if (zakatFilters.tahun !== "semua") {
      var zYear = z.tanggal ? new Date(z.tanggal).getFullYear() : null;
      if (String(zYear) !== zakatFilters.tahun) return false;
    }

    var status = zakatFilters.status;
    if (status === "semua") return true;

    if (status === "selesai") {
      return isZakatCompleted(z);
    }

    var muzakiList = z.muzaki || [];
    var totalMuzaki = muzakiList.length;
    var paidMuzaki = muzakiList.filter(function (m) {
      return parseInt(m.nominal) > 0;
    }).length;
    var allPaid = totalMuzaki > 0 && paidMuzaki === totalMuzaki;

    if (status === "muzaki_belum") {
      return totalMuzaki > 0 && !allPaid;
    }
    if (status === "muzaki_sudah") {
      return totalMuzaki > 0 && allPaid;
    }

    var hasRincian =
      z.rincian &&
      ((z.rincian.maal && z.rincian.maal.total > 0) ||
        (z.rincian.fitrah && z.rincian.fitrah.total > 0) ||
        (z.rincian.mustahik && z.rincian.mustahik.persen > 0));

    if (status === "rincian_belum") {
      return !hasRincian;
    }
    if (status === "rincian_sudah") {
      return hasRincian;
    }

    var hasMustahik = z.mustahik && z.mustahik.length > 0;

    if (status === "mustahik_belum") {
      return !hasMustahik;
    }
    if (status === "mustahik_sudah") {
      return hasMustahik;
    }

    return true;
  });

  renderZakatList(filtered);
}

function renderZakatList(data) {
  var container = document.getElementById("zakatList");
  if (!container) {
    console.warn("[renderZakatList] Container #zakatList tidak ditemukan");
    return;
  }

  try {
    var list = data || (state.zakat && state.zakat.list) || [];

    // ✅ Pastikan list adalah array
    if (!Array.isArray(list)) {
      console.warn("[renderZakatList] Data bukan array:", list);
      list = [];
    }

    // ✅ Sort dengan safe date parsing
    list = list.slice().sort(function (a, b) {
      var dateA = safeParseDate(a.transaction_date || a.tanggal);
      var dateB = safeParseDate(b.transaction_date || b.tanggal);
      return dateB - dateA;
    });

    if (list.length === 0) {
      container.innerHTML =
        '<div class="zakat-list-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="4"/></svg><p>Belum ada kegiatan Zakat.</p><p style="font-size:11px;margin-top:4px;">Klik tombol + untuk membuat baru.</p></div>';
      return;
    }

    var html = "";

    for (var i = 0; i < list.length; i++) {
      try {
        html += buildZakatListItemHtml(list[i]);
      } catch (itemErr) {
        console.error(
          "[renderZakatList] Error rendering item index " + i + ":",
          itemErr,
          list[i],
        );
        // ✅ Tetap render item dengan fallback
        html += buildZakatListItemFallback(list[i]);
      }
    }

    container.innerHTML = html;

    // ✅ Pasang event listener dengan event delegation (lebih aman)
    container.querySelectorAll(".zakat-item-content").forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = this.dataset.zakatId;
        if (id && typeof openZakatDetail === "function") {
          openZakatDetail(id);
        }
      });
    });
  } catch (err) {
    console.error("[renderZakatList] Fatal error:", err);
    container.innerHTML =
      '<div class="zakat-list-empty" style="color:var(--neg);">' +
      "<p>Gagal memuat daftar zakat.</p>" +
      '<p style="font-size:11px;margin-top:4px;">' +
      escapeHtml(err.message || "Unknown error") +
      "</p>" +
      "</div>";
  }
}

// ✅ Safe date parser untuk format GAS Date string
function safeParseDate(value) {
  if (!value) return new Date(0);
  if (value instanceof Date)
    return isNaN(value.getTime()) ? new Date(0) : value;

  var str = String(value).trim();
  if (!str) return new Date(0);

  // Coba parse langsung
  var d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // Fallback: hapus timezone name dalam kurung
  // "Thu May 14 2026 00:00:00 GMT+0700 (Waktu Indonesia Barat)"
  var cleaned = str.replace(/\s*\([^)]*\)\s*$/, "").trim();
  d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  // Fallback: coba format yyyy-mm-dd
  var isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    d = new Date(
      parseInt(isoMatch[1]),
      parseInt(isoMatch[2]) - 1,
      parseInt(isoMatch[3]),
    );
    if (!isNaN(d.getTime())) return d;
  }

  return new Date(0);
}

// ✅ Helper untuk cek rincian valid (tanpa akses .mustahik yang tidak ada)
function zakatHasRincian(z) {
  if (!z || !z.rincian) return false;
  var r = z.rincian;
  var maalTotal = Number(r.maal && r.maal.total) || 0;
  var fitrahTotal = Number(r.fitrah && r.fitrah.total) || 0;
  return maalTotal > 0 || fitrahTotal > 0;
}

// ✅ Helper untuk hitung dana mustahik dari rincian
function zakatGetDanaMustahik(z) {
  if (!z || !z.rincian) return 0;
  var r = z.rincian;
  var dana = 0;

  if (r.maal && r.maal.mustahik) {
    var kelompokNominal = Number(
      (r.maal.mustahik.kelompok && r.maal.mustahik.kelompok.nominal) || 0,
    );
    var daerahNominal = Number(
      (r.maal.mustahik.daerah && r.maal.mustahik.daerah.nominal) || 0,
    );
    // ✅ Jumlahkan kelompok + daerah, bukan hanya kelompok
    dana += kelompokNominal + daerahNominal;
  }

  if (r.fitrah && r.fitrah.mustahik) {
    dana += Number(r.fitrah.mustahik.nominal) || 0;
  }

  return dana;
}

// ✅ Build HTML untuk satu item zakat
function buildZakatListItemHtml(z) {
  var zid = z.zakat_id || z.id;
  if (!z || !zid) {
    throw new Error("Item zakat tidak valid (missing id)");
  }

  var safeTitle = escapeHtml(z.title || "Tanpa Judul");
  var safeTempat = escapeHtml(z.location || z.tempat || "Tempat tidak ditentukan");
  var safeTotal = fmtRp(z.total_amount !== undefined ? z.total_amount : z.total || 0);
  var safeTanggal = (z.transaction_date || z.tanggal) ? fmtDateShort(z.transaction_date || z.tanggal) : "-";

  var muzakiList = Array.isArray(z.muzakki) ? z.muzakki : (Array.isArray(z.muzaki) ? z.muzaki : []);
  var mustahikList = Array.isArray(z.mustahik) ? z.mustahik : [];

  var muzakiLength = muzakiList.length;
  var mustahikLength = mustahikList.length;

  var hasRincian = zakatHasRincian(z);
  var hasMustahik = mustahikLength > 0;

  // Status badge
  var statusInfo = getZakatStatusBadge(z.status);
  var isCompleted = statusInfo.isCompleted;
  var statusBadgeClass = isCompleted ? "status-completed" : "status-active";
  var statusBadgeText = statusInfo.label;
  var statusBadgeIcon = isCompleted
    ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
    : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>';

  // Badges
  var badges = [];

  badges.push(
    hasRincian
      ? '<span class="zakat-badge zakat-badge-success"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Rincian</span>'
      : '<span class="zakat-badge zakat-badge-warning"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg> Rincian belum</span>',
  );

  var totalMustahikTerisi = mustahikList.reduce(function (sum, m) {
    return sum + (Number(m.amount !== undefined ? m.amount : m.nominal) || 0);
  }, 0);

  var danaMustahik = zakatGetDanaMustahik(z);
  var isMustahikAllocated =
    hasMustahik && danaMustahik > 0 && totalMustahikTerisi >= danaMustahik;

  badges.push(
    hasMustahik
      ? isMustahikAllocated
        ? '<span class="zakat-badge zakat-badge-success"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Mustahik teralokasi</span>'
        : '<span class="zakat-badge zakat-badge-warning"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg> Mustahik belum dialokasi</span>'
      : '<span class="zakat-badge zakat-badge-danger"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Belum ada mustahik</span>',
  );

  var paidCount = 0;
  var allMuzakiPaid = muzakiLength > 0;
  muzakiList.forEach(function (m) {
    var amt = Number(m.amount !== undefined ? m.amount : m.nominal) || 0;
    if (amt > 0) {
      paidCount++;
    } else {
      allMuzakiPaid = false;
    }
  });

  badges.push(
    muzakiLength > 0
      ? allMuzakiPaid
        ? '<span class="zakat-badge zakat-badge-success"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Semua muzaki bayar</span>'
        : '<span class="zakat-badge zakat-badge-warning"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg> ' +
          paidCount +
          "/" +
          muzakiLength +
          " muzaki bayar</span>"
      : '<span class="zakat-badge zakat-badge-danger"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Belum ada muzaki</span>',
  );

  return (
    '<div class="zakat-item" data-zakat-id="' +
    zid +
    '">' +
    '<div class="zakat-item-content" data-zakat-id="' +
    zid +
    '">' +
    '<div class="zakat-item-status"><span class="zakat-badge ' +
    statusBadgeClass +
    '">' +
    statusBadgeIcon +
    statusBadgeText +
    "</span></div>" +
    '<div class="zakat-item-header">' +
    '<div class="zakat-item-title" style="font-size:17px;font-weight:700;">' +
    safeTitle +
    "</div>" +
    '<div class="zakat-item-total" style="font-size:18px;font-weight:800;">' +
    safeTotal +
    "</div>" +
    "</div>" +
    '<div class="zakat-item-meta">' +
    "<span>" +
    safeTanggal +
    "</span><span>•</span><span>" +
    safeTempat +
    "</span><span>•</span><span>" +
    muzakiLength +
    " Muzaki</span>" +
    (mustahikLength > 0
      ? "<span>•</span><span>" + mustahikLength + " Mustahik</span>"
      : "") +
    "</div>" +
    '<div class="zakat-item-badges">' +
    badges.join("") +
    "</div>" +
    "</div>" +
    "</div>"
  );
}

// ✅ Fallback jika item gagal dirender
function buildZakatListItemFallback(z) {
  var title = escapeHtml((z && z.title) || "Data tidak valid");
  var id = (z && z.id) || "unknown";
  return (
    '<div class="zakat-item" data-zakat-id="' +
    id +
    '">' +
    '<div class="zakat-item-content" data-zakat-id="' +
    id +
    '" style="opacity:0.6;">' +
    '<div class="zakat-item-header">' +
    '<div class="zakat-item-title">' +
    title +
    "</div>" +
    '<div class="zakat-item-total">⚠️</div>' +
    "</div>" +
    '<div class="zakat-item-meta"><span>Data tidak dapat ditampilkan</span></div>' +
    "</div>" +
    "</div>"
  );
}

renderZakatList(state.zakat.list);

loadZakatData().then(function () {
  renderZakatList(state.zakat.list);
});

function loadZakatDataAndInitFilters() {
  if (typeof getZakatData === "function") {
    state.zakat.list = getZakatData() || [];
  }

  renderZakatList(state.zakat.list);

  setTimeout(function () {
    initZakatFilters();
  }, 50);

  hideZakatLoader();
}

function updateZakatFilterVisibility() {
  var filterTrigger = document.getElementById("btnOpenZakatFilter");
  if (!filterTrigger) return;

  if (state.zakat && state.zakat.isViewOpen) {
    filterTrigger.classList.add("hidden");
  } else {
    filterTrigger.classList.remove("hidden");
  }
}

window.openZakatScreen = function () {
  if (typeof router !== "undefined" && router) {
    router.navigateTo("zakat");
    setTimeout(function () {
      initZakatFilters();
      applyZakatFilters();
    }, 200);
  } else {
    var screen = document.getElementById("screen-zakat");
    if (!screen) {
      showToast("Screen Zakat tidak ditemukan", "error");
      return;
    }

    var bottomNav = document.getElementById("bottomnav");
    if (bottomNav) {
      bottomNav.style.display = "none";
    }

    screen.classList.add("active");
    showZakatLoader("Memuat data zakat...");

    loadZakatDataAndInitFilters();
  }
};

window.closeZakatScreen = function () {
  if (state.zakat && state.zakat.isViewOpen) {
    closeZakatDetail();
    return;
  }

  if (typeof router !== "undefined" && router) {
    router.navigateTo("profile");
  } else {
    var screen = document.getElementById("screen-zakat");
    if (screen) {
      screen.classList.remove("active");
    }

    var bottomNav = document.getElementById("bottomnav");
    if (bottomNav) {
      bottomNav.style.display = "";
    }
  }

  state.zakat.isViewOpen = false;
  state.zakat.currentId = null;

  var sheets = [
    "zakatMuzakiSheet",
    "zakatRincianSheet",
    "zakatMustahikSheet",
    "zakatFormOverlay",
    "zakatEditHeaderOverlay",
    "zakatFilterSheet",
  ];

  sheets.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
  closeZakatFilterSheet();
};

window.openZakatFilterSheet = function () {
  var sheet = document.getElementById("zakatFilterSheet");

  if (!sheet) return;

  sheet.classList.remove("hidden");
  sheet.classList.remove("invisible");
  sheet.style.display = "flex";
  sheet.style.visibility = "visible";
  sheet.style.opacity = "1";
  sheet.style.pointerEvents = "auto";
  sheet.style.position = "fixed";
  sheet.style.inset = "0";
  sheet.style.zIndex = "9999";
  sheet.style.background = "rgba(0,0,0,0.4)";
  sheet.style.backdropFilter = "blur(4px)";

  var sheetInner = sheet.querySelector(".sheet");
  if (sheetInner) {
    sheetInner.style.display = "block";
    sheetInner.style.visibility = "visible";
    sheetInner.style.opacity = "1";
    sheetInner.style.transform = "translateY(0)";
    sheetInner.style.position = "absolute";
    sheetInner.style.bottom = "0";
    sheetInner.style.left = "0";
    sheetInner.style.right = "0";
    sheetInner.style.maxHeight = "85vh";
    sheetInner.style.background = "var(--surface)";
    sheetInner.style.borderRadius = "20px 20px 0 0";
    sheetInner.style.padding = "12px 16px 20px";
    sheetInner.style.overflow = "hidden";
  }

  updateFilterSheetState();

  document.body.classList.add("zakat-filter-open");
  document.body.style.overflow = "hidden";
};

window.closeZakatFilterSheet = function () {
  var sheet = document.getElementById("zakatFilterSheet");
  if (!sheet) return;

  sheet.classList.add("hidden");
  sheet.style.display = "none";
  sheet.style.visibility = "hidden";
  sheet.style.opacity = "0";
  sheet.style.pointerEvents = "none";

  document.body.classList.remove("zakat-filter-open");
  document.body.style.overflow = "";
};

var zakatLoaderTimeout = null;

function showZakatLoader(message) {
  message = message || "Memuat data...";
  var loader = document.getElementById("zakatLoader");
  var text = document.getElementById("zakatLoaderText");
  if (loader) {
    loader.classList.remove("hidden");
    if (text) text.textContent = message;
  }

  // ✅ Auto-hide setelah 15 detik jika masih loading
  if (zakatLoaderTimeout) clearTimeout(zakatLoaderTimeout);
  zakatLoaderTimeout = setTimeout(function () {
    console.warn("Zakat loader timeout - forcing hide");
    hideZakatLoader();
  }, 15000);
}

function hideZakatLoader() {
  var loader = document.getElementById("zakatLoader");
  if (loader) {
    loader.classList.add("hidden");
  }
  // ✅ Clear timeout
  if (zakatLoaderTimeout) {
    clearTimeout(zakatLoaderTimeout);
    zakatLoaderTimeout = null;
  }
}

function showZakatButtonLoading(btn, text) {
  text = text || "Menyimpan...";
  if (!btn) return;
  btn._originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = `
    <span style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:8px;"></span>
    ${text}
  `;
}

function hideZakatButtonLoading(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = btn._originalText || "Simpan";
}

document.addEventListener("DOMContentLoaded", function () {
  if (!state.zakat) {
    state.zakat = {
      list: [],
      currentId: null,
      isViewOpen: false,
      activeTab: "muzaki",
      _loaded: false,
      _loading: false,
    };
  }

  if (typeof getZakatData === "function") {
    var cached = getZakatData();
    if (cached && cached.length > 0) {
      state.zakat.list = cached;
    }
  }

  if (typeof router !== "undefined" && router) {
    router.on("routeChange", function (data) {
      ensureZakatState();

      if (data.route === "zakat") {
        state.zakat.isViewOpen = false;
        state.zakat.currentId = null;

        closeZakatDetailDirect();

        if (!router || !router.isZakatDetailRoute()) {
          renderZakatList(state.zakat.list);
        }

        setTimeout(function () {
          initZakatFilters();
          applyZakatFilters();
        }, 100);

        return;
      }

      if (data.route === "zakat-detail" && data.params && data.params.id) {
        initZakatDetailRoute(data.params.id);
        return;
      }
    });
  }
  renderZakatList(state.zakat.list);

  function initFiltersWithRetry(attempt) {
    attempt = attempt || 0;
    var maxAttempts = 5;

    var trigger = document.getElementById("btnOpenZakatFilter");
    var sheet = document.getElementById("zakatFilterSheet");

    if (trigger && sheet) {
      initZakatFilters();
      applyZakatFilters();
      return true;
    }

    if (attempt < maxAttempts) {
      var delay = 100 + attempt * 100;
      setTimeout(function () {
        initFiltersWithRetry(attempt + 1);
      }, delay);
      return false;
    }

    return false;
  }

  setTimeout(function () {
    initFiltersWithRetry(0);
  }, 150);

  var zakatScreen = document.getElementById("screen-zakat");
  if (zakatScreen && zakatScreen.classList.contains("active")) {
    setTimeout(function () {
      initFiltersWithRetry(0);
    }, 200);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("#btnOpenZakat");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();

      if (typeof openZakatScreen === "function") {
        openZakatScreen();
      } else if (typeof window.openZakatScreen === "function") {
        window.openZakatScreen();
      } else {
        showToast("Fungsi Zakat belum siap", "error");
      }
    }
  });

  var btnZakatBack = document.getElementById("btnZakatBack");
  if (btnZakatBack) {
    btnZakatBack.addEventListener("click", function () {
      var formContainer = document.getElementById("zakatFormContainer");
      var screenTitle = document.getElementById("zakatScreenTitle");

      if (formContainer && !formContainer.classList.contains("hidden")) {
        closeZakatForm(true);
        return;
      }

      if (state.zakat && state.zakat.isViewOpen) {
        closeZakatDetail();
        renderZakatList();
        if (screenTitle) {
          screenTitle.textContent = "Manajemen Zakat";
        }
        return;
      }

      if (typeof closeZakatScreen === "function") {
        closeZakatScreen();
      } else if (window.closeZakatScreen) {
        window.closeZakatScreen();
      }
    });
  }

  var fabZakat = document.getElementById("fabZakat");
  if (fabZakat) {
    fabZakat.addEventListener("click", function () {
      if (state.zakat && state.zakat.isViewOpen) {
        closeZakatDetail();
      }
      openZakatForm(null);
    });
  }

  initZakatTabs();

  var zakatFormCancel = document.getElementById("zakatFormCancel");
  if (zakatFormCancel) {
    zakatFormCancel.addEventListener("click", function () {
      closeZakatForm(true);
    });
  }

  var zakatFormSubmit = document.getElementById("zakatFormSubmit");
  if (zakatFormSubmit) {
    zakatFormSubmit.addEventListener("click", function () {
      submitZakatForm();
    });
  }

  var zakatFormOverlay = document.getElementById("zakatFormOverlay");
  if (zakatFormOverlay) {
    zakatFormOverlay.addEventListener("click", function (e) {
      if (e.target === this) {
        closeZakatForm(true);
      }
    });
  }

  var zakatFormTitleInput = document.getElementById("zakatFormTitleInput");
  if (zakatFormTitleInput) {
    zakatFormTitleInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var submitBtn = document.getElementById("zakatFormSubmit");
        if (submitBtn) submitBtn.click();
      }
    });
  }

  document.addEventListener("click", function (e) {
    var target = e.target.closest("#btnCompleteZakat");
    if (!target) return;

    var zakatId = state.zakat.currentId;
    if (!zakatId) {
      showToast("Zakat tidak ditemukan", "error");
      return;
    }

    var zakat = state.zakat.list.find(function (z) {
      return z.id === zakatId;
    });

    if (!zakat) {
      showToast("Zakat tidak ditemukan", "error");
      return;
    }

    if (isZakatCompleted(zakat)) {
      showToast("Zakat sudah ditandai selesai", "warning");
      return;
    }

    var totalMustahik = 0;
    if (zakat.mustahik && zakat.mustahik.length > 0) {
      totalMustahik = zakat.mustahik.reduce(function (sum, m) {
        return sum + (parseInt(m.nominal) || 0);
      }, 0);
    }

    var danaMustahik = 0;

    if (zakat.rincian && zakat.rincian.maal && zakat.rincian.maal.mustahik) {
      danaMustahik +=
        parseInt(zakat.rincian.maal.mustahik.kelompok?.nominal) || 0;
    }
    if (
      zakat.rincian &&
      zakat.rincian.fitrah &&
      zakat.rincian.fitrah.mustahik
    ) {
      danaMustahik += parseInt(zakat.rincian.fitrah.mustahik.nominal) || 0;
    }
    if (danaMustahik === 0 && zakat.rincian && zakat.rincian.mustahik) {
      danaMustahik = parseInt(zakat.rincian.mustahik.nominal) || 0;
    }

    if (danaMustahik > 0 && totalMustahik < danaMustahik) {
      showToast(
        "Mustahik belum teralokasi semua! (Rp " +
          fmtRp(danaMustahik - totalMustahik) +
          " tersisa)",
        "error",
      );
      return;
    }

    var desc = document.getElementById("completeZakatConfirmDesc");
    if (desc) {
      desc.innerHTML =
        "Zakat <strong>" +
        escapeHtml(zakat.title) +
        "</strong> akan ditandai sebagai selesai dan tidak dapat diedit lagi.";
    }
    var overlay = document.getElementById("completeZakatConfirmOverlay");
    if (overlay) {
      overlay.classList.remove("hidden");
    }
  });

  document.addEventListener("click", function (e) {
    var target = e.target.closest("#btnToggleCompleteZakat");
    if (!target) return;

    var zakatId = state.zakat.currentId;
    if (!zakatId) {
      showToast("Zakat tidak ditemukan", "error");
      return;
    }

    var zakat = state.zakat.list.find(function (z) {
      return z.id === zakatId;
    });
    if (!zakat) {
      showToast("Zakat tidak ditemukan", "error");
      return;
    }

    if (isZakatCompleted(zakat)) {
      var overlay = document.getElementById(
        "cancelCompleteZakatConfirmOverlay",
      );
      if (overlay) {
        var desc = document.getElementById("cancelCompleteZakatConfirmDesc");
        if (desc) {
          desc.innerHTML =
            "Zakat <strong>" +
            escapeHtml(zakat.title) +
            "</strong> akan dikembalikan ke status Aktif dan dapat diedit kembali.";
        }
        overlay.classList.remove("hidden");
      }
    } else {
      var overlay = document.getElementById("completeZakatConfirmOverlay");
      if (overlay) {
        var desc = document.getElementById("completeZakatConfirmDesc");
        if (desc) {
          desc.innerHTML =
            "Zakat <strong>" +
            escapeHtml(zakat.title) +
            "</strong> akan ditandai sebagai selesai dan tidak dapat diedit lagi.";
        }
        overlay.classList.remove("hidden");
      }
    }
  });

  document.addEventListener("click", function (e) {
    var target = e.target.closest("#btnCompleteZakatCancel");
    if (!target) return;
    var overlay = document.getElementById("completeZakatConfirmOverlay");
    if (overlay) overlay.classList.add("hidden");
  });

  document.addEventListener("click", function (e) {
    var overlay = document.getElementById("completeZakatConfirmOverlay");
    if (!overlay || overlay.classList.contains("hidden")) return;
    if (e.target === overlay) {
      overlay.classList.add("hidden");
    }
  });

  document.addEventListener("click", function (e) {
    var target = e.target.closest("#btnCompleteZakatConfirm");
    if (!target) return;

    var zakatId = state.zakat.currentId;
    if (!zakatId) {
      showToast("Zakat tidak ditemukan", "error");
      var overlay = document.getElementById("completeZakatConfirmOverlay");
      if (overlay) overlay.classList.add("hidden");
      return;
    }

    completeZakat(zakatId);

    var overlay = document.getElementById("completeZakatConfirmOverlay");
    if (overlay) overlay.classList.add("hidden");
  });

  document.addEventListener("click", function (e) {
    var target = e.target.closest("#btnCancelCompleteZakat");
    if (!target) return;

    var zakatId = state.zakat.currentId;
    if (!zakatId) {
      showToast("Zakat tidak ditemukan", "error");
      return;
    }

    var zakat = state.zakat.list.find(function (z) {
      return z.id === zakatId;
    });

    if (!zakat) {
      showToast("Zakat tidak ditemukan", "error");
      return;
    }

    if (!isZakatCompleted(zakat)) {
      showToast("Zakat tidak dalam status selesai", "warning");
      return;
    }

    var desc = document.getElementById("cancelCompleteZakatConfirmDesc");
    if (desc) {
      desc.innerHTML =
        "Zakat <strong>" +
        escapeHtml(zakat.title) +
        "</strong> akan ditandai sebagai selesai dan tidak dapat diedit lagi.";
    }
    var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
    if (overlay) {
      overlay.classList.remove("hidden");
    }
  });

  document.addEventListener("click", function (e) {
    var target = e.target.closest("#btnCancelCompleteZakatCancel");
    if (!target) return;
    var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
    if (overlay) overlay.classList.add("hidden");
  });

  document.addEventListener("click", function (e) {
    var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
    if (!overlay || overlay.classList.contains("hidden")) return;
    if (e.target === overlay) {
      overlay.classList.add("hidden");
    }
  });

  document.addEventListener("click", function (e) {
    var target = e.target.closest("#btnCancelCompleteZakatConfirm");
    if (!target) return;

    var zakatId = state.zakat.currentId;
    if (!zakatId) {
      showToast("Zakat tidak ditemukan", "error");
      var overlay = document.getElementById(
        "cancelCompleteZakatConfirmOverlay",
      );
      if (overlay) overlay.classList.add("hidden");
      return;
    }

    cancelCompleteZakat(zakatId);
    var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
    if (overlay) overlay.classList.add("hidden");
  });

  document
    .getElementById("btnDeleteZakat")
    ?.addEventListener("click", function () {
      var zakatId = state.zakat.currentId;
      if (!zakatId) {
        showToast("Zakat tidak ditemukan.", "error");
        return;
      }

      var zakat = getZakatById(zakatId);
      if (!zakat) {
        showToast("Zakat tidak ditemukan.", "error");
        return;
      }

      showZakatDeleteConfirm(zakatId);
    });

  document
    .getElementById("btnPrintZakat")
    ?.addEventListener("click", function () {
      var zakatId = state.zakat.currentId;
      if (!zakatId) {
        showToast("Zakat tidak ditemukan.", "error");
        return;
      }

      var zakat = getZakatById(zakatId);
      if (!zakat) {
        showToast("Zakat tidak ditemukan.", "error");
        return;
      }

      printZakatReport(zakatId);
    });

  document
    .getElementById("btnEditZakatHeader")
    ?.addEventListener("click", function () {
      openEditZakatHeader();
    });

  document
    .getElementById("zakatEditHeaderCancel")
    ?.addEventListener("click", function () {
      closeEditZakatHeader();
    });

  document
    .getElementById("zakatEditHeaderSubmit")
    ?.addEventListener("click", function () {
      submitEditZakatHeader();
    });

  document
    .getElementById("zakatEditHeaderOverlay")
    ?.addEventListener("click", function (e) {
      if (e.target === this) {
        closeEditZakatHeader();
      }
    });

  document
    .getElementById("zakatMuzakiEdit")
    ?.addEventListener("click", function () {
      openZakatMuzakiSheet();
    });

  document
    .getElementById("zakatMuzakiSheetCancel")
    ?.addEventListener("click", function () {
      closeZakatMuzakiSheet();
    });

  document
    .getElementById("zakatMuzakiSheetSubmit")
    ?.addEventListener("click", function () {
      submitZakatMuzakiSheet();
    });

  document
    .getElementById("zakatMuzakiSheet")
    ?.addEventListener("click", function (e) {
      if (e.target === this) {
        closeZakatMuzakiSheet();
      }
    });

  document
    .getElementById("zakatRincianEdit")
    ?.addEventListener("click", function () {
      openZakatRincianSheet();
    });

  document
    .getElementById("zakatRincianSheetCancel")
    ?.addEventListener("click", function () {
      closeZakatRincianSheet();
    });

  document
    .getElementById("zakatRincianSheetSubmit")
    ?.addEventListener("click", function () {
      submitZakatRincianSheet();
    });

  document
    .getElementById("zakatRincianSheet")
    ?.addEventListener("click", function (e) {
      if (e.target === this) {
        closeZakatRincianSheet();
      }
    });

  document
    .getElementById("zakatMustahikEdit")
    ?.addEventListener("click", function () {
      openZakatMustahikSheet();
    });

  document
    .getElementById("zakatMustahikSheetCancel")
    ?.addEventListener("click", function () {
      closeZakatMustahikSheet();
    });

  document
    .getElementById("zakatMustahikSheetSubmit")
    ?.addEventListener("click", function () {
      submitZakatMustahikSheet();
    });

  document
    .getElementById("zakatMustahikSheet")
    ?.addEventListener("click", function (e) {
      if (e.target === this) {
        closeZakatMustahikSheet();
      }
    });

  document
    .getElementById("zakatSaveAll")
    ?.addEventListener("click", function () {
      saveAllZakat();
    });

  setTimeout(function () {
    initZakatFilters();
  }, 500);

  setTimeout(function () {
    initZakatDatePicker();
  }, 300);
});

var rincianSheetInputs = [
  "zakatPersenMustahikSheet",
  "zakatPersenMustahikKelompokSheet",
  "zakatPersenMustahikDaerahSheet",
  "zakatPersenSabilillahSheet",
  "zakatPersenAmilSheet",
  "zakatPersenAmilKelompokSheet",
  "zakatPersenAmilDesaSheet",
  "zakatPersenAmilDaerahSheet",
];

rincianSheetInputs.forEach(function (id) {
  document.getElementById(id)?.addEventListener("input", function () {
    var zakat = getZakatById(state.zakat.currentId);
    if (zakat) {
      updateRincianSheet(zakat);
    }
  });
});

document
  .querySelectorAll("#zakatRincianSheet .zakat-default-btn")
  .forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = this.dataset.target;

      var defaults = {
        mustahik: { persen: 45, kelompok: 80, daerah: 20 },
        sabilillah: { persen: 40 },
        amil: { persen: 15, kelompok: 12, desa: 2, daerah: 1 },
      };

      var setValue = function (id, value) {
        var el = document.getElementById(id);
        if (el) {
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };

      if (target === "mustahik") {
        setValue("zakatPersenMustahikSheet", defaults.mustahik.persen);
        setValue(
          "zakatPersenMustahikKelompokSheet",
          defaults.mustahik.kelompok,
        );
        setValue("zakatPersenMustahikDaerahSheet", defaults.mustahik.daerah);
      } else if (target === "sabilillah") {
        setValue("zakatPersenSabilillahSheet", defaults.sabilillah.persen);
      } else if (target === "amil") {
        setValue("zakatPersenAmilSheet", defaults.amil.persen);
        setValue("zakatPersenAmilKelompokSheet", defaults.amil.kelompok);
        setValue("zakatPersenAmilDesaSheet", defaults.amil.desa);
        setValue("zakatPersenAmilDaerahSheet", defaults.amil.daerah);
      }

      var zakat = getZakatById(state.zakat.currentId);
      if (zakat) {
        updateRincianSheet(zakat);
      }
    });
  });

document
  .getElementById("zakatRincianSheet")
  ?.addEventListener("click", function (e) {
    if (e.target === this) {
      closeZakatRincianSheet();
    }
  });

document
  .getElementById("zakatMustahikSheetCancel")
  ?.addEventListener("click", function () {
    closeZakatMustahikSheet();
  });

document
  .getElementById("zakatMustahikSheetSubmit")
  ?.addEventListener("click", function () {
    submitZakatMustahikSheet();
  });

document
  .getElementById("zakatMustahikSheetCount")
  ?.addEventListener("change", function () {
    var zakat = getZakatById(state.zakat.currentId);
    if (zakat) {
      var newCount = parseInt(this.value) || 1;
      while (zakat.mustahik.length < newCount) {
        zakat.mustahik.push({
          id:
            "MS" +
            Date.now().toString(36).toUpperCase() +
            Math.random().toString(36).substring(2, 5),
          nama: "",
          nominal: 0,
          jenis_zakat: "",
        });
      }
      if (zakat.mustahik.length > newCount) {
        zakat.mustahik = zakat.mustahik.slice(0, newCount);
      }
      renderMustahikSheetRows(zakat);
      updateMustahikSheetTotal(zakat);
    }
  });

document
  .getElementById("zakatMustahikSheet")
  ?.addEventListener("click", function (e) {
    if (e.target === this) {
      closeZakatMustahikSheet();
    }
  });

function renderZakatMuzakiView(zakat) {
  var groupsEl = document.getElementById("zakatMuzakiGroups");
  var tbody = document.getElementById("zakatMuzakiTableBody");
  var countDisplay = document.getElementById("zakatMuzakiCountDisplay");
  var totalEl = document.getElementById("zakatMuzakiTableTotal");
  var wrapper = document.getElementById("zakatMuzakiTableWrapper");

  if (!tbody) return;

  var muzakiList = zakat.muzaki || [];
  var groups = groupMuzakiByJenis(muzakiList);

  var activeMuzaki = [];
  Object.keys(groups).forEach(function (j) {
    activeMuzaki = activeMuzaki.concat(groups[j]);
  });

  if (countDisplay) countDisplay.textContent = activeMuzaki.length + " orang";

  var grandTotal = sumNominal(activeMuzaki);

  if (groupsEl) {
    var html = "";
    Object.keys(groups).forEach(function (jenis) {
      var list = groups[jenis];
      if (list.length === 0) return;

      var total = sumNominal(list);
      var label = jenis === "LAINNYA" ? "Lainnya" : jenis;

      html +=
        '<div class="zakat-muzaki-group" data-jenis="' +
        escapeHtml(jenis) +
        '">' +
        '<div class="zakat-muzaki-group-header" ' +
        'style="display:flex;justify-content:space-between;align-items:center;' +
        'padding:10px 12px;background:var(--surface-alt);border-radius:8px;margin:12px 0 6px;">' +
        '<span style="font-weight:700;font-size:12.5px;color:var(--ink);">' +
        escapeHtml(label) +
        "</span>" +
        '<span style="font-weight:700;font-size:12.5px;color:var(--brand);">' +
        fmtRp(total) +
        "</span>" +
        "</div>" +
        '<div class="zakat-table-wrapper">' +
        '<table class="zakat-table">' +
        "<thead><tr>" +
        '<th style="width:8%;text-align:center;">No</th>' +
        '<th style="text-align:left;">Nama Muzaki</th>' +
        '<th style="text-align:right;width:40%;">Nominal</th>' +
        "</tr></thead><tbody>";

      list.forEach(function (m, idx) {
        html +=
          "<tr>" +
          '<td style="text-align:center;font-weight:600;color:var(--ink-faint);font-size:13px;">' +
          (idx + 1) +
          "</td>" +
          '<td style="font-weight:500;">' +
          escapeHtml(m.muzakki_name || m.nama || "-") +
          "</td>" +
          '<td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">' +
          fmtRp(m.amount !== undefined ? m.amount : (m.nominal || 0)) +
          "</td>" +
          "</tr>";
      });

      html +=
        "</tbody>" +
        '<tfoot><tr class="zakat-table-total">' +
        '<td colspan="2" style="text-align:right;font-weight:700;font-size:13px;padding:10px;">Total</td>' +
        '<td style="text-align:right;font-weight:700;font-size:14px;padding:10px;color:var(--brand);">' +
        fmtRp(total) +
        "</td>" +
        "</tr></tfoot>" +
        "</table></div></div>";
    });

    groupsEl.innerHTML =
      html ||
      '<div style="text-align:center;padding:24px 10px;color:var(--ink-faint);font-size:13px;">Belum ada data muzaki</div>';

    if (wrapper) wrapper.style.display = "none";
  } else {
    if (wrapper) wrapper.style.display = "";
    if (activeMuzaki.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" style="text-align:center;padding:24px 10px;color:var(--ink-faint);font-size:13px;">Belum ada data muzaki</td></tr>';
    } else {
      tbody.innerHTML = activeMuzaki
        .map(function (m, i) {
          return (
            '<tr><td style="text-align:center;font-weight:600;color:var(--ink-faint);font-size:13px;">' +
            (i + 1) +
            '</td><td style="font-weight:500;">' +
            escapeHtml(m.muzakki_name || m.nama || "-") +
            '</td><td style="text-align:right;font-weight:600;">' +
            fmtRp(m.amount !== undefined ? m.amount : (m.nominal || 0)) +
            "</td></tr>"
          );
        })
        .join("");
    }
  }

  if (totalEl) totalEl.textContent = fmtRp(grandTotal);
}

function renderZakatMustahikView(zakat) {
  var groupsEl = document.getElementById("zakatMustahikGroups");
  var tbody = document.getElementById("zakatMustahikTableBody");
  var totalEl = document.getElementById("zakatMustahikTableTotal");
  var countEl = document.getElementById("zakatMustahikCountDisplay");
  var danaEl = document.getElementById("zakatMustahikDanaView");
  var tersalurkanEl = document.getElementById("zakatMustahikTersalurkan");
  var sisaEl = document.getElementById("zakatMustahikSisaView");
  var statusEl = document.getElementById("zakatMustahikStatusView");
  var progressEl = document.getElementById("zakatMustahikProgressView");
  var progressLabelEl = document.getElementById("zakatMustahikProgressLabel");
  var wrapper = document.getElementById("zakatMustahikTableWrapper");

  if (!tbody) return;

  var mustahik = zakat.mustahik || [];
  var groups = groupMustahikByJenis(mustahik);

  var activeMustahik = [];
  Object.keys(groups).forEach(function (j) {
    activeMustahik = activeMustahik.concat(groups[j]);
  });

  var total = sumNominal(activeMustahik);

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

  if (danaEl) danaEl.textContent = fmtRp(danaMustahik);
  if (tersalurkanEl) {
    tersalurkanEl.textContent = fmtRp(total);
    tersalurkanEl.style.color = total > 0 ? "var(--pos)" : "var(--ink-soft)";
  }
  if (sisaEl) {
    sisaEl.textContent = fmtRp(sisa);
    sisaEl.style.color = sisa > 0 ? "var(--pos)" : "var(--ink-soft)";
  }
  if (progressEl) {
    var clampedProgress = Math.min(100, Math.max(0, progress));
    progressEl.style.width = clampedProgress + "%";
    progressEl.style.background =
      clampedProgress >= 100 ? "var(--pos)" : "var(--brand)";
  }
  if (progressLabelEl) {
    progressLabelEl.textContent = Math.round(progress) + "% dari dana mustahik";
  }

  if (statusEl) {
    var badgeClass = "idle";
    var badgeText = "Belum diatur";
    if (danaMustahik === 0) {
      badgeClass = "idle";
      badgeText = "Belum diatur";
    } else if (total === 0) {
      badgeClass = "warning";
      badgeText = "Belum ada alokasi";
    } else if (total === danaMustahik) {
      badgeClass = "saved";
      badgeText = "Seimbang";
    } else if (total < danaMustahik) {
      badgeClass = "warning";
      badgeText = "Kurang " + fmtRp(danaMustahik - total);
    } else {
      badgeClass = "invalid";
      badgeText = "Kelebihan " + fmtRp(total - danaMustahik);
    }
    statusEl.innerHTML =
      '<span class="zakat-status-badge ' +
      badgeClass +
      '">' +
      badgeText +
      "</span>";
  }

  if (countEl) countEl.textContent = activeMustahik.length + " orang";

  if (groupsEl) {
    var html = "";
    Object.keys(groups).forEach(function (jenis) {
      var list = groups[jenis];
      if (list.length === 0) return;

      var gTotal = sumNominal(list);
      var label = jenis === "LAINNYA" ? "Lainnya" : jenis;

      html +=
        '<div class="zakat-mustahik-group" data-jenis="' +
        escapeHtml(jenis) +
        '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;' +
        'padding:10px 12px;background:var(--surface-alt);border-radius:8px;margin:12px 0 6px;">' +
        '<span style="font-weight:700;font-size:12.5px;color:var(--ink);">' +
        escapeHtml(label) +
        "</span>" +
        '<span style="font-weight:700;font-size:12.5px;color:var(--brand);">' +
        fmtRp(gTotal) +
        "</span>" +
        "</div>" +
        '<div class="zakat-table-wrapper">' +
        '<table class="zakat-table">' +
        "<thead><tr>" +
        '<th style="width:8%;text-align:center;">No</th>' +
        '<th style="text-align:left;">Nama Mustahik</th>' +
        '<th style="text-align:right;width:40%;">Nominal</th>' +
        "</tr></thead><tbody>";

      list.forEach(function (m, idx) {
        html +=
          "<tr>" +
          '<td style="text-align:center;padding:8px 10px;">' +
          (idx + 1) +
          "</td>" +
          '<td style="text-align:left;padding:8px 10px;">' +
          escapeHtml(m.mustahik_name || m.nama || "-") +
          "</td>" +
          '<td style="text-align:right;padding:8px 10px;">' +
          fmtRp(m.amount !== undefined ? m.amount : (m.nominal || 0)) +
          "</td>" +
          "</tr>";
      });

      html +=
        "</tbody>" +
        '<tfoot><tr class="zakat-table-total">' +
        '<td colspan="2" style="text-align:right;font-weight:700;font-size:13px;padding:10px;">Total</td>' +
        '<td style="text-align:right;font-weight:700;font-size:14px;padding:10px;color:var(--brand);">' +
        fmtRp(gTotal) +
        "</td>" +
        "</tr></tfoot>" +
        "</table></div></div>";
    });

    groupsEl.innerHTML =
      html ||
      '<div class="zakat-table-empty" style="text-align:center;padding:24px 10px;color:var(--ink-faint);font-size:13px;">Belum ada data mustahik.</div>';

    if (wrapper) wrapper.style.display = "none";
  } else {
    if (wrapper) wrapper.style.display = "";
    if (activeMustahik.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="zakat-table-empty">Belum ada data mustahik.</td></tr>';
    } else {
      tbody.innerHTML = activeMustahik
        .map(function (m, i) {
          return (
            '<tr><td style="text-align:center;padding:8px 10px;">' +
            (i + 1) +
            '</td><td style="text-align:left;padding:8px 10px;">' +
            escapeHtml(m.mustahik_name || m.nama || "-") +
            '</td><td style="text-align:right;padding:8px 10px;">' +
            fmtRp(m.amount !== undefined ? m.amount : (m.nominal || 0)) +
            "</td></tr>"
          );
        })
        .join("");
    }
  }

  if (totalEl) totalEl.textContent = fmtRp(total);
}

function renderZakatRincianView(zakat) {
  var groupsEl = document.getElementById("zakatRincianGroups");
  var legacyEl = document.getElementById("zakatRincianLegacy");
  var r = zakat.rincian || {};

  var jenisGroups = [
    { key: "fitrah", label: "Zakat Fitrah", data: r.fitrah },
    { key: "maal", label: "Zakat Maal, Tijaroh, Zuru' & Ternak", data: r.maal },
  ];

  if (groupsEl) {
    var html = "";
    var hasAny = false;

    jenisGroups.forEach(function (g) {
      if (!g.data) return;
      var d = g.data;

      var total = Number(d.total) || 0;
      var mustahikNominal = Number((d.mustahik || {}).nominal) || 0;
      var sabilillahNominal = Number((d.sabilillah || {}).nominal) || 0;
      var amilNominal = Number((d.amil || {}).nominal) || 0;

      if (
        total === 0 &&
        mustahikNominal === 0 &&
        sabilillahNominal === 0 &&
        amilNominal === 0
      ) {
        return;
      }
      hasAny = true;

      var mustahikPersen = Number((d.mustahik || {}).persen) || 0;
      var sabilillahPersen = Number((d.sabilillah || {}).persen) || 0;
      var amilPersen = Number((d.amil || {}).persen) || 0;
      var kelompokPersen =
        Number(((d.mustahik || {}).kelompok || {}).persen) || 0;
      var daerahPersen = Number(((d.mustahik || {}).daerah || {}).persen) || 0;
      var kelompokNominal =
        Number(((d.mustahik || {}).kelompok || {}).nominal) || 0;
      var daerahNominal =
        Number(((d.mustahik || {}).daerah || {}).nominal) || 0;
      var amilKelompokPersen =
        Number(((d.amil || {}).kelompok || {}).persen) || 0;
      var amilDesaPersen = Number(((d.amil || {}).desa || {}).persen) || 0;
      var amilDaerahPersen = Number(((d.amil || {}).daerah || {}).persen) || 0;
      var amilKelompokNominal =
        Number(((d.amil || {}).kelompok || {}).nominal) || 0;
      var amilDesaNominal = Number(((d.amil || {}).desa || {}).nominal) || 0;
      var amilDaerahNominal =
        Number(((d.amil || {}).daerah || {}).nominal) || 0;

      html +=
        '<div class="zakat-rincian-jenis-block" data-jenis="' +
        g.key +
        '" style="margin-bottom:16px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;' +
        'padding:10px 12px;background:var(--surface-alt);border-radius:8px;margin:0 0 8px;">' +
        '<span style="font-weight:700;font-size:12.5px;color:var(--ink);">' +
        escapeHtml(g.label) +
        "</span>" +
        '<span style="font-weight:700;font-size:12.5px;color:var(--brand);">' +
        fmtRp(total) +
        "</span>" +
        "</div>" +
        '<div class="zakat-rincian-grid">' +
        '<div class="zakat-rincian-group">' +
        '<div class="zakat-rincian-group-header">' +
        '<span class="zakat-rincian-group-title">Mustahik</span>' +
        '<span class="zakat-rincian-group-total">' +
        mustahikPersen +
        "% · " +
        fmtRp(mustahikNominal) +
        "</span>" +
        "</div>" +
        '<div class="zakat-rincian-group-items">' +
        '<div class="zakat-rincian-group-item"><span>Kelompok</span><span>' +
        kelompokPersen +
        "% · " +
        fmtRp(kelompokNominal) +
        "</span></div>" +
        '<div class="zakat-rincian-group-item"><span>Daerah</span><span>' +
        daerahPersen +
        "% · " +
        fmtRp(daerahNominal) +
        "</span></div>" +
        "</div></div>" +
        '<div class="zakat-rincian-group">' +
        '<div class="zakat-rincian-group-header">' +
        '<span class="zakat-rincian-group-title">Sabilillah</span>' +
        '<span class="zakat-rincian-group-total">' +
        sabilillahPersen +
        "% · " +
        fmtRp(sabilillahNominal) +
        "</span>" +
        "</div></div>" +
        '<div class="zakat-rincian-group">' +
        '<div class="zakat-rincian-group-header">' +
        '<span class="zakat-rincian-group-title">Amil</span>' +
        '<span class="zakat-rincian-group-total">' +
        amilPersen +
        "% · " +
        fmtRp(amilNominal) +
        "</span>" +
        "</div>" +
        '<div class="zakat-rincian-group-items">' +
        '<div class="zakat-rincian-group-item"><span>Kelompok</span><span>' +
        amilKelompokPersen +
        "% · " +
        fmtRp(amilKelompokNominal) +
        "</span></div>" +
        '<div class="zakat-rincian-group-item"><span>Desa</span><span>' +
        amilDesaPersen +
        "% · " +
        fmtRp(amilDesaNominal) +
        "</span></div>" +
        '<div class="zakat-rincian-group-item"><span>Daerah</span><span>' +
        amilDaerahPersen +
        "% · " +
        fmtRp(amilDaerahNominal) +
        "</span></div>" +
        "</div></div>" +
        "</div></div>";
    });

    groupsEl.innerHTML =
      html ||
      '<div style="text-align:center;padding:24px 10px;color:var(--ink-faint);font-size:13px;">Belum ada rincian alokasi</div>';

    if (legacyEl) legacyEl.style.display = "none";
  } else if (legacyEl) {
    legacyEl.style.display = "";
    renderZakatRincianViewLegacy(zakat);
  }

  var statusEl = document.getElementById("zakatRincianStatus");
  if (statusEl) {
    var hasSaved =
      (r.fitrah && r.fitrah.total > 0) || (r.maal && r.maal.total > 0);
    statusEl.textContent = hasSaved ? "✓ Tersimpan" : "● Belum disimpan";
    statusEl.className = "zakat-tab-status " + (hasSaved ? "saved" : "unsaved");
  }
}
