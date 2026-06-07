package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Cupon;
import com.hotclick.repository.CuponRepository;
import com.hotclick.service.CuponService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/cupones")
public class CuponController {

    @Autowired private CuponService cuponService;
    @Autowired private CuponRepository cuponRepository;

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
        // Primero verificamos si el cupón existe en absoluto
        Optional<Cupon> encontrado = cuponRepository.findByCodigo(codigo.trim().toUpperCase());
        if (encontrado.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código inválido. Verificá que lo ingresaste correctamente."));
        }
        Cupon c = encontrado.get();
        if (Boolean.TRUE.equals(c.getUsado()) || c.getUsosActuales() >= c.getMaxUsos()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                "Los descuentos de este cupón se han agotado. No es posible aplicarlo."));
        }
        Optional<Cupon> cupon = cuponService.validarCodigo(codigo);
        if (cupon.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Este cupón no está disponible."));
        }
        return ResponseEntity.ok(ResponseDTO.success(
            "Cupón válido",
            Map.of("descuento", cupon.get().getDescuentoPorcentaje(), "codigo", cupon.get().getCodigo())
        ));
    }

    /** Lista todos los cupones — solo ADMIN_IT. */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN_IT')")
    public ResponseEntity<ResponseDTO> listar(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false)    Boolean usado) {
        Page<Cupon> result = usado != null
            ? cuponRepository.findByUsadoOrderByFechaCreacionDesc(usado, PageRequest.of(page, size))
            : cuponRepository.findAllByOrderByFechaCreacionDesc(PageRequest.of(page, size));
        return ResponseEntity.ok(ResponseDTO.success("ok", Map.of(
            "content",       result.getContent(),
            "totalElements", result.getTotalElements(),
            "totalPages",    result.getTotalPages(),
            "page",          result.getNumber()
        )));
    }

    /** Estadísticas de cupones — solo ADMIN_IT. */
    @GetMapping("/estadisticas")
    @PreAuthorize("hasRole('ADMIN_IT')")
    public ResponseEntity<ResponseDTO> estadisticas() {
        long total      = cuponRepository.count();
        long usados     = cuponRepository.countByUsado(true);
        long disponibles = total - usados;

        List<Integer> porcentajes = cuponRepository.findDistinctPorcentajes();
        List<Map<String, Object>> tipos = porcentajes.stream()
            .map(p -> Map.<String, Object>of(
                "porcentaje", p,
                "total",      cuponRepository.countByDescuentoPorcentaje(p),
                "usados",     cuponRepository.countByUsado(true)
            ))
            .toList();

        return ResponseEntity.ok(ResponseDTO.success("ok", Map.of(
            "total",       total,
            "usados",      usados,
            "disponibles", disponibles,
            "tipos",       tipos
        )));
    }
}
