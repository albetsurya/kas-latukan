// ============================================================
// ZAKAT - ZAKAT.JS (LENGKAP)
// ============================================================

// ============================================================
// ZAKAT - LOAD DATA DENGAN LOADER
// ============================================================

let zakatDataLoading = false;
let zakatDataLoaded = false;

async function loadZakatData() {
  if (zakatDataLoading) {
    console.log("⏳ Zakat data already loading, waiting...");
    return new Promise(function (resolve) {
      var checkInterval = setInterval(function () {
        if (!zakatDataLoading) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  if (zakatDataLoaded && state.zakat.list && state.zakat.list.length > 0) {
    console.log("✅ Zakat data already loaded, using cache");
    renderZakatList();

    // ✅ TAMBAHKAN: Jika ada detail yang terbuka, refresh view
    if (state.zakat && state.zakat.isViewOpen && state.zakat.currentId) {
      var zakat = getZakatById(state.zakat.currentId);
      if (zakat) {
        console.log("🔄 Refreshing detail view for:", zakat.id);
        renderZakatMuzakiView(zakat);
        renderZakatRincianView(zakat);
        renderZakatMustahikView(zakat);
      }
    }
    return;
  }

  zakatDataLoading = true;

  try {
    showZakatLoader("Memuat data zakat...");
    var response = await apiGetZakatList();

    if (response && response.success === true) {
      var data = response.data || [];
      state.zakat.list = data;
      saveZakatData(state.zakat.list);
      console.log("✅ Zakat data loaded from API:", data.length, "items");

      // ✅ TAMBAHKAN: Log data muzaki untuk debug
      if (data.length > 0) {
        console.log("🔍 First zakat muzaki:", data[0]?.muzaki);
        console.log("🔍 First zakat rincian:", data[0]?.rincian);
      }

      zakatDataLoaded = true;
    } else {
      console.warn("⚠️ API gagal, gunakan data lokal");
      state.zakat.list = getZakatData();
      if (response && response.message) {
        showToast(response.message, "warning");
      }
      zakatDataLoaded = true;
    }

    renderZakatList();

    // ✅ TAMBAHKAN: Jika ada detail yang terbuka, refresh view setelah data dimuat
    if (state.zakat && state.zakat.isViewOpen && state.zakat.currentId) {
      var zakat = getZakatById(state.zakat.currentId);
      if (zakat) {
        console.log("🔄 Refreshing detail view after load for:", zakat.id);
        setTimeout(function () {
          renderZakatMuzakiView(zakat);
          renderZakatRincianView(zakat);
          renderZakatMustahikView(zakat);
        }, 100);
      }
    }

    hideZakatLoader();
  } catch (err) {
    console.error("❌ Error loading zakat:", err);
    state.zakat.list = getZakatData();
    renderZakatList();
    hideZakatLoader();
    showToast("Gagal sync data zakat, menggunakan data lokal", "warning");
  } finally {
    zakatDataLoading = false;
  }
}

async function refreshZakatData() {
  zakatDataLoaded = false;
  await loadZakatData();
}

// ============================================================
// ZAKAT - SYNC TO BACKEND
// ============================================================

async function syncZakatToBackend(data) {
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
    console.error("Sync zakat error:", err);
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

// ============================================================
// ZAKAT - CRUD
// ============================================================

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
    console.error("Create zakat error:", err);
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

// ============================================================
// ZAKAT - DELETE & PRINT HANDLERS
// ============================================================

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

function printZakatReport(zakatId) {
  var zakat = getZakatById(zakatId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }
  showToast("Fitur print sedang dalam pengembangan.", "info");
}

// ============================================================
// ZAKAT - BOTTOM SHEET FORM
// ============================================================

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

  if (!overlay) {
    console.warn("⚠️ zakatFormOverlay not found");
    return;
  }

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

// ============================================================
// ZAKAT - SUBMIT FORM
// ============================================================

async function submitZakatForm() {
  var title = document.getElementById("zakatFormTitleInput").value.trim();
  var keterangan = document.getElementById("zakatFormKeterangan").value.trim();
  var tanggal = document.getElementById("zakatFormTanggal").value;
  var tempat = document.getElementById("zakatFormTempat").value.trim();

  if (!title) {
    showToast("Judul zakat wajib diisi.", "error");
    return;
  }

  if (!tanggal) {
    showToast("Tanggal pelaksanaan wajib diisi.", "error");
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
        title: title,
        keterangan: keterangan,
        tanggal: tanggal,
        tempat: tempat,
        updatedAt: new Date().toISOString(),
      };
    } else {
      zakatData = createZakatItem({
        title: title,
        keterangan: keterangan,
        tanggal: tanggal,
        tempat: tempat,
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
    console.error("Submit zakat error:", err);
    showToast("Gagal menyimpan zakat: " + err.message, "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

// ============================================================
// ZAKAT - FAB HANDLER
// ============================================================

document.getElementById("fabZakat").addEventListener("click", function () {
  if (state.zakat && state.zakat.isViewOpen) {
    closeZakatDetail();
  }
  openZakatForm(null);
});

// ============================================================
// ZAKAT - DETAIL
// ============================================================

function openZakatDetail(id) {
  console.log("🔍 openZakatDetail dipanggil dengan ID:", id);

  var zakat = getZakatById(id);
  if (!zakat) {
    console.warn("⚠️ Zakat tidak ditemukan untuk ID:", id);
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  console.log("🔍 Zakat ditemukan:", zakat);
  console.log("🔍 Muzaki di zakat:", zakat.muzaki);

  state.zakat.currentId = id;
  state.zakat.isViewOpen = true;

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

  // Update header
  updateZakatDetailHeader(zakat);

  // ✅ Reset tabs dan panel dengan display control
  var tabs = document.querySelectorAll(".zakat-tab");
  var panels = {
    muzaki: document.getElementById("zakatTabMuzaki"),
    rincian: document.getElementById("zakatTabRincian"),
    mustahik: document.getElementById("zakatTabMustahik"),
  };

  // ✅ Reset semua tab
  tabs.forEach(function (t) {
    t.classList.remove("active");
    t.style.background = "var(--surface)";
    t.style.color = "var(--ink-soft)";
  });

  // ✅ Sembunyikan SEMUA panel
  Object.keys(panels).forEach(function (key) {
    var panel = panels[key];
    if (panel) {
      panel.classList.remove("active");
      panel.style.display = "none"; // ← PASTIKAN SEMBUNYI
    }
  });

  // ✅ Aktifkan tab Muzaki (default)
  var firstTab = document.querySelector('.zakat-tab[data-zakat-tab="muzaki"]');
  if (firstTab) {
    firstTab.classList.add("active");
    firstTab.style.background = "var(--brand)";
    firstTab.style.color = "#fff";
  }

  // ✅ Tampilkan panel Muzaki
  if (panels.muzaki) {
    panels.muzaki.classList.add("active");
    panels.muzaki.style.display = "block";
  }

  // ✅ Render semua tab
  console.log("🔍 Calling render functions...");
  renderZakatMuzakiView(zakat);
  renderZakatRincianView(zakat);
  renderZakatMustahikView(zakat);
  console.log("✅ All render functions called");
}

function updateZakatDetailHeader(zakat) {
  var titleEl = document.getElementById("zakatDetailTitle");
  var metaEl = document.getElementById("zakatDetailMeta");
  var keteranganEl = document.getElementById("zakatDetailKeterangan");
  var totalEl = document.getElementById("zakatDetailTotal");

  if (titleEl) titleEl.textContent = escapeHtml(zakat.title || "Zakat");
  if (metaEl) {
    metaEl.textContent =
      (zakat.tanggal ? fmtDateShort(zakat.tanggal) : "-") +
      " · " +
      escapeHtml(zakat.tempat || "Tempat tidak ditentukan");
  }
  if (keteranganEl) {
    keteranganEl.textContent = zakat.keterangan || "Tidak ada keterangan";
    keteranganEl.style.display = zakat.keterangan ? "block" : "none";
  }
  if (totalEl) totalEl.textContent = fmtRp(zakat.total || 0);
}

function closeZakatDetail() {
  state.zakat.currentId = null;
  state.zakat.isViewOpen = false;

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

  renderZakatList();
}

// ============================================================
// ZAKAT - EDIT HEADER
// ============================================================

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
    zakat.keterangan || "";
  document.getElementById("zakatEditHeaderTanggal").value = zakat.tanggal || "";
  document.getElementById("zakatEditHeaderTempat").value = zakat.tempat || "";

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

  if (!title) {
    showToast("Judul zakat wajib diisi.", "error");
    return;
  }

  if (!tanggal) {
    showToast("Tanggal pelaksanaan wajib diisi.", "error");
    return;
  }

  var btn = document.getElementById("zakatEditHeaderSubmit");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    zakat.title = title;
    zakat.keterangan = keterangan;
    zakat.tanggal = tanggal;
    zakat.tempat = tempat;
    zakat.updatedAt = new Date().toISOString();

    var idx = state.zakat.list.findIndex(function (z) {
      return z.id === zakat.id;
    });
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    showZakatLoader("Menyimpan data header...");
    var result = await apiUpdateZakatHeader({
      id: zakat.id,
      title: zakat.title,
      keterangan: zakat.keterangan,
      tanggal: zakat.tanggal,
      tempat: zakat.tempat,
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
    console.error("Edit header error:", err);
    showToast("Gagal menyimpan: " + err.message, "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

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

var zakatEditHeaderSubmit = document.getElementById("zakatEditHeaderSubmit");
if (zakatEditHeaderSubmit) {
  zakatEditHeaderSubmit.onclick = async function () {
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

    if (!title) {
      showToast("Judul zakat wajib diisi.", "error");
      return;
    }

    if (!tanggal) {
      showToast("Tanggal pelaksanaan wajib diisi.", "error");
      return;
    }

    var btn = this;
    showZakatButtonLoading(btn, "Menyimpan...");

    try {
      zakat.title = title;
      zakat.keterangan = keterangan;
      zakat.tanggal = tanggal;
      zakat.tempat = tempat;
      zakat.updatedAt = new Date().toISOString();

      var idx = state.zakat.list.findIndex(function (z) {
        return z.id === zakat.id;
      });
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
        saveZakatData(state.zakat.list);
      }

      showZakatLoader("Menyimpan data header...");
      var result = await apiUpdateZakatHeader({
        id: zakat.id,
        title: zakat.title,
        keterangan: zakat.keterangan,
        tanggal: zakat.tanggal,
        tempat: zakat.tempat,
      });

      if (result.success) {
        updateZakatDetailHeader(zakat);
        var overlay = document.getElementById("zakatEditHeaderOverlay");
        if (overlay) overlay.classList.add("hidden");
        showToast("Data zakat berhasil diperbarui!", "success");
      } else {
        updateZakatDetailHeader(zakat);
        var overlay = document.getElementById("zakatEditHeaderOverlay");
        if (overlay) overlay.classList.add("hidden");
        showToast("Data header disimpan (offline mode)", "warning");
      }

      renderZakatList();
    } catch (err) {
      console.error("Edit header error:", err);
      showToast("Gagal menyimpan: " + err.message, "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
}

document
  .getElementById("zakatEditHeaderOverlay")
  ?.addEventListener("click", function (e) {
    if (e.target === this) {
      closeEditZakatHeader();
    }
  });

// ============================================================
// ZAKAT - SAVE ALL
// ============================================================

async function saveAllZakat() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var totalPersen = Number(
    document.getElementById("zakatTotalPersen")?.textContent || 0,
  );
  if (totalPersen !== 100) {
    showToast("Total persentase harus 100%! Cek tab Rincian.", "error");
    return;
  }

  if (!zakat.muzaki || zakat.muzaki.length === 0) {
    showToast("Tambahkan minimal satu Muzaki.", "error");
    return;
  }

  if (!zakat.mustahik || zakat.mustahik.length === 0) {
    showToast("Tambahkan minimal satu Mustahik.", "error");
    return;
  }

  var btn = document.getElementById("zakatSaveAll");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    showZakatLoader("Menyimpan semua data zakat...");
    var result = await syncZakatToBackend(zakat);

    if (result.success) {
      showToast("Semua data berhasil disimpan!", "success");
    } else {
      if (result.offline) {
        showToast(result.message || "Data disimpan lokal", "warning");
      } else {
        showToast(result.message || "Gagal menyimpan data", "error");
      }
    }

    renderZakatList();
  } catch (err) {
    console.error("Save all error:", err);
    showToast("Gagal menyimpan: " + err.message, "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

document.getElementById("zakatSaveAll")?.addEventListener("click", function () {
  saveAllZakat();
});

// ============================================================
// ZAKAT - LIST ITEM ACTION SHEET
// ============================================================

function openZakatActionSheet(zakatId) {
  var zakat = getZakatById(zakatId);
  if (!zakat) return;

  var overlay = document.createElement("div");
  overlay.className = "sheet-overlay sheet-action";
  overlay.id = "zakatActionOverlay";
  overlay.innerHTML = `
    <div class="sheet">
      <div class="sheet-header sheet-header-action">
        <div class="sheet-handle"></div>
        <h3 class="sheet-title">${escapeHtml(zakat.title)}</h3>
        <p class="sheet-subtitle">${zakat.tanggal ? fmtDateShort(zakat.tanggal) : "-"} · ${escapeHtml(zakat.tempat || "Tempat tidak ditentukan")}</p>
      </div>

      <div class="sheet-scroll">
        <div class="action-list">
          <button type="button" id="zakatActionEdit" class="action-item">
            <span class="icon-btn" style="pointer-events:none;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
              </svg>
            </span>
            <span>Edit Zakat</span>
            <svg class="action-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" stroke-width="1.7">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          <button type="button" id="zakatActionDelete" class="action-item danger">
            <span class="icon-btn" style="pointer-events:none;color:var(--neg);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/>
              </svg>
            </span>
            <span>Hapus Zakat</span>
            <svg class="action-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neg)" stroke-width="1.7">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>

      <button type="button" id="zakatActionCancel" class="btn-cancel">Batal</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay
    .querySelector("#zakatActionCancel")
    .addEventListener("click", function () {
      overlay.remove();
    });

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) overlay.remove();
  });

  overlay
    .querySelector("#zakatActionEdit")
    .addEventListener("click", function () {
      overlay.remove();
      if (state.zakat.isViewOpen) closeZakatDetail();
      openZakatForm(zakatId);
    });

  overlay
    .querySelector("#zakatActionDelete")
    .addEventListener("click", function () {
      overlay.remove();
      showZakatDeleteConfirm(zakatId);
    });
}

// ============================================================
// TOMBOL TANDAI SELESAI & BATALKAN SELESAI
// ============================================================

// Buka modal konfirmasi complete
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

  // Cek apakah sudah selesai
  if (zakat.status === "COMPLETED" || zakat.status === "SELESAI") {
    showToast("Zakat sudah ditandai selesai", "warning");
    return;
  }

  // Validasi: cek mustahik sudah teralokasi
  var totalMustahik = 0;
  if (zakat.mustahik && zakat.mustahik.length > 0) {
    totalMustahik = zakat.mustahik.reduce(function (sum, m) {
      return sum + (parseInt(m.nominal) || 0);
    }, 0);
  }

  var danaMustahik = 0;
  if (
    zakat.rincian &&
    zakat.rincian.mustahik &&
    zakat.rincian.mustahik.nominal
  ) {
    danaMustahik = parseInt(zakat.rincian.mustahik.nominal) || 0;
  }

  // Jika dana mustahik > 0, cek apakah sudah teralokasi semua
  if (danaMustahik > 0 && totalMustahik < danaMustahik) {
    showToast(
      "Mustahik belum teralokasi semua! (Rp " +
        fmtRp(danaMustahik - totalMustahik) +
        " tersisa)",
      "error",
    );
    return;
  }

  // Tampilkan modal konfirmasi
  var desc = document.getElementById("completeZakatConfirmDesc");
  if (desc) {
    desc.textContent =
      'Zakat "' +
      zakat.title +
      '" akan ditandai sebagai selesai dan tidak dapat diedit lagi.';
  }
  var overlay = document.getElementById("completeZakatConfirmOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
  }
});

// Tutup modal complete
document.addEventListener("click", function (e) {
  var target = e.target.closest("#btnCompleteZakatCancel");
  if (!target) return;
  var overlay = document.getElementById("completeZakatConfirmOverlay");
  if (overlay) overlay.classList.add("hidden");
});

// Klik di luar modal complete
document.addEventListener("click", function (e) {
  var overlay = document.getElementById("completeZakatConfirmOverlay");
  if (!overlay || overlay.classList.contains("hidden")) return;
  if (e.target === overlay) {
    overlay.classList.add("hidden");
  }
});

// Konfirmasi complete
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

// ============================================================
// CANCEL COMPLETE ZAKAT - TOMBOK & MODAL
// ============================================================

// Buka modal konfirmasi cancel complete
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

  // Tampilkan modal konfirmasi
  var desc = document.getElementById("cancelCompleteZakatConfirmDesc");
  if (desc) {
    desc.textContent =
      'Zakat "' +
      zakat.title +
      '" akan dikembalikan ke status Aktif dan dapat diedit kembali.';
  }
  var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
  if (overlay) {
    overlay.classList.remove("hidden");
  }
});

// Tutup modal cancel complete
document.addEventListener("click", function (e) {
  var target = e.target.closest("#btnCancelCompleteZakatCancel");
  if (!target) return;
  var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
  if (overlay) overlay.classList.add("hidden");
});

// Klik di luar modal cancel complete
document.addEventListener("click", function (e) {
  var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
  if (!overlay || overlay.classList.contains("hidden")) return;
  if (e.target === overlay) {
    overlay.classList.add("hidden");
  }
});

// Konfirmasi cancel complete
document.addEventListener("click", function (e) {
  var target = e.target.closest("#btnCancelCompleteZakatConfirm");
  if (!target) return;
  var zakatId = state.zakat.currentId;
  if (!zakatId) {
    showToast("Zakat tidak ditemukan", "error");
    var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
    if (overlay) overlay.classList.add("hidden");
    return;
  }
  cancelCompleteZakat(zakatId);
  var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
  if (overlay) overlay.classList.add("hidden");
});

// ============================================================
// FUNGSI COMPLETE ZAKAT - DENGAN AWAIT & ROLLBACK
// ============================================================

async function completeZakat(zakatId) {
  var zakat = state.zakat.list.find(function (z) {
    return z.id === zakatId;
  });

  if (!zakat) {
    showToast("Zakat tidak ditemukan", "error");
    return;
  }

  // Cek apakah sudah selesai
  if (isZakatCompleted(zakat)) {
    showToast("Zakat sudah ditandai selesai", "warning");
    return;
  }

  // Simpan data lama untuk rollback jika gagal
  var previousStatus = zakat.status;
  var previousCompletedAt = zakat.completedAt;

  // ✅ Optimistic update: ubah dulu di lokal
  zakat.status = ZAKAT_STATUS.COMPLETED;
  zakat.completedAt = new Date().toISOString();

  // Update di state
  var idx = state.zakat.list.findIndex(function (z) {
    return z.id === zakatId;
  });
  if (idx !== -1) {
    state.zakat.list[idx] = zakat;
  }

  // Simpan ke localStorage (offline backup)
  if (typeof saveZakatData === "function") {
    saveZakatData(state.zakat.list);
  }

  // ✅ Refresh UI dulu (optimistic)
  renderZakatList(state.zakat.list);
  if (state.zakat.isViewOpen) {
    openZakatDetail(zakatId);
  }
  updateZakatDetailActions(zakat);

  showToast("⏳ Menyimpan perubahan...", "info");

  try {
    // ✅ WAIT / TUNGGU response dari API
    var result = await apiCompleteZakat({ id: zakatId });

    if (result && result.success) {
      // ✅ Berhasil: status sudah benar
      showToast('Zakat "' + zakat.title + '" ditandai selesai!', "success");

      // ✅ Refresh data dari backend untuk memastikan konsistensi
      if (typeof loadZakatData === "function") {
        await loadZakatData();
      }
    } else {
      // ❌ Gagal: rollback ke status sebelumnya
      console.warn("⚠️ Backend failed:", result?.message);

      zakat.status = previousStatus;
      zakat.completedAt = previousCompletedAt;

      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
      }
      saveZakatData(state.zakat.list);

      renderZakatList(state.zakat.list);
      if (state.zakat.isViewOpen) {
        openZakatDetail(zakatId);
      }
      updateZakatDetailActions(zakat);

      showToast(
        result?.message || "Gagal sync ke server, perubahan dibatalkan",
        "error",
      );
    }
  } catch (err) {
    // ❌ Error: rollback
    console.error("Complete zakat API error:", err);

    zakat.status = previousStatus;
    zakat.completedAt = previousCompletedAt;

    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
    }
    saveZakatData(state.zakat.list);

    renderZakatList(state.zakat.list);
    if (state.zakat.isViewOpen) {
      openZakatDetail(zakatId);
    }
    updateZakatDetailActions(zakat);

    showToast("Gagal terhubung ke server, perubahan dibatalkan", "error");
  }
}

// ============================================================
// FUNGSI CANCEL COMPLETE ZAKAT - DENGAN AWAIT & ROLLBACK
// ============================================================

async function cancelCompleteZakat(zakatId) {
  var zakat = state.zakat.list.find(function (z) {
    return z.id === zakatId;
  });

  if (!zakat) {
    showToast("Zakat tidak ditemukan", "error");
    return;
  }

  // Cek apakah statusnya COMPLETED
  if (!isZakatCompleted(zakat)) {
    showToast("Zakat tidak dalam status selesai", "warning");
    return;
  }

  // Simpan data lama untuk rollback
  var previousStatus = zakat.status;
  var previousCompletedAt = zakat.completedAt;

  // ✅ Optimistic update
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
    openZakatDetail(zakatId);
  }
  updateZakatDetailActions(zakat);

  showToast("⏳ Menyimpan perubahan...", "info");

  try {
    // ✅ WAIT / TUNGGU response dari API
    var result = await apiCancelCompleteZakat({ id: zakatId });

    if (result && result.success) {
      showToast(
        'Status selesai dibatalkan. Zakat "' + zakat.title + '" kembali Aktif.',
        "info",
      );

      // ✅ Refresh data dari backend
      if (typeof loadZakatData === "function") {
        await loadZakatData();
      }
    } else {
      // ❌ Gagal: rollback
      console.warn("⚠️ Backend failed:", result?.message);

      zakat.status = previousStatus;
      zakat.completedAt = previousCompletedAt;

      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
      }
      saveZakatData(state.zakat.list);

      renderZakatList(state.zakat.list);
      if (state.zakat.isViewOpen) {
        openZakatDetail(zakatId);
      }
      updateZakatDetailActions(zakat);

      showToast(
        result?.message || "Gagal sync ke server, perubahan dibatalkan",
        "error",
      );
    }
  } catch (err) {
    // ❌ Error: rollback
    console.error("Cancel complete API error:", err);

    zakat.status = previousStatus;
    zakat.completedAt = previousCompletedAt;

    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
    }
    saveZakatData(state.zakat.list);

    renderZakatList(state.zakat.list);
    if (state.zakat.isViewOpen) {
      openZakatDetail(zakatId);
    }
    updateZakatDetailActions(zakat);

    showToast("Gagal terhubung ke server, perubahan dibatalkan", "error");
  }
}

// ============================================================
// UPDATE DETAIL ACTIONS - TAMPILKAN TOMBOL YANG SESUAI
// ============================================================

function updateZakatDetailActions(zakat) {
  var btnComplete = document.getElementById("btnCompleteZakat");
  var btnCancelComplete = document.getElementById("btnCancelCompleteZakat");

  if (!btnComplete || !btnCancelComplete) return;

  var isCompleted = isZakatCompleted(zakat);

  if (isCompleted) {
    btnComplete.classList.add("hidden");
    btnCancelComplete.classList.remove("hidden");
  } else {
    btnComplete.classList.remove("hidden");
    btnCancelComplete.classList.add("hidden");
  }
}

// ============================================================
// UPDATE DETAIL VIEW - TAMPILKAN STATUS
// ============================================================

function updateZakatDetailStatus(zakat) {
  var statusContainer = document.getElementById("zakatDetailStatus");
  if (!statusContainer) {
    statusContainer = document.querySelector(".zakat-detail-status");
  }
  if (!statusContainer) return;

  var statusInfo = getZakatStatusBadge(zakat.status);
  var status = zakat.status || "ACTIVE";
  var statusClass = ZAKAT_STATUS_CLASSES[status] || "active";
  var statusLabel = ZAKAT_STATUS_LABELS[status] || status;

  statusContainer.innerHTML =
    '<span class="zakat-detail-status-badge ' +
    statusClass +
    '">' +
    "● " +
    statusLabel +
    "</span>";
}
// ============================================================
// UPDATE openZakatDetail - TAMBAHKAN updateZakatDetailActions
// ============================================================

// Perbaiki fungsi openZakatDetail
function openZakatDetail(id) {
  console.log("🔍 openZakatDetail dipanggil dengan ID:", id);

  var zakat = getZakatById(id);
  if (!zakat) {
    console.warn("⚠️ Zakat tidak ditemukan untuk ID:", id);
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  console.log("🔍 Zakat ditemukan:", zakat);
  console.log("🔍 Status zakat:", zakat.status);

  state.zakat.currentId = id;
  state.zakat.isViewOpen = true;

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

  // Update header
  updateZakatDetailHeader(zakat);

  // ✅ Update status badge
  updateZakatDetailStatus(zakat);

  // ✅ Update tombol aksi berdasarkan status
  updateZakatDetailActions(zakat);

  // ✅ Reset tabs dan panel
  var tabs = document.querySelectorAll(".zakat-tab");
  var panels = {
    muzaki: document.getElementById("zakatTabMuzaki"),
    rincian: document.getElementById("zakatTabRincian"),
    mustahik: document.getElementById("zakatTabMustahik"),
  };

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

  var firstTab = document.querySelector('.zakat-tab[data-zakat-tab="muzaki"]');
  if (firstTab) {
    firstTab.classList.add("active");
    firstTab.style.background = "var(--brand)";
    firstTab.style.color = "#fff";
  }

  if (panels.muzaki) {
    panels.muzaki.classList.add("active");
    panels.muzaki.style.display = "block";
  }

  console.log("🔍 Calling render functions...");
  renderZakatMuzakiView(zakat);
  renderZakatRincianView(zakat);
  renderZakatMustahikView(zakat);
  console.log("✅ All render functions called");
}

// ============================================================
// UPDATE ZAKAT DETAIL HEADER - TAMBAHKAN STATUS BADGE
// ============================================================

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

  // Update status badge
  if (statusEl) {
    updateZakatDetailStatus(zakat);
  }
}

// ============================================================
// ZAKAT - TAB MUZAKI
// ============================================================

function renderZakatMuzakiTab(zakat) {
  var container = document.getElementById("zakatMuzakiList");
  var countInput = document.getElementById("zakatMuzakiCount");
  var totalDisplay = document.getElementById("zakatMuzakiTotal");

  if (!container || !countInput) return;

  var muzakiList = zakat.muzaki || [];
  var count = Math.max(muzakiList.length || 1, 1);
  countInput.value = count;

  // ✅ Ambil semua nama dari suggestions + existing data
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

      // ✅ Kumpulkan nama yang sudah dipilih di row lain
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

    // Event listener untuk update total
    container
      .querySelectorAll(".zakat-muzaki-nominal")
      .forEach(function (input) {
        input.addEventListener("input", updateMuzakiTotal);
      });

    // Event listener untuk input nama
    container.querySelectorAll(".zakat-muzaki-name").forEach(function (input) {
      var idx = parseInt(input.dataset.index);

      input.addEventListener("input", function () {
        var val = this.value.toLowerCase().trim();
        var datalist = document.getElementById("suggest-muzaki-" + idx);
        if (datalist) {
          // Kumpulkan nama yang dipilih di row lain
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

// ============================================================
// ZAKAT - TAB RINCIAN
// ============================================================

function renderZakatRincianTab(zakat) {
  var totalZakat = zakat.total || 0;
  var r = zakat.rincian || {};

  var mustahikPersen = Number(r.mustahik?.persen) || 0;
  var sabilillahPersen = Number(r.sabilillah?.persen) || 0;
  var amilPersen = Number(r.amil?.persen) || 0;

  var mustahikKelompokPersen = Number(r.mustahik?.kelompok?.persen) || 0;
  var mustahikDaerahPersen = Number(r.mustahik?.daerah?.persen) || 0;
  var amilKelompokPersen = Number(r.amil?.kelompok?.persen) || 0;
  var amilDesaPersen = Number(r.amil?.desa?.persen) || 0;
  var amilDaerahPersen = Number(r.amil?.daerah?.persen) || 0;

  var mustahikNominal = Number(r.mustahik?.nominal) || 0;
  var sabilillahNominal = Number(r.sabilillah?.nominal) || 0;
  var amilNominal = Number(r.amil?.nominal) || 0;
  var mustahikKelompokNominal = Number(r.mustahik?.kelompok?.nominal) || 0;
  var mustahikDaerahNominal = Number(r.mustahik?.daerah?.nominal) || 0;
  var amilKelompokNominal = Number(r.amil?.kelompok?.nominal) || 0;
  var amilDesaNominal = Number(r.amil?.desa?.nominal) || 0;
  var amilDaerahNominal = Number(r.amil?.daerah?.nominal) || 0;

  // ✅ Update display di UI
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

  // ✅ Update progress bar
  updateRincianProgressBar(mustahikPersen, sabilillahPersen, amilPersen);

  // ✅ Update status dengan badge yang konsisten
  var statusEl = document.getElementById("zakatRincianStatus");
  if (statusEl) {
    var totalPersen = mustahikPersen + sabilillahPersen + amilPersen;
    var badgeClass = "";
    var badgeIcon = "";
    var badgeText = "";

    if (totalZakat === 0) {
      badgeClass = "idle";
      badgeIcon = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      `;
      badgeText = "Total Rp 0";
    } else if (
      totalPersen === 100 &&
      mustahikNominal > 0 &&
      sabilillahNominal > 0 &&
      amilNominal > 0
    ) {
      badgeClass = "saved";
      badgeIcon = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      `;
      badgeText = "Tersimpan " + fmtRp(totalZakat);
    } else if (totalPersen === 100) {
      badgeClass = "warning";
      badgeIcon = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      `;
      badgeText = "Belum dihitung";
    } else {
      badgeClass = "invalid";
      badgeIcon = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      `;
      badgeText = "Total " + totalPersen + "% (harus 100%)";
    }

    // ✅ Gunakan struktur yang sama dengan tab Mustahik
    statusEl.innerHTML =
      '<span class="zakat-status-badge ' +
      badgeClass +
      '">' +
      badgeIcon +
      badgeText +
      "</span>";
  }

  // ✅ Set nilai ke input (untuk form edit)
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

  // ✅ Display nominal di form
  var nominalDisplay = function (id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = fmtRp(value);
      el.style.color = value > 0 ? "var(--pos)" : "var(--ink-faint)";
    }
  };

  nominalDisplay("zakatMustahikNominalDisplay", mustahikNominal);
  nominalDisplay("zakatSabilillahNominalDisplay", sabilillahNominal);
  nominalDisplay("zakatAmilNominalDisplay", amilNominal);
  nominalDisplay(
    "zakatMustahikKelompokNominalDisplay",
    mustahikKelompokNominal,
  );
  nominalDisplay("zakatMustahikDaerahNominalDisplay", mustahikDaerahNominal);
  nominalDisplay("zakatAmilKelompokNominalDisplay", amilKelompokNominal);
  nominalDisplay("zakatAmilDesaNominalDisplay", amilDesaNominal);
  nominalDisplay("zakatAmilDaerahNominalDisplay", amilDaerahNominal);

  // ✅ Setup event listener untuk update real-time
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

    var totalZakat = zakat.total || 0;
    var mustahikNominalPreview = Math.round((totalZakat * pMustahik) / 100);
    var sabilillahNominalPreview = Math.round((totalZakat * pSabilillah) / 100);
    var amilNominalPreview = Math.round((totalZakat * pAmil) / 100);

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

  // ✅ Set Default buttons
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

// ✅ Helper function untuk update progress bar
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

// ============================================================
// ZAKAT - TAB MUSTAHIK
// ============================================================

function renderZakatMustahikTab(zakat) {
  var container = document.getElementById("zakatMustahikList");
  var countInput = document.getElementById("zakatMustahikCount");
  var danaDisplay = document.getElementById("zakatMustahikDana");
  var sisaDisplay = document.getElementById("zakatMustahikSisa");

  if (!container || !countInput) return;

  var totalZakat = zakat.total || 0;
  var r = zakat.rincian || {};
  var mustahik = r.mustahik || { total: 45, kelompok: 80, daerah: 20 };
  var danaMustahik =
    ((totalZakat * mustahik.total) / 100) * (mustahik.kelompok / 100);

  danaDisplay.textContent = fmtRp(danaMustahik);

  var mustahikList = zakat.mustahik || [];
  var count = Math.max(mustahikList.length || 1, 1);
  countInput.value = count;

  // ✅ Ambil semua nama dari suggestions + existing data
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

// ============================================================
// ZAKAT - TABS NAVIGATION
// ============================================================

function initZakatTabs() {
  var tabs = document.querySelectorAll(".zakat-tab");

  if (!tabs || tabs.length === 0) {
    console.warn("⚠️ No zakat tabs found");
    return;
  }

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

      // ✅ Reset semua tab
      tabs.forEach(function (t) {
        t.classList.remove("active");
        t.style.background = "var(--surface)";
        t.style.color = "var(--ink-soft)";
      });

      // ✅ Aktifkan tab yang diklik
      this.classList.add("active");
      this.style.background = "var(--brand)";
      this.style.color = "#fff";

      // ✅ Sembunyikan SEMUA panel
      Object.keys(panels).forEach(function (key) {
        var panel = panels[key];
        if (panel) {
          panel.classList.remove("active");
          panel.style.display = "none"; // ← PASTIKAN SEMBUNYI
        }
      });

      // ✅ Tampilkan hanya panel target
      var targetPanel = panels[target];
      if (targetPanel) {
        targetPanel.classList.add("active");
        targetPanel.style.display = "block"; // ← PASTIKAN TAMPIL
      }

      // ✅ Render konten sesuai tab
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

// ============================================================
// ZAKAT - SCREEN NAVIGATION
// ============================================================

// ============================================================
// ZAKAT FILTER FUNCTIONS
// ============================================================

// State filter
var zakatFilters = {
  tahun: "semua",
  status: "semua",
};

// Inisialisasi filter
function initZakatFilters() {
  var trigger = document.getElementById("btnOpenZakatFilter");
  var sheet = document.getElementById("zakatFilterSheet");
  var resetBtn = document.getElementById("btnResetZakatFilter");
  var applyBtn = document.getElementById("btnApplyZakatFilter");

  // Cek apakah elemen sudah ada di DOM
  if (!trigger || !sheet) {
    console.warn("⚠️ Filter elements not found, retrying...");
    // Retry after DOM update
    setTimeout(initZakatFilters, 100);
    return;
  }

  // Hanya init sekali dengan flag
  if (trigger.dataset.initialized === "true") {
    console.log("ℹ️ Filter already initialized");
    return;
  }

  console.log("✅ Initializing zakat filters...");
  trigger.dataset.initialized = "true";

  // Buka sheet
  trigger.addEventListener("click", function (e) {
    e.stopPropagation();
    sheet.classList.remove("hidden");
    updateFilterSheetState();
  });

  // Tutup sheet via handle
  var handle = sheet.querySelector(".sheet-handle");
  if (handle) {
    handle.addEventListener("click", function () {
      sheet.classList.add("hidden");
    });
  }

  // Klik di luar sheet (overlay)
  sheet.addEventListener("click", function (e) {
    if (e.target === sheet) {
      sheet.classList.add("hidden");
    }
  });

  // Pilih opsi filter
  document.querySelectorAll(".filter-chip-option").forEach(function (btn) {
    // Hapus listener lama jika ada
    btn.removeEventListener("click", handleFilterOptionClick);
    btn.addEventListener("click", handleFilterOptionClick);
  });

  // Apply filter
  if (applyBtn) {
    applyBtn.removeEventListener("click", handleApplyFilter);
    applyBtn.addEventListener("click", handleApplyFilter);
  }

  // Reset filter
  if (resetBtn) {
    resetBtn.removeEventListener("click", handleResetFilter);
    resetBtn.addEventListener("click", handleResetFilter);
  }

  // Update badge dan active filters awal
  updateFilterBadge();
  updateActiveFiltersDisplay();

  // Apply filter awal
  applyZakatFilters();
}

// Handler untuk klik opsi filter
function handleFilterOptionClick() {
  var group = this.dataset.filter;
  var value = this.dataset.value;

  // Hapus active dari semua button di group yang sama
  document
    .querySelectorAll('.filter-chip-option[data-filter="' + group + '"]')
    .forEach(function (b) {
      b.classList.remove("active");
    });
  this.classList.add("active");
}

// Handler untuk apply filter
function handleApplyFilter() {
  applyZakatFilterFromSheet();
}

// Handler untuk reset filter
function handleResetFilter() {
  resetZakatFilters();
}

// Update filter sheet state berdasarkan filter yang aktif
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

// Apply filter dari sheet
function applyZakatFilterFromSheet() {
  var activeTahun = document.querySelector(
    '.filter-chip-option[data-filter="tahun"].active',
  );
  var activeStatus = document.querySelector(
    '.filter-chip-option[data-filter="status"].active',
  );

  zakatFilters.tahun = activeTahun ? activeTahun.dataset.value : "semua";
  zakatFilters.status = activeStatus ? activeStatus.dataset.value : "semua";

  // Tutup sheet
  var sheet = document.getElementById("zakatFilterSheet");
  if (sheet) sheet.classList.add("hidden");

  // Update UI
  updateFilterBadge();
  updateActiveFiltersDisplay();

  // Apply filter ke list
  applyZakatFilters();
}

// Reset semua filter
function resetZakatFilters() {
  zakatFilters = {
    tahun: "semua",
    status: "semua",
  };

  // Reset semua chip ke 'semua'
  document.querySelectorAll(".filter-chip-option").forEach(function (btn) {
    btn.classList.remove("active");
    if (btn.dataset.value === "semua") {
      btn.classList.add("active");
    }
  });

  // Tutup sheet
  var sheet = document.getElementById("zakatFilterSheet");
  if (sheet) sheet.classList.add("hidden");

  // Update UI
  updateFilterBadge();
  updateActiveFiltersDisplay();

  // Apply filter
  applyZakatFilters();
}

// Update filter badge di trigger button
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

// Update active filters display di header
function updateActiveFiltersDisplay() {
  var container = document.getElementById("zakatActiveFilters");
  if (!container) return;

  var activeFilters = [];

  // Tahun
  if (zakatFilters.tahun !== "semua") {
    activeFilters.push({ label: zakatFilters.tahun, filter: "tahun" });
  }

  // Status
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

  // Event listener untuk remove filter (gunakan event delegation)
  container.querySelectorAll(".remove-filter").forEach(function (btn) {
    btn.removeEventListener("click", handleRemoveFilter);
    btn.addEventListener("click", handleRemoveFilter);
  });
}

// Handler untuk remove filter
function handleRemoveFilter(e) {
  e.stopPropagation();
  var filter = this.dataset.filter;
  zakatFilters[filter] = "semua";

  // Update sheet state
  updateFilterSheetState();

  // Update UI
  updateFilterBadge();
  updateActiveFiltersDisplay();

  // Apply filter
  applyZakatFilters();
}

// Apply filter ke data zakat
function applyZakatFilters() {
  var list = state.zakat.list || [];

  var filtered = list.filter(function (z) {
    // Filter Tahun
    if (zakatFilters.tahun !== "semua") {
      var zYear = z.tanggal ? new Date(z.tanggal).getFullYear() : null;
      if (String(zYear) !== zakatFilters.tahun) return false;
    }

    // Filter Status
    var status = zakatFilters.status;
    if (status === "semua") return true;

    // Status: Selesai - gunakan helper
    if (status === "selesai") {
      return isZakatCompleted(z);
    }

    // Status: Muzaki
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

    // Status: Rincian
    var hasRincian =
      z.rincian &&
      ((z.rincian.mustahik && z.rincian.mustahik.persen > 0) ||
        (z.rincian.sabilillah && z.rincian.sabilillah.persen > 0) ||
        (z.rincian.amil && z.rincian.amil.persen > 0));

    if (status === "rincian_belum") {
      return !hasRincian;
    }
    if (status === "rincian_sudah") {
      return hasRincian;
    }

    // Status: Mustahik
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

// ============================================================
// MODIFIKASI renderZakatList UNTUK MENDUKUNG FILTER
// ============================================================

// Override renderZakatList dengan dukungan filter
function renderZakatList(data) {
  var container = document.getElementById("zakatList");
  if (!container) return;

  var list = data || state.zakat.list || [];

  if (list.length === 0) {
    container.innerHTML = `
      <div class="zakat-list-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          <circle cx="12" cy="12" r="4"/>
        </svg>
        <p>Belum ada kegiatan Zakat.</p>
        <p style="font-size:11px;margin-top:4px;">Klik tombol + untuk membuat baru.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map(function (z) {
      var hasMustahik = z.mustahik && z.mustahik.length > 0;
      var hasRincian =
        z.rincian &&
        ((z.rincian.mustahik && z.rincian.mustahik.persen > 0) ||
          (z.rincian.sabilillah && z.rincian.sabilillah.persen > 0) ||
          (z.rincian.amil && z.rincian.amil.persen > 0));

      var totalMustahikTerisi = 0;
      if (z.mustahik && z.mustahik.length > 0) {
        totalMustahikTerisi = z.mustahik.reduce(function (sum, m) {
          return sum + (parseInt(m.nominal) || 0);
        }, 0);
      }

      var danaMustahik = 0;
      if (z.rincian && z.rincian.mustahik && z.rincian.mustahik.nominal) {
        danaMustahik = parseInt(z.rincian.mustahik.nominal) || 0;
      }

      var isMustahikAllocated =
        hasMustahik &&
        danaMustahik > 0 &&
        totalMustahikTerisi >= danaMustahik * 0.9;

      var allMuzakiPaid = true;
      if (z.muzaki && z.muzaki.length > 0) {
        allMuzakiPaid = z.muzaki.every(function (m) {
          return parseInt(m.nominal) > 0;
        });
      } else {
        allMuzakiPaid = false;
      }

      var paidCount = 0;
      if (z.muzaki && z.muzaki.length > 0) {
        paidCount = z.muzaki.filter(function (m) {
          return parseInt(m.nominal) > 0;
        }).length;
      }

      // --- STATUS BADGE MENGGUNAKAN HELPER ---
      var statusInfo = getZakatStatusBadge(z.status);
      var isCompleted = statusInfo.isCompleted;
      var statusBadgeClass = isCompleted ? "status-completed" : "status-active";
      var statusBadgeText = statusInfo.label;
      var statusBadgeIcon = isCompleted
        ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>';

      // --- BUILD BADGES ---
      var badges = [];

      // Badge Rincian
      if (hasRincian) {
        badges.push(
          '<span class="zakat-badge zakat-badge-success">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' +
            " Rincian" +
            "</span>",
        );
      } else {
        badges.push(
          '<span class="zakat-badge zakat-badge-warning">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>' +
            " Rincian belum" +
            "</span>",
        );
      }

      // Badge Mustahik
      if (hasMustahik) {
        if (isMustahikAllocated) {
          badges.push(
            '<span class="zakat-badge zakat-badge-success">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' +
              " Mustahik teralokasi" +
              "</span>",
          );
        } else {
          badges.push(
            '<span class="zakat-badge zakat-badge-warning">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>' +
              " Mustahik belum dialokasi" +
              "</span>",
          );
        }
      } else {
        badges.push(
          '<span class="zakat-badge zakat-badge-danger">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            " Belum ada mustahik" +
            "</span>",
        );
      }

      // Badge Muzaki
      if (z.muzaki && z.muzaki.length > 0) {
        if (allMuzakiPaid) {
          badges.push(
            '<span class="zakat-badge zakat-badge-success">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' +
              " Semua muzaki bayar" +
              "</span>",
          );
        } else {
          badges.push(
            '<span class="zakat-badge zakat-badge-warning">' +
              '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>' +
              " " +
              paidCount +
              "/" +
              z.muzaki.length +
              " muzaki bayar" +
              "</span>",
          );
        }
      } else {
        badges.push(
          '<span class="zakat-badge zakat-badge-danger">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            " Belum ada muzaki" +
            "</span>",
        );
      }

      // --- RENDER ITEM ---
      return `
      <div class="zakat-item" data-zakat-id="${z.id}">
        <div class="zakat-item-content" data-zakat-id="${z.id}">
          <div class="zakat-item-status">
            <span class="zakat-badge ${statusBadgeClass}">
              ${statusBadgeIcon}
              ${statusBadgeText}
            </span>
          </div>
          <div class="zakat-item-header">
            <div class="zakat-item-title">${escapeHtml(z.title)}</div>
            <div class="zakat-item-total">${fmtRp(z.total || 0)}</div>
          </div>
          <div class="zakat-item-meta">
            <span>${z.tanggal ? fmtDateShort(z.tanggal) : "-"}</span>
            <span>•</span>
            <span>${escapeHtml(z.tempat || "Tempat tidak ditentukan")}</span>
            <span>•</span>
            <span>${z.muzaki ? z.muzaki.length : 0} Muzaki</span>
            ${z.mustahik ? "<span>•</span><span>" + z.mustahik.length + " Mustahik</span>" : ""}
          </div>
          <div class="zakat-item-badges">
            ${badges.join("")}
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // --- EVENT LISTENERS ---
  container.querySelectorAll(".zakat-item-content").forEach(function (item) {
    item.addEventListener("click", function (e) {
      var id = this.dataset.zakatId;
      if (id) openZakatDetail(id);
    });
  });

  container.querySelectorAll(".zakat-item").forEach(function (item) {
    item.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      var id = this.dataset.zakatId;
      if (id) openZakatActionSheet(id);
    });

    var pressTimer = null;
    item.addEventListener("touchstart", function (e) {
      pressTimer = setTimeout(
        function () {
          var id = this.dataset.zakatId;
          if (id) openZakatActionSheet(id);
        }.bind(this),
        600,
      );
    });
    item.addEventListener("touchend", function () {
      clearTimeout(pressTimer);
    });
    item.addEventListener("touchmove", function () {
      clearTimeout(pressTimer);
    });
  });
}

// ============================================================
// PANGGIL INIT SAAT ZAKAT SCREEN DIBUKA
// ============================================================

// Fungsi untuk load zakat data dan init filter
function loadZakatDataAndInitFilters() {
  console.log("🔄 Loading zakat data and initializing filters...");

  // Ambil data zakat
  if (typeof getZakatData === "function") {
    state.zakat.list = getZakatData() || [];
  }

  // Render list
  renderZakatList(state.zakat.list);

  // Init filter setelah data siap
  setTimeout(function () {
    initZakatFilters();
  }, 50);

  // Sembunyikan loader
  hideZakatLoader();
}

// Override openZakatScreen
window.openZakatScreen = function () {
  console.log("🔄 openZakatScreen called");

  if (
    typeof router !== "undefined" &&
    router &&
    typeof router.navigateTo === "function"
  ) {
    router.navigateTo("zakat");
    // Init filter setelah navigasi selesai
    setTimeout(function () {
      initZakatFilters();
      applyZakatFilters();
    }, 200);
  } else {
    var screen = document.getElementById("screen-zakat");
    if (!screen) {
      console.error("❌ screen-zakat not found");
      showToast("Screen Zakat tidak ditemukan", "error");
      return;
    }

    var bottomNav = document.getElementById("bottomnav");
    if (bottomNav) {
      bottomNav.style.display = "none";
    }

    screen.classList.add("active");
    showZakatLoader("Memuat data zakat...");

    // Load data dan init filter
    loadZakatDataAndInitFilters();
  }
};

window.closeZakatScreen = function () {
  console.log("🔄 closeZakatScreen called");

  if (
    typeof router !== "undefined" &&
    router &&
    typeof router.navigateTo === "function"
  ) {
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
  ];

  sheets.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
};

// ============================================================
// ZAKAT - LOADER FUNCTIONS
// ============================================================

function showZakatLoader(message) {
  message = message || "Memuat data...";
  var loader = document.getElementById("zakatLoader");
  var text = document.getElementById("zakatLoaderText");
  if (loader) {
    loader.classList.remove("hidden");
    if (text) text.textContent = message;
  }
}

function hideZakatLoader() {
  var loader = document.getElementById("zakatLoader");
  if (loader) {
    loader.classList.add("hidden");
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

// ============================================================
// ZAKAT - INISIALISASI
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  console.log("🔄 Zakat module initializing...");

  if (!state.zakat) {
    state.zakat = {
      list: [],
      currentId: null,
      isViewOpen: false,
      _loaded: false,
      _loading: false,
    };
  }

  // Load data awal
  if (typeof getZakatData === "function") {
    state.zakat.list = getZakatData() || [];
    console.log(
      "📊 Initial zakat data loaded:",
      state.zakat.list.length,
      "items",
    );
  }

  // Render list awal
  renderZakatList(state.zakat.list);

  // ============================================================
  // INIT FILTER - DENGAN RETRY MECHANISM
  // ============================================================

  function initFiltersWithRetry(attempt) {
    attempt = attempt || 0;
    var maxAttempts = 5;

    var trigger = document.getElementById("btnOpenZakatFilter");
    var sheet = document.getElementById("zakatFilterSheet");

    if (trigger && sheet) {
      console.log("✅ Filter elements found, initializing...");
      initZakatFilters();
      applyZakatFilters();
      return true;
    }

    if (attempt < maxAttempts) {
      var delay = 100 + attempt * 100;
      console.log(
        "⏳ Filter elements not found, retrying in",
        delay,
        "ms (attempt",
        attempt + 1,
        "/",
        maxAttempts,
        ")",
      );
      setTimeout(function () {
        initFiltersWithRetry(attempt + 1);
      }, delay);
      return false;
    }

    console.warn("⚠️ Filter elements not found after", maxAttempts, "attempts");
    return false;
  }

  // Jalankan init filter dengan retry
  setTimeout(function () {
    initFiltersWithRetry(0);
  }, 150);

  // ============================================================
  // CEK JIKA SCREEN ZAKAT SUDAH AKTIF
  // ============================================================

  var zakatScreen = document.getElementById("screen-zakat");
  if (zakatScreen && zakatScreen.classList.contains("active")) {
    console.log("ℹ️ Zakat screen is active, initializing filters...");
    setTimeout(function () {
      initFiltersWithRetry(0);
    }, 200);
  }

  // ============================================================
  // DELEGASI EVENT UNTUK TOMBOL BUKA ZAKAT
  // ============================================================

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("#btnOpenZakat");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      console.log("🔄 btnOpenZakat clicked via delegation");

      if (typeof openZakatScreen === "function") {
        openZakatScreen();
      } else if (typeof window.openZakatScreen === "function") {
        window.openZakatScreen();
      } else {
        console.error("❌ openZakatScreen is not defined");
        showToast("Fungsi Zakat belum siap", "error");
      }
    }
  });

  // ============================================================
  // TOMBOL BACK
  // ============================================================

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
  } else {
    console.warn("⚠️ btnZakatBack not found in DOM");
  }

  // ============================================================
  // FAB ZAKAT
  // ============================================================

  var fabZakat = document.getElementById("fabZakat");
  if (fabZakat) {
    fabZakat.addEventListener("click", function () {
      if (state.zakat && state.zakat.isViewOpen) {
        closeZakatDetail();
      }
      openZakatForm(null);
    });
  } else {
    console.warn("⚠️ fabZakat not found in DOM");
  }

  // ============================================================
  // ZAKAT TABS
  // ============================================================

  initZakatTabs();

  // ============================================================
  // ZAKAT FORM - CANCEL & SUBMIT
  // ============================================================

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

  // ============================================================
  // ZAKAT - COMPLETE & CANCEL COMPLETE MODAL
  // ============================================================

  // Buka modal complete
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

    // Cek apakah sudah selesai
    if (isZakatCompleted(zakat)) {
      showToast("Zakat sudah ditandai selesai", "warning");
      return;
    }

    // Validasi: cek mustahik sudah teralokasi
    var totalMustahik = 0;
    if (zakat.mustahik && zakat.mustahik.length > 0) {
      totalMustahik = zakat.mustahik.reduce(function (sum, m) {
        return sum + (parseInt(m.nominal) || 0);
      }, 0);
    }

    var danaMustahik = 0;
    if (
      zakat.rincian &&
      zakat.rincian.mustahik &&
      zakat.rincian.mustahik.nominal
    ) {
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

    // Tampilkan modal konfirmasi
    var desc = document.getElementById("completeZakatConfirmDesc");
    if (desc) {
      desc.textContent =
        'Zakat "' +
        zakat.title +
        '" akan ditandai sebagai selesai dan tidak dapat diedit lagi.';
    }
    var overlay = document.getElementById("completeZakatConfirmOverlay");
    if (overlay) {
      overlay.classList.remove("hidden");
    }
  });

  // Tutup modal complete
  document.addEventListener("click", function (e) {
    var target = e.target.closest("#btnCompleteZakatCancel");
    if (!target) return;
    var overlay = document.getElementById("completeZakatConfirmOverlay");
    if (overlay) overlay.classList.add("hidden");
  });

  // Klik di luar modal complete
  document.addEventListener("click", function (e) {
    var overlay = document.getElementById("completeZakatConfirmOverlay");
    if (!overlay || overlay.classList.contains("hidden")) return;
    if (e.target === overlay) {
      overlay.classList.add("hidden");
    }
  });

  // Konfirmasi complete
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

    // ✅ Panggil async function (tanpa blocking)
    completeZakat(zakatId);

    var overlay = document.getElementById("completeZakatConfirmOverlay");
    if (overlay) overlay.classList.add("hidden");
  });

  // ============================================================
  // ZAKAT - CANCEL COMPLETE MODAL
  // ============================================================

  // Buka modal cancel complete
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

    // ✅ Panggil async function
    cancelCompleteZakat(zakatId);

    var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
    if (overlay) overlay.classList.add("hidden");
  });

  // Tutup modal cancel complete
  document.addEventListener("click", function (e) {
    var target = e.target.closest("#btnCancelCompleteZakatCancel");
    if (!target) return;
    var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
    if (overlay) overlay.classList.add("hidden");
  });

  // Klik di luar modal cancel complete
  document.addEventListener("click", function (e) {
    var overlay = document.getElementById("cancelCompleteZakatConfirmOverlay");
    if (!overlay || overlay.classList.contains("hidden")) return;
    if (e.target === overlay) {
      overlay.classList.add("hidden");
    }
  });

  // Konfirmasi cancel complete
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

  // ============================================================
  // ZAKAT - DELETE CONFIRM
  // ============================================================

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

  // ============================================================
  // ZAKAT - PRINT
  // ============================================================

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

  // ============================================================
  // ZAKAT - EDIT HEADER
  // ============================================================

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

  // ============================================================
  // ZAKAT - SHEET EVENT LISTENERS
  // ============================================================

  // Muzaki Sheet
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

  // Rincian Sheet
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

  // Mustahik Sheet
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

  // ============================================================
  // ZAKAT - SAVE ALL
  // ============================================================

  document
    .getElementById("zakatSaveAll")
    ?.addEventListener("click", function () {
      saveAllZakat();
    });

  // ============================================================
  // ZAKAT - DATE PICKER INIT
  // ============================================================

  setTimeout(function () {
    initZakatDatePicker();
  }, 300);

  console.log("✅ Zakat module initialized");
});

// ============================================================
// ZAKAT - RENDER TAB VIEW (TABEL)
// ============================================================

function renderZakatMuzakiView(zakat) {
  console.log("🔍 renderZakatMuzakiView START");
  console.log("🔍 zakat parameter:", zakat);

  // Ambil element dengan selector yang tepat
  var tbody = document.getElementById("zakatMuzakiTableBody");
  var totalEl = document.getElementById("zakatMuzakiTableTotal");
  var countEl = document.getElementById("zakatMuzakiCountDisplay");

  console.log("🔍 tbody element:", tbody);
  console.log("🔍 totalEl element:", totalEl);
  console.log("🔍 countEl element:", countEl);

  if (!tbody) {
    console.error("❌ zakatMuzakiTableBody TIDAK DITEMUKAN di DOM!");
    return;
  }

  // Pastikan zakat ada
  if (!zakat) {
    console.warn("⚠️ zakat null/undefined");
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="zakat-table-empty">Data tidak ditemukan</td>
      </tr>
    `;
    return;
  }

  // ✅ PASTIKAN muzaki adalah array
  var muzaki = Array.isArray(zakat.muzaki) ? zakat.muzaki : [];
  console.log("🔍 muzaki data:", muzaki);
  console.log("🔍 muzaki length:", muzaki.length);

  // Hitung total
  var total = 0;
  if (muzaki.length > 0) {
    total = muzaki.reduce(function (sum, m) {
      return sum + (Number(m.nominal) || 0);
    }, 0);
  }
  console.log("🔍 total:", total);

  // Update count
  if (countEl) {
    countEl.textContent = muzaki.length + " orang";
  }

  // Jika tidak ada data
  if (muzaki.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="zakat-table-empty">Belum ada data muzaki.</td>
      </tr>
    `;
    if (totalEl) {
      totalEl.textContent = fmtRp(0);
    }
    return;
  }

  // ✅ RENDER DATA
  var rows = muzaki.map(function (m, idx) {
    var nama = m.nama || "-";
    var nominal = Number(m.nominal) || 0;
    console.log("🔍 Rendering row:", idx, nama, nominal);
    return `
      <tr>
        <td style="text-align:center; padding:8px 10px;">${idx + 1}</td>
        <td style="text-align:left; padding:8px 10px;">${escapeHtml(nama)}</td>
        <td style="text-align:right; padding:8px 10px;">${fmtRp(nominal)}</td>
      </tr>
    `;
  });

  console.log("🔍 Rows HTML:", rows.join(""));
  tbody.innerHTML = rows.join("");

  // Update total
  if (totalEl) {
    totalEl.textContent = fmtRp(total);
    totalEl.style.color = "var(--brand)";
  }

  console.log("✅ renderZakatMuzakiView DONE");
}

function renderZakatRincianView(zakat) {
  var totalZakat = zakat.total || 0;
  var r = zakat.rincian || {};

  var mustahik = r.mustahik || {
    persen: 45,
    nominal: 0,
    kelompok: { persen: 80, nominal: 0 },
    daerah: { persen: 20, nominal: 0 },
  };
  var sabilillah = r.sabilillah || { persen: 40, nominal: 0 };
  var amil = r.amil || {
    persen: 15,
    nominal: 0,
    kelompok: { persen: 12, nominal: 0 },
    desa: { persen: 2, nominal: 0 },
    daerah: { persen: 1, nominal: 0 },
  };

  var mustahikNominal =
    mustahik.nominal || Math.round((totalZakat * mustahik.persen) / 100);
  var sabilillahNominal =
    sabilillah.nominal || Math.round((totalZakat * sabilillah.persen) / 100);
  var amilNominal =
    amil.nominal || Math.round((totalZakat * amil.persen) / 100);

  var mustahikKelompokNominal =
    mustahik.kelompok?.nominal ||
    Math.round((mustahikNominal * mustahik.kelompok.persen) / 100);
  var mustahikDaerahNominal =
    mustahik.daerah?.nominal ||
    Math.round((mustahikNominal * mustahik.daerah.persen) / 100);

  var amilKelompokNominal =
    amil.kelompok?.nominal ||
    Math.round((amilNominal * amil.kelompok.persen) / 100);
  var amilDesaNominal =
    amil.desa?.nominal || Math.round((amilNominal * amil.desa.persen) / 100);
  var amilDaerahNominal =
    amil.daerah?.nominal ||
    Math.round((amilNominal * amil.daerah.persen) / 100);

  var setDisplay = function (id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setDisplay(
    "zakatRincianMustahik",
    mustahik.persen + "% · " + fmtRp(mustahikNominal),
  );
  setDisplay(
    "zakatRincianMustahikKelompok",
    mustahik.kelompok.persen + "% · " + fmtRp(mustahikKelompokNominal),
  );
  setDisplay(
    "zakatRincianMustahikDaerah",
    mustahik.daerah.persen + "% · " + fmtRp(mustahikDaerahNominal),
  );
  setDisplay(
    "zakatRincianSabilillah",
    sabilillah.persen + "% · " + fmtRp(sabilillahNominal),
  );
  setDisplay("zakatRincianAmil", amil.persen + "% · " + fmtRp(amilNominal));
  setDisplay(
    "zakatRincianAmilKelompok",
    amil.kelompok.persen + "% · " + fmtRp(amilKelompokNominal),
  );
  setDisplay(
    "zakatRincianAmilDesa",
    amil.desa.persen + "% · " + fmtRp(amilDesaNominal),
  );
  setDisplay(
    "zakatRincianAmilDaerah",
    amil.daerah.persen + "% · " + fmtRp(amilDaerahNominal),
  );

  var statusEl = document.getElementById("zakatRincianStatus");
  if (statusEl) {
    var isSaved = r.mustahik && r.mustahik.nominal > 0;
    statusEl.textContent = isSaved ? "✓ Tersimpan" : "● Belum disimpan";
    statusEl.className = "zakat-tab-status " + (isSaved ? "saved" : "unsaved");
  }
}

function renderZakatMustahikView(zakat) {
  var tbody = document.getElementById("zakatMustahikTableBody");
  var totalEl = document.getElementById("zakatMustahikTableTotal");
  var countEl = document.getElementById("zakatMustahikCountDisplay");
  var danaEl = document.getElementById("zakatMustahikDanaView");
  var tersalurkanEl = document.getElementById("zakatMustahikTersalurkan");
  var sisaEl = document.getElementById("zakatMustahikSisaView");
  var statusEl = document.getElementById("zakatMustahikStatusView");
  var progressEl = document.getElementById("zakatMustahikProgressView");
  var progressLabelEl = document.getElementById("zakatMustahikProgressLabel");

  if (!tbody) return;

  var mustahik = zakat.mustahik || [];
  var total = mustahik.reduce(function (sum, m) {
    return sum + (Number(m.nominal) || 0);
  }, 0);

  // ✅ Ambil dana mustahik dari rincian
  var r = zakat.rincian || {};

  // ✅ Pastikan data rincian ada, jika tidak gunakan default 0
  var danaMustahik = 0;
  if (r.mustahik && typeof r.mustahik === "object") {
    danaMustahik = Number(r.mustahik.nominal) || 0;
  }

  // ✅ Jika dana mustahik 0, coba hitung dari persentase
  if (
    danaMustahik === 0 &&
    zakat.total > 0 &&
    r.mustahik &&
    r.mustahik.persen
  ) {
    danaMustahik = Math.round((zakat.total * r.mustahik.persen) / 100);
  }

  console.log("🔍 Dana Mustahik:", danaMustahik);
  console.log("🔍 Total Tersalurkan:", total);

  var sisa = Math.max(0, danaMustahik - total);
  var progress = danaMustahik > 0 ? (total / danaMustahik) * 100 : 0;

  // ✅ Update Info Bar
  if (danaEl) danaEl.textContent = fmtRp(danaMustahik);
  if (tersalurkanEl) {
    tersalurkanEl.textContent = fmtRp(total);
    tersalurkanEl.style.color = total > 0 ? "var(--pos)" : "var(--ink-soft)";
  }
  if (sisaEl) {
    sisaEl.textContent = fmtRp(sisa);
    sisaEl.style.color = sisa > 0 ? "var(--pos)" : "var(--ink-soft)";
  }

  // ✅ Update Progress Bar
  if (progressEl) {
    var clampedProgress = Math.min(100, Math.max(0, progress));
    progressEl.style.width = clampedProgress + "%";
    progressEl.style.background =
      clampedProgress >= 100 ? "var(--pos)" : "var(--brand)";
  }

  if (progressLabelEl) {
    var roundedProgress = Math.round(progress);
    progressLabelEl.textContent = roundedProgress + "% dari dana mustahik";
  }

  // ✅ Update Badge Status
  if (statusEl) {
    var badgeClass = "";
    var badgeIcon = "";
    var badgeText = "";

    if (danaMustahik === 0) {
      badgeClass = "idle";
      badgeIcon = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      `;
      badgeText = "Belum diatur";
    } else if (total === 0) {
      badgeClass = "warning";
      badgeIcon = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      `;
      badgeText = "Belum ada alokasi";
    } else if (total === danaMustahik) {
      badgeClass = "saved";
      badgeIcon = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      `;
      badgeText = "Seimbang";
    } else if (total < danaMustahik) {
      badgeClass = "warning";
      badgeIcon = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      `;
      badgeText = "Kurang " + fmtRp(danaMustahik - total);
    } else {
      badgeClass = "invalid";
      badgeIcon = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      `;
      badgeText = "Kelebihan " + fmtRp(total - danaMustahik);
    }

    statusEl.innerHTML =
      '<span class="zakat-status-badge ' +
      badgeClass +
      '">' +
      badgeIcon +
      badgeText +
      "</span>";
  }

  if (countEl) {
    countEl.textContent = mustahik.length + " orang";
  }

  if (mustahik.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="zakat-table-empty">Belum ada data mustahik.</td>
      </tr>
    `;
    if (totalEl) totalEl.textContent = fmtRp(0);
    return;
  }

  tbody.innerHTML = mustahik
    .map(function (m, idx) {
      return `
      <tr>
        <td style="text-align:center; padding:8px 10px;">${idx + 1}</td>
        <td style="text-align:left; padding:8px 10px;">${escapeHtml(m.nama || "-")}</td>
        <td style="text-align:right; padding:8px 10px; font-family: 'JetBrains Mono', monospace;">${fmtRp(m.nominal || 0)}</td>
      </tr>
    `;
    })
    .join("");

  if (totalEl) {
    totalEl.textContent = fmtRp(total);
    totalEl.style.color = "var(--brand)";
  }
}

// ============================================================
// ZAKAT - BOTTOM SHEET HANDLERS
// ============================================================

// ============================================================
// 1. MUZAKI SHEET
// ============================================================

function openZakatMuzakiSheet() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var overlay = document.getElementById("zakatMuzakiSheet");
  if (!overlay) return;

  var muzakiList = zakat.muzaki || [];
  var count = Math.max(muzakiList.length || 1, 1);

  document.getElementById("zakatMuzakiSheetCount").value = count;
  renderMuzakiSheetRows(zakat);
  updateMuzakiSheetTotal(zakat);

  overlay.classList.remove("hidden");
}

function closeZakatMuzakiSheet() {
  var overlay = document.getElementById("zakatMuzakiSheet");
  if (overlay) overlay.classList.add("hidden");
}

function renderMuzakiSheetRows(zakat) {
  var container = document.getElementById("zakatMuzakiSheetList");
  var countInput = document.getElementById("zakatMuzakiSheetCount");
  if (!container || !countInput) return;

  var muzakiList = zakat.muzaki || [];
  var currentCount = parseInt(countInput.value) || 1;
  var allNames = getAllMuzakiNames();

  var rows = [];
  for (var i = 0; i < currentCount; i++) {
    var existing = muzakiList[i] || { nama: "", nominal: 0 };
    var rowNumber = i + 1;

    rows.push(`
      <div class="zakat-muzaki-row" data-sheet-index="${i}">
        <div class="zakat-row-label">${rowNumber}.</div>
        <div class="zakat-name-wrapper" style="position:relative;flex:1;">
          <input type="text" class="field-input zakat-muzaki-sheet-name" 
                 placeholder="Nama Muzaki ${rowNumber}" 
                 value="${escapeHtml(existing.nama || "")}" 
                 data-index="${i}"
                 list="sheet-suggest-muzaki-${i}"
                 autocomplete="off"
                 style="width:100%;">
          <datalist id="sheet-suggest-muzaki-${i}">
            ${allNames
              .filter(function (n) {
                var lower = n.toLowerCase().trim();
                return !muzakiList.some(function (m) {
                  return (
                    m.nama &&
                    m.nama.toLowerCase().trim() === lower &&
                    m !== existing
                  );
                });
              })
              .map(function (n) {
                return '<option value="' + escapeHtml(n) + '">';
              })
              .join("")}
          </datalist>
        </div>
        <div class="zakat-nominal-wrapper">
          <span class="zakat-nominal-label">Rp</span>
          <input type="number" class="field-input zakat-muzaki-sheet-nominal" 
                 placeholder="0" 
                 value="${existing.nominal || ""}" 
                 data-index="${i}" 
                 min="0" step="1000"
                 style="max-width:140px;">
        </div>
      </div>
    `);
  }

  container.innerHTML = rows.join("");

  container
    .querySelectorAll(".zakat-muzaki-sheet-nominal")
    .forEach(function (input) {
      input.addEventListener("input", function () {
        updateMuzakiSheetTotal(zakat);
      });
    });
}

function updateMuzakiSheetTotal(zakat) {
  var container = document.getElementById("zakatMuzakiSheetList");
  var totalEl = document.getElementById("zakatMuzakiSheetTotal");
  if (!container || !totalEl) return;

  var total = 0;
  container
    .querySelectorAll(".zakat-muzaki-sheet-nominal")
    .forEach(function (input) {
      total += Number(input.value) || 0;
    });
  totalEl.textContent = fmtRp(total);
}

async function submitZakatMuzakiSheet() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var container = document.getElementById("zakatMuzakiSheetList");
  var btn = document.getElementById("zakatMuzakiSheetSubmit");

  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    var rows = container.querySelectorAll(".zakat-muzaki-row");
    var newMuzaki = [];
    var hasDuplicate = false;
    var names = [];
    var total = 0;

    rows.forEach(function (row) {
      var nameInput = row.querySelector(".zakat-muzaki-sheet-name");
      var nominalInput = row.querySelector(".zakat-muzaki-sheet-nominal");

      var name = nameInput ? nameInput.value.trim() : "";
      var nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
      total += nominal;

      if (name) {
        var key = name.toLowerCase().trim();
        if (names.indexOf(key) !== -1) {
          hasDuplicate = true;
        } else {
          names.push(key);
          newMuzaki.push({
            id:
              "MZ" +
              Date.now().toString(36).toUpperCase() +
              Math.random().toString(36).substring(2, 5),
            nama: name,
            nominal: nominal,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (nominal > 0) {
        newMuzaki.push({
          id:
            "MZ" +
            Date.now().toString(36).toUpperCase() +
            Math.random().toString(36).substring(2, 5),
          nama: "Muzaki " + (newMuzaki.length + 1),
          nominal: nominal,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (hasDuplicate) {
      showToast("Ada nama yang sama! Periksa kembali.", "error");
      hideZakatButtonLoading(btn);
      return;
    }

    if (newMuzaki.length === 0) {
      showToast("Tambahkan minimal satu muzaki.", "error");
      hideZakatButtonLoading(btn);
      return;
    }

    zakat.muzaki = newMuzaki;
    zakat.total = total;
    zakat.updatedAt = new Date().toISOString();

    var idx = state.zakat.list.findIndex(function (z) {
      return z.id === zakat.id;
    });
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    showZakatLoader("Menyimpan data muzaki...");
    var result = await apiUpdateZakatMuzaki({
      id: zakat.id,
      muzaki: zakat.muzaki,
      total: zakat.total,
    });

    if (result.success) {
      showToast("Muzaki berhasil disimpan!", "success");
    } else {
      showToast("Muzaki disimpan (offline mode)", "warning");
    }

    renderZakatMuzakiView(zakat);
    document.getElementById("zakatDetailTotal").textContent = fmtRp(
      zakat.total,
    );
    closeZakatMuzakiSheet();
    renderZakatList();
  } catch (err) {
    console.error("Save muzaki error:", err);
    showToast("Gagal menyimpan muzaki", "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

// ============================================================
// 2. RINCIAN SHEET
// ============================================================

function openZakatRincianSheet() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var overlay = document.getElementById("zakatRincianSheet");
  if (!overlay) {
    console.warn("⚠️ zakatRincianSheet not found");
    return;
  }

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

function updateRincianSheet(zakat) {
  var totalZakat = zakat.total || 0;

  var getVal = function (id) {
    var el = document.getElementById(id);
    return el ? Number(el.value) || 0 : 0;
  };

  var pMustahik = getVal("zakatPersenMustahikSheet");
  var pSabilillah = getVal("zakatPersenSabilillahSheet");
  var pAmil = getVal("zakatPersenAmilSheet");

  var pKelompok = getVal("zakatPersenMustahikKelompokSheet");
  var pDaerah = getVal("zakatPersenMustahikDaerahSheet");
  var pAmilKelompok = getVal("zakatPersenAmilKelompokSheet");
  var pAmilDesa = getVal("zakatPersenAmilDesaSheet");
  var pAmilDaerah = getVal("zakatPersenAmilDaerahSheet");

  // ✅ Validasi Mustahik sub-total
  var mustahikSub = pKelompok + pDaerah;
  var mustahikSubEl = document.getElementById("zakatMustahikSubTotalSheet");
  if (mustahikSubEl) {
    mustahikSubEl.textContent =
      "Subtotal: " + pKelompok + "% + " + pDaerah + "% = " + mustahikSub + "%";
    mustahikSubEl.className =
      "zakat-rincian-sub-total " + (mustahikSub === 100 ? "valid" : "invalid");
  }

  // ✅ Validasi Amil sub-total
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

  // ✅ Total persentase
  var totalPersen = pMustahik + pSabilillah + pAmil;
  var totalEl = document.getElementById("zakatTotalPersenSheet");
  if (totalEl) {
    totalEl.textContent = totalPersen + "%";
    totalEl.style.color = totalPersen === 100 ? "var(--pos)" : "var(--neg)";
  }

  // ✅ Total nominal
  var nominalEl = document.getElementById("zakatTotalNominalSheet");
  if (nominalEl) {
    if (totalPersen === 100) {
      var totalNominal =
        Math.round((totalZakat * pMustahik) / 100) +
        Math.round((totalZakat * pSabilillah) / 100) +
        Math.round((totalZakat * pAmil) / 100);
      nominalEl.textContent = fmtRp(totalNominal);
      nominalEl.style.color = "var(--brand)";
    } else {
      nominalEl.textContent = "⚠️ Harus 100%";
      nominalEl.style.color = "var(--neg)";
    }
  }

  // ✅ Update status sheet
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

  // ✅ Update preview nominal
  var previewNominal = function (id, value) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = fmtRp(value);
      el.style.color = value > 0 ? "var(--pos)" : "var(--ink-faint)";
    }
  };

  var mustahikNominalPreview = Math.round((totalZakat * pMustahik) / 100);
  var sabilillahNominalPreview = Math.round((totalZakat * pSabilillah) / 100);
  var amilNominalPreview = Math.round((totalZakat * pAmil) / 100);

  previewNominal("zakatMustahikNominalPreview", mustahikNominalPreview);
  previewNominal("zakatSabilillahNominalPreview", sabilillahNominalPreview);
  previewNominal("zakatAmilNominalPreview", amilNominalPreview);
}

function setValueIfExists(id, value) {
  var el = document.getElementById(id);
  if (el) {
    el.value = value;
  }
}

function closeZakatRincianSheet() {
  var overlay = document.getElementById("zakatRincianSheet");
  if (overlay) overlay.classList.add("hidden");
}

async function submitZakatRincianSheet() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
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

    zakat.rincian = {
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
    };
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
    console.error("Save rincian error:", err);
    showToast("Gagal menyimpan rincian", "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

// ============================================================
// ZAKAT - MUSTAHIK SHEET
// ============================================================

function openZakatMustahikSheet() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var overlay = document.getElementById("zakatMustahikSheet");
  if (!overlay) {
    console.warn("⚠️ zakatMustahikSheet not found");
    return;
  }

  var mustahikList = zakat.mustahik || [];
  var count = Math.max(mustahikList.length || 1, 1);

  var countInput = document.getElementById("zakatMustahikSheetCount");
  if (countInput) countInput.value = count;

  // ✅ PASTIKAN INI DIPANGGIL
  renderMustahikSheetRows(zakat);
  updateMustahikSheetTotal(zakat);

  overlay.classList.remove("hidden");
}

function closeZakatMustahikSheet() {
  var overlay = document.getElementById("zakatMustahikSheet");
  if (overlay) overlay.classList.add("hidden");
}

function renderMustahikSheetRows(zakat) {
  console.log("🔍 renderMustahikSheetRows dipanggil");
  console.log("🔍 zakat:", zakat);

  var container = document.getElementById("zakatMustahikSheetList");
  var countInput = document.getElementById("zakatMustahikSheetCount");

  if (!container) {
    console.warn("⚠️ zakatMustahikSheetList tidak ditemukan!");
    return;
  }

  if (!countInput) {
    console.warn("⚠️ zakatMustahikSheetCount tidak ditemukan!");
    return;
  }

  var mustahikList = zakat.mustahik || [];
  console.log("🔍 mustahikList:", mustahikList);
  console.log("🔍 mustahikList length:", mustahikList.length);

  var currentCount = parseInt(countInput.value) || 1;
  var allNames = getAllMustahikNames();

  console.log("🔍 currentCount:", currentCount);

  var rows = [];
  for (var i = 0; i < currentCount; i++) {
    var existing = mustahikList[i] || { nama: "", nominal: 0 };
    var rowNumber = i + 1;
    console.log("🔍 existing row", i, ":", existing);

    rows.push(`
      <div class="zakat-muzaki-row" data-sheet-index="${i}">
        <div class="zakat-row-label">${rowNumber}.</div>
        <div class="zakat-name-wrapper" style="position:relative;flex:1;">
          <input type="text" class="field-input zakat-mustahik-sheet-name" 
                 placeholder="Nama Mustahik ${rowNumber}" 
                 value="${escapeHtml(existing.nama || "")}" 
                 data-index="${i}"
                 list="sheet-suggest-mustahik-${i}"
                 autocomplete="off"
                 style="width:100%;">
          <datalist id="sheet-suggest-mustahik-${i}">
            ${allNames
              .filter(function (n) {
                var lower = n.toLowerCase().trim();
                return !mustahikList.some(function (m) {
                  return (
                    m.nama &&
                    m.nama.toLowerCase().trim() === lower &&
                    m !== existing
                  );
                });
              })
              .map(function (n) {
                return '<option value="' + escapeHtml(n) + '">';
              })
              .join("")}
          </datalist>
        </div>
        <div class="zakat-nominal-wrapper">
          <span class="zakat-nominal-label">Rp</span>
          <input type="number" class="field-input zakat-mustahik-sheet-nominal" 
                 placeholder="0" 
                 value="${existing.nominal || ""}" 
                 data-index="${i}" 
                 min="0" step="1000"
                 style="max-width:140px;">
        </div>
      </div>
    `);
  }

  console.log("🔍 rows HTML:", rows.join(""));
  container.innerHTML = rows.join("");

  container
    .querySelectorAll(".zakat-mustahik-sheet-nominal")
    .forEach(function (input) {
      input.addEventListener("input", function () {
        updateMustahikSheetTotal(zakat);
      });
    });

  updateMustahikSheetTotal(zakat);
}

function updateMustahikSheetTotal(zakat) {
  console.log("🔍 updateMustahikSheetTotal dipanggil");

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

  if (!container) {
    console.warn("⚠️ container zakatMustahikSheetList tidak ditemukan");
    return;
  }

  // Hitung total dialokasikan
  var total = 0;
  container
    .querySelectorAll(".zakat-mustahik-sheet-nominal")
    .forEach(function (input) {
      var val = Number(input.value) || 0;
      total += val;
    });

  console.log("🔍 total dialokasikan:", total);

  // Hitung dana mustahik dari rincian
  var r = zakat.rincian || {};
  var mustahikData = r.mustahik || {
    persen: 45,
    nominal: 0,
    kelompok: { persen: 80, nominal: 0 },
  };
  var danaMustahik = mustahikData.nominal || 0;

  // Fallback: jika danaMustahik 0, hitung dari persentase
  if (danaMustahik === 0 && zakat.total > 0 && mustahikData.persen) {
    danaMustahik = Math.round((zakat.total * mustahikData.persen) / 100);
  }

  console.log("🔍 danaMustahik:", danaMustahik);

  var sisa = Math.max(0, danaMustahik - total);
  var progress = danaMustahik > 0 ? (total / danaMustahik) * 100 : 0;

  // Update total
  if (totalEl) {
    totalEl.textContent = fmtRp(total);
    totalEl.style.color = "var(--brand)";
  }

  // Update validation
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

  // Update status
  if (statusEl) {
    if (danaMustahik === 0) {
      statusEl.textContent = "● Belum diatur";
      statusEl.style.color = "var(--ink-faint)";
      statusEl.style.background = "var(--surface-alt)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    } else if (total === 0) {
      statusEl.textContent = "⚠️ Belum ada alokasi";
      statusEl.style.color = "var(--gold)";
      statusEl.style.background = "var(--gold-soft)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    } else if (total === danaMustahik) {
      statusEl.textContent = "✓ Seimbang";
      statusEl.style.color = "var(--pos)";
      statusEl.style.background = "var(--pos-soft)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    } else if (total < danaMustahik) {
      statusEl.textContent = "⚠️ Kurang " + fmtRp(danaMustahik - total);
      statusEl.style.color = "var(--gold)";
      statusEl.style.background = "var(--gold-soft)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    } else {
      statusEl.textContent = "⚠️ Kelebihan " + fmtRp(total - danaMustahik);
      statusEl.style.color = "var(--neg)";
      statusEl.style.background = "var(--neg-soft)";
      statusEl.style.padding = "2px 10px";
      statusEl.style.borderRadius = "999px";
    }
  }

  // Update progress bar
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

// ============================================================
// MUSTAHIK SHEET - SUBMIT
// ============================================================

async function submitZakatMustahikSheet() {
  var zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  var container = document.getElementById("zakatMustahikSheetList");
  var btn = document.getElementById("zakatMustahikSheetSubmit");

  if (!container || !btn) {
    showToast("Elemen sheet tidak ditemukan.", "error");
    return;
  }

  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    var rows = container.querySelectorAll(".zakat-muzaki-row");
    var newMustahik = [];
    var hasDuplicate = false;
    var names = [];
    var total = 0;

    rows.forEach(function (row) {
      var nameInput = row.querySelector(".zakat-mustahik-sheet-name");
      var nominalInput = row.querySelector(".zakat-mustahik-sheet-nominal");

      var name = nameInput ? nameInput.value.trim() : "";
      var nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
      total += nominal;

      if (name) {
        var key = name.toLowerCase().trim();
        if (names.indexOf(key) !== -1) {
          hasDuplicate = true;
        } else {
          names.push(key);
          newMustahik.push({
            id:
              "MS" +
              Date.now().toString(36).toUpperCase() +
              Math.random().toString(36).substring(2, 5),
            nama: name,
            nominal: nominal,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (nominal > 0) {
        newMustahik.push({
          id:
            "MS" +
            Date.now().toString(36).toUpperCase() +
            Math.random().toString(36).substring(2, 5),
          nama: "Mustahik " + (newMustahik.length + 1),
          nominal: nominal,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (hasDuplicate) {
      showToast("Ada nama yang sama! Periksa kembali.", "error");
      hideZakatButtonLoading(btn);
      return;
    }

    if (newMustahik.length === 0) {
      showToast("Tambahkan minimal satu mustahik.", "error");
      hideZakatButtonLoading(btn);
      return;
    }

    zakat.mustahik = newMustahik;
    zakat.updatedAt = new Date().toISOString();

    var idx = state.zakat.list.findIndex(function (z) {
      return z.id === zakat.id;
    });
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    showZakatLoader("Menyimpan data mustahik...");
    var result = await apiUpdateZakatMustahik({
      id: zakat.id,
      mustahik: zakat.mustahik,
    });

    if (result.success) {
      showToast("Mustahik berhasil disimpan!", "success");
    } else {
      showToast("Mustahik disimpan (offline mode)", "warning");
    }

    renderZakatMustahikView(zakat);
    closeZakatMustahikSheet();
    renderZakatList();
  } catch (err) {
    console.error("Save mustahik error:", err);
    showToast("Gagal menyimpan mustahik", "error");
  } finally {
    hideZakatLoader();
    hideZakatButtonLoading(btn);
  }
}

// ============================================================
// ZAKAT - EVENT LISTENERS (TAMBAHAN)
// ============================================================

document
  .getElementById("zakatMuzakiEdit")
  ?.addEventListener("click", function () {
    openZakatMuzakiSheet();
  });

document
  .getElementById("zakatRincianEdit")
  ?.addEventListener("click", function () {
    openZakatRincianSheet();
  });

document
  .getElementById("zakatMustahikEdit")
  ?.addEventListener("click", function () {
    openZakatMustahikSheet();
  });

// ============================================================
// MUZAKI SHEET EVENT LISTENERS
// ============================================================

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
  .getElementById("zakatMuzakiSheetCount")
  ?.addEventListener("change", function () {
    var zakat = getZakatById(state.zakat.currentId);
    if (zakat) {
      var newCount = parseInt(this.value) || 1;
      while (zakat.muzaki.length < newCount) {
        zakat.muzaki.push({
          id:
            "MZ" +
            Date.now().toString(36).toUpperCase() +
            Math.random().toString(36).substring(2, 5),
          nama: "",
          nominal: 0,
        });
      }
      if (zakat.muzaki.length > newCount) {
        zakat.muzaki = zakat.muzaki.slice(0, newCount);
      }
      renderMuzakiSheetRows(zakat);
      updateMuzakiSheetTotal(zakat);
    }
  });

document
  .getElementById("zakatMuzakiSheet")
  ?.addEventListener("click", function (e) {
    if (e.target === this) {
      closeZakatMuzakiSheet();
    }
  });

// ============================================================
// RINCIAN SHEET EVENT LISTENERS
// ============================================================

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
        mustahik: {
          persen: 45,
          kelompok: 80,
          daerah: 20,
        },
        sabilillah: {
          persen: 40,
        },
        amil: {
          persen: 15,
          kelompok: 12,
          desa: 2,
          daerah: 1,
        },
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

// ============================================================
// MUSTAHIK SHEET EVENT LISTENERS
// ============================================================

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
// ============================================================
// ZAKAT DATE PICKER - STATE (DEKLARASIKAN DI AWAL)
// ============================================================

var zakatDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

var zakatEditDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};
function initZakatDatePicker() {
  console.log("🔄 initZakatDatePicker dipanggil");

  // ============================================================
  // FORM CREATE - ZAKAT DATE PICKER
  // ============================================================
  var dropdown = document.getElementById("zakatDateDropdown");
  var trigger = document.getElementById("zakatDateDropdownTrigger");
  var valueDisplay = document.getElementById("zakatDateDropdownValue");
  var menu = document.getElementById("zakatDateDropdownMenu");
  var hiddenInput = document.getElementById("zakatFormTanggal");

  if (dropdown && trigger && valueDisplay && menu && hiddenInput) {
    console.log("✅ Zakat Date picker element ditemukan");

    // ✅ Pastikan state sudah didefinisikan
    if (typeof zakatDatePickerState === "undefined") {
      zakatDatePickerState = {
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        selectedDate: null,
      };
    }

    var today = new Date();
    valueDisplay.textContent = formatDateDisplay(today);
    hiddenInput.value = formatDateInput(today);
    zakatDatePickerState.selectedDate = today;
    zakatDatePickerState.currentMonth = today.getMonth();
    zakatDatePickerState.currentYear = today.getFullYear();

    renderZakatDatePickerMenu(
      dropdown,
      menu,
      valueDisplay,
      hiddenInput,
      zakatDatePickerState,
    );

    // Hapus event listener lama
    var newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    var newTriggerElement = document.getElementById("zakatDateDropdownTrigger");
    if (newTriggerElement) {
      newTriggerElement.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleZakatDatePicker(dropdown);
      });
    }
  } else {
    console.warn("⚠️ Zakat Date picker element tidak ditemukan");
  }

  // ============================================================
  // FORM EDIT - ZAKAT DATE PICKER
  // ============================================================
  var editDropdown = document.getElementById("zakatEditDateDropdown");
  var editTrigger = document.getElementById("zakatEditDateDropdownTrigger");
  var editValueDisplay = document.getElementById("zakatEditDateDropdownValue");
  var editMenu = document.getElementById("zakatEditDateDropdownMenu");
  var editHiddenInput = document.getElementById("zakatEditHeaderTanggal");

  console.log("🔍 Zakat Edit Date elements:", {
    editDropdown: !!editDropdown,
    editTrigger: !!editTrigger,
    editValueDisplay: !!editValueDisplay,
    editMenu: !!editMenu,
    editHiddenInput: !!editHiddenInput,
  });

  if (
    editDropdown &&
    editTrigger &&
    editValueDisplay &&
    editMenu &&
    editHiddenInput
  ) {
    console.log("✅ Zakat Edit Date picker element ditemukan");

    // ✅ Pastikan state sudah didefinisikan
    if (typeof zakatEditDatePickerState === "undefined") {
      zakatEditDatePickerState = {
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        selectedDate: null,
      };
    }

    var today = new Date();
    editValueDisplay.textContent = formatDateDisplay(today);
    editHiddenInput.value = formatDateInput(today);
    zakatEditDatePickerState.selectedDate = today;
    zakatEditDatePickerState.currentMonth = today.getMonth();
    zakatEditDatePickerState.currentYear = today.getFullYear();

    renderZakatDatePickerMenu(
      editDropdown,
      editMenu,
      editValueDisplay,
      editHiddenInput,
      zakatEditDatePickerState,
    );

    // Hapus event listener lama
    var newEditTrigger = editTrigger.cloneNode(true);
    editTrigger.parentNode.replaceChild(newEditTrigger, editTrigger);

    var newEditTriggerElement = document.getElementById(
      "zakatEditDateDropdownTrigger",
    );
    if (newEditTriggerElement) {
      newEditTriggerElement.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log("🔔 Zakat Edit Date trigger clicked");
        toggleZakatDatePicker(editDropdown);
      });
    }

    // Close on outside click
    document.addEventListener("click", function (e) {
      var dd = document.getElementById("zakatEditDateDropdown");
      if (dd && !dd.contains(e.target)) {
        dd.classList.remove("open");
        var trig = document.getElementById("zakatEditDateDropdownTrigger");
        if (trig) trig.setAttribute("aria-expanded", "false");
        removeZakatDatePickerBackdrop();
      }
    });
  } else {
    console.warn("⚠️ Zakat Edit Date picker element tidak ditemukan");
  }
}

function renderZakatDatePickerMenu(
  dropdown,
  menu,
  valueDisplay,
  hiddenInput,
  state,
) {
  if (!menu || !dropdown) {
    console.warn("⚠️ renderZakatDatePickerMenu: menu atau dropdown null");
    return;
  }

  const pickerState = state || zakatDatePickerState;
  const year = pickerState.currentYear;
  const month = pickerState.currentMonth;

  const monthNames = [
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

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let daysHtml = "";
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const prevMonthDays = firstDay;
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${day}" data-month="${month - 1}" data-year="${year}">${day}</button>`;
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const isToday =
      i === todayDate && month === todayMonth && year === todayYear;
    const isSelected =
      pickerState.selectedDate &&
      pickerState.selectedDate.getDate() === i &&
      pickerState.selectedDate.getMonth() === month &&
      pickerState.selectedDate.getFullYear() === year;

    let classes = "date-picker-day";
    if (isToday) classes += " today";
    if (isSelected) classes += " selected";

    daysHtml += `<button type="button" class="${classes}" data-day="${i}" data-month="${month}" data-year="${year}">${i}</button>`;
  }

  const totalDays = prevMonthDays + daysInMonth;
  const remainingDays = 42 - totalDays;
  for (let i = 1; i <= remainingDays; i++) {
    daysHtml += `<button type="button" class="date-picker-day other-month" data-day="${i}" data-month="${month + 1}" data-year="${year}">${i}</button>`;
  }

  const currentDate = pickerState.selectedDate;
  let currentDateStr = "";
  if (currentDate) {
    const day = String(currentDate.getDate()).padStart(2, "0");
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const year = currentDate.getFullYear();
    currentDateStr = `${day}-${month}-${year}`;
  }

  menu.innerHTML = `
    <div class="date-picker-input-wrap">
      <input 
        type="text" 
        class="date-picker-manual-input"
        placeholder="dd-mm-yyyy"
        value="${currentDateStr}"
        autocomplete="off"
        spellcheck="false"
      />
      <button type="button" class="date-picker-apply">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </button>
    </div>

    <div class="date-picker-divider"></div>

    <div class="date-picker-header">
      <button type="button" class="date-picker-nav" data-direction="prev">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span class="date-picker-month-year">${monthNames[month]} ${year}</span>
      <button type="button" class="date-picker-nav" data-direction="next">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>

    <div class="date-picker-weekdays">
      <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span>
      <span>Kam</span><span>Jum</span><span>Sab</span>
    </div>

    <div class="date-picker-days">
      ${daysHtml}
    </div>

    <div class="date-picker-footer">
      <button type="button" class="date-picker-today">Hari Ini</button>
      <button type="button" class="date-picker-clear">Hapus</button>
    </div>
  `;

  // ============================================================
  // EVENT LISTENERS - PASTIKAN MENGGUNAKAN addEventListener
  // ============================================================

  const manualInput = menu.querySelector(".date-picker-manual-input");
  if (manualInput) {
    manualInput.addEventListener("input", function (e) {
      let value = this.value.replace(/\D/g, "");
      if (value.length > 8) value = value.slice(0, 8);
      if (value.length > 2) {
        value = value.slice(0, 2) + "-" + value.slice(2);
      }
      if (value.length > 5) {
        value = value.slice(0, 5) + "-" + value.slice(5);
      }
      this.value = value;
    });

    manualInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        applyZakatManualDate(
          this.value,
          dropdown,
          valueDisplay,
          hiddenInput,
          pickerState,
        );
      }
      if (e.key === "Escape") {
        closeZakatDatePicker(dropdown);
      }
    });
  }

  const applyBtn = menu.querySelector(".date-picker-apply");
  if (applyBtn) {
    applyBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const input = this.closest(".date-picker-input-wrap").querySelector(
        ".date-picker-manual-input",
      );
      if (input) {
        applyZakatManualDate(
          input.value,
          dropdown,
          valueDisplay,
          hiddenInput,
          pickerState,
        );
      }
    });
  }

  menu.querySelectorAll(".date-picker-nav").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const direction = this.dataset.direction;
      if (direction === "prev") {
        pickerState.currentMonth--;
        if (pickerState.currentMonth < 0) {
          pickerState.currentMonth = 11;
          pickerState.currentYear--;
        }
      } else {
        pickerState.currentMonth++;
        if (pickerState.currentMonth > 11) {
          pickerState.currentMonth = 0;
          pickerState.currentYear++;
        }
      }
      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        pickerState,
      );
    });
  });

  menu.querySelectorAll(".date-picker-day").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const day = parseInt(this.dataset.day);
      const month = parseInt(this.dataset.month);
      const year = parseInt(this.dataset.year);
      const date = new Date(year, month, day);
      selectZakatDate(date, dropdown, valueDisplay, hiddenInput, pickerState);
    });
  });

  const todayBtn = menu.querySelector(".date-picker-today");
  if (todayBtn) {
    todayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const today = new Date();
      selectZakatDate(today, dropdown, valueDisplay, hiddenInput, pickerState);
    });
  }

  const clearBtn = menu.querySelector(".date-picker-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      clearZakatDate(dropdown, valueDisplay, hiddenInput, pickerState);
    });
  }

  setTimeout(function () {
    const rect = dropdown.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Jika menu terpotong di bagian bawah, pindahkan ke atas
    if (menuRect.bottom > viewportHeight - 20) {
      menu.style.top = "auto";
      menu.style.bottom = "calc(100% + 8px)";
      menu.style.maxHeight =
        Math.min(280, viewportHeight - rect.top - 40) + "px";
    }

    // Jika menu terpotong di bagian atas, pindahkan ke bawah
    if (menuRect.top < 20) {
      menu.style.top = "calc(100% + 8px)";
      menu.style.bottom = "auto";
      menu.style.maxHeight =
        Math.min(280, viewportHeight - rect.bottom - 40) + "px";
    }
  }, 50);
}

function toggleZakatDatePicker(dropdown) {
  if (!dropdown) {
    console.warn("⚠️ toggleZakatDatePicker: dropdown is null");
    return;
  }

  var isOpen = dropdown.classList.contains("open");
  var trigger = dropdown.querySelector(".filter-dropdown-trigger");

  // Tutup semua dropdown lain
  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      var trig = el.querySelector(".filter-dropdown-trigger");
      if (trig) trig.setAttribute("aria-expanded", "false");
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    removeZakatDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    if (trigger) trigger.setAttribute("aria-expanded", "true");

    // Ambil elemen yang benar
    var menu = dropdown.querySelector(".filter-dropdown-menu");
    var valueDisplay = dropdown.parentElement?.querySelector(
      ".filter-dropdown-value",
    );
    var hiddenInput = dropdown.parentElement?.querySelector(
      'input[type="hidden"]',
    );

    if (menu) {
      var state =
        dropdown.id === "zakatDateDropdown"
          ? zakatDatePickerState
          : zakatEditDatePickerState;

      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        state,
      );
    }

    // Adjust position
    adjustDatePickerPosition(dropdown);

    setTimeout(function () {
      var manualInput = dropdown.querySelector(".date-picker-manual-input");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 150);

    if (window.innerWidth <= 480) {
      addZakatDatePickerBackdrop(dropdown);
    }
  }
}

// ============================================================
// SELECT ZAKAT DATE
// ============================================================

function selectZakatDate(date, dropdown, valueDisplay, hiddenInput, state) {
  if (!date || isNaN(date.getTime())) return;

  state.selectedDate = date;
  state.currentMonth = date.getMonth();
  state.currentYear = date.getFullYear();

  if (valueDisplay) {
    valueDisplay.textContent = formatDateDisplay(date);
  }

  if (hiddenInput) {
    hiddenInput.value = formatDateInput(date);
  }

  closeZakatDatePicker(dropdown);

  if (hiddenInput) {
    hiddenInput.dispatchEvent(new Event("input", { bubbles: true }));
    hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

// ============================================================
// APPLY ZAKAT MANUAL DATE
// ============================================================

function applyZakatManualDate(
  dateStr,
  dropdown,
  valueDisplay,
  hiddenInput,
  state,
) {
  if (!dateStr) return;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return;
  if (day < 1 || day > 31) return;
  if (month < 0 || month > 11) return;
  if (year < 1900 || year > 2100) return;
  const date = new Date(year, month, day);
  if (date.getDate() !== day) return;
  selectZakatDate(date, dropdown, valueDisplay, hiddenInput, state);
}

function adjustDatePickerPosition(dropdown) {
  const menu = dropdown.querySelector(".filter-dropdown-menu");
  if (!menu) return;

  // Tunggu sebentar agar menu sudah visible
  setTimeout(function () {
    const rect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownRect = dropdown.getBoundingClientRect();

    // Reset dulu
    menu.style.top = "";
    menu.style.bottom = "";
    menu.style.maxHeight = "";

    // Cek apakah menu terpotong di bagian bawah
    if (rect.bottom > viewportHeight - 10) {
      // Jika terpotong, munculkan di ATAS trigger
      menu.style.top = "auto";
      menu.style.bottom = "calc(100% + 4px)";
      menu.style.maxHeight = Math.min(320, dropdownRect.top - 20) + "px";
    } else {
      // Normal: di bawah trigger
      menu.style.top = "calc(100% + 4px)";
      menu.style.bottom = "auto";
      // Sesuaikan max-height dengan ruang tersisa
      const availableHeight = viewportHeight - rect.top - 20;
      if (availableHeight < 200) {
        menu.style.maxHeight = Math.min(320, availableHeight) + "px";
      }
    }
  }, 50);
}

// ============================================================
// CLEAR ZAKAT DATE
// ============================================================

function clearZakatDate(dropdown, valueDisplay, hiddenInput, state) {
  if (valueDisplay) valueDisplay.textContent = "Pilih tanggal";
  if (hiddenInput) hiddenInput.value = "";
  state.selectedDate = null;
  closeZakatDatePicker(dropdown);
}

function truncateNameToThreeWords(name) {
  if (!name) return "";

  // Split nama menjadi array kata
  const words = name.trim().split(/\s+/);

  // Ambil 3 kata pertama
  const firstThree = words.slice(0, 3);

  // Gabungkan kembali
  return firstThree.join(" ");
}

// ============================================================
// BACKDROP
// ============================================================

function addZakatDatePickerBackdrop(dropdown) {
  removeZakatDatePickerBackdrop();
  const backdrop = document.createElement("div");
  backdrop.id = "zakatDatePickerBackdrop";
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 150;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(2px);
    animation: fadeIn 0.2s ease;
  `;
  backdrop.addEventListener("click", function () {
    closeZakatDatePicker(dropdown);
  });
  document.body.appendChild(backdrop);
}

function removeZakatDatePickerBackdrop() {
  const backdrop = document.getElementById("zakatDatePickerBackdrop");
  if (backdrop) backdrop.remove();
}
