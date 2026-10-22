package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.payment.EstadoPagoPublicoService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * S4-22 (Frontend #179): estado del pago desde la página de gracias, sin sesión. El acceso lo da el
 * {@code estadoPagoToken} firmado del checkout; sin token válido responde 404 sin revelar si el pedido existe.
 */
@RestController
@RequestMapping("/api/public/pedidos")
public class EstadoPagoPublicoController {

    static final String MSG_NO_DISPONIBLE = "No encontramos un pedido con este enlace.";

    private final EstadoPagoPublicoService service;

    public EstadoPagoPublicoController(EstadoPagoPublicoService service) {
        this.service = service;
    }

    @GetMapping("/{numero}/estado-pago")
    public ResponseEntity<ResponseDTO> estadoPago(@PathVariable String numero,
                                                  @RequestParam(required = false) String token) {
        return service.consultar(numero, token)
            .map(data -> ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Robots-Tag", "noindex, nofollow")
                .body(ResponseDTO.success("Estado del pago", data)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                .cacheControl(CacheControl.noStore())
                .body(ResponseDTO.error(MSG_NO_DISPONIBLE)));
    }
}
