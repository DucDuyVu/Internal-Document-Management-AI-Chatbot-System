/**
 * chat.js — Xử lý tương tác Chat phía client cho /user/chat (chat.html).
 *
 * Được gọi bởi: chat.html, sau khi auth.js/common.js/dashboard.js đã load
 * (qua layouts/user-layout.html). Dùng lại apiRequest() có sẵn trong
 * auth.js — hàm này tự gắn Authorization header, tự refresh token khi
 * 401, và ném Error khi response không ok (kể cả khi body không phải
 * JSON — ví dụ trang lỗi HTML 500 khi gửi question rỗng, đã kiểm chứng
 * qua Postman: Gemini từ chối embed chuỗi rỗng và
 * GlobalExceptionHandler hiện chưa bắt loại lỗi HttpClientErrorException
 * này, nên response thật là 500 HTML, không phải JSON).
 *
 * Luồng dữ liệu (ASCII flow):
 *
 *   [Trang load]
 *        |
 *        v
 *   loadSessions() --> GET /api/chat/sessions (ChatSessionResponse[])
 *        --> render .chat-session-item vào #session-list
 *        |
 *        v
 *   [User click session] --> selectSession(id)
 *        --> loadMessages(id)
 *        --> GET /api/chat/sessions/{id}/messages (ChatMessageHistoryResponse[])
 *        --> render .chat-message vào #message-list
 *        |
 *        v
 *   [User gõ câu hỏi + submit]
 *        |
 *        v
 *   chặn question rỗng tại client (bắt buộc — xem ghi chú trên)
 *        |
 *        v
 *   askQuestion() --> POST /api/chat/ask { sessionId, question }
 *        --> render answer (ChatAnswerResponse: answer, sources, distance)
 *        |
 *        v
 *   [User bấm Xóa] --> deleteCurrentSession()
 *        --> DELETE /api/chat/sessions/{id}
 */

(function () {
  "use strict";

  // Toàn bộ code phải chạy sau DOMContentLoaded để đảm bảo:
  // 1. Các element (#chat-form, #btn-send...) đã tồn tại trong DOM
  // 2. addEventListener được đăng ký trước khi user tương tác
  // Nếu script load sau DOMContentLoaded, readyState === 'complete'
  //  → gọi init() ngay; nếu chưa xong → chờ event.
  function init() {

  let currentSessionId = null;

  const sessionListEl = document.getElementById("session-list");
  const messageListEl = document.getElementById("message-list");
  const emptyStateEl = document.getElementById("chat-empty-state");
  const activeViewEl = document.getElementById("chat-active-view");
  const activeSessionTitleEl = document.getElementById("active-session-title");
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const btnSend = document.getElementById("btn-send");
  const btnNewSession = document.getElementById("btn-new-session");
  const btnDeleteSession = document.getElementById("btn-delete-session");

  // Trang này không phải /user/chat → không có các element → thoát sớm
  if (!chatForm || !btnNewSession) return;

  /**
   * Chặn gửi câu hỏi rỗng tại client — bắt buộc vì backend hiện trả
   * 500 HTML (không phải JSON) khi question rỗng, MVP chưa có thời
   * gian sửa GlobalExceptionHandler.
   */
  function updateSendButtonState() {
    const isEmpty = chatInput.value.trim().length === 0;
    btnSend.disabled = isEmpty || currentSessionId === null;
  }
  chatInput.addEventListener("input", updateSendButtonState);

  /** Tải danh sách session, render sidebar. */
  async function loadSessions() {
    try {
      const sessions = await apiRequest("/api/chat/sessions");
      renderSessionList(sessions || []);
    } catch (err) {
      console.error("Khong the tai danh sach session:", err.message);
    }
  }

  function renderSessionList(sessions) {
    sessionListEl.innerHTML = "";
    sessions.forEach(function (session) {
      const li = document.createElement("li");
      li.className =
        "chat-session-item" +
        (session.id === currentSessionId ? " active" : "");
      li.dataset.sessionId = session.id;
      li.innerHTML =
        '<div class="chat-session-title">' +
        escapeHtml(session.title || "Cuộc trò chuyện #" + session.id) +
        "</div>" +
        '<div class="chat-session-meta">' +
        formatTime(session.updatedAt) +
        "</div>";
      li.addEventListener("click", function () {
        selectSession(session.id, session.title);
      });
      sessionListEl.appendChild(li);
    });
  }

  /** Chọn 1 session, hiển thị khung chat, tải lịch sử tin nhắn. */
  async function selectSession(sessionId, title) {
    currentSessionId = sessionId;

    emptyStateEl.style.display = "none";
    activeViewEl.style.display = "flex";
    activeSessionTitleEl.textContent = title || "Cuộc trò chuyện #" + sessionId;

    document.querySelectorAll(".chat-session-item").forEach(function (el) {
      el.classList.toggle("active", Number(el.dataset.sessionId) === sessionId);
    });

    updateSendButtonState();
    await loadMessages(sessionId);
  }

  /**
   * Tải lịch sử tin nhắn của 1 session.
   * Field thật (ChatMessageHistoryResponse): id, role (enum
   * ChatMessageRole: USER/ASSISTANT/SYSTEM), content, createdAt, sources.
   */
  async function loadMessages(sessionId) {
    messageListEl.innerHTML = "";
    currentHistory = []; // Reset history khi đổi session
    try {
      const messages = await apiRequest(
        "/api/chat/sessions/" + sessionId + "/messages",
      );
      (messages || []).forEach(function (msg) {
        // Nạp lại lịch sử vào mảng để dùng cho lần gửi tiếp theo
        currentHistory.push({
          role: msg.role,
          content: msg.content
        });
        
        appendMessageBubble(msg.role, msg.content, msg.createdAt, msg.sources || msg.fileRefs);
      });
      messageListEl.scrollTop = messageListEl.scrollHeight;
    } catch (err) {
      // Đã xác nhận qua Postman: session không tồn tại/không thuộc
      // user hiện tại có thể trả 500 thay vì 403/404 chuẩn — chỉ
      // hiển thị thông báo chung, không cố đọc chi tiết lỗi.
      messageListEl.innerHTML =
        '<div class="chat-empty-state"><p>Không thể tải tin nhắn. Vui lòng thử lại.</p></div>';
    }
  }

  function appendMessageBubble(role, content, createdAt, sources) {
    const isUser = String(role).toUpperCase() === "USER";
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message " + (isUser ? "user" : "assistant");
    
    // Parse markdown for assistant messages
    const finalContent = isUser ? escapeHtml(content) : formatMessageContent(content, sources);
    
    wrapper.innerHTML =
      '<div class="chat-message-avatar">' +
      (isUser ? "🧑" : "🤖") +
      "</div>" +
      '<div class="chat-message-content">' +
      '  <div class="chat-message-text">' +
      finalContent +
      "</div>" +
      '  <div class="chat-message-time">' +
      formatTime(createdAt) +
      "</div>" +
      "</div>";
    messageListEl.appendChild(wrapper);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatTime(isoString) {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
    } catch (e) {
      return "";
    }
  }

  /** Tạo session mới, tự động chọn session đó. */
  async function createNewSession() {
    try {
      const session = await apiRequest("/api/chat/sessions", {
        method: "POST",
        body: {},
      });
      await loadSessions();
      await selectSession(session.id, session.title);
    } catch (err) {
      alert("Không thể tạo cuộc trò chuyện mới: " + err.message);
    }
  }
  btnNewSession.addEventListener("click", createNewSession);

  /**
   * Lịch sử hội thoại của phiên hiện tại (lưu ở Frontend, tối đa 5 cặp Q&A).
   * Reset mỗi khi đổi sang session khác.
   * Mỗi phần tử: { role: "USER"|"ASSISTANT", content: "..." }
   */
  let currentHistory = [];
  const MAX_HISTORY = 5; // Số cặp Q&A tối đa gửi lên Backend

  /**
   * Gửi câu hỏi tới session đang chọn.
   * Request thật (ChatQuestionRequest): { sessionId, question, history }.
   * Response thật (ChatAnswerResponse): { answer, sources, distance }.
   */
  async function askQuestion(question) {
    appendMessageBubble("USER", question, new Date().toISOString());
    chatInput.value = "";
    chatInput.style.height = "auto";
    updateSendButtonState();
    messageListEl.scrollTop = messageListEl.scrollHeight;

    // Lấy tối đa MAX_HISTORY cặp Q&A gần nhất để gửi lên
    const historyToSend = currentHistory.slice(-MAX_HISTORY * 2);

    try {
      const data = await apiRequest("/api/chat/ask", {
        method: "POST",
        body: {
          sessionId: currentSessionId,
          question: question,
          history: historyToSend,
        },
      });

      // Lưu câu hỏi và câu trả lời vào lịch sử local
      currentHistory.push({ role: "USER", content: question });
      currentHistory.push({ role: "ASSISTANT", content: data.answer });

      appendMessageBubble("ASSISTANT", data.answer, new Date().toISOString(), data.sources);
    } catch (err) {
      appendMessageBubble(
        "ASSISTANT",
        "Đã có lỗi xảy ra, vui lòng thử lại.",
        new Date().toISOString(),
      );
    }
    messageListEl.scrollTop = messageListEl.scrollHeight;
  }

  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const question = chatInput.value.trim();
    if (question.length === 0 || currentSessionId === null) {
      return;
    }
    askQuestion(question);
  });

  /** Xóa session đang xem, quay về trạng thái rỗng. */
  async function deleteCurrentSession() {
    if (currentSessionId === null) return;
    if (!confirm("Xóa cuộc trò chuyện này? Hành động không thể hoàn tác."))
      return;

    try {
      await apiRequest("/api/chat/sessions/" + currentSessionId, {
        method: "DELETE",
      });
      currentSessionId = null;
      activeViewEl.style.display = "none";
      emptyStateEl.style.display = "flex";
      await loadSessions();
    } catch (err) {
      alert("Không thể xóa cuộc trò chuyện: " + err.message);
    }
  }
  btnDeleteSession.addEventListener("click", deleteCurrentSession);

  document.addEventListener("DOMContentLoaded", function () {
    loadSessions();
    updateSendButtonState();
  });

  // Nếu DOMContentLoaded đã fire rồi (script load async/defer)
  if (document.readyState === "complete" || document.readyState === "interactive") {
    loadSessions();
    updateSendButtonState();
  }

  } // end init()

  // Gọi init() ngay sau khi DOM sẵn sàng
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();

// ===== NOTEBOOKLM CITATION POPOVER =====
function initCitationPopover() {
    if (document.getElementById('citation-popover')) return;
    const popover = document.createElement('div');
    popover.id = 'citation-popover';
    popover.className = 'citation-popover';
    popover.innerHTML = `
        <div class='citation-popover-title'><i class='fa-solid fa-file-lines'></i> <span id='citation-popover-title-text'></span></div>
        <div id='citation-popover-excerpt' class='citation-popover-excerpt'></div>
        <div style="margin-top: 10px; text-align: right;">
            <button id="citation-popover-link" class="btn-primary-sm" style="font-size: 0.75rem; padding: 4px 8px; display: none;"><i class="fa-solid fa-book-open"></i> Xem tài liệu gốc</button>
        </div>
    `;
    document.body.appendChild(popover);
    
    document.addEventListener('click', function(e) {
        if (popover.classList.contains('visible') && !popover.contains(e.target) && !e.target.closest('.citation-badge')) {
            if (window.hideCitationPopover) window.hideCitationPopover();
        }
    });
}

window.showCitationPopover = function(element, title, excerpt, docId, pageNumber) {
    const popover = document.getElementById('citation-popover');
    if (!popover) return;
    
    let displayTitle = title;
    if (pageNumber && pageNumber !== 'null' && pageNumber !== '') {
        displayTitle += ` (Trang ${pageNumber})`;
    }
    
    document.getElementById('citation-popover-title-text').textContent = displayTitle;
    document.getElementById('citation-popover-excerpt').textContent = '"' + excerpt + '"';
    
    const linkBtn = document.getElementById('citation-popover-link');
    if (linkBtn) {
        if (docId) {
            linkBtn.style.display = 'inline-block';
            linkBtn.onclick = function() {
                const token = typeof getAccessToken !== 'undefined' ? getAccessToken() : localStorage.getItem('accessToken');
                window.open('/api/documents/' + docId + '/view?token=' + token, '_blank');
            };
        } else {
            linkBtn.style.display = 'none';
        }
    }
    
    const rect = element.getBoundingClientRect();
    popover.style.display = 'block';
    const popoverHeight = popover.offsetHeight;
    
    popover.style.left = Math.max(10, rect.left - 130) + 'px';
    popover.style.top = (rect.top - popoverHeight - 10) + 'px';
    
    if (rect.top - popoverHeight - 10 < 0) {
        popover.style.top = (rect.bottom + 10) + 'px';
    }
    
    requestAnimationFrame(() => {
        popover.classList.add('visible');
    });
};

window.hideCitationPopover = function() {
    const popover = document.getElementById('citation-popover');
    if (popover) {
        popover.classList.remove('visible');
        setTimeout(() => {
            if (!popover.classList.contains('visible')) {
                popover.style.display = 'none';
            }
        }, 200);
    }
};

document.addEventListener('DOMContentLoaded', initCitationPopover);

function formatMessageContent(content, sources) {
    if (!content) return '';
    if (typeof marked === "undefined") {
        return content.replace(/\*\*(.*?)\*\*/g, '<strong></strong>').replace(/\n/g, '<br>');
    }
    let rawHtml = marked.parse(content);
    let cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['data-index', 'onmouseenter', 'onmouseleave'] });
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = cleanHtml;
    
    function processTextNodes(node) {
        if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase();
            if (["code", "pre", "a"].includes(tag)) return;
            Array.from(node.childNodes).forEach(processTextNodes);
        } else if (node.nodeType === 3) {
            if (/\[(\d+)\]/.test(node.nodeValue)) {
                const spanWrapper = document.createElement('span');
                const escapedText = node.nodeValue;
                spanWrapper.innerHTML = escapedText.replace(/\[(\d+)\]/g, function(m, numStr) {
                    const num = parseInt(numStr, 10);
                    if (sources && sources[num]) {
                        const source = sources[num];
                        const title = source.fileName || "Tài liệu";
                        const excerpt = source.excerpt || "";
                        const docId = source.documentId || '';
                        const p = source.pageNumber || '';
                        const t = title.replace(/'/g, "\\\'").replace(/"/g, '&quot;');
                        const e = excerpt.replace(/'/g, "\\\'").replace(/"/g, '&quot;');
                        return '<span class="citation-badge" data-index="' + num + '" ' +
                            'onclick="if(window.showCitationPopover) window.showCitationPopover(this, \'' + t + '\', \'' + e + '\', \'' + docId + '\', \'' + p + '\'); event.stopPropagation();">' + (num + 1) + '</span>';
                    }
                    return m;
                });
                node.replaceWith(...spanWrapper.childNodes);
            }
        }
    }
    Array.from(tempDiv.childNodes).forEach(processTextNodes);
    return tempDiv.innerHTML;
}
