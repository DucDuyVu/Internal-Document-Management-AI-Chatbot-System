package com.javaweb.repository;

import com.javaweb.entity.ActivityLogsEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public interface ActivityLogsRepository extends JpaRepository<ActivityLogsEntity, Long>{
	
    int countByUsersEntityId_IdAndAction(Long userId, String action);
    
    int countByUsersEntityId_Id(Long userId);
    
    Optional<ActivityLogsEntity> findFirstByUsersEntityId_IdAndActionOrderByCreatedAtDesc(Long userId, String action);
    
    List<ActivityLogsEntity> findByUsersEntityId_IdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
