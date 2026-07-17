package com.javaweb.repository;

import com.javaweb.entity.ChatSessionsEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatSessionsRepository extends JpaRepository<ChatSessionsEntity, Long>{

}
