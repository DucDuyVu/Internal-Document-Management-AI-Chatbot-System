package com.javaweb.repository;

import com.javaweb.entity.DocumentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> {

    /**
     * Lấy danh sách tài liệu mà 1 user được phép xem:
     *  - department_id = phòng ban của user, HOẶC
     *  - department_id IS NULL (tài liệu dùng chung, do Admin upload)
     * Đồng thời loại bỏ tài liệu đã xoá mềm (deleted_at IS NOT NULL).
     */
    @Query("SELECT d FROM DocumentEntity d " +
           "WHERE d.deletedAt IS NULL " +
           "AND (d.departmentId = :departmentId OR d.departmentId IS NULL) " +
           "ORDER BY d.createdAt DESC")
    List<DocumentEntity> findVisibleToDepartment(@Param("departmentId") Integer departmentId);

    @Query("SELECT DISTINCT d FROM DocumentEntity d " +
           "LEFT JOIN DocumentPermissionsEntity p ON p.permissionsDocumentId = d AND p.revokedAt IS NULL " +
           "WHERE d.deletedAt IS NULL " +
           "AND (d.departmentId = :departmentId OR d.departmentId IS NULL OR p.permissionDepartmentId.id = :departmentIdLong OR p.permissionDepartmentId IS NULL) " +
           "ORDER BY d.createdAt DESC")
    org.springframework.data.domain.Page<DocumentEntity> findVisibleToDepartmentWithSharing(
            @Param("departmentId") Integer departmentId,
            @Param("departmentIdLong") Long departmentIdLong,
            org.springframework.data.domain.Pageable pageable);

    @Query("SELECT DISTINCT d FROM DocumentEntity d " +
           "LEFT JOIN DocumentPermissionsEntity p ON p.permissionsDocumentId = d AND p.revokedAt IS NULL " +
           "WHERE d.deletedAt IS NULL " +
           "AND (d.departmentId = :departmentId OR d.departmentId IS NULL OR p.permissionDepartmentId.id = :departmentIdLong OR p.permissionDepartmentId IS NULL) " +
           "AND LOWER(d.fileName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "ORDER BY d.createdAt DESC")
    Page<DocumentEntity> searchVisibleToDepartmentWithPermissions(
            @Param("departmentId") Integer departmentId, 
            @Param("departmentIdLong") Long departmentIdLong, 
            @Param("search") String search, 
            Pageable pageable);

    @Query("SELECT d FROM DocumentEntity d " +
           "WHERE d.deletedAt IS NULL " +
           "AND LOWER(d.fileName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "ORDER BY d.createdAt DESC")
    Page<DocumentEntity> searchAll(@Param("search") String search, Pageable pageable);

    /**
     * Admin xem toàn bộ (kể cả tài liệu riêng của mọi phòng ban), chưa xoá mềm.
     */
    List<DocumentEntity> findByDeletedAtIsNull();
    long countByUploadedByAndDeletedAtIsNull(Long uploadedBy);

    List<DocumentEntity> findByUploadedByAndDeletedAtIsNullOrderByCreatedAtDesc(Long uploadedBy, Pageable pageable);
}
