package com.javaweb.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProfileResponse {

		private String fullName;
		
		private Long userId;
		
		private String email;
		
		private String role;

}
