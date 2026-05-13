package com.hotclick.repository;

import com.hotclick.model.PrecioSugerido;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrecioSugeridoRepository extends JpaRepository<PrecioSugerido, Long> {
    List<PrecioSugerido> findByProductoIdOrderByFechaExtraccionDesc(Long productoId);
    void deleteByProductoId(Long productoId);
}
