package com.javaweb.service.impl;

import com.javaweb.entity.PasswordResetTokens;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.PasswordResetTokensRepository;
import com.javaweb.service.OtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpServiceImpl implements OtpService {

    @Autowired
    private PasswordResetTokensRepository passwordResetTokensRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${otp.max-failed-attempts}")
    private int maxFailedAttempts;

    @Value("${otp.expiry-minutes}")
    private int expiryMinutes;

    @Value("${otp.resend-cooldown-seconds}")
    private int resendCooldownSeconds;

    @Value("${otp.length}")
    private int otpLength;

    // Sinh ngẫu nhiên OTP theo độ dài cấu hình
    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int min = (int) Math.pow(10, otpLength - 1);
        int max = (int) Math.pow(10, otpLength) - min;
        int otp = min + random.nextInt(max);
        return String.valueOf(otp);
    }

    @Override
    public String createOrUpdateOtp(UsersEntity user) {

        // Tìm password_reset_tokens có OTP chưa
        Optional<PasswordResetTokens> optionalToken = passwordResetTokensRepository.findByUser(user);

        PasswordResetTokens passwordResetTokens; // để lấy token ra ghi đè nếu có token

        if (!optionalToken.isEmpty()) {
            passwordResetTokens = optionalToken.get(); // có token = lấy ra ghi đè

            if (passwordResetTokens.getOtpSentAt().plusSeconds(resendCooldownSeconds).isAfter(LocalDateTime.now())) {
                long secondsLeft = java.time.Duration.between(
                        LocalDateTime.now(), passwordResetTokens.getOtpSentAt().plusSeconds(resendCooldownSeconds)
                ).getSeconds();
                throw new IllegalStateException("Đợi " + secondsLeft + "s trước khi gửi yêu cầu OTP mới !");
            }
        } else {
            passwordResetTokens = new PasswordResetTokens();
            passwordResetTokens.setUser(user); // chưa có => tạo mới, gắn user
        }

        // Tạo otp
        String otp = generateOtp();

        // mã hóa otp ở DB
        passwordResetTokens.setOtp(passwordEncoder.encode(otp));
        passwordResetTokens.setVerified(false);
        passwordResetTokens.setFailedAttempts(0L);
        passwordResetTokens.setOtpSentAt(LocalDateTime.now());
        passwordResetTokens.setExpiresAt(LocalDateTime.now().plusMinutes(expiryMinutes));

        passwordResetTokensRepository.save(passwordResetTokens);

        return otp;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Override
    public boolean verifyOtp(UsersEntity user, String otp) {

        Optional<PasswordResetTokens> optionalTokenn = passwordResetTokensRepository.findByUser(user);

        if (optionalTokenn.isEmpty()) {
            return false;  // Chưa yêu cầu xác thực
        }

        PasswordResetTokens token = optionalTokenn.get();

        // check thời gian hết hạn
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            return false;
        }

        // check số lần nhập sai OTP thì khóa
        if (token.getFailedAttempts() >= maxFailedAttempts) {
            throw new IllegalStateException("Đã nhập sai quá số lần, vui lòng yêu cầu OTP mới !");
        }

        boolean matched = passwordEncoder.matches(otp, token.getOtp());

        if (matched) {
            token.setVerified(true); // đã xác minh
            token.setFailedAttempts(0L);
        } else {
            token.setFailedAttempts(token.getFailedAttempts() + 1);
        }

        passwordResetTokensRepository.save(token);
        return matched;
    }

    @Override
    public void deleteOtp(UsersEntity user) {
        passwordResetTokensRepository.deleteByUser(user);
    }
}
