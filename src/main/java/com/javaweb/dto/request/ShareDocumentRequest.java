package com.javaweb.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShareDocumentRequest {

    private Long departmentId;
    private String role;
    private Boolean isPublicLink;
}
