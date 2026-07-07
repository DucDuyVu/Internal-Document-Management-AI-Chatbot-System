package com.javaweb.controller;

import java.awt.color.ProfileDataException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.request.ChangePasswordRequest;
import com.javaweb.dto.request.UpdateProfileRequest;
import com.javaweb.dto.response.ChangePasswordResponse;
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
	
	@PutMapping("/profile")
	public ProfileResponse updateProfile(Authentication authentication,
			@RequestBody UpdateProfileRequest updateProfileRequest) {
		
		// Lấy thông tin người dùng đang đăng nhập
		UsersEntity user = (UsersEntity) authentication.getPrincipal();
		return usersService.updateProfile(user, updateProfileRequest);
	}
	
	
	@PutMapping("/change-passwrord")
	public ChangePasswordResponse changePassword(Authentication authentication,
			@RequestBody ChangePasswordRequest changePasswordRequest) {
		
		// Lấy thông tin người dùng đang đănh nhập
		UsersEntity user = (UsersEntity) authentication.getPrincipal();
		return usersService.changePassword(user, changePasswordRequest);
	}
}
