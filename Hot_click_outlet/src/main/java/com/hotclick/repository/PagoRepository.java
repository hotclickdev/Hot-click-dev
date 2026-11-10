package com.hotclick.repository;

import com.hotclick.model.Pago;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import jakarta.persistence.QueryHint;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PagoRepository extends JpaRepository<Pago, Long> {

    Optional<Pago> findByMerchantToken(String merchantToken);

    Optional<Pago> findByOnvoReembolsoId(String onvoReembolsoId);

    /** V237: pago cuya checkout session ONVO apunta a este payment intent. */
    Optional<Pago> findFirstByOnvoPaymentIntentId(String onvoPaymentIntentId);

    /**
     * QA5 MEDIO: lote de pagos ONVO PENDIENTE con antigüedad mínima para el job de respaldo del webhook.
     * SELECT ... FOR UPDATE SKIP LOCKED (PESSIMISTIC_WRITE + lock.timeout=-2, mismo patrón que la cola de
     * facturación y la renovación): dos instancias no toman las mismas filas. El tamaño sale del Pageable.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("SELECT p FROM Pago p WHERE p.proveedor = :proveedor AND p.estadoPago = 'PENDIENTE' "
        + "AND p.merchantToken IS NOT NULL AND p.fechaCreacion <= :limite ORDER BY p.fechaCreacion ASC")
    List<Pago> reclamarPendientesParaReconsulta(@Param("proveedor") String proveedor,
                                               @Param("limite") LocalDateTime limite, Pageable pagina);

    /**
     * QA7-B1 + fix2 (conciliación durable): pagos ONVO cerrados localmente (FALLIDO o CANCELADO) con sesión que todavía
     * no quedaron resueltos sin cobro y a los que ya les toca la reconsulta ({@code conciliacion_proxima_en} vencida o
     * NULL). Sin corte por antigüedad: ningún pago se abandona por edad, solo se espacia (backoff en el servicio).
     * Si ONVO igual los cobró y el webhook se perdió, el respaldo los pasa a REEMBOLSO_PENDIENTE con aviso.
     * Orden: primero los nunca agendados, después el de próxima reconsulta más vieja. Mismo lock que los PENDIENTE
     * (FOR UPDATE SKIP LOCKED: dos instancias no toman las mismas filas).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("SELECT p FROM Pago p WHERE p.proveedor = :proveedor "
        + "AND p.estadoPago IN ('FALLIDO', 'CANCELADO') "
        + "AND p.merchantToken IS NOT NULL AND p.conciliacionResueltaEn IS NULL "
        + "AND (p.conciliacionProximaEn IS NULL OR p.conciliacionProximaEn <= :ahora) "
        + "ORDER BY p.conciliacionProximaEn ASC NULLS FIRST, p.fechaCreacion ASC")
    List<Pago> reclamarCerradosParaReconsulta(@Param("proveedor") String proveedor,
                                             @Param("ahora") LocalDateTime ahora,
                                             Pageable pagina);

    /**
     * fix2: agenda la próxima reconsulta del pago cerrado (dentro del reclamo, con la fila bloqueada). Se agenda ANTES
     * de llamar a ONVO: si el proceso muere a mitad, tras el reinicio el pago vuelve a salir cuando le toca.
     */
    @Modifying
    @Query(value = "UPDATE hot_click_pago_tb SET conciliacion_intentos = COALESCE(conciliacion_intentos, 0) + 1, "
        + "conciliacion_proxima_en = :proxima, reconsulta_cerrado_en = :ahora WHERE id_pago = :id", nativeQuery = true)
    int agendarConciliacion(@Param("id") Long id, @Param("ahora") LocalDateTime ahora,
                            @Param("proxima") LocalDateTime proxima);

    /** fix2: pago cerrado resuelto sin cobro de forma definitiva (intent canceled). Idempotente. */
    @Modifying
    @Query(value = "UPDATE hot_click_pago_tb SET conciliacion_resuelta_en = :ahora "
        + "WHERE id_pago = :id AND conciliacion_resuelta_en IS NULL", nativeQuery = true)
    int marcarConciliacionResuelta(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);

    /**
     * fix2 (BAJO): guarda el payment intent visto en la sesión sin pasar por la entidad (columna updatable=false). Solo
     * cambia si es distinto; un save obsoleto del pago ya no lo puede pisar con NULL.
     */
    @Modifying
    @Query(value = "UPDATE hot_click_pago_tb SET onvo_payment_intent_id = :intent WHERE merchant_token = :token "
        + "AND (onvo_payment_intent_id IS NULL OR onvo_payment_intent_id <> :intent)", nativeQuery = true)
    int guardarIntentId(@Param("token") String merchantToken, @Param("intent") String intentId);

    /** fix2: intent guardado leído de la base (no de una copia en memoria que puede estar vieja). */
    @Query("SELECT p.onvoPaymentIntentId FROM Pago p WHERE p.merchantToken = :token")
    Optional<String> intentIdEnBase(@Param("token") String merchantToken);

    /**
     * fix2: registra la intención explícita de cancelar (comprador o panel). La primera gana; idempotente. No cambia
     * estados: la captura y la conciliación la respetan después (cobro → REEMBOLSO_PENDIENTE, nunca confirmar).
     */
    @Modifying
    @Query(value = "UPDATE hot_click_pago_tb SET cancelacion_solicitada_en = :ahora, cancelacion_solicitada_origen = :origen "
        + "WHERE id_pago = :id AND cancelacion_solicitada_en IS NULL", nativeQuery = true)
    int registrarCancelacionSolicitada(@Param("id") Long id, @Param("ahora") LocalDateTime ahora,
                                       @Param("origen") String origen);

    /** fix2: intención de cancelar leída de la base (la entidad en memoria puede estar vieja). */
    @Query("SELECT p.cancelacionSolicitadaEn FROM Pago p WHERE p.id = :id")
    Optional<LocalDateTime> cancelacionSolicitadaEnBase(@Param("id") Long id);

    /**
     * Estado del pago en la base, sin vaciar antes los cambios pendientes de la sesión (flush COMMIT): un
     * proveedor que ya puso la copia en memoria en CAPTURADO todavía no lo escribió, así que acá se ve el
     * estado previo (p. ej. REEMBOLSO_PENDIENTE de un reintento).
     */
    @QueryHints(@QueryHint(name = "org.hibernate.flushMode", value = "COMMIT"))
    @Query("SELECT p.estadoPago FROM Pago p WHERE p.id = :id")
    String estadoPagoEnBase(@Param("id") Long id);

    /** Serializa confirmación y webhook del mismo cobro. El lock dura la transacción. */
    /** Pasa a FALLIDO solo si sigue PENDIENTE: un segundo aviso de fallo no libera reservas otra vez. */
    @Modifying
    @Query("UPDATE Pago p SET p.estadoPago = 'FALLIDO', p.fechaActualizacion = :ahora WHERE p.id = :id AND p.estadoPago = 'PENDIENTE'")
    int marcarFallidoSiPendiente(@Param("id") Long id, @Param("ahora") LocalDateTime ahora);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pago p WHERE p.merchantToken = :merchantToken")
    Optional<Pago> findByMerchantTokenForUpdate(@Param("merchantToken") String merchantToken);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoIdForUpdate(@Param("pedidoId") Long pedidoId);

    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId AND p.usuario.id = :usuarioId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoIdAndUsuarioId(Long pedidoId, Long usuarioId);

    @Query("SELECT p FROM Pago p WHERE p.pedido.id = :pedidoId ORDER BY p.fechaCreacion DESC")
    Optional<Pago> findTopByPedidoId(Long pedidoId);

    Optional<Pago> findFirstByCompra_IdOrderByFechaCreacionDesc(Long compraId);

    @Query("SELECT p FROM Pago p WHERE p.estadoPago = 'PENDIENTE' AND p.fechaCreacion < :corte")
    List<Pago> findExpiradosPendientes(LocalDateTime corte);

    /**
     * Scheduler-safe: filtra por empresa. Excluye SINPE (confirmación manual;
     * no debe cancelarse por TTL aunque el pedido ya tenga empresa).
     */
    @Query("SELECT p FROM Pago p WHERE p.estadoPago = 'PENDIENTE' AND p.fechaCreacion < :corte "
        + "AND p.pedido.empresa.id = :empresaId AND (p.proveedor IS NULL OR p.proveedor <> 'SINPE') ORDER BY p.id")
    List<Pago> findExpiradosPendientesByEmpresa(@Param("corte") LocalDateTime corte, @Param("empresaId") Long empresaId);

    @Query("SELECT p FROM Pago p WHERE (:proveedor IS NULL OR p.proveedor = :proveedor) AND (:estadoPago IS NULL OR p.estadoPago = :estadoPago) ORDER BY p.fechaCreacion DESC")
    Page<Pago> buscarPagos(@Param("proveedor") String proveedor, @Param("estadoPago") String estadoPago, Pageable pageable);

    @Query(
        value = "SELECT p FROM Pago p JOIN FETCH p.pedido ped JOIN FETCH p.usuario "
            + "WHERE (:proveedor IS NULL OR p.proveedor = :proveedor) "
            + "AND (:estadoPago IS NULL OR p.estadoPago = :estadoPago) "
            + "AND (:empresaId IS NULL OR ped.empresa.id = :empresaId) "
            + "ORDER BY p.fechaCreacion DESC",
        countQuery = "SELECT COUNT(p) FROM Pago p "
            + "WHERE (:proveedor IS NULL OR p.proveedor = :proveedor) "
            + "AND (:estadoPago IS NULL OR p.estadoPago = :estadoPago) "
            + "AND (:empresaId IS NULL OR p.pedido.empresa.id = :empresaId)")
    Page<Pago> buscarPagosByEmpresa(@Param("proveedor") String proveedor, @Param("estadoPago") String estadoPago, @Param("empresaId") Long empresaId, Pageable pageable);

    @Query("SELECT COUNT(p) FROM Pago p WHERE p.estadoPago = :estadoPago")
    long countByEstadoPago(@Param("estadoPago") String estadoPago);

    @Query("SELECT COUNT(p) FROM Pago p WHERE p.estadoPago = :estadoPago AND (:empresaId IS NULL OR p.pedido.empresa.id = :empresaId) AND p.pedido.esPrueba = false")
    long countByEstadoPagoAndEmpresa(@Param("estadoPago") String estadoPago, @Param("empresaId") Long empresaId);

    @Query("SELECT COUNT(p) FROM Pago p WHERE p.proveedor = :proveedor")
    long countByProveedor(@Param("proveedor") String proveedor);

    @Query("SELECT COUNT(p) FROM Pago p WHERE p.proveedor = :proveedor AND (:empresaId IS NULL OR p.pedido.empresa.id = :empresaId) AND p.pedido.esPrueba = false")
    long countByProveedorAndEmpresa(@Param("proveedor") String proveedor, @Param("empresaId") Long empresaId);

    // ── Regla anti-bot de reservas (QA-CONC-4) ───────────────────────────────

    @Query("SELECT p.id FROM Pago p WHERE p.id IN :ids AND p.estadoPago = 'PENDIENTE'")
    List<Long> findIdsPendientesIn(@Param("ids") java.util.Collection<Long> ids);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pago p WHERE p.id = :id")
    Optional<Pago> findByIdForUpdate(@Param("id") Long id);

    /**
     * Pagos pendientes con la marca anti-bot vencida: {@code fechaExpiracion} pasada y creados
     * hace poco. Los SINPE normales (24 h o sin expiración) quedan fuera por {@code desde}; un
     * pago de tarjeta sin marca vence a creación + 30 min y para entonces ya lo canceló
     * {@link #findExpiradosPendientesByEmpresa} en la misma corrida. Orden por id = orden de lock estable.
     */
    @Query("SELECT p.id FROM Pago p WHERE p.estadoPago = 'PENDIENTE' AND p.fechaExpiracion < :ahora "
        + "AND p.fechaCreacion > :desde AND p.pedido.empresa.id = :empresaId ORDER BY p.id")
    List<Long> findIdsReservaMarcadaVencidaByEmpresa(@Param("ahora") LocalDateTime ahora,
                                                     @Param("desde") LocalDateTime desde,
                                                     @Param("empresaId") Long empresaId);

    /** INF-03: pagos de un proveedor que siguen en un estado desde antes de un corte. */
    long countByProveedorIgnoreCaseAndEstadoPagoAndFechaCreacionBefore(
        String proveedor, String estadoPago, java.time.LocalDateTime corte);

    /** P-01: pagos SINPE marketplace por ONVO pendientes con el plazo interno cumplido. */
    List<Pago> findByProveedorAndEstadoPagoAndMerchantTokenStartingWithAndPlazoInternoSinpeBefore(
        String proveedor, String estadoPago, String prefijo, LocalDateTime corte);

    /**
     * N-01: pagos SINPE marketplace (token ONVOPI:) ya cerrados (FALLIDO/CANCELADO) y recientes, para reconsultar el
     * intent en ONVO. Rota por fechaActualizacion (el reclamo la marca): primero el revisado hace más tiempo, así
     * ninguno de la ventana queda sin revisar aunque haya más que el lote. Mismo lock que los cerrados ONVO.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("SELECT p FROM Pago p WHERE p.proveedor = :proveedor AND p.estadoPago IN ('FALLIDO', 'CANCELADO') "
        + "AND p.merchantToken LIKE CONCAT(:prefijo, '%') AND p.fechaCreacion >= :desde "
        + "ORDER BY p.fechaActualizacion ASC NULLS FIRST, p.fechaCreacion ASC")
    List<Pago> reclamarSinpeOnvoCerrados(@Param("proveedor") String proveedor, @Param("prefijo") String prefijo,
                                         @Param("desde") LocalDateTime desde,
                                         org.springframework.data.domain.Pageable pagina);
}
