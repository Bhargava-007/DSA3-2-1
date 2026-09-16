package com.resolve.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "cluster_members", indexes = {
    @Index(name = "idx_member_cluster", columnList = "cluster_id"),
    @Index(name = "idx_member_product", columnList = "product_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClusterMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cluster_id", nullable = false)
    private Long clusterId;

    @Column(name = "product_id", nullable = false)
    private Long productId;
}
