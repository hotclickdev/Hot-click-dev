package com.hotclick.controller;

import com.hotclick.dto.*;
import com.hotclick.model.EncargoPersonalizado;
import com.hotclick.service.EncargoService;
import com.hotclick.service.TurnstileFormGuard;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/public/encargos")
public class EncargoPublicController {

    private static final Logger log = LoggerFactory.getLogger(EncargoPublicController.class);

    @Autowired private EncargoService encargoService;
    @Autowired private TurnstileFormGuard turnstileFormGuard;

    /*
     * FULL-01: sin Turnstile a propósito. El formulario sube cada foto al elegirla, en paralelo
     * y antes de que el widget emita su token; el token de Cloudflare es de un solo uso y lo
     * consume el POST final. Con la clave configurada (prod) exigirlo acá rompería las subidas
     * actuales. La protección de este endpoint es el rate-limit por IP y el tope de
     * megapíxeles por header de StorageImageValidator.
     */
    @PostMapping("/imagenes")
    public ResponseEntity<ResponseDTO> subirImagen(@RequestParam("file") MultipartFile file) {
        try {
            String url = encargoService.subirImagen(file);
            return ResponseEntity.ok(ResponseDTO.success("Imagen subida", Map.of("url", url)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[encargos/imagenes] Error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body(ResponseDTO.error("Error al subir imagen: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @Valid @RequestBody EncargoCreateRequest req,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest httpRequest) {
        if (!turnstileFormGuard.verificado(req.getTurnstileToken(), httpRequest)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(TurnstileFormGuard.MSG_ANTI_BOT));
        }
        try {
            String correo = userDetails != null ? userDetails.getUsername() : null;
            EncargoPersonalizado encargo = encargoService.crear(req, correo);
            return ResponseEntity.ok(ResponseDTO.success("Encargo enviado", encargo));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/{token}")
    public ResponseEntity<ResponseDTO> porToken(@PathVariable String token) {
        EncargoPersonalizado encargo = encargoService.obtenerPorToken(token);
        return ResponseEntity.ok(ResponseDTO.success("Encargo obtenido", encargo));
    }

    @PostMapping("/{token}/checkout")
    public ResponseEntity<ResponseDTO> checkout(
            @PathVariable String token,
            @Valid @RequestBody EncargoCheckoutRequest req) {
        try {
            PaymentCheckoutResponse response = encargoService.checkoutPorToken(token, req);
            return ResponseEntity.ok(ResponseDTO.success("Checkout iniciado", response));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
