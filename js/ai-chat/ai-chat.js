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

function aiChatAppendBubble(role, text, opts) {
  opts = opts || {};

  const box = $("aiChatMessages");
  if (!box) return null;

  const bubble = document.createElement("div");
  bubble.className = "ai-chat-bubble " + role + (opts.pending ? " pending" : "");

  const p = document.createElement("p");
  p.textContent = text;
  bubble.appendChild(p);

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
        (res.data && res.data.reply) || "Maaf, saya belum menemukan jawabannya.";
      aiChatAppendBubble("assistant", reply);
      aiChatState.history.push({ role: "assistant", text: reply });
    } else {
      const msg = (res && res.message) || "Terjadi kesalahan saat memproses pertanyaan.";
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
});

window.openAiChat = openAiChat;
window.closeAiChat = closeAiChat;
window.aiChatSend = aiChatSend;
