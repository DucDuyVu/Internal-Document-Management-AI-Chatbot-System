package com.javaweb.service;

import com.javaweb.dto.request.ChangePasswordRequest;
import com.javaweb.dto.request.UpdateProfileRequest;
import com.javaweb.dto.response.ChangePasswordResponse;
import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.entity.UsersEntity;

public interface UsersService {

	ProfileResponse getProfile(UsersEntity user);
	
	ProfileResponse updateProfile(UsersEntity user, UpdateProfileRequest updateProfileRequest);
	
	ChangePasswordResponse changePassword(UsersEntity user, ChangePasswordRequest changePasswordRequest);
}
