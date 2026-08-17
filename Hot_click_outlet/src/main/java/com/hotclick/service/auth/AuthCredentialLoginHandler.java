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
import com.hotclick.utils.EmpresaNombre;
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
    private static final String MSG_CREDENCIALES = "Credenciales inválidas";
    private static final String KEY_SUCCESS = "success";
    private static final String KEY_TEMP_TOKEN = "tempToken";
    private static final String KEY_MESSAGE = "message";

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
            return rechazarUsuarioDesconocido(request, httpRequest);
        }

        Usuario usuario = usuarioOpt.get();
        ResponseEntity<?> bloqueo = rechazarSiBloqueado(usuario, request, httpRequest);
        if (bloqueo != null) return bloqueo;
        ResponseEntity<?> clave = rechazarSiClaveIncorrecta(usuario, request, httpRequest);
        if (clave != null) return clave;
        ResponseEntity<?> estado = rechazarSiEstadoInvalido(usuario);
        if (estado != null) return estado;

        usuarioService.resetearIntentosFallidos(usuario.getId());
        usuarioService.actualizarUltimoAcceso(usuario.getId());
        AuthAuditSupport.run(log, () -> securityAuditService.logLoginSuccess(usuario.getId(), usuario.getCorreo(), httpRequest));

        boolean esAdminIT = usuario.getRoles().stream()
            .anyMatch(r -> Constants.ROL_ADMIN.equals(r.getNombreRol()));
        if (esAdminIT && webAuthnService.tieneCredenciales(usuario.getCorreo())) {
            return respuestaWebauthn(usuario);
        }
        if (Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
            return respuesta2fa(usuario);
        }
        ResponseEntity<?> multi = respuestaMultiEmpresa(usuario);
        if (multi != null) return multi;
        return ResponseEntity.ok(authSupport.buildAuthResponse(usuario));
    }

    private ResponseEntity<?> rechazarUsuarioDesconocido(JwtRequest request, HttpServletRequest httpRequest) {
        AuthAuditSupport.run(log, () -> securityAuditService.logLoginFailed(request.getCorreo(), httpRequest, "user_not_found"));
        AuthAuditSupport.run(log, () -> securityDetectionService.recordFailedLogin(securityAuditService.getIp(httpRequest), request.getCorreo()));
        return ResponseEntity.status(401).body(ResponseDTO.error(MSG_CREDENCIALES));
    }

    private ResponseEntity<?> rechazarSiBloqueado(Usuario usuario, JwtRequest request, HttpServletRequest httpRequest) {
        if (usuario.getBloqueadoHasta() == null || !LocalDateTime.now(Constants.ZONA_CR).isBefore(usuario.getBloqueadoHasta())) {
            return null;
        }
        log.warn("Login bloqueado para {}: cuenta bloqueada hasta {}", request.getCorreo(), usuario.getBloqueadoHasta());
        AuthAuditSupport.run(log, () -> securityAuditService.logLoginBlocked(request.getCorreo(), httpRequest));
        return ResponseEntity.status(403).body(ResponseDTO.error(
            "Cuenta temporalmente bloqueada por múltiples intentos fallidos. Revisá tu correo para recuperar el acceso."));
    }

    private ResponseEntity<?> rechazarSiClaveIncorrecta(Usuario usuario, JwtRequest request, HttpServletRequest httpRequest) {
        if (passwordEncoder.matches(request.getContrasena(), usuario.getContrasenaHash())) return null;
        usuarioService.incrementarIntentosFallidos(usuario.getId());
        AuthAuditSupport.run(log, () -> securityAuditService.logLoginFailed(request.getCorreo(), httpRequest, "wrong_password"));
        AuthAuditSupport.run(log, () -> securityDetectionService.recordFailedLogin(securityAuditService.getIp(httpRequest), request.getCorreo()));
        return ResponseEntity.status(401).body(ResponseDTO.error(MSG_CREDENCIALES));
    }

    private ResponseEntity<?> rechazarSiEstadoInvalido(Usuario usuario) {
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
            return ResponseEntity.status(401).body(ResponseDTO.error(MSG_CREDENCIALES));
        }
        return null;
    }

    private ResponseEntity<?> respuestaWebauthn(Usuario usuario) {
        String tempToken = jwtUtil.generateTempToken(usuario.getCorreo(), usuario.getId());
        return ResponseEntity.ok(Map.of(
            KEY_SUCCESS, true,
            "requiresWebauthn", true,
            KEY_TEMP_TOKEN, tempToken,
            KEY_MESSAGE, "Usá tu llave de seguridad para completar el inicio de sesión."
        ));
    }

    private ResponseEntity<?> respuesta2fa(Usuario usuario) {
        String tempToken = jwtUtil.generateTempToken(usuario.getCorreo(), usuario.getId());
        List<String> methods = usuario.getActiveMethods();
        if (methods.isEmpty()) methods = List.of(Constants.METODO_2FA_TOTP);
        if (methods.size() == 1) {
            String method = methods.get(0);
            String message = Constants.METODO_2FA_EMAIL_OTP.equals(method)
                ? "Enviamos un código a tu correo"
                : "Ingresá el código de tu app de autenticación";
            return ResponseEntity.ok(Map.of(
                KEY_SUCCESS, true,
                "requires2fa", true,
                KEY_TEMP_TOKEN, tempToken,
                "method", method,
                KEY_MESSAGE, message
            ));
        }
        return ResponseEntity.ok(Map.of(
            KEY_SUCCESS, true,
            "requires2fa", true,
            KEY_TEMP_TOKEN, tempToken,
            "methods", methods,
            KEY_MESSAGE, "Seleccioná tu método de verificación"
        ));
    }

    private ResponseEntity<?> respuestaMultiEmpresa(Usuario usuario) {
        List<MiembroEmpresa> membresías = miembroEmpresaRepository.findByUsuarioIdAndEstado(usuario.getId(), 1);
        if (membresías.size() <= 1) return null;
        List<Map<String, Object>> empresas = membresías.stream().map(m -> {
            Map<String, Object> e = new HashMap<>();
            e.put("id", m.getEmpresa().getId());
            e.put("nombre", EmpresaNombre.mostrar(m.getEmpresa(), m.getEmpresa().getNombreEmpresa()));
            e.put("logoUrl", m.getEmpresa().getLogoUrl());
            e.put("slug", m.getEmpresa().getSlug());
            e.put("estadoEmpresa", m.getEmpresa().getEstadoEmpresa());
            e.put("rol", m.getRolEnEmpresa());
            return e;
        }).toList();
        String selToken = jwtUtil.generateEmpresaSelectionToken(usuario.getCorreo(), usuario.getId());
        return ResponseEntity.ok(Map.of(
            KEY_SUCCESS, true,
            "requiresEmpresaSelection", true,
            "empresas", empresas,
            KEY_TEMP_TOKEN, selToken,
            KEY_MESSAGE, "Seleccioná el negocio al que querés acceder"
        ));
    }
}
