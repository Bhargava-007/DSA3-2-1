package com.resolve.controller;

import com.resolve.dto.ClusterMemberDetail;
import com.resolve.dto.EntityClusterResponse;
import com.resolve.model.ClusterMember;
import com.resolve.model.EntityCluster;
import com.resolve.model.Product;
import com.resolve.repository.ClusterMemberRepository;
import com.resolve.repository.EntityClusterRepository;
import com.resolve.repository.PipelineRunRepository;
import com.resolve.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/entities")
@RequiredArgsConstructor
public class EntityController {

    private final EntityClusterRepository entityClusterRepository;
    private final ClusterMemberRepository clusterMemberRepository;
    private final ProductRepository productRepository;
    private final PipelineRunRepository pipelineRunRepository;

    @GetMapping
    @Cacheable(value = "clusters", key = "(#runId != null ? #runId : 'latest') + '_' + #page + '_' + #size")
    public ResponseEntity<Map<String, Object>> getClusters(
            @RequestParam(name = "runId", required = false) Long runId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "50") int size) {

        Long targetRunId = runId;
        if (targetRunId == null) {
            // Find latest completed run if runId not provided
            var latestRun = pipelineRunRepository.findFirstByStatusOrderByCompletedAtDesc("COMPLETE");
            if (latestRun.isPresent()) {
                targetRunId = latestRun.get().getId();
            } else {
                return ResponseEntity.ok()
                        .cacheControl(CacheControl.noCache())
                        .body(Map.of(
                                "content", Collections.emptyList(),
                                "totalElements", 0L,
                                "totalPages", 0,
                                "page", page
                        ));
            }
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "listingCount", "confidence"));
        Page<EntityCluster> clusterPage = entityClusterRepository.findByPipelineRunId(targetRunId, pageable);

        List<EntityClusterResponse> content = clusterPage.getContent().stream()
                .map(c -> EntityClusterResponse.builder()
                        .id(c.getId())
                        .pipelineRunId(c.getPipelineRunId())
                        .canonicalTitle(c.getCanonicalTitle())
                        .canonicalBrand(c.getCanonicalBrand())
                        .listingCount(c.getListingCount())
                        .sourceCount(c.getSourceCount())
                        .confidence(c.getConfidence())
                        .build())
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("content", content);
        response.put("totalElements", clusterPage.getTotalElements());
        response.put("totalPages", clusterPage.getTotalPages());
        response.put("page", clusterPage.getNumber());

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic())
                .body(response);
    }

    @GetMapping("/{id}")
    @Cacheable(value = "clusters", key = "'detail_' + #id")
    public ResponseEntity<EntityClusterResponse> getClusterById(@PathVariable Long id) {
        Optional<EntityCluster> clusterOpt = entityClusterRepository.findById(id);
        if (clusterOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        EntityCluster cluster = clusterOpt.get();
        List<ClusterMember> members = clusterMemberRepository.findByClusterId(cluster.getId());
        List<Long> productIds = members.stream().map(ClusterMember::getProductId).collect(Collectors.toList());
        List<Product> products = productRepository.findAllById(productIds);

        List<ClusterMemberDetail> memberDetails = products.stream()
                .map(p -> ClusterMemberDetail.builder()
                        .productId(p.getId())
                        .title(p.getTitle())
                        .brand(p.getBrand())
                        .source(p.getSource())
                        .price(p.getPrice())
                        .externalId(p.getExternalId())
                        .category(p.getCategory())
                        .description(p.getDescription())
                        .build())
                .collect(Collectors.toList());

        EntityClusterResponse response = EntityClusterResponse.builder()
                .id(cluster.getId())
                .pipelineRunId(cluster.getPipelineRunId())
                .canonicalTitle(cluster.getCanonicalTitle())
                .canonicalBrand(cluster.getCanonicalBrand())
                .listingCount(cluster.getListingCount())
                .sourceCount(cluster.getSourceCount())
                .confidence(cluster.getConfidence())
                .members(memberDetails)
                .build();

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(300, TimeUnit.SECONDS).cachePublic())
                .body(response);
    }
}
