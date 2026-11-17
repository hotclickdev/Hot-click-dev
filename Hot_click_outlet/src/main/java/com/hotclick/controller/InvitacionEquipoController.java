package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.InvitacionEquipoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

    // El token va en el BODY, nunca en el path ni en la query (el path se filtra a logs, analítica y Sentry).
    @PostMapping("/api/auth/equipo-invitacion/consultar")
    public ResponseEntity<ResponseDTO> consultar(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ResponseDTO.success("Invitación", invitacionService.consultar(body.get("token"))));
    }

    @PostMapping("/api/auth/equipo-invitacion/aceptar-cuenta-nueva")
    public ResponseEntity<ResponseDTO> aceptarCuentaNueva(@RequestBody Map<String, String> body) {
        invitacionService.aceptarCuentaNueva(body.get("token"), body.get("contrasena"));
        return ResponseEntity.ok(ResponseDTO.success("Ya sos parte del equipo. Iniciá sesión con tu nueva contraseña.", null));
    }

    @PostMapping("/api/equipo-invitaciones/aceptar")
    public ResponseEntity<ResponseDTO> aceptarCuentaExistente(@RequestBody Map<String, String> body) {
        invitacionService.aceptarCuentaExistente(body.get("token"), companyScope.getCurrentUser());
        return ResponseEntity.ok(ResponseDTO.success("Ya sos parte del equipo.", null));
    }
}
