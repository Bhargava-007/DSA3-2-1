package com.resolve.controller;

import com.resolve.dto.CandidatePairResponse;
import com.resolve.dto.ProductDetail;
import com.resolve.model.CandidatePair;
import com.resolve.model.Product;
import com.resolve.repository.CandidatePairRepository;
import com.resolve.repository.PipelineRunRepository;
import com.resolve.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/matches")
@RequiredArgsConstructor
public class MatchController {

    private final CandidatePairRepository candidatePairRepository;
    private final ProductRepository productRepository;
    private final PipelineRunRepository pipelineRunRepository;

    @GetMapping("/pairs")
    public ResponseEntity<Map<String, Object>> getPairs(
            @RequestParam(name = "runId", required = false) Long runId,
            @RequestParam(name = "minScore", defaultValue = "0.45") BigDecimal minScore,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size) {

        Long targetRunId = runId;
        if (targetRunId == null) {
            var latestRun = pipelineRunRepository.findFirstByStatusOrderByCompletedAtDesc("COMPLETE");
            if (latestRun.isPresent()) {
                targetRunId = latestRun.get().getId();
            } else {
                return ResponseEntity.ok(Map.of(
                        "content", Collections.emptyList(),
                        "totalElements", 0L,
                        "totalPages", 0,
                        "page", page
                ));
            }
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "finalScore"));
        Page<CandidatePair> pairPage = candidatePairRepository.findByPipelineRunIdAndFinalScoreGreaterThanEqual(
                targetRunId, minScore, pageable);

        // Batch load all product details for pairs in page
        Set<Long> productIds = new HashSet<>();
        for (CandidatePair p : pairPage.getContent()) {
            if (p.getProductAId() != null) productIds.add(p.getProductAId());
            if (p.getProductBId() != null) productIds.add(p.getProductBId());
        }

        Map<Long, Product> productMap = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        List<CandidatePairResponse> content = pairPage.getContent().stream()
                .map(pair -> toResponse(pair, productMap.get(pair.getProductAId()), productMap.get(pair.getProductBId())))
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("content", content);
        response.put("totalElements", pairPage.getTotalElements());
        response.put("totalPages", pairPage.getTotalPages());
        response.put("page", pairPage.getNumber());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/pairs/{id}")
    public ResponseEntity<CandidatePairResponse> getPairById(@PathVariable Long id) {
        Optional<CandidatePair> pairOpt = candidatePairRepository.findById(id);
        if (pairOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        CandidatePair pair = pairOpt.get();
        Product prodA = pair.getProductAId() != null ? productRepository.findById(pair.getProductAId()).orElse(null) : null;
        Product prodB = pair.getProductBId() != null ? productRepository.findById(pair.getProductBId()).orElse(null) : null;

        return ResponseEntity.ok(toResponse(pair, prodA, prodB));
    }

    private CandidatePairResponse toResponse(CandidatePair pair, Product prodA, Product prodB) {
        return CandidatePairResponse.builder()
                .id(pair.getId())
                .productAId(pair.getProductAId())
                .productBId(pair.getProductBId())
                .productA(toProductDetail(prodA))
                .productB(toProductDetail(prodB))
                .titleSimilarity(pair.getTitleSimilarity())
                .descriptionJaccard(pair.getDescriptionJaccard())
                .levenshteinDistance(pair.getLevenshteinDistance())
                .brandMatch(pair.getBrandMatch())
                .modelMatch(pair.getModelMatch())
                .finalScore(pair.getFinalScore())
                .isMatch(pair.getIsMatch())
                .build();
    }

    private ProductDetail toProductDetail(Product p) {
        if (p == null) return null;
        return ProductDetail.builder()
                .id(p.getId())
                .externalId(p.getExternalId())
                .title(p.getTitle())
                .description(p.getDescription())
                .brand(p.getBrand())
                .price(p.getPrice())
                .category(p.getCategory())
                .source(p.getSource())
                .build();
    }
}
