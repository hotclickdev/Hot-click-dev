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
        "WHERE e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE AND (e.estado_plan IS NULL OR e.estado_plan <> 'REQUIERE_MEMBRESIA') " +
        "AND e.slug IS NOT NULL AND trim(e.slug) <> '' AND e.es_prueba = FALSE " +
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
        + "WHERE e.estadoEmpresa = 'ACTIVO' AND e.visibilidadPublica = true AND e.esPrueba = false AND (e.estadoPlan IS NULL OR e.estadoPlan <> 'REQUIERE_MEMBRESIA') AND e.slug IS NOT NULL ORDER BY e.id ASC")
    List<NegocioPublicoFila> findNegociosPublicos(Pageable pageable);

    /**
     * Candidatos del carrusel «Negocio destacado»: solo catálogo público (empresa ACTIVO y visible, con al menos
     * un producto activo, visible_catalogo, con stock y sin vender). Incluye cuántos de esos productos tienen foto.
     */
    @Query("SELECT e.id AS id, e.slug AS slug, COALESCE(NULLIF(e.nombreComercial, ''), e.nombreEmpresa) AS nombre, "
        + "e.logoUrl AS logoUrl, e.categoriaNegocio AS categoria, COALESCE(p.nombre, e.planSaas) AS plan, "
        + "(SELECT COUNT(pr.id) FROM Producto pr WHERE pr.empresa = e AND pr.estado = 1 AND pr.visibleCatalogo = true "
        + "AND pr.stockActual > 0 AND pr.vendido = false) AS productos, "
        + "(SELECT COUNT(pf.id) FROM Producto pf WHERE pf.empresa = e AND pf.estado = 1 AND pf.visibleCatalogo = true "
        + "AND pf.stockActual > 0 AND pf.vendido = false AND pf.imagenPrincipalUrl IS NOT NULL "
        + "AND pf.imagenPrincipalUrl <> '') AS conFoto, "
        + "e.destacado AS destacado, e.destacadoOrden AS destacadoOrden, e.destacadoDesde AS destacadoDesde "
        + "FROM Empresa e LEFT JOIN e.plan p "
        + "WHERE e.estadoEmpresa = 'ACTIVO' AND e.visibilidadPublica = true AND e.esPrueba = false AND (e.estadoPlan IS NULL OR e.estadoPlan <> 'REQUIERE_MEMBRESIA') AND e.slug IS NOT NULL ORDER BY e.id ASC")
    List<NegocioDestacadoFila> findCandidatosDestacados(Pageable pageable);

    @Query("SELECT e FROM Empresa e LEFT JOIN FETCH e.plan ORDER BY e.fechaRegistro DESC")
    List<Empresa> findAllWithPlanOrderByFechaRegistroDesc();

    Optional<Empresa> findByCorreoEmpresa(String correoEmpresa);

    boolean existsBySlug(String slug);

    boolean existsByCorreoEmpresa(String correoEmpresa);

    /** BAJO correo-normalizado: detecta tiendas antiguas guardadas con mayúsculas. */
    boolean existsByCorreoEmpresaIgnoreCase(String correoEmpresa);

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

    /** Suscripción impaga (día 9): suspende solo tiendas ACTIVO. No borra nada. */
    @Modifying
    @Transactional
    @Query("UPDATE Empresa e SET e.estadoEmpresa = 'SUSPENDIDO_IMPAGO' WHERE e.id IN :ids AND e.estadoEmpresa = 'ACTIVO'")
    int suspenderPorImpagoBatch(@Param("ids") List<Long> ids);

    /** Admin: suspensión manual por impago, solo desde ACTIVO. Devuelve 0 si la tienda ya no estaba ACTIVO. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("UPDATE Empresa e SET e.estadoEmpresa = 'SUSPENDIDO_IMPAGO' WHERE e.id = :id AND e.estadoEmpresa = 'ACTIVO'")
    int suspenderPorImpagoManual(@Param("id") Long id);

    /** Admin "Dar 3 días extra": solo desde SUSPENDIDO_IMPAGO. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("UPDATE Empresa e SET e.estadoEmpresa = 'EXTENSION_IMPAGO' WHERE e.id = :id AND e.estadoEmpresa = 'SUSPENDIDO_IMPAGO'")
    int pasarAExtensionImpago(@Param("id") Long id);

    /** Al vencer la extensión vuelve a la suspensión de #333 (no toca tiendas que ya pagaron). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("UPDATE Empresa e SET e.estadoEmpresa = 'SUSPENDIDO_IMPAGO' WHERE e.id IN :ids AND e.estadoEmpresa = 'EXTENSION_IMPAGO'")
    int volverASuspensionImpago(@Param("ids") List<Long> ids);

    @Query("SELECT e.id FROM Empresa e WHERE e.estadoEmpresa = :estado")
    List<Long> findIdsByEstadoEmpresa(@Param("estado") String estado);

    @Query("SELECT e.estadoEmpresa FROM Empresa e WHERE e.id = :id")
    Optional<String> findEstadoEmpresaById(@Param("id") Long id);

    /** Batch UPDATE: degrada plan y estado de múltiples empresas en un solo statement. */
    @Modifying
    @Transactional
    @Query("UPDATE Empresa e SET e.plan = :planBase, e.planSaas = :nombrePlan, e.estadoPlan = 'VENCIDO', e.fechaVencPlan = :hoy WHERE e.id IN :ids")
    int degradarPlanBatch(@Param("ids") List<Long> ids,
                          @Param("planBase") Plan planBase,
                          @Param("nombrePlan") String nombrePlan,
                          @Param("hoy") LocalDate hoy);

    /** Admin impago (anti N+1): id, nombre y estado en una sola consulta, con tope. */
    @Query("SELECT e.id, e.nombreEmpresa, e.estadoEmpresa FROM Empresa e WHERE e.estadoEmpresa IN :estados ORDER BY e.id")
    List<Object[]> findResumenByEstados(@Param("estados") java.util.Collection<String> estados,
                                        org.springframework.data.domain.Pageable page);

    /** Base fiscal: inscripciones declaradas (con datos) que un ADMIN aún no verificó; primero las que Hacienda confirmó y luego las más antiguas. */
    @Query("SELECT e FROM Empresa e WHERE e.situacionFiscal IN ('INSCRITO', 'REGIMEN_SIMPLIFICADO') "
        + "AND e.fiscalVerificado = false AND e.cedulaFiscal IS NOT NULL "
        + "ORDER BY CASE WHEN e.fiscalVerifAuto = 'COINCIDE' THEN 0 ELSE 1 END, e.fechaSituacionFiscal ASC")
    List<Empresa> findFiscalPendientes(Pageable pageable);

    /** Base fiscal: otros negocios que declararon la misma cédula (tope por Pageable). */
    @Query("SELECT e.id FROM Empresa e WHERE e.cedulaFiscal = :cedula AND e.id <> :id ORDER BY e.id")
    List<Long> idsConMismaCedulaFiscal(@Param("cedula") String cedula, @Param("id") Long id, Pageable pageable);

    /** Base fiscal: de estas cédulas, las que declaran 2 o más negocios. */
    @Query("SELECT e.cedulaFiscal FROM Empresa e WHERE e.cedulaFiscal IN :cedulas "
        + "GROUP BY e.cedulaFiscal HAVING COUNT(e) > 1")
    List<String> cedulasFiscalesRepetidas(@Param("cedulas") java.util.Collection<String> cedulas);

    /**
     * Base fiscal: escribe SOLO las columnas fiscales de "Ya me inscribí" (la consulta a Hacienda ya se hizo fuera de
     * transacción), sin pisar el resto de la fila con una copia vieja de la entidad. Anula una verificación previa.
     */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("UPDATE Empresa e SET e.situacionFiscal = :situacion, e.cedulaFiscal = :cedula, e.nombreFiscal = :nombre, "
        + "e.actividadFiscal = :actividad, e.correoFacturacion = :correo, e.fechaSituacionFiscal = :fecha, "
        + "e.fiscalVerificado = false, e.fiscalVerificadoPor = null, e.fechaFiscalVerificado = null, "
        + "e.fiscalVerifAuto = :auto, e.fiscalVerifAutoDetalle = :detalle, e.fiscalVerifAutoFecha = :fecha, "
        + "e.fiscalDeclaracionFecha = :fecha, e.fiscalDeclaracionPor = :declaroPor WHERE e.id = :id")
    int actualizarInscripcionFiscal(@Param("id") Long id, @Param("situacion") String situacion,
                                    @Param("cedula") String cedula, @Param("nombre") String nombre,
                                    @Param("actividad") String actividad, @Param("correo") String correo,
                                    @Param("fecha") java.time.LocalDateTime fecha, @Param("auto") String auto,
                                    @Param("detalle") String detalle, @Param("declaroPor") Long declaroPor);

    /** Base fiscal: guarda solo el resultado de la comprobación, y solo si los datos consultados siguen siendo los mismos. */
    @Modifying(clearAutomatically = true)
    @Transactional
    @Query("UPDATE Empresa e SET e.fiscalVerifAuto = :auto, e.fiscalVerifAutoDetalle = :detalle, "
        + "e.fiscalVerifAutoFecha = :fecha WHERE e.id = :id AND e.cedulaFiscal = :cedula "
        + "AND e.fechaSituacionFiscal = :fechaSituacion")
    int actualizarVerifAutoFiscal(@Param("id") Long id, @Param("cedula") String cedula,
                                  @Param("fechaSituacion") java.time.LocalDateTime fechaSituacion,
                                  @Param("auto") String auto, @Param("detalle") String detalle,
                                  @Param("fecha") java.time.LocalDateTime fecha);
}
