package com.javaweb.service.impl;

import com.javaweb.dto.request.ForgotPasswordRequest;
import com.javaweb.dto.request.ResetPasswordRequest;
import com.javaweb.dto.request.VerifyOtpRequest;
import com.javaweb.dto.response.ForgotPasswordResponse;
import com.javaweb.dto.response.ResetPasswordResponse;
import com.javaweb.dto.response.VerifyOtpResponse;
import com.javaweb.entity.UserSessionsEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.exception.BadRequestException;
import com.javaweb.repository.UserSessionsRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.EmailService;
import com.javaweb.service.JwtService;
import com.javaweb.service.OtpService;
import com.javaweb.service.PasswordResetService;
import jakarta.mail.MessagingException;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class PasswordResetServiceImpl implements PasswordResetService {

    @Autowired
    private UserSessionsRepository userSessionsRepo;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    OtpService otpService;

    @Autowired
    EmailService emailService;

    // Xử lý quên mật khẩu
    @Override
    public ForgotPasswordResponse forgotPassowrd(ForgotPasswordRequest forgotPasswordRequest) {

        Optional<UsersEntity> optionalUser = usersRepository.findByEmail(forgotPasswordRequest.getEmail());

        // Check người dùng có trong DB không
        if (optionalUser.isEmpty()) {
            throw new BadRequestException("Không tìm thấy người dùng");
        }

        UsersEntity user = optionalUser.get();

        // check trạng thái tài khoản
        if (! user.isActive()) {
            throw new BadRequestException("Tài khoản bị khóa !");
        }


        // Sinh OTP và lưu DB
        String otp = otpService.createOrUpdateOtp(user);

        /*
         * Sau khi sinh OTP
         * Gửi OTP qua email
         * */
        try {

            emailService.sendOtpEmail(user.getEmail(), otp);

//        } catch (Exception e) {
//
//            // nếu cần rollback OTP hoặc ghi log
//            throw new RuntimeException("Gửi email thất bại.", e);
//        }
        } catch (MailException e) {
                e.printStackTrace();
                throw new RuntimeException("Không thể gửi email.", e);
            }



        ForgotPasswordResponse forgotPasswordResponse = new ForgotPasswordResponse();
        forgotPasswordResponse.setMessage("Mã OTP đã được gửi tới email của bạn !");

        return forgotPasswordResponse;
    }


    // Xác thực OTP
    @Override
    public VerifyOtpResponse verifyOtp(VerifyOtpRequest verifyOtpRequest) {

        UsersEntity user = usersRepository.findByEmail(verifyOtpRequest.getEmail())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy người dùng !"));

        boolean verified = otpService.verifyOtp(user, verifyOtpRequest.getOtp());
        if (! verified) {
            throw new BadRequestException("OTP không đúng hoặc đã hết hạn");
        }

        String resetToken = jwtService.generateResetPasswordToken(user);

        VerifyOtpResponse response = new VerifyOtpResponse();
        response.setMessage("Xác thực OTP thành công !");
        response.setResetToken(resetToken);
        return response;
    }


    // Xử lý đổi mật khẩu
    @Override
    public ResetPasswordResponse resetPassword(ResetPasswordRequest request) {

        // check token
        jwtService.validateToken(request.getResetToken());

        String type = jwtService.extractTokenType(request.getResetToken());

        if (!"reset".equals(type)) {
            throw new BadRequestException("Reset Token không hợp lệ");
        }

        // Lấy email từ token
        String email = jwtService.extractEmail(request.getResetToken());

        // Tìm user
        Optional<UsersEntity> optionalUser = usersRepository.findByEmail(email);

        if (optionalUser.isEmpty()) {
            throw new BadRequestException("Không tìm thấy người dùng !");
        }

        UsersEntity user = optionalUser.get();

        if (! user.isActive()) {
            throw new BadRequestException("Tài khoản đã bị khóa ! ");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp !");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu mới không được trùng mật khẩu cũ !");
        }

        // Mã hóa mật khẩu mới
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));

        usersRepository.save(user); // lưu ở DB

        otpService.deleteOtp(user); // Xóa OTP khi đổi mật khẩu thành công

        List<UserSessionsEntity> sessions = userSessionsRepo.findByUserId(user);

        for (UserSessionsEntity session : sessions) {
            session.setIsRevoked(true); // Thu hồi token
        }

        userSessionsRepo.saveAll(sessions); // Lưu DB

        ResetPasswordResponse response = new ResetPasswordResponse();
        response.setMessage("Đã đặt lại mật khẩu !");
        return response;
    }
}
