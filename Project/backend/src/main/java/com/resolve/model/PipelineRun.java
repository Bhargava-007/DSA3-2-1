package com.resolve.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pipeline_runs", indexes = {
    @Index(name = "idx_run_dataset", columnList = "dataset_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PipelineRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dataset_id")
    private Long datasetId;

    @Column(name = "scope", length = 50)
    private String scope; // ALL_DATASETS, SINGLE_DATASET

    @Column(name = "dataset_count")
    private Integer datasetCount;

    @Column(name = "dataset_filename", length = 500)
    private String datasetFilename;

    @Column(name = "status", length = 50)
    private String status; // PENDING, RUNNING, COMPLETE, FAILED

    @Column(name = "stage", length = 100)
    private String stage; // TOKENIZATION, CANDIDATE_BLOCKING, SIMILARITY_SCORING, CLUSTERING, FINALIZING

    @Column(name = "input_records")
    private Long inputRecords;

    @Column(name = "entities_formed")
    private Long entitiesFormed;

    @Column(name = "match_confidence", precision = 5, scale = 2)
    private BigDecimal matchConfidence;

    @Column(name = "comparison_reduction", precision = 5, scale = 2)
    private BigDecimal comparisonReduction;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "started_at", updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        if (startedAt == null) {
            startedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = "PENDING";
        }
    }
}
