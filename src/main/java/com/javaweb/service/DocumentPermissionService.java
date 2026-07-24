package com.javaweb.service;

import java.util.List;
import com.javaweb.dto.response.DocumentPermissionResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.repository.DocumentPermissionsRepository;

public interface DocumentPermissionService {
    List<DocumentPermissionResponse> getPermissions(Long documentId, UsersEntity currentUser);

    DocumentPermissionResponse share(Long documentId, Long departmentId, UsersEntity grantedBy);

    List<DocumentPermissionResponse> getAllPermissions(UsersEntity currentUser);

    void revoke(Long documentId, Long departmentId, UsersEntity currentUser);
}
