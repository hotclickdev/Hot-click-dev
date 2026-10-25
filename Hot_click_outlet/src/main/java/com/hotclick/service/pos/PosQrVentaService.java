package com.hotclick.service.pos;

import com.hotclick.model.Pedido;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;

@Service
public class PosQrVentaService {

    private static final Logger log = LoggerFactory.getLogger(PosQrVentaService.class);

    @Autowired private PosQrSesionRepository posQrRepo;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PosQrSessionService   sessionService;
    @Autowired private PosQrVentaCompletionService completionService;
    @Autowired private TurnoCajaService       turnoCajaService;
    @Autowired private ConfirmadorDistintoGuard confirmadorDistintoGuard;
    @Autowired private com.hotclick.repository.PosSinpeConfirmacionRepository confirmacionRepo;
    @Autowired private com.hotclick.service.AuditoriaAdminRegistroService auditoria;
    @Autowired private PosSinpeOnvoService sinpeOnvo;

    /** Reloj inyectable (tests); en producción, hora de Costa Rica. */
    private volatile Clock clock = Clock.system(Constants.ZONA_CR);

    void setClock(Clock clock) { this.clock = Objects.requireNonNull(clock); }



    /**
     * El cliente eligió un método entre los que habilitó la caja: queda en la sesión
     * (lo usan el pedido POS y los totales del turno). Sin cambio si no está habilitado.
     */
    static void elegirMetodo(PosQrSesion sesion, String metodo) {
        if (!"PENDIENTE".equals(sesion.getEstado())) return;
        if (PosQrMetodos.habilitado(sesion, metodo) && !metodo.equals(sesion.getMetodoPago())) {
            sesion.setMetodoPago(metodo);
        }
    }

    /**
     * ALTO 3: el QR del POS ya no cobra ni confirma por Tilopay. Tarjeta queda no disponible (fail-closed)
     * hasta que exista el cobro con tarjeta por ONVO; el único cobro en línea del QR es SINPE Móvil por ONVO,
     * confirmado solo por el webhook {@code payment-intent.succeeded}.
     */
    public static final String MSG_TARJETA_NO_DISPONIBLE =
        "El pago con tarjeta por QR no está disponible. Pagá por SINPE Móvil o en caja.";

    static final String MSG_SINPE_SOLO_ONVO = "SINPE Móvil se cobra por ONVO, no por Tilopay.";

    /** Tilopay retirado del QR: nunca inicia un cobro (no habría forma válida de confirmarlo). */
    public Map<String, Object> iniciarTilopay(String token, String metodo) {
        if (PosQrMetodos.SINPE.equals(metodo)) {
            throw new IllegalStateException(MSG_SINPE_SOLO_ONVO);
        }
        sessionService.findSesionActiva(token);
        throw new IllegalStateException(MSG_TARJETA_NO_DISPONIBLE);
    }

    /** Tilopay retirado del QR: el navegador nunca confirma un cobro; solo el webhook de ONVO. */
    public boolean confirmarTilopay(String token) {
        PosQrSesion sesion = posQrRepo.findByToken(token).orElseThrow(java.util.NoSuchElementException::new);
        return "PAGADO".equals(sesion.getEstado());
    }

    @Transactional
    public boolean completarSiPagoPasarela(String pasarelaSessionId) {
        if (pasarelaSessionId == null || pasarelaSessionId.isBlank()) return false;
        PosQrSesion sesion = posQrRepo.findByStripeSessionId(pasarelaSessionId).orElse(null);
        if (sesion == null) return false;
        if ("PAGADO".equals(sesion.getEstado())) return true;
        if (!"PENDIENTE".equals(sesion.getEstado())) {
            log.warn("[POS-QR] Checkout {} en estado {}, no se completa", pasarelaSessionId, sesion.getEstado());
            return true;
        }
        if (!reclamar(sesion)) return true;
        // Ya vinculado a un pedido de tienda: no crear segundo pedido POS.
        if (sesion.getPedidoId() != null) {
            marcarPagadoSinPedidoPos(sesion);
            return true;
        }
        completionService.completarVentaTarjeta(sesion);
        return true;
    }

    /**
     * Al iniciar checkout de la tienda con el token del QR, guarda el pedido
     * sin marcar PAGADO todavía (eso ocurre al confirmar el pago).
     * El token lo ve cualquiera que escanee el QR: solo se vincula una compra de un paquete,
     * del mismo negocio y por los mismos productos que la sesión, y nunca se pisa un vínculo previo.
     */
    @Transactional
    public void vincularPedidoTienda(String posQrToken, Long pedidoId) {
        if (posQrToken == null || posQrToken.isBlank() || pedidoId == null) return;
        Pedido pedido = pedidoRepository.findById(pedidoId).orElse(null);
        if (pedido == null) return;
        PosQrSesion sesion = posQrRepo.findByToken(posQrToken).orElse(null);
        if (sesion == null) {
            log.warn("[POS-QR] Token {} no encontrado al vincular pedido {}", mascararToken(posQrToken), pedidoId);
            return;
        }
        String rechazo = esCompraDeVariosPaquetes(pedido)
            ? "la compra trae paquetes de varios negocios"
            : motivoRechazoVinculo(sesion, pedido);
        if (rechazo != null) {
            log.warn("[POS-QR] Sesión {} no se vincula a pedido {}: {}", mascararToken(posQrToken), pedidoId, rechazo);
            return;
        }
        sesion.setPedidoId(pedidoId);
        posQrRepo.save(sesion);
        log.info("[POS-QR] Sesión {} vinculada a pedido tienda {}", mascararToken(posQrToken), pedidoId);
    }

    /** Un QR de mesa es de un solo negocio: una compra con varios paquetes (grupo_pago) no se vincula. */
    private boolean esCompraDeVariosPaquetes(Pedido pedido) {
        String grupo = pedido.getGrupoPago();
        return grupo != null && !grupo.isBlank() && pedidoRepository.findByGrupoPagoOrderByIdAsc(grupo).size() > 1;
    }

    static String motivoRechazoVinculo(PosQrSesion sesion, Pedido pedido) {
        if (!"PENDIENTE".equals(sesion.getEstado())) return "estado " + sesion.getEstado();
        if (sesion.getPedidoId() != null) return "ya vinculada al pedido " + sesion.getPedidoId();
        Long empresaPedido = pedido.getEmpresa() != null ? pedido.getEmpresa().getId() : null;
        if (sesion.getEmpresa() == null || !sesion.getEmpresa().getId().equals(empresaPedido)) {
            return "el pedido es de otro negocio";
        }
        if (!Objects.equals(pedido.getSubtotal(), sesion.getTotal())) {
            return "subtotal " + pedido.getSubtotal() + " distinto del QR " + sesion.getTotal();
        }
        return null;
    }

    /**
     * Cuando el pago de la tienda confirma el pedido, avisa al cajero.
     * No crea un segundo pedido POS (el ORD-… ya descontó stock).
     */
    @Transactional
    public void marcarPagadoPorPedidoTienda(Long pedidoId) {
        if (pedidoId == null) return;
        PosQrSesion sesion = posQrRepo.findByPedidoId(pedidoId).orElse(null);
        if (sesion == null) return;
        if ("PAGADO".equals(sesion.getEstado())) return;
        if (!"PENDIENTE".equals(sesion.getEstado())) return;
        if (!reclamar(sesion)) return;
        marcarPagadoSinPedidoPos(sesion);
    }

    /** Solo la primera transacción que reclama la sesión cierra la venta; evita dos pedidos y dos sumas al turno. */
    private boolean reclamar(PosQrSesion sesion) {
        if (posQrRepo.reclamarParaCompletar(sesion.getId()) == 1) return true;
        log.info("[POS-QR] Sesión {} ya la está cerrando otra transacción", mascararToken(sesion.getToken()));
        return false;
    }

    private void marcarPagadoSinPedidoPos(PosQrSesion sesion) {
        sesion.setEstado("PAGADO");
        sesion.setFechaPago(LocalDateTime.now(Constants.ZONA_CR));
        posQrRepo.save(sesion);
        if (sesion.getTurno() != null) {
            try {
                turnoCajaService.actualizarTotales(
                    sesion.getTurno().getId(), sesion.getMetodoPago(), sesion.getTotal());
            } catch (Exception e) {
                log.warn("[POS-QR] No se pudo actualizar turno al marcar PAGADO: {}", e.getMessage());
            }
        }
        log.info("[POS-QR] Sesión {} marcada PAGADO vía pedido tienda {}", mascararToken(sesion.getToken()), sesion.getPedidoId());
    }

    @Transactional
    public String verificarEstado(String token) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if ("PAGADO".equals(sesion.getEstado()) || "CANCELADO".equals(sesion.getEstado())
                || PosQrSesion.ESTADO_REEMBOLSO_PENDIENTE.equals(sesion.getEstado())) {
            return sesion.getEstado();
        }

        if (PosSinpeOnvoService.esIntentOnvo(sesion.getStripeSessionId())) {
            return verificarSinpeOnvo(sesion);
        }

        if (!estaVigente(sesion, LocalDateTime.now(clock))) {
            sesion.setEstado("EXPIRADO");
            posQrRepo.save(sesion);
            return "EXPIRADO";
        }

        // ALTO 3: el sondeo nunca cierra una venta; solo el webhook ONVO verificado lo hace.
        return sesion.getEstado();
    }

    /**
     * SINPE por ONVO (ALTO 3): el sondeo NO cierra la venta; eso lo hace solo el webhook
     * {@code payment-intent.succeeded} ({@link #confirmarSinpeOnvoPorWebhook}). Si ONVO ya dice succeeded,
     * se espera al webhook y nunca se expira ni cancela. Vencido el timeout propio, la sesión pasa a EXPIRADO
     * solo cuando ONVO confirmó el intent cancelado.
     */
    private String verificarSinpeOnvo(PosQrSesion sesion) {
        PosSinpeOnvoService.EstadoIntent e = sinpeOnvo.estadoIntent(sesion);
        if (e == PosSinpeOnvoService.EstadoIntent.PAGADO) {
            log.info("[POS-SINPE-ONVO] Sesión {} cobrada en ONVO; se espera el webhook para cerrar",
                mascararToken(sesion.getToken()));
            return sesion.getEstado();
        }
        if (!estaVigente(sesion, LocalDateTime.now(clock))
                && (e == PosSinpeOnvoService.EstadoIntent.CANCELADO || sinpeOnvo.cancelarIntent(sesion))) {
            sesion.setEstado("EXPIRADO");
            posQrRepo.save(sesion);
            log.info("[POS-SINPE-ONVO] Sesión {} vencida; intent cancelado en ONVO", mascararToken(sesion.getToken()));
            return "EXPIRADO";
        }
        return sesion.getEstado();
    }

    /** Webhook {@code payment-intent.succeeded}: relee el intent y cierra la venta POS si coincide. */
    @Transactional
    public boolean confirmarSinpeOnvoPorWebhook(String intentId) {
        return confirmarSinpeOnvoPorWebhook(intentId, null);
    }

    /**
     * Igual que {@link #confirmarSinpeOnvoPorWebhook(String)} pero idempotente por {@code eventId}: un evento
     * ya aplicado se reconoce (2xx) sin volver a consultar ONVO ni a tocar la venta.
     */
    @Transactional
    public boolean confirmarSinpeOnvoPorWebhook(String intentId, String eventId) {
        if (intentId == null || intentId.isBlank()) return false;
        String ev = (eventId == null || eventId.isBlank()) ? null : eventId.trim();
        if (ev != null && ev.length() > 100) ev = null;
        if (ev != null && posQrRepo.existsByOnvoEventoId(ev)) {
            log.info("[POS-SINPE-ONVO] Evento ONVO duplicado ignorado");
            return true;
        }
        String pasarelaId = PosSinpeOnvoService.PREFIJO_ONVO_PI + intentId;
        PosQrSesion sesion = posQrRepo.findByStripeSessionId(pasarelaId).orElse(null);
        if (sesion == null) return false;
        if ("PAGADO".equals(sesion.getEstado())
                || PosQrSesion.ESTADO_REEMBOLSO_PENDIENTE.equals(sesion.getEstado())) return true;
        if (sinpeOnvo.estadoIntent(sesion) != PosSinpeOnvoService.EstadoIntent.PAGADO) return false;
        boolean ok = completarSiPagoPasarela(pasarelaId);
        if (ok && ev != null && sesion.getId() != null) posQrRepo.registrarEventoOnvo(sesion.getId(), ev);
        return ok;
    }

    @Transactional
    public Map<String, Object> consultarEstado(String token) {
        String estado = verificarEstado(token);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("estado", estado);
        posQrRepo.findByToken(token).ifPresent(s -> {
            if (s.getPedidoId() != null) body.put("pedidoId", s.getPedidoId());
            if (s.isReembolsoPendiente()) body.put("reembolsoPendiente", true);
            // Método con el que pagó el cliente (puede elegir entre los habilitados).
            if (s.getMetodoPago() != null) body.put("metodoPago", s.getMetodoPago());
        });
        return body;
    }

    /** Acción de auditoría (mecanismo existente {@code AuditoriaAdminRegistroService}). */
    public static final String AUDIT_SINPE_MANUAL = "POS_SINPE_CONFIRMACION_MANUAL";
    static final String MSG_SOLO_SINPE = "Esta sesión no es de pago SINPE";
    static final String MSG_SINPE_ONVO_NO_MANUAL = "Este SINPE se cobra por ONVO: se confirma solo cuando ONVO acredita el pago.";

    /**
     * Confirmación manual de SINPE en caja (decisión de Andrés, 2026-10-22). Condiciones:
     * (a) referencia obligatoria con formato y única por empresa; (b) registro inmutable
     * {@link com.hotclick.model.PosSinpeConfirmacion} + auditoría; (c) quien confirma no es quien generó la
     * venta ({@link ConfirmadorDistintoGuard}); (d) el admin la revisa en /api/admin/pos/sinpe-confirmaciones.
     */
    @Transactional
    public PosQrSesion confirmarSinpe(String token, Long usuarioId, Long empresaId, Object referenciaCruda, String notas) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if (!"PENDIENTE".equals(sesion.getEstado())) {
            throw new IllegalStateException("La sesión no está pendiente (estado: " + sesion.getEstado() + ")");
        }
        if (!empresaIdDe(sesion).equals(empresaId)) {
            throw new SecurityException("No autorizado");
        }
        exigirVigente(sesion, LocalDateTime.now(clock));
        exigirMetodoSinpe(sesion);
        if (PosSinpeOnvoService.esIntentOnvo(sesion.getStripeSessionId())) {
            // Con intent ONVO el pago se confirma solo con payment-intent.succeeded, nunca a mano.
            throw new IllegalStateException(MSG_SINPE_ONVO_NO_MANUAL);
        }
        confirmadorDistintoGuard.exigirConfirmadorDistinto(sesion, usuarioId);
        String referencia = ReferenciaSinpe.validar(referenciaCruda);
        if (confirmacionRepo.existsByEmpresaIdAndReferencia(empresaId, referencia)) {
            throw new IllegalArgumentException(ReferenciaSinpe.MSG_REPETIDA);
        }
        if (!reclamar(sesion)) {
            throw new IllegalStateException("La sesión ya se está confirmando");
        }

        completionService.completarVentaSinpe(sesion, usuarioId, notas);
        Long generoId = sesion.getUsuario() != null ? sesion.getUsuario().getId() : null;
        var registro = confirmacionRepo.saveAndFlush(new com.hotclick.model.PosSinpeConfirmacion(
            empresaId, sesion.getId(), sesion.getPedidoId(), referencia, sesion.getTotal(), generoId, usuarioId));
        auditoria.registrar(AUDIT_SINPE_MANUAL, "PosSinpeConfirmacion", registro.getId(), empresaId,
            "sesion=" + sesion.getId() + " pedido=" + sesion.getPedidoId() + " ref=" + referencia
                + " genero=" + generoId + " confirmo=" + usuarioId);
        return sesion;
    }

    @Transactional
    protected void completarVentaTarjeta(PosQrSesion sesion) {
        completionService.completarVentaTarjeta(sesion);
    }

    @Transactional
    protected void completarVentaSinpe(PosQrSesion sesion, Long usuarioId, String notas) {
        completionService.completarVentaSinpe(sesion, usuarioId, notas);
    }

    /** Fail-closed: sin fecha de expiración o ya vencida, la sesión QR no se puede confirmar (#220). */
    static void exigirVigente(PosQrSesion sesion, LocalDateTime ahora) {
        if (!estaVigente(sesion, ahora)) {
            throw new IllegalStateException("La sesión QR está vencida; generá un QR nuevo");
        }
    }

    static boolean estaVigente(PosQrSesion sesion, LocalDateTime ahora) {
        if (sesion == null || ahora == null) return false;
        LocalDateTime expira = sesion.getFechaExpiracion();
        return expira != null && ahora.isBefore(expira);
    }

    /** Fail-closed: la caja solo confirma a mano sesiones cuyo método vigente es SINPE (null incluido se rechaza). */
    static void exigirMetodoSinpe(PosQrSesion sesion) {
        if (sesion == null || !Constants.PROVEEDOR_SINPE.equals(sesion.getMetodoPago())) {
            throw new IllegalStateException(MSG_SOLO_SINPE);
        }
    }

    /** El token del QR es una credencial de cobro: en logs solo sus primeros 4 caracteres. */
    public static String mascararToken(String token) {
        if (token == null) return "null";
        return token.length() <= 4 ? "****" : token.substring(0, 4) + "****";
    }

    static boolean esMetodoPasarela(PosQrSesion sesion) {
        String metodo = sesion == null ? null : sesion.getMetodoPago();
        return "TARJETA".equals(metodo) || "SINPE".equals(metodo);
    }

    static void exigirMetodoPasarela(PosQrSesion sesion) {
        if (sesion == null || !esMetodoPasarela(sesion)) {
            throw new IllegalStateException("Esta sesión no es de pago con pasarela");
        }
    }

    static Long empresaIdDe(PosQrSesion sesion) {
        if (sesion == null) {
            throw new IllegalStateException("La sesión POS no tiene empresa");
        }
        var empresa = sesion.getEmpresa();
        if (empresa == null || empresa.getId() == null) {
            throw new IllegalStateException("La sesión POS no tiene empresa");
        }
        return empresa.getId();
    }

    static String correoCheckout(PosQrSesion sesion) {
        if (sesion.getEmpresa() == null) return null;
        String correo = sesion.getEmpresa().getCorreoEmpresa();
        return correo == null || correo.isBlank() ? null : correo;
    }

    static String descripcionCheckout(List<Map<String, Object>> items) {
        String texto = items.stream()
            .map(i -> i.getOrDefault("nombre", "Producto") + " x" + i.getOrDefault("cantidad", 1))
            .reduce((a, b) -> a + ", " + b)
            .orElse("Compra POS");
        return texto.length() <= 100 ? texto : texto.substring(0, 100);
    }
}
