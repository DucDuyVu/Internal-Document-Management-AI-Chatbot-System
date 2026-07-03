package com.javaweb.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.DepartmentsEntity;

public interface DepartmentsRepository extends JpaRepository<DepartmentsEntity, Long>{

}