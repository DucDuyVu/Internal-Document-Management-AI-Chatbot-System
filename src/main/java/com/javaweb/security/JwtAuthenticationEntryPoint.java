package com.javaweb.security;

import java.io.IOException;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint{

	@Override
	public void commence(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException authException) throws IOException, ServletException {
		
		// Trả về status : 401
		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		
		// Thiết lập kiểu trả về JSON
		response.setContentType("application/json");
		
		// Thiết lập bộ mã hóa hỗ trợ tiếng việt
		response.setCharacterEncoding("UTF-8");
		
		// Trả về thông báo cho client (JSON)
		response.getWriter().write("""
				{
				"status" : 401,
				"error" : "Unauthorized",
				"message" : "Token không hợp lệ hoặc đã hết hạn"
				}
				""");
	}

}
