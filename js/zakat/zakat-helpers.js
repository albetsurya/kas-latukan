function toSafeNumber(value, fallback) {
  fallback = fallback || 0;

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
    var url = CONFIG.WEB_APP_URL + "?action=getZakatList";
    var res = await fetch(url);
    if (!res.ok) {
      return { success: false, data: [], message: "HTTP " + res.status };
    }
    var data = await res.json();

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

function getExistingMustahikNames() {
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
    const session = getSession();
    const payload = {
      action: "completeZakat",
      token: session?.token || "",
      id: data.id,
    };
    return await apiPost(payload);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function apiCancelCompleteZakat(data) {
  try {
    const session = getSession();
    const payload = {
      action: "cancelCompleteZakat",
      token: session?.token || "",
      id: data.id,
    };
    return await apiPost(payload);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function apiDeleteZakatMuzaki(data) {
  try {
    const session = getSession();
    const payload = {
      action: "deleteZakatMuzaki",
      token: session?.token || "",
      zakatId: data.zakatId,
      muzakiId: data.muzakiId,
    };
    return await apiPost(payload);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function apiDeleteZakatMustahik(data) {
  try {
    const session = getSession();
    const payload = {
      action: "deleteZakatMustahik",
      token: session?.token || "",
      zakatId: data.zakatId,
      mustahikId: data.mustahikId,
    };
    return await apiPost(payload);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function apiGetMasters() {
  try {
    const url = CONFIG.WEB_APP_URL + "?action=getMasters";
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

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
  const session = getSession();
  const payload = {
    action: "addMasterMuzaki",
    token: session?.token || "",
    nama: nama,
  };
  return apiPost(payload);
}

async function apiAddMasterMustahik(nama) {
  const session = getSession();
  const payload = {
    action: "addMasterMustahik",
    token: session?.token || "",
    nama: nama,
  };
  return apiPost(payload);
}

async function apiDeleteMasterMuzaki(id) {
  const session = getSession();
  const payload = {
    action: "deleteMasterMuzaki",
    token: session?.token || "",
    id: id,
  };
  return apiPost(payload);
}

async function apiDeleteMasterMustahik(id) {
  const session = getSession();
  const payload = {
    action: "deleteMasterMustahik",
    token: session?.token || "",
    id: id,
  };
  return apiPost(payload);
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
