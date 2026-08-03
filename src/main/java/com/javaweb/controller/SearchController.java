package com.javaweb.controller;

import com.javaweb.dto.response.search.GlobalSearchResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/search", "/api/user"})
public class SearchController {

    @Autowired
    private SearchService searchService;

    @GetMapping({"", "/search"})
    public ResponseEntity<GlobalSearchResponse> searchGlobal(
            @RequestParam("q") String query,
            Authentication authentication) {
            
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        UsersEntity currentUser = userDetails.getUser();

        GlobalSearchResponse response = searchService.searchGlobal(query, currentUser);
        return ResponseEntity.ok(response);
    }
}
