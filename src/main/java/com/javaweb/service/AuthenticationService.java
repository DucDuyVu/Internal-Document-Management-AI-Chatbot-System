package com.javaweb.service;


import com.javaweb.dto.request.*;
import com.javaweb.dto.response.*;

public interface AuthenticationService {
	LoginResponse login (LoginRequest loginRequest);
  
	RegisterResponse register (RegisterRequest registerRequest);
  
	RefreshTokenResponse refreshToken(RefreshTokenRequest refreshTokenRequest);
	
	LogoutResponse logout(LogoutRequest logoutRequest);
}
