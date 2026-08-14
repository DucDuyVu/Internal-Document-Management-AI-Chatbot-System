package com.javaweb.dto.chat;

import java.util.List;

/**
 * ChatQuestionRequest ? DTO nhan request body cua POST /api/chat/ask.
 *
 * Chua sessionId (phien nao), question (noi dung hoi) va history
 * (lich su hoi thoai gan nhat de AI nho ngu canh).
 *
 * departmentId lay tu JWT token o tang Controller, khong qua DTO nay.
 */
public class ChatQuestionRequest {

    private String question;

    /**
     * ID cua chat session ma cau hoi nay thuoc ve.
     */
    private Long sessionId;

    /**
     * Lich su hoi thoai gan nhat, toi da 5 cap Q&A.
     * Frontend gui len cung moi cau hoi de AI hieu ngu canh cau hoi tiep noi.
     * Co the null hoac rong neu day la cau hoi dau tien trong phien.
     */
    private List<ChatHistoryItem> history;

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public List<ChatHistoryItem> getHistory() { return history; }
    public void setHistory(List<ChatHistoryItem> history) { this.history = history; }
}
