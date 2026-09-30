/**
 * Helper kanonis zakat (definisi tunggal — dipakai zakat.js & zakat-sheet.js).
 * Atribut: snake_case English; input lama tetap dibaca via fallback.
 */
function normalizeZakatType(jenis) {
  var s = String(jenis || "").trim().toUpperCase();
  if (!s) return "";
  var map = {
    FITRAH: "ZAKAT FITRAH",
    MAAL: "ZAKAT MAAL",
    TIJAROH: "ZAKAT TIJAROH",
    "ZAKAT FITRAH": "ZAKAT FITRAH",
    "ZAKAT MAAL": "ZAKAT MAAL",
    "ZAKAT TIJAROH": "ZAKAT TIJAROH",
    "ZAKAT ZURU'": "ZAKAT ZURU'",
    "ZAKAT TERNAK": "ZAKAT TERNAK",
    ZURU: "ZAKAT ZURU'",
    TERNAK: "ZAKAT TERNAK",
  };
  return map[s] || s;
}

function getZakatTypeLabel(jenis) {
  var n = normalizeZakatType(jenis);
  return n ? n.replace(/^ZAKAT\s+/, "") : "-";
}

/** Normalisasi kode jenis untuk grouping UI (FITRAH/MAAL/.../LAINNYA). */
function normalizeJenisZakat(jenis) {
  var j = String(jenis || "").toUpperCase().trim();
  if (typeof ZAKAT_JENIS_ORDER !== "undefined" && ZAKAT_JENIS_ORDER.indexOf(j) !== -1 && j !== "LAINNYA") return j;
  return "LAINNYA";
}

function getJenisZakatLabel(jenis) {
  if (typeof ZAKAT_JENIS_LABEL !== "undefined") return ZAKAT_JENIS_LABEL[jenis] || jenis;
  return jenis;
}

/** Parse nominal Rupiah Indonesia ("Rp1.500.000", "2.500.000,50", 1500000). */
function parseRupiah(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  var s = String(value).replace(/ /g, " ").trim();
  if (!s || s === "-" || /^Rp\s*-?$/.test(s)) return 0;
  s = s.replace(/^Rp\s*/i, "").trim();
  if (s.indexOf(",") !== -1) {
    s = s.replace(/\./g, "").replace(/ /g, "").replace(",", ".");
    s = s.replace(/[^0-9.\-]/g, "");
  } else {
    s = s.replace(/[.,\s]/g, "").replace(/[^0-9\-]/g, "");
  }
  var num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

/** Format angka ke "1.500.000" untuk tampil di input saat ketik. */
function formatRupiahInput(value) {
  var n = Math.floor(Math.abs(parseRupiah(value)));
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Separator ribuan live untuk input nominal (sekali bind, delegated). */
function bindRupiahInputs_() {
  if (window.__zakatRupiahBound) return;
  window.__zakatRupiahBound = true;
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t || !t.classList || !t.classList.contains("zakat-rupiah-input")) return;
    var digits = String(t.value || "").replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
    if (!digits) {
      t.value = "";
      return;
    }
    t.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindRupiahInputs_);
} else {
  bindRupiahInputs_();
}

/** Normalisasi satu baris muzakki (kanonis + alias baca). */
function canonMuzakki(m) {
  m = m || {};
  return {
    muzakki_id: m.muzakki_id || m.muzakiId || m.id || "",
    muzakki_name: m.muzakki_name || m.nama || "",
    amount: parseRupiah(m.amount !== undefined ? m.amount : m.nominal),
    zakat_type: normalizeZakatType(m.zakat_type || m.jenis_zakat),
    soul_count: Math.max(0, Math.floor(Number(m.soul_count !== undefined ? m.soul_count : m.jumlah_anggota_keluarga) || 0)),
  };
}

function canonMustahik(m) {
  m = m || {};
  return {
    mustahik_id: m.mustahik_id || m.mustahikId || m.id || "",
    mustahik_name: m.mustahik_name || m.nama || "",
    amount: parseRupiah(m.amount !== undefined ? m.amount : m.nominal),
    zakat_type: normalizeZakatType(m.zakat_type || m.jenis_zakat),
    category: m.category || m.kategori || "",
    sub_category: m.sub_category || m.sub_kategori || "",
  };
}

function toSafeNumber(value, fallback) {  fallback = fallback || 0;

  // Kosong / null / undefined
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  // Sudah number dan valid
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    // Guard tambahan: tolak angka absurd besar (kemungkinan hasil parsing tanggal)
    if (Math.abs(value) > 1e12) {
      console.warn(
        "⚠️ toSafeNumber: nilai mencurigakan (kemungkinan timestamp):",
        value,
      );
      return fallback;
    }
    return value;
  }

  // Jika berupa objek Date (misal hasil JSON.parse dari GAS)
  if (value instanceof Date) {
    console.warn("⚠️ toSafeNumber: menerima objek Date, bukan angka:", value);
    return fallback;
  }

  // String yang menyerupai format tanggal (dd/mm/yyyy atau yyyy-mm-dd, dll)
  if (typeof value === "string") {
    var looksLikeDate =
      /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.trim()) ||
      /^\d{4}-\d{2}-\d{2}/.test(value.trim());
    if (looksLikeDate) {
      console.warn(
        "⚠️ toSafeNumber: string tanggal terdeteksi di field nominal:",
        value,
      );
      return fallback;
    }

    var parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
}

// Sanitasi seluruh struktur rincian zakat sekaligus
function sanitizeZakatRincian(rincian) {
  if (!rincian || typeof rincian !== "object") return rincian;

  var safeGroup = function (group) {
    if (!group || typeof group !== "object") return group;
    group.nominal = toSafeNumber(group.nominal);
    group.persen = toSafeNumber(group.persen);
    if (group.kelompok) {
      group.kelompok.nominal = toSafeNumber(group.kelompok.nominal);
      group.kelompok.persen = toSafeNumber(group.kelompok.persen);
    }
    if (group.daerah) {
      group.daerah.nominal = toSafeNumber(group.daerah.nominal);
      group.daerah.persen = toSafeNumber(group.daerah.persen);
    }
    if (group.desa) {
      group.desa.nominal = toSafeNumber(group.desa.nominal);
      group.desa.persen = toSafeNumber(group.desa.persen);
    }
    return group;
  };

  rincian.mustahik = safeGroup(rincian.mustahik);
  rincian.sabilillah = safeGroup(rincian.sabilillah);
  rincian.amil = safeGroup(rincian.amil);

  return rincian;
}

async function apiGetZakatList() {
  try {
    var data = await apiRest("GET", "api/zakat/list");

    var rawList = null;
    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && data.success === true) {
      rawList = Array.isArray(data.data) ? data.data : [];
    }

    if (rawList) {
      // ✅ Sanitasi setiap item sebelum dipakai
      var cleanList = rawList.map(function (zakat) {
        if (zakat.rincian) {
          zakat.rincian = sanitizeZakatRincian(zakat.rincian);
        }
        zakat.total = toSafeNumber(zakat.total);
        return zakat;
      });

      return {
        success: true,
        data: cleanList,
        message: (data && data.message) || "",
      };
    }

    return {
      success: false,
      data: [],
      message: (data && data.message) || "Gagal mengambil data",
    };
  } catch (e) {
    return {
      success: false,
      data: [],
      message: e.message || "Gagal mengambil data zakat",
    };
  }
}

async function apiGetZakatDetail(id) {
  return apiRest("GET", "api/zakat/detail", { id: id });
}

async function apiCreateZakat(data) {
  var d = data || {};
  return apiRest("POST", "api/zakat/manage", {
    action: "createZakat",
    title: d.title,
    notes: d.notes !== undefined ? d.notes : d.keterangan,
    transaction_date: d.transaction_date || d.tanggal,
    location: d.location !== undefined ? d.location : d.tempat,
    zakat_category: d.zakat_category || "FITRAH", // Add default category
    muzakki: (d.muzakki || d.muzaki || []).map(canonMuzakki),
    mustahik: (d.mustahik || []).map(canonMustahik),
  });
}

async function apiUpdateZakat(data) {
  var d = data || {};
  var payload = {
    action: "updateZakat",
    zakat_id: d.zakat_id || d.id,
    title: d.title,
    notes: d.notes !== undefined ? d.notes : d.keterangan,
    transaction_date: d.transaction_date || d.tanggal,
    location: d.location !== undefined ? d.location : d.tempat,
  };
  var muz = d.muzakki !== undefined ? d.muzakki : d.muzaki;
  if (muz !== undefined) payload.muzakki = muz.map(canonMuzakki);
  if (d.mustahik !== undefined) payload.mustahik = d.mustahik.map(canonMustahik);
  return apiRest("POST", "api/zakat/manage", payload);
}

async function apiDeleteZakat(id) {
  return apiRest("POST", "api/zakat/manage", {
    action: "deleteZakat",
    zakat_id: id && typeof id === "object" ? id.zakat_id || id.id : id,
  });
}

async function apiUpdateZakatHeader(data) {
  var d = data || {};
  return apiRest("POST", "api/zakat/manage", {
    action: "updateZakatHeader",
    zakat_id: d.zakat_id || d.id,
    title: d.title,
    notes: d.notes !== undefined ? d.notes : d.keterangan,
    transaction_date: d.transaction_date || d.tanggal,
    location: d.location !== undefined ? d.location : d.tempat,
  });
}

async function apiUpdateZakatMuzaki(data) {
  var d = data || {};
  var muz = d.muzakki !== undefined ? d.muzakki : d.muzaki;
  return apiRest("POST", "api/zakat/manage", {
    action: "updateZakatMuzaki",
    zakat_id: d.zakat_id || d.id,
    muzakki: (muz || []).map(canonMuzakki),
  });
}

async function apiUpdateZakatRincian(data) {
  var d = data || {};
  return apiRest("POST", "api/zakat/manage", {
    action: "updateZakatRincian",
    zakat_id: d.zakat_id || d.id,
  });
}

async function apiUpdateZakatMustahik(data) {
  var d = data || {};
  return apiRest("POST", "api/zakat/manage", {
    action: "updateZakatMustahik",
    zakat_id: d.zakat_id || d.id,
    mustahik: (d.mustahik || []).map(canonMustahik),
  });
}

function generateZakatId() {
  return (
    "ZK" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substring(2, 5).toUpperCase()
  );
}

function getZakatData() {
  try {
    var raw = localStorage.getItem(ZAKAT_STATE_KEY);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}
  return [];
}

// ✅ HANYA SATU FUNGSI saveZakatData
function saveZakatData(list) {
  try {
    if (!Array.isArray(list)) {
      return;
    }
    var cleanList = list.map(function (zakat) {
      if (zakat.muzaki) {
        zakat.muzaki = zakat.muzaki.filter(function (m) {
          return m._deleted !== true;
        });
      }
      if (zakat.mustahik) {
        zakat.mustahik = zakat.mustahik.filter(function (m) {
          return m._deleted !== true;
        });
      }
      return zakat;
    });
    localStorage.setItem(ZAKAT_STATE_KEY, JSON.stringify(cleanList));
    if (state.zakat) {
      state.zakat.list = cleanList;
    }
  } catch (e) {}
}

function getZakatById(id) {
  ensureZakatState();
  if (!state.zakat || !state.zakat.list) return null;
  for (var i = 0; i < state.zakat.list.length; i++) {
    if (state.zakat.list[i].id === id) {
      return state.zakat.list[i];
    }
  }
  return null;
}

function createZakatItem(data) {
  data = data || {};
  var newId = generateZakatId();
  var todayIso = new Date().toISOString();
  return {
    zakat_id: newId,
    id: newId,
    title: data.title || "Zakat Baru",
    notes: data.notes !== undefined ? data.notes : data.keterangan || "",
    transaction_date:
      data.transaction_date || data.tanggal || new Date().toISOString().slice(0, 10),
    tanggal: data.transaction_date || data.tanggal || new Date().toISOString().slice(0, 10),
    location: data.location !== undefined ? data.location : data.tempat || "",
    created_at: todayIso,
    createdAt: todayIso,
    updated_at: todayIso,
    updatedAt: todayIso,
    muzakki: [],
    muzaki: [],
    mustahik: [],
    total_amount: 0,
    total: 0,
    rincian: {
      fitrah: { total: 0, mustahik: { persen: 45, nominal: 0 }, sabilillah: { persen: 40, nominal: 0 }, amil: { persen: 15, nominal: 0 } },
      maal: { total: 0, mustahik: { persen: 45, nominal: 0 }, sabilillah: { persen: 40, nominal: 0 }, amil: { persen: 15, nominal: 0 } },
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
  if (state.zakat && state.zakat.list) {
    state.zakat.list.forEach(function (z) {
      if (z.muzaki && Array.isArray(z.muzaki)) {
        z.muzaki.forEach(function (m) {
          if (m.nama) {
            names.add(m.nama.trim());
          }
        });
      }
    });
  }
  return Array.from(names).sort();
}

function getAllMustahikNames() {
  const names = new Set();
  if (state.zakat && state.zakat.list) {
    state.zakat.list.forEach(function (z) {
      if (z.mustahik && Array.isArray(z.mustahik)) {
        z.mustahik.forEach(function (m) {
          if (m.nama) {
            names.add(m.nama.trim());
          }
        });
      }
    });
  }
  return Array.from(names).sort();
}

function getExistingMuzakiNames() {
  return getAllMuzakiNames();
}

function getExistingMustahikNames() {
  return getAllMustahikNames();
}

function getZakatStatusBadge(status) {
  var statusKey = status || "ACTIVE";
  var label = ZAKAT_STATUS_LABELS[statusKey] || statusKey;
  var className = ZAKAT_STATUS_CLASSES[statusKey] || "active";
  return {
    label: label,
    className: className,
    isCompleted: statusKey === "COMPLETED" || statusKey === "SELESAI",
    isActive: statusKey === "ACTIVE",
  };
}

function isZakatCompleted(zakat) {
  if (!zakat) return false;
  var status = zakat.status || "ACTIVE";
  return status === "COMPLETED" || status === "SELESAI";
}

function isZakatActive(zakat) {
  var status = zakat.status || "ACTIVE";
  return status === "ACTIVE";
}

function escapeHtml(text) {
  if (!text) return "";
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function apiCompleteZakat(data) {
  try {
    return await apiRest("POST", "api/zakat/manage", {
      action: "completeZakat",
      id: data.id,
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function apiCancelCompleteZakat(data) {
  try {
    return await apiRest("POST", "api/zakat/manage", {
      action: "cancelCompleteZakat",
      id: data.id,
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function apiDeleteZakatMuzaki(data) {
  try {
    return await apiRest("POST", "api/zakat/manage", {
      action: "deleteZakatMuzaki",
      zakatId: data.zakatId,
      muzakiId: data.muzakiId,
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function apiDeleteZakatMustahik(data) {
  try {
    return await apiRest("POST", "api/zakat/manage", {
      action: "deleteZakatMustahik",
      zakatId: data.zakatId,
      mustahikId: data.mustahikId,
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function apiGetMasters() {
  try {
    const data = await apiRest("GET", "api/zakat/masters");

    // Jika backend mengembalikan langsung { muzaki, mustahik } tanpa wrapper
    if (data && data.success === undefined && (data.muzaki || data.mustahik)) {
      return {
        success: true,
        data: {
          muzaki: data.muzaki || [],
          mustahik: data.mustahik || [],
        },
      };
    }

    // Format wrapper standar { success, data, message }
    return data;
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function apiAddMasterMuzaki(nama) {
  return apiRest("POST", "api/zakat/manage", {
    action: "addMasterMuzaki",
    nama: nama,
  });
}

async function apiAddMasterMustahik(nama) {
  return apiRest("POST", "api/zakat/manage", {
    action: "addMasterMustahik",
    nama: nama,
  });
}

async function apiDeleteMasterMuzaki(id) {
  return apiRest("POST", "api/zakat/manage", {
    action: "deleteMasterMuzaki",
    id: id,
  });
}

async function apiDeleteMasterMustahik(id) {
  return apiRest("POST", "api/zakat/manage", {
    action: "deleteMasterMustahik",
    id: id,
  });
}

var masterMuzakiCache = {};
var masterMustahikCache = {};

function getMasterMuzakiList() {
  if (state && state.masterMuzaki) {
    return state.masterMuzaki || [];
  }
  try {
    const stored = localStorage.getItem("master_muzaki");
    if (stored) {
      const parsed = JSON.parse(stored);
      state.masterMuzaki = parsed;
      return parsed;
    }
  } catch (e) {}
  return [];
}

function getMasterMustahikList() {
  if (state && state.masterMustahik) {
    return state.masterMustahik || [];
  }
  try {
    const stored = localStorage.getItem("master_mustahik");
    if (stored) {
      const parsed = JSON.parse(stored);
      state.masterMustahik = parsed;
      return parsed;
    }
  } catch (e) {}
  return [];
}

function getMasterMuzakiById(id) {
  if (masterMuzakiCache[id]) return masterMuzakiCache[id];
  var list = getMasterMuzakiList();
  var found = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      found = list[i];
      break;
    }
  }
  masterMuzakiCache[id] = found;
  return found;
}

function getMasterMuzakiByName(name) {
  if (!name) return null;

  if (!state.masterMuzaki || state.masterMuzaki.length === 0) {
    var stored = localStorage.getItem("master_muzaki");
    if (stored) {
      try {
        state.masterMuzaki = JSON.parse(stored);
      } catch (e) {}
    }
  }

  var list = state.masterMuzaki || [];
  var searchName = name.toLowerCase().trim();
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (item.nama && item.nama.toLowerCase().trim() === searchName) {
      return item;
    }
  }
  return null;
}

function getMasterMustahikById(id) {
  if (masterMustahikCache[id]) return masterMustahikCache[id];
  var list = getMasterMustahikList();
  var found = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      found = list[i];
      break;
    }
  }
  masterMustahikCache[id] = found;
  return found;
}

function getMasterMustahikByName(name) {
  if (!name) return null;

  if (!state.masterMustahik || state.masterMustahik.length === 0) {
    var stored = localStorage.getItem("master_mustahik");
    if (stored) {
      try {
        state.masterMustahik = JSON.parse(stored);
      } catch (e) {}
    }
  }

  var list = state.masterMustahik || [];
  var searchName = name.toLowerCase().trim();
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (item.nama && item.nama.toLowerCase().trim() === searchName) {
      return item;
    }
  }
  return null;
}

// ✅ TAMBAHKAN FUNGSI INI
function ensureZakatState() {
  if (!state.zakat) {
    state.zakat = {
      list: [],
      currentId: null,
      isViewOpen: false,
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
