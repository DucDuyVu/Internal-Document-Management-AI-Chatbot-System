package com.javaweb.config;

import com.javaweb.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Autowired
	private JwtAuthenticationFilter jwtAuthenticationFilter;

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
				// Tắt CSRF vì dùng JWT (stateless)
				.csrf(csrf -> csrf.disable())

				// Không dùng session (stateless)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

				// ===== PHÂN QUYỀN URL =====
				.authorizeHttpRequests(auth -> auth

						// 1. PUBLIC - Ai cũng truy cập được (không cần đăng nhập)
						.requestMatchers(
								"/",
								"/login",
								"/register",
								"/forgot-password",
								"/css/**",
								"/js/**",
								"/images/**",
								"/favicon.ico")
						.permitAll()

						// 2. API Auth - Không cần đăng nhập
						.requestMatchers(
								"/api/auth/login",
								"/api/auth/register",
              "/api/auth/refresh-token",
								"/api/auth/forgot-password",
               "/api/auth/verify-otp",
								"/api/auth/reset-password")
						.permitAll()

						// 3. Dashboard HTML
						.requestMatchers(
								"/admin/dashboard",
								"/user/dashboard")
						.permitAll()

						// 4. API ADMIN
						.requestMatchers("/api/admin/**")
						.hasRole("ADMIN")

						// 5. API USER
						.requestMatchers(
								"/api/user/**",
								"/api/chat/**",
								"/api/documents/**",
								"/api/search/**")
						.hasAnyRole("USER", "MANAGER", "ADMIN")

						// 5. Còn lại yêu cầu đăng nhập
						.anyRequest().authenticated())

				// Thêm JWT Filter vào chuỗi Security
				.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}
}