package com.hotclick.repository;

import com.hotclick.model.SecurityAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, Long> {

    List<SecurityAuditLog> findTop50ByOrderByTimestampDesc();

    Page<SecurityAuditLog> findByTimestampAfterOrderByTimestampDesc(LocalDateTime from, Pageable pageable);

    Page<SecurityAuditLog> findByEventTypeAndTimestampAfterOrderByTimestampDesc(
        String eventType, LocalDateTime from, Pageable pageable);

    Page<SecurityAuditLog> findBySeverityAndTimestampAfterOrderByTimestampDesc(
        String severity, LocalDateTime from, Pageable pageable);

    Page<SecurityAuditLog> findByEventTypeAndSeverityAndTimestampAfterOrderByTimestampDesc(
        String eventType, String severity, LocalDateTime from, Pageable pageable);

    @Query("SELECT s.eventType, COUNT(s) FROM SecurityAuditLog s WHERE s.timestamp > :from GROUP BY s.eventType ORDER BY COUNT(s) DESC")
    List<Object[]> countByEventTypeAfter(@Param("from") LocalDateTime from);

    @Query("SELECT s.severity, COUNT(s) FROM SecurityAuditLog s WHERE s.timestamp > :from GROUP BY s.severity")
    List<Object[]> countBySeverityAfter(@Param("from") LocalDateTime from);

    @Query("SELECT s.ipAddress, COUNT(s) FROM SecurityAuditLog s WHERE s.eventType = :eventType AND s.timestamp > :from GROUP BY s.ipAddress ORDER BY COUNT(s) DESC")
    List<Object[]> countByIpForEventTypeAfter(@Param("eventType") String eventType, @Param("from") LocalDateTime from);

    long countByTimestampAfter(LocalDateTime from);

    long countBySeverityAndTimestampAfter(String severity, LocalDateTime from);

    long countByEventTypeAndTimestampAfter(String eventType, LocalDateTime from);
}
