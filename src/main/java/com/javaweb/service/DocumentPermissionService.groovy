package com.javaweb.service

import com.javaweb.dto.response.DocumentPermissionReponse
import com.javaweb.entity.UsersEntity

public interface DocumentPermissionService {
    List<DocumentPermissionReponse> getPermissions(Long documentId, UsersEntity currentUser);
}
