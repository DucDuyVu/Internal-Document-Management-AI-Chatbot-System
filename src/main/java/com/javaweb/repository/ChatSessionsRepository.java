package com.javaweb.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.ChatSessionsEntity;

public interface ChatSessionsRepository extends JpaRepository<ChatSessionsEntity, Long>{

}
