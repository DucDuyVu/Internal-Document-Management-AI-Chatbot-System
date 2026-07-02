package com.javaweb.repository;

import com.javaweb.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    /**
     * Lấy danh sách tài liệu mà 1 user được phép xem:
     *  - department_id = phòng ban của user, HOẶC
     *  - department_id IS NULL (tài liệu dùng chung, do Admin upload)
     * Đồng thời loại bỏ tài liệu đã xoá mềm (deleted_at IS NOT NULL).
     */
    @Query("SELECT d FROM Document d " +
           "WHERE d.deletedAt IS NULL " +
           "AND (d.departmentId = :departmentId OR d.departmentId IS NULL) " +
           "ORDER BY d.createdAt DESC")
    List<Document> findVisibleToDepartment(@Param("departmentId") Integer departmentId);

    /**
     * Admin xem toàn bộ (kể cả tài liệu riêng của mọi phòng ban), chưa xoá mềm.
     */
    List<Document> findByDeletedAtIsNull();
}