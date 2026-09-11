const aiChatState = {
  history: [],
  loading: false,
  provider: localStorage.getItem("ai_chat_provider") || "omniroute",
  returnRoute: "home",
};

let aiChatActivePopup = null;

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
  aiChatClosePopup();

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
  if (!box) return;
  box.scrollTo({ top: box.scrollHeight, behavior: "auto" });
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
  let i = 0;

  function closeList() {
    if (listType) {
      html.push("</" + listType + ">");
      listType = null;
    }
  }

  function renderInline(value) {
    return aiChatInlineMarkdown(value);
  }

  function isTableSeparator(line) {
    return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
  }

  function parseTableRow(line) {
    let s = line.trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|")) s = s.slice(0, -1);
    return s.split("|").map(function (c) {
      return c.trim();
    });
  }

  function renderTable(headerCells, rows) {
    let out = '<div class="ai-chat-table-wrap"><table class="ai-chat-table">';
    out += "<thead><tr>";
    headerCells.forEach(function (c) {
      out += "<th>" + renderInline(c) + "</th>";
    });
    out += "</tr></thead><tbody>";
    rows.forEach(function (row) {
      out += "<tr>";
      row.forEach(function (c) {
        out += "<td>" + renderInline(c) + "</td>";
      });
      out += "</tr>";
    });
    out += "</tbody></table></div>";
    return out;
  }

  function renderCodeBlock(code, lang) {
    const langClass = lang ? ' data-lang="' + aiChatEscapeHtml(lang) + '"' : "";
    return (
      '<div class="ai-chat-code-block"' +
      langClass +
      "><pre><code>" +
      aiChatEscapeHtml(code) +
      "</code></pre></div>"
    );
  }

  while (i < lines.length) {
    const line = lines[i];
    const raw = line.trim();

    const fenceMatch = raw.match(/^```\s*([\w-]*)\s*$/);
    if (fenceMatch) {
      closeList();
      const lang = fenceMatch[1] || "";
      const codeLines = [];
      i++;
      while (i < lines.length) {
        const cur = lines[i];
        if (/^```\s*$/.test(cur.trim())) {
          i++;
          break;
        }
        codeLines.push(cur);
        i++;
      }
      html.push(renderCodeBlock(codeLines.join("\n"), lang));
      continue;
    }

    if (!raw) {
      closeList();
      html.push('<div class="ai-chat-md-spacer"></div>');
      i++;
      continue;
    }

    if (
      raw.indexOf("|") !== -1 &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      closeList();
      const headerCells = parseTableRow(raw);
      const rows = [];
      i += 2;
      while (i < lines.length) {
        const rowLine = lines[i].trim();
        if (!rowLine || rowLine.indexOf("|") === -1) break;
        rows.push(parseTableRow(rowLine));
        i++;
      }
      html.push(renderTable(headerCells, rows));
      continue;
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
      i++;
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(raw)) {
      closeList();
      html.push('<hr class="ai-chat-md-hr">');
      i++;
      continue;
    }

    const bullet = raw.match(/^\*\s+(.+)$/) || raw.match(/^[-•]\s+(.+)$/);
    if (bullet) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push("<li>" + renderInline(bullet[1]) + "</li>");
      i++;
      continue;
    }

    const ordered = raw.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push("<li>" + renderInline(ordered[1]) + "</li>");
      i++;
      continue;
    }

    closeList();
    html.push("<p>" + renderInline(raw) + "</p>");
    i++;
  }

  closeList();
  return html.join("");
}

function aiChatCopyToClipboard(text, btn) {
  const originalText = btn ? btn.innerHTML : "";

  function onSuccess() {
    if (!btn) return;
    btn.classList.add("copied");
    btn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span>Copied!</span>';
    setTimeout(function () {
      btn.classList.remove("copied");
      btn.innerHTML = originalText;
    }, 1200);
  }

  function onError() {
    if (!btn) return;
    btn.classList.add("copy-error");
    setTimeout(function () {
      btn.classList.remove("copy-error");
    }, 1200);
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(onSuccess)
      .catch(function () {
        aiChatCopyFallback(text) ? onSuccess() : onError();
      });
  } else {
    aiChatCopyFallback(text) ? onSuccess() : onError();
  }
}

function aiChatCopyFallback(text) {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.setAttribute("readonly", "");
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (e) {
    console.error("[AI Chat] Copy fallback error:", e);
    return false;
  }
}

function aiChatClosePopup() {
  if (aiChatActivePopup) {
    aiChatActivePopup.remove();
    aiChatActivePopup = null;
  }
}

function aiChatGetLastUserQuestion() {
  for (let i = aiChatState.history.length - 1; i >= 0; i--) {
    const h = aiChatState.history[i];
    if (h && h.role === "user" && h.text) return h.text;
  }
  return null;
}

function aiChatRegenerate() {
  const question = aiChatGetLastUserQuestion();
  if (!question) return;
  if (aiChatState.loading) return;

  aiChatClosePopup();

  const box = aiChatEl("aiChatMessages");
  if (box && box.lastElementChild) {
    const last = box.lastElementChild;
    if (
      last.classList &&
      last.classList.contains("assistant") &&
      !last.classList.contains("pending")
    ) {
      last.remove();
    }
  }

  if (aiChatState.history.length) {
    const last = aiChatState.history[aiChatState.history.length - 1];
    if (last && last.role === "assistant") {
      aiChatState.history.pop();
    }
  }
  if (aiChatState.history.length) {
    const last = aiChatState.history[aiChatState.history.length - 1];
    if (last && last.role === "user") {
      aiChatState.history.pop();
    }
  }
  aiChatSaveHistory();

  aiChatSend(question, { skipUserBubble: true });
}

function aiChatShowPopup(bubble, text, x, y) {
  aiChatClosePopup();

  const popup = document.createElement("div");
  popup.className = "ai-chat-action-popup";
  popup.setAttribute("role", "menu");

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "ai-chat-action-item";
  copyBtn.setAttribute("role", "menuitem");
  copyBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span>';

  copyBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    aiChatCopyToClipboard(text, copyBtn);
    setTimeout(function () {
      aiChatClosePopup();
    }, 700);
  });

  popup.appendChild(copyBtn);

  const isAssistant =
    bubble && bubble.classList && bubble.classList.contains("assistant");

  if (isAssistant) {
    const regenBtn = document.createElement("button");
    regenBtn.type = "button";
    regenBtn.className = "ai-chat-action-item";
    regenBtn.setAttribute("role", "menuitem");
    regenBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg><span>Regenerate</span>';

    regenBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      aiChatRegenerate();
    });

    popup.appendChild(regenBtn);
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "ai-chat-action-item";
    shareBtn.setAttribute("role", "menuitem");
    shareBtn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg><span>Share</span>';

    shareBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      navigator
        .share({ text: text })
        .then(function () {
          aiChatClosePopup();
        })
        .catch(function () {});
    });

    popup.appendChild(shareBtn);
  }

  document.body.appendChild(popup);

  const popupRect = popup.getBoundingClientRect();
  const margin = 8;
  const offset = 10;

  let left = x - popupRect.width / 2;
  let top = y - popupRect.height - offset;

  if (top < margin) {
    top = y + offset;
  }

  if (left < margin) left = margin;
  if (left + popupRect.width > window.innerWidth - margin) {
    left = window.innerWidth - popupRect.width - margin;
  }
  if (top + popupRect.height > window.innerHeight - margin) {
    top = window.innerHeight - popupRect.height - margin;
  }

  popup.style.top = top + "px";
  popup.style.left = left + "px";

  requestAnimationFrame(function () {
    popup.classList.add("open");
  });

  aiChatActivePopup = popup;
}

function aiChatHandleBubbleTap(bubble, x, y) {
  const text = bubble.dataset.rawText || "";
  if (!text) return;

  bubble.classList.remove("pressed");
  void bubble.offsetWidth;
  bubble.classList.add("pressed");
  setTimeout(function () {
    bubble.classList.remove("pressed");
  }, 180);

  aiChatShowPopup(bubble, text, x, y);
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

  if (!opts.pending && text) {
    bubble.dataset.rawText = String(text);
    bubble.setAttribute("role", "button");
    bubble.setAttribute("tabindex", "0");
    bubble.setAttribute("title", "Tekan untuk copy");

    bubble.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      const x =
        e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const y =
        e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      aiChatHandleBubbleTap(bubble, x, y);
    });

    bubble.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const rect = bubble.getBoundingClientRect();
        aiChatHandleBubbleTap(
          bubble,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
      }
    });
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
      if (aiChatActivePopup) {
        aiChatClosePopup();
        return;
      }
      const screenEl = aiChatEl("screen-ai-chat");
      if (screenEl && screenEl.classList.contains("active")) {
        closeAiChat();
      }
    }
  });

  document.addEventListener(
    "click",
    function (e) {
      if (aiChatActivePopup) {
        if (!aiChatActivePopup.contains(e.target)) {
          aiChatClosePopup();
        }
      }
    },
    true,
  );

  document.addEventListener(
    "scroll",
    function () {
      if (aiChatActivePopup) aiChatClosePopup();
    },
    true,
  );

  window.addEventListener("resize", function () {
    if (aiChatActivePopup) aiChatClosePopup();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  aiChatInitProviderDropdown();
  aiChatInitControls();
});

async function aiChatSend(question, opts) {
  opts = opts || {};
  const q = (question || "").trim();
  if (!q || aiChatState.loading) return;

  aiChatClosePopup();

  const suggestions = aiChatEl("aiChatSuggestions");
  if (suggestions) suggestions.classList.add("hidden");

  if (!opts.skipUserBubble) {
    aiChatAppendBubble("user", q);
    aiChatState.history.push({ role: "user", text: q });
    aiChatSaveHistory();
  }

  const input = aiChatEl("aiChatInput");
  if (input) input.value = "";

  aiChatSetLoading(true);

  const pendingBubble = aiChatAppendBubble("assistant", "Sedang berpikir...", {
    pending: true,
  });

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

(function () {
  function aiChatLockViewportHeight() {
    const screen = document.getElementById("screen-ai-chat");
    if (!screen || !screen.classList.contains("active")) return;

    const vv = window.visualViewport;
    const h = vv ? vv.height : window.innerHeight;
    const panel = screen.querySelector(".ai-chat-panel");
    if (panel) {
      panel.style.height = h + "px";
      panel.style.maxHeight = h + "px";
    }
    screen.style.height = h + "px";
    screen.style.maxHeight = h + "px";

    const box = document.getElementById("aiChatMessages");
    if (box) {
      box.scrollTop = box.scrollHeight;
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", aiChatLockViewportHeight);
    window.visualViewport.addEventListener("scroll", aiChatLockViewportHeight);
  }
  window.addEventListener("resize", aiChatLockViewportHeight);
  window.addEventListener("orientationchange", aiChatLockViewportHeight);

  const _openAiChat = window.openAiChat;
  if (typeof _openAiChat === "function") {
    window.openAiChat = function () {
      const r = _openAiChat.apply(this, arguments);
      setTimeout(aiChatLockViewportHeight, 50);
      return r;
    };
  }

  document.addEventListener("focusin", function (e) {
    if (e.target && e.target.id === "aiChatInput") {
      setTimeout(aiChatLockViewportHeight, 150);
      setTimeout(aiChatLockViewportHeight, 350);
    }
  });

  document.addEventListener("focusout", function (e) {
    if (e.target && e.target.id === "aiChatInput") {
      setTimeout(aiChatLockViewportHeight, 150);
    }
  });
})();

window.openAiChat = openAiChat;
window.closeAiChat = closeAiChat;
window.aiChatSend = aiChatSend;
window.aiChatState = aiChatState;
window.aiChatSwitchProvider = aiChatSwitchProvider;
window.aiChatClearHistory = aiChatClearHistory;
window.aiChatRegenerate = aiChatRegenerate;
