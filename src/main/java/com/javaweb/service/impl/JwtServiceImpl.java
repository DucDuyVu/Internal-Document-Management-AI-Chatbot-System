package com.javaweb.service.impl;


import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.javaweb.entity.UsersEntity;
import com.javaweb.service.JwtService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;


@Service
public class JwtServiceImpl implements JwtService {
	
	@Value("${jwt.secret}")
	private String secretKey;

	@Value("${jwt.access-token-expired}")
	private Duration accessTokenExpired;

	@Value("${jwt.refresh-token-expired}")
	private Duration refreshTokenExpired;
	
	@Value("${jwt.reset-password-token-expired}")
	private Duration resetPasswordTokenExpired;
	
	// Ký JWT khi tạo token + xác thực JWT khi đọc token
	private Key getSigningKey() {
		return Keys.hmacShaKeyFor(
				secretKey.getBytes(StandardCharsets.UTF_8));
	}
	
	// Giải mã JWT và lấy toàn bộ Claims (token)
	private Claims extractAllClaims(String token) {
		return Jwts.parser()
				.verifyWith((SecretKey) getSigningKey())
				.build()
				.parseSignedClaims(token)
				.getPayload();
	}
	@Override
	public String generateAccessToken(UsersEntity user) {
		return Jwts.builder()
				.subject(user.getEmail())
				.claim("userId", user.getId())
				.claim("role", user.getRole())
				.issuedAt(new Date())
				.expiration(new Date(
						System.currentTimeMillis() + resetPasswordTokenExpired.toMillis()
						))
				.signWith(getSigningKey())
				.compact();
	}
	
	@Override
	public String extractEmail(String token) {
		
		return extractAllClaims(token)
				.getSubject();
	}

	@Override
	public String extractRole(String token) {
		
		return extractAllClaims(token)
				.get("role", String.class);
	}

	@Override
	public Long extractUserId(String token) {
		
		return extractAllClaims(token)

	            .get("userId", Long.class);
	}

	@Override
	public boolean validateToken(String token) {
		try {
			extractAllClaims(token);
			return true;
		} catch (Exception e) {
			e.printStackTrace();
			return false;
		}
	}
	@Override
	public String generateRefreshToken(UsersEntity user) {
		
		return Jwts.builder()
				.subject(user.getEmail())
				.claim("userId", user.getId())
				.claim("role", user.getRole())
				.claim("type", "refresh")
				.issuedAt(new Date())
				.expiration(new Date(
				        System.currentTimeMillis() + refreshTokenExpired.toMillis()
				))
				.signWith(getSigningKey())
				.compact();
	}
	
	
	// Lấy thời gian hết hạn refresh token
	@Override
	public LocalDateTime extractExpirations(String token) {
		return extractAllClaims(token)
				.getExpiration()  // trả về Date 
				.toInstant()
				.atZone(ZoneId.systemDefault())
				.toLocalDateTime(); // convert LocalDateTime
	}

	@Override
	public String generateResetPasswordToken(UsersEntity user) {
		return Jwts.builder()
				.subject(user.getEmail())
				.claim("userId", user.getId())
				.claim("type", "reset")
				.issuedAt(new Date())
				.expiration(new Date(
						System.currentTimeMillis() + accessTokenExpired.toMillis()
						))
				.signWith(getSigningKey())
				.compact();
	}
}
