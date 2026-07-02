package com.javaweb.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.UserSessionsEntity;

public interface UserSessionsRepository extends JpaRepository<UserSessionsEntity, Long> {

}
