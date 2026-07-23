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
    try {
      const messages = await apiRequest(
        "/api/chat/sessions/" + sessionId + "/messages",
      );
      (messages || []).forEach(function (msg) {
        appendMessageBubble(msg.role, msg.content, msg.createdAt);
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

  function appendMessageBubble(role, content, createdAt) {
    const isUser = String(role).toUpperCase() === "USER";
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message " + (isUser ? "user" : "assistant");
    wrapper.innerHTML =
      '<div class="chat-message-avatar">' +
      (isUser ? "🧑" : "🤖") +
      "</div>" +
      '<div class="chat-message-content">' +
      '  <div class="chat-message-text">' +
      escapeHtml(content) +
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
   * Gửi câu hỏi tới session đang chọn.
   * Request thật (ChatQuestionRequest): { sessionId, question }.
   * Response thật (ChatAnswerResponse): { answer, sources, distance } —
   * KHÔNG có messageId/sessionId trả về, nên tự vẽ bong bóng chat ngay
   * tại client thay vì gọi lại GET /messages.
   */
  async function askQuestion(question) {
    appendMessageBubble("USER", question, new Date().toISOString());
    chatInput.value = "";
    chatInput.style.height = "auto";
    updateSendButtonState();
    messageListEl.scrollTop = messageListEl.scrollHeight;

    try {
      const data = await apiRequest("/api/chat/ask", {
        method: "POST",
        body: {
          sessionId: currentSessionId,
          question: question,
        },
      });
      appendMessageBubble("ASSISTANT", data.answer, new Date().toISOString());
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
})();
