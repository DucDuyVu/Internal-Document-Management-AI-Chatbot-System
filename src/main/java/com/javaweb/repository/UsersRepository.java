package com.javaweb.repository;


import com.javaweb.entity.UsersEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface UsersRepository extends JpaRepository<UsersEntity, Long> {

	Optional<UsersEntity> findByEmail(String email);

	boolean existsByUserName(String userName);
	
	boolean existsByEmail(String email);

	long countByDepartmentId(com.javaweb.entity.DepartmentsEntity departmentId);
}
