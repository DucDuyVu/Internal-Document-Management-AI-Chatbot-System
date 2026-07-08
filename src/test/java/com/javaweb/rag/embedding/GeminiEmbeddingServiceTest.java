package com.javaweb.rag.embedding;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm tra GeminiEmbeddingService đã hoạt động đúng
 * khi được Spring quản lý.
 *
 * Mục tiêu:
 * - Spring inject được EmbeddingService
 * - Gọi được Gemini API
 * - Nhận đúng vector 3072 chiều
 */
@SpringBootTest
@ActiveProfiles("test")
class GeminiEmbeddingServiceTest {

    @Autowired
    private EmbeddingService embeddingService;

    @Test
    void shouldGenerateDocumentEmbedding() {

        float[] embedding =
                embeddingService.embedDocument("Đây là tài liệu test.");

        assertNotNull(embedding);

        assertEquals(3072, embedding.length);

        System.out.println("Embedding length = " + embedding.length);
    }
}