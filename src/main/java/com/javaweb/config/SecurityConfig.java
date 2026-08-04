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

import com.javaweb.security.JwtAuthenticationEntryPoint;

// Đã sửa conflict
@Configuration
@EnableWebSecurity
public class SecurityConfig {

        @Autowired
        private JwtAuthenticationFilter jwtAuthenticationFilter;

        @Autowired
        private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

        /**
         * Bean mã hóa mật khẩu — dùng ở AuthenticationServiceImpl khi
         * đăng ký (encode) và đăng nhập (matches).
         */
        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        /**
         * Chuỗi filter bảo mật chính — định nghĩa route nào public, route
         * nào cần role gì, và gắn JwtAuthenticationFilter vào trước
         * UsernamePasswordAuthenticationFilter (để JWT được xác thực trước
         * khi Spring Security thử các cơ chế authentication khác).
         */
        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

                http
                                // Tắt CSRF vì dùng JWT (stateless), không dùng session/cookie
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                                // Bắt lỗi authentication (JWT sai/hết hạn/thiếu) bằng entry
                                // point tùy chỉnh, trả JSON rõ ràng thay vì trang lỗi mặc định
                                .exceptionHandling(exception -> exception
                                                .authenticationEntryPoint(jwtAuthenticationEntryPoint))

                                // Cho phép hiển thị iframe từ cùng domain (để render PDF preview)
                                .headers(headers -> headers
                                                .frameOptions(frame -> frame.sameOrigin()))

                                .authorizeHttpRequests(auth -> auth
                                                // ----- Trang giao diện (view) - public -----
                                                .requestMatchers(
                                                                "/",
                                                                "/login",
                                                                "/register",
                                                                "/forgot-password",
                                                                "/reset-password",
                                                                "/dashboard",
                                                                "/profile",
                                                                "/admin/dashboard",
                                                                "/manager/dashboard",
                                                                "/user/dashboard")
                                                .permitAll()

                                                // ----- Tài nguyên tĩnh (CSS/JS/ảnh/upload) - public -----
                                                .requestMatchers(
                                                                "/css/**",
                                                                "/js/**",
                                                                "/images/**",
                                                                "/uploads/**",
                                                                "/favicon.ico")
                                                .permitAll()

                                                // ----- API auth - public -----
                                                .requestMatchers(
                                                                "/api/auth/login",
                                                                "/api/auth/register",
                                                                "/api/auth/refresh-token",
                                                                "/api/auth/forgot-password",
                                                                "/api/auth/verify-otp",
                                                                "/api/auth/reset-password")
                                                .permitAll()

                                                // ----- API ADMIN -----
                                                .requestMatchers("/api/admin/**")
                                                .hasRole("ADMIN")

                                                // ----- API MANAGER & ADMIN -----
                                                // Thêm bảo mật cho API duyệt tài liệu và phòng ban
                                                .requestMatchers(
                                                                "/api/manager/**",
                                                                "/api/departments/**")
                                                .hasAnyRole("MANAGER", "ADMIN")

                                                // ----- API nghiệp vụ - bắt buộc đăng nhập, mọi role -----
                                                // Đã khóa /api/chat/** và /api/documents/** (không còn
                                                // permitAll như Tuần 3) vì Chat Management đã hoàn thành
                                                .requestMatchers(
                                                                "/api/user/**",
                                                                "/api/chat/**",
                                                                "/api/documents/**",
                                                                "/api/search/**")
                                                .hasAnyRole("USER", "MANAGER", "ADMIN")

                                                // ----- Còn lại: bắt buộc đăng nhập -----
                                                .anyRequest().authenticated())

                                .addFilterBefore(
                                                jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }
}
