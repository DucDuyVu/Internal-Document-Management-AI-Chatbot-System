package com.javaweb.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;

@SpringBootTest
public class DocumentRepositoryTest {

    @Autowired
    private DocumentRepository documentRepository;

    @Test
    public void testFindVisibleWithDept() {
        try {
            var result = documentRepository.findVisibleToDepartmentWithSharing(1, 1L, 1L, true, PageRequest.of(0, 10));
            System.out.println("SUCCESS_TEST_FIND_VISIBLE_WITH_DEPT total=" + result.getTotalElements());
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }
}
