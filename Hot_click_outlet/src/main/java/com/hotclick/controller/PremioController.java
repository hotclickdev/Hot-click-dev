package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.GiroRuleta;
import com.hotclick.model.Premio;
import com.hotclick.model.ResultadoRuleta;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PremioRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.PremioService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import com.hotclick.security.CompanyScope;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;


@RestController
@RequestMapping("/api/ruleta")
public class PremioController {

    @Autowired
    private PremioService premioService;

    @Autowired
    private PremioRepository premioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private CompanyScope companyScope;

    /** SEG-2: el usuarioId del path tiene que ser el del token (o ADMIN). */
    private boolean esPropioOAdmin(Long usuarioId) {
        if (companyScope.isAdminIT()) return true;
        Long actual = companyScope.getCurrentUserId();
        return actual != null && actual.equals(usuarioId);
    }

    private static ResponseEntity<ResponseDTO> prohibido() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ResponseDTO.error("Acceso denegado"));
    }

    @GetMapping("/premios")
    public ResponseEntity<ResponseDTO> listarPremios() {
        List<Premio> premios = premioRepository.findByActivoTrueAndEstado(Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("Premios obtenidos", premios));
    }

    @GetMapping("/giros-disponibles/{usuarioId}")
    public ResponseEntity<ResponseDTO> girosDisponibles(@PathVariable Long usuarioId) {
        if (!esPropioOAdmin(usuarioId)) return prohibido();
        Long giros = premioService.contarGirosPendientes(usuarioId);
        return ResponseEntity.ok(ResponseDTO.success("Giros disponibles", giros));
    }

    @com.hotclick.security.PermiteLector // acción personal / de comprador
    @PostMapping("/girar/{giroId}/usuario/{usuarioId}")
    public ResponseEntity<ResponseDTO> girar(
            @PathVariable Long giroId,
            @PathVariable Long usuarioId) {
        if (!esPropioOAdmin(usuarioId)) return prohibido();
        if (!premioService.giroEsDe(giroId, usuarioId)) return prohibido();
        try {
            Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
            ResultadoRuleta resultado = premioService.girar(giroId, usuario);
            return ResponseEntity.ok(ResponseDTO.success("Premio obtenido", resultado));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }

    @GetMapping("/historial/{usuarioId}")
    public ResponseEntity<ResponseDTO> historial(@PathVariable Long usuarioId) {
        if (!esPropioOAdmin(usuarioId)) return prohibido();
        return ResponseEntity.ok(ResponseDTO.success("Historial de giros",
            premioService.historialGiros(usuarioId)));
    }

    @PostMapping("/admin/asignar-giro/{usuarioId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> asignarGiro(
            @PathVariable Long usuarioId,
            @RequestParam String tipoOrigen) {
        try {
            Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
            GiroRuleta giro = premioService.asignarGiro(usuario, tipoOrigen);
            // No serializar la entidad (incluye el Usuario completo)
            return ResponseEntity.ok(ResponseDTO.success("Giro asignado", java.util.Map.of(
                "id", giro.getId(), "usuarioId", usuarioId, "tipoOrigen", String.valueOf(giro.getTipoOrigen()))));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(com.hotclick.utils.ErrorPublico.mensaje(e)));
        }
    }
}
