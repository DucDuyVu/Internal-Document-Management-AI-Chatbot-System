package com.javaweb.rag.chunking;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit Test cho FixedSizeChunkingService.
 *
 * Mục tiêu:
 * - Kiểm tra service có chia được tài liệu thành nhiều chunk.
 * - Đảm bảo không sinh chunk rỗng.
 * - Đảm bảo mỗi chunk không vượt quá kích thước quy định.
 */
class FixedSizeChunkingServiceTest {

    @Test
    void shouldChunkDocumentSuccessfully() {

        // Khởi tạo service
        ChunkingService service = new FixedSizeChunkingService();

        // Tạo chuỗi khoảng 2000 ký tự
        StringBuilder builder = new StringBuilder();

        for (int i = 0; i < 2000; i++) {
            builder.append("abc cdf");
        }

        // Thực hiện chunking
        List<String> chunks = service.chunk(builder.toString());

        // Danh sách không được null
        assertNotNull(chunks);

        // Phải tạo được ít nhất 2 chunk
        assertTrue(chunks.size() > 1);

        // Không chunk nào rỗng
        for (String chunk : chunks) {
            assertFalse(chunk.isBlank());

            // Không vượt quá 500 ký tự
            assertTrue(chunk.length() <= 500);
        }
    }

}