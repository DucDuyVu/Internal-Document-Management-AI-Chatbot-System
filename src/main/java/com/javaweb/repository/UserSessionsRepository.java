package com.javaweb.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.UserSessionsEntity;

public interface UserSessionsRepository extends JpaRepository<UserSessionsEntity, Long> {
	Optional<UserSessionsEntity> findByRefreshToken(String refreshToken);
	
}
