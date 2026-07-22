package com.javaweb.repository;

import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.entity.UsersEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.javaweb.enums.UserRole;
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

	@Query("SELECT u FROM UsersEntity u WHERE " +
			"(:#{#role == null} = true OR u.role = :role) AND " +
			"(:#{#departmentId == null} = true OR u.department.id = :departmentId) AND " +
			"(:#{#isActive == null} = true OR u.isActive = :isActive) AND " +
			"(:#{#search == null} = true OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.userName) LIKE LOWER(CONCAT('%', :search, '%')))")
	Page<UsersEntity> searchUsers(
			@Param("search") String search,
			@Param("role") UserRole role,
			@Param("departmentId") Long departmentId,
			@Param("isActive") Boolean isActive,
			Pageable pageable);
}
