package com.resolve.service.algorithm;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicLong;

@Component
public class AlgorithmMetricsTracker {

    private final AtomicLong kmpPatternSearches = new AtomicLong(0);
    private final AtomicLong rabinKarpHashComparisons = new AtomicLong(0);
    private final AtomicLong levenshteinDpOperations = new AtomicLong(0);
    private final AtomicLong suffixArrayCandidateBlocks = new AtomicLong(0);
    private final AtomicLong unionFindClusterMerges = new AtomicLong(0);

    public void incrementKmpSearches(long delta) {
        kmpPatternSearches.addAndGet(delta);
    }

    public void incrementKmpSearches() {
        kmpPatternSearches.incrementAndGet();
    }

    public void incrementRabinKarpComparisons(long delta) {
        rabinKarpHashComparisons.addAndGet(delta);
    }

    public void incrementRabinKarpComparisons() {
        rabinKarpHashComparisons.incrementAndGet();
    }

    public void incrementLevenshteinOperations(long delta) {
        levenshteinDpOperations.addAndGet(delta);
    }

    public void incrementLevenshteinOperations() {
        levenshteinDpOperations.incrementAndGet();
    }

    public void incrementSuffixArrayBlocks(long delta) {
        suffixArrayCandidateBlocks.addAndGet(delta);
    }

    public void incrementSuffixArrayBlocks() {
        suffixArrayCandidateBlocks.incrementAndGet();
    }

    public void incrementUnionFindMerges(long delta) {
        unionFindClusterMerges.addAndGet(delta);
    }

    public void incrementUnionFindMerges() {
        unionFindClusterMerges.incrementAndGet();
    }

    public long getKmpPatternSearches() {
        return kmpPatternSearches.get();
    }

    public long getKmpSearches() {
        return kmpPatternSearches.get();
    }

    public long getRabinKarpHashComparisons() {
        return rabinKarpHashComparisons.get();
    }

    public long getRabinKarpComparisons() {
        return rabinKarpHashComparisons.get();
    }

    public long getLevenshteinDpOperations() {
        return levenshteinDpOperations.get();
    }

    public long getLevenshteinOperations() {
        return levenshteinDpOperations.get();
    }

    public long getSuffixArrayCandidateBlocks() {
        return suffixArrayCandidateBlocks.get();
    }

    public long getSuffixArrayBlocks() {
        return suffixArrayCandidateBlocks.get();
    }

    public long getUnionFindClusterMerges() {
        return unionFindClusterMerges.get();
    }

    public long getUnionFindMerges() {
        return unionFindClusterMerges.get();
    }

    public void reset() {
        kmpPatternSearches.set(0);
        rabinKarpHashComparisons.set(0);
        levenshteinDpOperations.set(0);
        suffixArrayCandidateBlocks.set(0);
        unionFindClusterMerges.set(0);
    }
}
