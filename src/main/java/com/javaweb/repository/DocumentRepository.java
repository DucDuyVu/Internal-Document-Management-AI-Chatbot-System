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
        * Láº¥y danh sÃ¡ch tÃ i liá»‡u mÃ  1 user Ä‘Æ°á»£c phÃ©p xem:
        * - department_id = phÃ²ng ban cá»§a user, HOáº¶C
        * - department_id IS NULL (tÃ i liá»‡u dÃ¹ng chung, do Admin upload)
        * Äá»“ng thá»i loáº¡i bá» tÃ i liá»‡u Ä‘Ã£ xoÃ¡ má»m (deleted_at IS NOT NULL).
        */
       // Láº¥y danh sÃ¡ch tÃ i liá»‡u mÃ  1 user Ä‘Æ°á»£c phÃ©p xem + tÃ i liá»‡u do user upload
       @Query("SELECT d FROM DocumentEntity d " +
                     "WHERE d.deletedAt IS NULL " +
                     "AND (d.departmentId = :departmentId OR d.departmentId IS NULL) " +
                     "ORDER BY d.createdAt DESC")
       List<DocumentEntity> findVisibleToDepartment(@Param("departmentId") Integer departmentId);

       @Query("SELECT d FROM DocumentEntity d " +
                      "WHERE d.deletedAt IS NULL " +
                      "AND (d.departmentId = :departmentId OR d.departmentId IS NULL " +
                      "     OR EXISTS (SELECT 1 FROM DocumentPermissionsEntity p WHERE p.permissionsDocumentId = d AND p.revokedAt IS NULL AND (p.permissionDepartmentId.id = :departmentIdLong OR p.permissionDepartmentId IS NULL))) " +
                      "AND (CAST(d.approvalStatus AS String) = 'APPROVED' OR d.uploadedBy = :userId OR (:isManager = true AND d.departmentId = :departmentId)) ")
       Page<DocumentEntity> findVisibleToDepartmentWithSharing(
                      @Param("departmentId") Integer departmentId,
                      @Param("departmentIdLong") Long departmentIdLong,
                      @Param("userId") Long userId,
                      @Param("isManager") boolean isManager,
                      Pageable pageable);

       // TÃ¬m kiáº¿m tÃ i liá»‡u mÃ  1 user Ä‘Æ°á»£c phÃ©p xem + tÃ i liá»‡u do user upload (chá»‰ láº¥y
       // tÃ i liá»‡u Ä‘Ã£ COMPLETED)
       @Query("SELECT d FROM DocumentEntity d " +
                      "WHERE d.deletedAt IS NULL " +
                      "AND CAST(d.status AS String) = 'COMPLETED' " +
                      "AND (d.departmentId = :departmentId OR d.departmentId IS NULL " +
                      "     OR EXISTS (SELECT 1 FROM DocumentPermissionsEntity p WHERE p.permissionsDocumentId = d AND p.revokedAt IS NULL AND (p.permissionDepartmentId.id = :departmentIdLong OR p.permissionDepartmentId IS NULL))) " +
                      "AND (CAST(d.approvalStatus AS String) = 'APPROVED' OR d.uploadedBy = :userId OR (:isManager = true AND d.departmentId = :departmentId)) " +
                      "AND LOWER(d.fileName) LIKE LOWER(CONCAT('%', CAST(:search AS String), '%')) ")
       Page<DocumentEntity> searchVisibleToDepartmentWithPermissions(
                      @Param("departmentId") Integer departmentId,
                      @Param("departmentIdLong") Long departmentIdLong,
                      @Param("userId") Long userId,
                      @Param("isManager") boolean isManager,
                      @Param("search") String search,
                      Pageable pageable);

       @Query("SELECT d FROM DocumentEntity d " +
                     "WHERE d.deletedAt IS NULL " +
                     "AND CAST(d.status AS String) = 'COMPLETED' " +
                     "AND LOWER(d.fileName) LIKE LOWER(CONCAT('%', CAST(:search AS String), '%')) ")
       Page<DocumentEntity> searchAll(@Param("search") String search, Pageable pageable);

       /**
        * Admin xem toÃ n bá»™ (ká»ƒ cáº£ tÃ i liá»‡u riÃªng cá»§a má»i phÃ²ng ban), chÆ°a xoÃ¡ má»m.
        */
       List<DocumentEntity> findByDeletedAtIsNull();

       Page<DocumentEntity> findByDeletedAtIsNull(Pageable pageable);

       @Query("SELECT d FROM DocumentEntity d WHERE d.deletedAt IS NULL " +
                     "AND (CAST(:search AS String) IS NULL OR CAST(:search AS String) = '' OR LOWER(d.fileName) LIKE LOWER(CONCAT('%', CAST(:search AS String), '%'))) "
                     +
                     "AND (CAST(:filter AS String) = 'ALL' " +
                     "  OR (CAST(:filter AS String) = 'COMPLETED' AND CAST(d.status AS String) = 'COMPLETED') " +
                     "  OR (CAST(:filter AS String) = 'PENDING' AND (CAST(d.status AS String) = 'PENDING' OR CAST(d.approvalStatus AS String) = 'PENDING')) "
                     +
                     "  OR (CAST(:filter AS String) = 'PROCESSING' AND CAST(d.status AS String) = 'PROCESSING') "
                     +
                     "  OR ((CAST(:filter AS String) = 'FAILED' OR CAST(:filter AS String) = 'FAILED_OR_REJECTED') AND (CAST(d.status AS String) = 'FAILED' OR CAST(d.approvalStatus AS String) = 'REJECTED')))")
       Page<DocumentEntity> searchAdminDocuments(@Param("search") String search, @Param("filter") String filter,
                     Pageable pageable);

       @Query("SELECT d FROM DocumentEntity d WHERE d.deletedAt IS NULL AND CAST(d.status AS String) = 'COMPLETED' AND CAST(d.approvalStatus AS String) = 'APPROVED' ORDER BY d.createdAt DESC")
       List<DocumentEntity> findShareableDocuments();

       @Query("SELECT COUNT(d) FROM DocumentEntity d WHERE d.uploadedBy = :userId AND CAST(d.approvalStatus AS String) = 'APPROVED' AND d.deletedAt IS NULL")
       long countApprovedByUserId(@Param("userId") Long userId);

       /**
        * TÃ¬m danh sÃ¡ch tÃ i liá»‡u thuá»™c má»™t phÃ²ng ban cá»¥ thá»ƒ, cÃ³ tráº¡ng thÃ¡i phÃª duyá»‡t
        * náº±m trong danh sÃ¡ch cho trÆ°á»›c vÃ  chÆ°a bá»‹ xÃ³a má»m. (VÃ­ dá»¥: TÃ¬m cÃ¡c tÃ i liá»‡u
        * PENDING/APPROVED)
        */
       List<DocumentEntity> findByDepartmentIdAndApprovalStatusInAndDeletedAtIsNull(Integer departmentId,
                     List<ApprovalStatus> approvalStatuses);

       /**
        * Äáº¿m tá»•ng sá»‘ tÃ i liá»‡u do má»™t user (nhÃ¢n viÃªn) cá»¥ thá»ƒ táº£i lÃªn (chÆ°a bá»‹ xoÃ¡
        * má»m).
        */
       long countByUploadedByAndDeletedAtIsNull(Long uploadedBy);

       /**
        * Äáº¿m tá»•ng sá»‘ lÆ°á»£ng tÃ i liá»‡u thuá»™c vá» má»™t phÃ²ng ban cá»¥ thá»ƒ (chÆ°a bá»‹ xoÃ¡ má»m).
        */
       long countByDepartmentIdAndDeletedAtIsNull(Integer departmentId);

       /**
        * Äáº¿m sá»‘ lÆ°á»£ng tÃ i liá»‡u cá»§a má»™t phÃ²ng ban theo tráº¡ng thÃ¡i xá»­ lÃ½ AI cá»¥ thá»ƒ
        * (PENDING, COMPLETED, FAILED...).
        */
       @Query("SELECT COUNT(d) FROM DocumentEntity d WHERE d.departmentId = :departmentId AND CAST(d.status AS String) = :#{#status.name()} AND d.deletedAt IS NULL")
       long countByDepartmentIdAndStatusAndDeletedAtIsNull(@Param("departmentId") Integer departmentId, @Param("status") DocumentStatus status);

       /**
        * Äáº¿m tá»•ng sá»‘ tÃ i liá»‡u trÃªn toÃ n há»‡ thá»‘ng theo má»™t tráº¡ng thÃ¡i xá»­ lÃ½ AI cá»¥ thá»ƒ.
        * (ÄÆ°á»£c dÃ¹ng trong Dashboard Admin Ä‘á»ƒ láº¥y sá»‘ lÆ°á»£ng "TÃ i liá»‡u lá»—i" - FAILED).
        */
       @Query("SELECT COUNT(d) FROM DocumentEntity d WHERE CAST(d.status AS String) = :#{#status.name()} AND d.deletedAt IS NULL")
       long countByStatusAndDeletedAtIsNull(@Param("status") DocumentStatus status);

       /**
        * Äáº¿m tá»•ng sá»‘ tÃ i liá»‡u chÆ°a Ä‘Æ°á»£c gÃ¡n cho báº¥t ká»³ phÃ²ng ban nÃ o (department_id IS
        * NULL).
        * (ÄÆ°á»£c dÃ¹ng trong Dashboard Admin Ä‘á»ƒ Ä‘áº¿m "TÃ i liá»‡u chÆ°a phÃ¢n quyá»n").
        */
       long countByDepartmentIdIsNullAndDeletedAtIsNull();

       /**
        * Láº¥y danh sÃ¡ch tÃ i liá»‡u do má»™t user cá»¥ thá»ƒ táº£i lÃªn (chÆ°a xoÃ¡ má»m),
        * cÃ³ phÃ¢n trang vÃ  sáº¯p xáº¿p theo thá»i gian táº¡o má»›i nháº¥t.
        */
       List<DocumentEntity> findByUploadedByAndDeletedAtIsNullOrderByCreatedAtDesc(Long uploadedBy, Pageable pageable);

       @Query("SELECT d FROM DocumentEntity d WHERE CAST(d.status AS String) = :#{#status.name()}")
       List<DocumentEntity> findByStatus(@Param("status") DocumentStatus status);

       @Query("SELECT d FROM DocumentEntity d WHERE CAST(d.status AS String) = :#{#status.name()} AND CAST(d.approvalStatus AS String) = :#{#approvalStatus.name()}")
       List<DocumentEntity> findByStatusAndApprovalStatus(@Param("status") DocumentStatus status, @Param("approvalStatus") ApprovalStatus approvalStatus);

       @Query("SELECT d FROM DocumentEntity d WHERE CAST(d.status AS String) = :#{#status.name()} AND d.updatedAt < :dateTime")
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

