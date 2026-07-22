package com.javaweb.dto.response;

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
    
    @com.fasterxml.jackson.annotation.JsonProperty("isActive")
    private boolean isActive;
}
