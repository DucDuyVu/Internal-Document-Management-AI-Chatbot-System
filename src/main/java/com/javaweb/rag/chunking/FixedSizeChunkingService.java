package com.javaweb.rag.chunking;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * FixedSizeChunkingService
 * ----------------------------------------------------------------
 * NHIỆM VỤ:
 *   Implementation của ChunkingService, dùng thuật toán "cửa sổ
 *   trượt cố định" (fixed-size sliding window): mỗi chunk tối đa
 *   CHUNK_SIZE ký tự, chunk sau lùi lại OVERLAP ký tự so với chunk
 *   trước để giữ ngữ cảnh liên tục.
 *
 * TẠI SAO CẦN NÓ:
 *   - Nếu chia chunk liền mạch không overlap, 1 câu/ý nằm ngay ranh
 *     giới 2 chunk sẽ bị cắt đứt, khiến vector search ở Query Pipeline
 *     (Day 4/5) tìm ra ngữ cảnh không đầy đủ.
 *   - Overlap 200 ký tự đảm bảo phần cuối chunk trước lặp lại ở đầu
 *     chunk sau, giữ được ý nghĩa trọn vẹn ở vùng ranh giới.
 *
 * ĐƯỢC TẦNG NÀO GỌI:
 *   - DocumentProcessingService.process() gọi chunk(content) ngay
 *     sau khi PdfParser trả về String.
 *
 * LỊCH SỬ THAY ĐỔI:
 *   - Bản đầu tiên (SimpleChunkingService, Day 3) dùng
 *     start += CHUNK_SIZE (không overlap) để học kiến trúc trước.
 *   - Bản này (FixedSizeChunkingService) bổ sung overlap 200 ký tự
 *     đúng theo kế hoạch gốc Tuần 2, sửa trước khi ghép vào
 *     DocumentProcessingService để tránh phải regenerate embedding
 *     sau này.
 * ----------------------------------------------------------------
 */
@Service
public class FixedSizeChunkingService implements ChunkingService {

    private static final int CHUNK_SIZE = 500;
    private static final int OVERLAP = 200;

    /**
     * Khoảng cách tối đa cho phép lùi về phía sau để tìm khoảng trắng
     * gần nhất. Nếu không có khoảng trắng trong phạm vi này, chấp
     * nhận cắt cứng tại CHUNK_SIZE để tránh chunk bị co lại quá ngắn.
     */
    private static final int MAX_LOOKBACK_FOR_SPACE = 50;

    /**
     * Chia văn bản thành nhiều chunk theo thuật toán cửa sổ trượt cố định,
     * có overlap giữa các chunk liền kề.
     *
     * DÙNG Ở ĐÂU:
     *   - DocumentProcessingService, ngay sau bước parse PDF.
     *
     * INPUT:
     *   - content: toàn bộ text của tài liệu (có thể null/rỗng).
     *
     * OUTPUT:
     *   - List<String>: các đoạn văn bản, đúng thứ tự văn bản gốc,
     *     không có phần tử rỗng, mỗi đoạn overlap 200 ký tự với
     *     đoạn liền trước.
     *
     * LƯU Ý:
     *   - Với văn bản tiếng Việt có dấu, cố gắng lùi về khoảng trắng
     *     gần nhất thay vì cắt cứng giữa từ.
     *   - Nếu content ngắn hơn CHUNK_SIZE, trả về đúng 1 chunk.
     */
    @Override
    public List<String> chunk(String content) {
        List<String> chunks = new ArrayList<>();

        if (content == null || content.isBlank()) {
            return chunks;
        }

        String text = content.strip();
        int length = text.length();
        int start = 0;

        while (start < length) {
            int idealEnd = Math.min(start + CHUNK_SIZE, length);
            int end = findCutPoint(text, start, idealEnd, length);

            String chunkText = text.substring(start, end).strip();
            if (!chunkText.isEmpty()) {
                chunks.add(chunkText);
            }

            if (end >= length) {
                break;
            }

            // Lùi lại OVERLAP ký tự (thay vì nhảy thẳng tới `end`) để chunk
            // kế tiếp giữ lại 200 ký tự cuối của chunk hiện tại — đây chính
            // là điểm khác biệt so với bản SimpleChunkingService ban đầu.
            int nextStart = end - OVERLAP;

            // Phòng vòng lặp vô hạn: nếu vì tìm khoảng trắng mà end lùi về
            // quá gần start, ép tiến ít nhất 1 ký tự.
            if (nextStart <= start) {
                nextStart = start + 1;
            }
            start = nextStart;
        }

        return chunks;
    }

    /**
     * Tìm điểm cắt hợp lý gần idealEnd nhất, ưu tiên cắt tại khoảng trắng.
     *
     * DÙNG Ở ĐÂU:
     *   - Chỉ dùng nội bộ trong chunk().
     *
     * INPUT:
     *   - text: toàn bộ văn bản.
     *   - start: vị trí bắt đầu chunk hiện tại.
     *   - idealEnd: vị trí kết thúc lý tưởng theo CHUNK_SIZE.
     *   - length: tổng độ dài văn bản.
     *
     * OUTPUT:
     *   - Vị trí kết thúc thực tế (dùng cho substring()).
     *
     * LƯU Ý:
     *   - Nếu idealEnd đã là chunk cuối cùng (bằng length), không cần
     *     tìm khoảng trắng.
     */
    private int findCutPoint(String text, int start, int idealEnd, int length) {
        if (idealEnd >= length) {
            return length;
        }

        int lastSpace = text.lastIndexOf(' ', idealEnd);
        boolean spaceIsUsable = lastSpace > start
                && (idealEnd - lastSpace) <= MAX_LOOKBACK_FOR_SPACE;

        return spaceIsUsable ? lastSpace : idealEnd;
    }
}

/*
 * ============================================================
 * FLOW - FixedSizeChunkingService.chunk()
 * ============================================================
 *
 *   DocumentProcessingService
 *           │  content (String, toàn bộ text file)
 *           ▼
 *   chunk(content)
 *           │
 *           ▼
 *   start = 0
 *           │
 *   ┌───────────────────────────────────────────┐
 *   │  while (start < length):                   │
 *   │    idealEnd = start + 500 (hoặc length)     │
 *   │           │                                  │
 *   │           ▼                                  │
 *   │    findCutPoint() → lùi về khoảng trắng      │
 *   │           │                                  │
 *   │           ▼                                  │
 *   │    chunkText = text[start:end] → thêm vào    │
 *   │    List<String> nếu không rỗng               │
 *   │           │                                  │
 *   │    end >= length? ─yes─► break                │
     │           │no                                 │
 *   │           ▼                                  │
 *   │    start = end - 200 (OVERLAP)   ◄── khác    │
 *   │    biệt so với bản SimpleChunkingService cũ  │
 *   └───────────────────────────────────────────┘
 *           │
 *           ▼
 *   return List<String> chunks (mỗi chunk overlap 200 ký tự
 *   với chunk liền trước)
 * ============================================================
 */
