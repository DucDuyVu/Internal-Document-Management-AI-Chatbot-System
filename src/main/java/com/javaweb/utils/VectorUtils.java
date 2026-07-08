package com.javaweb.utils;

import java.util.Locale;
import java.util.StringJoiner;

/**
 * VectorUtils — helper thuần (không phụ thuộc Spring, không giữ state) để
 * convert vector embedding dạng float[] (do GeminiEmbeddingService trả về)
 * sang chuỗi text đúng cú pháp pgvector: "[0.1,0.2,...]".
 *
 * Tại sao cần: native query trong DocumentChunkRepository nhận tham số
 * :embeddingText kiểu String rồi tự CAST(:embeddingText AS vector) trong SQL.
 * JDBC không có kiểu "vector" built-in nên phải đi qua bước convert
 * String này (khác với VectorType.java — đó là convert 2 chiều cho
 * Entity field, còn đây là convert 1 chiều để bind tham số native query).
 *
 * Được tầng nào gọi:
 *   - RetrievalService.ask() (Milestone 3), ngay trước khi gọi
 *     DocumentChunkRepository.searchSimilarChunks(...).
 */
public final class VectorUtils {

    // Utility class: không cho phép khởi tạo instance
    private VectorUtils() {
    }

    /**
     * Convert float[] sang chuỗi pgvector "[v1,v2,...,v3072]".
     *
     * Input:  float[] embedding, độ dài 3072 (đúng theo gemini-embedding-001)
     * Output: String dạng "[0.12345678,-0.98765432,...]"
     *
     * Lưu ý:
     *   - BẮT BUỘC dùng Locale.US khi format số thực. Nếu không, trên máy
     *     có locale hệ thống dùng dấu phẩy làm phân cách thập phân (vd vi-VN),
     *     kết quả sẽ là "0,123" thay vì "0.123" -> Postgres parse vector sai
     *     hoàn toàn mà không báo lỗi rõ ràng ngay lập tức.
     *   - Dùng 8 chữ số thập phân là đủ độ chính xác cho cosine similarity,
     *     không cần full precision của float (tránh chuỗi quá dài).
     */
    public static String toPgVectorString(float[] embedding) {
        if (embedding == null || embedding.length == 0) {
            throw new IllegalArgumentException(
                    "Embedding rỗng hoặc null - không thể convert sang pgvector string");
        }

        StringJoiner joiner = new StringJoiner(",", "[", "]");
        for (float value : embedding) {
            joiner.add(String.format(Locale.US, "%.8f", value));
        }
        return joiner.toString();
    }
}

/*
 * ASCII Flow:
 *
 *   EmbeddingService.embed(question)
 *           │  (trả về float[3072])
 *           ▼
 *   VectorUtils.toPgVectorString(embedding)
 *           │  (trả về "[0.123,...]")
 *           ▼
 *   DocumentChunkRepository.searchSimilarChunks(embeddingText, deptId, topK)
 *           │  (String này được bind vào CAST(:embeddingText AS vector))
 *           ▼
 *   PostgreSQL tính "<=>" (cosine distance) ngay trong SQL
 */