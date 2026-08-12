package com.javaweb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.javaweb.dto.request.CreateUserRequest;
import com.javaweb.dto.request.UpdateUserRequest;
import com.javaweb.dto.response.AdminUserResponse;
import com.javaweb.dto.response.LockUserResponse;
import com.javaweb.dto.response.UnlockResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.UsersService;
import com.javaweb.repository.UsersRepository;

@PreAuthorize("hasRole('MANAGER')")
@RestController
@RequestMapping("/api/manager/users")
public class ManagerUserController {

    @Autowired
    private UsersService usersService;

    @Autowired
    private UsersRepository usersRepository;

    private UsersEntity getManager(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getUser();
    }

    private void verifyDepartmentAccess(Long targetUserId, UsersEntity manager) {
        UsersEntity targetUser = usersRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        
        if (manager.getDepartment() == null || targetUser.getDepartment() == null || 
            !manager.getDepartment().getId().equals(targetUser.getDepartment().getId())) {
            throw new RuntimeException("Bạn không có quyền thao tác trên người dùng của phòng ban khác!");
        }
    }

    @GetMapping
    public Page<AdminUserResponse> getDepartmentUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            Authentication authentication) {
        
        UsersEntity manager = getManager(authentication);
        Long departmentId = manager.getDepartment() != null ? manager.getDepartment().getId() : -1L;
        
        // Luôn truyền role là USER vì Manager chỉ quản lý USER trong phòng ban
        return usersService.getAllUsers(page, size, search, "USER", departmentId, status);
    }

    @PostMapping
    public AdminUserResponse createDepartmentUser(@RequestBody CreateUserRequest request, Authentication authentication) {
        UsersEntity manager = getManager(authentication);
        if (manager.getDepartment() == null) {
            throw new RuntimeException("Quản lý chưa được phân phòng ban!");
        }
        // Ép buộc người dùng mới phải thuộc phòng ban của Manager và có Role là USER
        request.setDepartmentId(manager.getDepartment().getId());
        request.setRole("USER");
        return usersService.createUser(request);
    }

    @GetMapping("/{userId}")
    public AdminUserResponse getUser(@PathVariable Long userId, Authentication authentication) {
        verifyDepartmentAccess(userId, getManager(authentication));
        return usersService.getUserById(userId);
    }

    @PutMapping("/{userId}")
    public AdminUserResponse updateUser(@PathVariable Long userId, @RequestBody UpdateUserRequest request, Authentication authentication) {
        UsersEntity manager = getManager(authentication);
        verifyDepartmentAccess(userId, manager);
        
        // Ép buộc không được đổi phòng ban hoặc quyền (Role)
        request.setDepartmentId(manager.getDepartment().getId());
        request.setRole("USER");
        
        // Ép buộc không được thay đổi Người quản lý (giữ nguyên managerId cũ)
        UsersEntity targetUser = usersRepository.findById(userId).orElseThrow();
        request.setManagerId(targetUser.getManagerId());
        
        return usersService.updateUser(userId, request);
    }

    @PutMapping("/{userId}/lock")
    public LockUserResponse lockUser(@PathVariable Long userId, Authentication authentication) {
        verifyDepartmentAccess(userId, getManager(authentication));
        return usersService.lockUserResponse(userId);
    }

    @PutMapping("/{userId}/unlock")
    public UnlockResponse unlockUser(@PathVariable Long userId, Authentication authentication) {
        verifyDepartmentAccess(userId, getManager(authentication));
        return usersService.unlockResponse(userId);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId, Authentication authentication) {
        verifyDepartmentAccess(userId, getManager(authentication));
        usersService.softDeleteUser(userId);
        return ResponseEntity.ok("Xóa người dùng thành công");
    }
}
