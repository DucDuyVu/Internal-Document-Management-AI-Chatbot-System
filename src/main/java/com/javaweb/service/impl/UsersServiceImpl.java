package com.javaweb.service.impl;

import com.javaweb.dto.request.CreateUserRequest;
import com.javaweb.dto.request.UpdateUserRequest;
import com.javaweb.dto.response.AdminUserResponse;
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.enums.UserRole;
import com.javaweb.repository.DepartmentsRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

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
public class UsersServiceImpl implements UsersService {

	@Autowired
	UsersRepository usersRepository;

	@Autowired
	UserSessionsRepository userSessionsRepository;

	@Autowired
	DepartmentsRepository departmentsRepository;

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
		profileResponse.setAvatarUrl(user.getAvatarURL());

		if (user.getDepartment() != null) {
			profileResponse.setDepartmentName(user.getDepartment().getName());
		}

		return profileResponse;
	}

	// update thông tin người dùng
	@Override
	public ProfileResponse updateProfile(UsersEntity user, UpdateProfileRequest updateProfileRequest) {

		if (updateProfileRequest.getFullName() != null && !updateProfileRequest.getFullName().trim().isEmpty()) {
			user.setFullName(updateProfileRequest.getFullName());
		}

		if (updateProfileRequest.getUserName() != null && !updateProfileRequest.getUserName().trim().isEmpty()) {
			user.setUserName(updateProfileRequest.getUserName());
		}

		if (updateProfileRequest.getPhone() != null && !updateProfileRequest.getPhone().trim().isEmpty()) {
			user.setPhone(updateProfileRequest.getPhone());
		}

		if (updateProfileRequest.getAvatarUrl() != null && !updateProfileRequest.getAvatarUrl().trim().isEmpty()) {
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
		profileResponse.setAvatarUrl(updateUser.getAvatarURL());

		return profileResponse; // trả về client
	}

	// Đổi mật khẩu
	@Override
	public ChangePasswordResponse changePassword(UsersEntity user, ChangePasswordRequest changePasswordRequest) {

		// Check mật khẩu cũ
		if (!passwordEncoder.matches(changePasswordRequest.getOldPassword(), user.getPassword())) {
			throw new BadRequestException("Mật khẩu không đúng. Vui lòng nhập lại !");
		}

		// Check comfirm mật khẩu
		if (!changePasswordRequest.getNewPassword().equals(changePasswordRequest.getComfirmPassword())) {
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

		if (!user.isActive()) {
			throw new BadRequestException("Tài khoản đã bị khóa !");
		}

		user.setActive(false); // khóa tài khoản
		usersRepository.save(user); // lưu DB

		/*
		 * Thu hồi Refresh Token TH tài khoản vẫn còn hiệu lực
		 * của refresh token thì vẫn có thể xin access token truy cập tiếp
		 */

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

	//Xử lý lấy tất cả user
	@Override
	public Page<AdminUserResponse> getAllUsers(int page,
			int size, String search, String role, Long departmentId, String status) {
		// Phân trang (FE đánh trang từ 1, Spring Data JPA đánh trang từ 0)
		Pageable pageable = PageRequest.of(page - 1, size);

		// Xử lý vai trò
		UserRole enumRole = null;
		if (role != null && !role.isEmpty()) {
			try {
				enumRole = UserRole.valueOf(role.toUpperCase());
			} catch (Exception e) {
			}
		}

		// Xử lý đưa active = true, locked = false
		Boolean isActive = null;
		if ("active".equalsIgnoreCase(status))
			isActive = true;
		else if ("locked".equalsIgnoreCase(status))
			isActive = false;

		String querySearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

		return usersRepository.searchUsers(querySearch, enumRole, departmentId, isActive, pageable).map(user -> {
			AdminUserResponse response = new AdminUserResponse();
			response.setId(user.getId());
			response.setFullName(user.getFullName());
			response.setUsername(user.getUserName());
			response.setEmail(user.getEmail());
			if (user.getRole() != null) {
				response.setRole(user.getRole().name());
			}
			response.setActive(user.isActive());
			if (user.getDepartment() != null) {
				response.setDepartmentName(user.getDepartment().getName());
			}
			return response;
		});
	}


	// Tạo user (admin tạo)
	@Transactional
	@Override
	public AdminUserResponse createUser(CreateUserRequest request) {

		// Check email tồn tại chưa
		if (usersRepository.existsByEmail(request.getEmail())) {
			throw new BadRequestException("Email đã tồn tại !");
		}

		if (usersRepository.existsByUserName(request.getUserName())) {
			throw new BadRequestException("Username đã tồn tại !");
		}

		UsersEntity user = new UsersEntity();
		user.setFullName(request.getFullName());
		user.setUserName(request.getUserName());
		user.setEmail(request.getEmail());
		user.setPhone(request.getPhone());
		user.setPassword(passwordEncoder.encode(request.getPassword())); // mã hóa password

		if (request.getRole() != null) {
			user.setRole(UserRole.valueOf(request.getRole().toUpperCase()));
		}

		if (request.getDepartmentId() != null) {
			DepartmentsEntity depart = departmentsRepository.findById(request.getDepartmentId())
					.orElseThrow(() -> new RuntimeException("Phòng ban không tồn tại !"));
			user.setDepartment(depart);
		}

		usersRepository.save(user); // Save dữ liệu ở DB


		// Trả dữ liệu ra client
		AdminUserResponse response = new AdminUserResponse();

		response.setId(user.getId());
		response.setFullName(user.getFullName());
		response.setUsername(user.getUserName());
		response.setEmail(user.getEmail());
		response.setRole(user.getRole().name());
		response.setActive(user.isActive());
		if (user.getDepartment() != null) {
			response.setDepartmentName(user.getDepartment().getName());
		}
		return response;
	}


	// update user (admin update)
	@Transactional
	@Override
	public AdminUserResponse updateUser(Long userId, UpdateUserRequest request) {
		UsersEntity user = usersRepository.findById(userId)
				.orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

		// Cập nhật thông tin
		if (request.getFullName() != null) {
			user.setFullName(request.getFullName());
		}

		if (request.getPhone() != null) {
			user.setPhone(request.getPhone());
		}

		if (request.getRole() != null) {
			user.setRole(UserRole.valueOf(request.getRole()));
		}

		if (request.getDepartmentId() != null) {
			DepartmentsEntity depart = departmentsRepository.findById(request.getDepartmentId())
					.orElseThrow(() -> new RuntimeException("Phòng ban không tồn tại !"));
			user.setDepartment(depart);
		}

		usersRepository.save(user); // Lưu dưới DB

		// Trả về client
		AdminUserResponse response = new AdminUserResponse();
		response.setFullName(user.getFullName());
		response.setUsername(user.getUserName());
		response.setEmail(user.getEmail());
		response.setRole(user.getRole().name());
		response.setActive(user.isActive());
		if (user.getDepartment() != null) {
			response.setDepartmentName(user.getDepartment().getName());
		}
		return response;
	}


	@Override
	public void softDeleteUser(Long userId) {
		UsersEntity user = usersRepository.findById(userId)
		.orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng !"));
		// Cập nhật tg xóa
		user.setDeletedAt(LocalDateTime.now());
		// Khóa tài khoản
		user.setActive(false);

		usersRepository.save(user); // lưu xuống DB
	}
}