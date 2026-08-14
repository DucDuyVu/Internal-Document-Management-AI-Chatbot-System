package com.javaweb.dto.chat;

/**
 * ChatHistoryItem ? ??i di?n cho 1 c?p tin nh?n trong l?ch s? h?i tho?i.
 *
 * ???c g?i t? Frontend l?n c?ng m?i c?u h?i m?i, t?i ?a 5 c?p g?n nh?t.
 * Backend gh?p danh s?ch n?y v?o Prompt ?? AI nh? ng? c?nh h?i tho?i.
 */
public class ChatHistoryItem {

    /** "USER" ho?c "ASSISTANT" */
    private String role;

    /** N?i dung tin nh?n */
    private String content;

    public ChatHistoryItem() {}

    public ChatHistoryItem(String role, String content) {
        this.role = role;
        this.content = content;
    }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
