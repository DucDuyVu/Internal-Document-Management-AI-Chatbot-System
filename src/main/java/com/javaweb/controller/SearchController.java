package com.javaweb.controller;

import com.javaweb.dto.response.search.GlobalSearchResponse;
import com.javaweb.entity.UsersEntity;
import com.javaweb.security.CustomUserDetails;
import com.javaweb.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.javaweb.dto.response.search.AiSearchDto;
import java.util.List;
import java.util.Map;

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

    @PostMapping({"", "/search"})
    public ResponseEntity<GlobalSearchResponse> searchGlobalPost(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        String query = request.get("query");
        if (query == null) {
            query = request.get("q");
        }
        return searchGlobal(query != null ? query : "", authentication);
    }

    @GetMapping("/ai")
    public ResponseEntity<List<AiSearchDto>> searchAi(
            @RequestParam("q") String query,
            Authentication authentication) {
            
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        UsersEntity currentUser = userDetails.getUser();

        List<AiSearchDto> response = searchService.searchAi(query, currentUser);
        return ResponseEntity.ok(response);
    }
}
