package com.javaweb.service;

import com.javaweb.dto.request.ForgotPasswordRequest;
import com.javaweb.dto.request.ResetPasswordRequest;
import com.javaweb.dto.request.VerifyOtpRequest;
import com.javaweb.dto.response.ForgotPasswordResponse;
import com.javaweb.dto.response.ResetPasswordResponse;
import com.javaweb.dto.response.VerifyOtpResponse;

public interface PasswordResetService {
    ForgotPasswordResponse forgotPassowrd(ForgotPasswordRequest forgotPasswordRequest);

    ResetPasswordResponse resetPassword(ResetPasswordRequest passwordRequest);

    VerifyOtpResponse verifyOtp(VerifyOtpRequest verifyOtpRequest);
}
