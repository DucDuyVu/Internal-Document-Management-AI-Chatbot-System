package com.javaweb.service.impl;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.request.RegisterRequest;
import com.javaweb.dto.response.LoginResponse;
import com.javaweb.dto.response.RegisterResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.exception.BadRequestException;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.AuthenticationService;
import com.javaweb.service.JwtService;

/*
 * Xử lí Register, Login, Logout, Refresh Token
 * */
@Service
public class AuthenticationServiceImpl implements AuthenticationService{

	@Autowired
	private UsersRepository userRepo;
	
	@Autowired
	private PasswordEncoder passwordEncoder;
	
	@Autowired
	private JwtService jwtService;
	
	@Autowired
	private UsersRepository usersRepository;
	
	@Override
	public LoginResponse login(LoginRequest loginRequest) {
	// Check email có trong DB hay không 
		Optional<UsersEntity> optionalEmail = userRepo.findByEmail(loginRequest.getEmail());
		
		if (optionalEmail.isEmpty()) {
			throw new BadRequestException("Email không tồn tại !");
		}
		
		UsersEntity user = optionalEmail.get();
	
		// So sánh password đăng nhập với password đã mã hóa trong DB
		if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
			throw new BadRequestException("Sai mật khẩu !");
		}
		
		
		// Đăng nhập thành công => Sinh JWT
		String accessToken = jwtService.generateAccessToken(user);
		
		LoginResponse loginResponse = new LoginResponse();
		
		loginResponse.setMessage("Đăng nhập thành công !");
		loginResponse.setAccessToken(accessToken);
		loginResponse.setTokenType("Bearer");
		loginResponse.setUserId(user.getId());
		loginResponse.setFullName(user.getFullName());
		loginResponse.setEmail(user.getEmail());
		loginResponse.setRole(user.getRole().name());
		
		return loginResponse;
	}



	@Override
	public RegisterResponse register(RegisterRequest registerRequest) {
		UsersEntity user = new UsersEntity();
	
	 
		if (usersRepository.existsByUserName(registerRequest.getUserName())) {
			throw new RuntimeException("Username đã tồn tại");
		}
		
		if (usersRepository.existsByEmail(registerRequest.getEmail())) {
			throw new RuntimeException("Email đã tồn tại");
		}
		
		user.setFullName(registerRequest.getFullName());
		user.setUserName(registerRequest.getUserName());
		user.setEmail(registerRequest.getEmail());
		user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
		user.setPhone(registerRequest.getPhone());
		user.setCreatedAt(LocalDateTime.now());
		
		usersRepository.save(user); // Save DB
		
		RegisterResponse registerResponse = new RegisterResponse();
		registerResponse.setFullName(registerRequest.getFullName());
		registerResponse.setEmail(registerRequest.getEmail());
		registerResponse.setUserName(registerRequest.getUserName());
		registerResponse.setMessage("Đăng ký thành công !");
		
	
		
		return registerResponse;
	}
}
