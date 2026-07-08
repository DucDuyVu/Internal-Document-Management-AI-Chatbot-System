package com.javaweb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.request.RefreshTokenRequest;
import com.javaweb.dto.response.LoginResponse;
import com.javaweb.dto.response.RefreshTokenResponse;
import com.javaweb.dto.request.RegisterRequest;
import com.javaweb.dto.response.RegisterResponse;
import com.javaweb.service.AuthenticationService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	
	@Autowired
	private AuthenticationService authenticationService;
	
	@PostMapping("/login")
	public LoginResponse login(@RequestBody LoginRequest loginRequest) {
		return authenticationService.login(loginRequest);
	}
	
	@PostMapping("/refresh-token")
	public RefreshTokenResponse refreshToken(@RequestBody RefreshTokenRequest refreshTokenRequest) {
		return authenticationService.refreshToken(refreshTokenRequest);	

	}
	@PostMapping("/register")
	public RegisterResponse register(@RequestBody RegisterRequest registerRequest) {
		
		return authenticationService.register(registerRequest);
	}
}
