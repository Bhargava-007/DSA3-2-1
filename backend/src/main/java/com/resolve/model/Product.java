package com.resolve.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products", indexes = {
    @Index(name = "idx_product_dataset", columnList = "dataset_id"),
    @Index(name = "idx_product_source", columnList = "source")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "external_id", length = 255)
    private String externalId;

    @Column(name = "title", length = 1000, nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "brand", length = 255)
    private String brand;

    @Column(name = "price", precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "category", length = 255)
    private String category;

    @Column(name = "source", length = 100)
    private String source;

    @Column(name = "dataset_id")
    private Long datasetId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
