package com.javaweb.controller;

import java.awt.color.ProfileDataException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.request.ChangePasswordRequest;
import com.javaweb.dto.request.UpdateProfileRequest;
import com.javaweb.dto.response.ChangePasswordResponse;
import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.service.UsersService;

@RestController
@RequestMapping("/api/users")
public class UsersController {
	@Autowired
	private UsersService usersService;
	
	
	@GetMapping("/profile")
	public ProfileResponse profile(Authentication authentication) {
		UsersEntity user = (UsersEntity)authentication.getPrincipal();
		return usersService.getProfile(user);
	}
	
	@PutMapping("/profile")
	public ProfileResponse updateProfile(Authentication authentication,
			@RequestBody UpdateProfileRequest updateProfileRequest) {
		
		// Lấy thông tin người dùng đang đăng nhập
		UsersEntity user = (UsersEntity) authentication.getPrincipal();
		return usersService.updateProfile(user, updateProfileRequest);
	}
	
	
	@PutMapping("/change-password")
	public ChangePasswordResponse changePassword(Authentication authentication,
			@RequestBody ChangePasswordRequest changePasswordRequest) {
		
		// Lấy thông tin người dùng đang đănh nhập
		UsersEntity user = (UsersEntity) authentication.getPrincipal();
		return usersService.changePassword(user, changePasswordRequest);
	}
	
	@org.springframework.web.bind.annotation.PostMapping("/upload-avatar")
	public org.springframework.http.ResponseEntity<java.util.Map<String, String>> uploadAvatar(@org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
	    try {
	        if (file.isEmpty()) {
	            throw new RuntimeException("File rỗng");
	        }
	        
	        java.nio.file.Path uploadPath = java.nio.file.Paths.get("uploads/avatars");
	        if (!java.nio.file.Files.exists(uploadPath)) {
	            java.nio.file.Files.createDirectories(uploadPath);
	        }
	        
	        // Get file extension
	        String originalFilename = file.getOriginalFilename();
	        String extension = "";
	        if (originalFilename != null && originalFilename.contains(".")) {
	            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
	        }
	        
	        String uniqueName = java.util.UUID.randomUUID().toString() + extension;
	        java.nio.file.Path targetPath = uploadPath.resolve(uniqueName);
	        java.nio.file.Files.copy(file.getInputStream(), targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
	        
	        java.util.Map<String, String> response = new java.util.HashMap<>();
	        // Trả về đường dẫn để frontend có thể truy cập qua URL (đã config WebMvcConfig)
	        response.put("avatarUrl", "/uploads/avatars/" + uniqueName);
	        
	        return org.springframework.http.ResponseEntity.ok(response);
	    } catch (java.io.IOException e) {
	        throw new RuntimeException("Lỗi khi lưu file: " + e.getMessage());
	    }
	}
}
