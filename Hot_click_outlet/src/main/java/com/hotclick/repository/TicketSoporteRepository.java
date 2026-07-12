package com.hotclick.repository;

import com.hotclick.model.TicketSoporte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TicketSoporteRepository extends JpaRepository<TicketSoporte, Long> {
    List<TicketSoporte> findByEmpresaIdOrderByFechaCreacionDesc(Long empresaId);
}
