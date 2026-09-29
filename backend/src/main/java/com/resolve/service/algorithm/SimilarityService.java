package com.resolve.service.algorithm;

import com.resolve.model.CandidatePair;
import com.resolve.model.Product;
import com.resolve.repository.CandidatePairRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SimilarityService {

    private final TokenizerService tokenizerService;
    private final CandidatePairRepository candidatePairRepository;
    private final AlgorithmMetricsTracker metricsTracker;

    // Safe primes verified with Miller-Rabin for Rabin-Karp double-hashing
    private final long primeP1;
    private final long primeP2;
    private static final long HASH_BASE = 313L;

    public SimilarityService(TokenizerService tokenizerService,
                             CandidatePairRepository candidatePairRepository,
                             AlgorithmMetricsTracker metricsTracker) {
        this.tokenizerService = tokenizerService;
        this.candidatePairRepository = candidatePairRepository;
        this.metricsTracker = metricsTracker;

        // Initialize safe primes verified via Miller-Rabin
        this.primeP1 = findSafePrimeWithMillerRabin(1000000007L);
        this.primeP2 = findSafePrimeWithMillerRabin(1000000009L);
    }

    public static class ScoredPairResult {
        public double titleSimilarity;
        public double descriptionJaccard;
        public int levenshteinDistance;
        public boolean brandMatch;
        public boolean modelMatch;
        public double finalScore;
        public boolean isMatch;
    }

    @Transactional
    public List<CandidatePair> scoreCandidatePairs(List<CandidatePair> candidatePairs, List<Product> products) {
        if (candidatePairs == null || candidatePairs.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, Product> productMap = products.stream()
                .collect(Collectors.toMap(Product::getId, p -> p, (a, b) -> a));

        int count = 0;
        int aboveThreshold = 0;
        for (CandidatePair pair : candidatePairs) {
            Product pA = productMap.get(pair.getProductAId());
            Product pB = productMap.get(pair.getProductBId());

            if (pA != null && pB != null) {
                ScoredPairResult res = scorePair(pA, pB);
                pair.setTitleSimilarity(BigDecimal.valueOf(res.titleSimilarity).setScale(4, RoundingMode.HALF_UP));
                pair.setDescriptionJaccard(BigDecimal.valueOf(res.descriptionJaccard).setScale(4, RoundingMode.HALF_UP));
                pair.setLevenshteinDistance(res.levenshteinDistance);
                pair.setBrandMatch(res.brandMatch);
                pair.setModelMatch(res.modelMatch);
                pair.setFinalScore(BigDecimal.valueOf(res.finalScore).setScale(4, RoundingMode.HALF_UP));
                pair.setIsMatch(res.isMatch);

                if (res.finalScore >= SIMILARITY_THRESHOLD) {
                    aboveThreshold++;
                }
            }

            count++;
            if (count % 25 == 0 || count == candidatePairs.size()) {
                log.info("[SIMILARITY] Scored {}/{} pairs...", count, candidatePairs.size());
            }
        }

        log.info("[SIMILARITY] Complete: {} pairs scored, {} above threshold ({})",
                candidatePairs.size(), aboveThreshold, SIMILARITY_THRESHOLD);

        List<CandidatePair> saved = candidatePairRepository.saveAll(candidatePairs);
        log.info("Scoring complete: evaluated and saved {} candidate pairs", saved.size());
        return saved;
    }

    public static final double SIMILARITY_THRESHOLD = 0.45;
    public static final double WEIGHT_TITLE = 0.55;
    public static final double WEIGHT_BRAND = 0.25;
    public static final double WEIGHT_DESCRIPTION = 0.20;
    public static final double EXACT_BRAND_BOOST = 0.10;

    /**
     * Normalizes product titles for comparison without altering stored database values.
     */
    public String normalizeTitle(String title) {
        if (title == null) return "";

        // 1. Lowercase everything
        String s = title.toLowerCase();

        // 2. Expand common abbreviations
        s = s.replaceAll("usb[-\\s]+c", "usbc");
        s = s.replaceAll("\\bw/\\b", "with ").replaceAll("\\bw/", "with ");
        s = s.replaceAll("\\b2nd\\s+gen(eration)?\\b", "generation 2");
        s = s.replaceAll("\\bgen\\s+2\\b", "generation 2");
        s = s.replaceAll("\\b1st\\s+gen(eration)?\\b", "generation 1");
        s = s.replaceAll("\\bgen\\s+1\\b", "generation 1");
        s = s.replaceAll("\\b3rd\\s+gen(eration)?\\b", "generation 3");
        s = s.replaceAll("\\bgen\\s+3\\b", "generation 3");
        s = s.replaceAll("\\bbt\\b", "bluetooth");

        // 3. Remove punctuation except hyphens
        s = s.replaceAll("[^a-z0-9\\-\\s]", " ");

        // 4. Remove filler words: "the", "a", "an", "for", "with", "and", "in", "of", "new", "official"
        s = s.replaceAll("\\b(the|a|an|for|with|and|in|of|new|official)\\b", " ");

        // 5. Collapse multiple spaces and trim
        s = s.replaceAll("\\s+", " ").trim();
        return s;
    }

    public ScoredPairResult scorePair(Product productA, Product productB) {
        String titleA = productA.getTitle() != null ? productA.getTitle() : "";
        String titleB = productB.getTitle() != null ? productB.getTitle() : "";

        // Normalize titles prior to comparison
        String normTitleA = normalizeTitle(titleA);
        String normTitleB = normalizeTitle(titleB);

        // 1. Wagner-Fischer Levenshtein Distance on normalized titles
        int levDistance = computeLevenshteinDistance(normTitleA, normTitleB);
        int maxLen = Math.max(1, Math.max(normTitleA.length(), normTitleB.length()));
        double levSimilarity = Math.max(0.0, 1.0 - ((double) levDistance / maxLen));
        metricsTracker.incrementLevenshteinOperations((long) normTitleA.length() * normTitleB.length());

        // 2. KMP Substring Pattern Search on normalized titles
        boolean kmpFound = kmpSearch(normTitleB, normTitleA) || kmpSearch(normTitleA, normTitleB);
        double kmpBoost = kmpFound ? 0.15 : 0.0;
        metricsTracker.incrementKmpSearches(1);

        // 3. Rabin-Karp Rolling Double-Hash on 3-grams on normalized titles
        double rabinKarpRatio = computeRabinKarpNgramOverlap(normTitleA, normTitleB, 3);
        metricsTracker.incrementRabinKarpComparisons(1);

        // Blended Title Similarity (Levenshtein + Rabin-Karp + KMP)
        double blendedTitleSim = Math.min(1.0, (levSimilarity * 0.6) + (rabinKarpRatio * 0.4) + kmpBoost);

        // 4. Jaccard on Description Tokens
        double descJaccard = computeDescriptionJaccard(productA.getDescription(), productB.getDescription());

        // 5. Brand & Model Matching
        boolean brandMatch = checkBrandMatch(productA.getBrand(), productB.getBrand(), titleA, titleB);
        boolean modelMatch = checkModelMatch(normTitleA, normTitleB);

        // 6. Final Weighted Score:
        // Title similarity: 0.55, Brand match: 0.25, Description/Jaccard: 0.20
        double finalScore = (blendedTitleSim * WEIGHT_TITLE)
                + (brandMatch ? WEIGHT_BRAND : 0.0)
                + (descJaccard * WEIGHT_DESCRIPTION);

        // If brand names match exactly, boost the pair's score by adding 0.10 (capped at 1.0)
        if (brandMatch) {
            finalScore += EXACT_BRAND_BOOST;
        }

        finalScore = Math.max(0.0, Math.min(1.0, finalScore));
        boolean isMatch = finalScore >= SIMILARITY_THRESHOLD;

        ScoredPairResult result = new ScoredPairResult();
        result.titleSimilarity = blendedTitleSim;
        result.descriptionJaccard = descJaccard;
        result.levenshteinDistance = levDistance;
        result.brandMatch = brandMatch;
        result.modelMatch = modelMatch;
        result.finalScore = finalScore;
        result.isMatch = isMatch;

        return result;
    }

    /**
     * Knuth-Morris-Pratt (KMP) Substring Pattern Search O(N+M)
     */
    public boolean kmpSearch(String text, String pattern) {
        if (text == null || pattern == null || pattern.isEmpty() || text.length() < pattern.length()) {
            return false;
        }

        String t = text.toLowerCase();
        String p = pattern.toLowerCase();

        int[] lps = computeLpsArray(p);
        int i = 0; // index for text
        int j = 0; // index for pattern

        while (i < t.length()) {
            if (p.charAt(j) == t.charAt(i)) {
                i++;
                j++;
            }
            if (j == p.length()) {
                return true; // Match found
            } else if (i < t.length() && p.charAt(j) != t.charAt(i)) {
                if (j != 0) {
                    j = lps[j - 1];
                } else {
                    i++;
                }
            }
        }
        return false;
    }

    private int[] computeLpsArray(String pattern) {
        int[] lps = new int[pattern.length()];
        int len = 0;
        int i = 1;
        while (i < pattern.length()) {
            if (pattern.charAt(i) == pattern.charAt(len)) {
                len++;
                lps[i] = len;
                i++;
            } else {
                if (len != 0) {
                    len = lps[len - 1];
                } else {
                    lps[i] = 0;
                    i++;
                }
            }
        }
        return lps;
    }

    /**
     * Wagner-Fischer Dynamic Programming Levenshtein Edit Distance O(N*M)
     */
    public int computeLevenshteinDistance(String s1, String s2) {
        if (s1 == null) s1 = "";
        if (s2 == null) s2 = "";

        int m = s1.length();
        int n = s2.length();

        if (m == 0) return n;
        if (n == 0) return m;

        int[] prevRow = new int[n + 1];
        int[] currRow = new int[n + 1];

        for (int j = 0; j <= n; j++) {
            prevRow[j] = j;
        }

        for (int i = 1; i <= m; i++) {
            currRow[0] = i;
            char c1 = Character.toLowerCase(s1.charAt(i - 1));

            for (int j = 1; j <= n; j++) {
                char c2 = Character.toLowerCase(s2.charAt(j - 1));
                int cost = (c1 == c2) ? 0 : 1;

                currRow[j] = Math.min(
                    Math.min(currRow[j - 1] + 1, prevRow[j] + 1),
                    prevRow[j - 1] + cost
                );
            }

            System.arraycopy(currRow, 0, prevRow, 0, n + 1);
        }

        return prevRow[n];
    }

    /**
     * Rabin-Karp Rolling Double-Hash on N-grams with Miller-Rabin Primes
     */
    public double computeRabinKarpNgramOverlap(String s1, String s2, int n) {
        if (s1 == null || s2 == null) return 0.0;
        String t1 = s1.toLowerCase().replaceAll("\\s+", " ").trim();
        String t2 = s2.toLowerCase().replaceAll("\\s+", " ").trim();

        if (t1.length() < n || t2.length() < n) {
            return t1.equalsIgnoreCase(t2) ? 1.0 : 0.0;
        }

        Set<Long> hashes1 = computeRollingHashes(t1, n);
        Set<Long> hashes2 = computeRollingHashes(t2, n);

        int intersection = 0;
        for (Long h : hashes1) {
            if (hashes2.contains(h)) {
                intersection++;
            }
        }

        int union = hashes1.size() + hashes2.size() - intersection;
        return union > 0 ? (double) intersection / union : 0.0;
    }

    private Set<Long> computeRollingHashes(String text, int n) {
        Set<Long> hashes = new HashSet<>();
        long h1 = 0;
        long h2 = 0;
        long basePow1 = 1;
        long basePow2 = 1;

        for (int i = 0; i < n - 1; i++) {
            basePow1 = (basePow1 * HASH_BASE) % primeP1;
            basePow2 = (basePow2 * HASH_BASE) % primeP2;
        }

        // Initial window
        for (int i = 0; i < n; i++) {
            h1 = (h1 * HASH_BASE + text.charAt(i)) % primeP1;
            h2 = (h2 * HASH_BASE + text.charAt(i)) % primeP2;
        }
        hashes.add((h1 << 32) | (h2 & 0xFFFFFFFFL));

        // Slide window
        for (int i = n; i < text.length(); i++) {
            h1 = (h1 - text.charAt(i - n) * basePow1) % primeP1;
            if (h1 < 0) h1 += primeP1;
            h1 = (h1 * HASH_BASE + text.charAt(i)) % primeP1;

            h2 = (h2 - text.charAt(i - n) * basePow2) % primeP2;
            if (h2 < 0) h2 += primeP2;
            h2 = (h2 * HASH_BASE + text.charAt(i)) % primeP2;

            hashes.add((h1 << 32) | (h2 & 0xFFFFFFFFL));
        }

        return hashes;
    }

    /**
     * Miller-Rabin Primality Test
     */
    public static boolean isPrimeMillerRabin(long n, int iterations) {
        if (n <= 1 || n == 4) return false;
        if (n <= 3) return true;
        if (n % 2 == 0) return false;

        long d = n - 1;
        while (d % 2 == 0) {
            d /= 2;
        }

        Random rnd = new Random(42);
        for (int i = 0; i < iterations; i++) {
            long a = 2 + (Math.abs(rnd.nextLong()) % (n - 4));
            if (!millerRabinTest(d, n, a)) {
                return false;
            }
        }
        return true;
    }

    private static boolean millerRabinTest(long d, long n, long a) {
        BigInteger bigA = BigInteger.valueOf(a);
        BigInteger bigD = BigInteger.valueOf(d);
        BigInteger bigN = BigInteger.valueOf(n);

        BigInteger x = bigA.modPow(bigD, bigN);
        if (x.equals(BigInteger.ONE) || x.equals(bigN.subtract(BigInteger.ONE))) {
            return true;
        }

        while (!bigD.equals(BigInteger.valueOf(n - 1))) {
            x = x.multiply(x).mod(bigN);
            bigD = bigD.multiply(BigInteger.valueOf(2));

            if (x.equals(BigInteger.ONE)) return false;
            if (x.equals(bigN.subtract(BigInteger.ONE))) return true;
        }
        return false;
    }

    private static long findSafePrimeWithMillerRabin(long candidate) {
        long p = candidate;
        while (!isPrimeMillerRabin(p, 10)) {
            p += 2;
        }
        log.info("[MILLER-RABIN] Testing p={} → prime confirmed, using as hash modulus", p);
        return p;
    }

    /**
     * Jaccard similarity on description token sets
     */
    public double computeDescriptionJaccard(String d1, String d2) {
        if (d1 == null || d2 == null || d1.trim().isEmpty() || d2.trim().isEmpty()) {
            return 0.50; // Neutral default if description is absent
        }

        Set<String> set1 = tokenizerService.tokenizeToSet(d1);
        Set<String> set2 = tokenizerService.tokenizeToSet(d2);

        if (set1.isEmpty() && set2.isEmpty()) return 0.50;
        if (set1.isEmpty() || set2.isEmpty()) return 0.30;

        int intersection = 0;
        for (String token : set1) {
            if (set2.contains(token)) {
                intersection++;
            }
        }

        int union = set1.size() + set2.size() - intersection;
        return union > 0 ? (double) intersection / union : 0.0;
    }

    /**
     * Brand matching with corporate suffix cleanup
     */
    public boolean checkBrandMatch(String b1, String b2, String titleA, String titleB) {
        String cleanB1 = sanitizeBrand(b1);
        String cleanB2 = sanitizeBrand(b2);

        if (!cleanB1.isEmpty() && !cleanB2.isEmpty()) {
            return cleanB1.equalsIgnoreCase(cleanB2);
        }

        // If brand field missing, check leading tokens of titles
        String firstA = titleA.split("\\s+")[0].toLowerCase();
        String firstB = titleB.split("\\s+")[0].toLowerCase();
        return firstA.length() > 2 && firstA.equalsIgnoreCase(firstB);
    }

    private String sanitizeBrand(String brand) {
        if (brand == null) return "";
        return brand.toLowerCase()
                .replaceAll("\\b(inc|ltd|corp|corporation|llc|pvt|co|company|technologies)\\b", "")
                .replaceAll("[^a-z0-9]", "")
                .trim();
    }

    /**
     * Model matching: finds matching tokens that contain digits or uppercase model codes
     */
    public boolean checkModelMatch(String titleA, String titleB) {
        Set<String> modelTokensA = extractModelTokens(titleA);
        Set<String> modelTokensB = extractModelTokens(titleB);

        for (String m1 : modelTokensA) {
            if (modelTokensB.contains(m1)) {
                return true;
            }
        }
        return false;
    }

    private Set<String> extractModelTokens(String title) {
        Set<String> models = new HashSet<>();
        if (title == null) return models;

        String[] tokens = title.split("[\\s,-/]+");
        for (String token : tokens) {
            String trimmed = token.trim();
            // Likely a model code if it contains both letters and numbers, or has length >= 2 with digits
            if (trimmed.length() >= 2 && trimmed.matches(".*\\d.*") && trimmed.matches(".*[a-zA-Z].*")) {
                models.add(trimmed.toLowerCase());
            }
        }
        return models;
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() > maxLen ? text.substring(0, maxLen) + "…" : text;
    }

    public Map<String, Double> testSimilarity(String titleA, String titleB) {
        if (titleA == null || titleB == null || titleA.trim().isEmpty() || titleB.trim().isEmpty()) {
            Map<String, Double> empty = new HashMap<>();
            empty.put("kmp", 0.0);
            empty.put("rabinKarp", 0.0);
            empty.put("levenshtein", 0.0);
            empty.put("jaccard", 0.0);
            empty.put("weighted", 0.0);
            return empty;
        }

        String normA = normalizeTitle(titleA);
        String normB = normalizeTitle(titleB);

        // 1. Levenshtein Distance & Similarity
        int levDistance = computeLevenshteinDistance(normA, normB);
        int maxLen = Math.max(1, Math.max(normA.length(), normB.length()));
        double levSimilarity = Math.max(0.0, 1.0 - ((double) levDistance / maxLen));

        // 2. KMP Substring Pattern Search
        double kmp;
        if (normA.equalsIgnoreCase(normB)) {
            kmp = 1.0;
        } else if (kmpSearch(normB, normA) || kmpSearch(normA, normB)) {
            kmp = 0.95;
        } else {
            String[] tokensA = normA.split("\\s+");
            int matches = 0;
            for (String tA : tokensA) {
                if (tA.length() >= 3 && (kmpSearch(normB, tA) || kmpSearch(normA, tA))) {
                    matches++;
                }
            }
            kmp = tokensA.length > 0 ? (double) matches / tokensA.length : 0.0;
        }

        // 3. Rabin-Karp Rolling Hash (3-gram overlap)
        double rabinKarp = computeRabinKarpNgramOverlap(normA, normB, 3);

        // 4. Jaccard Token Overlap on raw/tokenized strings
        Set<String> setA = tokenizerService.tokenizeToSet(titleA);
        Set<String> setB = tokenizerService.tokenizeToSet(titleB);
        double jaccard;
        if (setA.isEmpty() && setB.isEmpty()) {
            jaccard = 1.0;
        } else if (setA.isEmpty() || setB.isEmpty()) {
            jaccard = 0.0;
        } else {
            int intersection = 0;
            for (String t : setA) {
                if (setB.contains(t)) intersection++;
            }
            int union = setA.size() + setB.size() - intersection;
            jaccard = union > 0 ? (double) intersection / union : 0.0;
        }

        // 5. Weighted composite
        double weighted = (kmp * 0.30) + (rabinKarp * 0.15) + (levSimilarity * 0.25) + (jaccard * 0.30);
        weighted = Math.max(0.0, Math.min(1.0, weighted));

        Map<String, Double> res = new HashMap<>();
        res.put("kmp", Math.round(kmp * 1000.0) / 1000.0);
        res.put("rabinKarp", Math.round(rabinKarp * 1000.0) / 1000.0);
        res.put("levenshtein", Math.round(levSimilarity * 1000.0) / 1000.0);
        res.put("jaccard", Math.round(jaccard * 1000.0) / 1000.0);
        res.put("weighted", Math.round(weighted * 1000.0) / 1000.0);
        return res;
    }
}
