package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Cupon;
import com.hotclick.service.CuponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/cupones")
public class CuponController {

    @Autowired private CuponService cuponService;

    /** Solicita un cupón de bienvenida — un uso por email. */
    @PostMapping("/solicitar")
    public ResponseEntity<ResponseDTO> solicitar(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo es requerido"));
        }
        try {
            Cupon cupon = cuponService.solicitarCupon(email);
            return ResponseEntity.ok(ResponseDTO.success(
                "Cupón enviado a tu correo",
                Map.of("codigo", cupon.getCodigo(), "descuento", cupon.getDescuentoPorcentaje())
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ResponseDTO.error("No se pudo generar el cupón"));
        }
    }

    /** Valida un código antes de aplicarlo en checkout. */
    @GetMapping("/validar")
    public ResponseEntity<ResponseDTO> validar(@RequestParam String codigo) {
        Optional<Cupon> cupon = cuponService.validarCodigo(codigo);
        if (cupon.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código inválido o ya utilizado"));
        }
        return ResponseEntity.ok(ResponseDTO.success(
            "Cupón válido",
            Map.of("descuento", cupon.get().getDescuentoPorcentaje(), "codigo", cupon.get().getCodigo())
        ));
    }
}
