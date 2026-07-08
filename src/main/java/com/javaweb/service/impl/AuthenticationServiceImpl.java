package com.javaweb.service.impl;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.request.RefreshTokenRequest;
import com.javaweb.dto.response.LoginResponse;
import com.javaweb.dto.response.RefreshTokenResponse;
import com.javaweb.entity.UserSessionsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.UserSessionsRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.AuthenticationService;
import com.javaweb.service.JwtService;

@Service
public class AuthenticationServiceImpl implements AuthenticationService{

	@Autowired
	private UsersRepository userRepo;
	
	@Autowired
	private UserSessionsRepository userSessionsRepo;
	
	@Autowired
	private PasswordEncoder passwordEncoder;
	
	@Autowired
	private JwtService jwtService;
	
	@Override
	public LoginResponse login(LoginRequest loginRequest) {
	// Check email có trong DB hay không 
		Optional<UsersEntity> optionalEmail = userRepo.findByEmail(loginRequest.getEmail());
		
		if (optionalEmail.isEmpty()) {
			throw new RuntimeException("Email không tồn tại !");
		}
		
		// Tìm user theo email trong DB
		UsersEntity user = optionalEmail.get();
	
		// So sánh password đăng nhập với password đã mã hóa trong DB
		if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
			throw new RuntimeException("Sai mật khẩu !");
		}
		
		
		// Đăng nhập thành công => Sinh JWT
		String accessToken = jwtService.generateAccessToken(user);
		
		// Đăng nhập thành công => Sinh refresh token
		String refreshToken = jwtService.generateRefreshToken(user);
		
		UserSessionsEntity userSessions = new UserSessionsEntity();
		userSessions.setRefreshToken(refreshToken);
		userSessions.setCreatedAt(LocalDateTime.now());
		userSessions.setExpiresAt(jwtService.extractExpirations(refreshToken));
		
		
		// Trả ra client login 
		LoginResponse loginResponse = new LoginResponse();
		
		loginResponse.setMessage("Đăng nhập thành công !");
		loginResponse.setAccessToken(accessToken);
		loginResponse.setRefreshToken(refreshToken);
		loginResponse.setTokenType("Bearer");
		loginResponse.setUserId(user.getId());
		loginResponse.setFullName(user.getFullName());
		loginResponse.setEmail(user.getEmail());
		loginResponse.setRole(user.getRole().name());
		
		return loginResponse;
	}

	@Override
	public RefreshTokenResponse refreshToken(RefreshTokenRequest refreshTokenRequest) {
		// Lấy refresh token 
		String refreshToken = refreshTokenRequest.getRefreshToken();
		
		if (!jwtService.validateToken(refreshToken)) {
			throw new RuntimeException("Refresh Token không hợp lệ !");
		}
		
		// Xác thực email
		String email = jwtService.extractEmail(refreshToken);
		
		// Tìm email trong DB
		Optional<UsersEntity> optionalUser = userRepo.findByEmail(email);
		
		if (optionalUser.isEmpty()) {
			throw new RuntimeException("Không có user !");
		}
		
		UsersEntity user = optionalUser.get();
		
		String accessToken = jwtService.generateAccessToken(user); // Sinh access token mới
		
		
		UserSessionsEntity session = new UserSessionsEntity();
		session.setRefreshToken(refreshToken);
		session.setCreatedAt(LocalDateTime.now());
		
		userSessionsRepo.save(session); // lưu refresh token vào DB + update tg tạo
		
		// Trả ra client
		RefreshTokenResponse refreshTokenResponse = new RefreshTokenResponse();
		refreshTokenResponse.setAccessToken(accessToken);
		refreshTokenResponse.setTokenType("Bearer");
		
		return refreshTokenResponse; // trả ra client
	}

}
