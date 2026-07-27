package com.javaweb.service;

import com.javaweb.dto.response.search.GlobalSearchResponse;
import com.javaweb.entity.UsersEntity;

public interface SearchService {
    GlobalSearchResponse searchGlobal(String query, UsersEntity currentUser);
}
