package com.javaweb.rag.embedding;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class GeminiEmbeddingApiTest {

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.embedding-url}")
    private String embeddingUrl;

    @Test
    void testEmbeddingReturns3072Dimensions() {
        GeminiEmbeddingRequest request = new GeminiEmbeddingRequest(
                "Xin chào",
                "RETRIEVAL_DOCUMENT"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-goog-api-key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<GeminiEmbeddingRequest> httpEntity =
                new HttpEntity<>(request, headers);

        RestTemplate restTemplate = new RestTemplate();
        ResponseEntity<GeminiEmbeddingResponse> response = restTemplate.postForEntity(
                embeddingUrl,
                httpEntity,
                GeminiEmbeddingResponse.class
        );

        System.out.println("Status: " + response.getStatusCode());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertNotNull(response.getBody().getEmbedding());
        assertNotNull(response.getBody().getEmbedding().getValues());

        int dimensions = response.getBody().getEmbedding().getValues().length;
        System.out.println("Vector dimensions: " + dimensions);

        assertEquals(3072, dimensions, "Gemini embedding phải có đúng 3072 chiều");
    }
}
