package com.javaweb.repository;

import com.javaweb.entity.DocumentPermissionsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DocumentPermissionsRepository extends JpaRepository<DocumentPermissionsEntity, Long> {
    @Query("""
            SELECT p FROM DocumentPermissionsEntity p
            JOIN FETCH p.department
            JOIN FETCH p.grantedBy
            WHERE p.document.id = : documentId
            """)
    List<DocumentPermissionsEntity> findByDocumentIdWithDetails(@Param("documentId") Long documentId);

    // _Id là truy cập thuộc tính id của Document
    boolean existsByDocument_IdAndDepartment_Id(Long documentId, Long departmentId);

    void deleteByDocument_IdAndDepartment_Id(Long documentId, Long departmentId);
}