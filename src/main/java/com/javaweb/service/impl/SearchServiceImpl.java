package com.javaweb.service.impl;

import com.javaweb.dto.response.search.GlobalSearchResponse;
import com.javaweb.dto.response.search.SearchDocumentDto;
import com.javaweb.dto.response.search.SearchUserDto;
import com.javaweb.entity.DocumentEntity;
import com.javaweb.entity.UsersEntity;
import com.javaweb.enums.UserRole;
import com.javaweb.repository.DocumentRepository;
import com.javaweb.repository.UsersRepository;
import com.javaweb.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

import com.javaweb.rag.embedding.EmbeddingService;
import com.javaweb.repository.DocumentChunkRepository;
import com.javaweb.rag.retrieval.SearchResult;
import com.javaweb.entity.DocumentChunkEntity;
import com.javaweb.dto.response.search.AiSearchDto;
import com.javaweb.utils.VectorUtils;

@Service
public class SearchServiceImpl implements SearchService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private EmbeddingService embeddingService;

    @Autowired
    private DocumentChunkRepository documentChunkRepository;

    @Autowired
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Override
    public GlobalSearchResponse searchGlobal(String query, UsersEntity currentUser) {
        if (currentUser != null) {
            java.util.Map<String, Object> meta = new java.util.HashMap<>();
            meta.put("query", query);
            meta.put("searchType", "GLOBAL");
            eventPublisher.publishEvent(new com.event.AuditEven(currentUser.getId(), com.javaweb.entity.enums.ActionType.SEARCH, "GLOBAL_SEARCH", 0L, meta));
        }

        Pageable top5 = PageRequest.of(0, 5); // Limit to top 5 results

        // 1. Search Documents
        Page<DocumentEntity> documentEntities;
        if (currentUser.getRole() == UserRole.ADMIN) {
            documentEntities = documentRepository.searchAll(query, top5);
        } else {
            Integer deptId = null;
            Long deptIdLong = null;
            if (currentUser.getDepartment() != null && currentUser.getDepartment().getId() != null) {
                deptId = currentUser.getDepartment().getId().intValue();
                deptIdLong = currentUser.getDepartment().getId();
            }
            boolean isManager = currentUser.getRole().name().equals("MANAGER");
            documentEntities = documentRepository.searchVisibleToDepartmentWithPermissions(deptId, deptIdLong,
                    currentUser.getId(), isManager, query, top5);
        }

        List<SearchDocumentDto> documents = documentEntities.getContent().stream()
                .map(doc -> {
                    String extension = "";
                    if (doc.getFileName() != null && doc.getFileName().contains(".")) {
                        extension = doc.getFileName().substring(doc.getFileName().lastIndexOf(".") + 1).toLowerCase();
                    }

                    String icon = getFileIcon(extension);
                    String color = getIconColor(extension);
                    String bg = getIconBg(extension);

                    String meta = "Tài liệu";
                    if (doc.getDepartmentId() != null) {
                        meta = "Phòng ban"; // Note: could fetch department name if needed, but keeping it simple
                    }

                    return SearchDocumentDto.builder()
                            .id(doc.getId())
                            .title(doc.getFileName())
                            .meta(meta)
                            .icon(icon)
                            .color(color)
                            .bg(bg)
                            .build();
                })
                .collect(Collectors.toList());

        // 2. Search Users
        Page<UsersEntity> userEntities = usersRepository.searchUsers(query, null, null, null, top5);
        List<SearchUserDto> users = userEntities.getContent().stream()
                .map(user -> {
                    String meta = user.getRole() == UserRole.ADMIN ? "Quản trị viên" : "Nhân viên";
                    return SearchUserDto.builder()
                            .id(user.getId())
                            .title(user.getFullName())
                            .meta(meta)
                            .icon(user.getRole() == UserRole.ADMIN ? "fa-user-tie" : "fa-user")
                            .color("#059669")
                            .bg("#d1fae5")
                            .avatarUrl(user.getAvatarURL())
                            .build();
                })
                .collect(Collectors.toList());

        return GlobalSearchResponse.builder()
                .documents(documents)
                .users(users)
                .build();
    }

    private String getFileIcon(String extension) {
        return switch (extension) {
            case "pdf" -> "fa-file-pdf";
            case "doc", "docx" -> "fa-file-word";
            case "xls", "xlsx" -> "fa-file-excel";
            case "ppt", "pptx" -> "fa-file-powerpoint";
            case "png", "jpg", "jpeg", "gif", "webp" -> "fa-file-image";
            case "zip", "rar", "7z" -> "fa-file-zipper";
            case "csv" -> "fa-file-csv";
            case "txt" -> "fa-file-lines";
            default -> "fa-file";
        };
    }

    private String getIconColor(String extension) {
        return switch (extension) {
            case "pdf" -> "#e11d48";
            case "doc", "docx" -> "#2563eb";
            case "xls", "xlsx", "csv" -> "#16a34a";
            case "ppt", "pptx" -> "#d97706";
            case "png", "jpg", "jpeg", "gif", "webp" -> "#0891b2";
            case "zip", "rar", "7z" -> "#4f46e5";
            default -> "#64748b";
        };
    }

    private String getIconBg(String extension) {
        return switch (extension) {
            case "pdf" -> "#ffe4e6";
            case "doc", "docx" -> "#dbeafe";
            case "xls", "xlsx", "csv" -> "#dcfce7";
            case "ppt", "pptx" -> "#fef3c7";
            case "png", "jpg", "jpeg", "gif", "webp" -> "#cffafe";
            case "zip", "rar", "7z" -> "#e0e7ff";
            default -> "#f1f5f9";
        };
    }

    @Override
    public List<AiSearchDto> searchAi(String query, UsersEntity currentUser) {
        if (currentUser != null) {
            java.util.Map<String, Object> meta = new java.util.HashMap<>();
            meta.put("query", query);
            meta.put("searchType", "AI");
            eventPublisher.publishEvent(new com.event.AuditEven(currentUser.getId(), com.javaweb.entity.enums.ActionType.SEARCH, "AI_SEARCH", 0L, meta));
        }

        Integer deptId = null;
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getDepartment() != null) {
            deptId = currentUser.getDepartment().getId().intValue();
        }

        // 1. Chuyển đổi câu hỏi thành Vector (Embedding)
        float[] queryEmbedding = embeddingService.embedQuery(query);
        String embeddingText = VectorUtils.toPgVectorString(queryEmbedding);

        // 2. Tìm kiếm Vector bằng pgvector
        int topK = 10;
        List<SearchResult> results = documentChunkRepository.searchSimilarChunks(embeddingText, deptId, topK);
        
        // 3. Lọc bỏ các kết quả có khoảng cách (distance) lớn hơn ngưỡng (ví dụ: 0.5)
        double threshold = 0.5;
        results.removeIf(r -> r.distance() > threshold);

        // 4. Ánh xạ kết quả sang DTO trả về cho Frontend
        return results.stream().map(r -> {
            DocumentChunkEntity chunk = r.chunk();
            DocumentEntity doc = documentRepository.findById(chunk.getDocumentId()).orElse(null);
            
            String fileType = "unknown";
            String departmentName = "Phòng ban";
            String createdAt = "";
            
            if (doc != null) {
                fileType = doc.getFileType() != null ? doc.getFileType() : "pdf";
                if (doc.getDepartmentId() != null) {
                    departmentName = "Phòng ban";
                } else {
                    departmentName = "Chung";
                }
                createdAt = doc.getCreatedAt() != null ? doc.getCreatedAt().toString() : "";
            }
            
            return AiSearchDto.builder()
                .documentId(chunk.getDocumentId())
                .fileName(r.fileName())
                .fileType(fileType)
                .departmentName(departmentName)
                .createdAt(createdAt)
                .excerpt(chunk.getContent() != null ? chunk.getContent().substring(0, Math.min(chunk.getContent().length(), 250)) + "..." : "")
                .score(1.0 - r.distance()) // Chuyển đổi distance thành điểm số (score) tương đồng
                .pageNumber(chunk.getPageNumber() != null ? chunk.getPageNumber() : 1)
                .build();
        }).collect(Collectors.toList());
    }
}
