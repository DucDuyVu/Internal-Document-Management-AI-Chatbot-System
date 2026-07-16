package com.javaweb.service;

import com.javaweb.entity.UsersEntity;

public interface OtpService {


    String createOrUpdateOtp(UsersEntity user);

    // Check OTP
    boolean verifyOtp(UsersEntity user, String otp);

    void deleteOtp(UsersEntity user);
}
