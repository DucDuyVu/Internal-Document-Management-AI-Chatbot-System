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
        StringBuilder contextBuilder = new StringBuilder();
        for (int i = 0; i < results.size(); i++) {
            SearchResult r = results.get(i);
            contextBuilder.append("[Nguồn ")
                          .append(i)
                          .append("] Tài liệu: ")
                          .append(r.fileName());
            if (r.chunk().getPageNumber() != null) {
                contextBuilder.append(", Trang: ").append(r.chunk().getPageNumber());
            }
            contextBuilder.append("\n")
                          .append(chunkFormatter.format(r))
                          .append("\n---\n");
        }

        return "Bạn là một trợ lý AI tận tâm. Hãy trả lời câu hỏi dựa trên các ngữ cảnh được cung cấp bên dưới.\n" +
                "YÊU CẦU QUAN TRỌNG:\n" +
                "1. FORMAT: Trình bày câu trả lời đẹp mắt bằng Markdown (in đậm, danh sách).\n" +
                "2. SOFT REFUSAL: Nếu câu hỏi chỉ liên quan một phần, KHÔNG từ chối cứng nhắc. Hãy nêu rõ phần nào tài liệu không có, đồng thời chủ động cung cấp các thông tin liên quan CÓ THẬT trong ngữ cảnh để hỗ trợ người dùng.\n" +
                "3. DENSE CITATION: BẮT BUỘC gắn thẻ trích dẫn nằm trong DẤU NGOẶC VUÔNG, ví dụ [0], [1] ngay sau MỖI CÂU hoặc MỖI SỐ LIỆU cụ thể. Tuyệt đối KHÔNG viết số trơn (như 0, 1) mà không có ngoặc vuông.\n" +
                "4. MAPPING CHÍNH XÁC: Phải sử dụng đúng số ID của [Nguồn X] đã cho (từ 0 đến " + (results.size() - 1) + "), tuyệt đối không tự bịa số trích dẫn.\n" +
                "5. KHÔNG tạo mục \"Nguồn tham khảo\" ở cuối câu trả lời.\n" +
                "6. GIỚI HẠN: Trả lời đúng trọng tâm, súc tích trong khoảng 5-10 câu.\n\n" +
                "Ngữ cảnh:\n" + contextBuilder.toString() +
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