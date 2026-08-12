package com.javaweb.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.chat.AdminChatSessionResponse;
import com.javaweb.service.ChatSessionService;

@RestController
@RequestMapping("/api/admin/chat-sessions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminChatController {

    private final ChatSessionService chatSessionService;

    public AdminChatController(ChatSessionService chatSessionService) {
        this.chatSessionService = chatSessionService;
    }

    @GetMapping
    public ResponseEntity<Page<AdminChatSessionResponse>> getAllSessions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<AdminChatSessionResponse> sessions = chatSessionService.getAllSessionsForAdmin(pageable);
        
        return ResponseEntity.ok(sessions);
    }
}
