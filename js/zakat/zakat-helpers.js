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

    if (data && typeof data === "object") {
      if (data.success === true) {
        return {
          success: true,
          data: Array.isArray(data.data) ? data.data : [],
          message: data.message || "",
        };
      }

      return {
        success: false,
        data: [],
        message: data.message || "Gagal mengambil data",
      };
    }

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
// ZAKAT - HELPERS
// ============================================================

const ZAKAT_STATE_KEY = "zakat_data";

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
  if (state.zakat) {
    state.zakat.list = list;
  }
}

function getZakatById(id) {
  if (!state.zakat || !state.zakat.list) return null;
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

// ============================================================
// ZAKAT - GET NAMES (DARI SUGGESTIONS + EXISTING DATA)
// ============================================================

function getAllMuzakiNames() {
  const names = new Set();

  // Tambahkan dari suggestions
  if (typeof ZAKAT_SUGGESTIONS !== "undefined" && ZAKAT_SUGGESTIONS.muzaki) {
    ZAKAT_SUGGESTIONS.muzaki.forEach(function (n) {
      names.add(n.trim());
    });
  }

  // Tambahkan dari data yang sudah ada
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

  // Tambahkan dari suggestions
  if (typeof ZAKAT_SUGGESTIONS !== "undefined" && ZAKAT_SUGGESTIONS.mustahik) {
    ZAKAT_SUGGESTIONS.mustahik.forEach(function (n) {
      names.add(n.trim());
    });
  }

  // Tambahkan dari data yang sudah ada
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

// ============================================================
// ZAKAT - GET EXISTING NAMES (HANYA DARI DATA)
// ============================================================

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
