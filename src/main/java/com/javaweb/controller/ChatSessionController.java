package com.javaweb.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.chat.ChatSessionRequest;
import com.javaweb.dto.chat.ChatSessionResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.service.ChatMessageService;
import com.javaweb.service.ChatSessionService;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.javaweb.dto.chat.ChatMessageHistoryResponse;
import com.javaweb.service.ChatMessageService;

/**
 * ChatSessionController — REST Controller xử lý các request liên quan đến
 * vòng đời chat session (tạo, liệt kê, xoá mềm).
 *
 * Nhiệm vụ: Nhận HTTP request, đọc UsersEntity từ SecurityContext,
 * uỷ quyền xử lý cho ChatSessionService, trả HTTP response.
 *
 * Tại sao lấy UsersEntity trực tiếp từ principal chứ không dùng
 * getName(): JwtAuthenticationFilter set principal = UsersEntity object
 * (không phải String), nên Authentication.getName() không trả về email
 * mà trả về Object.toString() mặc định (vô nghĩa, dạng "Class@hash").
 * Phải ép kiểu principal về UsersEntity mới lấy đúng dữ liệu user.
 *
 * Được tầng nào gọi: Spring DispatcherServlet điều phối request đến đây
 * sau khi JwtAuthenticationFilter xác thực token thành công.
 */
@RestController
@RequestMapping("/api/chat")
public class ChatSessionController {

    private final ChatSessionService chatSessionService;
    private final ChatMessageService chatMessageService;

    public ChatSessionController(ChatSessionService chatSessionService,
                                  ChatMessageService chatMessageService) {
        this.chatSessionService = chatSessionService;
        this.chatMessageService = chatMessageService;
    }

    /**
     * Tạo chat session mới cho user đang đăng nhập.
     *
     * Được gọi từ: POST /api/chat/sessions
     * Input: JSON body { "title": "..." } — title có thể bỏ trống hoặc null.
     * Output: 201 Created + ChatSessionResponse(id, title, createdAt).
     * Lưu ý: principal trong SecurityContext là UsersEntity đầy đủ (đã
     *         được JwtAuthenticationFilter query sẵn từ DB) — ép kiểu
     *         thẳng, KHÔNG query lại DB ở Service nữa (tránh N+1 vô ích).
     */
    @PostMapping("/sessions")
    public ResponseEntity<ChatSessionResponse> createSession(
            @RequestBody(required = false) ChatSessionRequest request) {

        // Lấy Authentication hiện tại — JwtAuthenticationFilter đã set
        // sẵn sau khi xác thực JWT thành công (xem JwtAuthenticationFilter,
        // dòng tạo UsernamePasswordAuthenticationToken)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // Ép kiểu principal về UsersEntity — đây là điểm mấu chốt khác với
        // bản trước: KHÔNG dùng authentication.getName(), vì principal ở
        // đây không phải String/UserDetails nên getName() trả sai giá trị
        UsersEntity currentUser = (UsersEntity) authentication.getPrincipal();

        if (request == null) {
            request = new ChatSessionRequest();
        }

        ChatSessionResponse response = chatSessionService.createSession(request, currentUser);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    /**
     * Lấy danh sách session của user đang đăng nhập.
     *
     * Được gọi từ: GET /api/chat/sessions
     * Input: không có body — user xác định qua JWT trong header Authorization.
     * Output: 200 OK + danh sách ChatSessionResponse, sort updatedAt giảm dần.
     * Lưu ý: cùng cách lấy currentUser như createSession() — ép kiểu thẳng
     *        principal về UsersEntity, không dùng getName().
     */
    @GetMapping("/sessions")
    public ResponseEntity<List<ChatSessionResponse>> getSessions() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UsersEntity currentUser = (UsersEntity) authentication.getPrincipal();

        List<ChatSessionResponse> response = chatSessionService.getSessions(currentUser);

        return ResponseEntity.ok(response);
    }
    /**
     * Lấy lịch sử tin nhắn của 1 session, kèm nguồn trích dẫn.
     *
     * Được gọi từ: GET /api/chat/sessions/{id}/messages
     * Input: id session lấy từ path variable — không có body.
     * Output: 200 OK + danh sách ChatMessageHistoryResponse, cũ -> mới.
     * Lưu ý: cùng cách lấy currentUser như 2 method trên — ép kiểu
     *        principal, không dùng getName(). Việc validate session có
     *        thuộc currentUser hay không nằm ở tầng Service, Controller
     *        không tự kiểm tra lại.
     */
    @GetMapping("/sessions/{id}/messages")
    public ResponseEntity<List<ChatMessageHistoryResponse>> getMessages(@PathVariable Long id) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UsersEntity currentUser = (UsersEntity) authentication.getPrincipal();

        List<ChatMessageHistoryResponse> response = chatMessageService.getMessageHistory(id, currentUser);

        return ResponseEntity.ok(response);
    }
}

/*
 * ============================================================
 * FLOW — ChatSessionController.createSession()  (đã sửa)
 * ============================================================
 *
 *  POST /api/chat/sessions
 *      │
 *      ▼
 *  JwtAuthenticationFilter
 *      │  validate token → query UsersEntity từ DB
 *      │  set Authentication(principal = UsersEntity, ...)
 *      ▼
 *  SecurityContextHolder.getAuthentication().getPrincipal()
 *      │  ép kiểu → UsersEntity currentUser  (KHÔNG dùng getName())
 *      ▼
 *  chatSessionService.createSession(request, currentUser)
 *      │
 *      ▼
 *  ResponseEntity 201 Created
 *      body: { "id": 1, "title": "...", "createdAt": "..." }
 *
 * ============================================================
 */