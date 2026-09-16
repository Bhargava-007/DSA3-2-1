package com.resolve.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlgorithmCountersResponse {
    private Long kmpPatternSearches;
    private Long rabinKarpHashComparisons;
    private Long levenshteinDpOperations;
    private Long suffixArrayCandidateBlocks;
    private Long unionFindClusterMerges;
}
