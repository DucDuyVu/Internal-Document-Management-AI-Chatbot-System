package com.javaweb.repository;

import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.entity.enums.ApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import org.springframework.data.jpa.repository.Modifying;

@Repository
public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> {

       /**
        * Lấy danh sách tài liệu mà 1 user được phép xem:
        * - department_id = phòng ban của user, HOẶC
        * - department_id IS NULL (tài liệu dùng chung, do Admin upload)
        * Đồng thời loại bỏ tài liệu đã xoá mềm (deleted_at IS NOT NULL).
        */
       // Lấy danh sách tài liệu mà 1 user được phép xem + tài liệu do user upload
       @Query("SELECT d FROM DocumentEntity d " +
                     "WHERE d.deletedAt IS NULL " +
                     "AND (d.departmentId = :departmentId OR d.departmentId IS NULL) " +
                     "ORDER BY d.createdAt DESC")
       List<DocumentEntity> findVisibleToDepartment(@Param("departmentId") Integer departmentId);

       @Query("SELECT DISTINCT d FROM DocumentEntity d " +
                     "LEFT JOIN DocumentPermissionsEntity p ON p.permissionsDocumentId = d AND p.revokedAt IS NULL " +
                     "WHERE d.deletedAt IS NULL " +
                     "AND (d.departmentId = :departmentId OR d.departmentId IS NULL " +
                     "     OR (p.id IS NOT NULL AND p.permissionDepartmentId.id = :departmentIdLong) " +
                     "     OR (p.id IS NOT NULL AND p.permissionDepartmentId IS NULL)) " +
                     "AND (CAST(d.approvalStatus AS string) = 'APPROVED' OR d.uploadedBy = :userId OR (:isManager = true AND d.departmentId = :departmentId)) " +
                     "ORDER BY d.createdAt DESC")
       Page<DocumentEntity> findVisibleToDepartmentWithSharing(
                     @Param("departmentId") Integer departmentId,
                     @Param("departmentIdLong") Long departmentIdLong,
                     @Param("userId") Long userId,
                     @Param("isManager") boolean isManager,
                     Pageable pageable);

       // Tìm kiếm tài liệu mà 1 user được phép xem + tài liệu do user upload (chỉ lấy
       // tài liệu đã COMPLETED)
       @Query("SELECT DISTINCT d FROM DocumentEntity d " +
                     "LEFT JOIN DocumentPermissionsEntity p ON p.permissionsDocumentId = d AND p.revokedAt IS NULL " +
                     "WHERE d.deletedAt IS NULL " +
                     "AND CAST(d.status AS string) = 'COMPLETED' " +
                     "AND (d.departmentId = :departmentId OR d.departmentId IS NULL " +
                     "     OR (p.id IS NOT NULL AND p.permissionDepartmentId.id = :departmentIdLong) " +
                     "     OR (p.id IS NOT NULL AND p.permissionDepartmentId IS NULL)) " +
                     "AND (CAST(d.approvalStatus AS string) = 'APPROVED' OR d.uploadedBy = :userId OR (:isManager = true AND d.departmentId = :departmentId)) "
                     +
                     "AND LOWER(d.fileName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
                     "ORDER BY d.createdAt DESC")
       Page<DocumentEntity> searchVisibleToDepartmentWithPermissions(
                     @Param("departmentId") Integer departmentId,
                     @Param("departmentIdLong") Long departmentIdLong,
                     @Param("userId") Long userId,
                     @Param("isManager") boolean isManager,
                     @Param("search") String search,
                     Pageable pageable);

       @Query("SELECT d FROM DocumentEntity d " +
                     "WHERE d.deletedAt IS NULL " +
                     "AND CAST(d.status AS string) = 'COMPLETED' " +
                     "AND LOWER(d.fileName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
                     "ORDER BY d.createdAt DESC")
       Page<DocumentEntity> searchAll(@Param("search") String search, Pageable pageable);

       /**
        * Admin xem toàn bộ (kể cả tài liệu riêng của mọi phòng ban), chưa xoá mềm.
        */
       List<DocumentEntity> findByDeletedAtIsNull();

       Page<DocumentEntity> findByDeletedAtIsNull(Pageable pageable);

       @Query("SELECT d FROM DocumentEntity d WHERE d.deletedAt IS NULL " +
                     "AND (CAST(:search AS string) IS NULL OR CAST(:search AS string) = '' OR LOWER(d.fileName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) "
                     +
                     "AND (CAST(:filter AS string) = 'ALL' " +
                     "  OR (CAST(:filter AS string) = 'COMPLETED' AND CAST(d.status AS string) = 'COMPLETED') " +
                     "  OR (CAST(:filter AS string) = 'PENDING' AND (CAST(d.status AS string) = 'PENDING' OR CAST(d.approvalStatus AS string) = 'PENDING')) "
                     +
                     "  OR (CAST(:filter AS string) = 'PROCESSING' AND CAST(d.status AS string) = 'PROCESSING') "
                     +
                     "  OR ((CAST(:filter AS string) = 'FAILED' OR CAST(:filter AS string) = 'FAILED_OR_REJECTED') AND (CAST(d.status AS string) = 'FAILED' OR CAST(d.approvalStatus AS string) = 'REJECTED')))"
                     +
                     "ORDER BY d.createdAt DESC")
       Page<DocumentEntity> searchAdminDocuments(@Param("search") String search, @Param("filter") String filter,
                     Pageable pageable);

       @Query("SELECT d FROM DocumentEntity d WHERE d.deletedAt IS NULL AND CAST(d.status AS string) = 'COMPLETED' AND CAST(d.approvalStatus AS string) = 'APPROVED' ORDER BY d.createdAt DESC")
       List<DocumentEntity> findShareableDocuments();

       @Query("SELECT COUNT(d) FROM DocumentEntity d WHERE d.uploadedBy = :userId AND CAST(d.approvalStatus AS string) = 'APPROVED' AND d.deletedAt IS NULL")
       long countApprovedByUserId(@Param("userId") Long userId);

       /**
        * Tìm danh sách tài liệu thuộc một phòng ban cụ thể, có trạng thái phê duyệt
        * nằm trong danh sách cho trước và chưa bị xóa mềm. (Ví dụ: Tìm các tài liệu
        * PENDING/APPROVED)
        */
       List<DocumentEntity> findByDepartmentIdAndApprovalStatusInAndDeletedAtIsNull(Integer departmentId,
                     List<ApprovalStatus> approvalStatuses);

       /**
        * Đếm tổng số tài liệu do một user (nhân viên) cụ thể tải lên (chưa bị xoá
        * mềm).
        */
       long countByUploadedByAndDeletedAtIsNull(Long uploadedBy);

       /**
        * Đếm tổng số lượng tài liệu thuộc về một phòng ban cụ thể (chưa bị xoá mềm).
        */
       long countByDepartmentIdAndDeletedAtIsNull(Integer departmentId);

       /**
        * Đếm số lượng tài liệu của một phòng ban theo trạng thái xử lý AI cụ thể
        * (PENDING, COMPLETED, FAILED...).
        */
       @Query("SELECT COUNT(d) FROM DocumentEntity d WHERE d.departmentId = :departmentId AND CAST(d.status AS string) = :#{#status.name()} AND d.deletedAt IS NULL")
       long countByDepartmentIdAndStatusAndDeletedAtIsNull(@Param("departmentId") Integer departmentId, @Param("status") DocumentStatus status);

       /**
        * Đếm tổng số tài liệu trên toàn hệ thống theo một trạng thái xử lý AI cụ thể.
        * (Được dùng trong Dashboard Admin để lấy số lượng "Tài liệu lỗi" - FAILED).
        */
       @Query("SELECT COUNT(d) FROM DocumentEntity d WHERE CAST(d.status AS string) = :#{#status.name()} AND d.deletedAt IS NULL")
       long countByStatusAndDeletedAtIsNull(@Param("status") DocumentStatus status);

       /**
        * Đếm tổng số tài liệu chưa được gán cho bất kỳ phòng ban nào (department_id IS
        * NULL).
        * (Được dùng trong Dashboard Admin để đếm "Tài liệu chưa phân quyền").
        */
       long countByDepartmentIdIsNullAndDeletedAtIsNull();

       /**
        * Lấy danh sách tài liệu do một user cụ thể tải lên (chưa xoá mềm),
        * có phân trang và sắp xếp theo thời gian tạo mới nhất.
        */
       List<DocumentEntity> findByUploadedByAndDeletedAtIsNullOrderByCreatedAtDesc(Long uploadedBy, Pageable pageable);

       @Query("SELECT d FROM DocumentEntity d WHERE CAST(d.status AS string) = :#{#status.name()}")
       List<DocumentEntity> findByStatus(@Param("status") DocumentStatus status);

       @Query("SELECT d FROM DocumentEntity d WHERE CAST(d.status AS string) = :#{#status.name()} AND CAST(d.approvalStatus AS string) = :#{#approvalStatus.name()}")
       List<DocumentEntity> findByStatusAndApprovalStatus(@Param("status") DocumentStatus status, @Param("approvalStatus") ApprovalStatus approvalStatus);

       @Query("SELECT d FROM DocumentEntity d WHERE CAST(d.status AS string) = :#{#status.name()} AND d.updatedAt < :dateTime")
       List<DocumentEntity> findByStatusAndUpdatedAtBefore(@Param("status") DocumentStatus status, @Param("dateTime") java.time.LocalDateTime dateTime);

       List<DocumentEntity> findByStatusAndApprovalStatusAndUpdatedAtBefore(DocumentStatus status,
                     ApprovalStatus approvalStatus, java.time.LocalDateTime dateTime);

       @Modifying
       @Query("UPDATE DocumentEntity d SET d.status = :newStatus, d.aiPurpose = :aiPurpose, d.aiSummary = :aiSummary, d.aiTags = :aiTags, d.updatedAt = :updatedAt WHERE d.id IN :ids")
       void updateDocumentsStatusAndAiInfo(
                     @Param("ids") List<Long> ids,
                     @Param("newStatus") DocumentStatus newStatus,
                     @Param("aiPurpose") String aiPurpose,
                     @Param("aiSummary") String aiSummary,
                     @Param("aiTags") String aiTags,
                     @Param("updatedAt") java.time.LocalDateTime updatedAt);
}
