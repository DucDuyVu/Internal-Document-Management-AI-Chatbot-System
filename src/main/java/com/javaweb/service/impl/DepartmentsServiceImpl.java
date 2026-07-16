package com.javaweb.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.javaweb.dto.response.AdminDepartmentResponse;
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.repository.DepartmentsRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.DepartmentsService;

@Service
public class DepartmentsServiceImpl implements DepartmentsService {

    @Autowired
    private DepartmentsRepository departmentsRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Override
    public List<AdminDepartmentResponse> getAllDepartments() {
        List<DepartmentsEntity> departments = departmentsRepository.findAll();
        
        return departments.stream().map(dept -> {
            long count = usersRepository.countByDepartmentId(dept);
            return AdminDepartmentResponse.builder()
                    .id(dept.getId())
                    .name(dept.getName())
                    .description(dept.getDescription())
                    .userCount(count)
                    .build();
        }).collect(Collectors.toList());
    }
}
