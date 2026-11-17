package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.InvitacionEquipoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Aceptación de invitaciones de equipo. Consulta y alta de cuenta nueva son públicas (el token ES la credencial,
 * va por /api/auth/**); aceptar con una cuenta existente exige sesión como el correo invitado.
 */
@RestController
public class InvitacionEquipoController {

    @Autowired private InvitacionEquipoService invitacionService;
    @Autowired private CompanyScope companyScope;

    @GetMapping("/api/auth/equipo-invitacion/{token}")
    public ResponseEntity<ResponseDTO> consultar(@PathVariable String token) {
        return ResponseEntity.ok(ResponseDTO.success("Invitación", invitacionService.consultar(token)));
    }

    @PostMapping("/api/auth/equipo-invitacion/{token}/aceptar-cuenta-nueva")
    public ResponseEntity<ResponseDTO> aceptarCuentaNueva(@PathVariable String token,
                                                          @RequestBody Map<String, String> body) {
        invitacionService.aceptarCuentaNueva(token, body.get("contrasena"));
        return ResponseEntity.ok(ResponseDTO.success("Ya sos parte del equipo. Iniciá sesión con tu nueva contraseña.", null));
    }

    @PostMapping("/api/equipo-invitaciones/{token}/aceptar")
    public ResponseEntity<ResponseDTO> aceptarCuentaExistente(@PathVariable String token) {
        invitacionService.aceptarCuentaExistente(token, companyScope.getCurrentUser());
        return ResponseEntity.ok(ResponseDTO.success("Ya sos parte del equipo.", null));
    }
}
