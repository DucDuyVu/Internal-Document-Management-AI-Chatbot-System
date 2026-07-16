package com.javaweb.service.impl;

import com.javaweb.exception.BadRequestException;
import com.javaweb.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {
    private  final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Override
    public void sendOtpEmail(String to, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject("Internal Document Management System - Password Reset");

            helper.setText(buildOtpTemplate(otp), true);

            mailSender.send(message);
        } catch (MessagingException | MailException e) {
            throw new RuntimeException("Không thể gửi email.", e);
        }
    }

    private String buildOtpTemplate(String otp) {

        return """
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Password Reset</title>
        </head>

        <body style="
                margin:0;
                padding:40px;
                background:#f5f7fa;
                font-family:Arial,Helvetica,sans-serif;">

            <table align="center"
                   cellpadding="0"
                   cellspacing="0"
                   style="
                        width:600px;
                        background:#ffffff;
                        border-radius:12px;
                        overflow:hidden;
                        box-shadow:0 2px 12px rgba(0,0,0,.08);">

                <!-- Header -->
                <tr>
                    <td style="
                        background:#0d6efd;
                        color:white;
                        text-align:center;
                        padding:24px;">

                        <h2 style="margin:0;">
                            Internal Document Management System
                        </h2>

                    </td>
                </tr>

                <!-- Content -->
                <tr>
                    <td style="padding:35px;">

                        <h3 style="margin-top:0;color:#333;">
                            Password Reset Verification
                        </h3>

                        <p style="color:#555;font-size:15px;line-height:1.8;">
                            Xin chào,
                        </p>

                        <p style="color:#555;font-size:15px;line-height:1.8;">
                            Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                        </p>

                        <p style="color:#555;font-size:15px;">
                            Vui lòng sử dụng mã OTP bên dưới để tiếp tục:
                        </p>

                        <!-- OTP -->
                        <div style="
                                margin:35px 0;
                                text-align:center;">

                            <span style="
                                    display:inline-block;
                                    padding:18px 40px;
                                    font-size:34px;
                                    font-weight:bold;
                                    letter-spacing:8px;
                                    color:#0d6efd;
                                    background:#eef5ff;
                                    border:2px dashed #0d6efd;
                                    border-radius:10px;">

                                %s

                            </span>

                        </div>

                        <p style="color:#555;font-size:15px;">
                            ⏰ Mã OTP có hiệu lực trong
                            <strong>5 phút</strong>.
                        </p>

                        <p style="color:#555;font-size:15px;">
                            Không chia sẻ mã này với bất kỳ ai.
                        </p>

                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="
                        background:#f8f9fa;
                        padding:20px;
                        text-align:center;
                        font-size:13px;
                        color:#888;">

                        Nếu bạn không yêu cầu đặt lại mật khẩu,
                        vui lòng bỏ qua email này.

                        <br><br>

                        © 2026 Internal Document Management System

                    </td>
                </tr>

            </table>

        </body>
        </html>
        """.formatted(otp);
    }
}
