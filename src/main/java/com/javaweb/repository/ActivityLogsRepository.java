package com.javaweb.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

import com.javaweb.entity.ActivityLogsEntity;

@Service
public interface ActivityLogsRepository extends JpaRepository<ActivityLogsEntity, Long>{
	
}
