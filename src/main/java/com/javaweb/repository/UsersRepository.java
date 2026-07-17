package com.javaweb.repository;

import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.entity.UsersEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsersRepository extends JpaRepository<UsersEntity, Long> {

	Optional<UsersEntity> findByEmail(String email);

	boolean existsByUserName(String userName);

	boolean existsByEmail(String email);

	// Đếm user theo object phòng ban
	long countByDepartment(DepartmentsEntity department);

	// Đếm user theo id phòng ban
	long countByDepartmentId(Long departmentId);

	// Tìm xem còn users hoạt động thuộc phòng ban không
	boolean existsByDepartmentIdAndIsActiveTrue(Long id);
}
