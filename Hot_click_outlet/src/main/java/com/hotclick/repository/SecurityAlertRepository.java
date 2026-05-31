package com.hotclick.repository;

import com.hotclick.model.SecurityAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SecurityAlertRepository extends JpaRepository<SecurityAlert, Long> {

    List<SecurityAlert> findByResolvedFalseOrderByCreatedAtDesc();

    List<SecurityAlert> findByResolvedOrderByCreatedAtDesc(Boolean resolved);

    List<SecurityAlert> findTop10ByResolvedFalseOrderByCreatedAtDesc();

    long countByResolvedFalse();

    long countBySeverityAndResolvedFalse(String severity);
}
