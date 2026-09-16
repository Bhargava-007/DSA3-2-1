package com.resolve.controller;

import com.resolve.model.CandidatePair;
import com.resolve.model.EntityCluster;
import com.resolve.repository.CandidatePairRepository;
import com.resolve.repository.EntityClusterRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/export")
@RequiredArgsConstructor
public class ExportController {

    private final EntityClusterRepository entityClusterRepository;
    private final CandidatePairRepository candidatePairRepository;

    @GetMapping("/clusters/{runId}")
    public void exportClustersCsv(@PathVariable Long runId, HttpServletResponse response) throws IOException {
        List<EntityCluster> clusters = entityClusterRepository.findByPipelineRunId(runId);

        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"clusters_" + runId + ".csv\"");

        try (OutputStreamWriter writer = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8);
             CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT.builder()
                     .setHeader("cluster_id", "canonical_title", "canonical_brand", "listing_count", "source_count", "confidence")
                     .build())) {

            for (EntityCluster cluster : clusters) {
                csvPrinter.printRecord(
                        cluster.getId(),
                        cluster.getCanonicalTitle(),
                        cluster.getCanonicalBrand(),
                        cluster.getListingCount(),
                        cluster.getSourceCount(),
                        cluster.getConfidence()
                );
            }
            csvPrinter.flush();
        } catch (Exception e) {
            log.error("Failed to export clusters CSV for run {}: {}", runId, e.getMessage(), e);
            response.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
        }
    }

    @GetMapping("/pairs/{runId}")
    public void exportPairsCsv(@PathVariable Long runId, HttpServletResponse response) throws IOException {
        List<CandidatePair> pairs = candidatePairRepository.findByPipelineRunIdAndFinalScoreGreaterThanEqual(
                runId, BigDecimal.valueOf(0.45));

        response.setContentType("text/csv; charset=UTF-8");
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"pairs_" + runId + ".csv\"");

        try (OutputStreamWriter writer = new OutputStreamWriter(response.getOutputStream(), StandardCharsets.UTF_8);
             CSVPrinter csvPrinter = new CSVPrinter(writer, CSVFormat.DEFAULT.builder()
                     .setHeader("pair_id", "product_a_id", "product_b_id", "title_similarity", "description_jaccard",
                             "levenshtein_distance", "brand_match", "model_match", "final_score", "is_match")
                     .build())) {

            for (CandidatePair pair : pairs) {
                csvPrinter.printRecord(
                        pair.getId(),
                        pair.getProductAId(),
                        pair.getProductBId(),
                        pair.getTitleSimilarity(),
                        pair.getDescriptionJaccard(),
                        pair.getLevenshteinDistance(),
                        pair.getBrandMatch(),
                        pair.getModelMatch(),
                        pair.getFinalScore(),
                        pair.getIsMatch()
                );
            }
            csvPrinter.flush();
        } catch (Exception e) {
            log.error("Failed to export pairs CSV for run {}: {}", runId, e.getMessage(), e);
            response.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
        }
    }
}
