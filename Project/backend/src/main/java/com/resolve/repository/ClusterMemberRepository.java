package com.resolve.repository;

import com.resolve.model.ClusterMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClusterMemberRepository extends JpaRepository<ClusterMember, Long> {
    List<ClusterMember> findByClusterId(Long clusterId);
}
