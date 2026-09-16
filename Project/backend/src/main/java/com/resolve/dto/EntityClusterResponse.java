package com.resolve.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntityClusterResponse {
    private Long id;
    private Long pipelineRunId;
    private String canonicalTitle;
    private String canonicalBrand;
    private Integer listingCount;
    private Integer sourceCount;
    private BigDecimal confidence;
    private List<ClusterMemberDetail> members;
}
