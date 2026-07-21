package com.javaweb.repository;

import com.javaweb.entity.DepartmentsEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DepartmentsRepository extends JpaRepository<DepartmentsEntity, Long>{

    Optional<DepartmentsEntity> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByNameIgnoreCaseAndDeletedAtIsNull(String name);

    List<DepartmentsEntity> findAllByDeletedAtIsNull();

}
