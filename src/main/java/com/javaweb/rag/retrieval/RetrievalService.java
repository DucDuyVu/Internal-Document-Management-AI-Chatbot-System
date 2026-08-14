package com.javaweb.rag.retrieval;

import com.javaweb.dto.chat.ChatAnswerResponse;
import com.javaweb.dto.chat.ChatHistoryItem;
import java.util.List;

/**
 * RetrievalService ? cong vao duy nhat cua toan bo Query Pipeline (RAG Core).
 */
public interface RetrievalService {

    /**
     * Tra loi 1 cau hoi dua tren tai lieu ma user co quyen xem.
     *
     * @param question     cau hoi goc cua user
     * @param departmentId phong ban cua user; NULL neu Admin
     * @param history      lich su hoi thoai gan nhat (toi da 5 cap Q&A),
     *                     null hoac empty neu day la cau dau tien
     */
    ChatAnswerResponse ask(String question, Integer departmentId, List<ChatHistoryItem> history);
}
