package com.javaweb.service;

import java.util.List;
import com.javaweb.dto.response.AdminDepartmentResponse;

public interface DepartmentsService {
    List<AdminDepartmentResponse> getAllDepartments();
}
