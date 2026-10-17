package com.hotclick.controller.pendientes;

import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

/** S5-21 (esqueleto): reembolso pedido por el comprador. Plazo y montos: decisión del dueño (S5-05). */
@RestController
@RequestMapping("/api/pedidos/{id}/reembolso")
@PreAuthorize("isAuthenticated()")
public class ReembolsoCompradorController {

    static final Set<String> MOTIVOS = Set.of("NO_LLEGO", "LLEGO_DANADO", "NO_ES_LO_QUE_PEDI", "OTRO");
    private static final String FALTA = "política de reembolsos (plazo, montos y ejecución con ONVO, S5-05)";

    private final PedidoRepository pedidoRepository;
    private final CompanyScope companyScope;

    public ReembolsoCompradorController(PedidoRepository pedidoRepository, CompanyScope companyScope) {
        this.pedidoRepository = pedidoRepository;
        this.companyScope = companyScope;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> ver(@PathVariable Long id) {
        ResponseEntity<Map<String, Object>> denegado = exigirComprador(id);
        return denegado != null ? denegado : PendienteDecision.respuesta("S5-21", FALTA);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> pedir(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        ResponseEntity<Map<String, Object>> denegado = exigirComprador(id);
        if (denegado != null) return denegado;
        Object items = body != null ? body.get("itemIds") : null;
        if (!(items instanceof java.util.Collection<?> l) || l.isEmpty()) {
            return PendienteDecision.error(HttpStatus.BAD_REQUEST, "SIN_ITEMS", "Elegí al menos un producto");
        }
        Object motivo = body.get("motivo");
        if (motivo == null || !MOTIVOS.contains(motivo.toString())) {
            return PendienteDecision.error(HttpStatus.BAD_REQUEST, "MOTIVO_INVALIDO", "Motivo no válido");
        }
        return PendienteDecision.respuesta("S5-21", FALTA);
    }

    /** Solo el comprador dueño del pedido; 404 si no existe, 403 si es de otra persona. */
    private ResponseEntity<Map<String, Object>> exigirComprador(Long id) {
        Pedido p = pedidoRepository.findById(id).orElse(null);
        if (p == null) return PendienteDecision.error(HttpStatus.NOT_FOUND, "PEDIDO_NO_ENCONTRADO", "Pedido no encontrado");
        Long yo = companyScope.getCurrentUserId();
        if (yo == null || p.getUsuarioFinal() == null || !yo.equals(p.getUsuarioFinal().getId())) {
            return PendienteDecision.error(HttpStatus.FORBIDDEN, "SIN_ACCESO_PEDIDO", "Este pedido no es tuyo");
        }
        return null;
    }
}
