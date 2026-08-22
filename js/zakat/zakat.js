// ============================================================
// ZAKAT - HELPERS
// ============================================================

function generateZakatId() {
  return (
    "ZK" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substring(2, 5).toUpperCase()
  );
}

function getZakatData() {
  try {
    const raw = localStorage.getItem(ZAKAT_STATE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveZakatData(list) {
  localStorage.setItem(ZAKAT_STATE_KEY, JSON.stringify(list));
  state.zakat.list = list;
}

function getZakatById(id) {
  return state.zakat.list.find((z) => z.id === id) || null;
}

function createZakatItem(data) {
  return {
    id: generateZakatId(),
    title: data.title || "Zakat Baru",
    keterangan: data.keterangan || "",
    tanggal: data.tanggal || new Date().toISOString().slice(0, 10),
    tempat: data.tempat || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    muzaki: [],
    mustahik: [],
    total: 0,
    rincian: {
      mustahik: { total: 45, kelompok: 80, daerah: 20 },
      sabilillah: 40,
      amil: { total: 15, kelompok: 12, desa: 2, daerah: 1 },
    },
  };
}

function getUniqueNames(list) {
  const seen = new Set();
  const result = [];
  list.forEach((name) => {
    const key = name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(name);
    }
  });
  return result;
}

function getAllMuzakiNames() {
  const names = new Set();
  ZAKAT_SUGGESTIONS.muzaki.forEach((n) => names.add(n.trim()));
  state.zakat.list.forEach((z) => {
    if (z.muzaki) {
      z.muzaki.forEach((m) => {
        if (m.nama) names.add(m.nama.trim());
      });
    }
  });
  return Array.from(names).sort();
}

function getAllMustahikNames() {
  const names = new Set();
  ZAKAT_SUGGESTIONS.mustahik.forEach((n) => names.add(n.trim()));
  state.zakat.list.forEach((z) => {
    if (z.mustahik) {
      z.mustahik.forEach((m) => {
        if (m.nama) names.add(m.nama.trim());
      });
    }
  });
  return Array.from(names).sort();
}

// ============================================================
// ZAKAT - API CALLS (BACKEND INTEGRATION)
// ============================================================

async function apiGetZakatList() {
  try {
    const url = `${CONFIG.WEB_APP_URL}?action=getZakatList`;
    console.log("📡 Fetching zakat list from:", url);

    const res = await fetch(url);
    console.log("📡 Response status:", res.status);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    console.log("📡 Zakat list response:", data);

    // ✅ Pastikan selalu return dengan format yang benar
    // Apapun response dari server, kita normalize
    if (data && typeof data === "object") {
      // Jika success: true, return data
      if (data.success === true) {
        return {
          success: true,
          data: Array.isArray(data.data) ? data.data : [],
          message: data.message || "",
        };
      }

      // Jika success: false, tetap return dengan data kosong
      // tapi tandai sebagai gagal
      return {
        success: false,
        data: [],
        message: data.message || "Gagal mengambil data",
      };
    }

    // Jika response tidak valid
    return {
      success: false,
      data: [],
      message: "Response tidak valid",
    };
  } catch (e) {
    console.error("❌ apiGetZakatList error:", e);
    return {
      success: false,
      data: [],
      message: e.message || "Gagal mengambil data zakat",
    };
  }
}

async function apiGetZakatDetail(id) {
  const session = getSession();
  const payload = {
    action: "getZakatDetail",
    id: id,
  };
  if (session && session.token) {
    payload.token = session.token;
  }
  return apiPost(payload);
}

async function apiCreateZakat(data) {
  const session = getSession();
  const payload = {
    action: "createZakat",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiUpdateZakat(data) {
  const session = getSession();
  const payload = {
    action: "updateZakat",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiDeleteZakat(id) {
  const session = getSession();
  const payload = {
    action: "deleteZakat",
    token: session?.token || "",
    id: id,
  };
  return apiPost(payload);
}

// ============================================================
// ZAKAT - API CALLS PARSIAL
// ============================================================

async function apiUpdateZakatHeader(data) {
  const session = getSession();
  const payload = {
    action: "updateZakatHeader",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiUpdateZakatMuzaki(data) {
  const session = getSession();
  const payload = {
    action: "updateZakatMuzaki",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiUpdateZakatRincian(data) {
  const session = getSession();
  const payload = {
    action: "updateZakatRincian",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

async function apiUpdateZakatMustahik(data) {
  const session = getSession();
  const payload = {
    action: "updateZakatMustahik",
    token: session?.token || "",
    ...data,
  };
  return apiPost(payload);
}

// ============================================================
// ZAKAT - LOAD DATA DENGAN LOADER
// ============================================================

let zakatDataLoading = false;
let zakatDataLoaded = false;

async function loadZakatData() {
  // Jika sudah loading, tunggu
  if (zakatDataLoading) {
    console.log("⏳ Zakat data already loading, waiting...");
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!zakatDataLoading) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  // Jika sudah loaded dan ada data, skip loading
  if (zakatDataLoaded && state.zakat.list && state.zakat.list.length > 0) {
    console.log("✅ Zakat data already loaded, using cache");
    renderZakatList();
    return;
  }

  zakatDataLoading = true;

  try {
    // Tampilkan loader
    showZakatLoader("Memuat data zakat...");

    // Coba ambil dari API
    const response = await apiGetZakatList();

    if (response && response.success === true) {
      const data = response.data || [];
      state.zakat.list = data;
      saveZakatData(state.zakat.list);
      console.log("✅ Zakat data loaded from API:", data.length, "items");
      zakatDataLoaded = true;
    } else {
      // Fallback ke localStorage
      console.warn("⚠️ API gagal, gunakan data lokal");
      state.zakat.list = getZakatData();
      if (response && response.message) {
        showToast(response.message, "warning");
      }
      zakatDataLoaded = true;
    }

    renderZakatList();
    hideZakatLoader();
  } catch (err) {
    console.error("❌ Error loading zakat:", err);
    // Fallback ke localStorage
    state.zakat.list = getZakatData();
    renderZakatList();
    hideZakatLoader();
    showToast("Gagal sync data zakat, menggunakan data lokal", "warning");
  } finally {
    zakatDataLoading = false;
  }
}

async function refreshZakatData() {
  // Reset cache
  zakatDataLoaded = false;
  // Load ulang
  await loadZakatData();
}

async function syncZakatToBackend(data) {
  try {
    // Cek apakah data sudah ada
    const existing = state.zakat.list.find((z) => z.id === data.id);

    if (existing) {
      // UPDATE
      const result = await apiUpdateZakat(data);
      if (result && result.success) {
        // Update local
        const idx = state.zakat.list.findIndex((z) => z.id === data.id);
        if (idx !== -1) {
          state.zakat.list[idx] = data;
          saveZakatData(state.zakat.list);
        }
        return {
          success: true,
          message: result.message || "Zakat berhasil diperbarui",
        };
      } else {
        // Jika API gagal, tetap simpan di local
        const idx = state.zakat.list.findIndex((z) => z.id === data.id);
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
      // CREATE
      const result = await apiCreateZakat(data);
      if (result && result.success) {
        // Update ID dari backend jika ada
        if (result.data && result.data.id) {
          data.id = result.data.id;
        }
        // Tambahkan ke local
        if (!state.zakat.list.find((z) => z.id === data.id)) {
          state.zakat.list.push(data);
          saveZakatData(state.zakat.list);
        }
        return {
          success: true,
          message: result.message || "Zakat berhasil dibuat",
        };
      } else {
        // Jika API gagal, tetap simpan di local
        if (!state.zakat.list.find((z) => z.id === data.id)) {
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
    // Save local
    const existing = state.zakat.list.find((z) => z.id === data.id);
    if (!existing) {
      state.zakat.list.push(data);
    } else {
      const idx = state.zakat.list.findIndex((z) => z.id === data.id);
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
  const now = new Date();
  const newZakat = createZakatItem({
    title: `Zakat ${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`,
    tanggal: now.toISOString().slice(0, 10),
  });

  showZakatLoader("Membuat zakat baru...");

  try {
    const result = await syncZakatToBackend(newZakat);
    if (result.success) {
      renderZakatList();
      openZakatDetail(newZakat.id);
      showToast("Zakat baru berhasil dibuat!", "success");
    } else {
      // Sudah disimpan di local oleh syncZakatToBackend
      renderZakatList();
      openZakatDetail(newZakat.id);
      showToast("Zakat dibuat (offline mode)", "warning");
    }
  } catch (err) {
    console.error("Create zakat error:", err);
    // Fallback: simpan local
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
    const result = await apiDeleteZakat(id);
    if (result.success) {
      state.zakat.list = state.zakat.list.filter((z) => z.id !== id);
      saveZakatData(state.zakat.list);
      renderZakatList();
      if (state.zakat.currentId === id) {
        closeZakatDetail();
      }
      showToast("Zakat berhasil dihapus.", "info");
    } else {
      // Fallback: hapus local
      state.zakat.list = state.zakat.list.filter((z) => z.id !== id);
      saveZakatData(state.zakat.list);
      renderZakatList();
      if (state.zakat.currentId === id) {
        closeZakatDetail();
      }
      showToast("Zakat dihapus (offline mode)", "warning");
    }
  } catch (err) {
    // Fallback: hapus local
    state.zakat.list = state.zakat.list.filter((z) => z.id !== id);
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
  const zakat = getZakatById(id);
  if (!zakat) return;

  const overlay = document.createElement("div");
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
    .addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  overlay
    .querySelector("#zakatDeleteConfirm")
    .addEventListener("click", async () => {
      overlay.remove();
      await deleteZakat(id);
    });
}

// ============================================================
// ZAKAT - BOTTOM SHEET FORM
// ============================================================

let zakatEditingId = null;

function openZakatForm(zakatId = null) {
  const overlay = document.getElementById("zakatFormOverlay");
  const titleEl = document.getElementById("zakatFormSheetTitle");
  const subtitleEl = document.getElementById("zakatFormSheetSubtitle");
  const titleInput = document.getElementById("zakatFormTitleInput");
  const keteranganInput = document.getElementById("zakatFormKeterangan");
  const tanggalInput = document.getElementById("zakatFormTanggal");
  const tempatInput = document.getElementById("zakatFormTempat");

  if (!overlay) {
    console.warn("⚠️ zakatFormOverlay not found");
    return;
  }

  zakatEditingId = zakatId;

  if (zakatId) {
    // EDIT MODE
    if (titleEl) titleEl.textContent = "Edit Zakat";
    if (subtitleEl) subtitleEl.textContent = "Ubah data kegiatan zakat";

    const zakat = getZakatById(zakatId);
    if (zakat) {
      if (titleInput) titleInput.value = zakat.title || "";
      if (keteranganInput) keteranganInput.value = zakat.keterangan || "";
      if (tanggalInput) tanggalInput.value = zakat.tanggal || "";
      if (tempatInput) tempatInput.value = zakat.tempat || "";
    }
  } else {
    // CREATE MODE
    if (titleEl) titleEl.textContent = "Buat Zakat Baru";
    if (subtitleEl) subtitleEl.textContent = "Isi data kegiatan zakat";

    if (titleInput) titleInput.value = "";
    if (keteranganInput) keteranganInput.value = "";
    if (tanggalInput)
      tanggalInput.value = new Date().toISOString().slice(0, 10);
    if (tempatInput) tempatInput.value = "";
  }

  overlay.classList.remove("hidden");

  // ============================================================
  // INISIALISASI DATE PICKER - PASTIKAN ELEMEN SUDAH ADA
  // ============================================================
  setTimeout(function () {
    initZakatDatePicker();
  }, 200);
}

function closeZakatForm(showList = true) {
  const overlay = document.getElementById("zakatFormOverlay");
  const listContainer = document.getElementById("zakatListContainer");
  const fabZakat = document.getElementById("fabZakat");

  // Tutup overlay
  if (overlay) {
    overlay.classList.add("hidden");
  }

  // Tampilkan list jika diperlukan
  if (showList && listContainer) {
    listContainer.style.display = "block";
  }

  // Tampilkan FAB
  if (fabZakat) {
    fabZakat.classList.remove("hidden");
  }

  zakatEditingId = null;

  // Reset form
  const titleInput = document.getElementById("zakatFormTitleInput");
  const keteranganInput = document.getElementById("zakatFormKeterangan");
  const tempatInput = document.getElementById("zakatFormTempat");

  if (titleInput) titleInput.value = "";
  if (keteranganInput) keteranganInput.value = "";
  if (tempatInput) tempatInput.value = "";

  // Kembali ke list
  const screenTitle = document.getElementById("zakatScreenTitle");
  if (screenTitle) {
    screenTitle.textContent = "Manajemen Zakat";
  }

  // Jika ada detail yang terbuka, tutup
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
  const title = document.getElementById("zakatFormTitleInput").value.trim();
  const keterangan = document
    .getElementById("zakatFormKeterangan")
    .value.trim();
  const tanggal = document.getElementById("zakatFormTanggal").value;
  const tempat = document.getElementById("zakatFormTempat").value.trim();

  // Validasi
  if (!title) {
    showToast("Judul zakat wajib diisi.", "error");
    return;
  }

  if (!tanggal) {
    showToast("Tanggal pelaksanaan wajib diisi.", "error");
    return;
  }

  const btn = document.getElementById("zakatFormSubmit");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    let zakatData;
    let isEdit = false;

    if (zakatEditingId) {
      // EDIT
      const existing = getZakatById(zakatEditingId);
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
      // CREATE
      zakatData = createZakatItem({
        title: title,
        keterangan: keterangan,
        tanggal: tanggal,
        tempat: tempat,
      });
    }

    // Simpan ke backend & local
    showZakatLoader(isEdit ? "Mengupdate zakat..." : "Membuat zakat baru...");
    const result = await syncZakatToBackend(zakatData);

    // Tutup form terlebih dahulu
    closeZakatForm();

    if (result.success) {
      showToast(
        isEdit ? "Zakat berhasil diperbarui!" : "Zakat berhasil dibuat!",
        "success",
      );
    } else {
      // Jika offline, tampilkan warning
      if (result.offline) {
        showToast(result.message || "Data disimpan lokal", "warning");
      } else {
        showToast(result.message || "Gagal menyimpan zakat", "error");
      }
    }

    renderZakatList();

    // Jika create, langsung buka detail
    if (!isEdit) {
      const newZakat = getZakatById(zakatData.id);
      if (newZakat) {
        openZakatDetail(newZakat.id);
      }
    } else {
      // Jika edit, refresh detail jika terbuka
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
  // Tutup detail jika terbuka
  if (state.zakat.isViewOpen) {
    closeZakatDetail();
  }
  // Buka form create
  openZakatForm(null);
});

// ============================================================
// UPDATE - LIST ITEM (Edit & Delete)
// ============================================================

// ============================================================
// ZAKAT - DETAIL (FIXED)
// ============================================================

function openZakatDetail(id) {
  const zakat = getZakatById(id);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  state.zakat.currentId = id;
  state.zakat.isViewOpen = true;

  const listContainer = document.getElementById("zakatListContainer");
  const formContainer = document.getElementById("zakatFormContainer");
  const detailContainer = document.getElementById("zakatDetailContainer");
  const fabZakat = document.getElementById("fabZakat");
  const screenTitle = document.getElementById("zakatScreenTitle");

  if (listContainer) listContainer.style.display = "none";
  if (formContainer) formContainer.classList.add("hidden");
  if (detailContainer) detailContainer.classList.remove("hidden");
  if (fabZakat) fabZakat.classList.add("hidden");
  if (screenTitle) screenTitle.textContent = "Detail Zakat";

  // Update header
  updateZakatDetailHeader(zakat);

  // Reset tabs ke Muzaki
  const tabs = document.querySelectorAll(".zakat-tab");
  const panels = {
    muzaki: document.getElementById("zakatTabMuzaki"),
    rincian: document.getElementById("zakatTabRincian"),
    mustahik: document.getElementById("zakatTabMustahik"),
  };

  tabs.forEach((t) => t.classList.remove("active"));
  const firstTab = document.querySelector(
    '.zakat-tab[data-zakat-tab="muzaki"]',
  );
  if (firstTab) firstTab.classList.add("active");

  if (panels.muzaki) panels.muzaki.classList.add("active");
  if (panels.rincian) panels.rincian.classList.remove("active");
  if (panels.mustahik) panels.mustahik.classList.remove("active");

  renderZakatMuzakiTab(zakat);
  renderZakatRincianTab(zakat);
  renderZakatMustahikTab(zakat);
}

function updateZakatDetailHeader(zakat) {
  const titleEl = document.getElementById("zakatDetailTitle");
  const metaEl = document.getElementById("zakatDetailMeta");
  const keteranganEl = document.getElementById("zakatDetailKeterangan");
  const totalEl = document.getElementById("zakatDetailTotal");

  if (titleEl) titleEl.textContent = escapeHtml(zakat.title || "Zakat");
  if (metaEl) {
    metaEl.textContent = `${zakat.tanggal ? fmtDateShort(zakat.tanggal) : "-"} · ${escapeHtml(zakat.tempat || "Tempat tidak ditentukan")}`;
  }
  if (keteranganEl) {
    keteranganEl.textContent = zakat.keterangan || "Tidak ada keterangan";
    keteranganEl.style.display = zakat.keterangan ? "block" : "none";
  }
  if (totalEl) totalEl.textContent = fmtRp(zakat.total || 0);
}

// ============================================================
// ZAKAT - EDIT HEADER (BOTTOM SHEET)
// ============================================================

function openEditZakatHeader() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const overlay = document.getElementById("zakatEditHeaderOverlay");
  if (!overlay) return;

  // Isi data
  document.getElementById("zakatEditHeaderTitle").value = zakat.title || "";
  document.getElementById("zakatEditHeaderKeterangan").value =
    zakat.keterangan || "";
  document.getElementById("zakatEditHeaderTanggal").value = zakat.tanggal || "";
  document.getElementById("zakatEditHeaderTempat").value = zakat.tempat || "";

  overlay.classList.remove("hidden");
}

function closeEditZakatHeader() {
  const overlay = document.getElementById("zakatEditHeaderOverlay");
  if (overlay) overlay.classList.add("hidden");
}

async function submitEditZakatHeader() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const title = document.getElementById("zakatEditHeaderTitle").value.trim();
  const keterangan = document
    .getElementById("zakatEditHeaderKeterangan")
    .value.trim();
  const tanggal = document.getElementById("zakatEditHeaderTanggal").value;
  const tempat = document.getElementById("zakatEditHeaderTempat").value.trim();

  if (!title) {
    showToast("Judul zakat wajib diisi.", "error");
    return;
  }

  if (!tanggal) {
    showToast("Tanggal pelaksanaan wajib diisi.", "error");
    return;
  }

  const btn = document.getElementById("zakatEditHeaderSubmit");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    // Update lokal
    zakat.title = title;
    zakat.keterangan = keterangan;
    zakat.tanggal = tanggal;
    zakat.tempat = tempat;
    zakat.updatedAt = new Date().toISOString();

    const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    // Kirim ke backend (HANYA HEADER)
    showZakatLoader("Menyimpan data header...");
    const result = await apiUpdateZakatHeader({
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
      // Offline mode
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

const zakatSaveMuzaki = document.getElementById("zakatSaveMuzaki");
if (zakatSaveMuzaki) {
  zakatSaveMuzaki.onclick = async function () {
    const btn = this;
    const zakat = getZakatById(state.zakat.currentId);
    if (!zakat) {
      showToast("Zakat tidak ditemukan.", "error");
      return;
    }

    showZakatButtonLoading(btn, "Menyimpan Muzaki...");

    try {
      const container = document.getElementById("zakatMuzakiList");
      if (!container) {
        showToast("Container muzaki tidak ditemukan.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      const rows = container.querySelectorAll(".zakat-muzaki-row");
      const newMuzaki = [];
      let hasDuplicate = false;
      const names = [];
      let total = 0;

      rows.forEach((row) => {
        const nameInput = row.querySelector(".zakat-muzaki-name");
        const nominalInput = row.querySelector(".zakat-muzaki-nominal");

        const name = nameInput ? nameInput.value.trim() : "";
        const nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
        total += nominal;

        if (name) {
          const key = name.toLowerCase().trim();
          if (names.includes(key)) {
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

      // Update lokal
      zakat.muzaki = newMuzaki;
      zakat.total = total;
      zakat.updatedAt = new Date().toISOString();

      const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
        saveZakatData(state.zakat.list);
      }

      // Kirim ke backend
      showZakatLoader("Menyimpan data muzaki...");
      const result = await apiUpdateZakatMuzaki({
        id: zakat.id,
        muzaki: zakat.muzaki,
        total: zakat.total,
      });

      const totalEl = document.getElementById("zakatDetailTotal");
      if (totalEl) {
        totalEl.textContent = fmtRp(zakat.total);
      }

      if (result.success) {
        showToast("Muzaki berhasil disimpan!", "success");
      } else {
        showToast("Muzaki disimpan (offline mode)", "warning");
      }

      renderZakatList();
    } catch (err) {
      console.error("Save muzaki error:", err);
      showToast("Gagal menyimpan muzaki", "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
} else {
  console.warn("⚠️ zakatSaveMuzaki element not found");
}

const zakatSaveRincian = document.getElementById("zakatSaveRincian");
if (zakatSaveRincian) {
  zakatSaveRincian.onclick = async function () {
    const btn = this;
    const zakat = getZakatById(state.zakat.currentId);
    if (!zakat) {
      showToast("Zakat tidak ditemukan.", "error");
      return;
    }

    // Ambil persentase dari form
    const mustahikPersen = Number(
      document.getElementById("zakatPersenMustahik")?.value || 0,
    );
    const sabilillahPersen = Number(
      document.getElementById("zakatPersenSabilillah")?.value || 0,
    );
    const amilPersen = Number(
      document.getElementById("zakatPersenAmil")?.value || 0,
    );

    // Validasi total persentase = 100%
    const totalPersen = mustahikPersen + sabilillahPersen + amilPersen;
    if (totalPersen !== 100) {
      showToast("Total persentase harus 100%!", "error");
      return;
    }

    // Ambil persentase rincian Mustahik
    const mustahikKelompokPersen = Number(
      document.getElementById("zakatPersenMustahikKelompok")?.value || 0,
    );
    const mustahikDaerahPersen = Number(
      document.getElementById("zakatPersenMustahikDaerah")?.value || 0,
    );

    // Validasi Mustahik sub-total = 100%
    if (mustahikKelompokPersen + mustahikDaerahPersen !== 100) {
      showToast("Mustahik Kelompok + Daerah harus 100%!", "error");
      return;
    }

    // Ambil persentase rincian Amil
    const amilKelompokPersen = Number(
      document.getElementById("zakatPersenAmilKelompok")?.value || 0,
    );
    const amilDesaPersen = Number(
      document.getElementById("zakatPersenAmilDesa")?.value || 0,
    );
    const amilDaerahPersen = Number(
      document.getElementById("zakatPersenAmilDaerah")?.value || 0,
    );

    // Validasi Amil sub-total = persentase Amil
    if (amilKelompokPersen + amilDesaPersen + amilDaerahPersen !== amilPersen) {
      showToast(
        "Amil Kelompok + Desa + Daerah harus sama dengan persentase Amil!",
        "error",
      );
      return;
    }

    showZakatButtonLoading(btn, "Menyimpan Rincian...");

    try {
      // HITUNG NOMINAL dari persentase
      const totalZakat = zakat.total || 0;

      // Nominal utama
      const mustahikNominal = Math.round((totalZakat * mustahikPersen) / 100);
      const sabilillahNominal = Math.round(
        (totalZakat * sabilillahPersen) / 100,
      );
      const amilNominal = Math.round((totalZakat * amilPersen) / 100);

      // Rincian Mustahik (Nominal)
      const mustahikKelompokNominal = Math.round(
        (mustahikNominal * mustahikKelompokPersen) / 100,
      );
      const mustahikDaerahNominal = Math.round(
        (mustahikNominal * mustahikDaerahPersen) / 100,
      );

      // Rincian Amil (Nominal)
      const amilKelompokNominal = Math.round(
        (amilNominal * amilKelompokPersen) / 100,
      );
      const amilDesaNominal = Math.round((amilNominal * amilDesaPersen) / 100);
      const amilDaerahNominal = Math.round(
        (amilNominal * amilDaerahPersen) / 100,
      );

      // Simpan rincian dengan persentase DAN nominal hasil perhitungan
      zakat.rincian = {
        // Data utama dengan persentase dan nominal
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

      // Update lokal
      const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
        saveZakatData(state.zakat.list);
      }

      showZakatLoader("Menyimpan rincian zakat...");

      // Kirim ke backend - kirimkan data lengkap dengan nominal
      const result = await apiUpdateZakatRincian({
        id: zakat.id,
        rincian: zakat.rincian,
        // Kirim juga total agar backend bisa verifikasi
        total: zakat.total,
      });

      if (result.success) {
        showToast("Rincian berhasil disimpan!", "success");
      } else {
        showToast("Rincian disimpan (offline mode)", "warning");
      }

      renderZakatList();

      // Refresh tampilan rincian untuk menampilkan nominal
      renderZakatRincianTab(zakat);
    } catch (err) {
      console.error("Save rincian error:", err);
      showToast("Gagal menyimpan rincian: " + err.message, "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
} else {
  console.warn("⚠️ zakatSaveRincian not found");
}

// 3. SAVE MUSTAHIK
const zakatSaveMustahik = document.getElementById("zakatSaveMustahik");
if (zakatSaveMustahik) {
  zakatSaveMustahik.onclick = async function () {
    const btn = this;
    const zakat = getZakatById(state.zakat.currentId);
    if (!zakat) {
      showToast("Zakat tidak ditemukan.", "error");
      return;
    }

    showZakatButtonLoading(btn, "Menyimpan Mustahik...");

    try {
      const container = document.getElementById("zakatMustahikList");
      if (!container) {
        showToast("Container mustahik tidak ditemukan.", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      const rows = container.querySelectorAll(".zakat-muzaki-row");
      const newMustahik = [];
      let totalDistributed = 0;
      let hasDuplicate = false;
      const names = [];

      rows.forEach((row) => {
        const nameInput = row.querySelector(".zakat-mustahik-name");
        const nominalInput = row.querySelector(".zakat-mustahik-nominal");

        const name = nameInput ? nameInput.value.trim() : "";
        const nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
        totalDistributed += nominal;

        if (name) {
          const key = name.toLowerCase().trim();
          if (names.includes(key)) {
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

      const r = zakat.rincian || {};
      const mustahik = r.mustahik || { total: 45, kelompok: 80, daerah: 20 };
      const danaMustahik =
        ((zakat.total * mustahik.total) / 100) * (mustahik.kelompok / 100);

      if (totalDistributed > danaMustahik) {
        showToast("Total nominal melebihi dana mustahik!", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      zakat.mustahik = newMustahik;
      zakat.updatedAt = new Date().toISOString();

      const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
        saveZakatData(state.zakat.list);
      }

      showZakatLoader("Menyimpan data mustahik...");
      const result = await apiUpdateZakatMustahik({
        id: zakat.id,
        mustahik: zakat.mustahik,
      });

      if (result.success) {
        showToast("Mustahik berhasil disimpan!", "success");
      } else {
        showToast("Mustahik disimpan (offline mode)", "warning");
      }

      renderZakatList();
    } catch (err) {
      console.error("Save mustahik error:", err);
      showToast("Gagal menyimpan mustahik", "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
} else {
  console.warn("⚠️ zakatSaveMustahik not found");
}

// ============================================================
// ZAKAT - SAVE ALL (Kirim ke Database)
// ============================================================

async function saveAllZakat() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  // Validasi Rincian
  const totalPersen = Number(
    document.getElementById("zakatTotalPersen")?.textContent || 0,
  );
  if (totalPersen !== 100) {
    showToast("Total persentase harus 100%! Cek tab Rincian.", "error");
    return;
  }

  // Validasi Muzaki
  if (!zakat.muzaki || zakat.muzaki.length === 0) {
    showToast("Tambahkan minimal satu Muzaki.", "error");
    return;
  }

  // Validasi Mustahik
  if (!zakat.mustahik || zakat.mustahik.length === 0) {
    showToast("Tambahkan minimal satu Mustahik.", "error");
    return;
  }

  const btn = document.getElementById("zakatSaveAll");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    showZakatLoader("Menyimpan semua data zakat...");
    const result = await syncZakatToBackend(zakat);

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

// ============================================================
// ZAKAT - EVENT LISTENERS
// ============================================================

// Edit Header Button
document
  .getElementById("btnEditZakatHeader")
  ?.addEventListener("click", function () {
    openEditZakatHeader();
  });

// Edit Header Cancel
document
  .getElementById("zakatEditHeaderCancel")
  ?.addEventListener("click", function () {
    closeEditZakatHeader();
  });

// Edit Header Submit
const zakatEditHeaderSubmit = document.getElementById("zakatEditHeaderSubmit");
if (zakatEditHeaderSubmit) {
  zakatEditHeaderSubmit.onclick = async function () {
    const zakat = getZakatById(state.zakat.currentId);
    if (!zakat) {
      showToast("Zakat tidak ditemukan.", "error");
      return;
    }

    const titleEl = document.getElementById("zakatEditHeaderTitle");
    const keteranganEl = document.getElementById("zakatEditHeaderKeterangan");
    const tanggalEl = document.getElementById("zakatEditHeaderTanggal");
    const tempatEl = document.getElementById("zakatEditHeaderTempat");

    const title = titleEl ? titleEl.value.trim() : "";
    const keterangan = keteranganEl ? keteranganEl.value.trim() : "";
    const tanggal = tanggalEl ? tanggalEl.value : "";
    const tempat = tempatEl ? tempatEl.value.trim() : "";

    if (!title) {
      showToast("Judul zakat wajib diisi.", "error");
      return;
    }

    if (!tanggal) {
      showToast("Tanggal pelaksanaan wajib diisi.", "error");
      return;
    }

    const btn = this;
    showZakatButtonLoading(btn, "Menyimpan...");

    try {
      zakat.title = title;
      zakat.keterangan = keterangan;
      zakat.tanggal = tanggal;
      zakat.tempat = tempat;
      zakat.updatedAt = new Date().toISOString();

      const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
      if (idx !== -1) {
        state.zakat.list[idx] = zakat;
        saveZakatData(state.zakat.list);
      }

      showZakatLoader("Menyimpan data header...");
      const result = await apiUpdateZakatHeader({
        id: zakat.id,
        title: zakat.title,
        keterangan: zakat.keterangan,
        tanggal: zakat.tanggal,
        tempat: zakat.tempat,
      });

      if (result.success) {
        updateZakatDetailHeader(zakat);
        const overlay = document.getElementById("zakatEditHeaderOverlay");
        if (overlay) overlay.classList.add("hidden");
        showToast("Data zakat berhasil diperbarui!", "success");
      } else {
        updateZakatDetailHeader(zakat);
        const overlay = document.getElementById("zakatEditHeaderOverlay");
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
} else {
  console.warn("⚠️ zakatEditHeaderSubmit not found");
}

// Save All Button
document.getElementById("zakatSaveAll")?.addEventListener("click", function () {
  saveAllZakat();
});

// Close on overlay click
document
  .getElementById("zakatEditHeaderOverlay")
  ?.addEventListener("click", function (e) {
    if (e.target === this) {
      closeEditZakatHeader();
    }
  });

// ============================================================
// ZAKAT - LIST ITEM ACTION SHEET (Seperti contoh)
// ============================================================

// Buat fungsi untuk membuka action sheet pada item zakat
function openZakatActionSheet(zakatId) {
  const zakat = getZakatById(zakatId);
  if (!zakat) return;

  // Gunakan sheet overlay yang sudah ada atau buat baru
  // Rekomendasi: buat sheet action dengan pola yang sama seperti txActionOverlay

  const overlay = document.createElement("div");
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

  // Event listeners
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
// UPDATE - RENDER ZAKAT LIST (Gunakan action sheet)
// ============================================================

function renderZakatList() {
  const container = document.getElementById("zakatList");
  if (!container) return;

  const list = state.zakat.list || [];

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
    .map(
      (z) => `
    <div class="zakat-item" data-zakat-id="${z.id}">
      <div class="zakat-item-content" data-zakat-id="${z.id}">
        <div class="zakat-item-title">${escapeHtml(z.title)}</div>
        <div class="zakat-item-meta">
          <span>${z.tanggal ? fmtDateShort(z.tanggal) : "-"}</span>
          <span>•</span>
          <span>${escapeHtml(z.tempat || "Tempat tidak ditentukan")}</span>
          <span>•</span>
          <span>${z.muzaki ? z.muzaki.length : 0} Muzaki</span>
        </div>
        <div class="zakat-item-total">${fmtRp(z.total || 0)}</div>
      </div>
    </div>
  `,
    )
    .join("");

  // Event listener untuk klik item (buka detail)
  container.querySelectorAll(".zakat-item-content").forEach((item) => {
    item.addEventListener("click", function (e) {
      const id = this.dataset.zakatId;
      if (id) openZakatDetail(id);
    });
  });

  // Long press atau right click untuk action sheet (opsional)
  container.querySelectorAll(".zakat-item").forEach((item) => {
    // Klik kanan untuk action sheet
    item.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      const id = this.dataset.zakatId;
      if (id) openZakatActionSheet(id);
    });

    // Tap tahan untuk action sheet (mobile)
    let pressTimer = null;
    item.addEventListener("touchstart", function (e) {
      pressTimer = setTimeout(() => {
        const id = this.dataset.zakatId;
        if (id) openZakatActionSheet(id);
      }, 600);
    });
    item.addEventListener("touchend", function () {
      clearTimeout(pressTimer);
    });
    item.addEventListener("touchmove", function () {
      clearTimeout(pressTimer);
    });
  });
}

function closeZakatDetail() {
  state.zakat.currentId = null;
  state.zakat.isViewOpen = false;

  const listContainer = document.getElementById("zakatListContainer");
  const detailContainer = document.getElementById("zakatDetailContainer");
  const fabZakat = document.getElementById("fabZakat");
  const screenTitle = document.getElementById("zakatScreenTitle");

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
// ZAKAT - TAB MUZAKI
// ============================================================

function renderZakatMuzakiTab(zakat) {
  const container = document.getElementById("zakatMuzakiList");
  const countInput = document.getElementById("zakatMuzakiCount");
  const totalDisplay = document.getElementById("zakatMuzakiTotal");

  if (!container || !countInput) return;

  const muzakiList = zakat.muzaki || [];
  const count = Math.max(muzakiList.length || 1, 1);
  countInput.value = count;

  const allNames = getAllMuzakiNames();

  function renderMuzakiRows() {
    const currentCount = parseInt(countInput.value) || 1;

    // Simpan data yang sudah ada
    const existingData = [];
    for (let i = 0; i < Math.min(currentCount, muzakiList.length); i++) {
      if (muzakiList[i]) {
        existingData.push(muzakiList[i]);
      }
    }
    while (existingData.length < currentCount) {
      existingData.push({ id: "", nama: "", nominal: 0 });
    }

    // Kumpulkan nama yang sudah dipilih di row sebelumnya
    const selectedNames = [];
    let rows = [];
    for (let i = 0; i < currentCount; i++) {
      const existing = existingData[i] || { nama: "", nominal: 0 };

      // Nama yang sudah dipilih di row sebelumnya (untuk filter)
      const usedNames = [];
      for (let j = 0; j < i; j++) {
        const prevRow = document.querySelector(
          `.zakat-muzaki-row[data-index="${j}"]`,
        );
        if (prevRow) {
          const nameInput = prevRow.querySelector(".zakat-muzaki-name");
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
                .filter((n) => {
                  const lower = n.toLowerCase().trim();
                  const isUsed = usedNames.some(
                    (s) => s.toLowerCase().trim() === lower,
                  );
                  const isSelf = n === existing.nama;
                  return !isUsed || isSelf;
                })
                .map((n) => `<option value="${escapeHtml(n)}">`)
                .join("")}
            </datalist>
            ${existing.nama ? `<span class="zakat-name-badge">✓</span>` : ""}
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
    container.querySelectorAll(".zakat-muzaki-nominal").forEach((input) => {
      input.addEventListener("input", updateMuzakiTotal);
    });

    // Event listener untuk input nama - update suggestion & validation
    container.querySelectorAll(".zakat-muzaki-name").forEach((input) => {
      const idx = parseInt(input.dataset.index);

      input.addEventListener("input", function () {
        const val = this.value.toLowerCase().trim();
        const datalist = document.getElementById("suggest-muzaki-" + idx);
        if (datalist) {
          // Kumpulkan nama yang dipilih di row lain
          const selectedNames = [];
          container.querySelectorAll(".zakat-muzaki-row").forEach((row) => {
            if (row !== this.closest(".zakat-muzaki-row")) {
              const nameInput = row.querySelector(".zakat-muzaki-name");
              if (nameInput && nameInput.value) {
                selectedNames.push(nameInput.value);
              }
            }
          });

          datalist.innerHTML = "";
          allNames
            .filter((n) => {
              const lower = n.toLowerCase().trim();
              const match = val === "" || lower.includes(val);
              const notSelected = !selectedNames.some(
                (s) => s.toLowerCase().trim() === lower,
              );
              return match && notSelected;
            })
            .forEach((n) => {
              const opt = document.createElement("option");
              opt.value = n;
              datalist.appendChild(opt);
            });
        }
        updateMuzakiTotal();
      });

      input.addEventListener("blur", function () {
        const val = this.value.trim();
        if (val) {
          let isDuplicate = false;
          container.querySelectorAll(".zakat-muzaki-row").forEach((row) => {
            if (row !== this.closest(".zakat-muzaki-row")) {
              const nameInput = row.querySelector(".zakat-muzaki-name");
              if (
                nameInput &&
                nameInput.value.toLowerCase().trim() ===
                  val.toLowerCase().trim()
              ) {
                isDuplicate = true;
              }
            }
          });

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
    const inputs = container.querySelectorAll(".zakat-muzaki-nominal");
    let total = 0;
    inputs.forEach((input) => {
      total += Number(input.value) || 0;
    });
    totalDisplay.textContent = fmtRp(total);
  }

  countInput.addEventListener("change", () => {
    const newCount = parseInt(countInput.value) || 1;
    // Simpan data lama
    const currentData = [];
    container.querySelectorAll(".zakat-muzaki-row").forEach((row) => {
      const name = row.querySelector(".zakat-muzaki-name").value;
      const nominal =
        Number(row.querySelector(".zakat-muzaki-nominal").value) || 0;
      currentData.push({ nama: name, nominal });
    });

    // Update muzakiList
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

    // Restore data
    for (let i = 0; i < Math.min(newCount, currentData.length); i++) {
      if (zakat.muzaki[i]) {
        zakat.muzaki[i].nama = currentData[i].nama;
        zakat.muzaki[i].nominal = currentData[i].nominal;
      }
    }

    renderMuzakiRows();
  });

  renderMuzakiRows();

  // ============================================================
  // ZAKAT - SAVE MUZAKI DENGAN LOADER
  // ============================================================

  // Update fungsi save muzaki di renderZakatMuzakiTab:
  document.getElementById("zakatSaveMuzaki").onclick = async function () {
    const btn = this;
    showZakatButtonLoading(btn, "Menyimpan Muzaki...");

    try {
      const rows = container.querySelectorAll(".zakat-muzaki-row");
      const newMuzaki = [];
      let hasDuplicate = false;
      const names = [];

      rows.forEach((row) => {
        const name = row.querySelector(".zakat-muzaki-name").value.trim();
        const nominal =
          Number(row.querySelector(".zakat-muzaki-nominal").value) || 0;

        if (name) {
          const key = name.toLowerCase().trim();
          if (names.includes(key)) {
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
      zakat.total = newMuzaki.reduce((sum, m) => sum + m.nominal, 0);
      zakat.updatedAt = new Date().toISOString();

      showZakatLoader("Menyimpan data muzaki...");
      const result = await syncZakatToBackend(zakat);

      if (result.success) {
        document.getElementById("zakatDetailTotal").textContent = fmtRp(
          zakat.total,
        );
        showToast("Muzaki berhasil disimpan!", "success");
      } else {
        showToast("Muzaki disimpan (offline mode)", "warning");
      }
      renderZakatList();
    } catch (err) {
      console.error("Save muzaki error:", err);
      showToast("Gagal menyimpan muzaki", "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
}

// ============================================================
// ZAKAT - TAB RINCIAN
// ============================================================

function renderZakatRincianTab(zakat) {
  const totalZakat = zakat.total || 0;

  // Ambil data rincian
  const r = zakat.rincian || {};

  // Data persentase (default)
  const mustahikPersen = r.mustahik?.persen || 45;
  const sabilillahPersen = r.sabilillah?.persen || 40;
  const amilPersen = r.amil?.persen || 15;

  // Data nominal hasil perhitungan (jika ada)
  const mustahikNominal =
    r.mustahik?.nominal || Math.round((totalZakat * mustahikPersen) / 100);
  const sabilillahNominal =
    r.sabilillah?.nominal || Math.round((totalZakat * sabilillahPersen) / 100);
  const amilNominal =
    r.amil?.nominal || Math.round((totalZakat * amilPersen) / 100);

  const mustahikKelompokPersen = r.mustahik?.kelompok?.persen || 80;
  const mustahikDaerahPersen = r.mustahik?.daerah?.persen || 20;
  const mustahikKelompokNominal =
    r.mustahik?.kelompok?.nominal ||
    Math.round((mustahikNominal * mustahikKelompokPersen) / 100);
  const mustahikDaerahNominal =
    r.mustahik?.daerah?.nominal ||
    Math.round((mustahikNominal * mustahikDaerahPersen) / 100);

  const amilKelompokPersen = r.amil?.kelompok?.persen || 12;
  const amilDesaPersen = r.amil?.desa?.persen || 2;
  const amilDaerahPersen = r.amil?.daerah?.persen || 1;
  const amilKelompokNominal =
    r.amil?.kelompok?.nominal ||
    Math.round((amilNominal * amilKelompokPersen) / 100);
  const amilDesaNominal =
    r.amil?.desa?.nominal || Math.round((amilNominal * amilDesaPersen) / 100);
  const amilDaerahNominal =
    r.amil?.daerah?.nominal ||
    Math.round((amilNominal * amilDaerahPersen) / 100);

  // Set nilai ke input
  const setValue = (id, value) => {
    const el = document.getElementById(id);
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

  // Tampilkan nominal hasil perhitungan
  const nominalDisplay = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = fmtRp(value);
      el.style.color = value > 0 ? "var(--pos)" : "var(--ink-faint)";
    }
  };

  // Tambahkan elemen display nominal jika belum ada
  // Atau gunakan elemen yang sudah ada
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

  // Update fungsi validasi
  function updateRincian() {
    const getVal = (id) => Number(document.getElementById(id)?.value || 0);

    const pMustahik = getVal("zakatPersenMustahik");
    const pSabilillah = getVal("zakatPersenSabilillah");
    const pAmil = getVal("zakatPersenAmil");

    const pKelompok = getVal("zakatPersenMustahikKelompok");
    const pDaerah = getVal("zakatPersenMustahikDaerah");
    const pAmilKelompok = getVal("zakatPersenAmilKelompok");
    const pAmilDesa = getVal("zakatPersenAmilDesa");
    const pAmilDaerah = getVal("zakatPersenAmilDaerah");

    // Validasi Mustahik sub-total
    const mustahikSub = pKelompok + pDaerah;
    const mustahikSubEl = document.getElementById("zakatMustahikSubTotal");
    if (mustahikSubEl) {
      mustahikSubEl.textContent = `Subtotal: ${pKelompok}% + ${pDaerah}% = ${mustahikSub}%`;
      mustahikSubEl.className =
        "zakat-rincian-sub-total " +
        (mustahikSub === 100 ? "valid" : "invalid");
    }

    // Validasi Amil sub-total
    const amilSub = pAmilKelompok + pAmilDesa + pAmilDaerah;
    const amilSubEl = document.getElementById("zakatAmilSubTotal");
    if (amilSubEl) {
      amilSubEl.textContent = `Subtotal: ${pAmilKelompok}% + ${pAmilDesa}% + ${pAmilDaerah}% = ${amilSub}%`;
      amilSubEl.className =
        "zakat-rincian-sub-total " + (amilSub === pAmil ? "valid" : "invalid");
    }

    // Total persentase
    const totalPersen = pMustahik + pSabilillah + pAmil;
    const totalEl = document.getElementById("zakatTotalPersen");
    if (totalEl) {
      totalEl.textContent = totalPersen;
      totalEl.style.color = totalPersen === 100 ? "var(--pos)" : "var(--neg)";
    }

    // Update nominal preview (live preview)
    const totalZakat = zakat.total || 0;
    const mustahikNominalPreview = Math.round((totalZakat * pMustahik) / 100);
    const sabilillahNominalPreview = Math.round(
      (totalZakat * pSabilillah) / 100,
    );
    const amilNominalPreview = Math.round((totalZakat * pAmil) / 100);

    const nominalEl = document.getElementById("zakatTotalNominal");
    if (nominalEl) {
      if (totalPersen === 100) {
        const totalNominal =
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

    // Update preview nominal rincian
    const previewEls = {
      zakatMustahikNominalPreview: mustahikNominalPreview,
      zakatSabilillahNominalPreview: sabilillahNominalPreview,
      zakatAmilNominalPreview: amilNominalPreview,
    };

    Object.keys(previewEls).forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = fmtRp(previewEls[id]);
        el.style.color = previewEls[id] > 0 ? "var(--pos)" : "var(--ink-faint)";
      }
    });
  }

  // Event listener untuk update real-time
  const rincianInputs = [
    "zakatPersenMustahik",
    "zakatPersenMustahikKelompok",
    "zakatPersenMustahikDaerah",
    "zakatPersenSabilillah",
    "zakatPersenAmil",
    "zakatPersenAmilKelompok",
    "zakatPersenAmilDesa",
    "zakatPersenAmilDaerah",
  ];

  rincianInputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", updateRincian);
    }
  });

  // Set Default buttons
  document.querySelectorAll(".zakat-default-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const target = this.dataset.target;
      const defaults = {
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

  // Initial update
  updateRincian();
}
// ============================================================
// ZAKAT - TAB MUSTAHIK
// ============================================================

function renderZakatMustahikTab(zakat) {
  const container = document.getElementById("zakatMustahikList");
  const countInput = document.getElementById("zakatMustahikCount");
  const danaDisplay = document.getElementById("zakatMustahikDana");
  const sisaDisplay = document.getElementById("zakatMustahikSisa");

  if (!container || !countInput) return;

  const totalZakat = zakat.total || 0;
  const r = zakat.rincian || {};
  const mustahik = r.mustahik || { total: 45, kelompok: 80, daerah: 20 };
  const danaMustahik =
    ((totalZakat * mustahik.total) / 100) * (mustahik.kelompok / 100);

  danaDisplay.textContent = fmtRp(danaMustahik);

  const mustahikList = zakat.mustahik || [];
  const count = Math.max(mustahikList.length || 1, 1);
  countInput.value = count;

  const allNames = getAllMustahikNames();

  function renderMustahikRows() {
    const currentCount = parseInt(countInput.value) || 1;
    let totalDistributed = 0;

    // Simpan data yang sudah ada
    const existingData = [];
    for (let i = 0; i < Math.min(currentCount, mustahikList.length); i++) {
      if (mustahikList[i]) {
        existingData.push(mustahikList[i]);
      }
    }
    while (existingData.length < currentCount) {
      existingData.push({ id: "", nama: "", nominal: 0 });
    }

    let rows = [];
    for (let i = 0; i < currentCount; i++) {
      const existing = existingData[i] || { nama: "", nominal: 0 };
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
                .filter((n) => {
                  const lower = n.toLowerCase().trim();
                  const isUsed = mustahikList.some(
                    (m) =>
                      m.nama &&
                      m.nama.toLowerCase().trim() === lower &&
                      m !== existing,
                  );
                  const isSelf = n === existing.nama;
                  return !isUsed || isSelf;
                })
                .map((n) => `<option value="${escapeHtml(n)}">`)
                .join("")}
            </datalist>
            ${existing.nama ? `<span class="zakat-name-badge">✓</span>` : ""}
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

    container.querySelectorAll(".zakat-mustahik-nominal").forEach((input) => {
      input.addEventListener("input", updateSisa);
    });

    container.querySelectorAll(".zakat-mustahik-name").forEach((input) => {
      input.addEventListener("input", function () {
        const val = this.value.toLowerCase().trim();
        const idx = parseInt(this.dataset.index);
        const datalist = document.getElementById("suggest-mustahik-" + idx);
        if (datalist) {
          const selectedNames = [];
          container
            .querySelectorAll(".zakat-mustahik-name")
            .forEach((other) => {
              if (other !== this && other.value) {
                selectedNames.push(other.value);
              }
            });

          datalist.innerHTML = "";
          allNames
            .filter((n) => {
              const lower = n.toLowerCase().trim();
              const match = val === "" || lower.includes(val);
              const notSelected = !selectedNames.some(
                (s) => s.toLowerCase().trim() === lower,
              );
              return match && notSelected;
            })
            .forEach((n) => {
              const opt = document.createElement("option");
              opt.value = n;
              datalist.appendChild(opt);
            });
        }
      });
    });
  }

  function updateSisa() {
    let totalDistributed = 0;
    container.querySelectorAll(".zakat-mustahik-nominal").forEach((input) => {
      totalDistributed += Number(input.value) || 0;
    });
    const sisa = Math.max(0, danaMustahik - totalDistributed);
    sisaDisplay.textContent = fmtRp(sisa);
    sisaDisplay.style.color = sisa > 0 ? "var(--pos)" : "var(--ink-soft)";

    const progress =
      danaMustahik > 0 ? (totalDistributed / danaMustahik) * 100 : 0;
    const progressEl = document.getElementById("zakatMustahikProgress");
    if (progressEl) {
      progressEl.style.width = Math.min(100, progress) + "%";
      progressEl.style.background =
        progress >= 100 ? "var(--pos)" : "var(--brand)";
    }
  }

  countInput.addEventListener("change", () => {
    const newCount = parseInt(countInput.value) || 1;
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

  document.getElementById("zakatSaveMustahik").onclick = async function () {
    const btn = this;
    showZakatButtonLoading(btn, "Menyimpan Mustahik...");

    try {
      const rows = container.querySelectorAll(".zakat-muzaki-row");
      const newMustahik = [];
      let totalDistributed = 0;
      let hasDuplicate = false;
      const names = [];

      rows.forEach((row) => {
        const name = row.querySelector(".zakat-mustahik-name").value.trim();
        const nominal =
          Number(row.querySelector(".zakat-mustahik-nominal").value) || 0;
        totalDistributed += nominal;

        if (name) {
          const key = name.toLowerCase().trim();
          if (names.includes(key)) {
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

      if (totalDistributed > danaMustahik) {
        showToast("Total nominal melebihi dana mustahik!", "error");
        hideZakatButtonLoading(btn);
        return;
      }

      zakat.mustahik = newMustahik;
      zakat.updatedAt = new Date().toISOString();

      showZakatLoader("Menyimpan data mustahik...");
      const result = await syncZakatToBackend(zakat);

      if (result.success) {
        showToast("Mustahik berhasil disimpan!", "success");
      } else {
        showToast("Mustahik disimpan (offline mode)", "warning");
      }
      renderZakatList();
    } catch (err) {
      console.error("Save mustahik error:", err);
      showToast("Gagal menyimpan mustahik", "error");
    } finally {
      hideZakatLoader();
      hideZakatButtonLoading(btn);
    }
  };
}

// ============================================================
// ZAKAT - TABS NAVIGATION
// ============================================================

function initZakatTabs() {
  const tabs = document.querySelectorAll(".zakat-tab");

  // ✅ CEK: Pastikan ada tabs
  if (!tabs || tabs.length === 0) {
    console.warn("⚠️ No zakat tabs found");
    return;
  }

  const panels = {
    muzaki: document.getElementById("zakatTabMuzaki"),
    rincian: document.getElementById("zakatTabRincian"),
    mustahik: document.getElementById("zakatTabMustahik"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const target = this.dataset.zakatTab;
      const zakat = getZakatById(state.zakat?.currentId);
      if (!zakat) return;

      // Update tab aktif
      tabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      // ✅ Update panel dengan aman
      Object.keys(panels).forEach((key) => {
        const panel = panels[key];
        if (panel) {
          if (key === target) {
            panel.classList.add("active");
          } else {
            panel.classList.remove("active");
          }
        }
      });

      // Render konten sesuai tab
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
// ZAKAT - SCREEN NAVIGATION (DENGAN LOADER & MENUTUPI BOTTOM NAV)
// ============================================================

window.openZakatScreen = function () {
  console.log("🔄 openZakatScreen called");

  // Gunakan router untuk navigasi
  if (
    typeof router !== "undefined" &&
    router &&
    typeof router.navigateTo === "function"
  ) {
    router.navigateTo("zakat");
  } else {
    // Fallback: langsung tampilkan screen
    const screen = document.getElementById("screen-zakat");
    if (!screen) {
      console.error("❌ screen-zakat not found");
      showToast("Screen Zakat tidak ditemukan", "error");
      return;
    }

    // Sembunyikan bottom nav
    const bottomNav = document.getElementById("bottomnav");
    if (bottomNav) {
      bottomNav.style.display = "none";
    }

    screen.classList.add("active");
    showZakatLoader("Memuat data zakat...");
    loadZakatData();
  }
};

// Tutup Zakat Screen dan kembali ke Profile
window.closeZakatScreen = function () {
  console.log("🔄 closeZakatScreen called");

  // Kembali ke profile via router
  if (
    typeof router !== "undefined" &&
    router &&
    typeof router.navigateTo === "function"
  ) {
    router.navigateTo("profile");
  } else {
    // Fallback
    const screen = document.getElementById("screen-zakat");
    if (screen) {
      screen.classList.remove("active");
    }

    // Kembalikan bottom nav
    const bottomNav = document.getElementById("bottomnav");
    if (bottomNav) {
      bottomNav.style.display = "";
    }
  }

  state.zakat.isViewOpen = false;
  state.zakat.currentId = null;

  // Tutup semua sheet zakat
  const sheets = [
    "zakatMuzakiSheet",
    "zakatRincianSheet",
    "zakatMustahikSheet",
    "zakatFormOverlay",
    "zakatEditHeaderOverlay",
  ];

  sheets.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
};

// ============================================================
// ZAKAT - LOADER FUNCTIONS (PASTIKAN TERSEDIA)
// ============================================================

function showZakatLoader(message = "Memuat data...") {
  const loader = document.getElementById("zakatLoader");
  const text = document.getElementById("zakatLoaderText");
  if (loader) {
    loader.classList.remove("hidden");
    if (text) text.textContent = message;
  }
}

function hideZakatLoader() {
  const loader = document.getElementById("zakatLoader");
  if (loader) {
    loader.classList.add("hidden");
  }
}

function showZakatButtonLoading(btn, text = "Menyimpan...") {
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
// ZAKAT - INISIALISASI (FIXED - SEMUA ELEMEN DI-CEK)
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  console.log("🔄 Zakat module initializing...");

  // Inisialisasi state
  if (!state.zakat) {
    state.zakat = {
      list: getZakatData(),
      currentId: null,
      isViewOpen: false,
      _loaded: false,
      _loading: false,
    };
  }

  document.addEventListener("click", function (e) {
    const btn = e.target.closest("#btnOpenZakat");
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      console.log("🔄 btnOpenZakat clicked via delegation");

      // Panggil fungsi openZakatScreen
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

  // ✅ Tombol Back
  const btnZakatBack = document.getElementById("btnZakatBack");
  if (btnZakatBack) {
    btnZakatBack.addEventListener("click", function () {
      const formContainer = document.getElementById("zakatFormContainer");
      const screenTitle = document.getElementById("zakatScreenTitle");

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

  // ✅ FAB Zakat
  const fabZakat = document.getElementById("fabZakat");
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

  // ✅ Init tabs
  initZakatTabs();

  // ✅ Event listener untuk form
  const zakatFormCancel = document.getElementById("zakatFormCancel");
  if (zakatFormCancel) {
    zakatFormCancel.addEventListener("click", function () {
      closeZakatForm(true);
    });
  }

  const zakatFormSubmit = document.getElementById("zakatFormSubmit");
  if (zakatFormSubmit) {
    zakatFormSubmit.addEventListener("click", function () {
      submitZakatForm();
    });
  }

  // ✅ Close on overlay click
  const zakatFormOverlay = document.getElementById("zakatFormOverlay");
  if (zakatFormOverlay) {
    zakatFormOverlay.addEventListener("click", function (e) {
      if (e.target === this) {
        closeZakatForm(true);
      }
    });
  }

  // ✅ Enter key support
  const zakatFormTitleInput = document.getElementById("zakatFormTitleInput");
  if (zakatFormTitleInput) {
    zakatFormTitleInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const submitBtn = document.getElementById("zakatFormSubmit");
        if (submitBtn) submitBtn.click();
      }
    });
  }

  console.log("✅ Zakat module initialized");
});

// ============================================================
// ZAKAT - RENDER TAB VIEW (TABEL)
// ============================================================

// Render Muzaki Tab (Mode Lihat - Tabel)
function renderZakatMuzakiView(zakat) {
  const tbody = document.getElementById("zakatMuzakiTableBody");
  const totalEl = document.getElementById("zakatMuzakiTableTotal");
  const countEl = document.getElementById("zakatMuzakiCountDisplay");

  if (!tbody) return;

  const muzaki = zakat.muzaki || [];
  const total = muzaki.reduce((sum, m) => sum + (m.nominal || 0), 0);

  // Update count
  if (countEl) {
    countEl.textContent = muzaki.length + " orang";
  }

  if (muzaki.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="zakat-table-empty">Belum ada data muzaki.</td>
      </tr>
    `;
    if (totalEl) totalEl.textContent = fmtRp(0);
    return;
  }

  tbody.innerHTML = muzaki
    .map(
      (m, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(m.nama || "-")}</td>
      <td class="text-right mono">${fmtRp(m.nominal || 0)}</td>
    </tr>
  `,
    )
    .join("");

  if (totalEl) totalEl.textContent = fmtRp(total);
}

// Render Rincian Tab (Mode Lihat)
function renderZakatRincianView(zakat) {
  const totalZakat = zakat.total || 0;
  const r = zakat.rincian || {};

  // Data dengan default
  const mustahik = r.mustahik || {
    persen: 45,
    nominal: 0,
    kelompok: { persen: 80, nominal: 0 },
    daerah: { persen: 20, nominal: 0 },
  };
  const sabilillah = r.sabilillah || { persen: 40, nominal: 0 };
  const amil = r.amil || {
    persen: 15,
    nominal: 0,
    kelompok: { persen: 12, nominal: 0 },
    desa: { persen: 2, nominal: 0 },
    daerah: { persen: 1, nominal: 0 },
  };

  // Hitung nominal jika belum ada
  const mustahikNominal =
    mustahik.nominal || Math.round((totalZakat * mustahik.persen) / 100);
  const sabilillahNominal =
    sabilillah.nominal || Math.round((totalZakat * sabilillah.persen) / 100);
  const amilNominal =
    amil.nominal || Math.round((totalZakat * amil.persen) / 100);

  const mustahikKelompokNominal =
    mustahik.kelompok?.nominal ||
    Math.round((mustahikNominal * mustahik.kelompok.persen) / 100);
  const mustahikDaerahNominal =
    mustahik.daerah?.nominal ||
    Math.round((mustahikNominal * mustahik.daerah.persen) / 100);

  const amilKelompokNominal =
    amil.kelompok?.nominal ||
    Math.round((amilNominal * amil.kelompok.persen) / 100);
  const amilDesaNominal =
    amil.desa?.nominal || Math.round((amilNominal * amil.desa.persen) / 100);
  const amilDaerahNominal =
    amil.daerah?.nominal ||
    Math.round((amilNominal * amil.daerah.persen) / 100);

  // Update display
  const setDisplay = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setDisplay(
    "zakatRincianMustahik",
    `${mustahik.persen}% · ${fmtRp(mustahikNominal)}`,
  );
  setDisplay(
    "zakatRincianMustahikKelompok",
    `${mustahik.kelompok.persen}% · ${fmtRp(mustahikKelompokNominal)}`,
  );
  setDisplay(
    "zakatRincianMustahikDaerah",
    `${mustahik.daerah.persen}% · ${fmtRp(mustahikDaerahNominal)}`,
  );
  setDisplay(
    "zakatRincianSabilillah",
    `${sabilillah.persen}% · ${fmtRp(sabilillahNominal)}`,
  );
  setDisplay("zakatRincianAmil", `${amil.persen}% · ${fmtRp(amilNominal)}`);
  setDisplay(
    "zakatRincianAmilKelompok",
    `${amil.kelompok.persen}% · ${fmtRp(amilKelompokNominal)}`,
  );
  setDisplay(
    "zakatRincianAmilDesa",
    `${amil.desa.persen}% · ${fmtRp(amilDesaNominal)}`,
  );
  setDisplay(
    "zakatRincianAmilDaerah",
    `${amil.daerah.persen}% · ${fmtRp(amilDaerahNominal)}`,
  );

  // Update status
  const statusEl = document.getElementById("zakatRincianStatus");
  if (statusEl) {
    const isSaved = r.mustahik && r.mustahik.nominal > 0;
    statusEl.textContent = isSaved ? "✓ Tersimpan" : "● Belum disimpan";
    statusEl.className = "zakat-tab-status " + (isSaved ? "saved" : "unsaved");
  }
}

// Render Mustahik Tab (Mode Lihat - Tabel)
function renderZakatMustahikView(zakat) {
  const tbody = document.getElementById("zakatMustahikTableBody");
  const totalEl = document.getElementById("zakatMustahikTableTotal");
  const countEl = document.getElementById("zakatMustahikCountDisplay");
  const danaEl = document.getElementById("zakatMustahikDanaView");
  const tersalurkanEl = document.getElementById("zakatMustahikTersalurkan");
  const sisaEl = document.getElementById("zakatMustahikSisaView");
  const progressEl = document.getElementById("zakatMustahikProgressView");

  if (!tbody) return;

  const mustahik = zakat.mustahik || [];
  const total = mustahik.reduce((sum, m) => sum + (m.nominal || 0), 0);

  // Hitung dana mustahik
  const r = zakat.rincian || {};
  const mustahikData = r.mustahik || {
    persen: 45,
    nominal: 0,
    kelompok: { persen: 80, nominal: 0 },
  };
  const danaMustahik = mustahikData.nominal || 0;
  const sisa = Math.max(0, danaMustahik - total);
  const progress = danaMustahik > 0 ? (total / danaMustahik) * 100 : 0;

  // Update info bar
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
    progressEl.style.width = Math.min(100, progress) + "%";
    progressEl.style.background =
      progress >= 100 ? "var(--pos)" : "var(--brand)";
  }

  // Update count
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
    .map(
      (m, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(m.nama || "-")}</td>
      <td class="text-right mono">${fmtRp(m.nominal || 0)}</td>
    </tr>
  `,
    )
    .join("");

  if (totalEl) totalEl.textContent = fmtRp(total);
}

// ============================================================
// ZAKAT - BOTTOM SHEET HANDLERS
// ============================================================

// ============================================================
// 1. MUZAKI SHEET
// ============================================================

function openZakatMuzakiSheet() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const overlay = document.getElementById("zakatMuzakiSheet");
  if (!overlay) return;

  // Isi data ke sheet
  const muzakiList = zakat.muzaki || [];
  const count = Math.max(muzakiList.length || 1, 1);

  document.getElementById("zakatMuzakiSheetCount").value = count;
  renderMuzakiSheetRows(zakat);
  updateMuzakiSheetTotal(zakat);

  overlay.classList.remove("hidden");
}

function closeZakatMuzakiSheet() {
  const overlay = document.getElementById("zakatMuzakiSheet");
  if (overlay) overlay.classList.add("hidden");
}

function renderMuzakiSheetRows(zakat) {
  const container = document.getElementById("zakatMuzakiSheetList");
  const countInput = document.getElementById("zakatMuzakiSheetCount");
  if (!container || !countInput) return;

  const muzakiList = zakat.muzaki || [];
  const currentCount = parseInt(countInput.value) || 1;
  const allNames = getAllMuzakiNames();

  let rows = [];
  for (let i = 0; i < currentCount; i++) {
    const existing = muzakiList[i] || { nama: "", nominal: 0 };
    rows.push(`
      <div class="zakat-muzaki-row" data-sheet-index="${i}">
        <div class="zakat-name-wrapper" style="position:relative;flex:1;">
          <input type="text" class="field-input zakat-muzaki-sheet-name" 
                 placeholder="Nama Muzaki ${i + 1}" 
                 value="${escapeHtml(existing.nama || "")}" 
                 data-index="${i}"
                 list="sheet-suggest-muzaki-${i}"
                 autocomplete="off"
                 style="width:100%;">
          <datalist id="sheet-suggest-muzaki-${i}">
            ${allNames
              .filter((n) => {
                const lower = n.toLowerCase().trim();
                return !muzakiList.some(
                  (m) =>
                    m.nama &&
                    m.nama.toLowerCase().trim() === lower &&
                    m !== existing,
                );
              })
              .map((n) => `<option value="${escapeHtml(n)}">`)
              .join("")}
          </datalist>
        </div>
        <input type="number" class="field-input zakat-muzaki-sheet-nominal" 
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
  container.querySelectorAll(".zakat-muzaki-sheet-nominal").forEach((input) => {
    input.addEventListener("input", () => updateMuzakiSheetTotal(zakat));
  });
}

function updateMuzakiSheetTotal(zakat) {
  const container = document.getElementById("zakatMuzakiSheetList");
  const totalEl = document.getElementById("zakatMuzakiSheetTotal");
  if (!container || !totalEl) return;

  let total = 0;
  container.querySelectorAll(".zakat-muzaki-sheet-nominal").forEach((input) => {
    total += Number(input.value) || 0;
  });
  totalEl.textContent = fmtRp(total);
}

// Submit Muzaki Sheet
async function submitZakatMuzakiSheet() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const container = document.getElementById("zakatMuzakiSheetList");
  const btn = document.getElementById("zakatMuzakiSheetSubmit");

  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    const rows = container.querySelectorAll(".zakat-muzaki-row");
    const newMuzaki = [];
    let hasDuplicate = false;
    const names = [];
    let total = 0;

    rows.forEach((row) => {
      const nameInput = row.querySelector(".zakat-muzaki-sheet-name");
      const nominalInput = row.querySelector(".zakat-muzaki-sheet-nominal");

      const name = nameInput ? nameInput.value.trim() : "";
      const nominal = nominalInput ? Number(nominalInput.value) || 0 : 0;
      total += nominal;

      if (name) {
        const key = name.toLowerCase().trim();
        if (names.includes(key)) {
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

    // Update zakat
    zakat.muzaki = newMuzaki;
    zakat.total = total;
    zakat.updatedAt = new Date().toISOString();

    const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    // Kirim ke backend
    showZakatLoader("Menyimpan data muzaki...");
    const result = await apiUpdateZakatMuzaki({
      id: zakat.id,
      muzaki: zakat.muzaki,
      total: zakat.total,
    });

    if (result.success) {
      showToast("Muzaki berhasil disimpan!", "success");
    } else {
      showToast("Muzaki disimpan (offline mode)", "warning");
    }

    // Refresh view
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
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const overlay = document.getElementById("zakatRincianSheet");
  if (!overlay) return;

  // Isi data ke sheet
  const r = zakat.rincian || {};
  const mustahik = r.mustahik || {
    persen: 45,
    kelompok: { persen: 80 },
    daerah: { persen: 20 },
  };
  const sabilillah = r.sabilillah || { persen: 40 };
  const amil = r.amil || {
    persen: 15,
    kelompok: { persen: 12 },
    desa: { persen: 2 },
    daerah: { persen: 1 },
  };

  // Set value ke input (gunakan ID dengan suffix Sheet)
  document.getElementById("zakatPersenMustahikSheet").value =
    mustahik.persen || 45;
  document.getElementById("zakatPersenMustahikKelompokSheet").value =
    mustahik.kelompok?.persen || 80;
  document.getElementById("zakatPersenMustahikDaerahSheet").value =
    mustahik.daerah?.persen || 20;
  document.getElementById("zakatPersenSabilillahSheet").value =
    sabilillah.persen || 40;
  document.getElementById("zakatPersenAmilSheet").value = amil.persen || 15;
  document.getElementById("zakatPersenAmilKelompokSheet").value =
    amil.kelompok?.persen || 12;
  document.getElementById("zakatPersenAmilDesaSheet").value =
    amil.desa?.persen || 2;
  document.getElementById("zakatPersenAmilDaerahSheet").value =
    amil.daerah?.persen || 1;

  updateRincianSheet(zakat);

  overlay.classList.remove("hidden");
}

function closeZakatRincianSheet() {
  const overlay = document.getElementById("zakatRincianSheet");
  if (overlay) overlay.classList.add("hidden");
}

function updateRincianSheet(zakat) {
  const totalZakat = zakat.total || 0;

  const getVal = (id) => Number(document.getElementById(id)?.value || 0);

  const pMustahik = getVal("zakatPersenMustahikSheet");
  const pSabilillah = getVal("zakatPersenSabilillahSheet");
  const pAmil = getVal("zakatPersenAmilSheet");

  const pKelompok = getVal("zakatPersenMustahikKelompokSheet");
  const pDaerah = getVal("zakatPersenMustahikDaerahSheet");
  const pAmilKelompok = getVal("zakatPersenAmilKelompokSheet");
  const pAmilDesa = getVal("zakatPersenAmilDesaSheet");
  const pAmilDaerah = getVal("zakatPersenAmilDaerahSheet");

  // Validasi Mustahik sub-total
  const mustahikSub = pKelompok + pDaerah;
  const mustahikSubEl = document.getElementById("zakatMustahikSubTotalSheet");
  if (mustahikSubEl) {
    mustahikSubEl.textContent = `Subtotal: ${pKelompok}% + ${pDaerah}% = ${mustahikSub}%`;
    mustahikSubEl.className =
      "zakat-rincian-sub-total " + (mustahikSub === 100 ? "valid" : "invalid");
  }

  // Validasi Amil sub-total
  const amilSub = pAmilKelompok + pAmilDesa + pAmilDaerah;
  const amilSubEl = document.getElementById("zakatAmilSubTotalSheet");
  if (amilSubEl) {
    amilSubEl.textContent = `Subtotal: ${pAmilKelompok}% + ${pAmilDesa}% + ${pAmilDaerah}% = ${amilSub}%`;
    amilSubEl.className =
      "zakat-rincian-sub-total " + (amilSub === pAmil ? "valid" : "invalid");
  }

  // Total persentase
  const totalPersen = pMustahik + pSabilillah + pAmil;
  const totalEl = document.getElementById("zakatTotalPersenSheet");
  if (totalEl) {
    totalEl.textContent = totalPersen;
    totalEl.style.color = totalPersen === 100 ? "var(--pos)" : "var(--neg)";
  }

  // Total nominal
  const nominalEl = document.getElementById("zakatTotalNominalSheet");
  if (nominalEl) {
    if (totalPersen === 100) {
      const totalNominal =
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
}

async function submitZakatRincianSheet() {
  const zakat = getZakatById(state.zakat.currentId);
  if (!zakat) {
    showToast("Zakat tidak ditemukan.", "error");
    return;
  }

  const getVal = (id) => Number(document.getElementById(id)?.value || 0);

  const mustahikPersen = getVal("zakatPersenMustahikSheet");
  const sabilillahPersen = getVal("zakatPersenSabilillahSheet");
  const amilPersen = getVal("zakatPersenAmilSheet");

  // Validasi total = 100%
  if (mustahikPersen + sabilillahPersen + amilPersen !== 100) {
    showToast("Total persentase harus 100%!", "error");
    return;
  }

  const mustahikKelompokPersen = getVal("zakatPersenMustahikKelompokSheet");
  const mustahikDaerahPersen = getVal("zakatPersenMustahikDaerahSheet");
  if (mustahikKelompokPersen + mustahikDaerahPersen !== 100) {
    showToast("Mustahik Kelompok + Daerah harus 100%!", "error");
    return;
  }

  const amilKelompokPersen = getVal("zakatPersenAmilKelompokSheet");
  const amilDesaPersen = getVal("zakatPersenAmilDesaSheet");
  const amilDaerahPersen = getVal("zakatPersenAmilDaerahSheet");
  if (amilKelompokPersen + amilDesaPersen + amilDaerahPersen !== amilPersen) {
    showToast(
      "Amil Kelompok + Desa + Daerah harus sama dengan persentase Amil!",
      "error",
    );
    return;
  }

  const btn = document.getElementById("zakatRincianSheetSubmit");
  showZakatButtonLoading(btn, "Menyimpan...");

  try {
    const totalZakat = zakat.total || 0;

    // Hitung nominal
    const mustahikNominal = Math.round((totalZakat * mustahikPersen) / 100);
    const sabilillahNominal = Math.round((totalZakat * sabilillahPersen) / 100);
    const amilNominal = Math.round((totalZakat * amilPersen) / 100);

    const mustahikKelompokNominal = Math.round(
      (mustahikNominal * mustahikKelompokPersen) / 100,
    );
    const mustahikDaerahNominal = Math.round(
      (mustahikNominal * mustahikDaerahPersen) / 100,
    );

    const amilKelompokNominal = Math.round(
      (amilNominal * amilKelompokPersen) / 100,
    );
    const amilDesaNominal = Math.round((amilNominal * amilDesaPersen) / 100);
    const amilDaerahNominal = Math.round(
      (amilNominal * amilDaerahPersen) / 100,
    );

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

    const idx = state.zakat.list.findIndex((z) => z.id === zakat.id);
    if (idx !== -1) {
      state.zakat.list[idx] = zakat;
      saveZakatData(state.zakat.list);
    }

    showZakatLoader("Menyimpan rincian zakat...");
    const result = await apiUpdateZakatRincian({
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
// ZAKAT - EVENT LISTENERS (TAMBAHAN)
// ============================================================

// Tombol Edit Muzaki
document
  .getElementById("zakatMuzakiEdit")
  ?.addEventListener("click", function () {
    openZakatMuzakiSheet();
  });

// Tombol Edit Rincian
document
  .getElementById("zakatRincianEdit")
  ?.addEventListener("click", function () {
    openZakatRincianSheet();
  });

// Tombol Edit Mustahik
document
  .getElementById("zakatMustahikEdit")
  ?.addEventListener("click", function () {
    // Buka sheet mustahik (implementasi serupa)
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
    const zakat = getZakatById(state.zakat.currentId);
    if (zakat) {
      const newCount = parseInt(this.value) || 1;
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

// Close on overlay click
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

// Event listener untuk update real-time rincian sheet
const rincianSheetInputs = [
  "zakatPersenMustahikSheet",
  "zakatPersenMustahikKelompokSheet",
  "zakatPersenMustahikDaerahSheet",
  "zakatPersenSabilillahSheet",
  "zakatPersenAmilSheet",
  "zakatPersenAmilKelompokSheet",
  "zakatPersenAmilDesaSheet",
  "zakatPersenAmilDaerahSheet",
];

rincianSheetInputs.forEach((id) => {
  document.getElementById(id)?.addEventListener("input", function () {
    const zakat = getZakatById(state.zakat.currentId);
    if (zakat) {
      updateRincianSheet(zakat);
    }
  });
});

// Set Default buttons di sheet
document
  .querySelectorAll("#zakatRincianSheet .zakat-default-btn")
  .forEach((btn) => {
    btn.addEventListener("click", function () {
      const target = this.dataset.target;
      const defaults = {
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

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };

      if (target === "mustahik") {
        setVal("zakatPersenMustahikSheet", defaults.mustahik.persen);
        setVal(
          "zakatPersenMustahikKelompokSheet",
          defaults.mustahik.kelompok.persen,
        );
        setVal(
          "zakatPersenMustahikDaerahSheet",
          defaults.mustahik.daerah.persen,
        );
      } else if (target === "sabilillah") {
        setVal("zakatPersenSabilillahSheet", defaults.sabilillah.persen);
      } else if (target === "amil") {
        setVal("zakatPersenAmilSheet", defaults.amil.persen);
        setVal("zakatPersenAmilKelompokSheet", defaults.amil.kelompok.persen);
        setVal("zakatPersenAmilDesaSheet", defaults.amil.desa.persen);
        setVal("zakatPersenAmilDaerahSheet", defaults.amil.daerah.persen);
      }

      const zakat = getZakatById(state.zakat.currentId);
      if (zakat) {
        updateRincianSheet(zakat);
      }
      showToast("Default diterapkan!", "info");
    });
  });

// Close on overlay click
document
  .getElementById("zakatRincianSheet")
  ?.addEventListener("click", function (e) {
    if (e.target === this) {
      closeZakatRincianSheet();
    }
  });

// ============================================================
// ZAKAT DATE PICKER - STATE
// ============================================================

let zakatDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

let zakatEditDatePickerState = {
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  selectedDate: null,
};

// ============================================================
// INIT ZAKAT DATE PICKER - PASTIKAN ELEMEN ADA
// ============================================================

function initZakatDatePicker() {
  console.log("🔄 initZakatDatePicker dipanggil");

  // ============================================================
  // FORM CREATE - ZAKAT DATE PICKER
  // ============================================================
  const dropdown = document.getElementById("zakatDateDropdown");
  const trigger = document.getElementById("zakatDateDropdownTrigger");
  const valueDisplay = document.getElementById("zakatDateDropdownValue");
  const menu = document.getElementById("zakatDateDropdownMenu");
  const hiddenInput = document.getElementById("zakatFormTanggal");

  // CEK ELEMEN DENGAN LEBIH DETAIL
  console.log("🔍 Zakat Date elements:", {
    dropdown: !!dropdown,
    trigger: !!trigger,
    valueDisplay: !!valueDisplay,
    menu: !!menu,
    hiddenInput: !!hiddenInput,
  });

  if (dropdown && trigger && valueDisplay && menu && hiddenInput) {
    console.log("✅ Zakat Date picker element ditemukan");

    // Set default date
    const today = new Date();
    valueDisplay.textContent = formatDateDisplay(today);
    hiddenInput.value = formatDateInput(today);
    zakatDatePickerState.selectedDate = today;
    zakatDatePickerState.currentMonth = today.getMonth();
    zakatDatePickerState.currentYear = today.getFullYear();

    // Render menu awal
    renderZakatDatePickerMenu(
      dropdown,
      menu,
      valueDisplay,
      hiddenInput,
      zakatDatePickerState,
    );

    // Hapus event listener lama untuk menghindari duplikasi
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    const newTriggerElement = document.getElementById(
      "zakatDateDropdownTrigger",
    );
    if (newTriggerElement) {
      newTriggerElement.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log("🔔 Zakat Date trigger clicked");
        const dd = document.getElementById("zakatDateDropdown");
        const isOpen = dd.classList.contains("open");

        // Tutup semua dropdown lain
        document
          .querySelectorAll(".filter-dropdown.open")
          .forEach(function (el) {
            if (el.id !== dd.id) {
              el.classList.remove("open");
              el.querySelector(".filter-dropdown-trigger")?.setAttribute(
                "aria-expanded",
                "false",
              );
            }
          });

        if (isOpen) {
          dd.classList.remove("open");
          this.setAttribute("aria-expanded", "false");
          removeZakatDatePickerBackdrop();
        } else {
          dd.classList.add("open");
          this.setAttribute("aria-expanded", "true");

          // Re-render menu
          const m = document.getElementById("zakatDateDropdownMenu");
          const vd = document.getElementById("zakatDateDropdownValue");
          const hi = document.getElementById("zakatFormTanggal");
          if (m) {
            renderZakatDatePickerMenu(dd, m, vd, hi, zakatDatePickerState);
          }

          setTimeout(function () {
            const manualInput = m?.querySelector(".date-picker-manual-input");
            if (manualInput) {
              manualInput.focus();
              manualInput.select();
            }
          }, 100);

          if (window.innerWidth <= 480) {
            addZakatDatePickerBackdrop(dd);
          }
        }
      });
    }

    // Close on outside click
    document.addEventListener("click", function (e) {
      const dd = document.getElementById("zakatDateDropdown");
      if (dd && !dd.contains(e.target)) {
        dd.classList.remove("open");
        const trig = document.getElementById("zakatDateDropdownTrigger");
        if (trig) trig.setAttribute("aria-expanded", "false");
        removeZakatDatePickerBackdrop();
      }
    });
  } else {
    console.warn("⚠️ Zakat Date picker element tidak ditemukan");
  }

  // ============================================================
  // FORM EDIT - ZAKAT EDIT DATE PICKER
  // ============================================================
  const editDropdown = document.getElementById("zakatEditDateDropdown");
  const editTrigger = document.getElementById("zakatEditDateDropdownTrigger");
  const editValueDisplay = document.getElementById(
    "zakatEditDateDropdownValue",
  );
  const editMenu = document.getElementById("zakatEditDateDropdownMenu");
  const editHiddenInput = document.getElementById("zakatEditHeaderTanggal");

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

    const today = new Date();
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

    // Clone trigger untuk menghindari duplikasi event
    const newEditTrigger = editTrigger.cloneNode(true);
    editTrigger.parentNode.replaceChild(newEditTrigger, editTrigger);

    const newEditTriggerElement = document.getElementById(
      "zakatEditDateDropdownTrigger",
    );
    if (newEditTriggerElement) {
      newEditTriggerElement.addEventListener("click", function (e) {
        e.stopPropagation();
        console.log("🔔 Zakat Edit Date trigger clicked");
        const dd = document.getElementById("zakatEditDateDropdown");
        const isOpen = dd.classList.contains("open");

        document
          .querySelectorAll(".filter-dropdown.open")
          .forEach(function (el) {
            if (el.id !== dd.id) {
              el.classList.remove("open");
              el.querySelector(".filter-dropdown-trigger")?.setAttribute(
                "aria-expanded",
                "false",
              );
            }
          });

        if (isOpen) {
          dd.classList.remove("open");
          this.setAttribute("aria-expanded", "false");
          removeZakatDatePickerBackdrop();
        } else {
          dd.classList.add("open");
          this.setAttribute("aria-expanded", "true");

          const m = document.getElementById("zakatEditDateDropdownMenu");
          const vd = document.getElementById("zakatEditDateDropdownValue");
          const hi = document.getElementById("zakatEditHeaderTanggal");
          if (m) {
            renderZakatDatePickerMenu(dd, m, vd, hi, zakatEditDatePickerState);
          }

          setTimeout(function () {
            const manualInput = m?.querySelector(".date-picker-manual-input");
            if (manualInput) {
              manualInput.focus();
              manualInput.select();
            }
          }, 100);

          if (window.innerWidth <= 480) {
            addZakatDatePickerBackdrop(dd);
          }
        }
      });
    }

    document.addEventListener("click", function (e) {
      const dd = document.getElementById("zakatEditDateDropdown");
      if (dd && !dd.contains(e.target)) {
        dd.classList.remove("open");
        const trig = document.getElementById("zakatEditDateDropdownTrigger");
        if (trig) trig.setAttribute("aria-expanded", "false");
        removeZakatDatePickerBackdrop();
      }
    });
  } else {
    console.warn("⚠️ Zakat Edit Date picker element tidak ditemukan");
  }
}

// ============================================================
// TOGGLE HANDLERS
// ============================================================

function zakatDateToggleHandler(e) {
  e.stopPropagation();
  const dropdown = this._dropdown;
  const menu = this._menu;
  const valueDisplay = this._valueDisplay;
  const hiddenInput = this._hiddenInput;
  const state = this._state;

  if (!dropdown) return;

  const isOpen = dropdown.classList.contains("open");

  // Tutup semua dropdown lain
  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    this.setAttribute("aria-expanded", "false");
    removeZakatDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    this.setAttribute("aria-expanded", "true");

    // Re-render menu
    if (menu) {
      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        state,
      );
    }

    setTimeout(function () {
      const manualInput = menu?.querySelector(".date-picker-manual-input");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 100);

    if (window.innerWidth <= 480) {
      addZakatDatePickerBackdrop(dropdown);
    }
  }
}

function zakatEditDateToggleHandler(e) {
  e.stopPropagation();
  const dropdown = this._dropdown;
  const menu = this._menu;
  const valueDisplay = this._valueDisplay;
  const hiddenInput = this._hiddenInput;
  const state = this._state;

  if (!dropdown) return;

  const isOpen = dropdown.classList.contains("open");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    this.setAttribute("aria-expanded", "false");
    removeZakatDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    this.setAttribute("aria-expanded", "true");

    if (menu) {
      renderZakatDatePickerMenu(
        dropdown,
        menu,
        valueDisplay,
        hiddenInput,
        state,
      );
    }

    setTimeout(function () {
      const manualInput = menu?.querySelector(".date-picker-manual-input");
      if (manualInput) {
        manualInput.focus();
        manualInput.select();
      }
    }, 100);

    if (window.innerWidth <= 480) {
      addZakatDatePickerBackdrop(dropdown);
    }
  }
}

// ============================================================
// CLOSE ZAKAT DATE PICKER
// ============================================================

function closeZakatDatePicker(dropdown) {
  if (!dropdown) return;
  dropdown.classList.remove("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
  }
  removeZakatDatePickerBackdrop();
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

// ============================================================
// RENDER ZAKAT DATE PICKER MENU
// ============================================================

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
  const isOpen = dropdown.classList.contains("open");
  const trigger = dropdown.querySelector(".filter-dropdown-trigger");

  document.querySelectorAll(".filter-dropdown.open").forEach(function (el) {
    if (el.id !== dropdown.id) {
      el.classList.remove("open");
      el.querySelector(".filter-dropdown-trigger")?.setAttribute(
        "aria-expanded",
        "false",
      );
    }
  });

  if (isOpen) {
    dropdown.classList.remove("open");
    trigger?.setAttribute("aria-expanded", "false");
    removeZakatDatePickerBackdrop();
  } else {
    dropdown.classList.add("open");
    trigger?.setAttribute("aria-expanded", "true");

    const menu = dropdown.querySelector(".filter-dropdown-menu");
    const valueDisplay = dropdown.parentElement?.querySelector(
      ".filter-dropdown-value",
    );
    const hiddenInput = dropdown.parentElement?.querySelector(
      'input[type="hidden"]',
    );

    if (menu) {
      const state =
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

    // ✅ TAMBAHKAN INI
    adjustDatePickerPosition(dropdown);

    setTimeout(function () {
      const manualInput = dropdown.querySelector(".date-picker-manual-input");
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

// ============================================================
// ZAKAT - UPDATE LAST SYNC (Tambahan)
// ============================================================

// Modifikasi refreshAllDataWithShodaqoh untuk include zakat
// Cari fungsi refreshAllDataWithShodaqoh dan tambahkan:

// async function refreshAllDataWithShodaqoh() {
//   try {
//     await refreshAllData();
//     if (state.shodaqoh.loaded || state.activeTab === "shodaqoh") {
//       const monthKey = state.shodaqoh.selectedMonth || "";
//       await loadShodaqohData(monthKey);
//     }
//     // TAMBAHKAN INI:
//     await loadZakatData();
//     updateLastSyncTime();
//   } catch (err) {
//     console.error(err);
//     showToast("Gagal refresh data: " + err.message, "error");
//   }
// }
