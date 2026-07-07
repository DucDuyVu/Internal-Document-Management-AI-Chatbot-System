package com.javaweb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.request.RegisterRequest;
import com.javaweb.dto.response.RegisterResponse;
import com.javaweb.service.AuthenticationService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
	
	@Autowired
	private AuthenticationService authenticationService;
	@PostMapping("/register")
	public RegisterResponse register(@RequestBody RegisterRequest registerRequest) {
		
		return authenticationService.register(registerRequest);
	}
}
