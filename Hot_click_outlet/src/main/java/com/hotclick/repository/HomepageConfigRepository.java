package com.hotclick.repository;

import com.hotclick.model.HomepageConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HomepageConfigRepository extends JpaRepository<HomepageConfig, Long> {
}
