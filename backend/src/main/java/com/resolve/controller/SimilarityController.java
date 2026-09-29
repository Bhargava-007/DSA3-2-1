package com.resolve.controller;

import com.resolve.dto.SimilarityTestRequest;
import com.resolve.dto.SimilarityTestResponse;
import com.resolve.service.algorithm.SimilarityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/similarity")
@RequiredArgsConstructor
public class SimilarityController {

    private final SimilarityService similarityService;

    @PostMapping("/test")
    public ResponseEntity<SimilarityTestResponse> testSimilarity(@RequestBody SimilarityTestRequest request) {
        String titleA = request != null ? request.getTitleA() : "";
        String titleB = request != null ? request.getTitleB() : "";

        Map<String, Double> scores = similarityService.testSimilarity(titleA, titleB);

        SimilarityTestResponse response = SimilarityTestResponse.builder()
                .kmp(scores.getOrDefault("kmp", 0.0))
                .rabinKarp(scores.getOrDefault("rabinKarp", 0.0))
                .levenshtein(scores.getOrDefault("levenshtein", 0.0))
                .jaccard(scores.getOrDefault("jaccard", 0.0))
                .weighted(scores.getOrDefault("weighted", 0.0))
                .build();

        return ResponseEntity.ok(response);
    }
}
