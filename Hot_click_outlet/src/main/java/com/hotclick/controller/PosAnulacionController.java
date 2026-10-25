package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.PosAnulacion;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.pos.PosAnulacionService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.function.Supplier;

/** A3: anular (CAJERO en su turno abierto; dueño/ADMIN siempre) y devolver (solo dueño/ADMIN) ventas POS. */
@RestController
@RequestMapping("/api/pos")
public class PosAnulacionController {

    private static final Logger log = LoggerFactory.getLogger(PosAnulacionController.class);

    private final PosAnulacionService service;
    private final JwtUtil jwtUtil;

    public PosAnulacionController(PosAnulacionService service, JwtUtil jwtUtil) {
        this.service = service;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/ventas/{pedidoId}/anular")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> anular(@PathVariable Long pedidoId, @RequestBody(required = false) Map<String, Object> body,
                                    HttpServletRequest request) {
        return responder("Venta anulada", () -> service.anular(pedidoId, empresaToken(request), motivo(body)));
    }

    @PostMapping("/ventas/{pedidoId}/devolver")
    @PreAuthorize("hasAuthority('pos.usar') or hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> devolver(@PathVariable Long pedidoId, @RequestBody(required = false) Map<String, Object> body,
                                      HttpServletRequest request) {
        return responder("Devolución registrada", () -> service.devolver(pedidoId, empresaToken(request), motivo(body)));
    }

    @GetMapping("/anulaciones")
    @PreAuthorize("hasAnyRole('ADMIN','EMPRENDEDOR')")
    public ResponseEntity<?> bitacora(@RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "50") int size, HttpServletRequest request) {
        // SCALE1: paginado, tope PosAnulacionService.MAX_LIST_BITACORA por página.
        return responder("OK", () -> service.bitacora(empresaToken(request), page, size));
    }

    private ResponseEntity<?> responder(String ok, Supplier<Object> accion) {
        try {
            return ResponseEntity.ok(ResponseDTO.success(ok, aVista(accion.get())));
        } catch (TenantAccessDeniedException | SecurityException | AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ResponseDTO.error(publico(e, MSG_403)));
        } catch (RecursoNoEncontradoException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ResponseDTO.error("Venta no encontrada"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ResponseDTO.error(publico(e, MSG_400)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(publico(e, MSG_400)));
        } catch (Exception e) {
            log.error("[POS] Error en anulación/devolución ({})", e.getClass().getSimpleName());
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No se pudo registrar la operación"));
        }
    }

    static final String MSG_403 = "No tenés permiso para esta operación.";
    static final String MSG_400 = "No se pudo procesar la solicitud.";

    /** Solo mensajes de la lista blanca del servicio llegan al cliente; el resto se reemplaza. */
    static String publico(Exception e, String porDefecto) {
        String m = e.getMessage();
        return m != null && PosAnulacionService.MENSAJES_PUBLICOS.contains(m) ? m : porDefecto;
    }

    private static Object aVista(Object o) {
        return o instanceof PosAnulacion a ? fila(a)
            : o instanceof java.util.List<?> l ? l.stream().map(x -> x instanceof PosAnulacion a ? fila(a) : x).toList()
            : o;
    }

    private static Map<String, Object> fila(PosAnulacion a) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("tipo", a.getTipo());
        m.put("pedidoId", a.getPedidoId());
        m.put("turnoId", a.getTurnoId());
        m.put("estadoTurno", a.getEstadoTurno());
        m.put("usuarioId", a.getUsuarioId());
        m.put("rolActor", a.getRolActor());
        m.put("motivo", a.getMotivo());
        m.put("monto", a.getMonto());
        m.put("fecha", a.getFecha());
        return m;
    }

    private static String motivo(Map<String, Object> body) {
        Object m = body != null ? body.get("motivo") : null;
        return m != null ? m.toString() : null;
    }

    private Long empresaToken(HttpServletRequest request) {
        String h = request.getHeader("Authorization");
        if (h == null || !h.startsWith("Bearer ")) throw new SecurityException("Sesión no válida");
        return jwtUtil.extractEmpresaId(h.substring(7));
    }
}
