package com.javaweb.scheduler;

import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.enums.ApprovalStatus;
import com.javaweb.entity.enums.DocumentStatus;
import com.javaweb.repository.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DocumentCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(DocumentCleanupScheduler.class);

    @Autowired
    private DocumentRepository documentRepository;

    /**
     * Chạy ngay khi ứng dụng Spring Boot khởi động xong.
     * Quét tất cả document đang ở trạng thái PROCESSING và chuyển về FAILED.
     * Lý do: Do server bị tắt ngang nên tiến trình async đã bị huỷ.
     */
    @Transactional
    @EventListener(ApplicationReadyEvent.class)
    public void cleanupOnStartup() {
        log.info("STARTUP CLEANUP: Kiểm tra các tài liệu bị kẹt ở trạng thái PROCESSING...");
        List<DocumentEntity> stuckDocuments = documentRepository.findByStatus(DocumentStatus.PROCESSING);
        List<DocumentEntity> stuckPendingDocs = documentRepository.findByStatusAndApprovalStatus(DocumentStatus.PENDING, ApprovalStatus.APPROVED);
        stuckDocuments.addAll(stuckPendingDocs);
        
        if (!stuckDocuments.isEmpty()) {
            List<Long> ids = stuckDocuments.stream().map(DocumentEntity::getId).collect(Collectors.toList());
            for (DocumentEntity doc : stuckDocuments) {
                log.warn("Đã chuyển Document ID={} từ {} sang FAILED do kẹt từ trước khi khởi động", doc.getId(), doc.getStatus());
            }
            
            documentRepository.updateDocumentsStatusAndAiInfo(
                    ids,
                    DocumentStatus.FAILED,
                    "LỖI HỆ THỐNG: Hệ thống bị khởi động lại hoặc gián đoạn trong quá trình xử lý.",
                    "Không thể hoàn tất phân tích tài liệu.",
                    "#Error",
                    LocalDateTime.now()
            );
            
            log.info("STARTUP CLEANUP: Đã dọn dẹp {} tài liệu bị kẹt.", stuckDocuments.size());
        } else {
            log.info("STARTUP CLEANUP: Không có tài liệu nào bị kẹt.");
        }
    }

    /**
     * Chạy định kỳ mỗi 15 phút (900000 ms) sau khi tác vụ trước đó hoàn thành.
     * Quét các document đang ở PROCESSING nhưng đã không cập nhật quá 30 phút.
     */
    @Transactional
    @Scheduled(initialDelay = 60000, fixedDelay = 900000)
    public void cleanupPeriodic() {
        log.info("PERIODIC CLEANUP: Kiểm tra tài liệu bị kẹt quá hạn...");
        // Tìm các file PROCESSING và updatedAt quá 30 phút trước
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(30);
        List<DocumentEntity> stuckDocuments = documentRepository.findByStatusAndUpdatedAtBefore(DocumentStatus.PROCESSING, threshold);
        List<DocumentEntity> stuckPendingDocs = documentRepository.findByStatusAndApprovalStatusAndUpdatedAtBefore(DocumentStatus.PENDING, ApprovalStatus.APPROVED, threshold);
        stuckDocuments.addAll(stuckPendingDocs);

        if (!stuckDocuments.isEmpty()) {
            List<Long> ids = stuckDocuments.stream().map(DocumentEntity::getId).collect(Collectors.toList());
            for (DocumentEntity doc : stuckDocuments) {
                log.warn("Đã chuyển Document ID={} sang FAILED do timeout (>30m)", doc.getId());
            }
            
            documentRepository.updateDocumentsStatusAndAiInfo(
                    ids,
                    DocumentStatus.FAILED,
                    "LỖI TIMEOUT: Tiến trình xử lý AI vượt quá thời gian cho phép (30 phút).",
                    "Hệ thống tự động hủy do quá tải hoặc mất kết nối tới AI.",
                    "#Timeout",
                    LocalDateTime.now()
            );
            
            log.info("PERIODIC CLEANUP: Đã dọn dẹp {} tài liệu quá hạn.", stuckDocuments.size());
        }
    }
}
