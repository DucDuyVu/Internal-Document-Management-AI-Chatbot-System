package com.javaweb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.request.CreateUserRequest;
import com.javaweb.dto.request.UpdateUserRequest;
import com.javaweb.dto.response.AdminUserResponse;
import com.javaweb.dto.response.LockUserResponse;
import com.javaweb.dto.response.UnlockResponse;
import com.javaweb.service.UsersService;

// chỉ Admin gọi được API này
@PreAuthorize("hasRole('ADMIN')")
@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

	@Autowired
	private UsersService usersService;

	@PutMapping("/{id}/lock")
	public LockUserResponse lockUser(@PathVariable Long id) {
		return usersService.lockUserResponse(id);
	}

	@PutMapping("/{id}/unlock")
	public UnlockResponse unlockResponse(@PathVariable Long id) {
		return usersService.unlockResponse(id);
	}

	@GetMapping
	public Page<AdminUserResponse> getAllUsers(
			@RequestParam(defaultValue = "1") int page,
			@RequestParam(defaultValue = "10") int size,
			@RequestParam(required = false) String search,
			@RequestParam(required = false) String role,
			@RequestParam(required = false) Long departmentId,
			@RequestParam(required = false) String status) {
		return usersService.getAllUsers(page, size, search, role, departmentId, status);
	}

	// Tạo người dùng do Admin tạo
	@PostMapping
	public AdminUserResponse createUser(@RequestBody CreateUserRequest request) {
		return usersService.createUser(request);
	}

	@PutMapping("/{id}")
	public AdminUserResponse updateUser(@PathVariable Long userId, @RequestBody UpdateUserRequest request) {
		return usersService.updateUser(userId, request);
	}

	// Xóa mềm user (Cập nhật thời gian xóa + active = false) vẫn lưu ở DB
	@DeleteMapping("/{userId}")
	public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
		usersService.softDeleteUser(userId);
		return ResponseEntity.ok("Xóa người dùng thành công");
	}
}
