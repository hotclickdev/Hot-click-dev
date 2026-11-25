package com.hotclick.agente.canal;

import com.hotclick.agente.webhook.MensajeEntrante;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CanalCuentaRepository extends JpaRepository<CanalCuenta, Long> {

    Optional<CanalCuenta> findByTipoAndIdExterno(MensajeEntrante.Canal tipo, String idExterno);

    List<CanalCuenta> findByEmpresaIdOrderByIdAsc(Long empresaId);

    List<CanalCuenta> findAllByOrderByIdAsc();
}
