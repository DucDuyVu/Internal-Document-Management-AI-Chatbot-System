package com.javaweb.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Cau hinh cac bean dung chung cho toan bo ung dung,
 * khong thuoc ve mot module rieng biet nao (khong phai security,
 * khong phai document).
 *
 * RestTemplate duoc dung boi GeminiEmbeddingService de goi REST API
 * cua Google Gemini (embedding + chat). Truoc day bean nay duoc khai
 * bao trong UserConfig.java (da bi xoa khi don dep entity trung lap
 * luc merge nhanh dev va feature/rag-pipeline).
 */
@Configuration
public class AppConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(30000); // Thoi gian cho ket noi: 30 giay
        factory.setReadTimeout(120000);   // Thoi gian cho phan hoi tu API: 120 giay (2 phut)
        return new RestTemplate(factory);
    }
}