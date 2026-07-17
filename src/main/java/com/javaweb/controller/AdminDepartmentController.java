package com.javaweb.controller;

import java.util.List;

import com.javaweb.dto.request.AdminDepartmentRequest;
import com.javaweb.dto.request.AssignDepartmentRequest;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.javaweb.dto.response.AdminDepartmentResponse;
import com.javaweb.service.DepartmentsService;

@RestController
@RequestMapping("/api/admin/departments")
public class AdminDepartmentController {

    @Autowired
    private DepartmentsService departmentsService;

    // Lấy tất cả danh sách phòng ban
    @GetMapping
    public ResponseEntity<List<AdminDepartmentResponse>> getAllDepartments() {
        // ResponseEntity.ok(..) tạo HTTP Response với trạng thái 200 OK => đưa data cho body response
        return ResponseEntity.ok(departmentsService.getAllDepartments());
    }

    // Lấy danh sách theo id phòng ban
    @GetMapping("/{id}")
    public ResponseEntity<AdminDepartmentResponse> getDepartmentById(@PathVariable Long id) {
        AdminDepartmentResponse department = departmentsService.getDepartmentById(id);
        return ResponseEntity.ok(department);
    }

    // Tạo phòng ban mới (Thêm)
    @PostMapping
    public ResponseEntity<AdminDepartmentResponse> createDepartment(@RequestBody AdminDepartmentRequest request) {
        AdminDepartmentResponse created = departmentsService.createDepartment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // Xóa phòng ban (XÓA MỀM)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id) {
        departmentsService.deleteDepartment(id);
        return ResponseEntity.noContent().build(); // trả về 204 + không có body
    }


    // Update phòng ban (Sửa)
    @PutMapping("/{id}")
    public ResponseEntity<AdminDepartmentResponse> updateDepartment(@PathVariable Long id, @RequestBody AdminDepartmentRequest request) {
        AdminDepartmentResponse updated = departmentsService.updateDepartment(id, request);
        return ResponseEntity.ok(updated);
    }

    // Chuyển user sang phòng ban khác
    @PutMapping("{userId}/departmentId")
    public ResponseEntity<Void> assignDepartment(@PathVariable Long userId, @RequestBody AssignDepartmentRequest request) {
        departmentsService.assignUserToDepartment(userId, request.getDepartmentId());
        return ResponseEntity.noContent().build(); // trả về 204 không cần trả ra body
    }
}
