package com.javaweb.service;

import com.javaweb.dto.request.AdminDepartmentRequest;
import com.javaweb.dto.response.AdminDepartmentResponse;

import java.util.List;

public interface DepartmentsService {
    List<AdminDepartmentResponse> getAllDepartments();

    AdminDepartmentResponse createDepartment(AdminDepartmentRequest request);

    AdminDepartmentResponse updateDepartment(Long id,AdminDepartmentRequest request);

    void deleteDepartment(Long id);

    AdminDepartmentResponse getDepartmentById(Long id);

    // chuyển user sang phòng ban khác
    void assignUserToDepartment(Long userId, Long departmentId);
}
