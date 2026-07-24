package com.javaweb.security;

import com.javaweb.entity.UsersEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class CustomUserDetails implements UserDetails {

    private final UsersEntity user;

    public  UsersEntity getUser() {
        return user;
    }
    public CustomUserDetails(UsersEntity user) {
        this.user = user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // check @PreAuthorize("hasRole('ADMIN')")
        return List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    // Spring Security lấy so sánh với password login
    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUserName();
    }


    // Tài khoản còn hạn không
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    // Tài khoản bị khóa không
    @Override
    public boolean isAccountNonLocked() {
        return user.isActive();
    }

    // Mật khẩu chưa hết hạn
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    // Tài khoản được kích hoạt
    @Override
    public boolean isEnabled() {
        return user.isActive();
    }
}
