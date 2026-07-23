package com.javaweb.repository;

import com.javaweb.entity.DocumentPermissionsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DocumentPermissionsRepository extends JpaRepository<DocumentPermissionsEntity, Long> {
    @Query("""
            SELECT p FROM DocumentPermissionsEntity p
            JOIN FETCH p.permissionDepartmentId
            JOIN FETCH p.grantedBy
            WHERE p.permissionsDocumentId.id = :documentId
            AND p.revokedAt IS NULL
            """)
    List<DocumentPermissionsEntity> findByDocumentIdWithDetails(@Param("documentId") Long documentId);

    // _Id là truy cập thuộc tính id của Document
    boolean existsByPermissionsDocumentId_IdAndPermissionDepartmentId_IdAndRevokedAtIsNull(Long documentId, Long departmentId);

    Optional<DocumentPermissionsEntity> findByPermissionsDocumentId_IdAndPermissionDepartmentId_IdAndRevokedAtIsNull(Long documentId, Long departmentId);
}