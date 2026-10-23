package com.hotclick.repository;

import com.hotclick.model.PosSinpeConfirmacion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.Repository;

/** Solo alta y lectura: sin delete ni update expuestos (registro inmutable). */
public interface PosSinpeConfirmacionRepository extends Repository<PosSinpeConfirmacion, Long> {

    PosSinpeConfirmacion saveAndFlush(PosSinpeConfirmacion confirmacion);

    boolean existsByEmpresaIdAndReferencia(Long empresaId, String referencia);

    Page<PosSinpeConfirmacion> findByEmpresaIdOrderByFechaConfirmacionDesc(Long empresaId, Pageable pageable);

    Page<PosSinpeConfirmacion> findAllByOrderByFechaConfirmacionDesc(Pageable pageable);

    long count();
}
