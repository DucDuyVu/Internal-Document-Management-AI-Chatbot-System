package com.javaweb.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateUserRequest {
    private String userName;

    private String fullName;

    private String password;

    private String email;

    private String role;

    private Long departmentId;

    private String employeeCode;

    private String jobTitle;

    private Long managerId;

    private String phone;
}
