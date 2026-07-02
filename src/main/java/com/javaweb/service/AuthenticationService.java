package com.javaweb.service;

import com.javaweb.dto.request.RegisterRequest;
import com.javaweb.dto.response.RegisterResponse;

public interface AuthenticationService {
	RegisterResponse register (RegisterRequest registerRequest);
}
