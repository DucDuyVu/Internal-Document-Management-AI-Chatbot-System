package com.javaweb.service.impl;

import com.javaweb.dto.request.AdminDepartmentRequest;
import com.javaweb.dto.response.AdminDepartmentResponse;
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.exception.BadRequestException;
import com.javaweb.repository.DepartmentsRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.DepartmentsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DepartmentsServiceImpl implements DepartmentsService {

    @Autowired
    private DepartmentsRepository departmentsRepository;

    @Autowired
    private UsersRepository usersRepository;

    // Xử lý lấy danh sách phòng ban
    @Override
    public List<AdminDepartmentResponse> getAllDepartments() {
        List<DepartmentsEntity> departments = departmentsRepository.findAllByDeletedAtIsNull();

        return departments.stream().map(dept -> {
            long count = usersRepository.countByDepartmentId(dept.getId());
            return AdminDepartmentResponse.builder()
                    .id(dept.getId())
                    .name(dept.getName())
                    .description(dept.getDescription())
                    .userCount(count)
                    .build();
        }).collect(Collectors.toList());
    }

    // Xử lý tạo phòng ban mới
    @Override
    public AdminDepartmentResponse createDepartment(AdminDepartmentRequest request) {

        // check tên phòng ban có trùng không
        if(departmentsRepository.existsByNameIgnoreCaseAndDeletedAtIsNull(request.getName())) {
            throw new BadRequestException("Tên phòng ban đã tồn tại ! ");
        }

        DepartmentsEntity departments = new DepartmentsEntity();
        departments.setName(request.getName());
        departments.setDescription(request.getDescription());
        departments.setCreatedAt(LocalDateTime.now());
        departments.setUpdatedAt(LocalDateTime.now());

        // Lưu xuống DB
        DepartmentsEntity saved = departmentsRepository.save(departments);

        // Convert entity vừa lưu => response trả về client
        return AdminDepartmentResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .description(saved.getDescription())
                .userCount(0L)
                .build();
    }

    // Xử lý sửa phòng ban
    @Override
    public AdminDepartmentResponse updateDepartment(Long id, AdminDepartmentRequest request) {
        // Tìm theo id
        DepartmentsEntity department = departmentsRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phòng ban !"));

        // Check trùng tên
        if (! department.getName().equalsIgnoreCase(request.getName())) {
            throw new BadRequestException("Phòng ban đã tồn tại ");
        }

        // Gán dữ liệu mới
        department.setName(request.getName());
        department.setDescription(request.getDescription());
        department.setUpdatedAt(LocalDateTime.now());

        // Lưu xuống DB
        DepartmentsEntity updated = departmentsRepository.save(department);

        // Convert DepartmentsEntity => AdminDepartmentResponse
        long count = usersRepository.countByDepartmentId(updated.getId());
        return AdminDepartmentResponse.builder()
                .id(updated.getId())
                .name(updated.getName())
                .description(updated.getDescription())
                .userCount(count)
                .build();
    }

    // Xử lý xóa phòng ban
    @Override
    public void deleteDepartment(Long id) {

        // Tìm phòng ban cần xóa
        DepartmentsEntity department = departmentsRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy phòng ban !"));

        boolean hasActiveUsers = usersRepository.existsByDepartmentIdAndIsActiveTrue(id);

        if (hasActiveUsers) {
            throw new BadRequestException("Không thể xóa phòng ban vẫn còn người dùng đang hoạt động !");
        }

        // Xóa mềm (chỉ set deleteAt)
        department.setDeletedAt(LocalDateTime.now());
        departmentsRepository.save(department);
    }

    // Lấy phòng ban theo id
    @Override
    public AdminDepartmentResponse getDepartmentById(Long id) {
        // Tìm theo id
        DepartmentsEntity department = departmentsRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy phòng ban !"));

        // Đếm số user trong phòng ban
        long count = usersRepository.countByDepartmentId(id);

        // Convert thông tin cần trả về client

        return AdminDepartmentResponse.builder()
                .id(department.getId())
                .name(department.getName())
                .description(department.getDescription())
                .userCount(count)
                .build();
    }

    // chuyển user sang phòng ban
    @Override
    public void assignUserToDepartment(Long userId, Long departmentId) {
        // Tìm user
        UsersEntity user = usersRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy user !"));

        // Tìm phòng ban có tồn tại không
        DepartmentsEntity department = departmentsRepository.findByIdAndDeletedAtIsNull(departmentId)
                .orElseThrow(() -> new BadRequestException("Không tồn tại phòng ban !"));

        // Gắn cả đối tượng vào user
        user.setDepartment(department);

        usersRepository.save(user);
    }
}
