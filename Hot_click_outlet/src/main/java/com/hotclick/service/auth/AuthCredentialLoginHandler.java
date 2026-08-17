package com.hotclick.service.auth;

import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.SecurityDetectionService;
import com.hotclick.service.TurnstileService;
import com.hotclick.service.UsuarioService;
import com.hotclick.service.WebAuthnService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthCredentialLoginHandler {

    private static final Logger log = LoggerFactory.getLogger(AuthCredentialLoginHandler.class);

    @Autowired private UsuarioService              usuarioService;
    @Autowired private JwtUtil                     jwtUtil;
    @Autowired private PasswordEncoder             passwordEncoder;
    @Autowired private WebAuthnService             webAuthnService;
    @Autowired private MiembroEmpresaRepository    miembroEmpresaRepository;
    @Autowired private SecurityAuditService        securityAuditService;
    @Autowired private SecurityDetectionService    securityDetectionService;
    @Autowired private TurnstileService            turnstileService;
    @Autowired private AuthSupport                 authSupport;

    public ResponseEntity<?> login(JwtRequest request, HttpServletRequest httpRequest) {
        if (!turnstileService.verify(request.getTurnstileToken(), securityAuditService.getIp(httpRequest))) {
            return ResponseEntity.status(400).body(ResponseDTO.error("Verificación anti-bot fallida. Intentá de nuevo."));
        }
        Optional<Usuario> usuarioOpt = usuarioService.buscarPorCorreo(request.getCorreo());
        if (usuarioOpt.isEmpty()) {
            // Anti-enumeration: same response as wrong password
            try { securityAuditService.logLoginFailed(request.getCorreo(), httpRequest, "user_not_found"); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
            try { securityDetectionService.recordFailedLogin(securityAuditService.getIp(httpRequest), request.getCorreo()); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        Usuario usuario = usuarioOpt.get();

        // [FIX-1] Verificar bloqueo por intentos fallidos antes de validar contraseña
        if (usuario.getBloqueadoHasta() != null && LocalDateTime.now(Constants.ZONA_CR).isBefore(usuario.getBloqueadoHasta())) {
            log.warn("Login bloqueado para {}: cuenta bloqueada hasta {}", request.getCorreo(), usuario.getBloqueadoHasta());
            try { securityAuditService.logLoginBlocked(request.getCorreo(), httpRequest); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "Cuenta temporalmente bloqueada por múltiples intentos fallidos. Revisá tu correo para recuperar el acceso."));
        }

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getContrasenaHash())) {
            usuarioService.incrementarIntentosFallidos(usuario.getId());
            try { securityAuditService.logLoginFailed(request.getCorreo(), httpRequest, "wrong_password"); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
            try { securityDetectionService.recordFailedLogin(securityAuditService.getIp(httpRequest), request.getCorreo()); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        int estado = usuario.getEstado() == null ? 0 : usuario.getEstado();
        if (estado == Constants.ESTADO_PENDIENTE) {
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "Debes verificar tu correo antes de iniciar sesión. Revisá tu bandeja de entrada."));
        }
        if (estado == Constants.ESTADO_INACTIVO || estado == Constants.ESTADO_SUSPENDIDO) {
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "Tu cuenta no está activa. Contactá al administrador."));
        }
        if (estado == Constants.ESTADO_ELIMINADO) {
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        usuarioService.resetearIntentosFallidos(usuario.getId());
        usuarioService.actualizarUltimoAcceso(usuario.getId());
        try { securityAuditService.logLoginSuccess(usuario.getId(), usuario.getCorreo(), httpRequest); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }

        boolean esAdminIT = usuario.getRoles().stream()
            .anyMatch(r -> Constants.ROL_ADMIN.equals(r.getNombreRol()));

        // ADMIN con llave WebAuthn registrada → requerir autenticación WebAuthn como 2do factor
        if (esAdminIT && webAuthnService.tieneCredenciales(usuario.getCorreo())) {
            String tempToken = jwtUtil.generateTempToken(usuario.getCorreo(), usuario.getId());
            return ResponseEntity.ok(Map.of(
                "success",          true,
                "requiresWebauthn", true,
                "tempToken",        tempToken,
                "message",          "Usá tu llave de seguridad para completar el inicio de sesión."
            ));
        }

        if (Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
            String tempToken = jwtUtil.generateTempToken(usuario.getCorreo(), usuario.getId());

            // Determine which 2FA methods the user has configured
            List<String> methods = usuario.getActiveMethods();
            // Backward compat: if methods list is empty but 2FA is on → treat as TOTP
            if (methods.isEmpty()) methods = List.of(Constants.METODO_2FA_TOTP);

            if (methods.size() == 1) {
                // Single method — skip the picker, tell frontend which method to use
                String method = methods.get(0);
                String message = Constants.METODO_2FA_EMAIL_OTP.equals(method)
                    ? "Enviamos un código a tu correo"
                    : "Ingresá el código de tu app de autenticación";
                return ResponseEntity.ok(Map.of(
                    "success",     true,
                    "requires2fa", true,
                    "tempToken",   tempToken,
                    "method",      method,
                    "message",     message
                ));
            } else {
                // Multiple methods — show picker
                return ResponseEntity.ok(Map.of(
                    "success",     true,
                    "requires2fa", true,
                    "tempToken",   tempToken,
                    "methods",     methods,
                    "message",     "Seleccioná tu método de verificación"
                ));
            }
        }

        // Multi-empresa: si el usuario pertenece a 2+ negocios, pedir selección
        List<MiembroEmpresa> membresías = miembroEmpresaRepository.findByUsuarioIdAndEstado(usuario.getId(), 1);
        if (membresías.size() > 1) {
            List<Map<String, Object>> empresas = membresías.stream().map(m -> {
                Map<String, Object> e = new HashMap<>();
                e.put("id",            m.getEmpresa().getId());
                e.put("nombre",        m.getEmpresa().getNombreComercial() != null
                                           ? m.getEmpresa().getNombreComercial()
                                           : m.getEmpresa().getNombreEmpresa());
                e.put("logoUrl",       m.getEmpresa().getLogoUrl());
                e.put("slug",          m.getEmpresa().getSlug());
                e.put("estadoEmpresa", m.getEmpresa().getEstadoEmpresa());
                e.put("rol",           m.getRolEnEmpresa());
                return e;
            }).toList();
            String selToken = jwtUtil.generateEmpresaSelectionToken(usuario.getCorreo(), usuario.getId());
            return ResponseEntity.ok(Map.of(
                "success",                   true,
                "requiresEmpresaSelection",  true,
                "empresas",                  empresas,
                "tempToken",                 selToken,
                "message",                   "Seleccioná el negocio al que querés acceder"
            ));
        }

        return ResponseEntity.ok(authSupport.buildAuthResponse(usuario));
    }
}
