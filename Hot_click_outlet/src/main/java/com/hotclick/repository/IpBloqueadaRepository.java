package com.hotclick.repository;

import com.hotclick.model.IpBloqueada;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface IpBloqueadaRepository extends JpaRepository<IpBloqueada, Long> {

    Optional<IpBloqueada> findByIpAddressAndActivaTrue(String ipAddress);

    boolean existsByIpAddressAndActivaTrue(String ipAddress);

    List<IpBloqueada> findAllByOrderByFechaBloqueoDesc();

    // Limpieza de IPs expiradas (DataRetentionScheduler)
    List<IpBloqueada> findByActivaTrueAndExpiresAtBefore(LocalDateTime now);
}
