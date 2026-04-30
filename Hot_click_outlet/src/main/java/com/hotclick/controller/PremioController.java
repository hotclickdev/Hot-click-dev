package com.hotclick.controller;

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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/ruleta")
public class PremioController {

    @Autowired
    private PremioService premioService;

    @Autowired
    private PremioRepository premioRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @GetMapping("/premios")
    public ResponseEntity<ResponseDTO> listarPremios() {
        List<Premio> premios = premioRepository.findByActivoTrueAndEstado(Constants.ESTADO_ACTIVO);
        return ResponseEntity.ok(ResponseDTO.success("Premios obtenidos", premios));
    }

    @GetMapping("/giros-disponibles/{usuarioId}")
    public ResponseEntity<ResponseDTO> girosDisponibles(@PathVariable Long usuarioId) {
        Long giros = premioService.contarGirosPendientes(usuarioId);
        return ResponseEntity.ok(ResponseDTO.success("Giros disponibles", giros));
    }

    @PostMapping("/girar/{giroId}/usuario/{usuarioId}")
    public ResponseEntity<ResponseDTO> girar(
            @PathVariable Long giroId,
            @PathVariable Long usuarioId) {
        try {
            Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            ResultadoRuleta resultado = premioService.girar(giroId, usuario);
            return ResponseEntity.ok(ResponseDTO.success("Premio obtenido", resultado));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @GetMapping("/historial/{usuarioId}")
    public ResponseEntity<ResponseDTO> historial(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(ResponseDTO.success("Historial de giros",
            premioService.historialGiros(usuarioId)));
    }

    @PostMapping("/admin/asignar-giro/{usuarioId}")
    public ResponseEntity<ResponseDTO> asignarGiro(
            @PathVariable Long usuarioId,
            @RequestParam String tipoOrigen) {
        try {
            Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            GiroRuleta giro = premioService.asignarGiro(usuario, tipoOrigen);
            return ResponseEntity.ok(ResponseDTO.success("Giro asignado", giro));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
