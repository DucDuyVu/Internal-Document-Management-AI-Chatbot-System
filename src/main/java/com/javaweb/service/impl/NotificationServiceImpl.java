package com.javaweb.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.javaweb.dto.response.NotificationResponse;
import com.javaweb.entity.NotificationsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.NotificationsRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.NotificationService;
import com.javaweb.exception.BadRequestException;

@Service
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationsRepository notificationsRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Override
    @Transactional
    // Tạo thông báo mới cho người dùng
    public void createNotification(UsersEntity user, String title, String message) {
        NotificationsEntity notification = new NotificationsEntity();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRead(false);
        notificationsRepository.save(notification);
    }

    @Override
    @Transactional
    public void notifyAdmins(String title, String message) {
        List<UsersEntity> admins = usersRepository.findByRole(com.javaweb.enums.UserRole.ADMIN);
        for (UsersEntity admin : admins) {
            createNotification(admin, title, message);
        }
    }

    @Override
    @Transactional
    public void notifyManagers(Long departmentId, String title, String message) {
        if (departmentId == null) return;
        List<UsersEntity> deptUsers = usersRepository.findByDepartmentId(departmentId);
        for (UsersEntity u : deptUsers) {
            if (u.getRole() == com.javaweb.enums.UserRole.MANAGER) {
                createNotification(u, title, message);
            }
        }
    }

    @Override
    @Transactional
    public void notifyDepartment(Long departmentId, String title, String message) {
        if (departmentId == null) {
            // Gửi cho toàn bộ users (nếu share cho null tức là toàn bộ phòng ban)
            List<UsersEntity> allUsers = usersRepository.findAll();
            for (UsersEntity u : allUsers) {
                createNotification(u, title, message);
            }
        } else {
            List<UsersEntity> deptUsers = usersRepository.findByDepartmentId(departmentId);
            for (UsersEntity u : deptUsers) {
                createNotification(u, title, message);
            }
        }
    }

    @Override
    @Transactional
    public void notifySystemAction(UsersEntity actor, Long targetDeptId, String title, String actionDescription, boolean notifyAllDeptUsers) {
        if (actor == null) return;
        
        // Gửi cho chính người thực hiện
        createNotification(actor, title, "Bạn " + actionDescription);

        // Xác định danh xưng dựa trên Role
        String roleName = "Người dùng";
        switch (actor.getRole()) {
            case ADMIN: roleName = "Quản trị viên"; break;
            case MANAGER: roleName = "Quản lý"; break;
            case USER: roleName = "Nhân viên"; break;
        }

        String observerMessage = roleName + " " + actor.getFullName() + " " + actionDescription;

        // Gửi cho toàn bộ Admins (trừ chính người thực hiện)
        List<UsersEntity> admins = usersRepository.findByRole(com.javaweb.enums.UserRole.ADMIN);
        for (UsersEntity admin : admins) {
            if (!admin.getId().equals(actor.getId())) {
                createNotification(admin, title, observerMessage);
            }
        }

        // Gửi cho phòng ban
        if (targetDeptId != null) {
            List<UsersEntity> deptUsers = usersRepository.findByDepartmentId(targetDeptId);
            for (UsersEntity u : deptUsers) {
                if (u.getId().equals(actor.getId()) || u.getRole() == com.javaweb.enums.UserRole.ADMIN) {
                    continue; // Bỏ qua người thực hiện hoặc Admin vì Admin đã nhận ở trên
                }
                if (notifyAllDeptUsers || u.getRole() == com.javaweb.enums.UserRole.MANAGER) {
                    createNotification(u, title, observerMessage);
                }
            }
        }
    }

    @Override
    // Lấy danh sách thông báo chưa đọc của người dùng
    public List<NotificationResponse> getUnreadNotifications(UsersEntity user) {
        List<NotificationsEntity> unreadList = notificationsRepository
                .findByUserAndIsReadFalseOrderByCreatedAtDesc(user);
        return unreadList.stream().map(notif -> new NotificationResponse(
                notif.getId(),
                notif.getTitle(),
                notif.getMessage(),
                notif.isRead(),
                notif.getCreatedAt())).collect(Collectors.toList());
    }

    // Lấy toàn bộ lịch sử thông báo
    @Override
    public List<NotificationResponse> getAllNotifications(UsersEntity user) {
        List<NotificationsEntity> allList = notificationsRepository.findByUserOrderByCreatedAtDesc(user);
        return allList.stream().map(notif -> new NotificationResponse(
                notif.getId(),
                notif.getTitle(),
                notif.getMessage(),
                notif.isRead(),
                notif.getCreatedAt())).collect(Collectors.toList());
    }

    @Override
    @Transactional
    // Đánh dấu thông báo đã đọc
    public void markAsRead(Long notificationId, UsersEntity user) {
        NotificationsEntity notification = notificationsRepository.findById(notificationId)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy thông báo"));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("Bạn không có quyền thực hiện thao tác này");
        }

        notification.setRead(true);
        notificationsRepository.save(notification);
    }
}
