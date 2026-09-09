const aiChatState = {
  history: [],
  loading: false,
  provider: "omniroute",
};

function $(id) {
  return document.getElementById(id);
}

function openAiChat() {
  const overlay = $("aiChatOverlay");
  if (!overlay) {
    console.warn("aiChatOverlay tidak ditemukan");
    return;
  }

  overlay.classList.remove("hidden");
  document.body.classList.add("ai-chat-open");

  setTimeout(function () {
    const input = $("aiChatInput");
    if (input) input.focus();
  }, 150);
}

function closeAiChat() {
  const overlay = $("aiChatOverlay");
  if (!overlay) return;

  overlay.classList.add("hidden");
  document.body.classList.remove("ai-chat-open");
}

function aiChatScrollToBottom() {
  const box = $("aiChatMessages");
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

    const bullet = raw.match(/^\*\s+(.+)$/) || raw.match(/^[-•]\s+(.+)$/);
    if (bullet) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push("<li>" + renderInline(bullet[1]) + "</li>");
      return;
    }

    const ordered = raw.match(/^\d+\.\s+(.+)$/);
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

  const box = $("aiChatMessages");
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

  const btn = $("aiChatSendBtn");
  const input = $("aiChatInput");

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
  if (!statusEl) return;

  const labels = {
    omniroute: "🚀 OmniRoute",
    gemini: "🧠 Gemini",
    auto: "🔄 Auto",
  };

  statusEl.textContent = labels[provider] || provider;
  statusEl.className = "active-" + provider;
}

async function aiChatSwitchProvider(provider) {
  try {
    const response = await apiPost({
      action: "setAIProvider",
      provider: provider,
    });

    if (response && response.success) {
      aiChatState.provider = provider;
      updateProviderStatus(provider);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Switch provider error:", err);
    return false;
  }
}

async function aiChatGetProvider() {
  try {
    const response = await apiPost({
      action: "getCurrentProvider",
    });

    if (response && response.success) {
      const provider = response.data?.active || "omniroute";
      aiChatState.provider = provider;
      updateProviderStatus(provider);

      const select = document.getElementById("aiProviderSelect");
      if (select) select.value = provider;
    }
  } catch (err) {
    console.error("Get provider error:", err);
  }
}

async function aiChatSend(question) {
  const q = (question || "").trim();
  if (!q || aiChatState.loading) return;

  const suggestions = $("aiChatSuggestions");
  if (suggestions) suggestions.classList.add("hidden");

  aiChatAppendBubble("user", q);
  aiChatState.history.push({ role: "user", text: q });

  const input = $("aiChatInput");
  if (input) input.value = "";

  aiChatSetLoading(true);

  const pendingBubble = aiChatAppendBubble(
    "assistant",
    "Sedang mencari data...",
    { pending: true },
  );

  try {
    let response;

    if (typeof apiPost === "function") {
      response = await apiPost({
        action: "aiChatQuery",
        kasType: "main",
        message: q,
        history: aiChatState.history.slice(0, -1).slice(-12),
        provider: aiChatState.provider,
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

      if (response.data && response.data.provider) {
        aiChatState.provider = response.data.provider;
        updateProviderStatus(response.data.provider);
        const select = document.getElementById("aiProviderSelect");
        if (select) select.value = response.data.provider;
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

document.addEventListener("DOMContentLoaded", function () {
  const fab = $("fabAiChat");
  if (fab) {
    fab.addEventListener("click", openAiChat);

    fab.addEventListener("mouseenter", function () {
      const svg = this.querySelector("svg");
      if (svg) {
        svg.style.transform = "rotate(180deg) scale(1.1)";
      }
    });

    fab.addEventListener("mouseleave", function () {
      const svg = this.querySelector("svg");
      if (svg) {
        svg.style.transform = "rotate(0deg) scale(1)";
      }
    });
  }

  const closeBtn = $("aiChatCloseBtn");
  if (closeBtn) closeBtn.addEventListener("click", closeAiChat);

  const overlay = $("aiChatOverlay");
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeAiChat();
    });
  }

  const form = $("aiChatForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const input = $("aiChatInput");
      if (input) {
        aiChatSend(input.value);
      }
    });
  }

  const input = $("aiChatInput");
  if (input) {
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const form = $("aiChatForm");
        if (form) form.dispatchEvent(new Event("submit"));
      }
    });
  }

  document.querySelectorAll(".ai-chat-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      const q = this.dataset.q || this.textContent;
      aiChatSend(q);
    });
  });

  const providerSelect = document.getElementById("aiProviderSelect");
  if (providerSelect) {
    providerSelect.addEventListener("change", async function () {
      const provider = this.value;
      const success = await aiChatSwitchProvider(provider);
      if (success) {
        aiChatAppendBubble(
          "assistant",
          `🔄 Berpindah ke **${provider.toUpperCase()}** provider`,
        );
      } else {
        this.value = aiChatState.provider;
        aiChatAppendBubble(
          "assistant",
          "⚠️ Gagal berpindah provider. Coba lagi.",
        );
      }
    });
  }

  aiChatGetProvider();

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const overlayEl = $("aiChatOverlay");
      if (overlayEl && !overlayEl.classList.contains("hidden")) {
        closeAiChat();
      }
    }
  });
});

window.openAiChat = openAiChat;
window.closeAiChat = closeAiChat;
window.aiChatSend = aiChatSend;
window.aiChatState = aiChatState;
window.aiChatSwitchProvider = aiChatSwitchProvider;
