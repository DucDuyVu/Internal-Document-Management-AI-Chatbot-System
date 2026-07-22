package com.javaweb.repository;

import com.javaweb.entity.ActivityLogsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

@Service
public interface ActivityLogsRepository extends JpaRepository<ActivityLogsEntity, Long>{
	
}
