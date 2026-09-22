package com.resolve.service.algorithm;

import com.resolve.model.*;
import com.resolve.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlgorithmPipelineService {

    private final PipelineRunRepository pipelineRunRepository;
    private final DatasetRepository datasetRepository;
    private final ProductRepository productRepository;
    private final TokenizerService tokenizerService;
    private final BlockingService blockingService;
    private final SimilarityService similarityService;
    private final ClusteringService clusteringService;
    private final AlgorithmMetricsTracker metricsTracker;
    private final org.springframework.cache.CacheManager cacheManager;

    /**
     * Executes the 5-stage algorithm pipeline asynchronously without blocking HTTP requests.
     */
    @Async("pipelineTaskExecutor")
    public void executePipelineAsync(Long runId) {
        log.info("Starting asynchronous pipeline execution for runId: {}", runId);
        long startTime = System.currentTimeMillis();

        PipelineRun run = pipelineRunRepository.findById(runId).orElse(null);
        if (run == null) {
            log.error("Pipeline run {} not found. Aborting execution.", runId);
            return;
        }

        List<Dataset> datasets;
        List<Product> products;

        if (run.getDatasetId() != null) {
            Dataset single = datasetRepository.findById(run.getDatasetId()).orElse(null);
            if (single == null) {
                log.error("Dataset {} for pipeline run {} not found. Aborting.", run.getDatasetId(), runId);
                run.setStatus("FAILED");
                run.setStage("FAILED: Dataset not found");
                run.setCompletedAt(LocalDateTime.now());
                pipelineRunRepository.save(run);
                return;
            }
            datasets = List.of(single);
            products = productRepository.findByDatasetId(single.getId());
        } else {
            datasets = datasetRepository.findAll();
            products = productRepository.findAll();
            log.info("[PIPELINE] Loaded {} products from {} datasets for cross-dataset resolution",
                    products.size(), datasets.size());
        }

        // Reset algorithm metrics tracker for this run
        metricsTracker.reset();

        try {
            // Update initial RUNNING state
            run.setStatus("RUNNING");
            run.setStage("TOKENIZATION");
            run.setStartedAt(LocalDateTime.now());
            pipelineRunRepository.save(run);

            for (Dataset d : datasets) {
                d.setStatus("PROCESSING");
                datasetRepository.save(d);
            }

            if (products.isEmpty()) {
                log.warn("No products found in datasets");
                run.setInputRecords(0L);
                run.setEntitiesFormed(0L);
                run.setMatchConfidence(BigDecimal.valueOf(100.00).setScale(2, RoundingMode.HALF_UP));
                run.setComparisonReduction(BigDecimal.valueOf(100.00).setScale(2, RoundingMode.HALF_UP));
                run.setStatus("COMPLETE");
                run.setStage("COMPLETE");
                run.setDurationMs(System.currentTimeMillis() - startTime);
                run.setCompletedAt(LocalDateTime.now());
                pipelineRunRepository.save(run);

                for (Dataset d : datasets) {
                    d.setStatus("COMPLETE");
                    d.setCompletedAt(LocalDateTime.now());
                    datasetRepository.save(d);
                }
                evictAllCaches();
                return;
            }

            run.setInputRecords((long) products.size());
            pipelineRunRepository.save(run);

            // ==========================================
            // STAGE 1 — TOKENIZATION & TRIE INDEXING
            // ==========================================
            log.info("Run {}: Executing Stage 1 - TOKENIZATION ({} products)", runId, products.size());
            run.setStage("TOKENIZATION");
            pipelineRunRepository.save(run);

            Map<Long, List<String>> productTokens = tokenizerService.tokenizeProducts(products);

            // ==========================================
            // STAGE 2 — CANDIDATE BLOCKING (Suffix Array + Inverted Index)
            // ==========================================
            log.info("Run {}: Executing Stage 2 - CANDIDATE_BLOCKING", runId);
            run.setStage("CANDIDATE_BLOCKING");
            pipelineRunRepository.save(run);

            List<CandidatePair> candidatePairs = blockingService.generateCandidateBlocks(runId, products, productTokens);

            // Calculate comparison reduction ratio
            long n = products.size();
            long totalPossiblePairs = (n * (n - 1)) / 2;
            double reductionRatio;
            if (totalPossiblePairs > 0) {
                reductionRatio = (1.0 - ((double) candidatePairs.size() / (double) totalPossiblePairs)) * 100.0;
                if (reductionRatio < 0.0) reductionRatio = 0.0;
            } else {
                reductionRatio = 100.0;
            }

            BigDecimal compReduction = BigDecimal.valueOf(reductionRatio).setScale(2, RoundingMode.HALF_UP);
            run.setComparisonReduction(compReduction);
            pipelineRunRepository.save(run);

            // ==========================================
            // STAGE 3 — SIMILARITY SCORING (KMP, Rabin-Karp, Levenshtein, Jaccard)
            // ==========================================
            log.info("Run {}: Executing Stage 3 - SIMILARITY_SCORING ({} candidate pairs)", runId, candidatePairs.size());
            run.setStage("SIMILARITY_SCORING");
            pipelineRunRepository.save(run);

            List<CandidatePair> scoredPairs = similarityService.scoreCandidatePairs(candidatePairs, products);

            // ==========================================
            // STAGE 4 — CLUSTERING (Union-Find DSU)
            // ==========================================
            log.info("Run {}: Executing Stage 4 - CLUSTERING", runId);
            run.setStage("CLUSTERING");
            pipelineRunRepository.save(run);

            List<EntityCluster> formedClusters = clusteringService.formClusters(runId, products, scoredPairs);

            // ==========================================
            // STAGE 5 — FINALIZE
            // ==========================================
            log.info("Run {}: Executing Stage 5 - FINALIZE", runId);
            run.setStage("FINALIZING");
            pipelineRunRepository.save(run);

            BigDecimal avgConfidence;
            if (!formedClusters.isEmpty()) {
                BigDecimal sumConf = formedClusters.stream()
                        .map(c -> c.getConfidence() != null ? c.getConfidence() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal avg = sumConf.divide(BigDecimal.valueOf(formedClusters.size()), 4, RoundingMode.HALF_UP);
                avgConfidence = avg.multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
            } else {
                avgConfidence = BigDecimal.valueOf(100.00).setScale(2, RoundingMode.HALF_UP);
            }

            long duration = System.currentTimeMillis() - startTime;
            long candidateCount = candidatePairs.size();
            long matchCount = scoredPairs.stream()
                    .filter(p -> p.getFinalScore() != null && p.getFinalScore().doubleValue() >= SimilarityService.SIMILARITY_THRESHOLD)
                    .count();
            long clusterCount = formedClusters.size();
            double durationSec = duration / 1000.0;

            run.setEntitiesFormed((long) formedClusters.size());
            run.setMatchConfidence(avgConfidence);
            run.setDurationMs(duration);
            run.setStatus("COMPLETE");
            run.setStage("COMPLETE");
            run.setCompletedAt(LocalDateTime.now());
            pipelineRunRepository.save(run);

            for (Dataset d : datasets) {
                d.setStatus("COMPLETE");
                d.setCompletedAt(LocalDateTime.now());
                datasetRepository.save(d);
            }

            evictAllCaches();

            log.info("Pipeline run {} successfully COMPLETED in {}ms. Formed {} entities.",
                    runId, duration, formedClusters.size());

            // Log clean ASCII summary box
            log.info("\n" +
                     "=========================================\n" +
                     "  PIPELINE RUN #{}\n" +
                     "  Input:      {} products\n" +
                     "  Candidates: {} pairs blocked\n" +
                     "  Matches:    {} above threshold\n" +
                     "  Clusters:   {} resolved entities\n" +
                     "  Duration:   {}\n" +
                     "=========================================",
                    runId + " COMPLETE",
                    products.size(),
                    candidateCount,
                    matchCount,
                    clusterCount,
                    String.format(java.util.Locale.US, "%.1fs", durationSec));

        } catch (Exception e) {
            log.error("Pipeline run {} FAILED at stage {}: {}", runId, run.getStage(), e.getMessage(), e);
            run.setStatus("FAILED");
            run.setStage("FAILED: " + (e.getMessage() != null ? e.getMessage() : "Unexpected error"));
            run.setDurationMs(System.currentTimeMillis() - startTime);
            run.setCompletedAt(LocalDateTime.now());
            pipelineRunRepository.save(run);

            for (Dataset d : datasets) {
                d.setStatus("FAILED");
                datasetRepository.save(d);
            }
            evictAllCaches();
        }
    }

    private void evictAllCaches() {
        if (cacheManager != null) {
            cacheManager.getCacheNames().forEach(name -> {
                var c = cacheManager.getCache(name);
                if (c != null) {
                    c.clear();
                }
            });
        }
    }
}
