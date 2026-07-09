package com.javaweb.rag.chat;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/**
 * Service gọi Google Gemini Chat API (endpoint generateContent) để sinh
 * câu trả lời tự nhiên từ 1 prompt đã ghép sẵn (câu hỏi + ngữ cảnh).
 *
 * Nhiệm vụ:
 * - Gọi Google Gemini Chat API (gemini-2.5-flash-lite).
 * - Trích xuất text câu trả lời từ response JSON lồng nhau.
 *
 * Tại sao cần class riêng (không gộp vào GeminiEmbeddingService): 2 API
 * khác endpoint, khác cấu trúc JSON, khác mục đích (sinh vector vs sinh
 * văn bản) — gộp chung sẽ vi phạm Single Responsibility và làm class đó
 * phình to không cần thiết.
 *
 * Được sử dụng bởi: RetrievalService.ask() (Query Pipeline, Milestone 3).
 */
@Service
public class GeminiChatService {

    private final RestTemplate restTemplate;

    /**
     * Constructor injection, giữ đúng convention của GeminiEmbeddingService
     * (viết tay thay vì Lombok @RequiredArgsConstructor).
     */
    public GeminiChatService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /** API Key dùng chung với Embedding API (cùng 1 Gemini API key). */
    @Value("${gemini.api.key}")
    private String apiKey;

    /** URL của Gemini Chat API — khác URL của Embedding API, cần khai báo riêng. */
    @Value("${gemini.api.chat-url}")
    private String chatUrl;

    /**
     * Gửi prompt cho Gemini, nhận về câu trả lời dạng text.
     *
     * Dùng ở đâu: RetrievalService.ask(), gọi ngay sau khi có prompt từ
     * PromptBuilder.build(question, results).
     *
     * Input:  String prompt — đã ghép sẵn câu hỏi + ngữ cảnh, sẵn sàng gửi thẳng
     * Output: String — câu trả lời text thuần của model, đã trích xuất khỏi
     *         cấu trúc JSON lồng nhau (candidates[0].content.parts[0].text)
     *
     * Lưu ý: nếu Gemini chặn câu trả lời vì lý do an toàn (safety filter),
     * "candidates" có thể rỗng dù HTTP status vẫn là 200 OK — trường hợp
     * này KHÔNG phải lỗi mạng/lỗi code, mà là model từ chối trả lời.
     * Method này throw IllegalStateException trong cả 2 trường hợp (lỗi
     * thật và bị chặn an toàn) — RetrievalService (Milestone 3) sẽ là nơi
     * quyết định catch và trả message phù hợp cho người dùng cuối.
     */
    public String generateAnswer(String prompt) {

        GeminiChatRequest request = new GeminiChatRequest(prompt);

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-goog-api-key", apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<GeminiChatRequest> entity = new HttpEntity<>(request, headers);

        ResponseEntity<GeminiChatResponse> response =
                restTemplate.postForEntity(chatUrl, entity, GeminiChatResponse.class);

        GeminiChatResponse body = response.getBody();

        // "candidates" rỗng/null có thể do lỗi thật SỰ hoặc do Gemini chặn
        // câu trả lời vì safety filter - cả 2 trường hợp đều throw để tầng
        // gọi (RetrievalService) tự quyết định cách xử lý cho user
        if (body == null || isEmpty(body.getCandidates())) {
            throw new IllegalStateException(
                    "Gemini Chat API không trả về candidate nào (có thể bị chặn bởi safety filter).");
        }

        GeminiChatResponse.Content content = body.getCandidates().get(0).getContent();
        if (content == null || isEmpty(content.getParts())) {
            throw new IllegalStateException("Gemini Chat API trả về candidate rỗng nội dung.");
        }

        return content.getParts().get(0).getText();
    }

    private boolean isEmpty(List<?> list) {
        return list == null || list.isEmpty();
    }
}

/*
 * ===============================================================
 *                FLOW CỦA GEMINI CHAT SERVICE
 * ===============================================================
 *
 * PromptBuilder.build(question, results)
 *            │  (trả về String prompt hoàn chỉnh)
 *            ▼
 * GeminiChatService.generateAnswer(prompt)
 *            │
 *            ▼
 * GeminiChatRequest(prompt)
 *            │
 *            ▼
 * RestTemplate.postForEntity(chatUrl, ...)
 *            │
 *            ▼
 * Google Gemini Chat API (gemini-2.5-flash-lite)
 *            │
 *            ▼
 * GeminiChatResponse
 *      candidates[0].content.parts[0].text
 *            │
 *            ▼
 * String answer
 *            │
 *            ▼
 * RetrievalService (Milestone 3) — ghép vào ChatAnswerResponse
 *
 * ===============================================================
 */