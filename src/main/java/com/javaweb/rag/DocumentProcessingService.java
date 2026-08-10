package com.javaweb.rag;

import com.javaweb.entity.DocumentChunkEntity;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.rag.chunking.ChunkingService;
import com.javaweb.rag.embedding.EmbeddingService;
import com.javaweb.rag.parser.DocumentParser;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.service.StorageService;
import java.io.InputStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.javaweb.rag.chat.GeminiChatService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import com.google.common.util.concurrent.RateLimiter;

/**
 * DocumentProcessingService
 * ----------------------------------------------------------------
 * NHIỆM VỤ:
 * Là "nhạc trưởng" của toàn bộ Ingestion Pipeline: nhận vào 1
 * documentId, tự điều phối PdfParser -> ChunkingService ->
 * EmbeddingService -> DocumentChunkRepository, đồng thời quản lý
 * vòng đời trạng thái của Document (PENDING -> PROCESSING ->
 * COMPLETED / FAILED).
 *
 * TẠI SAO CẦN NÓ:
 * - Nếu để Controller gọi trực tiếp từng bước (parse, chunk, embed,
 * save) thì logic điều phối bị rải rác ở tầng API, khó tái sử
 * dụng, và khó đảm bảo trạng thái DB luôn nhất quán khi có lỗi
 * giữa chừng.
 * - Gom về 1 service duy nhất giúp có đúng 1 nơi chịu trách nhiệm
 * "dọn dẹp" khi pipeline thất bại.
 *
 * ĐƯỢC TẦNG NÀO GỌI:
 * - DocumentServiceImpl (Bước 8, tầng Controller) sẽ gọi
 * process(documentId) ngay sau khi tạo Document với
 * status = PENDING và lưu file vào ổ đĩa.
 *
 * LƯU Ý KỸ THUẬT:
 * - Class này KHÔNG dùng @RequiredArgsConstructor/@Slf4j của Lombok,
 * mà viết constructor và Logger tay. Lý do: annotation processor
 * của Lombok không xử lý đúng riêng file này trong môi trường
 * build hiện tại (nguyên nhân chưa xác định được chắc chắn dù các
 * file khác trong project vẫn dùng Lombok bình thường), nên chọn
 * cách viết tường minh để loại bỏ hẳn rủi ro thay vì tiếp tục phụ
 * thuộc vào 1 công cụ đang hoạt động không ổn định.
 * ----------------------------------------------------------------
 */
@Service
public class DocumentProcessingService {

    private static final Logger log = LoggerFactory.getLogger(DocumentProcessingService.class);

    // Giới hạn 1.5 request/giây (tức 90 request/phút) cho TOÀN BỘ luồng chạy song song
    private static final RateLimiter rateLimiter = RateLimiter.create(1.5);

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentParser documentParser;
    private final ChunkingService chunkingService;
    private final EmbeddingService embeddingService;
    private final StorageService storageService;
    private final GeminiChatService geminiChatService;
    private final ObjectMapper objectMapper;

    /**
     * Constructor injection tay (thay cho @RequiredArgsConstructor).
     *
     * DÙNG Ở ĐÂU:
     * - Spring tự gọi constructor này khi khởi tạo bean, không cần
     * 
     * @Autowired vì đây là constructor duy nhất của class.
     *
     *            INPUT:
     *            - 5 bean tương ứng, Spring tự inject theo kiểu dữ liệu.
     *
     *            OUTPUT:
     *            - Instance DocumentProcessingService đã sẵn sàng dùng.
     */
    public DocumentProcessingService(DocumentRepository documentRepository,
            DocumentChunkRepository documentChunkRepository,
            DocumentParser documentParser,
            ChunkingService chunkingService,
            EmbeddingService embeddingService,
            StorageService storageService,
            GeminiChatService geminiChatService,
            ObjectMapper objectMapper) {
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentParser = documentParser;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
        this.storageService = storageService;
        this.geminiChatService = geminiChatService;
        this.objectMapper = objectMapper;
    }

    /**
     * Xử lý toàn bộ pipeline ingestion cho 1 document.
     *
     * DÙNG Ở ĐÂU:
     * - Gọi từ DocumentServiceImpl ngay sau khi upload file thành công,
     * hoặc gọi lại thủ công (retry) khi document ở trạng thái FAILED.
     *
     * INPUT:
     * - documentId: id của record đã tồn tại trong bảng document.
     *
     * OUTPUT:
     * - void. Kết quả phản ánh qua status/error_message/retry_count.
     *
     * LƯU Ý:
     * - process() chạy bằng @Async nên toàn bộ pipeline được thực hiện
     * ở background thread, không block request upload.
     *
     * - Các thao tác DELETE trong Repository được đánh dấu
     * 
     * @Transactional riêng vì Spring Data yêu cầu transaction cho
     *                câu lệnh DELETE/UPDATE.
     *
     *                - Không bọc toàn bộ process() trong một transaction lớn vì
     *                pipeline có thể chạy khá lâu (đọc PDF, gọi Gemini API),
     *                việc giữ transaction quá lâu sẽ làm tăng thời gian khóa dữ
     *                liệu.
     */
    @Async
    public void process(Long documentId) {
        Optional<DocumentEntity> optionalDocument = documentRepository.findById(documentId);

        if (optionalDocument.isEmpty()) {
            log.error("DocumentProcessingService: không tìm thấy document id={}", documentId);
            return;
        }

        DocumentEntity document = optionalDocument.get();
        markAsProcessing(document);

        try {
            InputStream inputStream = storageService.downloadFile(document.getFilePath());
            byte[] fileData = inputStream.readAllBytes();
            
            // Lọc bỏ ký tự null-byte \u0000 sinh ra từ quá trình parse PDF để tránh lỗi Postgres
            String content = documentParser.parse(fileData).replace("\u0000", "");

            // Xử lý AI OCR (Tóm tắt, Mục đích, Tags)
            extractAiSummary(content, document);

            List<String> chunkTexts = chunkingService.chunk(content);

            documentChunkRepository.deleteByDocumentId(documentId);

            List<DocumentChunkEntity> chunkEntities = buildChunkEntities(documentId, chunkTexts);
            documentChunkRepository.saveAll(chunkEntities);

            markAsCompleted(document);
            log.info("DocumentProcessingService: xử lý xong document id={}, tổng {} chunk",
                    documentId, chunkEntities.size());

        } catch (Exception e) {
            documentChunkRepository.deleteByDocumentId(documentId);
            markAsFailed(document, e);
            log.error("DocumentProcessingService: xử lý thất bại document id={}", documentId, e);
        }
    }

    // AI xử lý tóm tắt nội dung tài liệu
    private void extractAiSummary(String content, DocumentEntity document) {
        try {
            String prompt = "Bạn là một chuyên gia phân tích tài liệu. Hãy đọc nội dung sau và trả về kết quả định dạng JSON nghiêm ngặt với 3 trường: 'purpose' (Mục đích tài liệu - 1 câu), 'summary' (Tóm tắt nội dung chính - tối đa 2 câu), và 'tags' (Chuỗi các từ khóa hashtag liên quan nhất cách nhau bởi khoảng trắng, VD: '#HopDong #KinhDoanh'). CHỈ TRẢ VỀ JSON, KHÔNG CÓ MARKDOWN HAY CHỮ GÌ KHÁC.\n\nNội dung tài liệu:\n"
                    +
                    (content.length() > 15000 ? content.substring(0, 15000) : content);

            String jsonResponse = geminiChatService.generateAnswer(prompt);

            // Xử lý làm sạch chuỗi JSON một cách an toàn nhất (loại bỏ markdown và chữ thừa)
            String cleanJson = jsonResponse.replace("```json", "").replace("```", "").trim();
            
            int startIndex = cleanJson.indexOf('{');
            int endIndex = cleanJson.lastIndexOf('}');
            
            if (startIndex != -1 && endIndex != -1 && startIndex <= endIndex) {
                cleanJson = cleanJson.substring(startIndex, endIndex + 1);
                JsonNode rootNode = objectMapper.readTree(cleanJson);
                if (rootNode.has("purpose")) document.setAiPurpose(rootNode.get("purpose").asText());
                if (rootNode.has("summary")) document.setAiSummary(rootNode.get("summary").asText());
                if (rootNode.has("tags")) document.setAiTags(rootNode.get("tags").asText());
            } else {
                log.warn("Gemini không trả về JSON hợp lệ. Raw response: {}", jsonResponse);
            }

        } catch (Exception e) {
            log.warn("Lỗi khi trích xuất AI OCR cho document id={}: {}", document.getId(), e.getMessage());
            document.setAiPurpose("LỖI HỆ THỐNG: " + e.getMessage());
            document.setAiSummary("Không thể phân tích tài liệu do lỗi kết nối tới AI.");
            document.setAiTags("#Error");
        }
    }

    /**
     * Chuyển đổi danh sách text chunk thành entity DocumentChunk kèm embedding.
     *
     * DÙNG Ở ĐÂU: Chỉ dùng nội bộ trong process().
     * INPUT: documentId, chunkTexts (List<String> từ ChunkingService).
     * OUTPUT: List<DocumentChunk> sẵn sàng để saveAll().
     * LƯU Ý: gọi Gemini API tuần tự, tránh vượt rate limit.
     */
    private List<DocumentChunkEntity> buildChunkEntities(Long documentId, List<String> chunkTexts) {
        List<DocumentChunkEntity> result = new ArrayList<>();

        for (int i = 0; i < chunkTexts.size(); i++) {
            String text = chunkTexts.get(i);
            float[] embedding = null;
            int retries = 0;
            
            while (retries < 3) {
                try {
                    embedding = embeddingService.embedDocument(text);
                    // Dùng RateLimiter thay vì Thread.sleep cố định để điều phối mượt mà giữa các thread
                    rateLimiter.acquire();
                    break;
                } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
                    retries++;
                    log.warn("Bị giới hạn API Gemini (429 Too Many Requests), chờ 21 giây trước khi thử lại... (Chunk {}, Lần {})", i, retries);
                    try {
                        Thread.sleep(21000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
            
            if (embedding == null) {
                throw new RuntimeException("Lỗi vượt quá API Rate Limit của Gemini sau 3 lần thử lại. Chunk index: " + i);
            }

            DocumentChunkEntity chunk = new DocumentChunkEntity();
            chunk.setDocumentId(documentId);
            chunk.setChunkIndex(i);
            chunk.setContent(text);
            chunk.setEmbedding(embedding);
            result.add(chunk);
        }

        return result;
    }

    /** Cập nhật status = PROCESSING trước khi bắt đầu xử lý nặng. */
    private void markAsProcessing(DocumentEntity document) {
        document.setStatus(DocumentStatus.PROCESSING);
        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);
    }

    /** Cập nhật status = COMPLETED khi toàn bộ pipeline chạy thành công. */
    private void markAsCompleted(DocumentEntity document) {
        document.setStatus(DocumentStatus.COMPLETED);
        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);
    }

    /** Cập nhật status = FAILED, ghi lý do lỗi, tăng retry_count. */
    private void markAsFailed(DocumentEntity document, Exception e) {
        String message = e.getMessage() == null ? e.toString() : e.getMessage();
        if (message.length() > 500) {
            message = message.substring(0, 500);
        }
        document.setStatus(DocumentStatus.FAILED);
        document.setErrorMessage(message);
        document.setRetryCount(document.getRetryCount() + 1);
        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);
    }
}

/*
 * ============================================================
 * FLOW - DocumentProcessingService.process(documentId)
 * ============================================================
 * DocumentServiceImpl → process(documentId) [@Async]
 * ↓
 * findById → không thấy: log, return
 * ↓ thấy
 * status = PROCESSING → save
 * ↓
 * try: parse → chunk → deleteByDocumentId (dọn rác retry)
 * → mỗi chunk: embed → DocumentChunk → saveAll
 * → status = COMPLETED → save
 * catch: deleteByDocumentId → status = FAILED, error_message,
 * retry_count++ → save
 * ============================================================
 */