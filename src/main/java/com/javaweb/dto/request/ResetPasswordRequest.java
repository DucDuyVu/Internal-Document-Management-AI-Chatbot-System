package com.javaweb.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

	private String resetToken;

	@NotBlank
	@Size(min = 8)
	private String newPassword;

	private String confirmPassword;
}
