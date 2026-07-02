package com.javaweb.rag.embedding;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * DTO đại diện cho request gửi tới Gemini Embedding API.
 * Cấu trúc JSON tương ứng:
 * {
 *   "model": "models/gemini-embedding-001",
 *   "content": {
 *     "parts": [{"text": "nội dung cần embed"}]
 *   }
 * }
 */
public class GeminiEmbeddingRequest {

    private String model;
    private Content content;

    @JsonProperty("task_type")
    private String taskType;

    public GeminiEmbeddingRequest(String text, String taskType) {
        this.model = "models/gemini-embedding-001";
        this.content = new Content(List.of(new Content.Part(text)));
        this.taskType = taskType;
    }

    public String getModel() { return model; }
    public Content getContent() { return content; }
    public String getTaskType() { return taskType; }

    public static class Content {
        private List<Part> parts;

        public Content(List<Part> parts) {
            this.parts = parts;
        }

        public List<Part> getParts() { return parts; }

        public static class Part {
            private String text;

            public Part(String text) {
                this.text = text;
            }

            public String getText() { return text; }
        }
    }
}
