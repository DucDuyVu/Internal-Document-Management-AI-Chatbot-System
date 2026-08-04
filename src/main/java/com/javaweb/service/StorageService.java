package com.javaweb.service;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

public interface StorageService {
    String uploadFile(MultipartFile file) throws IOException;

    ResponseInputStream<GetObjectResponse> downloadFile(String fileName);
}
