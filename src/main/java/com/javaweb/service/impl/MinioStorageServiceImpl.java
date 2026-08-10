package com.javaweb.service.impl;

import com.javaweb.service.StorageService;
import io.minio.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.util.UUID;

@Slf4j
@Service
public class MinioStorageServiceImpl implements StorageService {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket-name}")
    private String bucketName;

    private MinioClient minioClient;

    @PostConstruct
    public void init() {
        log.info("=== INIT MINIO ===");
        log.info("Endpoint: {}", endpoint);
        log.info("Bucket: {}", bucketName);
        
        try {
            minioClient = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();

            // Kiểm tra và tạo bucket nếu chưa có
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder()
                    .bucket(bucketName)
                    .build());
            
            if (!found) {
                log.warn("Bucket '{}' not found, creating...", bucketName);
                minioClient.makeBucket(MakeBucketArgs.builder()
                        .bucket(bucketName)
                        .build());
                log.info("Bucket '{}' created successfully!", bucketName);
            } else {
                log.info("Bucket '{}' already exists.", bucketName);
            }
        } catch (Exception e) {
            log.error("Failed to initialize MinIO: {}", e.getMessage(), e);
            throw new RuntimeException("MinIO initialization failed: " + e.getMessage());
        }
    }

    @Override
    public String uploadFile(MultipartFile file) {
        try {
            String fileName = UUID.randomUUID() + "-" + file.getOriginalFilename();
            
            log.info("Uploading file: {} to bucket: {}", fileName, bucketName);
            
            minioClient.putObject(
                PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(fileName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build()
            );
            
            log.info("File uploaded successfully: {}", fileName);
            return fileName;
            
        } catch (Exception e) {
            log.error("Upload failed: {}", e.getMessage(), e);
            throw new RuntimeException("Upload failed: " + e.getMessage());
        }
    }

    @Override
    public java.io.InputStream downloadFile(String fileName) {
        try {
            return minioClient.getObject(
                GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(fileName)
                    .build()
            );
        } catch (Exception e) {
            log.error("Download failed: {}", e.getMessage(), e);
            throw new RuntimeException("Download failed: " + e.getMessage());
        }
    }
}
