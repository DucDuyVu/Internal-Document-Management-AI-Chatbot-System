package com.javaweb.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.UserSessionsEntity;
import com.javaweb.entity.UsersEntity;

public interface UserSessionsRepository extends JpaRepository<UserSessionsEntity, Long> {
	Optional<UserSessionsEntity> findByRefreshToken(String refreshToken);
	
	List<UserSessionsEntity> findByUserId(UsersEntity user);
}
