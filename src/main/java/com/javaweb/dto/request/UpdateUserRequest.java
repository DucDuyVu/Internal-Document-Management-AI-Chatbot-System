package com.javaweb.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserRequest {
    private String fullName;

    private String email;

    private String phone;

    private String role;

    private Long departmentId;

    private String employeeCode;

    private String jobTitle;

    private Long managerId;

    private Boolean isActive;
}
