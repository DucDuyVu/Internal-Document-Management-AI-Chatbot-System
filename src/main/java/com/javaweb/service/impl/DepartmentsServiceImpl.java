package com.javaweb.service.impl;

import com.javaweb.dto.request.AdminDepartmentRequest;
import com.javaweb.dto.response.AdminDepartmentResponse;
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.exception.BadRequestException;
import com.javaweb.exception.NotFoundException;
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

    @Override
    public List<AdminDepartmentResponse> getAllDepartments() {
        List<DepartmentsEntity> departments = departmentsRepository.findAllByDeletedAtIsNullOrderByIdAsc();

        return departments.stream().map(dept -> {
            long count = usersRepository.countByDepartmentIdAndDeletedAtIsNullAndIsActiveTrue(dept.getId());
            return AdminDepartmentResponse.builder()
                    .id(dept.getId())
                    .name(dept.getName())
                    .description(dept.getDescription())
                    .userCount(count)
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    public AdminDepartmentResponse createDepartment(AdminDepartmentRequest request) {
        validateDepartmentRequest(request);

        String normalizedName = request.getName().trim();
        if (departmentsRepository.existsByNameIgnoreCaseAndDeletedAtIsNull(normalizedName)) {
            throw new BadRequestException("Tên phòng ban đã tồn tại !");
        }

        DepartmentsEntity departments = new DepartmentsEntity();
        departments.setName(normalizedName);
        departments.setDescription(request.getDescription() == null ? "" : request.getDescription().trim());
        departments.setCreatedAt(LocalDateTime.now());
        departments.setUpdatedAt(LocalDateTime.now());

        DepartmentsEntity saved = departmentsRepository.save(departments);

        return AdminDepartmentResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .description(saved.getDescription())
                .userCount(0L)
                .build();
    }

    @Override
    public AdminDepartmentResponse updateDepartment(Long id, AdminDepartmentRequest request) {
        validateDepartmentRequest(request);

        DepartmentsEntity department = departmentsRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng ban !"));

        String normalizedName = request.getName().trim();
        if (!department.getName().equalsIgnoreCase(normalizedName)
                && departmentsRepository.existsByNameIgnoreCaseAndDeletedAtIsNull(normalizedName)) {
            throw new BadRequestException("Phòng ban đã tồn tại");
        }

        department.setName(normalizedName);
        department.setDescription(request.getDescription() == null ? "" : request.getDescription().trim());
        department.setUpdatedAt(LocalDateTime.now());

        DepartmentsEntity updated = departmentsRepository.save(department);
        long count = usersRepository.countByDepartmentIdAndDeletedAtIsNullAndIsActiveTrue(updated.getId());
        return AdminDepartmentResponse.builder()
                .id(updated.getId())
                .name(updated.getName())
                .description(updated.getDescription())
                .userCount(count)
                .build();
    }

    @Override
    public void deleteDepartment(Long id) {
        DepartmentsEntity department = departmentsRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng ban !"));

        boolean hasActiveUsers = usersRepository.existsByDepartmentIdAndDeletedAtIsNullAndIsActiveTrue(id);
        if (hasActiveUsers) {
            throw new BadRequestException("Không thể xóa phòng ban vẫn còn người dùng đang hoạt động !");
        }

        department.setDeletedAt(LocalDateTime.now());
        departmentsRepository.save(department);
    }

    @Override
    public AdminDepartmentResponse getDepartmentById(Long id) {
        DepartmentsEntity department = departmentsRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng ban !"));

        long count = usersRepository.countByDepartmentIdAndDeletedAtIsNullAndIsActiveTrue(id);

        return AdminDepartmentResponse.builder()
                .id(department.getId())
                .name(department.getName())
                .description(department.getDescription())
                .userCount(count)
                .build();
    }

    @Override
    public void assignUserToDepartment(Long userId, Long departmentId) {
        UsersEntity user = usersRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy user !"));

        if (departmentId != null) {
            DepartmentsEntity department = departmentsRepository.findByIdAndDeletedAtIsNull(departmentId)
                    .orElseThrow(() -> new NotFoundException("Không tồn tại phòng ban !"));
            user.setDepartment(department);
        } else {
            user.setDepartment(null);
        }

        usersRepository.save(user);
    }

    private void validateDepartmentRequest(AdminDepartmentRequest request) {
        if (request == null || request.getName() == null || request.getName().trim().isEmpty()) {
            throw new BadRequestException("Tên phòng ban không được để trống");
        }
    }
}
