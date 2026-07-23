package com.javaweb.dto.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyOtpResponse {
    private String message;

    private String resetToken;
}
