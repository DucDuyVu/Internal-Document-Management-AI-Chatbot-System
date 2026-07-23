package com.javaweb.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter

public class RegisterRequest {

	@NotBlank(message = "Họ và tên không được để trống")
	private String fullName;

	@NotBlank(message = "Email không được để trống")
	private String email;
	
	@NotBlank(message = "Password không được để trống")
	private String password;

	@NotBlank(message = "ComfirmPasswordPassword không được để trống")
	private String confirmPassword;
}
