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
public class DatasetResponse {
    private Long id;
    private Long datasetId;
    private String filename;
    private Long recordCount;
    private BigDecimal fileSizeMb;
    private String status;
    private LocalDateTime uploadedAt;
    private LocalDateTime completedAt;
}
