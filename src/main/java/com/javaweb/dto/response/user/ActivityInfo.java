package com.javaweb.dto.response.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityInfo {
    private String time; // e.g., "08:15"
    private String date; // e.g., "Hôm nay", "Hôm qua"
    private String action; // e.g., "Đăng nhập hệ thống", "Được cấp quyền..."
}
