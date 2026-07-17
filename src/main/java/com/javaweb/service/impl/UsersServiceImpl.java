package com.javaweb.service.impl;

import com.javaweb.dto.request.ChangePasswordRequest;
import com.javaweb.dto.request.UpdateProfileRequest;
import com.javaweb.dto.response.ChangePasswordResponse;
import com.javaweb.dto.response.LockUserResponse;
import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.dto.response.UnlockResponse;
import com.javaweb.entity.UserSessionsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.exception.BadRequestException;
import com.javaweb.repository.UserSessionsRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.UsersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;


@Service
public class UsersServiceImpl implements UsersService{

	@Autowired
	UsersRepository usersRepository;
	
	@Autowired
	UserSessionsRepository userSessionsRepository;
	
	@Autowired
	PasswordEncoder passwordEncoder;
	
	// lấy thông tin người dùng 
	@Override
	public ProfileResponse getProfile(UsersEntity user) {

		ProfileResponse profileResponse = new ProfileResponse();
		
		profileResponse.setFullName(user.getFullName());
		profileResponse.setUserName(user.getUserName());
		profileResponse.setPhone(user.getPhone());
		profileResponse.setEmail(user.getEmail());
		profileResponse.setUserId(user.getId());
		profileResponse.setRole(user.getRole().name());
		return profileResponse;
	}

	// update thông tin người dùng
	@Override
	public ProfileResponse updateProfile(UsersEntity user, UpdateProfileRequest updateProfileRequest) {

		if (updateProfileRequest.getFullName() != null) {
			user.setFullName(updateProfileRequest.getFullName());
		}

		if (updateProfileRequest.getUserName() != null) {
			user.setUserName(updateProfileRequest.getUserName());
		}

		if (updateProfileRequest.getPhone() != null) {
			user.setPhone(updateProfileRequest.getPhone());
		}

		if (updateProfileRequest.getAvatarUrl() != null) {
			user.setAvatarURL(updateProfileRequest.getAvatarUrl());
		}
		user.setUpdatedAt(LocalDateTime.now());
		
		UsersEntity updateUser = usersRepository.save(user); // save thông tin update
		
		ProfileResponse profileResponse = new ProfileResponse();
		profileResponse.setFullName(updateUser.getFullName());
		profileResponse.setUserName(updateUser.getUserName());
		profileResponse.setPhone(updateUser.getPhone());
		profileResponse.setUserId(updateUser.getId());
		profileResponse.setEmail(updateUser.getEmail());
		profileResponse.setRole(updateUser.getRole().name());
		
		return profileResponse; // trả về client
	}

	
	// Đổi mật khẩu 
	@Override
	public ChangePasswordResponse changePassword(UsersEntity user, ChangePasswordRequest changePasswordRequest) {

		// Check mật khẩu cũ
		if (! passwordEncoder.matches(changePasswordRequest.getOldPassword(), user.getPassword())) {
			throw new BadRequestException("Mật khẩu không đúng. Vui lòng nhập lại !");
		}
		
		// Check comfirm mật khẩu 
		if (! changePasswordRequest.getNewPassword().equals(changePasswordRequest.getComfirmPassword())) {
			throw new BadRequestException("Mật khẩu xác thực không khớp !");
		}
		
		String newPassword = passwordEncoder.encode(changePasswordRequest.getNewPassword());
		
		user.setPassword(newPassword); // cập nhật newPassword
		
		user.setUpdatedAt(LocalDateTime.now()); // cập nhật tg update pw
		
		usersRepository.save(user); // Lưu thay đổi pw ở DB
		
		ChangePasswordResponse changePasswordResponse = new ChangePasswordResponse();
		changePasswordResponse.setMessage("Đổi mật khẩu thành công !");
		
		return changePasswordResponse;
	}

	
	// Khóa tài khoản theo id
	@Override
	public LockUserResponse lockUserResponse(Long id) {
		Optional<UsersEntity> optionalUser = usersRepository.findById(id);
		
		if (optionalUser.isEmpty()) {
			throw new BadRequestException("Người dùng không tồn tại !");
		}
		
		UsersEntity user = optionalUser.get();
		
		if (! user.isActive()) {
			throw new BadRequestException("Tài khoản đã bị khóa !");
		}
		
		user.setActive(false); // khóa tài khoản
		usersRepository.save(user); // lưu DB
		
		/*
		 * Thu hồi Refresh Token TH tài khoản vẫn còn hiệu lực 
		 * của refresh token thì vẫn có thể xin access token truy cập tiếp
		 * */
		
		List<UserSessionsEntity> sessions = userSessionsRepository.findByUserId(user);
		for (UserSessionsEntity item : sessions) {
			item.setIsRevoked(true); // bị thu hồi => khi unlock không cần revoked = true 
		}
		
		userSessionsRepository.saveAll(sessions); // lưu nhiều đối tượng 
		
		LockUserResponse lockUserResponse = new LockUserResponse();
		lockUserResponse.setMessage("Tài khoản đã bị khóa ");
		return lockUserResponse;
	}

	
	// Mở tài khoản theo id
	@Override
	public UnlockResponse unlockResponse(Long id) {
		
		Optional<UsersEntity> optionalUser = usersRepository.findById(id);
		
		if (optionalUser.isEmpty()) {
			throw new BadRequestException("Người dùng không tồn tại !");
		}
		
		UsersEntity user = optionalUser.get();
		
		
		// Kiểm tra tài khoản được mở chưa
		if (user.isActive()) {
			throw new BadRequestException("Tài khoản đã được mở !");
		}
		
		// Mở tài khoản 
		user.setActive(true);
		
		usersRepository.save(user);
		
		UnlockResponse response = new UnlockResponse();
		response.setMessage("Tài khoản đã được mở !");
		return response;
	}	

    @Override
    public org.springframework.data.domain.Page<com.javaweb.dto.response.AdminUserResponse> getAllUsers(int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page - 1, size);
        return usersRepository.findAll(pageable).map(user -> {
            com.javaweb.dto.response.AdminUserResponse response = new com.javaweb.dto.response.AdminUserResponse();
            response.setId(user.getId());
            response.setFullName(user.getFullName());
            response.setUsername(user.getUserName());
            response.setEmail(user.getEmail());
            response.setRole(user.getRole().name());
            response.setActive(user.isActive());
            if (user.getDepartmentId() != null) {
                response.setDepartmentName(user.getDepartmentId().getName());
            }
            return response;
        });
    }
}
