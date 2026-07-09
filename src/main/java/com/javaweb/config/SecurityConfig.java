package com.javaweb.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
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

    /**
     * Chain 1 — "vùng public": các path KHÔNG cần token, và cũng KHÔNG
     * cho JwtAuthenticationFilter chạy qua (khác permitAll() thông thường
     * - permitAll() chỉ miễn bước authorization, filter vẫn chạy trước đó
     * và có thể tự trả 401 nếu filter được viết theo kiểu "luôn đòi token").
     *
     * @Order(1) - Spring xét chain này TRƯỚC. Nếu request khớp
     * securityMatcher bên dưới, dùng chain này, KHÔNG xét chain thứ 2 -
     * nghĩa là jwtAuthenticationFilter (chỉ add ở chain 2) không bao giờ
     * chạy với các path này.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain publicFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/auth/login", "/api/auth/register",
                              "/api/documents/**", "/api/chat/**")
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }

    /**
     * Chain 2 — "vùng cần auth": mọi path còn lại, giữ nguyên logic gốc
     * (JwtAuthenticationFilter chạy đầy đủ). @Order(2) nghĩa là chain này
     * chỉ được xét nếu request KHÔNG khớp chain 1 ở trên.
     */
    @Bean
    @Order(2)
    public SecurityFilterChain securedFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exception ->
                    exception.authenticationEntryPoint(jwtAuthenticationEntryPoint))
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}