(() => {
  "use strict";

  // ── DOM refs ──────────────────────────────────
  const $chatbot = document.getElementById("chatbot");
  const $fab = document.getElementById("chat-fab");
  const $messages = document.getElementById("chat-messages");
  const $input = document.getElementById("chat-input");
  const $sendBtn = document.getElementById("btn-send");
  const $clearBtn = document.getElementById("btn-clear");
  const $newChatBtn = document.getElementById("btn-new-chat");
  const $welcome = document.getElementById("welcome");

  // ── State ─────────────────────────────────────
  let currentSessionId = generateId();
  let sessions = loadSessions();
  let sending = false;
  let isOpen = false;

  // ── Utilities ─────────────────────────────────
  function generateId() {
    return "s_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadSessions() {
    try {
      return JSON.parse(localStorage.getItem("beek_sessions") || "[]");
    } catch {
      return [];
    }
  }

  function saveSessions() {
    localStorage.setItem("beek_sessions", JSON.stringify(sessions));
  }

  function getCurrentSession() {
    return sessions.find((s) => s.id === currentSessionId);
  }

  // ── Widget toggle ─────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    $chatbot.classList.toggle("open", isOpen);
    $fab.classList.toggle("open", isOpen);
    if (isOpen) {
      $input.focus();
      scrollToBottom();
    }
  }

  $fab.addEventListener("click", toggleChat);

  // ── Minimal Markdown → HTML ───────────────────
  function md(text) {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Blockquotes
    html = html.replace(/((?:^&gt; .+\n?)+)/gm, (block) => {
      const text = block.replace(/^&gt; /gm, "").trim();
      return `<blockquote>${text}</blockquote>`;
    });

    html = html.replace(/((?:^[-•] .+\n?)+)/gm, (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((l) => `<li>${l.replace(/^[-•]\s*/, "")}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    });

    html = html.replace(/((?:^\d+\.\s.+\n?)+)/gm, (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((l) => `<li>${l.replace(/^\d+\.\s*/, "")}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    });

    html = html.replace(/\n{2,}/g, "</p><p>");
    html = `<p>${html}</p>`;
    html = html.replace(/<p>\s*(<(?:h[1-3]|ul|ol)>)/g, "$1");
    html = html.replace(/(<\/(?:h[1-3]|ul|ol)>)\s*<\/p>/g, "$1");
    html = html.replace(/<p>\s*<\/p>/g, "");

    return html;
  }

  // ── Render helpers ────────────────────────────
  const BIRD_AVATAR = `<svg viewBox="0 0 1582.55 2048" width="16" height="20" style="display:block"><g transform="matrix(1,0,0,1,791.27,1024)"><path d="M-66.794,420.344 L280.715,420.344 C280.715,420.344 280.715,-67.97 280.715,-195.244 C280.715,-347.787 157.056,-471.446 4.513,-471.446 C-148.03,-471.446 -270.787,-347.787 -270.787,-195.244 L-270.787,216.352 C-270.787,329.179 -179.622,420.344 -66.794,420.344 Z" fill="none" stroke-width="69.12" stroke="#7132f5" stroke-linecap="square" stroke-linejoin="miter"/><path d="M-332.059,141.88 L-622.17,-25.55 L-332.059,-192.982 Z" fill="#7132f5"/><path d="M218.247,355.761 L218.247,188.33 C218.247,95.8 143.344,20.9 50.816,20.9 C-41.711,20.9 -116.614,95.8 -116.614,188.33 C-116.614,280.857 -41.711,355.761 50.816,355.761 Z" fill="#7132f5"/><path d="M340.357,184.568 L340.357,454.904 L418.468,454.904 C492.879,454.904 553.636,394.146 553.636,319.736 C553.636,245.325 492.879,184.568 418.468,184.568 Z" fill="#7132f5"/></g></svg>`;

  const ICON_COPY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
  const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  const ICON_RETRY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`;
  const ICON_REPLY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>`;

  function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = ICON_CHECK;
      btn.classList.add("msg-action-done");
      setTimeout(() => {
        btn.innerHTML = ICON_COPY;
        btn.classList.remove("msg-action-done");
      }, 1500);
    });
  }

  // ── Reply quote state ─────────────────────────
  let replyQuote = null;

  function setReplyQuote(text) {
    replyQuote = text;
    renderReplyPreview();
    $input.focus();
  }

  function clearReplyQuote() {
    replyQuote = null;
    renderReplyPreview();
  }

  function renderReplyPreview() {
    let $preview = document.getElementById("reply-preview");
    if (!replyQuote) {
      if ($preview) $preview.remove();
      return;
    }
    if (!$preview) {
      $preview = document.createElement("div");
      $preview.id = "reply-preview";
      $preview.className = "cb-reply-preview";
      const $wrap = document.querySelector(".cb-input-wrap");
      $wrap.insertBefore($preview, $wrap.firstChild);
    }
    const truncated = replyQuote.length > 80 ? replyQuote.slice(0, 80) + "…" : replyQuote;
    $preview.innerHTML = `
      <div class="reply-preview-bar"></div>
      <div class="reply-preview-text">${escapeHtml(truncated)}</div>
      <button class="reply-preview-close" aria-label="Cancel reply">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    $preview.querySelector(".reply-preview-close").addEventListener("click", clearReplyQuote);
  }

  function createMessageEl(role, content, { isError = false } = {}) {
    const div = document.createElement("div");
    div.className = `message ${role}${isError ? " error-msg" : ""}`;
    div.dataset.raw = content;

    if (role === "user") {
      div.innerHTML = `
        <div class="msg-body">
          <div class="msg-content">${md(content)}</div>
          <div class="msg-actions">
            <button class="msg-action" data-action="copy" title="Copy">${ICON_COPY}</button>
          </div>
        </div>`;
    } else {
      div.innerHTML = `
        <div class="msg-avatar">${BIRD_AVATAR}</div>
        <div class="msg-body">
          <div class="msg-label">Beek</div>
          <div class="msg-content">${md(content)}</div>
          <div class="msg-actions">
            <button class="msg-action" data-action="copy" title="Copy">${ICON_COPY}</button>
            ${isError ? `<button class="msg-action" data-action="retry" title="Retry">${ICON_RETRY}</button>` : `<button class="msg-action" data-action="reply" title="Reply">${ICON_REPLY}</button>`}
          </div>
        </div>`;
    }

    // Wire up action buttons
    div.querySelectorAll(".msg-action").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "copy") {
          copyToClipboard(content, btn);
        } else if (action === "retry") {
          retryLastMessage(div);
        } else if (action === "reply") {
          // Use selected text within the message, or full content
          const sel = window.getSelection();
          let quoteText = "";
          if (sel && sel.toString().trim() && div.contains(sel.anchorNode)) {
            quoteText = sel.toString().trim();
          } else {
            quoteText = content;
          }
          setReplyQuote(quoteText);
        }
      });
    });

    return div;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function addTypingIndicator() {
    const div = document.createElement("div");
    div.className = "message assistant";
    div.id = "typing";
    div.innerHTML = `
      <div class="msg-avatar">${BIRD_AVATAR}</div>
      <div class="msg-body">
        <div class="msg-label">Beek</div>
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>`;
    $messages.appendChild(div);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    document.getElementById("typing")?.remove();
  }

  function scrollToBottom() {
    $messages.scrollTo({ top: $messages.scrollHeight, behavior: "smooth" });
  }

  function hideWelcome() {
    if ($welcome) $welcome.style.display = "none";
  }

  function showWelcome() {
    if ($welcome) $welcome.style.display = "";
  }

  function renderChat() {
    const children = [...$messages.children];
    children.forEach((c) => {
      if (c !== $welcome) c.remove();
    });

    const session = getCurrentSession();
    if (!session || session.messages.length === 0) {
      showWelcome();
      return;
    }
    hideWelcome();
    for (const msg of session.messages) {
      $messages.appendChild(createMessageEl(msg.role, msg.content));
    }
    scrollToBottom();
  }

  // ── Retry last failed message ───────────────────
  function retryLastMessage(errorEl) {
    const session = getCurrentSession();
    if (!session || session.messages.length === 0) return;

    // Find the last user message
    let lastUserMsg = null;
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].role === "user") {
        lastUserMsg = session.messages[i];
        break;
      }
    }
    if (!lastUserMsg) return;

    // Remove the error element from DOM
    errorEl.remove();

    // Remove the last user message from session (sendMessage will re-add it)
    // Find and remove the last user entry
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].role === "user") {
        session.messages.splice(i, 1);
        break;
      }
    }
    saveSessions();

    // Also remove the user message bubble from DOM (the one right before the error)
    const allMsgs = $messages.querySelectorAll(".message.user");
    if (allMsgs.length > 0) {
      allMsgs[allMsgs.length - 1].remove();
    }

    // Re-send
    sendMessage(lastUserMsg.content);
  }

  // ── API call ──────────────────────────────────
  async function sendMessage(text) {
    if (sending || !text.trim()) return;
    sending = true;
    $sendBtn.disabled = true;

    // If there's a reply quote, prepend it
    let fullText = text;
    if (replyQuote) {
      fullText = `> ${replyQuote}\n\n${text}`;
      clearReplyQuote();
    }

    // Auto-open widget if closed
    if (!isOpen) toggleChat();

    hideWelcome();

    let session = getCurrentSession();
    if (!session) {
      session = { id: currentSessionId, title: "", messages: [] };
      sessions.push(session);
    }

    session.messages.push({ role: "user", content: fullText });
    $messages.appendChild(createMessageEl("user", fullText));
    scrollToBottom();

    if (!session.title) {
      session.title = text.length > 50 ? text.slice(0, 50) + "…" : text;
    }
    saveSessions();

    addTypingIndicator();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullText, sessionId: currentSessionId }),
      });

      const data = await res.json();
      removeTypingIndicator();

      if (!res.ok) throw new Error(data.error || "Request failed");

      const reply = data.reply;
      session.messages.push({ role: "assistant", content: reply });
      $messages.appendChild(createMessageEl("assistant", reply));
      saveSessions();
    } catch (err) {
      removeTypingIndicator();
      const errorMsg = `⚠️ Something went wrong: ${err.message}. Try again.`;
      $messages.appendChild(createMessageEl("assistant", errorMsg, { isError: true }));
    }

    scrollToBottom();
    sending = false;
    updateSendBtn();
  }

  // ── Confirm Modal ─────────────────────────────
  function showConfirmModal(message, onConfirm) {
    document.getElementById("confirm-modal")?.remove();

    const modal = document.createElement("div");
    modal.id = "confirm-modal";
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-box">
        <div class="modal-icon">🗑️</div>
        <p class="modal-message">${message}</p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-cancel" id="modal-cancel">Cancel</button>
          <button class="modal-btn modal-btn-confirm" id="modal-confirm">Delete</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("active"));

    const close = () => modal.remove();
    modal.querySelector("#modal-cancel").addEventListener("click", close);
    modal.querySelector("#modal-confirm").addEventListener("click", () => {
      close();
      onConfirm();
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
  }

  // ── Clear / New Chat ──────────────────────────
  function clearChat() {
    const session = getCurrentSession();
    if (!session || session.messages.length === 0) return;

    showConfirmModal("Delete this conversation? This can't be undone.", async () => {
      sessions = sessions.filter((s) => s.id !== currentSessionId);
      saveSessions();
      try {
        await fetch(`/api/session/${currentSessionId}`, { method: "DELETE" });
      } catch {}
      currentSessionId = generateId();
      renderChat();
      $input.focus();
    });
  }

  function newChat() {
    currentSessionId = generateId();
    renderChat();
    closeHistory();
    $input.focus();
  }

  // ── History Panel ─────────────────────────────
  let $historyPanel = null;

  function createHistoryPanel() {
    if ($historyPanel) return;

    $historyPanel = document.createElement("div");
    $historyPanel.className = "cb-history";
    $historyPanel.id = "history-panel";
    $historyPanel.innerHTML = `
      <div class="cb-history-header">
        <span class="cb-history-title">Chat History</span>
        <button class="cb-history-close" id="history-close" aria-label="Close history">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="cb-history-list" id="history-list"></div>
      <button class="cb-history-new-btn" id="history-new-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Conversation
      </button>`;

    $chatbot.appendChild($historyPanel);

    $historyPanel.querySelector("#history-close").addEventListener("click", closeHistory);
    $historyPanel.querySelector("#history-new-btn").addEventListener("click", () => {
      newChat();
    });
  }

  function renderHistoryList() {
    const $list = document.getElementById("history-list");
    if (!$list) return;
    $list.innerHTML = "";

    const sorted = [...sessions].reverse();

    if (sorted.length === 0) {
      $list.innerHTML = `
        <div class="cb-history-empty">
          <div class="cb-history-empty-icon">💬</div>
          <span>No conversations yet</span>
        </div>`;
      return;
    }

    for (const s of sorted) {
      const msgCount = s.messages.length;
      const item = document.createElement("div");
      item.className = `cb-history-item${s.id === currentSessionId ? " active" : ""}`;
      item.innerHTML = `
        <div class="cb-history-icon">💬</div>
        <div class="cb-history-info">
          <div class="cb-history-info-title">${escapeHtml(s.title || "New chat")}</div>
          <div class="cb-history-info-count">${msgCount} message${msgCount !== 1 ? "s" : ""}</div>
        </div>
        <button class="cb-history-delete" title="Delete conversation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>`;

      // Click the row (not the delete button) to switch session
      item.addEventListener("click", (e) => {
        if (e.target.closest(".cb-history-delete")) return;
        currentSessionId = s.id;
        renderChat();
        closeHistory();
        scrollToBottom();
      });

      // Delete button
      item.querySelector(".cb-history-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        showConfirmModal("Delete this conversation? This can't be undone.", async () => {
          sessions = sessions.filter((sess) => sess.id !== s.id);
          saveSessions();
          try {
            await fetch(`/api/session/${s.id}`, { method: "DELETE" });
          } catch {}

          // If we deleted the active session, switch to a new one
          if (s.id === currentSessionId) {
            currentSessionId = generateId();
            renderChat();
          }
          renderHistoryList();
        });
      });

      $list.appendChild(item);
    }
  }

  function toggleHistory() {
    createHistoryPanel();
    renderHistoryList();
    $historyPanel.classList.toggle("open");
  }

  function closeHistory() {
    if ($historyPanel) $historyPanel.classList.remove("open");
  }

  // ── Input handling ────────────────────────────
  function updateSendBtn() {
    $sendBtn.disabled = !$input.value.trim() || sending;
  }

  function autoResize() {
    $input.style.height = "auto";
    $input.style.height = Math.min($input.scrollHeight, 100) + "px";
  }

  $input.addEventListener("input", () => {
    updateSendBtn();
    autoResize();
  });

  $input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!$sendBtn.disabled) {
        const text = $input.value.trim();
        $input.value = "";
        autoResize();
        updateSendBtn();
        sendMessage(text);
      }
    }
  });

  $sendBtn.addEventListener("click", () => {
    const text = $input.value.trim();
    $input.value = "";
    autoResize();
    updateSendBtn();
    sendMessage(text);
  });

  $clearBtn.addEventListener("click", clearChat);
  $newChatBtn.addEventListener("click", toggleHistory);

  // Quick prompts
  document.querySelectorAll(".cb-quick").forEach((btn) => {
    btn.addEventListener("click", () => sendMessage(btn.dataset.prompt));
  });

  // ── Init ──────────────────────────────────────
  renderChat();
})();
