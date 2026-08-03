package com.javaweb.security;

import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	@Autowired
	private UsersRepository usersRepository;

	@Autowired
	private JwtService jwtService;

	@Override
	public void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {

		// Lấy Authorization Header từ request
		// String authHeader = request.getHeader("Authorization");

		System.out.println("URI: " + request.getRequestURI());

		String authHeader = request.getHeader("Authorization");
		System.out.println("Authorization: " + authHeader);

		// request không chứa JWT trong Header và cũng không có trong Parameter
		// thì bỏ qua xác thực, chuyển sang filter tiếp
		String token = null;
		
		if (authHeader != null && authHeader.startsWith("Bearer ")) {
			token = authHeader.substring(7);
		} else if (request.getParameter("token") != null) {
			token = request.getParameter("token");
		}

		if (token == null) {
			filterChain.doFilter(request, response);
			return;
		}

		// Check JWT hợp lệ (đúng chữ ký, chưa hết hạn, không chỉnh sửa ..)
		if (!jwtService.validateToken(token)) {
			filterChain.doFilter(request, response);

			return;
		}

		String email = jwtService.extractEmail(token);

		Optional<UsersEntity> optionalUser = usersRepository.findByEmail(email);

		if (optionalUser.isEmpty()) {
			filterChain.doFilter(request, response);

			return;
		}

		UsersEntity user = optionalUser.get();

		if (!user.isActive()) {
			filterChain.doFilter(request, response);
			return;
		}

		// Chỉ tạo Authentication khi SecurityContext chưa có người dùng đăng nhập
		if (SecurityContextHolder.getContext().getAuthentication() == null) {

			// Chuyển Role (User) => ROLE_
			List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

			CustomUserDetails customUserDetails = new CustomUserDetails(user);

			// Tạo object Authentication đại diện cho người dùng đã xác thực
			UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
					customUserDetails,
					null,
					authorities);

			// Lưu Authentication vào SecurityContext để Spring Security nhận biết (đã xác
			// thực)
			SecurityContextHolder.getContext().setAuthentication(authentication);
		}
		// Chuyển request đến Controller
		filterChain.doFilter(request, response);
	}
}
