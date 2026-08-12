package com.javaweb.service.impl;

import com.javaweb.dto.response.DashboardActivityDTO;
import com.javaweb.dto.response.DashboardDataResponse;
import com.javaweb.dto.response.DashboardDocumentDTO;
import com.javaweb.dto.response.ReportStatsDTO;
import com.javaweb.entity.ActivityLogsEntity;
import com.javaweb.entity.ChatSessionsEntity;
import com.javaweb.entity.ChatMessageEntity;
import com.javaweb.enums.ChatMessageRole;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.entity.enums.ApprovalStatus;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.repository.ActivityLogsRepository;
import com.javaweb.repository.ChatSessionsRepository;
import com.javaweb.repository.ChatMessageRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.stream.Collectors;
import java.time.format.DateTimeFormatter;
import java.io.PrintWriter;
import java.io.FileWriter;
import com.javaweb.rag.chat.GeminiChatService;
import com.javaweb.repository.UserSessionsRepository;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final ActivityLogsRepository activityLogsRepository;
    private final ChatSessionsRepository chatSessionsRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final DocumentRepository documentRepository;
    private final UsersRepository usersRepository;
    private final DepartmentsRepository departmentsRepository;
    private final GeminiChatService geminiChatService;
    private final UserSessionsRepository userSessionsRepository;

    public DashboardDataResponse getDashboardStats() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            UsersEntity user = null;
            Object principal = auth.getPrincipal();
            
            if (principal instanceof com.javaweb.security.CustomUserDetails) {
                user = ((com.javaweb.security.CustomUserDetails) principal).getUser();
            } else if (principal instanceof UsersEntity) {
                user = (UsersEntity) principal;
            }
            
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
            docPage = documentRepository.findVisibleToDepartmentWithSharing(deptId, deptIdLong, userId, isManager,
                    docPageable);
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
        
        int activeSessionsCount;
        if (user.getRole().name().equals("ADMIN")) {
            activeSessionsCount = userSessionsRepository.countAllOnlineUsers();
        } else {
            activeSessionsCount = userSessionsRepository.countByUserIdAndIsRevokedFalse(user);
        }

        if (isManager && user.getDepartment() != null) {
            managedEmployeeCount = (int) usersRepository.countByDepartmentId(user.getDepartment().getId());
            departmentName = user.getDepartment().getName();
        }
        // Tính toán các chỉ số sử dụng (Usage Metrics)
        long storageUsedBytes = 0;
        if (user.getRole().name().equals("ADMIN")) {
            List<DocumentEntity> allDocsForSize = documentRepository.findByDeletedAtIsNull();
            storageUsedBytes = allDocsForSize.stream()
                    .filter(d -> d.getFileSize() != null)
                    .mapToLong(DocumentEntity::getFileSize)
                    .sum();
        } else {
            List<DocumentEntity> allDocsForDept = documentRepository
                    .findVisibleToDepartmentWithSharing(deptId, deptIdLong, userId, isManager, PageRequest.of(0, 10000))
                    .getContent();
            storageUsedBytes = allDocsForDept.stream()
                    .filter(d -> d.getFileSize() != null)
                    .mapToLong(DocumentEntity::getFileSize)
                    .sum();
        }
        long storageQuotaBytes = 10L * 1024 * 1024 * 1024; // Giả lập giới hạn 10 GB (Chưa có module cấu hình hệ thống)

        List<ChatMessageEntity> allMessagesForTrend = user.getRole().name().equals("ADMIN")
                ? chatMessageRepository.findAll()
                : chatMessageRepository.findBySessionId_UserChatId_Id(userId);

        int aiTokensUsed = 0;
        for (ChatMessageEntity msg : allMessagesForTrend) {
            if (msg.getTokenCount() != null) {
                aiTokensUsed += msg.getTokenCount();
            }
        }
        
        int aiTokensQuota = 50000;
        int documentQuota = 500;
        
        long errorDocCount = 0;
        long unassignedDocCount = 0;
        long lockedUsersCount = 0;
        long pendingDocsCount = 0;
        
        if (user.getRole().name().equals("ADMIN")) {
            errorDocCount = documentRepository.countByStatusAndDeletedAtIsNull(DocumentStatus.FAILED);
            unassignedDocCount = documentRepository.countByDepartmentIdIsNullAndDeletedAtIsNull();
            lockedUsersCount = usersRepository.countByIsActiveFalseAndDeletedAtIsNull();
            pendingDocsCount = documentRepository.countByStatusAndDeletedAtIsNull(DocumentStatus.PENDING) 
                             + documentRepository.countByStatusAndDeletedAtIsNull(DocumentStatus.PROCESSING);
        }

        // Dữ liệu cho Biểu đồ hoạt động (7 ngày gần nhất)
        List<String> activityLabels = new ArrayList<>();
        List<Integer> uploadData = new ArrayList<>();
        List<Integer> aiData = new ArrayList<>();

        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");

        List<DocumentEntity> allDocsForTrend = user.getRole().name().equals("ADMIN")
                ? documentRepository.findByDeletedAtIsNull()
                : documentRepository.findVisibleToDepartmentWithSharing(deptId, deptIdLong, userId, isManager,
                        PageRequest.of(0, 10000)).getContent();

        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            activityLabels.add(date.format(formatter));

            int docsCreated = 0;
            for (DocumentEntity d : allDocsForTrend) {
                if (d.getCreatedAt() != null && d.getCreatedAt().toLocalDate().equals(date)) {
                    docsCreated++;
                }
            }
            uploadData.add(docsCreated);

            int aiInteractions = 0;
            for (ChatMessageEntity msg : allMessagesForTrend) {
                if (msg.getCreatedAt() != null && msg.getCreatedAt().toLocalDate().equals(date) && msg.getRole() == ChatMessageRole.USER) {
                    aiInteractions++;
                }
            }
            
            for (DocumentEntity d : allDocsForTrend) {
                if (d.getAiSummary() != null && !d.getAiSummary().isEmpty()) {
                    if (d.getUpdatedAt() != null && d.getUpdatedAt().toLocalDate().equals(date)) {
                        aiInteractions++;
                    }
                }
            }
            aiData.add(aiInteractions);
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
                .errorDocumentCount(errorDocCount)
                .unassignedDocumentCount(unassignedDocCount)
                .lockedUserCount(lockedUsersCount)
                .pendingDocumentCount((int) pendingDocsCount)
                .activeSessionsCount(activeSessionsCount)
                .storageUsedBytes(storageUsedBytes)
                .storageQuotaBytes(storageQuotaBytes)
                .aiTokensUsed(aiTokensUsed)
                .aiTokensQuota(aiTokensQuota)
                .documentQuota(documentQuota)
                .activityLabels(activityLabels)
                .uploadData(uploadData)
                .aiData(aiData)
                .build();
        } catch (Exception e) {
            try {
                PrintWriter pw = new PrintWriter(new FileWriter("error.log", true));
                pw.println("----- ERROR in getDashboardStats -----");
                e.printStackTrace(pw);
                pw.close();
            } catch (Exception ex) {}
            throw e;
        }
    }

    @Override
    public ReportStatsDTO getManagerReportStats() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        UsersEntity user = usersRepository.findByUserName(username).orElse(null);
        if (user == null)
            return null;

        Long userId = user.getId();
        Integer deptId = user.getDepartment() != null ? user.getDepartment().getId().intValue() : null;
        Long deptIdLong = user.getDepartment() != null ? user.getDepartment().getId() : null;

        boolean isManager = user.getRole().name().equals("MANAGER");
        boolean isAdmin = user.getRole().name().equals("ADMIN");

        List<DocumentEntity> docs;
        if (isAdmin) {
            docs = documentRepository.findByDeletedAtIsNull();
        } else {
            docs = documentRepository
                    .findVisibleToDepartmentWithSharing(deptId, deptIdLong, userId, isManager, PageRequest.of(0, 10000))
                    .getContent();
        }

        int totalDocuments = docs.size();

        // Tính tỷ lệ duyệt
        long approvedCount = docs.stream().filter(d -> d.getApprovalStatus() == ApprovalStatus.APPROVED).count();
        double approvalRate = totalDocuments > 0 ? (double) approvedCount / totalDocuments * 100 : 0.0;

        // Tính toán thời gian xử lý trung bình động
        double totalProcessingHours = 0;
        int processedCount = 0;
        for (DocumentEntity d : docs) {
            if (d.getApprovalStatus() == ApprovalStatus.APPROVED && d.getCreatedAt() != null
                    && d.getUpdatedAt() != null) {
                java.time.Duration duration = java.time.Duration.between(d.getCreatedAt(), d.getUpdatedAt());
                totalProcessingHours += duration.toMinutes() / 60.0;
                processedCount++;
            }
        }
        double avgProcessingHours = processedCount > 0
                ? (Math.round((totalProcessingHours / processedCount) * 10.0) / 10.0)
                : 0.0;

        // Tính số giờ tiết kiệm nhờ AI
        int chatSessionCount = chatSessionsRepository.countByUserChatId_IdAndDeletedAtIsNull(userId);
        long docsWithAiCount = docs.stream().filter(d -> d.getAiSummary() != null && !d.getAiSummary().isEmpty())
                .count();
        double aiTimeSavedHours = (chatSessionCount * 1.5) + (docsWithAiCount * 0.5);

        // Dữ liệu cho biểu đồ đường (Line Chart)
        List<String> trendLabels = new ArrayList<>();
        List<Integer> trendDataCreated = new ArrayList<>();
        List<Integer> trendDataApproved = new ArrayList<>();

        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            trendLabels.add(date.format(formatter));

            int created = 0;
            int approved = 0;
            for (DocumentEntity d : docs) {
                if (d.getCreatedAt() != null && d.getCreatedAt().toLocalDate().equals(date)) {
                    created++;
                }
                if (d.getApprovalStatus() == ApprovalStatus.APPROVED && d.getUpdatedAt() != null && d.getUpdatedAt().toLocalDate().equals(date)) {
                    approved++;
                }
            }
            trendDataCreated.add(created);
            trendDataApproved.add(approved);
        }

        // Dữ liệu cho biểu đồ tròn (Trạng thái tài liệu)
        int pending = 0;
        int approved = 0;
        int rejected = 0;
        int aiFailed = 0;
        for (DocumentEntity d : docs) {
            if (d.getApprovalStatus() == ApprovalStatus.PENDING) {
                pending++;
            } else if (d.getApprovalStatus() == ApprovalStatus.REJECTED) {
                rejected++;
            } else if (d.getApprovalStatus() == ApprovalStatus.APPROVED) {
                if (d.getStatus() == DocumentStatus.FAILED) {
                    aiFailed++;
                } else {
                    approved++;
                }
            }
        }
        List<String> statusLabels = Arrays.asList("Chờ phê duyệt", "Đã duyệt", "Bị từ chối", "Lỗi xử lý AI");
        List<Integer> statusData = Arrays.asList(pending, approved, rejected, aiFailed);

        return ReportStatsDTO.builder()
                .totalDocuments(totalDocuments)
                .approvalRate(approvalRate)
                .avgProcessingHours(avgProcessingHours)
                .aiTimeSavedHours(aiTimeSavedHours)
                .trendLabels(trendLabels)
                .trendDataCreated(trendDataCreated)
                .trendDataApproved(trendDataApproved)
                .statusLabels(statusLabels)
                .statusData(statusData)
                .departmentName(user.getDepartment() != null ? user.getDepartment().getName() : "")
                .isAdmin(isAdmin)
                .build();
    }

    @Override
    public ReportStatsDTO getAdminReportStats(Long departmentId, String startDateStr, String endDateStr) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        UsersEntity user = usersRepository.findByUserName(username).orElse(null);
        if (user == null || !user.getRole().name().equals("ADMIN"))
            return null;

        Long userId = user.getId();
        List<DocumentEntity> allDocs = documentRepository.findByDeletedAtIsNull();

        // Xử lý chuyển đổi chuỗi ngày tháng sang LocalDateTime
        LocalDateTime start = null;
        LocalDateTime end = null;
        try {
            if (startDateStr != null && !startDateStr.isEmpty()) {
                start = LocalDate.parse(startDateStr).atStartOfDay();
            }
            if (endDateStr != null && !endDateStr.isEmpty()) {
                end = LocalDate.parse(endDateStr).atTime(23, 59, 59);
            }
        } catch (Exception e) {
            // Bỏ qua lỗi nếu định dạng ngày tháng không hợp lệ (mặc định sẽ không lọc theo
            // ngày)
        }

        final LocalDateTime finalStart = start;
        final LocalDateTime finalEnd = end;

        List<DocumentEntity> docs;
        docs = allDocs.stream().filter(d -> {
            boolean matchDept = (departmentId == null)
                    || (d.getDepartmentId() != null && d.getDepartmentId().equals(departmentId.intValue()));
            boolean matchStart = (finalStart == null)
                    || (d.getCreatedAt() != null && !d.getCreatedAt().isBefore(finalStart));
            boolean matchEnd = (finalEnd == null) || (d.getCreatedAt() != null && !d.getCreatedAt().isAfter(finalEnd));
            return matchDept && matchStart && matchEnd;
        }).collect(Collectors.toList());
        int totalDocuments = docs.size();

        // Tính tỷ lệ duyệt
        long approvedCount = docs.stream().filter(d -> d.getApprovalStatus() == ApprovalStatus.APPROVED).count();
        double approvalRate = totalDocuments > 0 ? (double) approvedCount / totalDocuments * 100 : 0.0;

        // Tính toán thời gian xử lý trung bình động
        double totalProcessingHours = 0;
        int processedCount = 0;
        for (DocumentEntity d : docs) {
            if (d.getApprovalStatus() == ApprovalStatus.APPROVED && d.getCreatedAt() != null
                    && d.getUpdatedAt() != null) {
                Duration duration = Duration.between(d.getCreatedAt(), d.getUpdatedAt());
                totalProcessingHours += duration.toMinutes() / 60.0;
                processedCount++;
            }
        }
        double avgProcessingHours = processedCount > 0
                ? (Math.round((totalProcessingHours / processedCount) * 10.0) / 10.0)
                : 0.0;

        // Tính số giờ tiết kiệm nhờ AI
        int chatSessionCount = (departmentId == null)
                ? chatSessionsRepository.countByUserChatId_IdAndDeletedAtIsNull(userId)
                : 0;
        long docsWithAiCount = docs.stream().filter(d -> d.getAiSummary() != null && !d.getAiSummary().isEmpty())
                .count();
        double aiTimeSavedHours = (chatSessionCount * 1.5) + (docsWithAiCount * 0.5);

        // Dữ liệu cho biểu đồ Cột nhóm (Thống kê theo phòng ban)
        List<String> departmentLabels = new ArrayList<>();
        List<Integer> deptTotalDocs = new ArrayList<>();
        List<Integer> deptApprovedDocs = new ArrayList<>();
        List<Integer> deptPendingDocs = new ArrayList<>();

        List<DepartmentsEntity> allDepts = departmentsRepository.findAll();
        for (DepartmentsEntity dept : allDepts) {
            departmentLabels.add(dept.getName());

            int deptTotal = 0;
            int deptApproved = 0;
            int deptPending = 0;

            for (DocumentEntity d : allDocs) {
                if (d.getDepartmentId() != null && d.getDepartmentId().intValue() == dept.getId().intValue()) {
                    deptTotal++;
                    if (d.getApprovalStatus() == ApprovalStatus.APPROVED)
                        deptApproved++;
                    else if (d.getApprovalStatus() == ApprovalStatus.PENDING)
                        deptPending++;
                }
            }

            deptTotalDocs.add(deptTotal);
            deptApprovedDocs.add(deptApproved);
            deptPendingDocs.add(deptPending);
        }

        return ReportStatsDTO.builder()
                .totalDocuments(totalDocuments)
                .approvalRate(approvalRate)
                .avgProcessingHours(avgProcessingHours)
                .aiTimeSavedHours(aiTimeSavedHours)
                .departmentLabels(departmentLabels)
                .deptTotalDocs(deptTotalDocs)
                .deptApprovedDocs(deptApprovedDocs)
                .deptPendingDocs(deptPendingDocs)
                .isAdmin(true)
                .build();
    }

    @Override
    public String generateAiReportAnalysis() {
        DashboardDataResponse stats = getDashboardStats();
        if (stats == null) {
            return "Không có dữ liệu báo cáo để phân tích.";
        }

        String prompt = String.format(
            "Bạn là một chuyên gia phân tích dữ liệu và quản lý điều hành xuất sắc.\n" +
            "Dưới đây là số liệu thống kê của hệ thống quản lý tài liệu hôm nay (Phòng ban: %s):\n" +
            "- Tổng số tài liệu: %d\n" +
            "- Số nhân viên quản lý: %d\n" +
            "- Số phiên AI đã dùng: %d\n" +
            "- Số tài liệu chờ duyệt (Pending): %d\n" +
            "Nhiệm vụ của bạn là:\n" +
            "1. Đánh giá ngắn gọn (2-3 câu) về tình hình hoạt động của hệ thống, dựa trên số lượng chờ duyệt và tổng tài liệu.\n" +
            "2. Đưa ra 3 khuyến nghị hành động cụ thể cho người quản lý để tối ưu hoá quy trình làm việc.\n" +
            "Hãy trình bày bằng tiếng Việt, định dạng Markdown rõ ràng, in đậm các ý chính và dùng emoji phù hợp. Không cần chào hỏi hay giải thích vòng vo, hãy đi thẳng vào phân tích.",
            stats.getDepartmentName() != null ? stats.getDepartmentName() : "Toàn hệ thống",
            stats.getDocumentCount(),
            stats.getManagedEmployeeCount(),
            stats.getChatSessionCount(),
            stats.getPendingDocumentCount()
        );

        return geminiChatService.generateAnswer(prompt);
    }
}