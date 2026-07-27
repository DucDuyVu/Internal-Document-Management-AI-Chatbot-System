package com.javaweb.dto.response.search;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchUserDto {
    private Long id;
    private String title; // Tên người dùng
    private String meta; // Vai trò / Phòng ban
    private String icon; // fa-user, fa-user-tie
    private String color; 
    private String bg;
    private String avatarUrl; // Dành cho UI nếu muốn thay icon bằng avatar thật
}
