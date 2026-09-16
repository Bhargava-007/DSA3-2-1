package com.resolve.controller;

import com.resolve.service.algorithm.AlgorithmMetricsTracker;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping({"/api/admin", "/api/v1/admin"})
@RequiredArgsConstructor
public class AdminController {

    @PersistenceContext
    private final EntityManager entityManager;
    private final AlgorithmMetricsTracker metricsTracker;
    private final CacheManager cacheManager;

    @DeleteMapping("/clear-all")
    @Transactional
    public ResponseEntity<Map<String, String>> clearAllData() {
        long start = System.currentTimeMillis();

        // High-speed single round-trip database wipe on PostgreSQL with sequence reset
        try {
            entityManager.createNativeQuery(
                "TRUNCATE TABLE cluster_members, entity_clusters, candidate_pairs, pipeline_runs, products, datasets RESTART IDENTITY CASCADE"
            ).executeUpdate();
        } catch (Exception e) {
            log.warn("[ADMIN] TRUNCATE CASCADE failed ({}), falling back to direct batch DELETE", e.getMessage());
            entityManager.createNativeQuery("DELETE FROM cluster_members").executeUpdate();
            entityManager.createNativeQuery("DELETE FROM entity_clusters").executeUpdate();
            entityManager.createNativeQuery("DELETE FROM candidate_pairs").executeUpdate();
            entityManager.createNativeQuery("DELETE FROM pipeline_runs").executeUpdate();
            entityManager.createNativeQuery("DELETE FROM products").executeUpdate();
            entityManager.createNativeQuery("DELETE FROM datasets").executeUpdate();
            try {
                entityManager.createNativeQuery("ALTER SEQUENCE pipeline_runs_id_seq RESTART WITH 1").executeUpdate();
                entityManager.createNativeQuery("ALTER SEQUENCE datasets_id_seq RESTART WITH 1").executeUpdate();
                entityManager.createNativeQuery("ALTER SEQUENCE products_id_seq RESTART WITH 1").executeUpdate();
                entityManager.createNativeQuery("ALTER SEQUENCE candidate_pairs_id_seq RESTART WITH 1").executeUpdate();
                entityManager.createNativeQuery("ALTER SEQUENCE entity_clusters_id_seq RESTART WITH 1").executeUpdate();
                entityManager.createNativeQuery("ALTER SEQUENCE cluster_members_id_seq RESTART WITH 1").executeUpdate();
            } catch (Exception seqEx) {
                log.debug("[ADMIN] Sequence reset skipped: {}", seqEx.getMessage());
            }
        }

        // Reset in-memory algorithm metrics
        if (metricsTracker != null) {
            metricsTracker.reset();
        }

        // Evict all Spring caches
        if (cacheManager != null) {
            cacheManager.getCacheNames().forEach(c -> {
                var cache = cacheManager.getCache(c);
                if (cache != null) cache.clear();
            });
        }

        long elapsed = System.currentTimeMillis() - start;
        log.info("[ADMIN] Full data clear executed in {}ms - all tables wiped from database", elapsed);

        return ResponseEntity.ok(Map.of(
                "status", "cleared",
                "message", "All data wiped from database in " + elapsed + "ms"
        ));
    }
}
