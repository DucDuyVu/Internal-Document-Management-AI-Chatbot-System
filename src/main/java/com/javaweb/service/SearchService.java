package com.javaweb.service;

import com.javaweb.dto.response.search.GlobalSearchResponse;
import com.javaweb.dto.response.search.AiSearchDto;
import com.javaweb.entity.UsersEntity;
import java.util.List;

public interface SearchService {
    GlobalSearchResponse searchGlobal(String query, UsersEntity currentUser);
    List<AiSearchDto> searchAi(String query, UsersEntity currentUser);
}
