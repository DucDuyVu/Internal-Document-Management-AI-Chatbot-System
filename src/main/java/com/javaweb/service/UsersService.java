package com.javaweb.service;

import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.entity.UsersEntity;

public interface UsersService {

	ProfileResponse getProfile(UsersEntity user);
}
