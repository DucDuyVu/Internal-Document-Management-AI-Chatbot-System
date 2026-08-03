package com.javaweb.service;

import java.util.List;

import com.javaweb.dto.response.DocumentPermissionResponse;
import com.javaweb.entity.UsersEntity;

public interface DocumentPermissionService {
    List<DocumentPermissionResponse> getPermissions(Long documentId, UsersEntity currentUser);

    DocumentPermissionResponse share(Long documentId, com.javaweb.dto.request.ShareDocumentRequest request,
            UsersEntity grantedBy);

    List<DocumentPermissionResponse> getAllPermissions(UsersEntity currentUser);

    void revoke(Long documentId, Long departmentId, UsersEntity currentUser);
}
