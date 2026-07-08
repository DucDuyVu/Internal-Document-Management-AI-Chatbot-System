package com.javaweb.service;


import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.request.RefreshTokenRequest;
import com.javaweb.dto.response.LoginResponse;
import com.javaweb.dto.response.RefreshTokenResponse;

public interface AuthenticationService {
	LoginResponse login (LoginRequest loginRequest);
  
	RegisterResponse register (RegisterRequest registerRequest);
  
	RefreshTokenResponse refreshToken(RefreshTokenRequest refreshTokenRequest);
}
