package com.resolve.service.algorithm;

import com.resolve.model.CandidatePair;
import com.resolve.model.ClusterMember;
import com.resolve.model.EntityCluster;
import com.resolve.model.Product;
import com.resolve.repository.ClusterMemberRepository;
import com.resolve.repository.EntityClusterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClusteringService {

    private final EntityClusterRepository clusterRepository;
    private final ClusterMemberRepository memberRepository;
    private final AlgorithmMetricsTracker metricsTracker;

    /**
     * Disjoint Set Union (DSU) with Path Compression and Union by Rank
     */
    public static class DisjointSetUnion {
        private final int[] parent;
        private final int[] rank;

        public DisjointSetUnion(int size) {
            parent = new int[size];
            rank = new int[size];
            for (int i = 0; i < size; i++) {
                parent[i] = i;
                rank[i] = 0;
            }
        }

        public int find(int x) {
            if (parent[x] != x) {
                parent[x] = find(parent[x]); // Path compression
            }
            return parent[x];
        }

        public boolean union(int x, int y) {
            int rootX = find(x);
            int rootY = find(y);
            if (rootX == rootY) {
                return false;
            }

            // Union by rank
            if (rank[rootX] < rank[rootY]) {
                parent[rootX] = rootY;
            } else if (rank[rootX] > rank[rootY]) {
                parent[rootY] = rootX;
            } else {
                parent[rootY] = rootX;
                rank[rootX]++;
            }
            return true;
        }
    }

    public static final double CLUSTERING_EDGE_THRESHOLD = 0.40;

    /**
     * Forms entity clusters from candidate pairs where weighted score >= CLUSTERING_EDGE_THRESHOLD using Union-Find DSU.
     */
    @Transactional
    public List<EntityCluster> formClusters(Long pipelineRunId, List<Product> products, List<CandidatePair> candidatePairs) {
        if (products == null || products.isEmpty()) {
            return Collections.emptyList();
        }

        int n = products.size();
        Map<Long, Integer> idToIndex = new HashMap<>();
        Map<Integer, Product> indexToProduct = new HashMap<>();
        for (int i = 0; i < n; i++) {
            Product p = products.get(i);
            idToIndex.put(p.getId(), i);
            indexToProduct.put(i, p);
        }

        DisjointSetUnion dsu = new DisjointSetUnion(n);
        Map<Long, Integer> matchDegrees = new HashMap<>();
        Map<Long, List<CandidatePair>> productToMatchedPairs = new HashMap<>();

        for (CandidatePair pair : candidatePairs) {
            boolean shouldMerge = false;
            if (pair.getFinalScore() != null) {
                shouldMerge = pair.getFinalScore().doubleValue() >= CLUSTERING_EDGE_THRESHOLD;
            } else if (Boolean.TRUE.equals(pair.getIsMatch())) {
                shouldMerge = true;
            }

            if (shouldMerge) {
                Integer idxA = idToIndex.get(pair.getProductAId());
                Integer idxB = idToIndex.get(pair.getProductBId());

                if (idxA != null && idxB != null) {
                    if (dsu.union(idxA, idxB)) {
                        metricsTracker.incrementUnionFindMerges();
                        int root = dsu.find(idxA);
                        log.info("[DSU] union(ID:{}, ID:{}) → cluster C-{} merged (root: {})",
                                pair.getProductAId(), pair.getProductBId(), String.format("%03d", root), root);
                    }

                    matchDegrees.put(pair.getProductAId(), matchDegrees.getOrDefault(pair.getProductAId(), 0) + 1);
                    matchDegrees.put(pair.getProductBId(), matchDegrees.getOrDefault(pair.getProductBId(), 0) + 1);

                    productToMatchedPairs.computeIfAbsent(pair.getProductAId(), k -> new ArrayList<>()).add(pair);
                    productToMatchedPairs.computeIfAbsent(pair.getProductBId(), k -> new ArrayList<>()).add(pair);
                }
            }
        }

        // Group products by DSU root component
        Map<Integer, List<Product>> components = new HashMap<>();
        for (int i = 0; i < n; i++) {
            int root = dsu.find(i);
            components.computeIfAbsent(root, k -> new ArrayList<>()).add(indexToProduct.get(i));
        }

        List<ClusterCandidate> clustersToRank = new ArrayList<>();

        for (Map.Entry<Integer, List<Product>> entry : components.entrySet()) {
            List<Product> clusterProducts = entry.getValue();

            // 1. Determine canonical title (product with highest degree of matched edges)
            Product canonicalProduct = clusterProducts.stream()
                    .max(Comparator.comparingInt((Product p) -> matchDegrees.getOrDefault(p.getId(), 0))
                            .thenComparingInt(p -> p.getTitle() != null ? p.getTitle().length() : 0))
                    .orElse(clusterProducts.get(0));

            String canonicalTitle = canonicalProduct.getTitle();

            // 2. Determine canonical brand (most common non-empty brand)
            Map<String, Long> brandCounts = clusterProducts.stream()
                    .map(Product::getBrand)
                    .filter(b -> b != null && !b.trim().isEmpty())
                    .collect(Collectors.groupingBy(b -> b.trim(), Collectors.counting()));

            String canonicalBrand = brandCounts.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(canonicalProduct.getBrand() != null ? canonicalProduct.getBrand() : "Unknown");

            // 3. Listing count
            int listingCount = clusterProducts.size();

            // 4. Source count
            long distinctSources = clusterProducts.stream()
                    .map(Product::getSource)
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .distinct()
                    .count();
            int sourceCount = distinctSources > 0 ? (int) distinctSources : 1;

            // 5. Cluster confidence: average final_score of edges in the cluster
            Set<Long> clusterProductIds = clusterProducts.stream().map(Product::getId).collect(Collectors.toSet());
            Set<Long> visitedPairIds = new HashSet<>();
            List<BigDecimal> scores = new ArrayList<>();

            for (Product p : clusterProducts) {
                List<CandidatePair> pairs = productToMatchedPairs.get(p.getId());
                if (pairs != null) {
                    for (CandidatePair cp : pairs) {
                        if (cp.getId() != null && visitedPairIds.add(cp.getId())) {
                            if (clusterProductIds.contains(cp.getProductAId()) && clusterProductIds.contains(cp.getProductBId())) {
                                if (cp.getFinalScore() != null) {
                                    scores.add(cp.getFinalScore());
                                }
                            }
                        }
                    }
                }
            }

            BigDecimal confidence;
            if (!scores.isEmpty()) {
                BigDecimal sum = scores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
                confidence = sum.divide(BigDecimal.valueOf(scores.size()), 4, RoundingMode.HALF_UP);
            } else {
                confidence = BigDecimal.valueOf(1.0000).setScale(4, RoundingMode.HALF_UP);
            }

            EntityCluster cluster = EntityCluster.builder()
                    .pipelineRunId(pipelineRunId)
                    .canonicalTitle(canonicalTitle != null && canonicalTitle.length() > 1000 ? canonicalTitle.substring(0, 1000) : canonicalTitle)
                    .canonicalBrand(canonicalBrand != null && canonicalBrand.length() > 255 ? canonicalBrand.substring(0, 255) : canonicalBrand)
                    .listingCount(listingCount)
                    .sourceCount(sourceCount)
                    .confidence(confidence)
                    .build();

            ClusterCandidate candidate = new ClusterCandidate(cluster, clusterProducts);
            clustersToRank.add(candidate);
        }

        // Priority Queue (Max-Heap order via reversed Comparator) for ranking clusters by confidence score and listing count
        PriorityQueue<ClusterCandidate> clusterPriorityQueue = new PriorityQueue<>(
                Comparator.comparing((ClusterCandidate cc) -> cc.cluster.getConfidence(), Comparator.nullsLast(BigDecimal::compareTo))
                        .thenComparingInt(cc -> cc.cluster.getListingCount())
                        .reversed()
        );

        for (ClusterCandidate candidate : clustersToRank) {
            clusterPriorityQueue.offer(candidate);
            log.info("[MIN-HEAP] Cluster (\"{}\") pushed with confidence {} → heap size: {}",
                    truncate(candidate.cluster.getCanonicalTitle(), 22),
                    candidate.cluster.getConfidence() != null ? candidate.cluster.getConfidence().toString() : "1.0000",
                    clusterPriorityQueue.size());
        }

        // Poll clusters out of the heap in strict ranked priority order
        List<EntityCluster> rankedClustersToSave = new ArrayList<>();
        List<List<Product>> rankedMembersList = new ArrayList<>();

        int rankOrder = 1;
        while (!clusterPriorityQueue.isEmpty()) {
            ClusterCandidate polled = clusterPriorityQueue.poll();
            rankedClustersToSave.add(polled.cluster);
            rankedMembersList.add(polled.members);
            log.info("[MIN-HEAP] Rank #{} polled from heap: \"{}\" (confidence: {}, listings: {}) → remaining in heap: {}",
                    rankOrder++,
                    truncate(polled.cluster.getCanonicalTitle(), 22),
                    polled.cluster.getConfidence() != null ? polled.cluster.getConfidence().toString() : "1.0000",
                    polled.cluster.getListingCount(),
                    clusterPriorityQueue.size());
        }

        // Persist ranked clusters and their associated member records
        List<EntityCluster> savedClusters = clusterRepository.saveAll(rankedClustersToSave);
        List<ClusterMember> membersToSave = new ArrayList<>();

        for (int i = 0; i < savedClusters.size(); i++) {
            EntityCluster cluster = savedClusters.get(i);
            List<Product> prods = rankedMembersList.get(i);
            for (Product p : prods) {
                membersToSave.add(ClusterMember.builder()
                        .clusterId(cluster.getId())
                        .productId(p.getId())
                        .build());
            }
        }

        memberRepository.saveAll(membersToSave);

        log.info("Clustering complete for run {}: formed and ranked {} clusters from {} products with {} merges",
                pipelineRunId, savedClusters.size(), products.size(), metricsTracker.getUnionFindMerges());

        return savedClusters;
    }

    public static class ClusterCandidate {
        public final EntityCluster cluster;
        public final List<Product> members;

        public ClusterCandidate(EntityCluster cluster, List<Product> members) {
            this.cluster = cluster;
            this.members = members;
        }
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() > maxLen ? text.substring(0, maxLen) + "…" : text;
    }
}
