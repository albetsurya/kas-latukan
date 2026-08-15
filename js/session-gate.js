/* Explicit authentication gate state.
   Runs immediately (script tag placed right after the shell markup) so the
   correct screen (login vs dashboard) is shown before the rest of the app
   boots. Session lives in localStorage for 30 days — see session.js. */
(function () {
  const authScreen = document.getElementById("authScreen");
  const shell = document.getElementById("shell");
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
    const authenticated = !!readValidSession();

    document.documentElement.classList.toggle("authenticated", authenticated);
    document.documentElement.classList.toggle("auth-locked", !authenticated);

    if (authScreen) authScreen.classList.toggle("hidden", authenticated);
    if (shell) shell.classList.toggle("hidden", !authenticated);
  }

  applyAuthState();

  window.addEventListener("storage", applyAuthState);
  window.__refreshAuthGate = applyAuthState;
})();
