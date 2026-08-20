/* Explicit authentication gate state.
   Runs immediately (script tag placed right after the shell markup) so the
   correct screen (login vs dashboard) is shown before the rest of the app
   boots. Session lives in localStorage for 30 days — see session.js. */
(function () {
  const authScreen = document.getElementById("authScreen");
  const shell = document.getElementById("shell");
  const loader = document.getElementById("appLoader");
  const SESSION_KEY = "kas_user";

  function readValidSession() {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function applyAuthState() {
    const session = readValidSession();
    const authenticated = !!session;

    // Update state global
    if (window.state) {
      window.state.isAdmin = session?.role === "admin";
      window.state.adminName = session?.nama || "";
    }

    // Update HTML classes
    document.documentElement.classList.toggle("authenticated", authenticated);
    document.documentElement.classList.toggle("auth-locked", !authenticated);

    // Tampilkan screen yang sesuai
    if (authScreen) {
      authScreen.classList.toggle("hidden", authenticated);
    }

    if (shell) {
      shell.classList.toggle("hidden", !authenticated);
    }

    // Sembunyikan loader setelah state diterapkan
    if (loader) {
      // Beri sedikit delay agar transisi halus
      setTimeout(function () {
        loader.classList.add("hidden");
        // Sembunyikan sepenuhnya setelah animasi
        setTimeout(function () {
          loader.style.display = "none";
        }, 300);
      }, 150);
    }

    // Jika authenticated, load data
    if (authenticated && window.loadData) {
      // Load data setelah shell muncul
      setTimeout(function () {
        window.loadData();
      }, 50);
    }

    return authenticated;
  }

  // Terapkan state
  applyAuthState();

  // Event listener untuk perubahan storage (tab lain)
  window.addEventListener("storage", function (e) {
    if (e.key === SESSION_KEY) {
      applyAuthState();
    }
  });

  // Expose fungsi untuk refresh auth state
  window.__refreshAuthGate = applyAuthState;

  // Expose fungsi untuk logout
  window.__logout = function () {
    localStorage.removeItem(SESSION_KEY);
    applyAuthState();
  };
})();
