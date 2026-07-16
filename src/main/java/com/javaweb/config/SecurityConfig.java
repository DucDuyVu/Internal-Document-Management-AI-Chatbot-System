package com.javaweb.config;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.javaweb.security.JwtAuthenticationEntryPoint;
import com.javaweb.security.JwtAuthenticationFilter;

@Configuration

public class SecurityConfig {
	
	@Autowired
	private JwtAuthenticationFilter jwtAuthenticationFilter;
	
	@Autowired
	private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
	@Bean 
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
	
	 @Bean
	    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

	        http
	            .csrf(csrf -> csrf.disable())
	            .sessionManagement(session -> 
	            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
	            
	            .exceptionHandling(exception -> 
	            exception.authenticationEntryPoint(jwtAuthenticationEntryPoint))
					.authorizeHttpRequests(auth -> auth
							// ----- Trang giao diện (view) - public -----
							.requestMatchers(
									"/login",
									"/register",
									"/forgot-password",
									"/reset-password",
									"/dashboard",
									"/profile"
							).permitAll()

							// ----- Tài nguyên tĩnh (CSS/JS/ảnh) - public -----
							.requestMatchers(
									"/css/**",
									"/js/**",
									"/images/**",
									"/favicon.ico"
							).permitAll()

							// ----- API auth - public -----
							.requestMatchers(
									"/api/auth/login",
									"/api/auth/register",
									"/api/auth/refresh-token",
									"/api/auth/forgot-password",
									"/api/auth/verify-otp",
									"/api/auth/reset-password"
							).permitAll()

							// ----- Phân quyền theo role -----
							.requestMatchers("/api/admin/**")
							.hasAnyRole("ADMIN")

							.requestMatchers("/api/user/**")
							.hasAnyRole("USER", "ADMIN")

							// ----- Còn lại: bắt buộc đăng nhập -----
							.anyRequest().authenticated()
					)
	            
	            .addFilterBefore(
	            		jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
	   
	        return http.build();
	    }
}