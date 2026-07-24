package com.javaweb.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javaweb.entity.ActivityLogsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.ActivityLogsRepository;
import com.javaweb.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import org.slf4j.Logger;

@Service
@RequiredArgsConstructor // Tự sinh constructor cho các fields

public class ActivityLongServiceImpl implements ActivityLogService {

    private static final Logger logger = LoggerFactory.getLogger(ActivityLongServiceImpl.class);

    private final ActivityLogsRepository activityLogsRepository;

    private final ObjectMapper objectMapper;
    @Override
    public void log(Long userId, String action, String targeType, Long targeId, Map<String, Object> metadate) {
        try {
            ActivityLogsEntity logsEntity = new ActivityLogsEntity();

            UsersEntity user = new UsersEntity();
            user.setId(userId);

            logsEntity.setAction(String.valueOf(user));
            logsEntity.setUsersEntityId(user);
            logsEntity.setTargetType(targeType);
            logsEntity.setTargetId(targeId);
            // Map -> JSON (metadata)
            logsEntity.setMetadata(objectMapper.writeValueAsString(metadate));

            activityLogsRepository.save(logsEntity);
        } catch (JsonProcessingException e) {
            logger.error("Lỗi khi ghi activity log : action={}, targetId={}", action, targeId, e);
        }
    }
}
