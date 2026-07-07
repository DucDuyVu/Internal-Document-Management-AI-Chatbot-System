package com.javaweb.service.impl;


import java.nio.charset.StandardCharsets;
import java.security.Key;
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
	
	private static final long ACCESS_TOKEN_EXPIRED = 1000 * 60 * 30;
	
	private Key getSigningKey() {
		return Keys.hmacShaKeyFor(
				SECRET_KEY.getBytes(StandardCharsets.UTF_8));
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
	
	private Claims extractAllClaims(String token) {
		return Jwts.parser()
				.verifyWith((SecretKey) getSigningKey())
				.build()
				.parseSignedClaims(token)
				.getPayload();
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
}
