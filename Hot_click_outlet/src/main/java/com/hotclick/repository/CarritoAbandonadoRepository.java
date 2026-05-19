package com.hotclick.repository;

import com.hotclick.model.CarritoAbandonado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CarritoAbandonadoRepository extends JpaRepository<CarritoAbandonado, Long> {

    Optional<CarritoAbandonado> findFirstBySessionIdAndStatusOrderByCreatedAtDesc(String sessionId, String status);

    List<CarritoAbandonado> findByStatusAndCreatedAtBefore(String status, LocalDateTime fecha);

    void deleteBySessionId(String sessionId);
}
