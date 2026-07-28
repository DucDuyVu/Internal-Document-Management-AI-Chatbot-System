package com.javaweb.service.impl;

import com.javaweb.dto.response.DocumentPermissionResponse;
import com.javaweb.entity.DepartmentsEntity;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.DocumentPermissionsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.enums.UserRole;
import com.javaweb.exception.BadRequestException;
import com.javaweb.exception.ForbiddenException;
import com.javaweb.exception.NotFoundException;
import com.javaweb.repository.DepartmentsRepository;
import com.javaweb.repository.DocumentPermissionsRepository;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.service.ActivityLogService;
import com.javaweb.service.DocumentPermissionService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.javaweb.service.NotificationService;

@Service
public class DocumentPermissionServiceImpl implements DocumentPermissionService {

        @Autowired
        private DocumentRepository documentRepository;

        @Autowired
        private DepartmentsRepository departmentsRepository;
        @Autowired
        private DocumentPermissionsRepository documentPermissionsRepository;

        @Autowired
        private ActivityLogService activityLogService;

        @Autowired
        private NotificationService notificationService;

        @Override
        public List<DocumentPermissionResponse> getPermissions(Long documentId, UsersEntity currentUser) {
                // Check tài liệu có tồn tại không
                DocumentEntity document = documentRepository.findById(documentId)
                                .orElseThrow(() -> new NotFoundException("Tài liệu không tồn tại !"));

                // Check quyền xem danh sách chia sẻ (Chỉ Admin và Trưởng phòng của phòng ban sở
                // hữu)
                boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;

                boolean isOwnerManager = currentUser.getRole() == UserRole.MANAGER
                                && document.getDepartmentId() != null
                                && currentUser.getDepartment() != null
                                && Long.valueOf(document.getDepartmentId()).equals(currentUser.getDepartment().getId());

                if (!isAdmin && !isOwnerManager) {
                        throw new ForbiddenException(
                                        "Chỉ ADMIN và MANAGER phòng ban sở hữu mới có quyền xem danh sách chia sẻ !");
                }

                // Lấy danh sách permission
                List<DocumentPermissionsEntity> permissionsEntities = documentPermissionsRepository
                                .findByDocumentIdWithDetails(documentId);

                // Map Entity -> DTO
                return permissionsEntities.stream()
                                .map(p -> new DocumentPermissionResponse(
                                                p.getId(),
                                                p.getPermissionsDocumentId() != null
                                                                ? p.getPermissionsDocumentId().getId()
                                                                : null,
                                                p.getPermissionsDocumentId() != null
                                                                ? p.getPermissionsDocumentId().getFileName()
                                                                : null,
                                                p.getPermissionDepartmentId() != null
                                                                ? p.getPermissionDepartmentId().getId()
                                                                : null,
                                                p.getPermissionDepartmentId() != null
                                                                ? p.getPermissionDepartmentId().getName()
                                                                : null,
                                                p.getGrantedBy() != null ? p.getGrantedBy().getFullName() : null,
                                                p.getCreatedAt()))
                                .toList();
        }

        @Override
        public List<DocumentPermissionResponse> getAllPermissions(UsersEntity currentUser) {
                boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;
                boolean isManager = currentUser.getRole() == UserRole.MANAGER;

                if (!isAdmin && !isManager) {
                        throw new ForbiddenException("Bạn không có quyền xem danh sách chia sẻ!");
                }

                List<DocumentPermissionsEntity> permissionsEntities;
                if (isAdmin) {
                        permissionsEntities = documentPermissionsRepository.findAllActivePermissions();
                } else {
                        // isManager
                        if (currentUser.getDepartment() == null) {
                                return List.of();
                        }
                        Integer deptId = currentUser.getDepartment().getId().intValue();
                        permissionsEntities = documentPermissionsRepository.findActivePermissionsByDepartmentId(deptId);
                }

                return permissionsEntities.stream()
                                .map(p -> new DocumentPermissionResponse(
                                                p.getId(),
                                                p.getPermissionsDocumentId() != null
                                                                ? p.getPermissionsDocumentId().getId()
                                                                : null,
                                                p.getPermissionsDocumentId() != null
                                                                ? p.getPermissionsDocumentId().getFileName()
                                                                : null,
                                                p.getPermissionDepartmentId() != null
                                                                ? p.getPermissionDepartmentId().getId()
                                                                : null,
                                                p.getPermissionDepartmentId() != null
                                                                ? p.getPermissionDepartmentId().getName()
                                                                : null,
                                                p.getGrantedBy() != null ? p.getGrantedBy().getFullName() : null,
                                                p.getCreatedAt()))
                                .toList();
        }

        @Override
        @Transactional
        public DocumentPermissionResponse share(Long documentId, Long departmentId, UsersEntity grantedBy) {
                try {

                        // Kiểm tra tài liệu tồn tại
                        DocumentEntity document = documentRepository.findById(documentId)
                                        .orElseThrow(() -> new NotFoundException("Tài liệu không tồn tại !"));

                        if (departmentId != null && departmentId.equals(0L)) {
                                departmentId = null;
                        }

                        // Kiểm tra phòng ban muốn chia sẻ tới có tồn tại (nếu khác null)
                        DepartmentsEntity targetDept = null;
                        if (departmentId != null) {
                                targetDept = departmentsRepository.findById(departmentId)
                                                .orElseThrow(() -> new NotFoundException("Phòng ban không tồn tại !"));
                        }

                        // Kiểm tra quyền chia sẻ (có Admin với Manager chia sẻ được tài liệu của phòng
                        // ban mình)
                        boolean isAdmin = grantedBy.getRole() == UserRole.ADMIN;

                        boolean isManager = grantedBy.getRole() == UserRole.MANAGER
                                        && document.getDepartmentId() != null
                                        && Long.valueOf(document.getDepartmentId())
                                                        .equals(grantedBy.getDepartment().getId());

                        if (!isAdmin && !isManager) {
                                throw new ForbiddenException("Bạn không có quyền chia sẻ tài liệu này !");
                        }

                        boolean alreadyShared;
                        if (departmentId == null) {
                                alreadyShared = documentPermissionsRepository
                                                .existsByPermissionsDocumentId_IdAndPermissionDepartmentIdIsNullAndRevokedAtIsNull(
                                                                documentId);
                        } else {
                                alreadyShared = documentPermissionsRepository
                                                .existsByPermissionsDocumentId_IdAndPermissionDepartmentId_IdAndRevokedAtIsNull(
                                                                documentId, departmentId);
                        }

                        if (alreadyShared) {
                                throw new BadRequestException("Phòng ban này đã được cấp quyền xem tài liệu !");
                        }

                        // Lưu quyền xem cho các phòng ban
                        DocumentPermissionsEntity permission = new DocumentPermissionsEntity();
                        permission.setPermissionsDocumentId(document);
                        permission.setPermissionDepartmentId(targetDept);
                        permission.setGrantedBy(grantedBy);
                        permission.setCreatedAt(LocalDateTime.now());

                        DocumentPermissionsEntity saved = documentPermissionsRepository.save(permission);

                        // Ghi audit log
                        activityLogService.log(
                                        grantedBy.getId(),
                                        "SHARE_DOCUMENT",
                                        "document",
                                        documentId,
                                        Map.of("sharedWithDepartmentId",
                                                        departmentId != null ? departmentId : Long.valueOf(0),
                                                        "sharedWithDepartmentName",
                                                        targetDept != null ? targetDept.getName()
                                                                        : "Tất cả phòng ban"));
                        
                        // Bắn thông báo chia sẻ tài liệu
                        String deptName = targetDept != null ? targetDept.getName() : "Toàn bộ công ty";
                        notificationService.notifyAdmins("Tài liệu được chia sẻ", "Người dùng " + grantedBy.getFullName() + " đã chia sẻ tài liệu '" + document.getFileName() + "' cho phòng ban: " + deptName);
                        notificationService.notifyDepartment(departmentId, "Tài liệu mới", "Bạn được chia sẻ tài liệu mới: '" + document.getFileName() + "'. Vui lòng kiểm tra mục Tài liệu.");

                        return new DocumentPermissionResponse(
                                        saved.getId(),
                                        documentId,
                                        document.getFileName(),
                                        targetDept != null ? targetDept.getId() : null,
                                        targetDept != null ? targetDept.getName() : null,
                                        grantedBy.getFullName(),
                                        saved.getCreatedAt());
                } catch (Exception e) {
                        throw new BadRequestException(
                                        "DEBUG LỖI: " + e.getMessage() + " | Class: " + e.getClass().getName());
                }
        }

        @Override
        @Transactional
        public void revoke(Long documentId, Long departmentId, UsersEntity currentUser) {
                DocumentEntity document = documentRepository.findById(documentId)
                                .orElseThrow(() -> new NotFoundException("Tài liệu không tồn tại !"));

                boolean isAdmin = currentUser.getRole() == UserRole.ADMIN;

                boolean isManager = currentUser.getRole() == UserRole.MANAGER
                                && document.getDepartmentId() != null
                                && Long.valueOf(document.getDepartmentId()).equals(currentUser.getDepartment().getId());

                if (!isAdmin && !isManager) {
                        throw new ForbiddenException("Không có quyền thu hồi tài liệu !");
                }

                if (departmentId != null && departmentId.equals(0L)) {
                        departmentId = null;
                }

                // Lấy bản ghi phân quyền chưa bị thu hồi
                DocumentPermissionsEntity permission;
                if (departmentId == null) {
                        permission = documentPermissionsRepository
                                        .findByPermissionsDocumentId_IdAndPermissionDepartmentIdIsNullAndRevokedAtIsNull(
                                                        documentId)
                                        .orElseThrow(() -> new NotFoundException(
                                                        "Chưa được cấp quyền cho tất cả phòng ban, hoặc quyền đã bị thu hồi !"));
                } else {
                        permission = documentPermissionsRepository
                                        .findByPermissionsDocumentId_IdAndPermissionDepartmentId_IdAndRevokedAtIsNull(
                                                        documentId, departmentId)
                                        .orElseThrow(() -> new NotFoundException(
                                                        "Phòng ban chưa được cấp quyền xem tài liệu, hoặc quyền đã bị thu hồi !"));
                }

                // Soft Delete: Cập nhật thông tin thu hồi
                permission.setRevokedAt(LocalDateTime.now());
                permission.setRevokedBy(currentUser);
                documentPermissionsRepository.save(permission);

                activityLogService.log(currentUser.getId(), "REVOKE_PERMISSION", "document", documentId,
                                Map.of("revokedDepartmentId", departmentId != null ? departmentId : Long.valueOf(0)));
        }
}
