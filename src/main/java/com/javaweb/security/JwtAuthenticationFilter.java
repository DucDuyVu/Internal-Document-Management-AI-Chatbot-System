package com.javaweb.security;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.JwtService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter{

	@Autowired
	private UsersRepository usersRepository;
	
	@Autowired
	private JwtService jwtService;
	
	@Override
	public void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		
		String authHeader = request.getHeader("Authorization");
		
		if (authHeader == null || ! authHeader.startsWith("Bearer ") ) {
			filterChain.doFilter(request, response);
			
			return;
		}
		
		String token = authHeader.substring(7);
		
		if ( !jwtService.validateToken(token)) {
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
		
		
		if (SecurityContextHolder.getContext().getAuthentication() == null) {

		    List<GrantedAuthority> authorities =
		            List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));

		    UsernamePasswordAuthenticationToken authentication =
		            new UsernamePasswordAuthenticationToken(
		                    user,
		                    null,
		                    authorities);

		    SecurityContextHolder.getContext().setAuthentication(authentication);
		}
		
		filterChain.doFilter(request, response);
	}
}
