package com.resolve.repository;

import com.resolve.model.EntityCluster;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EntityClusterRepository extends JpaRepository<EntityCluster, Long> {
    List<EntityCluster> findByPipelineRunId(Long pipelineRunId);
    Page<EntityCluster> findByPipelineRunId(Long pipelineRunId, Pageable pageable);
}
