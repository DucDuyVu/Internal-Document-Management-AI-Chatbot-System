package com.javaweb.service;


import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.request.RegisterRequest;
import com.javaweb.dto.response.LoginResponse;
import com.javaweb.dto.response.RegisterResponse;

public interface AuthenticationService {
	LoginResponse login (LoginRequest loginRequest);
	RegisterResponse register (RegisterRequest registerRequest);
}

