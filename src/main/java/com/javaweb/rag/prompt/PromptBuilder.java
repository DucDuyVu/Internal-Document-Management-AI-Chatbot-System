package com.javaweb.rag.prompt;

import com.javaweb.rag.retrieval.SearchResult;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * PromptBuilder — ghép câu hỏi của user và các đoạn ngữ cảnh (context) đã
 * tìm được thành 1 chuỗi prompt duy nhất để gửi cho GeminiChatService.
 *
 * Tại sao tách riêng khỏi ChunkFormatter: PromptBuilder CHỈ lo việc ghép
 * chuỗi theo template, không biết/không quan tâm logic cắt độ dài chunk —
 * đúng nguyên tắc mỗi class 1 lý do thay đổi (Single Responsibility).
 *
 * Được tầng nào gọi: RetrievalService.ask() (Milestone 3), sau khi đã có
 * List<SearchResult> từ DocumentChunkRepository.searchSimilarChunks().
 */
@Component
public class PromptBuilder {

    private final ChunkFormatter chunkFormatter;

    /**
     * Constructor injection — Spring tự truyền bean ChunkFormatter vào.
     * Viết tay thay Lombok @RequiredArgsConstructor, giữ đúng convention
     * đã dùng ở GeminiEmbeddingService.
     */
    public PromptBuilder(ChunkFormatter chunkFormatter) {
        this.chunkFormatter = chunkFormatter;
    }

    /**
     * Ghép câu hỏi + danh sách chunk liên quan thành 1 prompt hoàn chỉnh.
     *
     * Dùng ở đâu: RetrievalService.ask(), ngay trước khi gọi
     * GeminiChatService.generateAnswer(prompt).
     *
     * Input:
     *   @param question câu hỏi gốc của user
     *   @param results   danh sách top-K SearchResult đã lọc theo quyền
     *                    phòng ban và đã vượt ngưỡng similarity (việc lọc
     *                    ngưỡng KHÔNG làm ở đây — RetrievalService lo,
     *                    PromptBuilder chỉ nhận list đã sẵn sàng để dùng)
     * Output:
     *   String — prompt hoàn chỉnh, sẵn sàng gửi cho Gemini Chat API
     *
     * Lưu ý: mỗi chunk được nối cách nhau bằng "\n---\n" để LLM phân biệt
     * rõ ranh giới giữa các đoạn tài liệu khác nhau, tránh nhầm 2 đoạn
     * không liên quan thành 1 đoạn văn liền mạch.
     */
    public String build(String question, List<SearchResult> results) {
        String context = results.stream()
                .map(chunkFormatter::format)
                .collect(Collectors.joining("\n---\n"));

        return "Chỉ trả lời dựa trên ngữ cảnh được cung cấp bên dưới. " +
                "Nếu ngữ cảnh không chứa thông tin liên quan, hãy trả lời " +
                "\"Tôi không tìm thấy thông tin này trong tài liệu.\"\n\n" +
                "Ngữ cảnh:\n" + context +
                "\n\nCâu hỏi: " + question;
    }
}

/*
 * ASCII Flow:
 *
 *   RetrievalService.ask(question, departmentId)
 *           │  (đã có List<SearchResult> từ Repository, đã qua lọc ngưỡng)
 *           ▼
 *   PromptBuilder.build(question, results)
 *           │
 *           ├──► ChunkFormatter.format(result)  (gọi lặp lại cho từng chunk)
 *           │
 *           ▼
 *   String prompt hoàn chỉnh
 *           │
 *           ▼
 *   GeminiChatService.generateAnswer(prompt)
 */