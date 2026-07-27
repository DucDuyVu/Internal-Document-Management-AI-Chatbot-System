package com.javaweb.dto.response.search;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlobalSearchResponse {
    private List<SearchDocumentDto> documents;
    private List<SearchUserDto> users;
}
