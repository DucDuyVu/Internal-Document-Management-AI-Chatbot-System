package com.javaweb.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter

public class ChangePasswordRequest {

	private String oldPassword;
	
	private String newPassword;
	
	private String comfirmPassword;
}
