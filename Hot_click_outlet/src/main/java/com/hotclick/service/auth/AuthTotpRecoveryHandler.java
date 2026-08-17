package com.hotclick.service.auth;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Usuario;
import com.hotclick.service.TwoFactorService;
import com.hotclick.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AuthTotpRecoveryHandler {

    @Autowired private UsuarioService              usuarioService;
    @Autowired private TwoFactorService            twoFactorService;
    @Autowired private PasswordEncoder             passwordEncoder;
    @Autowired private AuthSupport                 authSupport;

    public ResponseEntity<ResponseDTO> regenerateRecoveryCodes(Map<String, String> body, HttpServletRequest request) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código TOTP requerido"));
        }
        try {
            Usuario usuario = authSupport.usuarioFromRequest(request);
            if (!Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("El 2FA no está activado"));
            }
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Código incorrecto o expirado"));
            }
            List<String> plainCodes  = twoFactorService.generateRecoveryCodes();
            List<String> hashedCodes = plainCodes.stream()
                    .map(c -> passwordEncoder.encode(twoFactorService.normalizeRecoveryCode(c)))
                    .collect(Collectors.toList());
            usuario.setRecoveryCodes(twoFactorService.codesToJson(hashedCodes));
            usuarioService.guardar(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Códigos de recuperación regenerados",
                    Map.of("recoveryCodes", plainCodes)));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al regenerar códigos"));
        }
    }
}
