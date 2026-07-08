package com.javaweb.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.DocumentEntity;

public interface DocumentRepository extends JpaRepository<DocumentEntity, Long>{

}
