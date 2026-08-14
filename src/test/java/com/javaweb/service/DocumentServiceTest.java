package com.javaweb.service;

import com.javaweb.entity.UsersEntity;
import com.javaweb.enums.UserRole;
import com.javaweb.repository.UsersRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;

@SpringBootTest
public class DocumentServiceTest {

    @Autowired
    private DocumentService documentService;
    
    @Autowired
    private UsersRepository usersRepository;

    @Test
    public void testGetMyDocumentsAsManager() {
        try {
            List<UsersEntity> users = usersRepository.findAll();
            UsersEntity manager = users.stream().filter(u -> u.getRole() == UserRole.MANAGER).findFirst().orElse(null);
            if (manager == null) {
                System.out.println("No manager found for test!");
                return;
            }
            Pageable pageable = PageRequest.of(0, 10);
            var result = documentService.getMyDocuments(manager, pageable);
            System.out.println("SUCCESS_GET_MY_DOCUMENTS total=" + result.getTotalElements());
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
}
