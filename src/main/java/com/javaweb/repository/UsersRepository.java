package com.javaweb.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.UsersEntity;

public interface UsersRepository extends JpaRepository<UsersEntity, Long> {
	
}
