package com.javaweb.service.impl;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.event.AuditEven;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javaweb.dto.request.AuditLogRequest;
import com.javaweb.dto.response.ActivityLogResponse;
import com.javaweb.entity.ActivityLogsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.ActivityLogsRepository;
import com.javaweb.service.AuditLogService;

@Service
public class AuditLogServiceImpl implements AuditLogService {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogServiceImpl.class);

    @Autowired
    private ActivityLogsRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    @EventListener // Lắng nghe mọi event dù có hay không có transaction
    @Async // Ghi log ngầm, không block luồng chính

    // Chuyển đổi đối tượng (Event) sang dạng bảng Entity (để lưu DB)
    public void handleAuditEvent(AuditEven event) {
        try {
            ActivityLogsEntity entity = new ActivityLogsEntity();

            if (event.getUserId() != null) {
                UsersEntity user = new UsersEntity();
                user.setId(event.getUserId());
                entity.setUsersEntityId(user);
            }

            if (event.getActionType() != null) {
                entity.setAction(event.getActionType().name());
            }
            entity.setTargetType(event.getTargetType());
            entity.setTargetId(event.getTargetId());

            if (event.getMetadata() != null) {
                entity.setMetadata(objectMapper.writeValueAsString(event.getMetadata()));
            }

            entity.setCreatedAt(LocalDateTime.now());

            repository.save(entity); // lưu log vào DB
        } catch (Exception e) {
            logger.error("Lỗi khi lưu bản ghi nhật ký hoạt động !", e);
        }
    }

    // Lấy các hoạt động gần đây ném ra giao diện
    @Override
    public List<ActivityLogResponse> getRecentActivities(Long userId, int limit) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);
        List<ActivityLogsEntity> entities = repository.findByUsersEntityId_IdOrderByCreatedAtDesc(userId, pageable);
        return mapToResponse(entities);
    }

    @Override
    public List<ActivityLogResponse> getDepartmentRecentActivities(Long departmentId, int limit) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);
        List<ActivityLogsEntity> entities = repository
                .findByUsersEntityId_Department_IdOrderByCreatedAtDesc(departmentId, pageable);
        return mapToResponse(entities);
    }

    @Override
    public List<ActivityLogResponse> getAllRecentActivities(int limit) {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, limit);
        List<ActivityLogsEntity> entities = repository.findAllByOrderByCreatedAtDesc(pageable);
        return mapToResponse(entities);
    }

    private List<ActivityLogResponse> mapToResponse(List<ActivityLogsEntity> entities) {
        return entities.stream().map(entity -> {
            ActivityLogResponse dto = new ActivityLogResponse();
            dto.setId(entity.getId());
            if (entity.getUsersEntityId() != null) {
                dto.setUserId(entity.getUsersEntityId().getId());
                dto.setUserFullName(entity.getUsersEntityId().getFullName());
            }
            dto.setAction(entity.getAction());
            dto.setTargetType(entity.getTargetType());
            dto.setTargetId(entity.getTargetId());
            dto.setCreatedAt(entity.getCreatedAt());
            try {
                if (entity.getMetadata() != null) {
                    dto.setMetadata(objectMapper.readValue(entity.getMetadata(),
                            new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {
                            }));
                }
            } catch (Exception e) {
                logger.warn("Could not parse metadata for activity log " + entity.getId());
            }
            return dto;
        }).collect(java.util.stream.Collectors.toList());
    }
}