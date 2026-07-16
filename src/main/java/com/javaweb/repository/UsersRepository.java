package com.javaweb.repository;



import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.javaweb.entity.UsersEntity;


public interface UsersRepository extends JpaRepository<UsersEntity, Long> {

	Optional<UsersEntity> findByEmail(String email);

	boolean existsByUserName(String userName);
	
	boolean existsByEmail(String email);

	long countByDepartmentId(com.javaweb.entity.DepartmentsEntity departmentId);
}
