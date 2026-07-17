package com.javaweb.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RefreshTokenResponse {

	private String tokenType;
	
	private String accessToken;

}
