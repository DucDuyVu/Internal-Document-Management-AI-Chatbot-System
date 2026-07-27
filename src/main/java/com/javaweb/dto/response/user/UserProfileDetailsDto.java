package com.javaweb.dto.response.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDetailsDto {
    private Long id;
    private String fullName;
    private String avatarUrl;
    private String role;
    private boolean isActive;
    private String email;
    private String departmentName;
    private String joinedDate;
    private String managerName;
    
    private boolean canEdit; // true if viewer is ADMIN

    private List<String> permissions;
    private List<DocumentInfo> uploadedDocuments;
    private List<ActivityInfo> recentActivities;
}
