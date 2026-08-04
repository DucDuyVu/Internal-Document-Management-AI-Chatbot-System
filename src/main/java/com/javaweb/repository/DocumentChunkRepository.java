package com.javaweb.repository;

import com.javaweb.entity.DocumentChunkEntity;
import com.javaweb.rag.retrieval.SearchResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunkEntity, Long> {

        /**
         * Vector search (cosine distance, toán tử "<=>" của pgvector) trong số các
         * chunk mà user có quyền xem — filter quyền áp dụng NGAY TRONG SQL (join
         * sang document, lọc theo department_id) TRƯỚC KHI tính similarity.
         *
         * Dùng ở đâu: RetrievalService.ask() (Milestone 3) gọi method này sau khi
         * đã embed câu hỏi và convert sang chuỗi pgvector qua VectorUtils.
         *
         * Input:
         * 
         * @param embeddingText vector câu hỏi dạng text pgvector "[0.1,0.2,...]"
         *                      (tạo bởi VectorUtils.toPgVectorString)
         * @param departmentId  phòng ban của user hỏi (NULL nếu Admin, sẽ chỉ
         *                      thấy tài liệu department_id IS NULL - dùng chung)
         * @param topK          số chunk liên quan nhất cần lấy
         *                      Output:
         *                      List<SearchResult> - đã sắp xếp theo similarity tăng dần
         *                      (gần nhất
         *                      trước, vì "<=>" là KHOẢNG CÁCH: giá trị càng NHỎ càng
         *                      liên quan)
         *
         *                      Lưu ý: cố tình KHÔNG SELECT cột "embedding" (không cần
         *                      dùng lại vector
         *                      gốc sau khi đã tính xong similarity trong SQL - tránh
         *                      kéo 3072 số thực
         *                      về Java một cách lãng phí cho mỗi kết quả trong top-K).
         */
        default List<SearchResult> searchSimilarChunks(String embeddingText, Integer departmentId, int topK) {
                List<Object[]> rows = searchSimilarChunksRaw(embeddingText, departmentId, topK);
                List<SearchResult> results = new ArrayList<>(rows.size());

                for (Object[] row : rows) {
                        // Thứ tự cột PHẢI khớp đúng với thứ tự SELECT trong
                        // searchSimilarChunksRaw bên dưới. Nếu sửa SELECT, phải sửa
                        // index ở đây theo, không có cơ chế nào tự đồng bộ 2 chỗ này.
                        DocumentChunkEntity chunk = new DocumentChunkEntity();
                        chunk.setId(((Number) row[0]).longValue());
                        chunk.setDocumentId(((Number) row[1]).longValue());
                        chunk.setChunkIndex(((Number) row[2]).intValue());
                        chunk.setPageNumber(row[3] == null ? null : ((Number) row[3]).intValue());
                        chunk.setContent((String) row[4]);
                        chunk.setCreatedAt(((Timestamp) row[5]).toLocalDateTime());
                        // embedding cố tình để null - xem lưu ý trong JavaDoc phía trên

                        double similarity = ((Number) row[6]).doubleValue();
                        results.add(new SearchResult(chunk, similarity));
                }
                return results;
        }

        /**
         * Native query thực sự chạy dưới DB. Không gọi trực tiếp method này từ
         * Service - luôn đi qua searchSimilarChunks(...) ở trên để nhận về
         * SearchResult đã map sẵn thay vì Object[] thô.
         */
        @Query(value = "SELECT dc.id, dc.document_id, dc.chunk_index, dc.page_number, " +
                        "       dc.content, dc.created_at, " +
                        "       (dc.embedding <=> CAST(:embeddingText AS vector)) AS similarity_score " +
                        "FROM document_chunks dc " +
                        "JOIN document d ON dc.document_id = d.id " +
                        "WHERE d.deleted_at IS NULL " +
                        "AND CAST(d.status AS text) = 'COMPLETED' " +
                        "AND (d.department_id = :departmentId OR d.department_id IS NULL) " +
                        "ORDER BY similarity_score " +
                        "LIMIT :topK", nativeQuery = true)
        List<Object[]> searchSimilarChunksRaw(
                        @Param("embeddingText") String embeddingText,
                        @Param("departmentId") Integer departmentId,
                        @Param("topK") int topK);

        List<DocumentChunkEntity> findByDocumentId(Long documentId);

        /**
         * Xoá toàn bộ chunk thuộc về 1 document bằng JPQL DELETE trực tiếp,
         * KHÔNG load từng entity lên rồi xoá từng cái. Dùng khi
         * DocumentProcessingService retry xử lý lại 1 document, hoặc dọn dẹp
         * chunk lưu dở khi xử lý lỗi giữa chừng.
         */
        @Modifying
        @Transactional
        @Query("DELETE FROM DocumentChunkEntity dc WHERE dc.documentId = :documentId")
        void deleteByDocumentId(@Param("documentId") Long documentId);

        int countByDocumentId(Long documentId);
}
/*
 * ASCII Flow - searchSimilarChunks:
 * 
 * Service gọi: searchSimilarChunks(embeddingText, departmentId, topK)
 * │
 * ▼
 * searchSimilarChunksRaw(...) ← @Query native, Spring Data tự generate
 * │ (Postgres tính "<=>" ngay trong SQL, lọc quyền TRƯỚC khi tính)
 * ▼
 * List<Object[]> mỗi row = [id, document_id, chunk_index, page_number,
 * content, created_at, similarity_score]
 * │
 * ▼ (vòng for, map tay theo đúng index)
 * List<SearchResult> (chunk: DocumentChunkEntity không có embedding,
 * similarity: double)
 * │
 * ▼
 * Trả về cho Service (RetrievalService, Milestone 3)
 */