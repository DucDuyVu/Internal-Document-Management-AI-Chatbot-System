package com.javaweb.service;

import com.javaweb.entity.UsersEntity;

public interface JwtService {

	String generateAccessToken(UsersEntity user);
	
	String extractEmail(String token);
	
	String extractRole(String token);
	
	Long extractUserId(String token);
	
	boolean validateToken(String token);
}
