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
    @EventListener(ApplicationReadyEvent.class)
    public void cleanupOnStartup() {
        log.info("STARTUP CLEANUP: Kiểm tra các tài liệu bị kẹt ở trạng thái PROCESSING...");
        List<DocumentEntity> stuckDocuments = documentRepository.findByStatus(DocumentStatus.PROCESSING);
        List<DocumentEntity> stuckPendingDocs = documentRepository.findByStatusAndApprovalStatus(DocumentStatus.PENDING, ApprovalStatus.APPROVED);
        stuckDocuments.addAll(stuckPendingDocs);
        
        if (!stuckDocuments.isEmpty()) {
            for (DocumentEntity doc : stuckDocuments) {
                DocumentStatus oldStatus = doc.getStatus();
                doc.setStatus(DocumentStatus.FAILED);
                // Giữ nguyên ApprovalStatus (nếu là APPROVED thì vẫn là APPROVED)
                // để hiển thị lỗi thống nhất, hoặc tuỳ chọn chuyển về PENDING.
                // Ở đây ta giữ nguyên và chỉ báo lỗi xử lý AI.
                doc.setAiPurpose("LỖI HỆ THỐNG: Hệ thống bị khởi động lại hoặc gián đoạn trong quá trình xử lý.");
                doc.setAiSummary("Không thể hoàn tất phân tích tài liệu.");
                doc.setAiTags("#Error");
                doc.setUpdatedAt(LocalDateTime.now());
                log.warn("Đã chuyển Document ID={} từ {} sang FAILED do kẹt từ trước khi khởi động", doc.getId(), oldStatus);
            }
            documentRepository.saveAll(stuckDocuments);
            log.info("STARTUP CLEANUP: Đã dọn dẹp {} tài liệu bị kẹt.", stuckDocuments.size());
        } else {
            log.info("STARTUP CLEANUP: Không có tài liệu nào bị kẹt.");
        }
    }

    /**
     * Chạy định kỳ mỗi 15 phút (900000 ms) sau khi tác vụ trước đó hoàn thành.
     * Quét các document đang ở PROCESSING nhưng đã không cập nhật quá 30 phút.
     */
    @Scheduled(initialDelay = 60000, fixedDelay = 900000)
    public void cleanupPeriodic() {
        log.info("PERIODIC CLEANUP: Kiểm tra tài liệu bị kẹt quá hạn...");
        // Tìm các file PROCESSING và updatedAt quá 30 phút trước
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(30);
        List<DocumentEntity> stuckDocuments = documentRepository.findByStatusAndUpdatedAtBefore(DocumentStatus.PROCESSING, threshold);
        List<DocumentEntity> stuckPendingDocs = documentRepository.findByStatusAndApprovalStatusAndUpdatedAtBefore(DocumentStatus.PENDING, ApprovalStatus.APPROVED, threshold);
        stuckDocuments.addAll(stuckPendingDocs);

        if (!stuckDocuments.isEmpty()) {
            for (DocumentEntity doc : stuckDocuments) {
                doc.setStatus(DocumentStatus.FAILED);
                doc.setAiPurpose("LỖI TIMEOUT: Tiến trình xử lý AI vượt quá thời gian cho phép (30 phút).");
                doc.setAiSummary("Hệ thống tự động hủy do quá tải hoặc mất kết nối tới AI.");
                doc.setAiTags("#Timeout");
                doc.setUpdatedAt(LocalDateTime.now());
                log.warn("Đã chuyển Document ID={} sang FAILED do timeout (>30m)", doc.getId());
            }
            documentRepository.saveAll(stuckDocuments);
            log.info("PERIODIC CLEANUP: Đã dọn dẹp {} tài liệu quá hạn.", stuckDocuments.size());
        }
    }
}
