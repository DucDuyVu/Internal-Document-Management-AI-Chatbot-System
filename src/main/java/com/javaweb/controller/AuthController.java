package com.javaweb.controller;

import com.javaweb.dto.request.*;
import com.javaweb.dto.response.*;
import com.javaweb.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import com.javaweb.service.AuthenticationService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	
	@Autowired
	private AuthenticationService authenticationService;

	@Autowired
	PasswordResetService passwordResetService;
	@PostMapping("/login")
	public LoginResponse login(@RequestBody LoginRequest loginRequest) {
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
		return passwordResetService.forgotPassowrd(forgotPasswordRequest);
	}
	
	@PostMapping("/reset-password") 
	public ResetPasswordResponse resetPassword(@RequestBody ResetPasswordRequest passwordRequest) {
		return passwordResetService.resetPassword(passwordRequest);
	}

	@PostMapping("/verify-otp")
	public VerifyOtpResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest verifyOtpRequest) {
		return  passwordResetService.verifyOtp(verifyOtpRequest);
	}
}
