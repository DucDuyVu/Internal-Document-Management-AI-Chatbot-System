package com.javaweb.repository;

import com.javaweb.entity.UserSessionsEntity;
import com.javaweb.entity.UsersEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserSessionsRepository extends JpaRepository<UserSessionsEntity, Long> {
	Optional<UserSessionsEntity> findByRefreshToken(String refreshToken);
	
	List<UserSessionsEntity> findByUserId(UsersEntity user);
}
