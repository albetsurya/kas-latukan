const aiChatState = {
  history: [],
  loading: false,
  provider: localStorage.getItem("ai_chat_provider") || "omniroute",
  returnRoute: "home",
};

function aiChatSetProvider(provider) {
  const allowedProviders = ["omniroute", "gemini", "groq", "auto"];

  if (!allowedProviders.includes(provider)) {
    provider = "omniroute";
  }

  aiChatState.provider = provider;
  localStorage.setItem("ai_chat_provider", provider);
  updateProviderStatus(provider);
}

function aiChatSaveHistory() {
  try {
    var toSave = aiChatState.history.slice(-50);
    localStorage.setItem("ai_chat_history", JSON.stringify(toSave));
  } catch (e) {
    console.warn("[AI Chat] Gagal simpan history:", e);
  }
}

function aiChatLoadHistory() {
  try {
    var raw = localStorage.getItem("ai_chat_history");
    if (!raw) return [];

    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(function (h) {
      return h && h.role && h.text;
    });
  } catch (e) {
    console.warn("[AI Chat] Gagal load history:", e);
    return [];
  }
}

function aiChatClearHistory() {
  aiChatState.history = [];
  localStorage.removeItem("ai_chat_history");
}

function aiChatRenderHistory() {
  var box = aiChatEl("aiChatMessages");
  if (!box) return;

  box.innerHTML = "";

  if (!aiChatState.history.length) {
    var welcome = document.createElement("div");
    welcome.className = "ai-chat-bubble assistant";
    var p = document.createElement("p");
    p.textContent =
      "Halo! Saya asisten AI untuk data Kas, Shodaqoh, dan Zakat. Ada yang bisa saya bantu?";
    welcome.appendChild(p);
    box.appendChild(welcome);
    return;
  }

  aiChatState.history.forEach(function (h) {
    aiChatAppendBubble(h.role, h.text);
  });

  aiChatScrollToBottom();
}

function aiChatSetLocalProvider(provider) {
  aiChatSetProvider(provider);
}

function aiChatEl(id) {
  return document.getElementById(id);
}

function aiChatForceTransparentSuggestions() {
  var el = document.getElementById("aiChatSuggestions");
  if (!el) return;

  el.style.setProperty("background", "transparent", "important");
  el.style.setProperty("background-color", "transparent", "important");
  el.style.setProperty("backdrop-filter", "none", "important");
  el.style.setProperty("-webkit-backdrop-filter", "none", "important");
}

function openAiChat() {
  const screen = aiChatEl("screen-ai-chat");
  if (!screen) {
    console.warn("screen-ai-chat tidak ditemukan");
    return false;
  }

  if (
    typeof router !== "undefined" &&
    router &&
    typeof router.navigateTo === "function"
  ) {
    const current =
      typeof router.getCurrentRoute === "function"
        ? router.getCurrentRoute()
        : null;
    if (current && current !== "ai-chat") {
      aiChatState.returnRoute = current;
    }
    router.navigateTo("ai-chat");
  } else {
    document.querySelectorAll(".screen").forEach(function (s) {
      s.classList.remove("active");
    });
    screen.classList.add("active");
    document.body.classList.add("screen-ai-chat-active");
    const bottomNav = document.getElementById("bottomnav");
    if (bottomNav) bottomNav.style.display = "none";
  }

  aiChatInitProviderDropdown();
  aiChatInitControls();
  aiChatForceTransparentSuggestions();

  const input = aiChatEl("aiChatInput");
  if (input) {
    setTimeout(function () {
      input.focus();
    }, 150);
  }
  return true;
}

function closeAiChat() {
  if (
    typeof router !== "undefined" &&
    router &&
    typeof router.navigateTo === "function"
  ) {
    let target = aiChatState.returnRoute || "home";
    if (target === "ai-chat") target = "home";
    if (target === "zakat-detail") target = "zakat";
    router.navigateTo(target);
    return;
  }

  const screen = aiChatEl("screen-ai-chat");
  if (screen) screen.classList.remove("active");
  document.body.classList.remove("screen-ai-chat-active");
  const bottomNav = document.getElementById("bottomnav");
  if (bottomNav) bottomNav.style.display = "";
}

function aiChatScrollToBottom() {
  const box = aiChatEl("aiChatMessages");
  if (box) box.scrollTop = box.scrollHeight;
}

function aiChatEscapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function aiChatInlineMarkdown(text) {
  let value = aiChatEscapeHtml(text);
  value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  value = value.replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  value = value.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
  return value;
}

function aiChatRenderMarkdown(text) {
  const source = String(text || "").replace(/\r\n?/g, "\n");
  const lines = source.split("\n");
  const html = [];
  let listType = null;

  function closeList() {
    if (listType) {
      html.push("</" + listType + ">");
      listType = null;
    }
  }

  function renderInline(value) {
    return aiChatInlineMarkdown(value);
  }

  lines.forEach(function (line) {
    const raw = line.trim();

    if (!raw) {
      closeList();
      html.push('<div class="ai-chat-md-spacer"></div>');
      return;
    }

    const heading = raw.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 3);
      html.push(
        "<h" +
          level +
          ' class="ai-chat-md-h' +
          level +
          '">' +
          renderInline(heading[2]) +
          "</h" +
          level +
          ">",
      );
      return;
    }

    const explicitBullet = raw.match(/^[\*\-•]\s+(.+)$/);

    const autoBulletPattern =
      /^([A-Z][^–—\-:]{2,50})\s*[–—]\s*(Rp[\d\.,]+|[\d\.,]+)(.*)$/;
    const autoBullet = !explicitBullet && raw.match(autoBulletPattern);

    const ordered = raw.match(/^\d+[\.\)]\s+(.+)$/);

    if (explicitBullet) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push("<li>" + renderInline(explicitBullet[1]) + "</li>");
      return;
    }

    if (autoBullet) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      const name = autoBullet[1].trim();
      const amount = autoBullet[2].trim();
      const rest = (autoBullet[3] || "").trim();
      html.push(
        "<li><strong>" +
          renderInline(name) +
          "</strong> – " +
          renderInline(amount) +
          (rest ? " " + renderInline(rest) : "") +
          "</li>",
      );
      return;
    }

    if (ordered) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push("<li>" + renderInline(ordered[1]) + "</li>");
      return;
    }

    closeList();
    html.push("<p>" + renderInline(raw) + "</p>");
  });

  closeList();
  return html.join("");
}

function aiChatAppendBubble(role, text, opts) {
  opts = opts || {};
  const box = aiChatEl("aiChatMessages");
  if (!box) return null;
  const bubble = document.createElement("div");
  bubble.className =
    "ai-chat-bubble " + role + (opts.pending ? " pending" : "");
  if (role === "assistant" && !opts.pending) {
    bubble.innerHTML = aiChatRenderMarkdown(text);
  } else {
    const p = document.createElement("p");
    p.textContent = text;
    bubble.appendChild(p);
  }
  box.appendChild(bubble);
  aiChatScrollToBottom();
  return bubble;
}

function aiChatSetLoading(isLoading) {
  aiChatState.loading = isLoading;
  const btn = aiChatEl("aiChatSendBtn");
  const input = aiChatEl("aiChatInput");
  if (btn) btn.disabled = isLoading;
  if (input) input.disabled = isLoading;
  if (isLoading) {
    document.body.classList.add("ai-chat-loading");
  } else {
    document.body.classList.remove("ai-chat-loading");
  }
}

function updateProviderStatus(provider) {
  const statusEl = document.getElementById("aiChatProviderStatus");
  const valueEl = document.getElementById("aiProviderValue");

  const labels = {
    omniroute: "OmniRoute",
    gemini: "Gemini",
    groq: "Groq",
    auto: "Auto",
  };

  const label = labels[provider] || provider;

  if (statusEl) {
    statusEl.textContent = label;
    statusEl.className = "active-" + provider;
  }

  if (valueEl) {
    valueEl.textContent = label;
  }

  document
    .querySelectorAll("#aiProviderMenu .filter-dropdown-option")
    .forEach(function (opt) {
      const isActive = opt.dataset.provider === provider;
      opt.classList.toggle("active", isActive);
      opt.setAttribute("aria-selected", isActive ? "true" : "false");
    });
}

async function aiChatSwitchProvider(provider) {
  const allowedProviders = ["omniroute", "gemini", "groq", "auto"];
  if (!allowedProviders.includes(provider)) {
    console.warn("[AI Chat] Provider tidak valid:", provider);
    return false;
  }

  aiChatSetProvider(provider);

  console.log(
    "[AI Chat] Switch provider:",
    "→",
    provider,
    "| LS:",
    localStorage.getItem("ai_chat_provider"),
    "| state:",
    aiChatState.provider,
  );

  try {
    const response = await apiPost({
      action: "setAIProvider",
      provider: provider,
    });
    console.log("[AI Chat] Server response:", response);
  } catch (err) {
    console.warn("[AI Chat] Server sync failed:", err);
  }

  return true;
}

async function aiChatGetProvider() {
  const localProvider = localStorage.getItem("ai_chat_provider");
  if (["omniroute", "gemini", "groq", "auto"].includes(localProvider)) {
    aiChatSetProvider(localProvider);
    return localProvider;
  }

  try {
    const response = await apiPost({ action: "getCurrentProvider" });
    if (response && response.success && response.data) {
      const serverProvider =
        response.data.active ||
        response.data.provider ||
        response.data.usedProvider;
      if (["omniroute", "gemini", "groq", "auto"].includes(serverProvider)) {
        aiChatSetProvider(serverProvider);
        return serverProvider;
      }
    }
  } catch (err) {
    console.error("[AI Chat] Get provider error:", err);
  }

  return aiChatState.provider || "omniroute";
}

function aiChatInitProviderDropdown() {
  const dropdownEl = document.getElementById("aiProviderDropdown");
  const triggerEl = document.getElementById("aiProviderTrigger");
  const menuEl = document.getElementById("aiProviderMenu");

  if (!dropdownEl || !triggerEl || !menuEl) {
    console.warn("[AI Chat] Elemen provider dropdown tidak ditemukan");
    return;
  }

  if (dropdownEl.dataset.aiChatDropdownInit === "1") {
    return;
  }
  dropdownEl.dataset.aiChatDropdownInit = "1";

  function closeMenu() {
    menuEl.classList.remove("open");
    triggerEl.setAttribute("aria-expanded", "false");
  }

  triggerEl.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = menuEl.classList.contains("open");
    menuEl.classList.toggle("open", !isOpen);
    triggerEl.setAttribute("aria-expanded", String(!isOpen));
  });

  menuEl
    .querySelectorAll(".filter-dropdown-option")
    .forEach(function (optionEl) {
      optionEl.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        const provider = this.dataset.provider;
        if (!provider) {
          console.warn("[AI Chat] Provider kosong");
          return;
        }

        closeMenu();

        const labels = {
          omniroute: "OmniRoute",
          gemini: "Gemini",
          groq: "Groq",
          auto: "Auto",
        };

        aiChatSwitchProvider(provider).then(function (success) {
          if (success) {
            aiChatAppendBubble(
              "assistant",
              "Provider diganti ke **" + (labels[provider] || provider) + "**",
            );
          }
        });
      });
    });

  document.addEventListener("click", function (e) {
    if (!dropdownEl.contains(e.target)) {
      closeMenu();
    }
  });

  window.addEventListener("resize", closeMenu);
  window.addEventListener("scroll", closeMenu, true);
}

function aiChatInitControls() {
  const screenEl = aiChatEl("screen-ai-chat");
  if (!screenEl) return;
  if (screenEl.dataset.aiChatControlsInit === "1") return;
  screenEl.dataset.aiChatControlsInit = "1";

  aiChatState.history = aiChatLoadHistory();
  aiChatRenderHistory();

  const localProvider = localStorage.getItem("ai_chat_provider");
  if (["omniroute", "gemini", "groq", "auto"].includes(localProvider)) {
    aiChatSetProvider(localProvider);
    console.log("[AI Chat] Provider dari localStorage:", localProvider);
  } else {
    aiChatGetProvider().then(function (provider) {
      console.log("[AI Chat] Provider dari server:", provider);
    });
  }

  document.addEventListener("click", function (e) {
    const back = e.target.closest("#aiChatBackBtn");
    if (back) {
      e.preventDefault();
      closeAiChat();
      return;
    }

    const chip = e.target.closest(".ai-chat-chip");
    if (chip) {
      e.preventDefault();
      const q = chip.dataset.q || chip.textContent.trim();
      aiChatSend(q);
      return;
    }

    const sendBtn = e.target.closest("#aiChatSendBtn");
    if (sendBtn) {
      e.preventDefault();
      const input = aiChatEl("aiChatInput");
      if (input) aiChatSend(input.value);
      return;
    }
  });

  document.addEventListener("submit", function (e) {
    const form = e.target.closest("#aiChatForm");
    if (form) {
      e.preventDefault();
      const input = aiChatEl("aiChatInput");
      if (input) aiChatSend(input.value);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.target.id === "aiChatInput" && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = aiChatEl("aiChatForm");
      if (form) form.dispatchEvent(new Event("submit"));
      return;
    }

    if (e.key === "Escape") {
      const screenEl = aiChatEl("screen-ai-chat");
      if (screenEl && screenEl.classList.contains("active")) {
        closeAiChat();
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  aiChatInitProviderDropdown();
  aiChatInitControls();
});

async function aiChatSend(question) {
  const q = (question || "").trim();
  if (!q || aiChatState.loading) return;

  const suggestions = aiChatEl("aiChatSuggestions");
  if (suggestions) suggestions.classList.add("hidden");

  aiChatAppendBubble("user", q);
  aiChatState.history.push({ role: "user", text: q });
  aiChatSaveHistory();

  const input = aiChatEl("aiChatInput");
  if (input) input.value = "";

  aiChatSetLoading(true);

  const pendingBubble = aiChatAppendBubble(
    "assistant",
    "Sedang mencari data...",
    { pending: true },
  );

  const providerToSend =
    localStorage.getItem("ai_chat_provider") ||
    aiChatState.provider ||
    "omniroute";

  console.log("[AI Chat] Sending with provider:", providerToSend);

  try {
    let response;

    if (typeof apiPost === "function") {
      response = await apiPost({
        action: "aiChatQuery",
        kasType: "main",
        message: q,
        history: aiChatState.history.slice(0, -1).slice(-12),
        provider: providerToSend,
      });
    } else {
      response = await aiChatFetchFallback(q);
    }

    if (pendingBubble) pendingBubble.remove();

    if (response && response.success) {
      const reply =
        (response.data && response.data.reply) ||
        "Maaf, saya belum menemukan jawabannya.";

      aiChatAppendBubble("assistant", reply);
      aiChatState.history.push({ role: "assistant", text: reply });
      aiChatSaveHistory();

      const returnedProvider =
        response.data && (response.data.provider || response.data.usedProvider);

      console.log("[AI Chat] Server used provider:", returnedProvider);

      if (returnedProvider && returnedProvider !== providerToSend) {
        console.warn(
          "[AI Chat] ⚠️ Server pakai provider lain:",
          returnedProvider,
          "(diminta:",
          providerToSend + ")",
        );
      }
    } else {
      const msg =
        (response && response.message) ||
        "Terjadi kesalahan saat memproses pertanyaan.";
      aiChatAppendBubble("assistant", "⚠️ " + msg);
    }
  } catch (err) {
    console.error("AI Chat Error:", err);
    if (pendingBubble) pendingBubble.remove();
    aiChatAppendBubble("assistant", "⚠️ Gagal terhubung ke server. Coba lagi.");
  } finally {
    aiChatSetLoading(false);
  }
}

async function aiChatFetchFallback(message) {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "aiChatQuery",
        message: message,
        kasType: "main",
        provider: aiChatState.provider,
      }),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Fetch error:", err);
    return {
      success: false,
      message: "Gagal terhubung ke server",
    };
  }
}

window.openAiChat = openAiChat;
window.closeAiChat = closeAiChat;
window.aiChatSend = aiChatSend;
window.aiChatState = aiChatState;
window.aiChatSwitchProvider = aiChatSwitchProvider;
