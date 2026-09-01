package com.hotclick.repository;

import com.hotclick.model.EncargoEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EncargoEventoRepository extends JpaRepository<EncargoEvento, Long> {

    List<EncargoEvento> findByEncargo_IdOrderByFechaEventoDesc(Long encargoId);
}
