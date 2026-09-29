package com.resolve.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClusterMemberDetail {
    private Long productId;
    private String title;
    private String brand;
    private String source;
    private BigDecimal price;
    private String externalId;
    private String category;
    private String description;
}
