// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
  initChartFilterDropdown();
});

// ============================================================
// ZAKAT - STATE & CONSTANTS
// ============================================================

const ZAKAT_STATE_KEY = "zakat_data";

// Default suggestions untuk autocomplete
const ZAKAT_SUGGESTIONS = {
  muzaki: [
    "Bp Eko",
    "Bu Wiwid",
    "Bu Mar'atus",
    "Bp Usman",
    "Bp Nasekup",
    "Bp Naseri",
    "Bp Choirul Umam",
    "Bp Budi",
    "Bp Didik",
    "Bu Resnowati",
    "H Budi",
    "H Didik",
    "Bu Rismawati",
    "Bp Qomarudin",
    "H Olron",
  ],
  mustahik: [
    "Ibnu Sabil",
    "Bu Asri",
    "Bp Kabit",
    "Bu Tun",
    "Bu Samilah",
    "Bu Kasmija",
    "Bp Rasminto",
    "Bu Julaini",
    "Bp Tamyis",
    "Mas Noval",
    "Bp Yakop",
  ],
};

