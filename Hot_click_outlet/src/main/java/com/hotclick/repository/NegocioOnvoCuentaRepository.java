package com.hotclick.repository;

import com.hotclick.model.NegocioOnvoCuenta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NegocioOnvoCuentaRepository extends JpaRepository<NegocioOnvoCuenta, Long> {
    Optional<NegocioOnvoCuenta> findByEmpresaIdAndProveedorAndModo(Long empresaId, String proveedor, String modo);

    /** Estado efectivo: PAUSADA (pausa de HotClick) gana; sin fila de cuenta es SIN_CUENTA. */
    String ESTADO_EFECTIVO = "(CASE WHEN e.cobrosPausados = TRUE THEN 'PAUSADA' "
        + "WHEN c.id IS NULL THEN 'SIN_CUENTA' ELSE c.estado END)";
    String DESDE = " FROM Empresa e LEFT JOIN e.plan p "
        + "LEFT JOIN NegocioOnvoCuenta c ON c.empresaId = e.id AND c.proveedor = 'ONVO' AND c.modo = :modo "
        + "WHERE (:estado IS NULL OR " + ESTADO_EFECTIVO + " = :estado)";

    /** S3-22: lista del admin ONVO, paginada. */
    @Query(value = "SELECT e.id AS id, COALESCE(e.nombreComercial, e.nombreEmpresa) AS nombre, p.nombre AS plan, "
        + "c.pctComision AS porcentajeOnvo, p.comisionPorcentaje AS porcentajePlan, "
        + ESTADO_EFECTIVO + " AS estado" + DESDE + " ORDER BY e.id",
        countQuery = "SELECT COUNT(e)" + DESDE)
    Page<AdminOnvoNegocioFila> listarParaAdmin(@Param("modo") String modo, @Param("estado") String estado,
                                               Pageable pageable);
}
