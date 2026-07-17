package com.javaweb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.javaweb.dto.request.ForgotPasswordRequest;
import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.request.LogoutRequest;
import com.javaweb.dto.request.RefreshTokenRequest;
import com.javaweb.dto.response.ForgotPasswordResponse;
import com.javaweb.dto.response.LoginResponse;
import com.javaweb.dto.response.LogoutResponse;
import com.javaweb.dto.response.RefreshTokenResponse;
import com.javaweb.dto.request.RegisterRequest;
import com.javaweb.dto.request.ResetPasswordRequest;
import com.javaweb.dto.response.RegisterResponse;
import com.javaweb.dto.response.ResetPasswordResponse;
import com.javaweb.service.AuthenticationService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	
	@Autowired
	private AuthenticationService authenticationService;

	@PostMapping("/login")
	public LoginResponse login(@RequestBody LoginRequest loginRequest) {
		System.out.println("LOGIN CONTROLLER - REACHED");
		return authenticationService.login(loginRequest);
	}
	
	@PostMapping("/logout") 
	public LogoutResponse logout(@RequestBody LogoutRequest logoutRequest) {
		return authenticationService.logout(logoutRequest);
	}
	
	@PostMapping("/refresh-token")
	public RefreshTokenResponse refreshToken(@RequestBody RefreshTokenRequest refreshTokenRequest) {
		return authenticationService.refreshToken(refreshTokenRequest);	

	}
	@PostMapping("/register")
	public RegisterResponse register(@RequestBody RegisterRequest registerRequest) {
		
		return authenticationService.register(registerRequest);
	}
	
	@PostMapping("/forgot-password")
	public ForgotPasswordResponse forgotPassowrd(@RequestBody ForgotPasswordRequest forgotPasswordRequest) {
		return authenticationService.forgotPassowrd(forgotPasswordRequest);
	}
	
	@PostMapping("/reset-password") 
	public ResetPasswordResponse passwordResponse(@RequestBody ResetPasswordRequest passwordRequest) {
		return authenticationService.resetPassword(passwordRequest);
	}
}
