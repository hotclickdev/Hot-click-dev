package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.service.pedido.SeguimientoPedidoPublicoService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Seguimiento de pedido sin cuenta (Figma 44:1701). Público: el acceso lo da el token del
 * enlace que llega por correo. Rate limit por IP en {@code RateLimitingFilter}.
 */
@RestController
@RequestMapping("/api/public/pedidos/seguimiento")
public class SeguimientoPedidoPublicoController {

    /** Mismo mensaje para token mal formado, inexistente o eliminado: no se revela si el pedido existe. */
    static final String MSG_NO_DISPONIBLE = "No encontramos un pedido con este enlace.";

    private final SeguimientoPedidoPublicoService seguimientoService;

    public SeguimientoPedidoPublicoController(SeguimientoPedidoPublicoService seguimientoService) {
        this.seguimientoService = seguimientoService;
    }

    @GetMapping("/{token}")
    public ResponseEntity<ResponseDTO> porToken(@PathVariable String token) {
        return seguimientoService.porToken(token)
            .map(dto -> ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Robots-Tag", "noindex, nofollow")
                .body(ResponseDTO.success("Seguimiento del pedido", dto)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                .cacheControl(CacheControl.noStore())
                .body(ResponseDTO.error(MSG_NO_DISPONIBLE)));
    }
}
