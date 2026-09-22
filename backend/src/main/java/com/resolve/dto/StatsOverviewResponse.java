package com.resolve.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsOverviewResponse {
    private Long totalListings;
    private Long totalResolvedEntities;
    private Double averageMatchConfidence;
    private Double averageComparisonReduction;
}
