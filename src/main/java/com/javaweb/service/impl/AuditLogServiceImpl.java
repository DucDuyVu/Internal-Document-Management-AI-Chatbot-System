package com.javaweb.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.event.AuditEven;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javaweb.dto.request.AuditLogRequest;
import com.javaweb.dto.response.ActivityLogResponse;
import com.javaweb.entity.ActivityLogsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.ActivityLogsRepository;
import com.javaweb.service.AuditLogService;
import java.time.LocalDateTime;

@Service
public class AuditLogServiceImpl implements AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogServiceImpl.class);

    @Autowired
    private ActivityLogsRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void handleAuditEvent(AuditEven event) {
        try {
            ActivityLogsEntity entity = new ActivityLogsEntity();
            
            if (event.getUserId() != null) {
                UsersEntity user = new UsersEntity();
                user.setId(event.getUserId());
                entity.setUsersEntityId(user);
            }
            
            if (event.getAction() != null) {
                entity.setAction(event.getAction().name());
            }
            entity.setTargetType(event.getTargetType());
            entity.setTargetId(event.getTargetId());
            
            if (event.getMetadata() != null) {
                entity.setMetadata(objectMapper.writeValueAsString(event.getMetadata()));
            }
            
            entity.setCreatedAt(LocalDateTime.now());

            repository.save(entity);
        } catch (Exception e) {
            logger.error("Error saving audit event", e);
        }
    }

    @Override
    public Page<ActivityLogResponse> search(AuditLogRequest request, Pageable pageable) {

        return null;
    }
}
