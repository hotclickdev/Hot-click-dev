package com.hotclick.repository;

import com.hotclick.model.SolicitudCambioPlan;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SolicitudCambioPlanRepository extends JpaRepository<SolicitudCambioPlan, Long> {

    boolean existsByEmpresaIdAndRevisadaFalse(Long empresaId);

    List<SolicitudCambioPlan> findAllByOrderByRevisadaAscFechaSolicitudDesc(Pageable pageable);
}
