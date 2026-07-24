package com.javaweb.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter 
public class LoginResponse {

	private String message;
	
	private String accessToken;
	
	private String tokenType;
	
	private Long userId;
	
	private String fullName;
	
	private String email;
	
	private String role;
	
	private String refreshToken;
	
	private Long departmentId;
	
	private String departmentName;
	
}
