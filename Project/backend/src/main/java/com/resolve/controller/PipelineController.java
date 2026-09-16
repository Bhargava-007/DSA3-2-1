package com.resolve.controller;

import com.resolve.dto.PipelineRunResponse;
import com.resolve.dto.PipelineStatusResponse;
import com.resolve.dto.RunPipelineRequest;
import com.resolve.model.Dataset;
import com.resolve.model.PipelineRun;
import com.resolve.repository.DatasetRepository;
import com.resolve.repository.PipelineRunRepository;
import com.resolve.service.algorithm.AlgorithmPipelineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/pipeline")
@RequiredArgsConstructor
public class PipelineController {

    private final AlgorithmPipelineService algorithmPipelineService;
    private final PipelineRunRepository pipelineRunRepository;
    private final DatasetRepository datasetRepository;

    @PostMapping("/run")
    @CacheEvict(value = {"clusters", "stats", "runs"}, allEntries = true)
    public ResponseEntity<?> startPipelineRun(@RequestBody(required = false) RunPipelineRequest request) {
        List<Dataset> allDatasets = datasetRepository.findAll();
        if (allDatasets.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No catalog datasets found. Please upload a CSV first."));
        }

        Long datasetId = request != null ? request.getDatasetId() : null;
        PipelineRun run;

        if (datasetId != null) {
            Dataset dataset = datasetRepository.findById(datasetId).orElse(null);
            if (dataset == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Dataset with ID " + datasetId + " not found"));
            }
            run = PipelineRun.builder()
                    .datasetId(dataset.getId())
                    .scope("SINGLE_DATASET")
                    .datasetCount(1)
                    .datasetFilename(dataset.getFilename())
                    .status("PENDING")
                    .stage("INITIALIZING")
                    .inputRecords(dataset.getRecordCount())
                    .startedAt(LocalDateTime.now())
                    .build();
        } else {
            // Default: Cross-dataset resolution across ALL datasets
            long totalRecords = allDatasets.stream()
                    .mapToLong(d -> d.getRecordCount() != null ? d.getRecordCount() : 0L)
                    .sum();

            run = PipelineRun.builder()
                    .datasetId(null)
                    .scope("ALL_DATASETS")
                    .datasetCount(allDatasets.size())
                    .datasetFilename("All Datasets (" + allDatasets.size() + ")")
                    .status("PENDING")
                    .stage("INITIALIZING")
                    .inputRecords(totalRecords)
                    .startedAt(LocalDateTime.now())
                    .build();
        }

        run = pipelineRunRepository.save(run);

        // Asynchronously execute pipeline
        algorithmPipelineService.executePipelineAsync(run.getId());

        Map<String, Object> response = new HashMap<>();
        response.put("runId", run.getId());
        response.put("status", "PENDING");
        response.put("message", "Pipeline started for " + run.getDatasetFilename());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/runs")
    public ResponseEntity<List<PipelineRunResponse>> getAllRuns() {
        List<PipelineRun> runs = pipelineRunRepository.findAllByOrderByStartedAtDesc();
        List<PipelineRunResponse> responses = runs.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                .body(responses);
    }

    @GetMapping("/runs/{id}")
    public ResponseEntity<PipelineRunResponse> getRunById(@PathVariable Long id) {
        return pipelineRunRepository.findById(id)
                .map(run -> ResponseEntity.ok()
                        .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                        .body(toResponse(run)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/runs/{id}/status")
    public ResponseEntity<PipelineStatusResponse> getRunStatus(@PathVariable Long id) {
        return pipelineRunRepository.findById(id)
                .map(run -> {
                    int progress = calculateProgress(run.getStatus(), run.getStage());
                    PipelineStatusResponse res = PipelineStatusResponse.builder()
                            .runId(run.getId())
                            .status(run.getStatus())
                            .stage(run.getStage())
                            .progressPct(progress)
                            .message("Run is currently at " + run.getStage())
                            .build();
                    return ResponseEntity.ok()
                            .cacheControl(CacheControl.noCache().noStore().mustRevalidate())
                            .body(res);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private int calculateProgress(String status, String stage) {
        if ("COMPLETE".equalsIgnoreCase(status)) return 100;
        if ("FAILED".equalsIgnoreCase(status)) return 0;
        if (stage == null) return 10;

        switch (stage.toUpperCase()) {
            case "TOKENIZATION":
                return 20;
            case "CANDIDATE_BLOCKING":
                return 45;
            case "SIMILARITY_SCORING":
                return 70;
            case "CLUSTERING":
                return 90;
            case "FINALIZING":
                return 95;
            case "INITIALIZING":
            case "PENDING":
            default:
                return 10;
        }
    }

    private PipelineRunResponse toResponse(PipelineRun run) {
        return PipelineRunResponse.builder()
                .id(run.getId())
                .datasetId(run.getDatasetId())
                .scope(run.getScope() != null ? run.getScope() : "ALL_DATASETS")
                .datasetCount(run.getDatasetCount() != null ? run.getDatasetCount() : 1)
                .datasetFilename(run.getDatasetFilename())
                .status(run.getStatus())
                .stage(run.getStage())
                .inputRecords(run.getInputRecords())
                .entitiesFormed(run.getEntitiesFormed())
                .matchConfidence(run.getMatchConfidence())
                .comparisonReduction(run.getComparisonReduction())
                .durationMs(run.getDurationMs())
                .startedAt(run.getStartedAt())
                .completedAt(run.getCompletedAt())
                .build();
    }
}
