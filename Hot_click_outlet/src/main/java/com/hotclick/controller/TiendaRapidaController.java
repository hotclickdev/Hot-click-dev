package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.consola.TiendaRapidaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@PreAuthorize("hasRole('ADMIN')")
@RequestMapping("/api/admin/consola/tiendas-rapidas")
public class TiendaRapidaController {

    private final TiendaRapidaService tiendas;
    private final UsuarioRepository usuarios;

    public TiendaRapidaController(TiendaRapidaService tiendas, UsuarioRepository usuarios) {
        this.tiendas = tiendas;
        this.usuarios = usuarios;
    }

    @GetMapping
    public ResponseEntity<ResponseDTO> listar() {
        return ResponseEntity.ok(ResponseDTO.success("Tiendas rápidas", tiendas.listar()));
    }

    @PostMapping
    public ResponseEntity<ResponseDTO> crear(@RequestBody Map<String, Object> body,
                                             @AuthenticationPrincipal UserDetails ud) {
        Integer dias = body.get("dias") instanceof Number numero ? numero.intValue() : null;
        Long admin = ud == null ? null : usuarios.findByCorreo(ud.getUsername()).map(u -> u.getId()).orElse(null);
        return ResponseEntity.ok(ResponseDTO.success("Tienda rápida",
            tiendas.crear(texto(body.get("negocio")), texto(body.get("persona")), texto(body.get("telefono")), dias, admin)));
    }

    /** Enlace nuevo de un solo uso; el anterior deja de servir. El token solo viaja en esta respuesta. */
    @PostMapping("/{id}/regenerar")
    public ResponseEntity<ResponseDTO> regenerar(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Enlace nuevo", tiendas.regenerar(id)));
    }

    @PostMapping("/{id}/revocar")
    public ResponseEntity<ResponseDTO> revocar(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Enlace anulado", tiendas.revocar(id)));
    }

    private static String texto(Object valor) {
        return valor == null ? "" : valor.toString();
    }
}
