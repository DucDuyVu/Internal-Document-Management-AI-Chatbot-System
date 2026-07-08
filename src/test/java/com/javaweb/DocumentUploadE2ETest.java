package com.javaweb;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javaweb.entity.DocumentChunkEntity;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.repository.DocumentRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-End Test cho Bước 8 (Upload API).
 *
 * Nhiệm vụ: kiểm thử toàn bộ luồng thật — không mock bất kỳ tầng nào —
 * từ HTTP request upload PDF cho đến khi dữ liệu nằm trong PostgreSQL
 * với embedding 3072 chiều.
 *
 * Tại sao cần: mvn test trước đó chỉ pass vì không có test nào chạm
 * vào code mới của Bước 8. Test này lấp đúng lỗ hổng đó.
 *
 * LƯU Ý QUAN TRỌNG VỀ DATABASE:
 *  - Test này dùng PostgreSQL THẬT (không mock, không H2), vì
 *    DocumentChunkRepository.searchSimilarChunks() dùng native query
 *    pgvector — không thể giả lập bằng in-memory DB.
 *  - process() chạy @Async nên Spring KHÔNG tự rollback được sau mỗi
 *    test. Class này tự dọn dữ liệu bằng @AfterEach, tránh để lại rác
 *    ảnh hưởng lần chạy test sau hoặc dữ liệu demo thật.
 *  - Không dùng @Transactional ở class/method test vì sẽ tạo ảo giác
 *    "an toàn" trong khi thực tế @Async ghi commit ngay lập tức.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DocumentUploadE2ETest {

    @Autowired private MockMvc mockMvc;
    @Autowired private DocumentRepository documentRepository;
    @Autowired private DocumentChunkRepository documentChunkRepository;
    @Autowired private ObjectMapper objectMapper;

    /** Lưu lại id document đã tạo trong test, để dọn dẹp ở @AfterEach. */
    private Long createdDocumentId;

    /**
     * Dọn sạch dữ liệu test tạo ra, chạy sau MỖI test (kể cả khi test fail).
     * Dùng ở: JUnit tự gọi, không ai gọi tay.
     * Lưu ý: xóa chunk trước, document sau — đúng thứ tự khóa ngoại,
     * tránh lỗi vi phạm foreign key constraint.
     */
    @AfterEach
    void cleanUp() {
        if (createdDocumentId != null) {
            documentChunkRepository.deleteByDocumentId(createdDocumentId);
            documentRepository.deleteById(createdDocumentId);
            createdDocumentId = null;
        }
    }

    /**
     * Kịch bản chính: upload PDF hợp lệ -> polling -> verify DB.
     * Input: file PDF mẫu đặt sẵn tại src/test/resources/sample.pdf.
     * Output: không return, dùng assert để xác nhận từng bước.
     * Lưu ý: polling tối đa 30s — nếu Gemini API chậm hoặc rate limit,
     * tăng giá trị timeoutMs khi cần.
     */
    @Test
    void uploadPdf_shouldProcessSuccessfullyEndToEnd() throws Exception {
        byte[] pdfBytes = Files.readAllBytes(Paths.get("src/test/resources/sample.pdf"));
        MockMultipartFile file = new MockMultipartFile(
                "file", "sample.pdf", "application/pdf", pdfBytes
        );

        // BƯỚC 1: gọi API upload thật qua MockMvc (giả lập HTTP request,
        // nhưng chạy xuyên suốt Controller -> Service -> Repository thật)
        String uploadJson = mockMvc.perform(multipart("/api/documents/upload").file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        JsonNode uploadNode = objectMapper.readTree(uploadJson);
        createdDocumentId = uploadNode.get("id").asLong();
        assertNotNull(createdDocumentId);
        assertEquals("PENDING", uploadNode.get("status").asText());

        // BƯỚC 2: polling GET /{id} cho đến khi COMPLETED/FAILED hoặc hết giờ
        String finalStatus = pollUntilFinished(createdDocumentId, 30_000);
        assertEquals("COMPLETED", finalStatus,
                "Pipeline phải COMPLETED — nếu FAILED, kiểm tra log Gemini API key/rate limit");

        // BƯỚC 3: verify trực tiếp trong PostgreSQL, không qua API nữa —
        // đảm bảo dữ liệu thật sự nằm đúng chỗ, không chỉ là response giả
        List<DocumentChunkEntity> chunks = documentChunkRepository.findByDocumentId(createdDocumentId);
        assertFalse(chunks.isEmpty(), "Phải sinh ra ít nhất 1 chunk");

        // BƯỚC 4: verify embedding đúng 3072 chiều — đúng model gemini-embedding-001
        for (DocumentChunkEntity chunk : chunks) {
            assertEquals(3072, chunk.getEmbedding().length,
                    "Embedding phải có 3072 chiều (model gemini-embedding-001)");
        }
    }

    /**
     * Kịch bản lỗi: upload file không phải PDF -> phải bị chặn ở validateFile().
     * Không tạo document nào trong DB, nên không cần cleanup id.
     */
    @Test
    void uploadNonPdfFile_shouldReturnBadRequest() throws Exception {
        MockMultipartFile badFile = new MockMultipartFile(
                "file", "notes.txt", "text/plain", "hello".getBytes()
        );

        mockMvc.perform(multipart("/api/documents/upload").file(badFile))
                .andExpect(status().isBadRequest());
    }

    /**
     * Kịch bản: GET với id không tồn tại -> phải trả 404 qua
     * GlobalExceptionHandler, không phải lỗi 500 mặc định.
     */
    @Test
    void getStatus_withNonExistentId_shouldReturn404() throws Exception {
        long fakeId = 999_999_999L;
        mockMvc.perform(get("/api/documents/" + fakeId))
                .andExpect(status().isNotFound());
    }

    /**
     * Polling thủ công thay cho Awaitility (chưa chắc project đã có
     * dependency đó) — dùng vòng lặp + Thread.sleep đơn giản, đủ dùng
     * cho quy mô test hiện tại.
     * Input: id document, timeout tính bằng millisecond.
     * Output: status cuối cùng đọc được (COMPLETED/FAILED).
     * Lưu ý: nếu hết timeout mà vẫn PENDING/PROCESSING -> fail test rõ ràng,
     * không để test "treo" vô thời hạn.
     */
    private String pollUntilFinished(Long documentId, long timeoutMs) throws Exception {
        long start = System.currentTimeMillis();
        while (System.currentTimeMillis() - start < timeoutMs) {
            String json = mockMvc.perform(get("/api/documents/" + documentId))
                    .andReturn().getResponse().getContentAsString();
            String status = objectMapper.readTree(json).get("status").asText();
            if (status.equals("COMPLETED") || status.equals("FAILED")) {
                return status;
            }
            Thread.sleep(1000);
        }
        fail("Timeout sau " + timeoutMs + "ms — document vẫn chưa xử lý xong");
        return null;
    }
}

/*
 * ============================================================
 * FLOW - uploadPdf_shouldProcessSuccessfullyEndToEnd()
 * ============================================================
 *  sample.pdf (test resource)
 *      ↓
 *  MockMvc: POST /api/documents/upload  (chạy qua Controller thật)
 *      ↓
 *  response: {id, status: PENDING}
 *      ↓
 *  pollUntilFinished(id) --- lặp GET /{id} mỗi 1s, tối đa 30s
 *      ↓
 *  status = COMPLETED
 *      ↓
 *  documentChunkRepository.findByDocumentId(id) -- query PostgreSQL thật
 *      ↓
 *  assert: có chunk, mỗi chunk embedding.length == 3072
 *      ↓
 *  @AfterEach: xóa chunk + document -- KHÔNG để lại rác trong DB
 * ============================================================
 */