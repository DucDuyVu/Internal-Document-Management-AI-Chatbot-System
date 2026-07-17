package com.javaweb.service;


import com.javaweb.dto.request.ForgotPasswordRequest;
import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.request.LogoutRequest;
import com.javaweb.dto.request.RefreshTokenRequest;
import com.javaweb.dto.request.RegisterRequest;
import com.javaweb.dto.request.ResetPasswordRequest;
import com.javaweb.dto.response.ForgotPasswordResponse;
import com.javaweb.dto.response.LoginResponse;
import com.javaweb.dto.response.LogoutResponse;
import com.javaweb.dto.response.RefreshTokenResponse;
import com.javaweb.dto.response.RegisterResponse;
import com.javaweb.dto.response.ResetPasswordResponse;

public interface AuthenticationService {
	LoginResponse login (LoginRequest loginRequest);
  
	RegisterResponse register (RegisterRequest registerRequest);
  
	RefreshTokenResponse refreshToken(RefreshTokenRequest refreshTokenRequest);
	
	LogoutResponse logout(LogoutRequest logoutRequest);
	
	ForgotPasswordResponse forgotPassowrd(ForgotPasswordRequest forgotPasswordRequest);
	
	ResetPasswordResponse resetPassword(ResetPasswordRequest passwordRequest);
}
