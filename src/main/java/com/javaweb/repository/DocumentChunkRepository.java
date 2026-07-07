package com.javaweb.repository;

import com.javaweb.entity.DocumentChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface DocumentChunkRepository extends JpaRepository<DocumentChunk, Long> {

    /**
     * Vector search (cosine distance, toán tử "<=>" của pgvector) trong số các
     * chunk mà user có quyền xem — filter quyền được áp dụng NGAY TRONG SQL
     * (join sang document, lọc theo department_id) trước khi tính similarity,
     * chứ không lọc lại ở tầng Java sau khi đã lấy kết quả.
     *
     * Việc dùng native query bắt buộc vì Spring Data JPQL không hỗ trợ
     * toán tử "<=>" của pgvector.
     *
     * @param embeddingText  vector câu hỏi, dạng text kiểu pgvector: "[0.1,0.2,...]"
     * @param departmentId   phòng ban của user hỏi (NULL nếu là Admin không thuộc phòng ban nào)
     * @param topK           số chunk liên quan nhất cần lấy
     */
    @Query(value =
            "SELECT dc.* FROM document_chunks dc " +
            "JOIN document d ON dc.document_id = d.id " +
            "WHERE d.deleted_at IS NULL " +
            "AND d.status = 'COMPLETED' " +
            "AND (d.department_id = :departmentId OR d.department_id IS NULL) " +
            "ORDER BY dc.embedding <=> CAST(:embeddingText AS vector) " +
            "LIMIT :topK",
            nativeQuery = true)
    List<DocumentChunk> searchSimilarChunks(
            @Param("embeddingText") String embeddingText,
            @Param("departmentId") Integer departmentId,
            @Param("topK") int topK
    );

    List<DocumentChunk> findByDocumentId(Long documentId);

    /**
     * Xoá toàn bộ chunk thuộc về 1 document bằng JPQL DELETE trực tiếp,
     * KHÔNG load từng entity lên rồi xoá từng cái (khác với derived delete
     * method mặc định của Spring Data JPA). Lý do: load entity lên sẽ phải
     * đọc cả cột content, và trước khi sửa DocumentChunk.java (bỏ @Lob),
     * việc này có thể gây lỗi khi đọc ngoài transaction đang mở.
     * Dùng JPQL DELETE tránh hoàn toàn việc phải hydrate entity.
     *
     * Dùng khi DocumentProcessingService retry xử lý lại 1 document
     * (dọn sạch chunk cũ trước khi insert lại) hoặc khi xử lý lỗi
     * giữa chừng (dọn dẹp chunk đã lưu dở trước khi đánh dấu FAILED).
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM DocumentChunk dc WHERE dc.documentId = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);

        // Thêm vào trong interface DocumentChunkRepository, dưới findByDocumentId:
        int countByDocumentId(Long documentId);
}