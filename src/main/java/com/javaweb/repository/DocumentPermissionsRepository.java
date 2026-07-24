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
            LEFT JOIN FETCH p.permissionDepartmentId
            JOIN FETCH p.grantedBy
            WHERE p.permissionsDocumentId.id = :documentId
            AND p.revokedAt IS NULL
            """)
    List<DocumentPermissionsEntity> findByDocumentIdWithDetails(@Param("documentId") Long documentId);

    // _Id là truy cập thuộc tính id của Document
    boolean existsByPermissionsDocumentId_IdAndPermissionDepartmentId_IdAndRevokedAtIsNull(Long documentId, Long departmentId);

    Optional<DocumentPermissionsEntity> findByPermissionsDocumentId_IdAndPermissionDepartmentId_IdAndRevokedAtIsNull(Long documentId, Long departmentId);

    boolean existsByPermissionsDocumentId_IdAndPermissionDepartmentIdIsNullAndRevokedAtIsNull(Long documentId);

    Optional<DocumentPermissionsEntity> findByPermissionsDocumentId_IdAndPermissionDepartmentIdIsNullAndRevokedAtIsNull(Long documentId);

    @Query("""
            SELECT p FROM DocumentPermissionsEntity p
            JOIN FETCH p.permissionsDocumentId
            LEFT JOIN FETCH p.permissionDepartmentId
            JOIN FETCH p.grantedBy
            WHERE p.revokedAt IS NULL
            ORDER BY p.createdAt DESC
            """)
    List<DocumentPermissionsEntity> findAllActivePermissions();

    @Query("""
            SELECT p FROM DocumentPermissionsEntity p
            JOIN FETCH p.permissionsDocumentId d
            LEFT JOIN FETCH p.permissionDepartmentId
            JOIN FETCH p.grantedBy
            WHERE p.revokedAt IS NULL
            AND d.departmentId = :departmentId
            ORDER BY p.createdAt DESC
            """)
    List<DocumentPermissionsEntity> findActivePermissionsByDepartmentId(@Param("departmentId") Integer departmentId);
}