package com.resolve.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "candidate_pairs", indexes = {
    @Index(name = "idx_pair_run", columnList = "pipeline_run_id"),
    @Index(name = "idx_pair_score", columnList = "final_score"),
    @Index(name = "idx_pair_match", columnList = "is_match")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidatePair {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_a_id", nullable = false)
    private Long productAId;

    @Column(name = "product_b_id", nullable = false)
    private Long productBId;

    @Column(name = "pipeline_run_id", nullable = false)
    private Long pipelineRunId;

    @Column(name = "title_similarity", precision = 5, scale = 4)
    private BigDecimal titleSimilarity;

    @Column(name = "description_jaccard", precision = 5, scale = 4)
    private BigDecimal descriptionJaccard;

    @Column(name = "levenshtein_distance")
    private Integer levenshteinDistance;

    @Column(name = "brand_match")
    private Boolean brandMatch;

    @Column(name = "model_match")
    private Boolean modelMatch;

    @Column(name = "final_score", precision = 5, scale = 4)
    private BigDecimal finalScore;

    @Column(name = "is_match")
    private Boolean isMatch;
}
