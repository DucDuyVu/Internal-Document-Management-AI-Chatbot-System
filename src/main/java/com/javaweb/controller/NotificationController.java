package com.javaweb.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.response.NotificationResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping("/unread")
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        UsersEntity user = userDetails.getUser();
        
        List<NotificationResponse> notifications = notificationService.getUnreadNotifications(user);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/all")
    public ResponseEntity<List<NotificationResponse>> getAllNotifications(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        UsersEntity user = userDetails.getUser();
        
        List<NotificationResponse> notifications = notificationService.getAllNotifications(user);
        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<String> markAsRead(@PathVariable Long id, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        UsersEntity user = userDetails.getUser();
        
        notificationService.markAsRead(id, user);
        return ResponseEntity.ok("Đã đánh dấu là đã đọc");
    }
}
