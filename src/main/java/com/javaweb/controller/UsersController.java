package com.javaweb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.service.UsersService;

@RestController
@RequestMapping("/api/users")
public class UsersController {
	@Autowired
	private UsersService usersService;
	
	@GetMapping("/profile")
	public ProfileResponse profile(Authentication authentication) {
		UsersEntity user = (UsersEntity)authentication.getPrincipal();
		return usersService.getProfile(user);
	}
}
