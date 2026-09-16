package com.resolve.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimilarityTestResponse {
    private double kmp;
    private double rabinKarp;
    private double levenshtein;
    private double jaccard;
    private double weighted;
}
