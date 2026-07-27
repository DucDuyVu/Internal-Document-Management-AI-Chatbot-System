package com.javaweb.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.javaweb.entity.NotificationsEntity;
import com.javaweb.entity.UsersEntity;

@Repository
public interface NotificationsRepository extends JpaRepository<NotificationsEntity, Long> {
    List<NotificationsEntity> findByUserAndIsReadFalseOrderByCreatedAtDesc(UsersEntity user);
    List<NotificationsEntity> findByUserOrderByCreatedAtDesc(UsersEntity user);
}
