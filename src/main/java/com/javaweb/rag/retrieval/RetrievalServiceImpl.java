package com.javaweb.rag.retrieval;

import com.javaweb.dto.chat.ChatAnswerResponse;
import com.javaweb.dto.chat.SourceRefResponse;
import com.javaweb.rag.chat.GeminiChatService;
import com.javaweb.rag.embedding.EmbeddingService;
import com.javaweb.rag.prompt.PromptBuilder;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.utils.VectorUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    private final DocumentRepository documentRepository;
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
                                 DocumentRepository documentRepository,
                                 PromptBuilder promptBuilder,
                                 GeminiChatService chatService) {
        this.embeddingService = embeddingService;
        this.chunkRepository = chunkRepository;
        this.documentRepository = documentRepository;
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
    public ChatAnswerResponse ask(String question, Integer departmentId, java.util.List<com.javaweb.dto.chat.ChatHistoryItem> history) {

        // ===== Phase 0: Xử lý query context =====
        // RAG Problem: "Với nữ nhân viên thì sao" sẽ bị mất ngữ cảnh nếu chỉ search đúng câu này.
        // Solution: Ghép câu hỏi USER ngay trước đó (nếu có) để embedding bắt được topic.
        String searchContext = question;
        System.out.println("====== DIAGNOSE HISTORY ======");
        System.out.println("History is null? " + (history == null));
        if (history != null) {
            System.out.println("History size: " + history.size());
            for (com.javaweb.dto.chat.ChatHistoryItem item : history) {
                System.out.println("Role: [" + item.getRole() + "] - Content: [" + item.getContent() + "]");
            }
        }
        System.out.println("==============================");

        if (history != null && !history.isEmpty()) {
            for (int i = history.size() - 1; i >= 0; i--) {
                if ("USER".equalsIgnoreCase(history.get(i).getRole())) {
                    searchContext = history.get(i).getContent() + ". " + question;
                    break;
                }
            }
        }
        System.out.println("====== SEARCH CONTEXT ======");
        System.out.println(searchContext);
        System.out.println("============================");

        // ===== Phase 1: Embed câu hỏi + Vector Search =====
        float[] queryEmbedding = embeddingService.embedQuery(searchContext);
        String embeddingText = VectorUtils.toPgVectorString(queryEmbedding);
        List<SearchResult> results = chunkRepository.searchSimilarChunks(embeddingText, departmentId, topK);

        // ===== Phase 2: Lọc các chunk bằng threshold =====
        System.out.println("====== ĐO ĐẠC DISTANCE TỪNG CHUNK ======");
        for (SearchResult r : results) {
            System.out.println("File: " + r.fileName() + ", Chunk: " + r.chunk().getChunkIndex() + ", Distance: " + r.distance());
        }
        System.out.println("==========================================");

        // Loại bỏ mọi chunk có khoảng cách (distance) lớn hơn threshold
        results.removeIf(r -> r.distance() > threshold);

        if (results.isEmpty()) {
            return new ChatAnswerResponse(NO_RELEVANT_INFO_MESSAGE, List.of(), 0.0);
        }

        // ===== Phase 3: Ghép prompt (kèm lịch sử hội thoại nếu có) =====
        String prompt = promptBuilder.build(question, results, history);

        // ===== Phase 4: Gọi Gemini sinh câu trả lời =====
        String answer = chatService.generateAnswer(prompt);

        // ===== Phase 4.5: Validate & Remap Citation Number =====
        Pattern pattern = Pattern.compile("\\[(\\d+)\\]");
        Matcher matcher = pattern.matcher(answer);
        
        // Pass 1: Thu thập tất cả các index hợp lệ
        java.util.List<Integer> citedOriginalIndices = new java.util.ArrayList<>();
        while (matcher.find()) {
            try {
                int citationIndex = Integer.parseInt(matcher.group(1));
                if (citationIndex < results.size() && !citedOriginalIndices.contains(citationIndex)) {
                    citedOriginalIndices.add(citationIndex);
                }
            } catch (NumberFormatException e) {
                // Bỏ qua
            }
        }
        
        // Sort lại để giữ nguyên thứ tự chunk từ cao -> thấp
        java.util.Collections.sort(citedOriginalIndices);
        
        // Lấy tên file một lần (tránh N+1 queries)
        java.util.Set<Long> docIds = new java.util.HashSet<>();
        for (int idx : citedOriginalIndices) {
            docIds.add(results.get(idx).chunk().getDocumentId());
        }
        java.util.Map<Long, String> docIdToFileName = new java.util.HashMap<>();
        if (!docIds.isEmpty()) {
            java.util.List<com.javaweb.entity.DocumentEntity> docs = documentRepository.findAllById(docIds);
            for (com.javaweb.entity.DocumentEntity doc : docs) {
                docIdToFileName.put(doc.getId(), doc.getFileName());
            }
        }

        // Tạo mapping từ originalIndex sang newIndex (0, 1, 2...) và build sources
        java.util.Map<Integer, Integer> indexMapping = new java.util.HashMap<>();
        List<SourceRefResponse> sources = new java.util.ArrayList<>();
        for (int i = 0; i < citedOriginalIndices.size(); i++) {
            int originalIdx = citedOriginalIndices.get(i);
            indexMapping.put(originalIdx, i);
            SearchResult r = results.get(originalIdx);
            
            // Xử lý excerpt an toàn: cắt ở khoảng trắng
            String rawContent = r.chunk().getContent();
            String excerpt = rawContent;
            if (rawContent != null && rawContent.length() > 150) {
                int cutIdx = 150;
                while (cutIdx < rawContent.length() && !Character.isWhitespace(rawContent.charAt(cutIdx))) {
                    cutIdx++;
                }
                excerpt = rawContent.substring(0, Math.min(cutIdx, rawContent.length())) + "...";
            }
            
            String fileName = docIdToFileName.getOrDefault(r.chunk().getDocumentId(), "Tài liệu không xác định");
            int estimatedPage = r.chunk().getPageNumber() != null ? r.chunk().getPageNumber() : (r.chunk().getChunkIndex() / 7) + 1;
            sources.add(new SourceRefResponse(r.chunk().getDocumentId(), fileName, r.chunk().getId(), excerpt, estimatedPage));
        }

        // Pass 2: Rewrite lại câu trả lời với index mới, xóa index ảo
        matcher = pattern.matcher(answer); // Reset matcher
        StringBuilder cleanedAnswer = new StringBuilder();
        while (matcher.find()) {
            try {
                int citationIndex = Integer.parseInt(matcher.group(1));
                if (indexMapping.containsKey(citationIndex)) {
                    int newIdx = indexMapping.get(citationIndex);
                    matcher.appendReplacement(cleanedAnswer, "[" + newIdx + "]");
                } else {
                    matcher.appendReplacement(cleanedAnswer, "");
                    System.out.println("CẢNH BÁO: Phát hiện citation ảo [" + citationIndex + "], đã tự động xóa.");
                }
            } catch (NumberFormatException e) {
                matcher.appendReplacement(cleanedAnswer, matcher.group(0));
            }
        }
        matcher.appendTail(cleanedAnswer);
        answer = cleanedAnswer.toString();

        // Đặt tên "bestDistance" thay vì "topScore"/"score": Repository
        // dùng cosine DISTANCE (0 = tốt nhất, càng lớn càng tệ) - tên biến
        // "score" dễ khiến người đọc hiểu ngược thành "càng cao càng tốt".
        double bestDistance = results.get(0).distance();

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