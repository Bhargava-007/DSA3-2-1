package com.resolve.service.algorithm;

import com.resolve.model.CandidatePair;
import com.resolve.model.Product;
import com.resolve.repository.CandidatePairRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlockingService {

    public static final int DEFAULT_MIN_LCP_THRESHOLD = 8;

    private final TokenizerService tokenizerService;
    private final CandidatePairRepository candidatePairRepository;
    private final AlgorithmMetricsTracker metricsTracker;

    public static class CandidateProductPair {
        public final Product productA;
        public final Product productB;

        public CandidateProductPair(Product a, Product b) {
            // Ensure deterministic order by ID
            if (a.getId() != null && b.getId() != null && a.getId() > b.getId()) {
                this.productA = b;
                this.productB = a;
            } else {
                this.productA = a;
                this.productB = b;
            }
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            CandidateProductPair that = (CandidateProductPair) o;
            return Objects.equals(productA.getId(), that.productA.getId()) &&
                   Objects.equals(productB.getId(), that.productB.getId());
        }

        @Override
        public int hashCode() {
            return Objects.hash(productA.getId(), productB.getId());
        }
    }

    /**
     * Generates candidate blocking pairs by merging Inverted Index posting lists
     * with Suffix Array + LCP window sliding candidate pairs.
     */
    @Transactional
    public List<CandidatePair> generateCandidateBlocks(Long pipelineRunId, List<Product> products, Map<Long, List<String>> productTokens) {
        if (products == null || products.size() < 2) {
            return Collections.emptyList();
        }

        Set<CandidateProductPair> pairSet = new HashSet<>();

        // 1. Build Inverted Index (token -> posting list of products)
        Map<String, List<Product>> invertedIndex = new HashMap<>();
        for (Product product : products) {
            List<String> tokens = productTokens != null && productTokens.containsKey(product.getId())
                    ? productTokens.get(product.getId())
                    : new ArrayList<>(tokenizerService.tokenizeToSet(product.getTitle()));

            Set<String> uniqueTokens = new HashSet<>(tokens);
            for (String token : uniqueTokens) {
                invertedIndex.computeIfAbsent(token, k -> new ArrayList<>()).add(product);
            }
        }

        // Generate candidate pairs from inverted index posting lists
        for (Map.Entry<String, List<Product>> entry : invertedIndex.entrySet()) {
            List<Product> postingList = entry.getValue();
            if (postingList.size() > 1 && postingList.size() <= 500) { // Prune extremely generic terms
                int pairsBefore = pairSet.size();
                for (int i = 0; i < postingList.size(); i++) {
                    Product p1 = postingList.get(i);
                    for (int j = i + 1; j < postingList.size(); j++) {
                        Product p2 = postingList.get(j);
                        if (!Objects.equals(p1.getId(), p2.getId())) {
                            pairSet.add(new CandidateProductPair(p1, p2));
                        }
                    }
                }
                int pairsEmitted = pairSet.size() - pairsBefore;
                if (pairsEmitted > 0) {
                    log.info("[INVERTED-IDX] Token \"{}\" (posting list: {} products) → emitted {} candidate pairs",
                            entry.getKey(), postingList.size(), pairsEmitted);
                }
            }
        }

        // 2. Extract candidate pairs from Suffix Array + Kasai's LCP window sliding
        Set<CandidateProductPair> saPairs = extractSuffixArrayAndLcpBlocks(products, DEFAULT_MIN_LCP_THRESHOLD);
        int saPairCount = saPairs.size();
        pairSet.addAll(saPairs);

        // Fallback if dataset has single source or strict source filter returned no pairs
        if (pairSet.isEmpty() && products.size() > 1) {
            for (Map.Entry<String, List<Product>> entry : invertedIndex.entrySet()) {
                List<Product> postingList = entry.getValue();
                if (postingList.size() > 1 && postingList.size() <= 200) {
                    for (int i = 0; i < postingList.size(); i++) {
                        Product p1 = postingList.get(i);
                        for (int j = i + 1; j < postingList.size(); j++) {
                            Product p2 = postingList.get(j);
                            pairSet.add(new CandidateProductPair(p1, p2));
                        }
                    }
                }
            }
        }

        // Ultimate fallback for small catalogs
        if (pairSet.isEmpty() && products.size() > 1) {
            int limit = Math.min(products.size(), 100);
            for (int i = 0; i < limit; i++) {
                Product p1 = products.get(i);
                for (int j = i + 1; j < limit; j++) {
                    Product p2 = products.get(j);
                    pairSet.add(new CandidateProductPair(p1, p2));
                }
            }
        }

        metricsTracker.incrementSuffixArrayBlocks(saPairCount > 0 ? saPairCount : pairSet.size());

        List<CandidatePair> candidateEntities = new ArrayList<>();
        for (CandidateProductPair pair : pairSet) {
            CandidatePair cp = CandidatePair.builder()
                    .pipelineRunId(pipelineRunId)
                    .productAId(pair.productA.getId())
                    .productBId(pair.productB.getId())
                    .build();
            candidateEntities.add(cp);
        }

        log.info("Blocking complete for run {}: generated {} candidate pairs (Inverted Index + {} Suffix Array pairs) from {} products",
                pipelineRunId, candidateEntities.size(), saPairCount, products.size());
        return candidateEntities;
    }

    /**
     * Constructs Suffix Array and LCP (Longest Common Prefix) via Kasai's algorithm,
     * slides a window over the LCP array, maps suffix positions back to products,
     * and emits candidate product pairs whose shared prefix length >= minLcpThreshold.
     */
    public Set<CandidateProductPair> extractSuffixArrayAndLcpBlocks(List<Product> products, int minLcpThreshold) {
        Set<CandidateProductPair> saPairs = new HashSet<>();
        if (products == null || products.size() < 2) {
            return saPairs;
        }

        StringBuilder sb = new StringBuilder();
        TreeMap<Integer, Product> posToProduct = new TreeMap<>();

        for (Product p : products) {
            if (p.getTitle() != null && !p.getTitle().trim().isEmpty()) {
                posToProduct.put(sb.length(), p);
                sb.append(p.getTitle().toLowerCase().trim()).append("$");
            }
        }

        String text = sb.toString();
        int len = Math.min(text.length(), 50000); // Bound text for fast in-memory suffix array
        if (len < 2) return saPairs;

        Integer[] suffixArray = new Integer[len];
        for (int i = 0; i < len; i++) {
            suffixArray[i] = i;
        }

        Arrays.sort(suffixArray, (a, b) -> {
            int maxCmp = Math.min(len - a, len - b);
            for (int i = 0; i < maxCmp; i++) {
                char c1 = text.charAt(a + i);
                char c2 = text.charAt(b + i);
                if (c1 != c2) return Character.compare(c1, c2);
            }
            return Integer.compare(len - a, len - b);
        });

        // Kasai's algorithm for LCP Array computation O(N)
        int[] rank = new int[len];
        for (int i = 0; i < len; i++) {
            rank[suffixArray[i]] = i;
        }

        int h = 0;
        int[] lcp = new int[len];
        for (int i = 0; i < len; i++) {
            if (rank[i] > 0) {
                int j = suffixArray[rank[i] - 1];
                while (i + h < len && j + h < len && text.charAt(i + h) == text.charAt(j + h)) {
                    h++;
                }
                lcp[rank[i]] = h;
                if (h > 0) h--;
            }
        }

        // Slide window over LCP array and extract candidate pairs
        int i = 1;
        while (i < len) {
            if (lcp[i] >= minLcpThreshold) {
                int start = i - 1;
                while (i < len && lcp[i] >= minLcpThreshold) {
                    i++;
                }
                int end = i; // Suffixes in [start, end) share a prefix of length >= minLcpThreshold

                // Map suffix offsets back to Products
                Set<Product> blockProducts = new LinkedHashSet<>();
                for (int k = start; k < end; k++) {
                    int pos = suffixArray[k];
                    Map.Entry<Integer, Product> entry = posToProduct.floorEntry(pos);
                    if (entry != null && entry.getValue() != null) {
                        blockProducts.add(entry.getValue());
                    }
                }

                // Emit candidate pairs if block size is non-trivial and reasonable
                if (blockProducts.size() > 1 && blockProducts.size() <= 100) {
                    List<Product> prodList = new ArrayList<>(blockProducts);
                    for (int p1 = 0; p1 < prodList.size(); p1++) {
                        for (int p2 = p1 + 1; p2 < prodList.size(); p2++) {
                            Product prodA = prodList.get(p1);
                            Product prodB = prodList.get(p2);
                            if (!Objects.equals(prodA.getId(), prodB.getId())) {
                                CandidateProductPair cpPair = new CandidateProductPair(prodA, prodB);
                                if (saPairs.add(cpPair)) {
                                    int previewLen = Math.min(lcp[start + 1 < len ? start + 1 : start], 20);
                                    int suffPos = suffixArray[start];
                                    String sharedSnippet = text.substring(suffPos, Math.min(suffPos + previewLen, text.length())).replace("$", "");
                                    log.debug("[SUFFIX-ARR] LCP window: suffix[{}]=\"{}\" shares {} chars with suffix[{}] → pair emitted (ID:{}, ID:{})",
                                            start, sharedSnippet, lcp[start + 1 < len ? start + 1 : start], end - 1, prodA.getId(), prodB.getId());
                                }
                            }
                        }
                    }
                }
            } else {
                i++;
            }
        }

        return saPairs;
    }
}
