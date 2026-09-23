package com.hotclick.repository;

import com.hotclick.model.PaqueteLinea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaqueteLineaRepository extends JpaRepository<PaqueteLinea, Long> {

    List<PaqueteLinea> findByPaqueteIdOrderByIdAsc(Long paqueteId);

    Optional<PaqueteLinea> findByPaqueteIdAndBarcode(Long paqueteId, String barcode);

    Optional<PaqueteLinea> findByIdAndPaqueteId(Long id, Long paqueteId);

    long countByPaqueteId(Long paqueteId);

    @Query("SELECT l.paquete.id, COUNT(l) FROM PaqueteLinea l WHERE l.paquete.id IN :ids GROUP BY l.paquete.id")
    List<Object[]> countGroupedByPaqueteIds(@Param("ids") Collection<Long> ids);
}
