package com.resolve.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineRunResponse {
    private Long id;
    private Long datasetId;
    private String scope;
    private Integer datasetCount;
    private String datasetFilename;
    private String status;
    private String stage;
    private Long inputRecords;
    private Long entitiesFormed;
    private BigDecimal matchConfidence;
    private BigDecimal comparisonReduction;
    private Long durationMs;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
}
