package com.hotclick.controller;

import com.hotclick.dto.AceptarInvitacionRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.invitacion.InvitacionPropietarioService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/public/invitaciones")
public class InvitacionPropietarioPublicController {

    @Autowired private InvitacionPropietarioService invitacionPropietarioService;
    @Autowired private JwtUtil jwtUtil;

    @GetMapping("/{token}")
    public ResponseEntity<ResponseDTO> ver(@PathVariable String token) {
        return ResponseEntity.ok(ResponseDTO.success(
            "Invitación", invitacionPropietarioService.verPublica(token)));
    }

    @PostMapping("/{token}/aceptar")
    public ResponseEntity<ResponseDTO> aceptar(@PathVariable String token,
                                               @RequestBody(required = false) AceptarInvitacionRequest body,
                                               HttpServletRequest request) {
        Map<String, Object> data = invitacionPropietarioService.aceptar(token, body, sesion(request));
        invitacionPropietarioService.completarOtp(data);
        return ResponseEntity.ok(ResponseDTO.success("Negocio asignado", data));
    }

    private Long sesion(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) return null;
        try {
            return jwtUtil.extractUserId(auth.substring(7));
        } catch (Exception e) {
            return null;
        }
    }
}
