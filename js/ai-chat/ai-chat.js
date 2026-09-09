// ============================================================
// AI CHAT - Tanya jawab seputar data (Kas, Shodaqoh, Zakat)
// Backend action: "aiChatQuery" (lihat ai-chat.gs)
// ============================================================

const aiChatState = {
  history: [], // { role: "user" | "assistant", text: string }
  loading: false,
};

function openAiChat() {
  const overlay = $("aiChatOverlay");
  if (!overlay) return;

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
    // Selalu kirim kasType "main" agar tidak ikut ke-routing ke handler Kas
    // Amil ketika tab Kas Amil sedang aktif (lihat catatan patch doPost).
    const res = await apiPost({
      action: "aiChatQuery",
      kasType: "main",
      message: q,
      // riwayat percakapan sebelumnya (tanpa pertanyaan yg baru saja dikirim)
      history: aiChatState.history.slice(0, -1).slice(-12),
    });

    if (pendingBubble) pendingBubble.remove();

    if (res && res.success) {
      const reply =
        (res.data && res.data.reply) ||
        "Maaf, saya belum menemukan jawabannya.";
      aiChatAppendBubble("assistant", reply);
      aiChatState.history.push({ role: "assistant", text: reply });
    } else {
      const msg =
        (res && res.message) || "Terjadi kesalahan saat memproses pertanyaan.";
      aiChatAppendBubble("assistant", "⚠️ " + msg);
    }
  } catch (err) {
    if (pendingBubble) pendingBubble.remove();
    aiChatAppendBubble("assistant", "⚠️ Gagal terhubung ke server. Coba lagi.");
  } finally {
    aiChatSetLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const fab = $("fabAiChat");
  if (fab) fab.addEventListener("click", openAiChat);

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
      aiChatSend($("aiChatInput") ? $("aiChatInput").value : "");
    });
  }

  document.querySelectorAll(".ai-chat-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      aiChatSend(this.dataset.q || this.textContent);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const overlayEl = $("aiChatOverlay");
      if (overlayEl && !overlayEl.classList.contains("hidden")) closeAiChat();
    }
  });

  document
    .getElementById("fabAiChat")
    .addEventListener("mouseenter", function () {
      this.querySelector("svg").style.transform = "rotate(180deg) scale(1.1)";
    });

  document
    .getElementById("fabAiChat")
    .addEventListener("mouseleave", function () {
      this.querySelector("svg").style.transform = "rotate(0deg) scale(1)";
    });
});

window.openAiChat = openAiChat;
window.closeAiChat = closeAiChat;
window.aiChatSend = aiChatSend;
