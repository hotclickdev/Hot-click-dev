package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Bodega;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/bodegas")
public class BodegaController {

    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private UsuarioRepository usuarioRepository;

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(
            ResponseDTO.success("Bodegas", bodegaRepository.findByEstado(Constants.ESTADO_ACTIVO))
        );
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails ud) {
        try {
            if (body.get("nombreBodega") == null || body.get("nombreBodega").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre es obligatorio"));
            if (body.get("direccionExacta") == null || body.get("direccionExacta").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("La dirección es obligatoria"));
            if (body.get("telefono") == null || body.get("telefono").isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El teléfono es obligatorio"));

            Bodega b = new Bodega();
            b.setNombreBodega(body.get("nombreBodega").trim());
            b.setDireccionExacta(body.get("direccionExacta").trim());
            b.setTelefono(body.get("telefono").trim());
            b.setCorreoContacto(body.getOrDefault("correoContacto", ""));
            b.setEncargadoNombre(body.getOrDefault("encargadoNombre", ""));
            b.setEstado(Constants.ESTADO_ACTIVO);
            b.setAdminCliente(
                usuarioRepository.findByCorreo(ud.getUsername())
                    .orElseThrow(() -> new RuntimeException("Admin no encontrado"))
            );
            return ResponseEntity.ok(ResponseDTO.success("Bodega creada", bodegaRepository.save(b)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResponseDTO> actualizar(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            Bodega b = bodegaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bodega no encontrada"));
            if (body.get("nombreBodega") != null && !body.get("nombreBodega").isBlank())
                b.setNombreBodega(body.get("nombreBodega").trim());
            if (body.get("direccionExacta") != null && !body.get("direccionExacta").isBlank())
                b.setDireccionExacta(body.get("direccionExacta").trim());
            if (body.get("telefono") != null && !body.get("telefono").isBlank())
                b.setTelefono(body.get("telefono").trim());
            if (body.get("correoContacto") != null)
                b.setCorreoContacto(body.get("correoContacto"));
            if (body.get("encargadoNombre") != null)
                b.setEncargadoNombre(body.get("encargadoNombre"));
            return ResponseEntity.ok(ResponseDTO.success("Bodega actualizada", bodegaRepository.save(b)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ResponseDTO> eliminar(@PathVariable Long id) {
        try {
            Bodega b = bodegaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bodega no encontrada"));
            b.setEstado(Constants.ESTADO_INACTIVO);
            bodegaRepository.save(b);
            return ResponseEntity.ok(ResponseDTO.success("Bodega eliminada", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }
}
