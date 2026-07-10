package com.javaweb.service.impl;

import com.javaweb.entity.PasswordResetTokens;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.PasswordResetTokensRepository;
import com.javaweb.service.OtpService;
import org.apache.coyote.BadRequestException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OtpServiceImpl implements OtpService {

    @Autowired
    private PasswordResetTokensRepository passwordResetTokensRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;


    // Sinh ngẫu nhiên 6 số OTP
    private String generateOtp() {
        SecureRandom random = new SecureRandom();

        int otp = 100000 + random.nextInt(900000);

        return String.valueOf(otp);
    }
    @Override
    public String createOrUpdateOtp(UsersEntity user) {

        // Tìm password_reset_tokens có OTP chưa
        Optional<PasswordResetTokens> optionalToken = passwordResetTokensRepository.findByUser(user);

        PasswordResetTokens passwordResetTokens; // để lấy token ra ghi đè nếu có token

        if (! optionalToken.isEmpty()) {
            passwordResetTokens = optionalToken.get(); // có token = lấy ra ghi đè

            if (passwordResetTokens.getCreatedAt().plusSeconds(60).isAfter(LocalDateTime.now())) {
                long secondsLeft = java.time.Duration.between(
                        LocalDateTime.now(), passwordResetTokens.getCreatedAt().plusSeconds(60)
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
        passwordResetTokens.setCreatedAt(LocalDateTime.now());
        passwordResetTokens.setExpiresAt(LocalDateTime.now().plusMinutes(5));

        passwordResetTokensRepository.save(passwordResetTokens);

        return otp;
    }

    @Override
    public boolean verifyOtp(UsersEntity user, String otp) {

        Optional<PasswordResetTokens> optionalTokenn = passwordResetTokensRepository.findByUser(user);

        if (optionalTokenn.isEmpty()) {
            return false;  // Chưa yêu cầu xác thưc
        }

        PasswordResetTokens token = optionalTokenn.get();

        // check thời gian hết hạn
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            return false;
        }

        // check số lần nhập sai OTP thì khóa
        if (token.getFailedAttempts() >= 5) {
            throw new IllegalStateException("Đã nhập sai quá số lân, vui lòng yêu cầu OTP mới !");
        }

        boolean matched = passwordEncoder.matches(otp, token.getOtp());
        if(matched) {
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
