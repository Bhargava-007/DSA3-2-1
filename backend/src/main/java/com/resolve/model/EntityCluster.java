package com.resolve.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "entity_clusters", indexes = {
    @Index(name = "idx_cluster_run", columnList = "pipeline_run_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EntityCluster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pipeline_run_id", nullable = false)
    private Long pipelineRunId;

    @Column(name = "canonical_title", length = 1000)
    private String canonicalTitle;

    @Column(name = "canonical_brand", length = 255)
    private String canonicalBrand;

    @Column(name = "listing_count")
    private Integer listingCount;

    @Column(name = "source_count")
    private Integer sourceCount;

    @Column(name = "confidence", precision = 5, scale = 4)
    private BigDecimal confidence;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
