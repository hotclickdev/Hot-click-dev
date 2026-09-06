package com.hotclick.repository;

import com.hotclick.model.ComprobanteFiscal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ComprobanteFiscalRepository extends JpaRepository<ComprobanteFiscal, Long> {

    Optional<ComprobanteFiscal> findByClaveNumerica(String claveNumerica);

    Optional<ComprobanteFiscal> findByPedidoId(Long pedidoId);

    /** Listado admin con filtros opcionales por estado y rango de fecha de emisión. */
    @Query("SELECT c FROM ComprobanteFiscal c WHERE c.empresa.id = :empresaId " +
           "AND (:estado IS NULL OR c.estado = :estado) " +
           "AND (:desde IS NULL OR c.fechaEmision >= :desde) " +
           "AND (:hasta IS NULL OR c.fechaEmision <= :hasta)")
    Page<ComprobanteFiscal> findByEmpresaIdConFiltros(
        @Param("empresaId") Long empresaId,
        @Param("estado") String estado,
        @Param("desde") LocalDateTime desde,
        @Param("hasta") LocalDateTime hasta,
        Pageable pageable);

    /** Comprobantes pendientes de consulta a Hacienda (retry job). */
    @Query("SELECT c FROM ComprobanteFiscal c WHERE c.empresa.id = :empresaId " +
           "AND c.estado IN ('ENVIADO', 'ERROR') AND c.intentosEnvio < 5")
    List<ComprobanteFiscal> findPendientesDeConsulta(@Param("empresaId") Long empresaId);

    /** Todos los pendientes de envío/consulta del sistema (para el cron global). */
    @Query("SELECT c FROM ComprobanteFiscal c WHERE c.estado IN ('PENDIENTE', 'ENVIADO') " +
           "AND c.intentosEnvio < 5 ORDER BY c.fechaEmision ASC")
    List<ComprobanteFiscal> findTodosPendientes();

    boolean existsByPedidoIdAndEstadoIn(Long pedidoId, List<String> estados);
}
