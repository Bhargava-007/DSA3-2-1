package com.resolve.controller;

import com.resolve.dto.DatasetResponse;
import com.resolve.model.Dataset;
import com.resolve.repository.DatasetRepository;
import com.resolve.service.CsvIngestionService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/datasets")
@RequiredArgsConstructor
public class DatasetController {

    private final CsvIngestionService csvIngestionService;
    private final DatasetRepository datasetRepository;

    @PersistenceContext
    private final EntityManager entityManager;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @CacheEvict(value = {"datasets", "stats"}, allEntries = true)
    public ResponseEntity<DatasetResponse> uploadDataset(@RequestParam("file") MultipartFile file) {
        try {
            Dataset dataset = csvIngestionService.ingestCsv(file);
            return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(dataset));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid CSV upload: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Failed to process CSV file upload: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    @Cacheable(value = "datasets", key = "'all'")
    public ResponseEntity<List<DatasetResponse>> getAllDatasets() {
        List<Dataset> datasets = datasetRepository.findAllByOrderByUploadedAtDesc();
        List<DatasetResponse> responses = datasets.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DatasetResponse> getDatasetById(@PathVariable Long id) {
        return datasetRepository.findById(id)
                .map(d -> ResponseEntity.ok(toResponse(d)))
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    @CacheEvict(value = {"datasets", "stats", "clusters", "runs"}, allEntries = true)
    public ResponseEntity<Void> deleteDataset(@PathVariable Long id) {
        if (!datasetRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        long start = System.currentTimeMillis();

        // 1. Delete cluster members belonging to clusters of runs for this dataset or referencing products of this dataset
        entityManager.createNativeQuery(
            "DELETE FROM cluster_members WHERE product_id IN (SELECT id FROM products WHERE dataset_id = :dId) " +
            "OR cluster_id IN (SELECT id FROM entity_clusters WHERE pipeline_run_id IN (SELECT id FROM pipeline_runs WHERE dataset_id = :dId))"
        ).setParameter("dId", id).executeUpdate();

        // 2. Delete clusters of runs for this dataset
        entityManager.createNativeQuery(
            "DELETE FROM entity_clusters WHERE pipeline_run_id IN (SELECT id FROM pipeline_runs WHERE dataset_id = :dId)"
        ).setParameter("dId", id).executeUpdate();

        // 3. Delete candidate pairs involving products of this dataset or runs of this dataset
        entityManager.createNativeQuery(
            "DELETE FROM candidate_pairs WHERE pipeline_run_id IN (SELECT id FROM pipeline_runs WHERE dataset_id = :dId) " +
            "OR product_a_id IN (SELECT id FROM products WHERE dataset_id = :dId) " +
            "OR product_b_id IN (SELECT id FROM products WHERE dataset_id = :dId)"
        ).setParameter("dId", id).executeUpdate();

        // 4. Delete pipeline runs specifically bound to this dataset
        entityManager.createNativeQuery(
            "DELETE FROM pipeline_runs WHERE dataset_id = :dId"
        ).setParameter("dId", id).executeUpdate();

        // 5. Delete products of this dataset
        entityManager.createNativeQuery(
            "DELETE FROM products WHERE dataset_id = :dId"
        ).setParameter("dId", id).executeUpdate();

        // 6. Delete dataset record
        entityManager.createNativeQuery(
            "DELETE FROM datasets WHERE id = :dId"
        ).setParameter("dId", id).executeUpdate();

        long elapsed = System.currentTimeMillis() - start;
        log.info("[DATASET] Successfully deleted dataset {} and all associated entities in {}ms", id, elapsed);
        return ResponseEntity.noContent().build();
    }

    private DatasetResponse toResponse(Dataset dataset) {
        return DatasetResponse.builder()
                .id(dataset.getId())
                .datasetId(dataset.getId())
                .filename(dataset.getFilename())
                .recordCount(dataset.getRecordCount())
                .fileSizeMb(dataset.getFileSizeMb())
                .status(dataset.getStatus())
                .uploadedAt(dataset.getUploadedAt())
                .completedAt(dataset.getCompletedAt())
                .build();
    }
}
