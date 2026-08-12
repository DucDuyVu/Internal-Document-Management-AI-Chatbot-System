package com.javaweb.rag.chat;

import java.util.List;

/**
 * DTO đại diện cho request gửi tới Gemini Chat API (endpoint generateContent).
 *
 * Cấu trúc JSON tương ứng:
 * {
 *   "contents": [
 *     { "parts": [ { "text": "prompt ở đây" } ] }
 *   ]
 * }
 *
 * Khác với GeminiEmbeddingRequest: KHÔNG có field "model" (tên model nằm
 * trong URL của endpoint generateContent, không nằm trong body), và KHÔNG
 * có "task_type" (sinh câu trả lời không phân biệt loại tác vụ).
 *
 * Được tầng nào gọi: GeminiChatService.generateAnswer(), tạo 1 request
 * mới cho mỗi lần gọi Gemini Chat API.
 */
public class GeminiChatRequest {

    private List<Content> contents;
    private GenerationConfig generationConfig;

    /**
     * @param prompt chuỗi prompt hoàn chỉnh do PromptBuilder.build() tạo ra
     */
    public GeminiChatRequest(String prompt) {
        this.contents = List.of(new Content(List.of(new Content.Part(prompt))));
        this.generationConfig = new GenerationConfig(0.1);
    }

    public List<Content> getContents() {
        return contents;
    }

    public GenerationConfig getGenerationConfig() {
        return generationConfig;
    }

    public static class GenerationConfig {
        private double temperature;

        public GenerationConfig(double temperature) {
            this.temperature = temperature;
        }

        public double getTemperature() {
            return temperature;
        }
    }

    public static class Content {
        private List<Part> parts;

        public Content(List<Part> parts) {
            this.parts = parts;
        }

        public List<Part> getParts() {
            return parts;
        }

        public static class Part {
            private String text;

            public Part(String text) {
                this.text = text;
            }

            public String getText() {
                return text;
            }
        }
    }
}