package com.javaweb.rag.retrieval;

import com.javaweb.dto.chat.ChatAnswerResponse;
import com.javaweb.dto.chat.SourceInfo;
import com.javaweb.rag.chat.GeminiChatService;
import com.javaweb.rag.embedding.EmbeddingService;
import com.javaweb.rag.prompt.PromptBuilder;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.utils.VectorUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * RetrievalServiceImpl — điều phối toàn bộ 4 phase của Query Pipeline:
 * Embed câu hỏi -> Vector Search -> So ngưỡng threshold -> Prompt + Gemini.
 *
 * File này có nhiệm vụ gì: là NƠI DUY NHẤT trong toàn dự án gọi lần lượt
 * cả EmbeddingService, DocumentChunkRepository, PromptBuilder và
 * GeminiChatService trong cùng 1 luồng - các class con đó không biết về
 * nhau, chỉ RetrievalServiceImpl biết cách ghép chúng lại đúng thứ tự.
 *
 * Tại sao cần nó: nếu để ChatController tự gọi 4 class trên, Controller sẽ
 * phình to và lẫn nghiệp vụ vào tầng HTTP - vi phạm nguyên tắc "Controller
 * chỉ nhận request, gọi Service, trả response".
 *
 * Được tầng nào gọi: ChatController.ask().
 */
@Service
public class RetrievalServiceImpl implements RetrievalService {

    /**
     * Message trả về khi không tìm thấy chunk nào đủ liên quan.
     * Khai báo hằng số để RetrievalServiceIntegrationTest so sánh chính
     * xác với đúng 1 nguồn, tránh gõ tay 2 lần rồi lệch nhau.
     */
    static final String NO_RELEVANT_INFO_MESSAGE = "Không tìm thấy thông tin trong tài liệu.";

    private final EmbeddingService embeddingService;
    private final DocumentChunkRepository chunkRepository;
    private final PromptBuilder promptBuilder;
    private final GeminiChatService chatService;

    /**
     * Số chunk liên quan nhất cần lấy. Đọc từ application.properties,
     * KHÔNG có default - nếu quên khai báo rag.search.top-k, ứng dụng
     * PHẢI fail lúc khởi động thay vì âm thầm chạy với số đoán mò.
     */
    @Value("${rag.search.top-k}")
    private int topK;

    /**
     * Ngưỡng cosine distance để quyết định 1 chunk có "đủ liên quan" hay
     * không. Cũng cố tình KHÔNG có default, cùng lý do với topK.
     */
    @Value("${rag.search.threshold}")
    private double threshold;

    public RetrievalServiceImpl(EmbeddingService embeddingService,
                                 DocumentChunkRepository chunkRepository,
                                 PromptBuilder promptBuilder,
                                 GeminiChatService chatService) {
        this.embeddingService = embeddingService;
        this.chunkRepository = chunkRepository;
        this.promptBuilder = promptBuilder;
        this.chatService = chatService;
    }

    /**
     * Xem JavaDoc đầy đủ ở interface RetrievalService.ask().
     *
     * Lưu ý quan trọng về threshold: toán tử "<=>" của pgvector trả về
     * KHOẢNG CÁCH (0 = giống hệt, càng LỚN càng khác biệt) - KHÔNG phải độ
     * tương đồng. Vì vậy điều kiện "không liên quan" là
     * similarity > threshold (số CÀNG LỚN càng đáng ngờ), ngược lại hoàn
     * toàn với trực giác "similarity cao = tốt".
     */
    @Override
    public ChatAnswerResponse ask(String question, Integer departmentId) {

        // ===== Phase 1: Embed câu hỏi + Vector Search =====
        float[] queryEmbedding = embeddingService.embedQuery(question);
        String embeddingText = VectorUtils.toPgVectorString(queryEmbedding);
        List<SearchResult> results = chunkRepository.searchSimilarChunks(embeddingText, departmentId, topK);

        // ===== Phase 2: So ngưỡng threshold =====
        // Không gọi Gemini nếu không có chunk nào đủ liên quan, tránh tốn
        // quota API cho những câu hỏi chắc chắn sẽ trả lời sai/bịa.
        boolean noRelevantInfo = results.isEmpty() || results.get(0).similarity() > threshold;
        if (noRelevantInfo) {
            return new ChatAnswerResponse(NO_RELEVANT_INFO_MESSAGE, List.of(), 0.0);
        }

        // ===== Phase 3: Ghép prompt =====
        String prompt = promptBuilder.build(question, results);

        // ===== Phase 4: Gọi Gemini sinh câu trả lời =====
        String answer = chatService.generateAnswer(prompt);

        List<SourceInfo> sources = results.stream()
                .map(r -> new SourceInfo(r.chunk().getDocumentId(), r.chunk().getId(), r.similarity()))
                .toList();

        // Đặt tên "bestDistance" thay vì "topScore"/"score": Repository
        // dùng cosine DISTANCE (0 = tốt nhất, càng lớn càng tệ) - tên biến
        // "score" dễ khiến người đọc hiểu ngược thành "càng cao càng tốt".
        double bestDistance = results.get(0).similarity();

        return new ChatAnswerResponse(answer, sources, bestDistance);
    }
}

/*
 * ASCII Flow - RetrievalServiceImpl.ask():
 *
 *   ChatController.ask(request)
 *           │
 *           ▼
 *   RetrievalServiceImpl.ask(question, departmentId)
 *           │
 *           ├─ Phase 1 ─► EmbeddingService.embedQuery(question) ─► float[]
 *           │              VectorUtils.toPgVectorString(float[]) ─► String
 *           │              DocumentChunkRepository.searchSimilarChunks(...)
 *           │                       └─► List<SearchResult>
 *           │
 *           ├─ Phase 2 ─► so results.get(0).similarity() với threshold
 *           │              ├─ KHÔNG liên quan ─► return "Không tìm thấy..."
 *           │              │                      (dừng ở đây, KHÔNG gọi Gemini)
 *           │              └─ CÓ liên quan ─► đi tiếp Phase 3
 *           │
 *           ├─ Phase 3 ─► PromptBuilder.build(question, results) ─► String prompt
 *           │
 *           └─ Phase 4 ─► GeminiChatService.generateAnswer(prompt) ─► String answer
 *                          map results -> List<SourceInfo>
 *                          bestDistance = results.get(0).similarity()
 *                          │
 *                          ▼
 *                   ChatAnswerResponse(answer, sources, bestDistance)
 *                          │
 *                          ▼
 *                   trả về ChatController
 */