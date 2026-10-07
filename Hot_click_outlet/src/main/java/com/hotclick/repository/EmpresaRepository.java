package com.hotclick.repository;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmpresaRepository extends JpaRepository<Empresa, Long> {

    Optional<Empresa> findBySlug(String slug);

    /**
     * Tiendas públicas para sitemap y directorio.
     * Columnas: slug, nombre visible, tagline, logo, provincia de la bodega de venta o la primera con provincia.
     */
    @Query(nativeQuery = true, value =
        "SELECT e.slug, " +
        "COALESCE(NULLIF(trim(e.nombre_comercial), ''), e.nombre_empresa), " +
        "e.tagline, e.logo_url, " +
        "COALESCE(NULLIF(trim(bo.provincia), ''), (" +
        "  SELECT b.provincia FROM hot_click_bodega_tb b " +
        "  WHERE b.fk_id_empresa = e.id_empresa " +
        "  AND b.provincia IS NOT NULL AND trim(b.provincia) <> '' " +
        "  ORDER BY b.id_bodega LIMIT 1)) " +
        "FROM hot_click_empresa_tb e " +
        "LEFT JOIN hot_click_bodega_tb bo ON bo.id_bodega = e.fk_id_bodega_venta_online " +
        "WHERE e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE " +
        "AND e.slug IS NOT NULL AND trim(e.slug) <> '' " +
        "ORDER BY 2")
    List<Object[]> findTiendasPublicasSeo();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Empresa e WHERE e.id = :id")
    Optional<Empresa> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT e FROM Empresa e LEFT JOIN FETCH e.plan WHERE e.id = :id")
    Optional<Empresa> findByIdWithPlan(@Param("id") Long id);

    /** Plan efectivo para la API pública: el del Plan estructurado o, si no hay, plan_saas. */
    @Query("SELECT COALESCE(p.nombre, e.planSaas) FROM Empresa e LEFT JOIN e.plan p WHERE e.id = :id")
    Optional<String> findNombrePlanEfectivo(@Param("id") Long id);

    /**
     * Negocios visibles para el visitante (activos y públicos) con su plan efectivo y la cantidad de productos
     * publicados. Solo campos de vitrina: el directorio y el buscador nunca reciben contacto del vendedor.
     */
    @Query("SELECT e.slug AS slug, COALESCE(NULLIF(e.nombreComercial, ''), e.nombreEmpresa) AS nombre, "
        + "e.logoUrl AS logoUrl, e.categoriaNegocio AS categoria, COALESCE(p.nombre, e.planSaas) AS plan, "
        + "(SELECT COUNT(pr.id) FROM Producto pr WHERE pr.empresa = e AND pr.estado = 1 AND pr.visibleCatalogo = true "
        + "AND pr.stockActual > 0 AND pr.vendido = false) AS productos "
        + "FROM Empresa e LEFT JOIN e.plan p "
        + "WHERE e.estadoEmpresa = 'ACTIVO' AND e.visibilidadPublica = true AND e.slug IS NOT NULL ORDER BY e.id ASC")
    List<NegocioPublicoFila> findNegociosPublicos(Pageable pageable);

    @Query("SELECT e FROM Empresa e LEFT JOIN FETCH e.plan ORDER BY e.fechaRegistro DESC")
    List<Empresa> findAllWithPlanOrderByFechaRegistroDesc();

    Optional<Empresa> findByCorreoEmpresa(String correoEmpresa);

    boolean existsBySlug(String slug);

    boolean existsByCorreoEmpresa(String correoEmpresa);

    long countByEstadoEmpresa(String estadoEmpresa);

    List<Empresa> findByEstadoEmpresaOrderByFechaRegistroDesc(String estadoEmpresa);

    List<Empresa> findByEstadoEmpresaOrderByFechaRegistroAsc(String estadoEmpresa);

    @Query("""
        SELECT e FROM Empresa e
        WHERE LOWER(COALESCE(e.nombreComercial, e.nombreEmpresa)) LIKE LOWER(CONCAT('%', :q, '%'))
        ORDER BY e.id ASC
        """)
    List<Empresa> buscarPorNombre(@Param("q") String q, Pageable pageable);

    List<Empresa> findAllByOrderByFechaRegistroDesc();

    Optional<Empresa> findFirstByEstadoEmpresaOrderByIdAsc(String estadoEmpresa);

    // Cursor-based paging para schedulers — carga solo IDs, no entidades completas.
    // Evita OOM al iterar miles de tenants: cada página libera la anterior del heap.
    @Query("SELECT e.id FROM Empresa e WHERE e.estadoEmpresa = :estado AND e.id > :cursor ORDER BY e.id ASC")
    List<Long> findIdsByEstadoAfterCursor(@Param("estado") String estado,
                                          @Param("cursor") Long cursor,
                                          Pageable pageable);

    /** Batch UPDATE: degrada plan y estado de múltiples empresas en un solo statement. */
    @Modifying
    @Transactional
    @Query("UPDATE Empresa e SET e.plan = :planBase, e.planSaas = :nombrePlan, e.estadoPlan = 'VENCIDO', e.fechaVencPlan = :hoy WHERE e.id IN :ids")
    int degradarPlanBatch(@Param("ids") List<Long> ids,
                          @Param("planBase") Plan planBase,
                          @Param("nombrePlan") String nombrePlan,
                          @Param("hoy") LocalDate hoy);
}
