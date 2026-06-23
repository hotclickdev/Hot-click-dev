package com.hotclick.repository;

import com.hotclick.model.CotizacionCliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CotizacionClienteRepository extends JpaRepository<CotizacionCliente, Long> {

    List<CotizacionCliente> findByEmpresaIdAndEstadoOrderByNombreComercialAsc(Long empresaId, Integer estado);

    boolean existsByEmpresaIdAndCedulaJuridicaAndEstado(Long empresaId, String cedulaJuridica, Integer estado);
}
