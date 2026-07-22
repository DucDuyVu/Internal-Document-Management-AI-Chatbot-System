package com.javaweb.repository;

import com.javaweb.entity.PasswordResetTokens;
import com.javaweb.entity.UsersEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;


@Service
public interface PasswordResetTokensRepository extends JpaRepository <PasswordResetTokens, Long> {

    Optional<PasswordResetTokens> findByUser(UsersEntity user);

    void deleteByUser(UsersEntity user);
}
