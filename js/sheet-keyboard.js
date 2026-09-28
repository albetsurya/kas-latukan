/* =========================================================
   SHEET KEYBOARD & VISUAL VIEWPORT MANAGER
   Handles virtual software keyboard opening on mobile devices,
   ensuring sheet input fields remain fully visible and auto-scrolled
   above the software keyboard.
   ========================================================= */

(function () {
  let isKeyboardActive = false;

  function getActiveOverlay() {
    const overlays = document.querySelectorAll("body > .sheet-overlay:not(.hidden)");
    for (const overlay of overlays) {
      if (
        overlay.offsetWidth > 0 ||
        overlay.offsetHeight > 0 ||
        getComputedStyle(overlay).display !== "none"
      ) {
        return overlay;
      }
    }
    return null;
  }

  function updateSheetViewportLayout() {
    const overlay = getActiveOverlay();

    if (!overlay) {
      resetAllOverlays();
      return;
    }

    const vv = window.visualViewport;
    const windowH = window.innerHeight;
    const vvH = vv ? vv.height : windowH;
    const vvTop = vv ? vv.offsetTop : 0;

    const activeEl = document.activeElement;
    const isInputFocused =
      activeEl &&
      activeEl.closest &&
      activeEl.closest(".sheet-overlay") === overlay &&
      (activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.tagName === "SELECT");

    const keyboardHeight = Math.max(0, windowH - vvH - vvTop);
    const hasKeyboard = isInputFocused || keyboardHeight > 80 || vvH < windowH - 80;

    if (hasKeyboard) {
      isKeyboardActive = true;
      overlay.classList.add("sheet-keyboard-active");

      const safeVvH = Math.max(160, vvH);
      const maxSheetH = Math.max(150, safeVvH - 8);
      const maxScrollH = Math.max(100, safeVvH - 70);

      overlay.style.setProperty("--sheet-vv-top", vvTop + "px");
      overlay.style.setProperty("--sheet-vv-height", safeVvH + "px");

      overlay.style.setProperty("top", vvTop + "px", "important");
      overlay.style.setProperty("height", safeVvH + "px", "important");
      overlay.style.setProperty("bottom", "auto", "important");

      const sheet = overlay.querySelector(".sheet");
      const sheetScroll = overlay.querySelector(".sheet-scroll");

      if (sheet) {
        sheet.style.setProperty("max-height", maxSheetH + "px", "important");
      }

      if (sheetScroll) {
        sheetScroll.style.setProperty("max-height", maxScrollH + "px", "important");
        sheetScroll.style.setProperty("padding-bottom", "160px", "important");
        sheetScroll.style.setProperty("scroll-padding-bottom", "160px", "important");
        sheetScroll.style.setProperty("overflow-y", "auto", "important");
      }
    } else {
      isKeyboardActive = false;
      overlay.classList.remove("sheet-keyboard-active");
      resetOverlay(overlay);
    }
  }

  function resetOverlay(overlay) {
    if (!overlay) return;
    overlay.classList.remove("sheet-keyboard-active");
    overlay.style.removeProperty("top");
    overlay.style.removeProperty("height");
    overlay.style.removeProperty("bottom");
    overlay.style.removeProperty("--sheet-vv-top");
    overlay.style.removeProperty("--sheet-vv-height");

    const sheet = overlay.querySelector(".sheet");
    const sheetScroll = overlay.querySelector(".sheet-scroll");

    if (sheet) {
      sheet.style.removeProperty("max-height");
    }
    if (sheetScroll) {
      sheetScroll.style.removeProperty("max-height");
      sheetScroll.style.removeProperty("padding-bottom");
      sheetScroll.style.removeProperty("scroll-padding-bottom");
      sheetScroll.style.removeProperty("overflow-y");
    }
  }

  function resetAllOverlays() {
    document.querySelectorAll("body > .sheet-overlay").forEach(resetOverlay);
  }

  function scrollInputIntoView(input) {
    if (!input || !input.closest) return;
    const overlay = input.closest(".sheet-overlay");
    if (!overlay) return;

    const sheetScroll =
      input.closest(".sheet-scroll") ||
      overlay.querySelector(".sheet-scroll") ||
      overlay.querySelector(".sheet");

    [60, 180, 320, 500].forEach((delay) => {
      setTimeout(() => {
        if (document.activeElement === input) {
          updateSheetViewportLayout();

          if (sheetScroll && typeof input.scrollIntoView === "function") {
            try {
              input.scrollIntoView({ block: "center", behavior: "smooth" });
            } catch (err) {
              input.scrollIntoView(false);
            }
          }
        }
      }, delay);
    });
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateSheetViewportLayout);
    window.visualViewport.addEventListener("scroll", updateSheetViewportLayout);
  }
  window.addEventListener("resize", updateSheetViewportLayout);
  window.addEventListener("orientationchange", updateSheetViewportLayout);

  document.addEventListener("focusin", function (e) {
    const target = e.target;
    if (target && target.closest && target.closest(".sheet-overlay")) {
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        scrollInputIntoView(target);
      }
    }
  });

  document.addEventListener("focusout", function (e) {
    const target = e.target;
    if (target && target.closest && target.closest(".sheet-overlay")) {
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (!activeEl || !activeEl.closest || !activeEl.closest(".sheet-overlay")) {
          updateSheetViewportLayout();
        }
      }, 120);
    }
  });

  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "class") {
        shouldCheck = true;
        break;
      }
    }
    if (shouldCheck) {
      setTimeout(updateSheetViewportLayout, 40);
    }
  });

  function initObserver() {
    document
      .querySelectorAll("body > .sheet-overlay, #shell .sheet-overlay")
      .forEach((overlay) => {
        observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
      });
    updateSheetViewportLayout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initObserver);
  } else {
    initObserver();
  }

  window.updateSheetViewportLayout = updateSheetViewportLayout;
  window.scrollInputIntoView = scrollInputIntoView;
})();
