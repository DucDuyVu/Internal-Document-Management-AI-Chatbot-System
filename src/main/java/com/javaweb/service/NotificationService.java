package com.javaweb.service;

import java.util.List;

import com.javaweb.dto.response.NotificationResponse;
import com.javaweb.entity.UsersEntity;

public interface NotificationService {
    // Tạo thông báo mới cho người dùng
    void createNotification(UsersEntity user, String title, String message);

    // Gửi thông báo cho toàn bộ Admin
    void notifyAdmins(String title, String message);

    // Gửi thông báo cho toàn bộ User trong phòng ban
    void notifyDepartment(Long departmentId, String title, String message);

    // Lấy danh sách thông báo chưa đọc của người dùng
    List<NotificationResponse> getUnreadNotifications(UsersEntity user);

    // Lấy toàn bộ lịch sử thông báo
    List<NotificationResponse> getAllNotifications(UsersEntity user);

    // Đánh dấu thông báo đã đọc
    void markAsRead(Long notificationId, UsersEntity user);
}
