package com.javaweb.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.javaweb.entity.DocumentsEntity;

public interface DocumentsRepository extends JpaRepository<DocumentsEntity, Long>{

}