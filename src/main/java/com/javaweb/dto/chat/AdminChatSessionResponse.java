package com.javaweb.dto.chat;

import java.time.LocalDateTime;

public class AdminChatSessionResponse {

    private Long id;
    private String userName;
    private Long messageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String title;

    public AdminChatSessionResponse() {
    }

    public AdminChatSessionResponse(Long id, String userName, Long messageCount, LocalDateTime createdAt, LocalDateTime updatedAt, String title) {
        this.id = id;
        this.userName = userName;
        this.messageCount = messageCount;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.title = title;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public Long getMessageCount() {
        return messageCount;
    }

    public void setMessageCount(Long messageCount) {
        this.messageCount = messageCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
