package com.javaweb.rag.prompt;

import com.javaweb.rag.retrieval.SearchResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * ChunkFormatter — cắt bớt nội dung 1 chunk xuống độ dài tối đa trước khi
 * đưa vào prompt gửi cho LLM.
 *
 * Tại sao cần: LLM tính phí/giới hạn theo token. Nếu ghép nguyên văn tất cả
 * top-K chunk (mỗi chunk có thể dài hàng nghìn ký tự) vào prompt, chi phí và
 * độ trễ sẽ tăng không kiểm soát được. Tách riêng thành class này (thay vì
 * để logic cắt nằm trong PromptBuilder) để sau này đổi chiến lược cắt
 * (theo token, theo câu...) không phải sửa PromptBuilder.
 *
 * Được tầng nào gọi: PromptBuilder.build() — gọi format() cho từng
 * SearchResult trong danh sách top-K trước khi nối thành context.
 */
@Component
public class ChunkFormatter {

    /**
     * Độ dài tối đa (ký tự) cho 1 chunk khi đưa vào prompt.
     * Đọc từ application.properties, mặc định 300 nếu không khai báo.
     */
    @Value("${rag.prompt.chunk-max-length:300}")
    private int maxLength;

    /**
     * Cắt content của 1 SearchResult xuống tối đa maxLength ký tự.
     *
     * Dùng ở đâu: PromptBuilder.build(), gọi 1 lần cho mỗi chunk trong
     * top-K kết quả vector search.
     *
     * Input:  SearchResult (chunk + similarity, chỉ dùng phần chunk.content())
     * Output: String — content đã cắt, không dài hơn maxLength ký tự
     *
     * Lưu ý: cắt bằng substring theo ký tự thô, KHÔNG cố tránh cắt đứt
     * giữa từ/câu — chấp nhận đánh đổi này để giữ code đơn giản, đủ dùng
     * cho tài liệu nội bộ. Nếu sau này thấy câu trả lời bị ảnh hưởng bởi
     * chunk cắt cụt giữa câu, đây là chỗ cần nâng cấp trước tiên.
     */
    public String format(SearchResult result) {
        String content = result.chunk().getContent();

        // content null gần như không thể xảy ra (DB có NOT NULL), nhưng
        // guard lại để không NPE nếu dữ liệu test/demo bị thiếu
        if (content == null) {
            return "";
        }

        return content.length() > maxLength ? content.substring(0, maxLength) : content;
    }
}

/*
 * ASCII Flow:
 *
 *   PromptBuilder.build(question, results)
 *           │  (với mỗi SearchResult trong results)
 *           ▼
 *   ChunkFormatter.format(result)
 *           │  (đọc result.chunk().getContent(), cắt còn <= maxLength)
 *           ▼
 *   String đã cắt  ──►  PromptBuilder nối thành context
 */