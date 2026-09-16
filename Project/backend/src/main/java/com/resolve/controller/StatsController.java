package com.resolve.controller;

import com.resolve.dto.AlgorithmCountersResponse;
import com.resolve.dto.StatsOverviewResponse;
import com.resolve.model.PipelineRun;
import com.resolve.repository.EntityClusterRepository;
import com.resolve.repository.PipelineRunRepository;
import com.resolve.repository.ProductRepository;
import com.resolve.service.algorithm.AlgorithmMetricsTracker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/stats")
@RequiredArgsConstructor
public class StatsController {

    private final PipelineRunRepository pipelineRunRepository;
    private final ProductRepository productRepository;
    private final EntityClusterRepository entityClusterRepository;
    private final AlgorithmMetricsTracker metricsTracker;

    @GetMapping("/overview")
    public ResponseEntity<StatsOverviewResponse> getOverviewStats() {
        // Fetch all completed pipeline runs sorted by most recent
        List<PipelineRun> completedRuns = pipelineRunRepository.findAll().stream()
                .filter(r -> "COMPLETE".equalsIgnoreCase(r.getStatus()))
                .sorted((a, b) -> {
                    if (a.getCompletedAt() != null && b.getCompletedAt() != null) {
                        return b.getCompletedAt().compareTo(a.getCompletedAt());
                    }
                    return b.getId().compareTo(a.getId());
                })
                .collect(Collectors.toList());

        long totalProductsInDb = productRepository.count();

        if (completedRuns.isEmpty()) {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                    .body(StatsOverviewResponse.builder()
                            .totalListings(totalProductsInDb > 0 ? totalProductsInDb : 0L)
                            .totalResolvedEntities(0L)
                            .averageMatchConfidence(0.0)
                            .averageComparisonReduction(0.0)
                            .build());
        }

        // Use the latest completed run as the primary benchmark
        PipelineRun latestRun = completedRuns.get(0);

        long totalListings = latestRun.getInputRecords() != null && latestRun.getInputRecords() > 0
                ? latestRun.getInputRecords()
                : totalProductsInDb;

        long totalEntities = latestRun.getEntitiesFormed() != null
                ? latestRun.getEntitiesFormed()
                : entityClusterRepository.count();

        double avgConfidence = latestRun.getMatchConfidence() != null
                ? latestRun.getMatchConfidence().doubleValue()
                : completedRuns.stream()
                        .filter(r -> r.getMatchConfidence() != null)
                        .mapToDouble(r -> r.getMatchConfidence().doubleValue())
                        .average()
                        .orElse(0.0);

        double avgReduction = latestRun.getComparisonReduction() != null
                ? latestRun.getComparisonReduction().doubleValue()
                : completedRuns.stream()
                        .filter(r -> r.getComparisonReduction() != null)
                        .mapToDouble(r -> r.getComparisonReduction().doubleValue())
                        .average()
                        .orElse(0.0);

        StatsOverviewResponse response = StatsOverviewResponse.builder()
                .totalListings(totalListings)
                .totalResolvedEntities(totalEntities)
                .averageMatchConfidence(BigDecimal.valueOf(avgConfidence).setScale(1, RoundingMode.HALF_UP).doubleValue())
                .averageComparisonReduction(BigDecimal.valueOf(avgReduction).setScale(1, RoundingMode.HALF_UP).doubleValue())
                .build();

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                .body(response);
    }

    @GetMapping("/algorithms")
    public ResponseEntity<AlgorithmCountersResponse> getAlgorithmCounters() {
        AlgorithmCountersResponse response = AlgorithmCountersResponse.builder()
                .kmpPatternSearches(metricsTracker.getKmpSearches())
                .rabinKarpHashComparisons(metricsTracker.getRabinKarpComparisons())
                .levenshteinDpOperations(metricsTracker.getLevenshteinOperations())
                .suffixArrayCandidateBlocks(metricsTracker.getSuffixArrayBlocks())
                .unionFindClusterMerges(metricsTracker.getUnionFindMerges())
                .build();

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                .body(response);
    }
}
