package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.PosQrSesion;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.PosQrService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.service.pos.PosQrSessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoints para el flujo de pago QR desde el POS.
 * - Rutas autenticadas (/api/pos/qr): crean y gestionan sesiones.
 * - Rutas públicas (/api/pos/qr/pago): el cliente escanea el QR y paga.
 */
@RestController
@RequestMapping("/api/pos/qr")
public class PosQrController {

    private static final Logger log = LoggerFactory.getLogger(PosQrController.class);

    // BAJO 4: respuestas con mensajes constantes; el detalle de la excepción solo va al log.
    static final String MSG_ERROR_GENERAR_QR = "Error al generar QR";
    static final String MSG_DATOS_QR_INVALIDOS = "Revisá los productos, las cantidades y el método de pago.";
    static final String MSG_SIN_STOCK_QR = "No hay stock suficiente para generar el QR.";
    static final String MSG_PAGO_TARJETA_NO_INICIADO = "No se pudo iniciar el pago con tarjeta";
    static final String MSG_SINPE_NO_INICIADO = "No se pudo iniciar el SINPE Móvil. Generá un QR nuevo o cobrá con otro método.";

    /** Mensajes de negocio ya constantes que sí se pueden mostrar tal cual. */
    static final String MSG_SIN_TURNO_QR = "Abrí caja antes de vender: no tenés un turno abierto.";
    static final String MSG_SINPE_SOLO_WEBHOOK =
        "SINPE Móvil se confirma solo cuando ONVO acredita el pago; la confirmación manual está retirada.";
    static final String MSG_TILOPAY_RETIRADO = "Pago con Tilopay retirado. Pagá por SINPE Móvil o en caja.";

    private static final java.util.Set<String> MSG_CREAR_PUBLICOS = java.util.Set.of(
        com.hotclick.service.pos.PosQrStockReserva.MSG_TOPE_PENDIENTES,
        com.hotclick.service.pos.PosQrSessionService.MSG_NO_APROBADO);

    @Autowired private PosQrService    posQrService;
    @Autowired private JwtUtil         jwtUtil;
    @Autowired private TurnoCajaService turnoCajaService;

    // ── AUTH: cajero crea sesión ────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> crearSesion(@RequestBody Map<String, Object> body,
                                          HttpServletRequest request) {
        try {
            Long usuarioId  = extractUserId(request);
            Long empresaId  = extractEmpresaId(request);
            String metodo   = (String) body.getOrDefault("metodoPago", "TARJETA");
            Object metodos  = body.get("metodosPago");
            @SuppressWarnings("unchecked")
            var items = (java.util.List<Map<String, Object>>) body.get("items");
            String notas    = (String) body.get("notas");
            Long clienteId  = PosQrSessionService.longOpcional(body.get("clienteId"));
            Long bodegaId   = PosQrSessionService.longOpcional(body.get("bodegaId"));

            // E2E-POS-01: igual que la venta en efectivo, no hay cobro QR fuera de un turno de caja abierto.
            Long turnoId = turnoCajaService.getTurnoActivo(usuarioId)
                .map(t -> t.getId()).orElse(null);
            if (turnoId == null) {
                return ResponseEntity.badRequest().body(ResponseDTO.error(MSG_SIN_TURNO_QR));
            }

            return ResponseEntity.ok(ResponseDTO.success("QR generado",
                posQrService.crearSesion(usuarioId, empresaId, turnoId, metodo, metodos, items, notas, clienteId, bodegaId)));
        } catch (Exception e) {
            log.error("[POS-QR] Error creando sesión: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(mensajeCrear(e)));
        }
    }

    /**
     * E2E-POS-03 (decisión vigente 2026-10-25, reemplaza la del 2026-10-22): SINPE Móvil del POS se confirma
     * SOLO con el webhook ONVO {@code payment-intent.succeeded}. La confirmación manual con referencia quedó
     * retirada: la ruta responde 410 y nunca cambia el estado de la sesión.
     */
    @PutMapping("/{token}/confirmar-sinpe")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> confirmarSinpe(@PathVariable String token) {
        return ResponseEntity.status(410).body(ResponseDTO.error(MSG_SINPE_SOLO_WEBHOOK));
    }

    @DeleteMapping("/{token}")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> cancelar(@PathVariable String token, HttpServletRequest request) {
        try {
            Long empresaId = extractEmpresaId(request);
            posQrService.cancelar(token, empresaId);
            return ResponseEntity.ok(ResponseDTO.success("Sesión cancelada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    // ── PÚBLICO: el cliente escanea el QR ──────────────────────

    /** Info de la sesión para mostrar al cliente (productos + total + método). */
    @GetMapping("/pago/{token}")
    public ResponseEntity<?> infoPublica(@PathVariable String token) {
        try {
            return ResponseEntity.ok(posQrService.getInfoPublica(token));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "QR no encontrado o expirado"));
        }
    }

    /** Comprobante del cobro pagado ("Ver comprobante" en la página del QR). */
    @GetMapping("/pago/{token}/comprobante")
    public ResponseEntity<?> comprobante(@PathVariable String token) {
        try {
            return ResponseEntity.ok(posQrService.getComprobante(token));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "QR no encontrado"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of("error", "El cobro todavía no está pagado"));
        }
    }

    /** E2E-POS-02: Tilopay retirado del QR. La ruta queda solo para responder 410 a clientes viejos. */
    @PostMapping("/pago/{token}/tilopay")
    public ResponseEntity<?> iniciarTilopay(@PathVariable String token) {
        return tilopayRetirado(token);
    }

    /** Datos del pagador para SINPE Móvil por ONVO (identificación según tipo ONVO 0-5/9 y SINPE del pagador). */
    public record SinpeOnvoRequest(String identificacion, Integer tipoIdentificacion, String telefono) {}

    /**
     * Cliente inicia SINPE Móvil por ONVO: crea y confirma el intent ANTES de transferir y devuelve
     * el destino y el monto exacto. El pago se da por hecho solo con payment-intent.succeeded.
     */
    @PostMapping("/pago/{token}/sinpe-onvo")
    public ResponseEntity<?> iniciarSinpeOnvo(@PathVariable String token, @RequestBody(required = false) SinpeOnvoRequest body) {
        try {
            SinpeOnvoRequest b = body == null ? new SinpeOnvoRequest(null, null, null) : body;
            return ResponseEntity.ok(posQrService.iniciarSinpeOnvo(token, b.identificacion(), b.tipoIdentificacion(), b.telefono()));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "QR no encontrado o expirado"));
        } catch (IllegalArgumentException e) {
            // Mensaje constante: nunca se devuelve el detalle de la excepción (podría venir de ONVO o de un parser).
            return ResponseEntity.badRequest().body(Map.of("error", com.hotclick.service.pos.PosSinpeOnvoService.MSG_IDENTIFICACION));
        } catch (IllegalStateException e) {
            log.warn("[POS-SINPE-ONVO] No iniciado token={}: {}",
                com.hotclick.service.pos.PosQrVentaService.mascararToken(token), e.getMessage());
            boolean noDisponible = com.hotclick.service.pos.PosSinpeOnvoService.MSG_NO_DISPONIBLE.equals(e.getMessage());
            return ResponseEntity.status(noDisponible ? 503 : 409).body(Map.of("error",
                noDisponible ? com.hotclick.service.pos.PosSinpeOnvoService.MSG_NO_DISPONIBLE : MSG_SINPE_NO_INICIADO));
        } catch (RuntimeException e) {
            log.error("[POS-SINPE-ONVO] ONVO falló token={}: {}",
                com.hotclick.service.pos.PosQrVentaService.mascararToken(token), e.getMessage());
            return ResponseEntity.status(503).body(Map.of("error", "SINPE Móvil no disponible en este momento. Probá de nuevo o pagá con tarjeta."));
        }
    }

    /** E2E-POS-02: retirado; el estado del cobro se consulta en /pago/{token}/estado. */
    @PostMapping("/pago/{token}/tilopay/confirmar")
    public ResponseEntity<?> confirmarTilopay(@PathVariable String token) {
        return tilopayRetirado(token);
    }

    /** QR inexistente → 404 (no revela nada nuevo); existente → 410 Gone. Nunca inicia ni confirma un cobro. */
    private ResponseEntity<?> tilopayRetirado(String token) {
        try {
            posQrService.consultarEstado(token);
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "QR no encontrado"));
        }
        return ResponseEntity.status(410).body(Map.of("error", MSG_TILOPAY_RETIRADO));
    }

    /** Polling de estado — cajero y cliente consultan si el pago está confirmado. */
    @GetMapping("/pago/{token}/estado")
    public ResponseEntity<?> estado(@PathVariable String token) {
        try {
            return ResponseEntity.ok(posQrService.consultarEstado(token));
        } catch (java.util.NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("error", "Sesión no encontrada"));
        }
    }

    // ── helpers ────────────────────────────────────────────────

    private Long extractUserId(HttpServletRequest req) {
        return jwtUtil.extractUserId(req.getHeader("Authorization").substring(7));
    }

    private Long extractEmpresaId(HttpServletRequest req) {
        Long id = jwtUtil.extractEmpresaId(req.getHeader("Authorization").substring(7));
        if (id == null) throw new IllegalStateException("No hay empresa en el token");
        return id;
    }

    /** Solo devuelve constantes conocidas; cualquier otro detalle queda en el log. */
    static String mensajePagoTarjeta(IllegalStateException e) {
        String detalle = e.getMessage();
        if (com.hotclick.service.pos.PosQrVentaService.MSG_TARJETA_NO_DISPONIBLE.equals(detalle)) {
            return com.hotclick.service.pos.PosQrVentaService.MSG_TARJETA_NO_DISPONIBLE;
        }
        if (com.hotclick.service.pos.PosQrVentaService.MSG_SINPE_SOLO_ONVO.equals(detalle)) {
            return com.hotclick.service.pos.PosQrVentaService.MSG_SINPE_SOLO_ONVO;
        }
        return MSG_PAGO_TARJETA_NO_INICIADO;
    }

    /** Mensaje constante para el error al generar el QR (nunca el texto crudo de la excepción). */
    static String mensajeCrear(Exception e) {
        if (e instanceof com.hotclick.exception.StockInsuficienteException) return MSG_SIN_STOCK_QR;
        if (e instanceof IllegalArgumentException) return MSG_DATOS_QR_INVALIDOS;
        String detalle = e.getMessage();
        for (String publico : MSG_CREAR_PUBLICOS) {
            if (publico.equals(detalle)) return publico;
        }
        return MSG_ERROR_GENERAR_QR;
    }
}
