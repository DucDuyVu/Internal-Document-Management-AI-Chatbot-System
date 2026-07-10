package com.javaweb.service;

import java.time.LocalDateTime;

import com.javaweb.entity.UsersEntity;

public interface JwtService {

	String generateAccessToken(UsersEntity user);

	String generateRefreshToken(UsersEntity user);

	String generateResetPasswordToken(UsersEntity user);

	String extractEmail(String token);

	String extractRole(String token);

	Long extractUserId(String token);

	boolean validateToken(String token);

	LocalDateTime extractExpirations(String token);

	String generateResetToken (UsersEntity users);
}
