package com.javaweb.service.impl;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import com.javaweb.dto.response.LoginResponse;
import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.service.UsersService;


@Service
public class UsersServiceImpl implements UsersService{

	@Override
	public ProfileResponse getProfile(UsersEntity user) {
		ProfileResponse profileResponse = new ProfileResponse();
		
		profileResponse.setFullName(user.getFullName());
		profileResponse.setEmail(user.getEmail());
		profileResponse.setUserId(user.getId());
		profileResponse.setRole(user.getRole().name());
		return profileResponse;
	}	
}
