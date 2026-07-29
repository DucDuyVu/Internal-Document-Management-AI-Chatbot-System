package com.javaweb.service.impl;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionalEventListener;

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
    @TransactionalEventListener // Chờ khi nào Upload/Login thành công ở luồng chính thì thả Event cho Thread
                                // ngầm đi ghi Log
    @Async // để ghi log chạy ngầm, không block luồng xử lý chính

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

            repository.save(entity);
        } catch (Exception e) {
            logger.error("Lỗi khi lưu bản ghi nhật ký hoạt động !", e);
        }
    }
}
