package com.javaweb.rag.embedding;

/**
 * DTO đại diện cho response nhận từ Gemini Embedding API.
 * Cấu trúc JSON tương ứng:
 * {
 *   "embedding": {
 *     "values": [0.1, -0.2, 0.9, ...]   // 3072 phần tử
 *   }
 * }
 */
public class GeminiEmbeddingResponse {

    private Embedding embedding;

    public Embedding getEmbedding() { return embedding; }
    public void setEmbedding(Embedding embedding) { this.embedding = embedding; }

    public static class Embedding {
        private float[] values;

        public float[] getValues() { return values; }
        public void setValues(float[] values) { this.values = values; }
    }
}
