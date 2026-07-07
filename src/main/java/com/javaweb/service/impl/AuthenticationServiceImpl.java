package com.javaweb.service.impl;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.javaweb.config.SecurityConfig;
import com.javaweb.dto.request.RegisterRequest;
import com.javaweb.dto.response.RegisterResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.AuthenticationService;

@Service
public class AuthenticationServiceImpl implements AuthenticationService {

	@Autowired
	private SecurityConfig securityConfig;
	
	@Autowired
	private UsersRepository usersRepository;
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
		user.setPassword(securityConfig.passwordEncoder().encode(registerRequest.getPassword()));
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
