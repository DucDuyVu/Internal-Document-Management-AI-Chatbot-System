package com.javaweb.rag;

import com.javaweb.entity.Document;
import com.javaweb.entity.DocumentChunk;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.rag.chunking.ChunkingService;
import com.javaweb.rag.embedding.EmbeddingService;
import com.javaweb.rag.parser.DocumentParser;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.repository.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.File;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * DocumentProcessingService
 * ----------------------------------------------------------------
 * NHIỆM VỤ:
 *   Là "nhạc trưởng" của toàn bộ Ingestion Pipeline: nhận vào 1
 *   documentId, tự điều phối PdfParser -> ChunkingService ->
 *   EmbeddingService -> DocumentChunkRepository, đồng thời quản lý
 *   vòng đời trạng thái của Document (PENDING -> PROCESSING ->
 *   COMPLETED / FAILED).
 *
 * TẠI SAO CẦN NÓ:
 *   - Nếu để Controller gọi trực tiếp từng bước (parse, chunk, embed,
 *     save) thì logic điều phối bị rải rác ở tầng API, khó tái sử
 *     dụng, và khó đảm bảo trạng thái DB luôn nhất quán khi có lỗi
 *     giữa chừng.
 *   - Gom về 1 service duy nhất giúp có đúng 1 nơi chịu trách nhiệm
 *     "dọn dẹp" khi pipeline thất bại.
 *
 * ĐƯỢC TẦNG NÀO GỌI:
 *   - DocumentServiceImpl (Bước 8, tầng Controller) sẽ gọi
 *     process(documentId) ngay sau khi tạo Document với
 *     status = PENDING và lưu file vào ổ đĩa.
 *
 * LƯU Ý KỸ THUẬT:
 *   - Class này KHÔNG dùng @RequiredArgsConstructor/@Slf4j của Lombok,
 *     mà viết constructor và Logger tay. Lý do: annotation processor
 *     của Lombok không xử lý đúng riêng file này trong môi trường
 *     build hiện tại (nguyên nhân chưa xác định được chắc chắn dù các
 *     file khác trong project vẫn dùng Lombok bình thường), nên chọn
 *     cách viết tường minh để loại bỏ hẳn rủi ro thay vì tiếp tục phụ
 *     thuộc vào 1 công cụ đang hoạt động không ổn định.
 * ----------------------------------------------------------------
 */
@Service
public class DocumentProcessingService {

    private static final Logger log = LoggerFactory.getLogger(DocumentProcessingService.class);

    private final DocumentRepository documentRepository;
    private final DocumentChunkRepository documentChunkRepository;
    private final DocumentParser documentParser;
    private final ChunkingService chunkingService;
    private final EmbeddingService embeddingService;

    /**
     * Constructor injection tay (thay cho @RequiredArgsConstructor).
     *
     * DÙNG Ở ĐÂU:
     *   - Spring tự gọi constructor này khi khởi tạo bean, không cần
     *     @Autowired vì đây là constructor duy nhất của class.
     *
     * INPUT:
     *   - 5 bean tương ứng, Spring tự inject theo kiểu dữ liệu.
     *
     * OUTPUT:
     *   - Instance DocumentProcessingService đã sẵn sàng dùng.
     */
    public DocumentProcessingService(DocumentRepository documentRepository,
                                      DocumentChunkRepository documentChunkRepository,
                                      DocumentParser documentParser,
                                      ChunkingService chunkingService,
                                      EmbeddingService embeddingService) {
        this.documentRepository = documentRepository;
        this.documentChunkRepository = documentChunkRepository;
        this.documentParser = documentParser;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
    }

    /**
     * Xử lý toàn bộ pipeline ingestion cho 1 document.
     *
     * DÙNG Ở ĐÂU:
     *   - Gọi từ DocumentServiceImpl ngay sau khi upload file thành công,
     *     hoặc gọi lại thủ công (retry) khi document ở trạng thái FAILED.
     *
     * INPUT:
     *   - documentId: id của record đã tồn tại trong bảng document.
     *
     * OUTPUT:
     *   - void. Kết quả phản ánh qua status/error_message/retry_count.
     *
     * LƯU Ý:
    * - process() chạy bằng @Async nên toàn bộ pipeline được thực hiện
    *   ở background thread, không block request upload.
    *
    * - Các thao tác DELETE trong Repository được đánh dấu
    *   @Transactional riêng vì Spring Data yêu cầu transaction cho
    *   câu lệnh DELETE/UPDATE.
    *
    * - Không bọc toàn bộ process() trong một transaction lớn vì
    *   pipeline có thể chạy khá lâu (đọc PDF, gọi Gemini API),
    *   việc giữ transaction quá lâu sẽ làm tăng thời gian khóa dữ liệu.
     */
    @Async
    public void process(Long documentId) {
        Optional<Document> optionalDocument = documentRepository.findById(documentId);

        if (optionalDocument.isEmpty()) {
            log.error("DocumentProcessingService: không tìm thấy document id={}", documentId);
            return;
        }

        Document document = optionalDocument.get();
        markAsProcessing(document);

        try {
            String content = documentParser.parse(new File(document.getFilePath()));
            List<String> chunkTexts = chunkingService.chunk(content);

            documentChunkRepository.deleteByDocumentId(documentId);

            List<DocumentChunk> chunkEntities = buildChunkEntities(documentId, chunkTexts);
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

    /**
     * Chuyển đổi danh sách text chunk thành entity DocumentChunk kèm embedding.
     *
     * DÙNG Ở ĐÂU: Chỉ dùng nội bộ trong process().
     * INPUT: documentId, chunkTexts (List<String> từ ChunkingService).
     * OUTPUT: List<DocumentChunk> sẵn sàng để saveAll().
     * LƯU Ý: gọi Gemini API tuần tự, tránh vượt rate limit.
     */
    private List<DocumentChunk> buildChunkEntities(Long documentId, List<String> chunkTexts) {
        List<DocumentChunk> result = new ArrayList<>();

        for (int i = 0; i < chunkTexts.size(); i++) {
            String text = chunkTexts.get(i);
            float[] embedding = embeddingService.embedDocument(text);

            DocumentChunk chunk = new DocumentChunk();
            chunk.setDocumentId(documentId);
            chunk.setChunkIndex(i);
            chunk.setContent(text);
            chunk.setEmbedding(embedding);
            result.add(chunk);
        }

        return result;
    }

    /** Cập nhật status = PROCESSING trước khi bắt đầu xử lý nặng. */
    private void markAsProcessing(Document document) {
        document.setStatus(DocumentStatus.PROCESSING);
        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);
    }

    /** Cập nhật status = COMPLETED khi toàn bộ pipeline chạy thành công. */
    private void markAsCompleted(Document document) {
        document.setStatus(DocumentStatus.COMPLETED);
        document.setUpdatedAt(LocalDateTime.now());
        documentRepository.save(document);
    }

    /** Cập nhật status = FAILED, ghi lý do lỗi, tăng retry_count. */
    private void markAsFailed(Document document, Exception e) {
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
 *   DocumentServiceImpl → process(documentId) [@Async]
 *           ↓
 *   findById → không thấy: log, return
 *           ↓ thấy
 *   status = PROCESSING → save
 *           ↓
 *   try: parse → chunk → deleteByDocumentId (dọn rác retry)
 *        → mỗi chunk: embed → DocumentChunk → saveAll
 *        → status = COMPLETED → save
 *   catch: deleteByDocumentId → status = FAILED, error_message,
 *          retry_count++ → save
 * ============================================================
 */