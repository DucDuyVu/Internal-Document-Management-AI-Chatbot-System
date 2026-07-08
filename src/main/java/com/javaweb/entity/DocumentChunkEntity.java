package com.javaweb.entity;

import com.javaweb.utils.VectorType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng "document_chunks" trong schema.sql.
 * embedding: float[3072] <-> cột VECTOR(3072) (gemini-embedding-001),
 * được convert qua lại nhờ VectorType (custom Hibernate UserType).
 *
 * LƯU Ý QUAN TRỌNG:
 *   Field "content" KHÔNG được đánh dấu @Lob. Cột content trong
 *   schema.sql là kiểu TEXT thường của PostgreSQL, không phải Large
 *   Object. Nếu dùng @Lob, Hibernate sẽ ánh xạ sang CLOB (dùng con
 *   trỏ OID nội bộ của Postgres), loại này bắt buộc đọc trong 1
 *   transaction đang mở thật sự (auto-commit=false), gây lỗi
 *   "Large Objects may not be used in auto-commit mode" mỗi khi đọc
 *   lại chunk ở request/transaction khác (ví dụ ở Retrieval API sau
 *   này). Đây là lỗi đã gặp thực tế ở integration test Day 4.
 */
@Entity
@Table(name = "document_chunks")
public class DocumentChunkEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "chunk_index", nullable = false)
    private Integer chunkIndex;

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Type(VectorType.class)
    @Column(name = "embedding", columnDefinition = "vector(3072)")
    private float[] embedding;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public DocumentChunkEntity() {
    }

    // ===== Getters & Setters =====

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public Integer getChunkIndex() {
        return chunkIndex;
    }

    public void setChunkIndex(Integer chunkIndex) {
        this.chunkIndex = chunkIndex;
    }

    public Integer getPageNumber() {
        return pageNumber;
    }

    public void setPageNumber(Integer pageNumber) {
        this.pageNumber = pageNumber;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public float[] getEmbedding() {
        return embedding;
    }

    public void setEmbedding(float[] embedding) {
        this.embedding = embedding;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}