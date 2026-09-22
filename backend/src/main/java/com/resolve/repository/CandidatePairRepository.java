package com.resolve.repository;

import com.resolve.model.CandidatePair;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface CandidatePairRepository extends JpaRepository<CandidatePair, Long> {
    List<CandidatePair> findByPipelineRunId(Long pipelineRunId);
    Page<CandidatePair> findByPipelineRunIdAndFinalScoreGreaterThanEqual(Long pipelineRunId, BigDecimal minScore, Pageable pageable);
    List<CandidatePair> findByPipelineRunIdAndFinalScoreGreaterThanEqual(Long pipelineRunId, BigDecimal minScore);
}
