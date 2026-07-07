package com.javaweb.rag;

import com.javaweb.entity.Document;
import com.javaweb.entity.DocumentChunk;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.repository.DocumentRepository;

import jakarta.transaction.Transactional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * DocumentProcessingIntegrationTest
 * ----------------------------------------------------------------
 * NHIỆM VỤ:
 *   Kiểm chứng toàn bộ Ingestion Pipeline chạy đúng với dữ liệu THẬT:
 *   PDF thật trên đĩa, Gemini API thật, PostgreSQL thật. Khác với
 *   unit test (dùng mock), test này xác nhận các module đã viết
 *   riêng lẻ (PdfParser, ChunkingService, EmbeddingService,
 *   DocumentChunkRepository) thực sự phối hợp đúng với nhau.
 *
 * TẠI SAO CẦN NÓ:
 *   - Đây là bằng chứng cụ thể nhất rằng Bước 7 (DocumentProcessingService)
 *     đã hoàn thành, trước khi chuyển sang xây Upload API ở Bước 8.
 *   - Test cả kịch bản retry để xác nhận deleteByDocumentId() hoạt
 *     động đúng, không để chunk bị nhân đôi khi xử lý lại 1 document.
 *
 * ĐƯỢC TẦNG NÀO GỌI:
 *   - Chạy độc lập qua `mvn test`, không phải code nghiệp vụ.
 *
 * LƯU Ý:
 *   - Test này GHI DỮ LIỆU THẬT vào PostgreSQL đang cấu hình ở
 *     application-local.properties. Method cleanup() ở cuối sẽ tự
 *     xoá dữ liệu test sau mỗi lần chạy, nhưng nếu test bị dừng giữa
 *     chừng (crash, Ctrl+C), có thể để lại rác cần xoá tay.
 *   - Tốn thời gian và gọi Gemini API thật cho mỗi chunk (không mock),
 *     nên thời gian chạy có thể mất 30-60 giây tuỳ độ dài PDF.
 * ----------------------------------------------------------------
 */
@SpringBootTest
@ActiveProfiles("test")
class DocumentProcessingIntegrationTest {

    /** Đường dẫn file PDF thật dùng để test, đặt sẵn trong thư mục uploads/. */
    private static final String TEST_PDF_PATH = "uploads/test.pdf";

    /** Thời gian tối đa chờ pipeline @Async xử lý xong, tính bằng giây. */
    private static final int TIMEOUT_SECONDS = 60;

    @Autowired
    private DocumentProcessingService documentProcessingService;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentChunkRepository documentChunkRepository;

    /** Id của Document được tạo trong test, dùng để dọn dẹp ở cleanup(). */
    private Long testDocumentId;

    /**
     * Kiểm tra toàn bộ pipeline: upload -> parse -> chunk -> embed -> save,
     * sau đó retry lại để xác nhận không sinh chunk trùng.
     *
     * DÙNG Ở ĐÂU:
     *   - Chạy qua `mvn test`, không gọi thủ công.
     *
     * INPUT:
     *   - Không có tham số; tự tạo Document test bên trong method.
     *
     * OUTPUT:
     *   - Không trả về gì; assert thất bại sẽ làm test fail.
     *
     * LƯU Ý:
     *   - Test này bao gồm cả kịch bản retry (gọi process() lần 2),
     *     đây là phần bắt buộc, không phải tuỳ chọn, để xác nhận
     *     đúng hành vi deleteByDocumentId() trước khi retry.
     */
    @Test
    void process_shouldParseChunkEmbedAndSave_thenNotDuplicateOnRetry() throws InterruptedException {
        // ----- Bước 1: Chuẩn bị 1 Document trỏ tới PDF thật -----
        Document document = new Document();
        document.setStatus(DocumentStatus.PENDING);
        document.setFileName("test.pdf");
        document.setFilePath(TEST_PDF_PATH);
        document.setFileType("application/pdf");
        document.setFileSize(1L); // giá trị giả, không ảnh hưởng tới pipeline
        document.setUploadedBy(1L); // giả định user id=1 đã tồn tại, chỉ dùng để test
        document.setCreatedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());
        document = documentRepository.save(document);
        testDocumentId = document.getId();

        // ----- Bước 2: Gọi pipeline lần 1 -----
        documentProcessingService.process(testDocumentId);
        waitUntilFinished(testDocumentId);

        Document afterFirstRun = documentRepository.findById(testDocumentId).orElseThrow();
        assertEquals(DocumentStatus.COMPLETED, afterFirstRun.getStatus(),
                "Document phải chuyển sang COMPLETED sau khi xử lý xong");

        List<DocumentChunk> chunksAfterFirstRun = documentChunkRepository.findByDocumentId(testDocumentId);
        assertFalse(chunksAfterFirstRun.isEmpty(), "Phải sinh ra ít nhất 1 chunk");

        // Kiểm tra chunk_index đúng thứ tự 0, 1, 2... không bị nhảy cóc/trùng
        for (int i = 0; i < chunksAfterFirstRun.size(); i++) {
            final int expectedIndex = i;
            boolean hasCorrectIndex = chunksAfterFirstRun.stream()
                    .anyMatch(c -> c.getChunkIndex() == expectedIndex);
            assertTrue(hasCorrectIndex, "Thiếu chunk_index = " + expectedIndex);
        }

        // Kiểm tra từng chunk có nội dung và embedding hợp lệ
        for (DocumentChunk chunk : chunksAfterFirstRun) {
            assertFalse(chunk.getContent().isBlank(), "Content không được rỗng/chỉ toàn khoảng trắng");
            assertNotNull(chunk.getEmbedding(), "Embedding không được null");
            assertEquals(3072, chunk.getEmbedding().length,
                    "Embedding phải đúng 3072 chiều (gemini-embedding-001)");
        }

        int chunkCountAfterFirstRun = chunksAfterFirstRun.size();

        // ----- Bước 3: Retry - gọi lại process() lần 2 trên cùng document -----
        documentProcessingService.process(testDocumentId);
        waitUntilFinished(testDocumentId);

        List<DocumentChunk> chunksAfterRetry = documentChunkRepository.findByDocumentId(testDocumentId);
        assertEquals(chunkCountAfterFirstRun, chunksAfterRetry.size(),
                "Retry không được sinh thêm chunk trùng lặp - deleteByDocumentId() phải xoá sạch trước khi insert lại");
    }

    /**
     * Chờ pipeline @Async xử lý xong bằng polling, thay vì Thread.sleep()
     * cố định.
     *
     * DÙNG Ở ĐÂU:
     *   - Chỉ dùng nội bộ trong test này.
     *
     * INPUT:
     *   - documentId: id của document đang chờ xử lý.
     *
     * OUTPUT:
     *   - Không trả về gì. Nếu status chuyển FAILED, test fail ngay
     *     lập tức thay vì chờ hết timeout. Nếu hết TIMEOUT_SECONDS
     *     mà vẫn PROCESSING, test cũng fail (không treo vô hạn).
     *
     * LƯU Ý:
     *   - Poll mỗi 1 giây; máy nhanh sẽ thoát sớm, máy chậm vẫn có
     *     đủ thời gian tối đa TIMEOUT_SECONDS trước khi báo lỗi.
     */
    private void waitUntilFinished(Long documentId) throws InterruptedException {
        for (int i = 0; i < TIMEOUT_SECONDS; i++) {
            Document current = documentRepository.findById(documentId).orElseThrow();

            if (current.getStatus() == DocumentStatus.COMPLETED) {
                return;
            }
            if (current.getStatus() == DocumentStatus.FAILED) {
                fail("Document xử lý thất bại: " + current.getErrorMessage());
            }

            Thread.sleep(1000);
        }
        fail("Hết " + TIMEOUT_SECONDS + " giây nhưng document vẫn chưa xử lý xong");
    }

    /**
     * Dọn dẹp dữ liệu test khỏi PostgreSQL thật sau mỗi lần chạy test,
     * tránh để lại rác trong database thật qua nhiều lần chạy mvn test.
     *
     * DÙNG Ở ĐÂU:
     *   - JUnit 5 tự động gọi sau method @Test, dù test pass hay fail.
     */
    @AfterEach
    @Transactional
    void cleanup() {
        if (testDocumentId == null) {
            return;
        }
        documentChunkRepository.deleteByDocumentId(testDocumentId);
        documentRepository.deleteById(testDocumentId);
        testDocumentId = null;
    }
}

/*
 * ============================================================
 * FLOW - DocumentProcessingIntegrationTest
 * ============================================================
 *
 *   @Test process_shouldParseChunkEmbedAndSave_thenNotDuplicateOnRetry()
 *           │
 *           ▼
 *   Tạo Document (PENDING, file_path=uploads/test.pdf) → save
 *           │
 *           ▼
 *   documentProcessingService.process(id)   [chạy @Async]
 *           │
 *           ▼
 *   waitUntilFinished()  ── polling mỗi 1s, tối đa 60s ──┐
 *           │                                             │
 *           │  COMPLETED?                     FAILED? ────┘─► fail ngay
 *           ▼
 *   assert: status=COMPLETED, có chunk, chunk_index đủ 0..n-1,
 *           content không rỗng, embedding đủ 3072 chiều
 *           │
 *           ▼
 *   Gọi lại process(id) LẦN 2 (retry)
 *           │
 *           ▼
 *   waitUntilFinished() lần nữa
 *           │
 *           ▼
 *   assert: số chunk KHÔNG đổi so với lần 1 (không bị nhân đôi)
 *           │
 *           ▼
 *   @AfterEach cleanup(): xoá document_chunks + document test
 *           (chạy dù test pass hay fail, giữ DB thật luôn sạch)
 * ============================================================
 */