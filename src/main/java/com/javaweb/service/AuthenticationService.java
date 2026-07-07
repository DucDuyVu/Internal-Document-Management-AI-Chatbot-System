package com.javaweb.service;

import com.javaweb.dto.request.LoginRequest;
import com.javaweb.dto.response.LoginResponse;

public interface AuthenticationService {
	LoginResponse login (LoginRequest loginRequest);
}