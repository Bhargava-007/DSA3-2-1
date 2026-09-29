package com.resolve.repository;

import com.resolve.model.PipelineRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PipelineRunRepository extends JpaRepository<PipelineRun, Long> {
    List<PipelineRun> findAllByOrderByStartedAtDesc();
    Optional<PipelineRun> findFirstByStatusOrderByCompletedAtDesc(String status);
}
