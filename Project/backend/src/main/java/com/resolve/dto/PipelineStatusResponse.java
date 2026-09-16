package com.resolve.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineStatusResponse {
    private Long runId;
    private String status;
    private String stage;
    private Integer progressPct;
    private String message;
}
