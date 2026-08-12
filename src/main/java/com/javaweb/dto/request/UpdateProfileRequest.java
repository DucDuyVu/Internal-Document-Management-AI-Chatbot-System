package com.javaweb.dto.request;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class UpdateProfileRequest {

		private String fullName;

		private String userName;
		
		private String phone;
		
		private String avatarUrl;

		private String signatureUrl;

		private String jobTitle;

}
