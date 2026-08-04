package com.javaweb.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.response.AdminDepartmentResponse;
import com.javaweb.service.DepartmentsService;

@RestController
@RequestMapping({"/api/departments", "/api/user"})
public class DepartmentController {

    @Autowired
    private DepartmentsService departmentsService;

    // Lấy tất cả danh sách phòng ban cho người dùng thông thường (USER/MANAGER)
    @GetMapping({"", "/departments"})
    public ResponseEntity<List<AdminDepartmentResponse>> getAllDepartments() {
        return ResponseEntity.ok(departmentsService.getAllDepartments());
    }
}
