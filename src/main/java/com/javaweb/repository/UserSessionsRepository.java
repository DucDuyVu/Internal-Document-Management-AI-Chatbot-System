package com.javaweb.repository;

import com.javaweb.entity.UserSessionsEntity;
import com.javaweb.entity.UsersEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserSessionsRepository extends JpaRepository<UserSessionsEntity, Long> {
	Optional<UserSessionsEntity> findByRefreshToken(String refreshToken);
	
	List<UserSessionsEntity> findByUserId(UsersEntity user);
	
	Optional<UserSessionsEntity> findFirstByUserIdOrderByCreatedAtDesc(UsersEntity user);
	
	int countByUserIdAndIsRevokedFalse(UsersEntity user);
	
	@Query("SELECT COUNT(DISTINCT s.userId) FROM UserSessionsEntity s WHERE s.userId.department.id = :departmentId AND s.isRevoked = false AND s.expiresAt > CURRENT_TIMESTAMP")
	int countOnlineUsersByDepartmentId(@Param("departmentId") Long departmentId);

	@Query("SELECT COUNT(DISTINCT s.userId) FROM UserSessionsEntity s WHERE s.userId.department.id = :departmentId AND s.userId.role = :role AND s.isRevoked = false AND s.expiresAt > CURRENT_TIMESTAMP")
	int countOnlineUsersByDepartmentIdAndRole(@Param("departmentId") Long departmentId, @Param("role") com.javaweb.enums.UserRole role);

	@Query("SELECT COUNT(DISTINCT s.userId) FROM UserSessionsEntity s WHERE s.isRevoked = false AND s.expiresAt > CURRENT_TIMESTAMP")
	int countAllOnlineUsers();
}
