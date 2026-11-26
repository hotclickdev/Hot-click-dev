package com.hotclick.agente.enlace;

import com.hotclick.dto.ResponseDTO;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Abre el enlace de compra por código (público: el código aleatorio es la credencial). Límite por IP en
 * {@code RateLimitingFilter}. Cualquier código inválido, vencido o ya usado responde el mismo 404.
 */
@RestController
@RequestMapping("/api/public/enlace")
public class EnlaceCompraPublicController {

    private final EnlaceCompraAperturaService apertura;

    public EnlaceCompraPublicController(EnlaceCompraAperturaService apertura) {
        this.apertura = apertura;
    }

    @GetMapping("/{codigo}")
    public ResponseEntity<ResponseDTO> abrir(@PathVariable String codigo) {
        return apertura.abrir(codigo)
            .map(dto -> ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ResponseDTO.success("OK", dto)))
            .orElseGet(() -> ResponseEntity.status(404).cacheControl(CacheControl.noStore())
                .body(ResponseDTO.error("Enlace no disponible")));
    }
}
