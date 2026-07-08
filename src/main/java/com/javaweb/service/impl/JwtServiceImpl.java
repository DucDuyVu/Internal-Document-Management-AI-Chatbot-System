package com.javaweb.service.impl;


import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.LocalDateTime;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import com.javaweb.entity.UsersEntity;
import com.javaweb.service.JwtService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import lombok.Setter;

@Service
@Getter
@Setter
public class JwtServiceImpl implements JwtService {

	private static final String SECRET_KEY = "12345678901234567890123456789012";
	
	private static final long ACCESS_TOKEN_EXPIRED = 1000 * 60 * 30; // Thời gian truy cập hết hạn 30p
	
	private static final long REFRESH_TOKEN_EXPIRED = 1000 * 60 * 60 * 24; // Thời gian gia hạn token hết hạn 1 day
	
	
	// Ký JWT khi tạo token + xác thực JWT khi đọc token
	private Key getSigningKey() {
		return Keys.hmacShaKeyFor(
				SECRET_KEY.getBytes(StandardCharsets.UTF_8));
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
						System.currentTimeMillis() + ACCESS_TOKEN_EXPIRED
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
						System.currentTimeMillis() + REFRESH_TOKEN_EXPIRED
						))
				.signWith(getSigningKey())
				.compact();
	}
	
	
	// Lấy thời gian hết hạn refresh token
	@Override
	public Date extractExpirations(String token) {
		return extractAllClaims(token).getExpiration();
	}
}
