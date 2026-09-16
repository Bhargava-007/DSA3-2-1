package com.resolve.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidatePairResponse {
    private Long id;
    private Long productAId;
    private Long productBId;
    private ProductDetail productA;
    private ProductDetail productB;
    private BigDecimal titleSimilarity;
    private BigDecimal descriptionJaccard;
    private Integer levenshteinDistance;
    private Boolean brandMatch;
    private Boolean modelMatch;
    private BigDecimal finalScore;
    private Boolean isMatch;
}
