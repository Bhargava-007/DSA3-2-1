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
public class ProductDetail {
    private Long id;
    private String externalId;
    private String title;
    private String description;
    private String brand;
    private BigDecimal price;
    private String category;
    private String source;
}
