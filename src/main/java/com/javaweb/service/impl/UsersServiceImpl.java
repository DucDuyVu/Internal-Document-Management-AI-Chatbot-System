package com.javaweb.service.impl;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.javaweb.dto.request.UpdateProfileRequest;
import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.UsersService;


@Service
public class UsersServiceImpl implements UsersService{

	@Autowired
	UsersRepository usersRepository;
	
	@Override
	public ProfileResponse getProfile(UsersEntity user) {
		ProfileResponse profileResponse = new ProfileResponse();
		
		profileResponse.setFullName(user.getFullName());
		profileResponse.setEmail(user.getEmail());
		profileResponse.setUserId(user.getId());
		profileResponse.setRole(user.getRole().name());
		return profileResponse;
	}

	@Override
	public ProfileResponse updateProfile(UsersEntity user, UpdateProfileRequest updateProfileRequest) {
		
		user.setFullName(updateProfileRequest.getFullName());
		user.setPhone(updateProfileRequest.getPhone());
		user.setAvatarURL(updateProfileRequest.getAvatarUrl());
		user.setUpdatedAt(LocalDateTime.now());
		
		UsersEntity updateUser = usersRepository.save(user); // save thông tin update
		
		ProfileResponse profileResponse = new ProfileResponse();
		profileResponse.setFullName(updateUser.getFullName());
		profileResponse.setPhone(updateUser.getPhone());
		profileResponse.setUserId(updateUser.getId());
		profileResponse.setEmail(updateUser.getEmail());
		profileResponse.setRole(updateUser.getRole().name());
		return profileResponse; // trả về client
	}

		
}
