package com.javaweb.service.impl;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.javaweb.config.SecurityConfig;
import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.response.LoginResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.AuthenticationService;
import com.javaweb.service.JwtService;

@Service
public class AuthenticationServiceImpl implements AuthenticationService{

	@Autowired
	private UsersRepository userRepo;
	
	@Autowired
	private PasswordEncoder passwordEncoder;
	
	@Autowired
	private JwtService jwtService;
	
	@Override
	public LoginResponse login(LoginRequest loginRequest) {
	
		Optional<UsersEntity> optionalEmail = userRepo.findByEmail(loginRequest.getEmail());
		
		if (optionalEmail.isEmpty()) {
			throw new RuntimeException("Email không tồn tại !");
		}
		
		UsersEntity user = optionalEmail.get();
		
		if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
			throw new RuntimeException("Sai mật khẩu !");
		}
		
		String accessToken = jwtService.generateAccessToken(user);
		
		LoginResponse loginResponse = new LoginResponse();
		loginResponse.setMessage("Đăng nhập thành công !");
		return loginResponse;
	}

}
