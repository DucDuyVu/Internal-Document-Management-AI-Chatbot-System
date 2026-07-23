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

/**
 * SecurityConfig — cấu hình bảo mật toàn bộ ứng dụng (JWT, phân quyền URL).
 *
 * File này được merge từ 2 nhánh (feature/chat-management + dev) ngày
 * 22/07/2026 — 3 quyết định merge quan trọng cần nhớ:
 *
 * 1. Giữ jwtAuthenticationEntryPoint (bản dev thiếu dòng này) — nếu bỏ,
 *    lỗi authentication (JWT sai/hết hạn) sẽ trả về trang lỗi mặc định
 *    của Spring Security thay vì JSON response chuẩn của dự án.
 *
 * 2. Thêm role MANAGER vào /api/user/** (bản cũ của Kim thiếu, chỉ có
 *    USER/ADMIN) — theo schema.sql, users.role có 3 giá trị
 *    USER/MANAGER/ADMIN, thiếu MANAGER sẽ chặn nhầm user hợp lệ.
 *
 * 3. /api/chat/** và /api/documents/** ĐÃ CHUYỂN từ permitAll sang bắt
 *    buộc đăng nhập (hasAnyRole USER/MANAGER/ADMIN) — vì toàn bộ
 *    Chat Management (Tuần 4) đã hoàn thành và đã luôn yêu cầu JWT hợp
 *    lệ để lấy currentUser, permitAll trước đó chỉ là tạm thời cho demo
 *    Tuần 3, nay không còn cần thiết.
 */
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
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Bắt lỗi authentication (JWT sai/hết hạn/thiếu) bằng entry
            // point tùy chỉnh, trả JSON rõ ràng thay vì trang lỗi mặc định
            .exceptionHandling(exception ->
                    exception.authenticationEntryPoint(jwtAuthenticationEntryPoint))

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
                            "/user/dashboard"
                    ).permitAll()

                    // ----- Tài nguyên tĩnh (CSS/JS/ảnh/upload) - public -----
                    .requestMatchers(
                            "/css/**",
                            "/js/**",
                            "/images/**",
                            "/uploads/**",
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

                    // ----- API ADMIN -----
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")

                    // ----- API nghiệp vụ - bắt buộc đăng nhập, mọi role -----
                    // Đã khóa /api/chat/** và /api/documents/** (không còn
                    // permitAll như Tuần 3) vì Chat Management đã hoàn thành
                    .requestMatchers(
                            "/api/user/**",
                            "/api/chat/**",
                            "/api/documents/**",
                            "/api/search/**"
                    ).hasAnyRole("USER", "MANAGER", "ADMIN")

                    // ----- Còn lại: bắt buộc đăng nhập -----
                    .anyRequest().authenticated()
            )

            .addFilterBefore(
                    jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}