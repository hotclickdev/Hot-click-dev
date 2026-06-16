package com.hotclick.repository;

import com.hotclick.model.Cupon;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.Optional;

public interface CuponRepository extends JpaRepository<Cupon, Long> {
    Optional<Cupon> findByCodigo(String codigo);
    Optional<Cupon> findByCodigoAndEmpresaId(String codigo, Long empresaId);
    boolean existsByEmail(String email);
    Page<Cupon> findAllByOrderByFechaCreacionDesc(Pageable pageable);
    Page<Cupon> findByUsadoOrderByFechaCreacionDesc(Boolean usado, Pageable pageable);
    long countByUsado(Boolean usado);
    @Query("SELECT DISTINCT c.descuentoPorcentaje FROM Cupon c ORDER BY c.descuentoPorcentaje")
    java.util.List<Integer> findDistinctPorcentajes();
    long countByDescuentoPorcentaje(Integer porcentaje);

    /**
     * Incrementa usos_actuales solo si aún hay usos disponibles (usosActuales < maxUsos).
     * Retorna 1 si se incrementó, 0 si el cupón ya alcanzó su límite.
     * La operación es atómica a nivel de BD para evitar race conditions.
     */
    @Modifying
    @Query("UPDATE Cupon c SET c.usosActuales = c.usosActuales + 1, c.fechaUso = :ahora " +
           "WHERE c.codigo = :codigo AND c.usosActuales < c.maxUsos")
    int incrementarUsoSiDisponible(@Param("codigo") String codigo, @Param("ahora") LocalDateTime ahora);

    /** Bloquea el cupón si ya alcanzó su límite de usos. */
    @Modifying
    @Query("UPDATE Cupon c SET c.usado = true WHERE c.codigo = :codigo AND c.usosActuales >= c.maxUsos")
    void bloquearSiAlcanzaLimite(@Param("codigo") String codigo);

    /** Variante tenant-aware: el código de cupón es único por empresa, no global. */
    @Modifying
    @Query("UPDATE Cupon c SET c.usosActuales = c.usosActuales + 1, c.fechaUso = :ahora " +
           "WHERE c.codigo = :codigo AND c.empresa.id = :empresaId AND c.usosActuales < c.maxUsos")
    int incrementarUsoSiDisponiblePorEmpresa(@Param("codigo") String codigo,
                                              @Param("empresaId") Long empresaId,
                                              @Param("ahora") LocalDateTime ahora);

    @Modifying
    @Query("UPDATE Cupon c SET c.usado = true WHERE c.codigo = :codigo AND c.empresa.id = :empresaId AND c.usosActuales >= c.maxUsos")
    void bloquearSiAlcanzaLimitePorEmpresa(@Param("codigo") String codigo, @Param("empresaId") Long empresaId);
}
