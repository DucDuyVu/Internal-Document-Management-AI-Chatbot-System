package com.javaweb.controller;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.javaweb.dto.request.ChangePasswordRequest;
import com.javaweb.dto.request.UpdateProfileRequest;
import com.javaweb.dto.response.ChangePasswordResponse;
import com.javaweb.dto.response.ProfileResponse;
import com.javaweb.dto.response.user.UserProfileDetailsDto;
import com.javaweb.entity.UsersEntity;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.UsersService;

@RestController
@RequestMapping({"/api/users", "/api/user"})
public class UsersController {
	@Autowired
	private UsersService usersService;

	@GetMapping("/profile")
	public ProfileResponse profile(Authentication authentication) {
		CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
		UsersEntity user = userDetails.getUser();
		return usersService.getProfile(user);
	}

	@PatchMapping("/profile")
	public ProfileResponse updateProfile(Authentication authentication,
			@RequestBody UpdateProfileRequest updateProfileRequest) {

		// Lấy thông tin người dùng đang đăng nhập
		CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
		UsersEntity user = userDetails.getUser();
		return usersService.updateProfile(user, updateProfileRequest);
	}

	@PutMapping("/change-password")
	public ChangePasswordResponse changePassword(Authentication authentication,
			@RequestBody ChangePasswordRequest changePasswordRequest) {

		// Lấy thông tin người dùng đang đănh nhập
		CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
		UsersEntity user = userDetails.getUser();
		return usersService.changePassword(user, changePasswordRequest);
	}

	@PostMapping("/upload-avatar")
	public ResponseEntity<Map<String, String>> uploadAvatar(@RequestParam("file") MultipartFile file) {
		try {
			if (file.isEmpty()) {
				throw new RuntimeException("File rỗng");
			}
			
			if (file.getSize() > 5 * 1024 * 1024) {
				throw new RuntimeException("Kích thước ảnh tối đa là 5MB");
			}

			Path uploadPath = Paths.get("uploads/avatars");
			if (!Files.exists(uploadPath)) {
				Files.createDirectories(uploadPath);
			}

			// Get file extension
			String originalFilename = file.getOriginalFilename();
			String extension = "";
			if (originalFilename != null && originalFilename.contains(".")) {
				extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
			}
			
			if (!extension.equals(".jpg") && !extension.equals(".jpeg") && !extension.equals(".png") && !extension.equals(".webp")) {
				throw new RuntimeException("Chỉ hỗ trợ định dạng ảnh JPG, PNG hoặc WEBP");
			}

			String uniqueName = UUID.randomUUID().toString() + extension;
			Path targetPath = uploadPath.resolve(uniqueName);
			Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

			Map<String, String> response = new HashMap<>();
			// Trả về đường dẫn để frontend có thể truy cập qua URL (đã config WebMvcConfig)
			response.put("avatarUrl", "/uploads/avatars/" + uniqueName);

			return ResponseEntity.ok(response);
		} catch (IOException e) {
			throw new RuntimeException("Lỗi khi lưu file: " + e.getMessage());
		}
	}

	@GetMapping("/{id}/profile-details")
	public ResponseEntity<UserProfileDetailsDto> getUserProfileDetails(
			@PathVariable("id") Long id,
			Authentication authentication) {
		CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
		UserProfileDetailsDto profile = usersService.getUserProfileDetails(id, userDetails.getUser());
		return ResponseEntity.ok(profile);
	}
}
