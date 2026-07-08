package com.javaweb.rag.embedding;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Service triển khai việc sinh vector embedding bằng Google Gemini.
 *
 * Nhiệm vụ:
 * - Gọi Google Gemini Embedding API.
 * - Sinh embedding cho Document.
 * - Sinh embedding cho Query.
 *
 * Tại sao cần class này?
 * - Toàn bộ project chỉ giao tiếp với EmbeddingService.
 * - Không class nào khác biết endpoint hay JSON của Gemini.
 *
 * Được sử dụng bởi:
 * - DocumentProcessingService (Ingestion Pipeline)
 * - Query Pipeline (Tuần 3)
 */
@Service
public class GeminiEmbeddingService implements EmbeddingService {

    /**
     * RestTemplate dùng để gọi HTTP tới Gemini API.
     */
    private final RestTemplate restTemplate;

    /**
     * Constructor để Spring tự inject RestTemplate.
     * (Viết tay thay cho Lombok @RequiredArgsConstructor)
     */
    public GeminiEmbeddingService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * API Key đọc từ application.properties.
     */
    @Value("${gemini.api.key}")
    private String apiKey;

    /**
     * URL của Gemini Embedding API.
     */
    @Value("${gemini.api.embedding-url}")
    private String embeddingUrl;

    /**
     * Sinh embedding cho Document.
     *
     * Được gọi khi upload PDF.
     *
     * @param content Nội dung chunk.
     * @return Vector embedding.
     */
    @Override
    public float[] embedDocument(String content) {
        return embed(content, "RETRIEVAL_DOCUMENT");
    }

    /**
     * Sinh embedding cho Query.
     *
     * Được gọi khi người dùng đặt câu hỏi.
     *
     * @param question Câu hỏi.
     * @return Vector embedding.
     */
    @Override
    public float[] embedQuery(String question) {
        return embed(question, "RETRIEVAL_QUERY");
    }

    /**
     * Hàm dùng chung để gọi Gemini.
     *
     * Quy trình:
     * 1. Tạo request.
     * 2. Tạo header.
     * 3. Gửi HTTP POST.
     * 4. Nhận response.
     * 5. Kiểm tra dữ liệu.
     * 6. Trả về embedding.
     *
     * @param text Nội dung cần embedding.
     * @param taskType RETRIEVAL_DOCUMENT hoặc RETRIEVAL_QUERY.
     * @return Vector embedding.
     */
    private float[] embed(String text, String taskType) {

        // Tạo request gửi tới Gemini.
        GeminiEmbeddingRequest request =
                new GeminiEmbeddingRequest(text, taskType);

        // Chuẩn bị Header.
        HttpHeaders headers = new HttpHeaders();
        headers.set("x-goog-api-key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Ghép Header + Body.
        HttpEntity<GeminiEmbeddingRequest> entity =
                new HttpEntity<>(request, headers);

        // Gửi HTTP Request.
        ResponseEntity<GeminiEmbeddingResponse> response =
                restTemplate.postForEntity(
                        embeddingUrl,
                        entity,
                        GeminiEmbeddingResponse.class
                );

        // Kiểm tra Response.
        if (response.getBody() == null ||
                response.getBody().getEmbedding() == null) {

            throw new IllegalStateException(
                    "Invalid Gemini response.");
        }

        float[] values =
                response.getBody()
                        .getEmbedding()
                        .getValues();

        if (values == null) {
            throw new IllegalStateException(
                    "Embedding values are null.");
        }

        return values;
    }

    /*
     * ===============================================================
     *              FLOW CỦA GEMINI EMBEDDING SERVICE
     * ===============================================================
     *
     * DocumentProcessingService
     *            │
     *            ▼
     * embedDocument(chunk)
     *            │
     *            ▼
     * embed(...)
     *            │
     *            ▼
     * GeminiEmbeddingRequest
     *            │
     *            ▼
     * RestTemplate
     *            │
     *            ▼
     * Google Gemini API
     *            │
     *            ▼
     * GeminiEmbeddingResponse
     *            │
     *            ▼
     * float[]
     *            │
     *            ▼
     * DocumentProcessingService
     *            │
     *            ▼
     * document_chunks.embedding
     *
     * ===============================================================
     */
}