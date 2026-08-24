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
      zakat: {
        path: "/zakat",
        title: "Manajemen Zakat",
        screen: "screen-zakat",
        tab: "zakat",
        showInNav: false,
      },
      "zakat-detail": {
        path: "/zakat/:id",
        title: "Detail Zakat",
        screen: "screen-zakat",
        tab: "zakat",
        showInNav: false,
        isDetail: true,
      },
    };

    this.currentRoute = "home";
    this.listeners = {};
    this.initialized = false;
    this._isNavigating = false;
    this.currentParams = {};
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

  matchRoute(path) {
    path = this.normalizePath(path);

    for (const [key, route] of Object.entries(this.routes)) {
      const pattern = route.path;
      if (pattern.includes(":id")) {
        const basePath = pattern.split("/:id")[0];
        if (path === basePath) {
          return { routeKey: key, params: null };
        }
        if (path.startsWith(basePath + "/")) {
          const id = path.substring(basePath.length + 1);
          return { routeKey: key, params: { id } };
        }
      } else if (pattern === path) {
        return { routeKey: key, params: null };
      }
    }

    return null;
  }

  getRouteFromPath(path) {
    const match = this.matchRoute(path);
    return match ? match.routeKey : null;
  }

  getRouteParams(path) {
    const match = this.matchRoute(path);
    return match ? match.params : null;
  }

  handleRouteChange() {
    let path = this.normalizePath(window.location.pathname);

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
    const params = this.getRouteParams(path);

    if (!routeKey) {
      window.history.replaceState({ route: "home" }, "", "/");
      this.navigateTo("home", false);
      return;
    }

    this.navigateTo(routeKey, false, params); // ✅ params sekarang ikut dikirim
  }

  navigateTo(routeKey, updateHistory = true, params = null) {
    const route = this.routes[routeKey];
    if (!route) {
      console.warn(`[Router] Route tidak ditemukan: ${routeKey}`);
      return;
    }

    let path = route.path;
    if (params && params.id) {
      path = route.path.replace(":id", params.id);
    }

    const currentPath = this.normalizePath(window.location.pathname);

    if (updateHistory && currentPath !== path) {
      window.history.pushState({ route: routeKey, params }, "", path);
    }

    this.currentRoute = routeKey;
    this.currentParams = params || {};

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
      path: path,
      params: this.currentParams,
      isDetail: route.isDetail || false,
    });
  }

  updateNavButtons(routeKey) {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      const tab = btn.dataset.tab;
      const route = this.routes[tab];
      if (route && route.showInNav === false) {
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

  getCurrentParams() {
    return this.currentParams;
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

  getZakatIdFromRoute() {
    if (this.currentRoute === "zakat-detail") {
      return this.currentParams.id || null;
    }
    return null;
  }

  isZakatDetailRoute() {
    return this.currentRoute === "zakat-detail";
  }
}

const router = new Router();
window.router = router;
