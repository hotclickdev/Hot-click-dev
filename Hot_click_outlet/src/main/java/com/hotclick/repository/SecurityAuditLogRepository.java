package com.hotclick.repository;

import com.hotclick.model.SecurityAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    // ── Por usuario (email) ───────────────────────────────────────────────────

    List<SecurityAuditLog> findTop50ByEmailOrderByTimestampDesc(String email);

    long countByEmail(String email);

    long countByEmailAndEventType(String email, String eventType);

    @Query("SELECT DISTINCT s.ipAddress FROM SecurityAuditLog s WHERE s.email = :email AND s.ipAddress IS NOT NULL ORDER BY s.ipAddress")
    List<String> findDistinctIpsByEmail(@Param("email") String email);

    @Query("SELECT s.eventType, COUNT(s) FROM SecurityAuditLog s WHERE s.email = :email GROUP BY s.eventType ORDER BY COUNT(s) DESC")
    List<Object[]> countByEventTypeForEmail(@Param("email") String email);

    // ── Sesiones activas (logins exitosos en últimos N minutos) ──────────────

    @Query("SELECT COUNT(DISTINCT s.email) FROM SecurityAuditLog s WHERE s.eventType = 'LOGIN_SUCCESS' AND s.timestamp > :from")
    long countDistinctActiveUsers(@Param("from") LocalDateTime from);

    // ── Top IPs sospechosas (todos los tipos de evento, no solo LOGIN_FAILED) ─

    @Query("SELECT s.ipAddress, COUNT(s), MAX(s.timestamp) FROM SecurityAuditLog s WHERE s.timestamp > :from AND s.ipAddress IS NOT NULL GROUP BY s.ipAddress ORDER BY COUNT(s) DESC")
    List<Object[]> topIpsByRequests(@Param("from") LocalDateTime from, Pageable pageable);

    // ── Export (sin paginación, limitado por fecha) ───────────────────────────

    List<SecurityAuditLog> findByTimestampAfterOrderByTimestampDesc(LocalDateTime from);
}
