package com.javaweb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.javaweb.dto.response.AdminUserResponse;
import com.javaweb.dto.response.LockUserResponse;
import com.javaweb.dto.response.UnlockResponse;
import com.javaweb.service.UsersService;

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
}
