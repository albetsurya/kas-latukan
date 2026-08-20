class Router {
  constructor() {
    this.routes = {
      home: {
        path: "/",
        title: "Beranda",
        screen: "screen-home",
        tab: "home",
        showInNav: true,
      },
      history: {
        path: "/history",
        title: "Riwayat",
        screen: "screen-history",
        tab: "history",
        showInNav: true,
      },
      recap: {
        path: "/recap",
        title: "Rekap",
        screen: "screen-recap",
        tab: "recap",
        showInNav: true,
      },
      shodaqoh: {
        path: "/shodaqoh",
        title: "Shodaqoh",
        screen: "screen-shodaqoh",
        tab: "shodaqoh",
        showInNav: true,
      },
      profile: {
        path: "/profile",
        title: "Profil",
        screen: "screen-profile",
        tab: "profile",
        showInNav: true,
      },
      // ============================================================
      // ZAKAT ROUTE - TIDAK MUNCUL DI BOTTOM NAV
      // ============================================================
      zakat: {
        path: "/zakat",
        title: "Manajemen Zakat",
        screen: "screen-zakat",
        tab: "zakat",
        showInNav: false, // 👈 Tidak muncul di bottom navigation
      },
    };

    this.currentRoute = "home";
    this.listeners = {};
    this.initialized = false;
    this._isNavigating = false;
  }

  init() {
    if (this.initialized) return;

    window.addEventListener("popstate", () => {
      this.handleRouteChange();
    });

    this.initialized = true;

    this.handleRouteChange();
  }

  normalizePath(path) {
    if (!path) return "/";

    path = path.split("?")[0];

    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    return path || "/";
  }

  getRouteFromPath(path) {
    path = this.normalizePath(path);

    const routeKey = Object.keys(this.routes).find(
      (key) => this.routes[key].path === path,
    );

    return routeKey || null;
  }

  handleRouteChange() {
    let path = this.normalizePath(window.location.pathname);

    // Migrasi URL lama #/profile → /profile
    if (window.location.hash) {
      const hashPath = window.location.hash.replace(/^#/, "").trim();

      if (hashPath) {
        const normalizedHash = this.normalizePath(hashPath);

        const hashRoute = this.getRouteFromPath(normalizedHash);

        if (hashRoute) {
          window.history.replaceState({ route: hashRoute }, "", normalizedHash);

          path = normalizedHash;
        }
      }
    }

    const routeKey = this.getRouteFromPath(path);

    if (!routeKey) {
      window.history.replaceState({ route: "home" }, "", "/");

      this.navigateTo("home", false);
      return;
    }

    this.navigateTo(routeKey, false);
  }

  navigateTo(routeKey, updateHistory = true) {
    const route = this.routes[routeKey];

    if (!route) {
      console.warn(`[Router] Route tidak ditemukan: ${routeKey}`);
      return;
    }

    const currentPath = this.normalizePath(window.location.pathname);

    if (updateHistory && currentPath !== route.path) {
      window.history.pushState({ route: routeKey }, "", route.path);
    }

    this.currentRoute = routeKey;

    // Router → UI
    switchTab(route.tab);

    document.title = `Kas · ${route.title}`;

    const screenTitle = document.getElementById("screenTitle");

    if (screenTitle) {
      screenTitle.textContent = route.title;
    }

    this.updateNavButtons(routeKey);

    this.trigger("routeChange", {
      route: routeKey,
      screen: route.screen,
      tab: route.tab,
      path: route.path,
    });
  }

  updateNavButtons(routeKey) {
    // Hanya update tombol nav yang ada di bottom nav
    // dan hanya untuk route yang showInNav = true
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      const tab = btn.dataset.tab;
      // Cek apakah route ini ada dan showInNav = true
      const route = this.routes[tab];
      if (route && route.showInNav === false) {
        // Jika route tidak muncul di nav, jangan toggle
        return;
      }
      btn.classList.toggle("active", tab === routeKey);
    });
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
  }

  trigger(event, data) {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[Router] Error pada listener "${event}":`, error);
      }
    });
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  getRouteData(routeKey) {
    return this.routes[routeKey] || null;
  }

  goBack() {
    window.history.back();
  }

  setPathWithoutNavigation(path) {
    const normalizedPath = this.normalizePath(path);

    if (this.normalizePath(window.location.pathname) !== normalizedPath) {
      window.history.pushState(null, "", normalizedPath);
    }
  }

  getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};

    for (const [key, value] of params) {
      result[key] = value;
    }

    return result;
  }
}

const router = new Router();
window.router = router;
