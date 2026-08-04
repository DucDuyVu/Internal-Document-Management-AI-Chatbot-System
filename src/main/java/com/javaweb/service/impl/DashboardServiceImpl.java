package com.javaweb.service.impl;

import com.javaweb.dto.response.DashboardActivityDTO;
import com.javaweb.dto.response.DashboardDataResponse;
import com.javaweb.dto.response.DashboardDocumentDTO;
import com.javaweb.entity.ActivityLogsEntity;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.repository.ActivityLogsRepository;
import com.javaweb.repository.ChatSessionsRepository;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.repository.DepartmentsRepository;
import com.javaweb.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final ActivityLogsRepository activityLogsRepository;
    private final ChatSessionsRepository chatSessionsRepository;
    private final DocumentRepository documentRepository;
    private final UsersRepository usersRepository;
    private final DepartmentsRepository departmentsRepository;
    private final com.javaweb.repository.UserSessionsRepository userSessionsRepository;

    @Override
    public DashboardDataResponse getDashboardStats() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        UsersEntity user = usersRepository.findByUserName(username).orElse(null);
        if (user == null)
            return null;

        Long userId = user.getId();
        Integer deptId = user.getDepartment() != null ? user.getDepartment().getId().intValue() : null;
        Long deptIdLong = user.getDepartment() != null ? user.getDepartment().getId() : null;

        // Statistics
        int viewCount = activityLogsRepository.countByUsersEntityId_IdAndAction(userId, "VIEW_DOCUMENT");
        int searchCount = activityLogsRepository.countByUsersEntityId_IdAndAction(userId, "SEARCH");
        int chatSessionCount = chatSessionsRepository.countByUserChatId_IdAndDeletedAtIsNull(userId);

        // Document Count
        Pageable docPageable = PageRequest.of(0, 6);
        Page<DocumentEntity> docPage;
        int documentCount = 0;

        if (user.getRole().name().equals("ADMIN")) {
            List<DocumentEntity> allDocs = documentRepository.findByDeletedAtIsNull();
            documentCount = allDocs.size();
            List<DocumentEntity> recentForAdmin = allDocs.stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .limit(6)
                    .collect(Collectors.toList());
            docPage = new org.springframework.data.domain.PageImpl<>(recentForAdmin);
        } else {
            boolean isManager = user.getRole().name().equals("MANAGER");
            docPage = documentRepository.findVisibleToDepartmentWithSharing(deptId, deptIdLong, userId, isManager, docPageable);
            documentCount = (int) docPage.getTotalElements();
        }

        // Recent Activities
        List<ActivityLogsEntity> recentActs = activityLogsRepository.findByUsersEntityId_IdOrderByCreatedAtDesc(userId,
                PageRequest.of(0, 8));
        List<DashboardActivityDTO> recentActivities = recentActs.stream().map(a -> DashboardActivityDTO.builder()
                .id(a.getId())
                .action(a.getAction())
                .targetType(a.getTargetType())
                .targetId(a.getTargetId())
                .createdAt(a.getCreatedAt())
                .build()).collect(Collectors.toList());

        // Last Login
        ActivityLogsEntity lastLogin = activityLogsRepository
                .findFirstByUsersEntityId_IdAndActionOrderByCreatedAtDesc(userId, "LOGIN").orElse(null);

        // Recent Documents
        List<DashboardDocumentDTO> recentDocuments = docPage.getContent().stream().map(d -> {
            String deptName = "Chung";
            if (d.getDepartmentId() != null) {
                DepartmentsEntity dept = departmentsRepository.findById(d.getDepartmentId().longValue()).orElse(null);
                if (dept != null) {
                    deptName = dept.getName();
                }
            }
            return DashboardDocumentDTO.builder()
                    .id(d.getId())
                    .fileName(d.getFileName())
                    .fileType(d.getFileType())
                    .fileSize(d.getFileSize())
                    .status(d.getStatus().name())
                    .createdAt(d.getCreatedAt())
                    .departmentName(deptName)
                    .build();
        }).collect(Collectors.toList());
        // Manager info
        boolean isManager = user.getRole() != null && user.getRole().name().equals("MANAGER");
        int managedEmployeeCount = 0;
        String departmentName = "";
        int activeSessionsCount = userSessionsRepository.countByUserIdAndIsRevokedFalse(user);

        if (isManager && user.getDepartment() != null) {
            managedEmployeeCount = (int) usersRepository.countByDepartmentId(user.getDepartment().getId());
            departmentName = user.getDepartment().getName();
        }

        return DashboardDataResponse.builder()
                .documentCount(documentCount)
                .chatSessionCount(chatSessionCount)
                .viewCount(viewCount)
                .searchCount(searchCount)
                .lastLoginTime(lastLogin != null ? lastLogin.getCreatedAt() : null)
                .recentActivities(recentActivities)
                .recentDocuments(recentDocuments)
                .isManager(isManager)
                .managedEmployeeCount(managedEmployeeCount)
                .departmentName(departmentName)
                .pendingDocumentCount(0) // TODO: Implement when approval workflow is added
                .pendingRequestCount(0) // TODO: Implement when department requests are added
                .activeSessionsCount(activeSessionsCount)
                .build();
    }
}
