package com.javaweb.service.impl;

import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.UsersRepository;
import com.javaweb.security.CustomUserDetails;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    @Autowired
    private UsersRepository usersRepository;
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UsersEntity user = usersRepository.findByUserName(username)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy user : " + username));

        return new CustomUserDetails(user);
    }
}
