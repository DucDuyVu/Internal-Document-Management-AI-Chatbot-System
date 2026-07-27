package com.javaweb.dto.response;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProfileResponse {

		private String fullName;

		private String userName;
		
		private Long userId;
		
		private String email;
		
		private String role;
		
		private String phone;
		
		private String avatarUrl;

		private String departmentName;

		private LocalDateTime createdAt;
		
		private LocalDateTime lastLogin;
		
		private Long documentCount;
		
		private Integer chatSessionCount;
		
		private Integer activityCount;
}
