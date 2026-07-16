package com.javaweb.service;

import com.javaweb.dto.request.ChangePasswordRequest;
import com.javaweb.dto.request.UpdateProfileRequest;
import com.javaweb.dto.response.ChangePasswordResponse;
import com.javaweb.dto.response.ForgotPasswordResponse;
import com.javaweb.dto.response.LockUserResponse;
import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.dto.response.UnlockResponse;
import com.javaweb.entity.UsersEntity;

public interface UsersService {

	ProfileResponse getProfile(UsersEntity user);

	ProfileResponse updateProfile(UsersEntity user, UpdateProfileRequest updateProfileRequest);

	ChangePasswordResponse changePassword(UsersEntity user, ChangePasswordRequest changePasswordRequest);

	LockUserResponse lockUserResponse(Long id);

	UnlockResponse unlockResponse(Long id);

	org.springframework.data.domain.Page<com.javaweb.dto.response.AdminUserResponse> getAllUsers(int page, int size);
}
