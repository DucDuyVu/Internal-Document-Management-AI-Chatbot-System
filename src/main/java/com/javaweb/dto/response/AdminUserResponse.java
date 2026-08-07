package com.javaweb.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminUserResponse {
    private Long id;
    private String fullName;
    private String username;
    private String email;
    private String role;
    private String departmentName;
    private String phone;
    
    @JsonProperty("isActive")
    private boolean isActive;
    
    private Long uploadedFilesCount;
    private Long approvedFilesCount;
}
