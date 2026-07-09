package com.javaweb.rag.chat;

import java.util.List;

/**
 * DTO đại diện cho response nhận từ Gemini Chat API (endpoint generateContent).
 *
 * Cấu trúc JSON tương ứng:
 * {
 *   "candidates": [
 *     { "content": { "parts": [ { "text": "câu trả lời" } ] } }
 *   ]
 * }
 *
 * Vì sao có mảng "candidates" (khác Embedding chỉ có 1 "embedding" duy
 * nhất): về nguyên tắc, generateContent CÓ THỂ trả về nhiều phương án trả
 * lời cùng lúc (tham số candidateCount phía Gemini) — mặc định chỉ trả 1,
 * nên GeminiChatService luôn lấy phần tử đầu tiên (index 0).
 *
 * Cần có constructor không tham số (ngầm định, vì không khai báo
 * constructor nào khác trong class) + setter, vì Jackson deserialize
 * JSON -> object bằng cách tạo object rỗng rồi set từng field, khác với
 * GeminiChatRequest (Jackson chỉ cần serialize object -> JSON nên chỉ cần
 * getter).
 */
public class GeminiChatResponse {

    private List<Candidate> candidates;

    public List<Candidate> getCandidates() {
        return candidates;
    }

    public void setCandidates(List<Candidate> candidates) {
        this.candidates = candidates;
    }

    public static class Candidate {
        private Content content;

        public Content getContent() {
            return content;
        }

        public void setContent(Content content) {
            this.content = content;
        }
    }

    public static class Content {
        private List<Part> parts;

        public List<Part> getParts() {
            return parts;
        }

        public void setParts(List<Part> parts) {
            this.parts = parts;
        }
    }

    public static class Part {
        private String text;

        public String getText() {
            return text;
        }

        public void setText(String text) {
            this.text = text;
        }
    }
}