package com.javaweb.controller;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.response.LoginResponse;
import com.javaweb.entity.UsersEntity;

@RestController
@RequestMapping("/api/users")
public class UsersController {
	
	@GetMapping("/profile")
	public LoginResponse profile(Authentication authentication) {
		UsersEntity user = (UsersEntity)authentication.getPrincipal();
		LoginResponse loginRepo = new LoginResponse();
		loginRepo.setFullName(user.getFullName());
		loginRepo.setEmail(user.getEmail());
		loginRepo.setUserId(user.getId());
		loginRepo.setRole(user.getRole().name());
		return loginRepo;
	}
}
