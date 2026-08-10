package com.javaweb.service;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

public interface StorageService {
    String uploadFile(MultipartFile file) throws IOException;

    InputStream downloadFile(String fileName);
}
