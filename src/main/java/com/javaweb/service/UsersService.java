package com.javaweb.service;

import com.javaweb.dto.request.CreateUserRequest;
import com.javaweb.dto.request.UpdateUserRequest;
import org.springframework.data.domain.Page;
import org.springframework.security.core.userdetails.UserDetailsService;

import com.javaweb.dto.request.ChangePasswordRequest;
import com.javaweb.dto.request.UpdateProfileRequest;
import com.javaweb.dto.response.AdminUserResponse;
import com.javaweb.dto.response.ChangePasswordResponse;
import com.javaweb.dto.response.LockUserResponse;
import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.dto.response.UnlockResponse;
import com.javaweb.dto.response.user.UserProfileDetailsDto;
import com.javaweb.entity.UsersEntity;

public interface UsersService {

	ProfileResponse getProfile(UsersEntity user);

	ProfileResponse updateProfile(UsersEntity user, UpdateProfileRequest updateProfileRequest);

	ChangePasswordResponse changePassword(UsersEntity user, ChangePasswordRequest changePasswordRequest);

	LockUserResponse lockUserResponse(Long id);

	UnlockResponse unlockResponse(Long id);

	Page<AdminUserResponse> getAllUsers(int page, int size, String search, String role, Long departmentId,
			String status);

	AdminUserResponse createUser(CreateUserRequest request);

	AdminUserResponse updateUser(Long userId, UpdateUserRequest request);

	AdminUserResponse getUserById(Long userId);

	void softDeleteUser(Long userId);

	UserProfileDetailsDto getUserProfileDetails(Long targetUserId, UsersEntity currentUser);
}
