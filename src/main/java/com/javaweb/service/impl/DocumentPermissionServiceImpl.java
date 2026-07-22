package com.javaweb.service.impl;

import com.javaweb.dto.response.DocumentPermissionReponse;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.exception.NotFoundException;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.service.DocumentPermissionService;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

public class DocumentPermissionServiceImpl implements DocumentPermissionService {

    @Autowired
    private DocumentRepository documentRepository;
    @Override
    public List<DocumentPermissionReponse> getPermissions(Long documentId, UsersEntity currentUser) {
        // Check tài liệu có tồn tại không
        DocumentEntity document = documentRepository.findById(documentId)
                .orElseThrow(() -> new NotFoundException("Tài liệu không tồn tại !"));

        //
        return List.of();
    }
}
