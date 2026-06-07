package com.hotclick.controller;

import com.hotclick.dto.AuthResponse;
import com.hotclick.dto.JwtRequest;
import com.hotclick.dto.RegisterRequest;
import com.hotclick.dto.RegistroEmpresaDTO;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.UpgradeEmprendedorDTO;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.service.EmailVerificationService;
import com.hotclick.service.EmprendedorRegistroService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.SecurityDetectionService;
import com.hotclick.service.TwoFactorService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired private UsuarioService              usuarioService;
    @Autowired private com.hotclick.repository.UsuarioRepository usuarioRepository;
    @Autowired private JwtUtil                     jwtUtil;
    @Autowired private PasswordResetService        passwordResetService;
    @Autowired private EmailVerificationService    emailVerificationService;
    @Autowired private TwoFactorService            twoFactorService;
    @Autowired private RefreshTokenService         refreshTokenService;
    @Autowired private PasswordEncoder             passwordEncoder;
    @Autowired private EmprendedorRegistroService  emprendedorRegistroService;
    @Autowired private MiembroEmpresaRepository    miembroEmpresaRepository;
    @Autowired private EmpresaRepository           empresaRepository;
    @Autowired private RolRepository               rolRepository;
    @Autowired private PermisoRepository           permisoRepository;
    @Autowired private NotificacionEmailService    notificacionEmailService;
    @Autowired private com.hotclick.service.OtpService  otpService;
    @Autowired private SecurityAuditService              securityAuditService;
    @Autowired private SecurityDetectionService          securityDetectionService;

    // ── Registro ──────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO> register(@Valid @RequestBody RegisterRequest req) {
        try {
            Usuario usuario = new Usuario();
            usuario.setNombre(req.getNombre().trim());
            usuario.setCorreo(req.getCorreo().trim().toLowerCase());
            usuario.setContrasenaHash(passwordEncoder.encode(req.getContrasena()));
            if (req.getTelefono() != null) usuario.setTelefono(req.getTelefono().trim());
            Usuario nuevo = usuarioService.registrarSolicitud(usuario);
            return ResponseEntity.ok(ResponseDTO.success(
                "Solicitud enviada. Un administrador revisará y activará tu cuenta pronto.", nuevo));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    /**
     * Upgrades an authenticated USUARIO_FINAL to EMPRENDEDOR by registering their business.
     * Used after social login (Clerk) when the user wants to sell on HOTCLICK.
     */
    @PostMapping("/upgrade-emprendedor")
    public ResponseEntity<ResponseDTO> upgradeEmprendedor(
            @RequestBody UpgradeEmprendedorDTO dto,
            HttpServletRequest request) {
        try {
            Usuario usuario = usuarioFromRequest(request);
            Usuario upgraded = emprendedorRegistroService.upgradeExistingUser(
                usuario,
                dto.getNombreEmpresa(),
                dto.getNombreComercial(),
                dto.getTelefonoEmpresa(),
                dto.getCorreoEmpresa()
            );
            // Reload with roles + empresa for token generation
            upgraded = usuarioRepository.findByCorreo(upgraded.getCorreo())
                .orElse(upgraded);
            AuthResponse resp = buildAuthResponse(upgraded);
            return ResponseEntity.ok(ResponseDTO.success("Negocio registrado exitosamente", resp));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[upgrade-emprendedor] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al registrar el negocio"));
        }
    }

    @PostMapping("/registro-empresa")
    public ResponseEntity<ResponseDTO> registroEmpresa(@RequestBody RegistroEmpresaDTO dto) {
        try {
            Usuario emprendedor = emprendedorRegistroService.registrar(dto);
            // OTP fuera de la transacción para no marcar rollback-only
            boolean otpEnviado = false;
            String otpError = null;
            try {
                otpService.enviarOtp(emprendedor, Constants.OTP_TIPO_REGISTRO);
                otpEnviado = true;
            } catch (Exception e) {
                log.error("[registro-empresa] Error al enviar OTP a {}: {}", emprendedor.getCorreo(), e.getMessage(), e);
                otpError = e.getMessage();
            }
            AuthResponse authResponse = buildAuthResponse(emprendedor);
            Map<String, Object> resultado = new HashMap<>();
            resultado.put("accessToken",  authResponse.getAccessToken());
            resultado.put("refreshToken", authResponse.getRefreshToken());
            resultado.put("id",           authResponse.getId());
            resultado.put("correo",       authResponse.getCorreo());
            resultado.put("rol",          authResponse.getRol());
            resultado.put("nombre",       authResponse.getNombre());
            resultado.put("empresaId",    authResponse.getEmpresaId());
            resultado.put("empresaSlug",  authResponse.getEmpresaSlug());
            resultado.put("empresaNombre",authResponse.getEmpresaNombre());
            resultado.put("otpEnviado",   otpEnviado);
            if (otpError != null) resultado.put("otpError", otpError);
            return ResponseEntity.ok(ResponseDTO.success("Empresa registrada exitosamente", resultado));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[registro-empresa] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al registrar la empresa"));
        }
    }

    @PostMapping("/reenviar-codigo-negocio")
    public ResponseEntity<ResponseDTO> reenviarCodigoNegocio(HttpServletRequest request) {
        try {
            Usuario usuario = usuarioFromRequest(request);
            otpService.enviarOtp(usuario, Constants.OTP_TIPO_REGISTRO);
            return ResponseEntity.ok(ResponseDTO.success("Código reenviado a " + usuario.getCorreo(), null));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            String msg = e.getMessage();
            log.error("[reenviar-codigo-negocio] {}", msg, e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                msg != null && !msg.isBlank() ? msg : "Error al reenviar el código"));
        }
    }

    @PostMapping("/verificar-correo-negocio")
    public ResponseEntity<ResponseDTO> verificarCorreoNegocio(@RequestBody Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || codigo == null)
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        try {
            Usuario usuario = usuarioService.buscarPorCorreo(correo.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            com.hotclick.model.CodigoOtp otp = otpService.verificarOtp(usuario, Constants.OTP_TIPO_REGISTRO, codigo.trim());
            otpService.marcarUsado(otp);
            return ResponseEntity.ok(ResponseDTO.success("Correo verificado correctamente", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── Cambiar negocio activo desde sesión ya autenticada ───────────────────

    @PostMapping("/cambiar-negocio")
    public ResponseEntity<?> cambiarNegocio(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            Usuario currentUser = usuarioFromRequest(request);
            Long empresaId = Long.parseLong(body.get("empresaId").toString());
            if (!miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(currentUser.getId(), empresaId, 1))
                return ResponseEntity.status(403).body(ResponseDTO.error("No tenés acceso a ese negocio"));
            Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RuntimeException("Negocio no encontrado"));
            String rol = currentUser.getRoles().isEmpty() ? "USUARIO_FINAL" : currentUser.getRoles().get(0).getNombreRol();
            String accessToken = jwtUtil.generateToken(currentUser.getCorreo(), currentUser.getId(), rol, empresaId, empresa.getSlug());
            RefreshToken rt = refreshTokenService.crear(currentUser);
            String nombre = currentUser.getNombre() != null ? currentUser.getNombre() : currentUser.getCorreo().split("@")[0];
            AuthResponse resp = new AuthResponse(accessToken, rt.getToken(), currentUser.getId(), currentUser.getCorreo(), rol, nombre);
            resp.setEmpresaId(empresaId);
            resp.setEmpresaSlug(empresa.getSlug());
            resp.setEmpresaNombre(empresa.getNombreEmpresa());
            return ResponseEntity.ok(ResponseDTO.success("Negocio cambiado", resp));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[cambiar-negocio] {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al cambiar de negocio"));
        }
    }

    // ── Listar negocios del usuario autenticado ───────────────────────────────

    @GetMapping("/mis-negocios")
    public ResponseEntity<?> misNegocios(HttpServletRequest request) {
        try {
            Usuario currentUser = usuarioFromRequest(request);
            List<Map<String, Object>> empresas = miembroEmpresaRepository
                .findByUsuarioIdAndEstado(currentUser.getId(), 1)
                .stream().map(m -> {
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
            return ResponseEntity.ok(ResponseDTO.success("Negocios", empresas));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al cargar negocios"));
        }
    }

    // ── Seleccionar empresa tras login multi-negocio ──────────────────────────

    @PostMapping("/seleccionar-empresa")
    public ResponseEntity<?> seleccionarEmpresa(@RequestBody Map<String, Object> body) {
        String tempToken = (String) body.get("tempToken");
        Object empresaIdRaw = body.get("empresaId");
        if (tempToken == null || empresaIdRaw == null)
            return ResponseEntity.badRequest().body(ResponseDTO.error("Datos incompletos"));
        try {
            if (!jwtUtil.isEmpresaSelectionToken(tempToken))
                return ResponseEntity.status(401).body(ResponseDTO.error("Token inválido o expirado"));
            Long userId    = jwtUtil.extractUserId(tempToken);
            Long empresaId = Long.parseLong(empresaIdRaw.toString());
            Usuario usuario = usuarioService.buscarPorId(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
            if (!miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(userId, empresaId, 1))
                return ResponseEntity.status(403).body(ResponseDTO.error("No tenés acceso a ese negocio"));
            Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RuntimeException("Negocio no encontrado"));
            // Generar JWT apuntando a la empresa seleccionada
            String rol         = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
            String accessToken = jwtUtil.generateToken(usuario.getCorreo(), userId, rol, empresaId, empresa.getSlug());
            RefreshToken rt    = refreshTokenService.crear(usuario);
            String nombre      = usuario.getNombre() != null ? usuario.getNombre() : usuario.getCorreo().split("@")[0];
            AuthResponse resp  = new AuthResponse(accessToken, rt.getToken(), userId, usuario.getCorreo(), rol, nombre);
            resp.setEmpresaId(empresaId);
            resp.setEmpresaSlug(empresa.getSlug());
            resp.setEmpresaNombre(empresa.getNombreEmpresa());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            log.error("[seleccionar-empresa] {}", e.getMessage(), e);
            return ResponseEntity.status(401).body(ResponseDTO.error("Token expirado o inválido"));
        }
    }

    // ── Crear segundo negocio desde cuenta existente ──────────────────────────

    @PostMapping("/nuevo-negocio")
    public ResponseEntity<?> nuevoNegocio(@RequestBody RegistroEmpresaDTO dto, HttpServletRequest request) {
        try {
            Usuario currentUser = usuarioFromRequest(request);
            if (miembroEmpresaRepository.countEmpresasByUsuarioId(currentUser.getId()) >= 20)
                return ResponseEntity.badRequest().body(ResponseDTO.error("Alcanzaste el límite de 20 negocios por cuenta"));

            // Validaciones básicas
            if (dto.getNombreEmpresa() == null || dto.getNombreEmpresa().isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El nombre del negocio es requerido"));

            String slug = slugify(dto.getNombreEmpresa());
            int i = 2; String base = slug;
            while (empresaRepository.existsBySlug(slug)) { slug = base + "-" + i++; }

            if (dto.getCorreoEmpresa() == null || dto.getCorreoEmpresa().isBlank())
                return ResponseEntity.badRequest().body(ResponseDTO.error("El correo oficial del negocio es requerido"));
            String correoEmpresa = dto.getCorreoEmpresa().trim().toLowerCase();
            if (empresaRepository.existsByCorreoEmpresa(correoEmpresa))
                return ResponseEntity.badRequest().body(ResponseDTO.error("Ese correo de negocio ya está en uso"));

            Empresa empresa = new Empresa();
            empresa.setNombreEmpresa(dto.getNombreEmpresa().trim());
            empresa.setNombreComercial(dto.getNombreComercial() != null && !dto.getNombreComercial().isBlank()
                ? dto.getNombreComercial().trim() : dto.getNombreEmpresa().trim());
            empresa.setSlug(slug);
            empresa.setCorreoEmpresa(correoEmpresa);
            empresa.setTelefonoEmpresa(dto.getTelefonoEmpresa());
            empresa.setPlanSaas("GRATUITO");
            empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
            empresa.setFechaRegistro(LocalDateTime.now());
            empresa.setEstado(Constants.ESTADO_ACTIVO);
            empresa = empresaRepository.save(empresa);

            miembroEmpresaRepository.save(new MiembroEmpresa(currentUser, empresa, "PROPIETARIO"));

            // Asegurar rol EMPRENDEDOR
            boolean tieneRol = currentUser.getRoles().stream()
                .anyMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()));
            if (!tieneRol) {
                rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
                    .ifPresent(r -> { currentUser.getRoles().add(r); usuarioService.guardar(currentUser); });
            }

            notificacionEmailService.enviarBienvenidaEmprendedor(
                currentUser.getCorreo(), currentUser.getNombre(),
                empresa.getNombreComercial());

            // Devolver JWT con nuevo negocio como contexto activo
            String rol         = Constants.ROL_EMPRENDEDOR;
            String accessToken = jwtUtil.generateToken(currentUser.getCorreo(), currentUser.getId(), rol, empresa.getId(), empresa.getSlug());
            RefreshToken rt    = refreshTokenService.crear(currentUser);
            String nombre      = currentUser.getNombre() != null ? currentUser.getNombre() : currentUser.getCorreo().split("@")[0];
            AuthResponse resp  = new AuthResponse(accessToken, rt.getToken(), currentUser.getId(), currentUser.getCorreo(), rol, nombre);
            resp.setEmpresaId(empresa.getId());
            resp.setEmpresaSlug(empresa.getSlug());
            resp.setEmpresaNombre(empresa.getNombreEmpresa());
            return ResponseEntity.ok(ResponseDTO.success("Negocio creado exitosamente", resp));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[nuevo-negocio] {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(ResponseDTO.error("Error al crear el negocio"));
        }
    }

    /** Minimum 8 chars, at least one uppercase letter and one digit. */
    private boolean esContrasenaValida(String pwd) {
        if (pwd == null || pwd.length() < 8) return false;
        boolean hasUpper = false, hasDigit = false;
        for (char c : pwd.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            if (Character.isDigit(c))     hasDigit = true;
        }
        return hasUpper && hasDigit;
    }

    private String slugify(String text) {
        String normalized = Normalizer.normalize(text.toLowerCase().trim(), Normalizer.Form.NFD);
        return normalized.replaceAll("[^\\p{ASCII}]", "")
                         .replaceAll("[^a-z0-9\\s-]", "")
                         .replaceAll("\\s+", "-")
                         .replaceAll("-{2,}", "-")
                         .replaceAll("^-|-$", "");
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody JwtRequest request, HttpServletRequest httpRequest) {
        Optional<Usuario> usuarioOpt = usuarioService.buscarPorCorreo(request.getCorreo());
        if (usuarioOpt.isEmpty()) {
            // Anti-enumeration: same response as wrong password
            try { securityAuditService.logLoginFailed(request.getCorreo(), httpRequest, "user_not_found"); } catch (Exception ignored) {}
            try { securityDetectionService.recordFailedLogin(securityAuditService.getIp(httpRequest), request.getCorreo()); } catch (Exception ignored) {}
            return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
        }

        Usuario usuario = usuarioOpt.get();

        // [FIX-1] Verificar bloqueo por intentos fallidos antes de validar contraseña
        if (usuario.getBloqueadoHasta() != null && LocalDateTime.now().isBefore(usuario.getBloqueadoHasta())) {
            log.warn("Login bloqueado para {}: cuenta bloqueada hasta {}", request.getCorreo(), usuario.getBloqueadoHasta());
            try { securityAuditService.logLoginBlocked(request.getCorreo(), httpRequest); } catch (Exception ignored) {}
            return ResponseEntity.status(403).body(ResponseDTO.error(
                "Cuenta temporalmente bloqueada por múltiples intentos fallidos. Revisá tu correo para recuperar el acceso."));
        }

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getContrasenaHash())) {
            usuarioService.incrementarIntentosFallidos(usuario.getId());
            try { securityAuditService.logLoginFailed(request.getCorreo(), httpRequest, "wrong_password"); } catch (Exception ignored) {}
            try { securityDetectionService.recordFailedLogin(securityAuditService.getIp(httpRequest), request.getCorreo()); } catch (Exception ignored) {}
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
        try { securityAuditService.logLoginSuccess(usuario.getId(), usuario.getCorreo(), httpRequest); } catch (Exception ignored) {}

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

        return ResponseEntity.ok(buildAuthResponse(usuario));
    }

    // ── Refresh access token ──────────────────────────────────────────────────

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String tokenStr = body.get("refreshToken");
        if (tokenStr == null || tokenStr.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Refresh token requerido"));
        }
        try {
            RefreshToken rt = refreshTokenService.validar(tokenStr);
            Usuario usuario = rt.getUsuario();
            String rol = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
            String empresaSlug = usuario.getEmpresa() != null ? usuario.getEmpresa().getSlug() : null;
            List<String> permisos = permisoRepository.findPermisosByUsuarioId(usuario.getId());
            String newAccessToken = jwtUtil.generateTokenFull(
                usuario.getCorreo(), usuario.getId(), rol,
                usuario.getEmpresaId(), empresaSlug, permisos
            );
            return ResponseEntity.ok(Map.of(
                "accessToken", newAccessToken,
                "tipo",        "Bearer"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── Logout — revoca refresh token ─────────────────────────────────────────

    @PostMapping("/logout")
    public ResponseEntity<ResponseDTO> logout(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        String tokenStr = body.get("refreshToken");
        if (tokenStr != null && !tokenStr.isBlank()) {
            refreshTokenService.revocar(tokenStr);
        }
        try { securityAuditService.logLogout(null, null, httpRequest); } catch (Exception ignored) {}
        return ResponseEntity.ok(ResponseDTO.success("Sesión cerrada correctamente", null));
    }

    // ── Cambiar contraseña (autenticado) ──────────────────────────────────────

    @PostMapping("/change-password")
    public ResponseEntity<ResponseDTO> changePassword(@RequestBody Map<String, String> body,
                                                      HttpServletRequest request) {
        String actual = body.get("contrasenaActual");
        String nueva  = body.get("nuevaContrasena");

        if (actual == null || nueva == null || !esContrasenaValida(nueva)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 8 caracteres, una mayúscula y un número"));
        }
        try {
            Usuario usuario = usuarioFromRequest(request);
            if (!passwordEncoder.matches(actual, usuario.getContrasenaHash())) {
                return ResponseEntity.status(401).body(ResponseDTO.error("La contraseña actual es incorrecta"));
            }
            usuario.setContrasenaHash(passwordEncoder.encode(nueva));
            usuarioService.guardar(usuario);
            // Revocar todos los refresh tokens para forzar re-login en otros dispositivos
            refreshTokenService.revocar(body.getOrDefault("refreshToken", ""));
            try { securityAuditService.logPasswordChanged(usuario.getId(), usuario.getCorreo(), request); } catch (Exception ignored) {}
            return ResponseEntity.ok(ResponseDTO.success("Contraseña actualizada correctamente", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al cambiar la contraseña"));
        }
    }

    // ── 2FA: Verificar código durante login ───────────────────────────────────

    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2FA(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        String tempToken    = body.get("tempToken");
        String code         = body.get("code");
        String recoveryCode = body.get("recoveryCode");
        // 'method' tells backend which factor to verify: TOTP (default) or EMAIL_OTP
        String method       = body.getOrDefault("method", Constants.METODO_2FA_TOTP);

        if (tempToken == null || (code == null && recoveryCode == null)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Datos incompletos"));
        }
        try {
            if (!jwtUtil.isTempToken(tempToken)) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Token inválido o expirado"));
            }

            String correo = jwtUtil.extractUsername(tempToken);
            Optional<Usuario> opt = usuarioService.buscarPorCorreo(correo);
            if (opt.isEmpty()) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Credenciales inválidas"));
            }

            Usuario usuario = opt.get();

            if (usuario.getBloqueadoHasta() != null && LocalDateTime.now().isBefore(usuario.getBloqueadoHasta())) {
                return ResponseEntity.status(403).body(ResponseDTO.error(
                    "Cuenta temporalmente bloqueada. Intentá más tarde."));
            }

            // ── Códigos de recuperación (method-agnostic) ─────────────────────
            if (recoveryCode != null && !recoveryCode.isBlank()) {
                String normalized = twoFactorService.normalizeRecoveryCode(recoveryCode);
                List<String> stored = new ArrayList<>(twoFactorService.jsonToCodes(usuario.getRecoveryCodes()));
                int matchIdx = -1;
                for (int i = 0; i < stored.size(); i++) {
                    if (passwordEncoder.matches(normalized, stored.get(i))) { matchIdx = i; break; }
                }
                if (matchIdx < 0) {
                    usuarioService.incrementarIntentosFallidos(usuario.getId());
                    log.warn("[2FA] Código de recuperación inválido para userId={}", usuario.getId());
                    try { securityAuditService.log2FAFailed(usuario.getId(), usuario.getCorreo(), httpRequest, "RECOVERY_CODE"); } catch (Exception ignored) {}
                    return ResponseEntity.status(401).body(ResponseDTO.error("Código de recuperación inválido"));
                }
                stored.remove(matchIdx);
                usuario.setRecoveryCodes(twoFactorService.codesToJson(stored));
                usuarioService.guardar(usuario);
                usuarioService.resetearIntentosFallidos(usuario.getId());
                log.info("[2FA] Login por recovery code userId={}. Restantes: {}", usuario.getId(), stored.size());
                try { securityAuditService.log2FASuccess(usuario.getId(), usuario.getCorreo(), httpRequest, "RECOVERY_CODE"); } catch (Exception ignored) {}
                return ResponseEntity.ok(buildAuthResponse(usuario));
            }

            // ── Verificación según método seleccionado ────────────────────────
            if (Constants.METODO_2FA_EMAIL_OTP.equals(method)) {
                // Validate that the user actually has EMAIL_OTP enabled to prevent method injection
                if (!usuario.hasEmailOtpEnabled() && Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
                    // Backward compat: if methods field is null, don't allow EMAIL_OTP
                    return ResponseEntity.status(400).body(ResponseDTO.error("Método EMAIL_OTP no habilitado para esta cuenta"));
                }
                try {
                    com.hotclick.model.CodigoOtp otp = otpService.verificarOtp(
                        usuario, Constants.OTP_TIPO_2FA_LOGIN, code);
                    otpService.marcarUsado(otp);
                    usuarioService.resetearIntentosFallidos(usuario.getId());
                    log.info("[2FA] Login por EMAIL_OTP exitoso userId={}", usuario.getId());
                    try { securityAuditService.log2FASuccess(usuario.getId(), usuario.getCorreo(), httpRequest, "EMAIL_OTP"); } catch (Exception ignored) {}
                    return ResponseEntity.ok(buildAuthResponse(usuario));
                } catch (RuntimeException e) {
                    usuarioService.incrementarIntentosFallidos(usuario.getId());
                    try { securityAuditService.log2FAFailed(usuario.getId(), usuario.getCorreo(), httpRequest, "EMAIL_OTP"); } catch (Exception ignored) {}
                    return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
                }
            }

            // Default: TOTP with replay protection
            if (!twoFactorService.verifyCodeWithReplayProtection(usuario, code)) {
                usuarioService.incrementarIntentosFallidos(usuario.getId());
                log.warn("[2FA] TOTP incorrecto o replay para userId={}", usuario.getId());
                try { securityAuditService.log2FAFailed(usuario.getId(), usuario.getCorreo(), httpRequest, "TOTP"); } catch (Exception ignored) {}
                return ResponseEntity.status(401).body(ResponseDTO.error("Código incorrecto o expirado"));
            }

            usuarioService.resetearIntentosFallidos(usuario.getId());
            log.info("[2FA] TOTP login exitoso userId={}", usuario.getId());
            try { securityAuditService.log2FASuccess(usuario.getId(), usuario.getCorreo(), httpRequest, "TOTP"); } catch (Exception ignored) {}
            return ResponseEntity.ok(buildAuthResponse(usuario));

        } catch (Exception e) {
            log.error("[2FA] verify error: {}", e.getMessage());
            return ResponseEntity.status(401).body(ResponseDTO.error("Token expirado o inválido"));
        }
    }

    // ── 2FA: Enviar EMAIL OTP durante login (público, valida tempToken) ────────

    @PostMapping("/2fa/email/send")
    public ResponseEntity<ResponseDTO> sendLoginEmailOtp(@RequestBody Map<String, String> body) {
        String tempToken = body.get("tempToken");
        if (tempToken == null || tempToken.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("tempToken requerido"));
        try {
            if (!jwtUtil.isTempToken(tempToken))
                return ResponseEntity.status(401).body(ResponseDTO.error("Token inválido o expirado"));
            Long userId = jwtUtil.extractUserId(tempToken);
            Usuario usuario = usuarioService.buscarPorId(userId)
                .orElseThrow(() -> new SecurityException("Usuario no encontrado"));
            if (!usuario.hasEmailOtpEnabled())
                return ResponseEntity.status(400).body(ResponseDTO.error("EMAIL_OTP no habilitado para esta cuenta"));
            otpService.enviarOtp2Fa(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Código enviado a " + usuario.getCorreo(), null));
        } catch (RuntimeException e) {
            log.warn("[2FA/email/send] {}", e.getMessage());
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── 2FA: Habilitar Email OTP (autenticado — envía OTP de verificación) ────

    @PostMapping("/2fa/email/enable")
    public ResponseEntity<ResponseDTO> enableEmailOtp(HttpServletRequest request) {
        try {
            Usuario usuario = usuarioFromRequest(request);
            otpService.enviarOtp2Fa(usuario);
            return ResponseEntity.ok(ResponseDTO.success(
                "Código enviado a " + usuario.getCorreo() + ". Ingresalo para activar Email OTP.", null));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            log.error("[2FA/email/enable] {}", e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── 2FA: Verificar OTP y activar Email OTP ────────────────────────────────

    @PostMapping("/2fa/email/activate")
    public ResponseEntity<ResponseDTO> activateEmailOtp(@RequestBody Map<String, String> body,
                                                         HttpServletRequest request) {
        String code = body.get("code");
        if (code == null || code.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código requerido"));
        try {
            Usuario usuario = usuarioFromRequest(request);
            com.hotclick.model.CodigoOtp otp = otpService.verificarOtp(
                usuario, Constants.OTP_TIPO_2FA_LOGIN, code.trim());
            otpService.marcarUsado(otp);
            usuario.addMethod(Constants.METODO_2FA_EMAIL_OTP);
            usuarioService.guardar(usuario);
            log.info("[2FA] EMAIL_OTP activado para userId={}", usuario.getId());
            return ResponseEntity.ok(ResponseDTO.success(
                "Email OTP activado correctamente", Map.of("methods", usuario.getActiveMethods())));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al activar Email OTP"));
        }
    }

    // ── 2FA: Deshabilitar Email OTP ───────────────────────────────────────────

    @PostMapping("/2fa/email/disable")
    public ResponseEntity<ResponseDTO> disableEmailOtp(@RequestBody Map<String, String> body,
                                                        HttpServletRequest request) {
        String contrasena = body.get("contrasena");
        if (contrasena == null || contrasena.isBlank())
            return ResponseEntity.badRequest().body(ResponseDTO.error("Contraseña requerida para desactivar Email OTP"));
        try {
            Usuario usuario = usuarioFromRequest(request);
            if (!passwordEncoder.matches(contrasena, usuario.getContrasenaHash()))
                return ResponseEntity.status(401).body(ResponseDTO.error("Contraseña incorrecta"));
            usuario.removeMethod(Constants.METODO_2FA_EMAIL_OTP);
            usuarioService.guardar(usuario);
            log.info("[2FA] EMAIL_OTP desactivado para userId={}", usuario.getId());
            return ResponseEntity.ok(ResponseDTO.success(
                "Email OTP desactivado", Map.of("methods", usuario.getActiveMethods())));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al desactivar Email OTP"));
        }
    }

    // ── 2FA: Setup ────────────────────────────────────────────────────────────

    @PostMapping("/2fa/setup")
    public ResponseEntity<ResponseDTO> setup2FA(HttpServletRequest request) {
        try {
            Usuario usuario = usuarioFromRequest(request);
            String plainSecret  = twoFactorService.generateSecret();
            String encSecret    = twoFactorService.encryptForStorage(plainSecret);  // AES-256-GCM
            usuario.setTwoFactorSecret(encSecret);   // store encrypted
            usuario.setTwoFactorEnabled(false);      // not active until verified
            usuarioService.guardar(usuario);
            String qrUri = twoFactorService.buildQrUri(usuario.getCorreo(), plainSecret);  // QR uses plaintext
            return ResponseEntity.ok(ResponseDTO.success(
                "Escanea el código QR con Google Authenticator y luego ingresá el código para activar",
                Map.of("secret", plainSecret, "qrUri", qrUri)  // return plaintext for manual entry
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al configurar 2FA"));
        }
    }

    // ── 2FA: Activar ──────────────────────────────────────────────────────────

    @PostMapping("/2fa/activate")
    public ResponseEntity<ResponseDTO> activate2FA(@RequestBody Map<String, String> body,
                                                    HttpServletRequest request) {
        String code = body.get("code");
        if (code == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código requerido"));
        }
        try {
            Usuario usuario = usuarioFromRequest(request);
            if (usuario.getTwoFactorSecret() == null) {
                return ResponseEntity.badRequest().body(ResponseDTO.error("Primero iniciá la configuración 2FA"));
            }
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(400).body(ResponseDTO.error("Código incorrecto o expirado"));
            }
            // Register TOTP as an active method
            usuario.addMethod(Constants.METODO_2FA_TOTP);

            // Generate recovery codes only when activating for the first time
            if (usuario.getRecoveryCodes() == null || usuario.getRecoveryCodes().isBlank()) {
                List<String> plainCodes  = twoFactorService.generateRecoveryCodes();
                List<String> hashedCodes = plainCodes.stream()
                        .map(c -> passwordEncoder.encode(twoFactorService.normalizeRecoveryCode(c)))
                        .collect(Collectors.toList());
                usuario.setRecoveryCodes(twoFactorService.codesToJson(hashedCodes));
                usuarioService.guardar(usuario);
                return ResponseEntity.ok(ResponseDTO.success(
                    "Autenticación de dos factores (App) activada correctamente",
                    Map.of("recoveryCodes", plainCodes, "methods", usuario.getActiveMethods())
                ));
            }
            usuarioService.guardar(usuario);
            return ResponseEntity.ok(ResponseDTO.success(
                "App de autenticación añadida correctamente",
                Map.of("methods", usuario.getActiveMethods())
            ));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al activar 2FA"));
        }
    }

    // ── 2FA: Desactivar ───────────────────────────────────────────────────────

    @PostMapping("/2fa/disable")
    public ResponseEntity<ResponseDTO> disable2FA(@RequestBody Map<String, String> body,
                                                   HttpServletRequest request) {
        String contrasena = body.get("contrasena");
        String code       = body.get("code");

        if (contrasena == null || code == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Contraseña y código son requeridos"));
        }
        try {
            Usuario usuario = usuarioFromRequest(request);
            if (!passwordEncoder.matches(contrasena, usuario.getContrasenaHash())) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Contraseña incorrecta"));
            }
            if (!twoFactorService.verifyCode(usuario.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(401).body(ResponseDTO.error("Código de autenticación incorrecto"));
            }
            // Remove TOTP from methods; leave EMAIL_OTP if it exists
            usuario.removeMethod(Constants.METODO_2FA_TOTP);
            usuario.setTwoFactorSecret(null);
            // Clear replay protection fields
            usuario.setTotpLastUsedOtp(null);
            usuario.setTotpLastUsedAt(null);
            // Only clear recovery codes if ALL 2FA is disabled
            if (!Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
                usuario.setRecoveryCodes(null);
            }
            usuarioService.guardar(usuario);
            return ResponseEntity.ok(ResponseDTO.success("App de autenticación desactivada correctamente",
                Map.of("methods", usuario.getActiveMethods())));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al desactivar 2FA"));
        }
    }

    // ── 2FA: Regenerar códigos de recuperación ────────────────────────────────

    @PostMapping("/2fa/recovery-codes/regenerate")
    public ResponseEntity<ResponseDTO> regenerateRecoveryCodes(@RequestBody Map<String, String> body,
                                                               HttpServletRequest request) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Código TOTP requerido"));
        }
        try {
            Usuario usuario = usuarioFromRequest(request);
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

    // ── 2FA: Estado ───────────────────────────────────────────────────────────

    @GetMapping("/2fa/status")
    public ResponseEntity<ResponseDTO> status2FA(HttpServletRequest request) {
        try {
            Usuario usuario = usuarioFromRequest(request);
            boolean enabled = Boolean.TRUE.equals(usuario.getTwoFactorEnabled());
            return ResponseEntity.ok(ResponseDTO.success("OK", Map.of(
                "enabled",          enabled,
                "methods",          usuario.getActiveMethods(),
                "totpEnabled",      usuario.hasTotpEnabled(),
                "emailOtpEnabled",  usuario.hasEmailOtpEnabled()
            )));
        } catch (SecurityException e) {
            return ResponseEntity.status(401).body(ResponseDTO.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ResponseDTO.error("Error al consultar estado 2FA"));
        }
    }

    // ── Verificación por correo ───────────────────────────────────────────────

    @PostMapping("/send-verification")
    public ResponseEntity<ResponseDTO> sendVerification(@RequestBody Usuario usuario) {
        try {
            usuario.setContrasenaHash(passwordEncoder.encode(usuario.getContrasenaHash()));
            emailVerificationService.iniciarRegistro(usuario);
            return ResponseEntity.ok(ResponseDTO.success("Código de verificación enviado a tu correo", null));
        } catch (Exception e) {
            String msg = e.getMessage();
            if (msg == null || msg.isBlank()) {
                msg = "Error al enviar el código. Revisá que el correo sea válido e intentá de nuevo.";
            }
            log.error("[send-verification] {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.badRequest().body(ResponseDTO.error(msg));
        }
    }

    @PostMapping("/verify-registration")
    public ResponseEntity<ResponseDTO> verifyRegistration(@RequestBody Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || codigo == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        }
        try {
            Usuario nuevo = emailVerificationService.verificarYRegistrar(correo.trim(), codigo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Cuenta creada exitosamente", buildAuthResponse(nuevo)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(e.getMessage()));
        }
    }

    // ── Recuperar contraseña ──────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<ResponseDTO> forgotPassword(@RequestBody Map<String, String> body) {
        String correo = body.get("correo");
        if (correo == null || correo.isBlank()) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("El correo es requerido"));
        }
        try {
            passwordResetService.enviarCodigo(correo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Si el correo está registrado, recibirás un código de verificación", null));
        } catch (RuntimeException e) {
            String msg = e.getMessage();
            log.error("[forgot-password] {}: {}", e.getClass().getSimpleName(), msg);
            return ResponseEntity.badRequest().body(ResponseDTO.error(
                msg != null && !msg.isBlank() ? msg : "Error al enviar el correo"));
        }
    }

    @PostMapping("/verify-code")
    public ResponseEntity<ResponseDTO> verifyCode(@RequestBody Map<String, String> body) {
        String correo = body.get("correo");
        String codigo = body.get("codigo");
        if (correo == null || codigo == null) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("Correo y código son requeridos"));
        }
        try {
            passwordResetService.verificarCodigo(correo.trim(), codigo.trim());
            return ResponseEntity.ok(ResponseDTO.success("Código verificado correctamente", null));
        } catch (Exception e) {
            String msg = e.getMessage();
            return ResponseEntity.status(400).body(ResponseDTO.error(
                msg != null && !msg.isBlank() ? msg : "Código inválido o expirado"));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ResponseDTO> resetPassword(@RequestBody Map<String, String> body) {
        String correo          = body.get("correo");
        String nuevaContrasena = body.get("nuevaContrasena");
        if (correo == null || !esContrasenaValida(nuevaContrasena)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error("La contraseña debe tener al menos 8 caracteres, una mayúscula y un número"));
        }
        boolean ok = passwordResetService.cambiarContrasena(correo.trim(), nuevaContrasena);
        if (ok) return ResponseEntity.ok(ResponseDTO.success("Contraseña actualizada correctamente", null));
        return ResponseEntity.status(400).body(ResponseDTO.error("Sesión de recuperación inválida o expirada"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(Usuario usuario) {
        String rol          = usuario.getRoles().isEmpty() ? "USUARIO_FINAL" : usuario.getRoles().get(0).getNombreRol();
        String empresaSlug  = usuario.getEmpresa() != null ? usuario.getEmpresa().getSlug()         : null;
        String empresaNombre= usuario.getEmpresa() != null ? usuario.getEmpresa().getNombreEmpresa() : null;
        List<String> permisos = permisoRepository.findPermisosByUsuarioId(usuario.getId());
        String accessToken  = jwtUtil.generateTokenFull(
            usuario.getCorreo(), usuario.getId(), rol,
            usuario.getEmpresaId(), empresaSlug, permisos
        );
        RefreshToken rt     = refreshTokenService.crear(usuario);
        String nombre       = usuario.getNombre() != null ? usuario.getNombre() : usuario.getCorreo().split("@")[0];
        AuthResponse resp   = new AuthResponse(accessToken, rt.getToken(), usuario.getId(), usuario.getCorreo(), rol, nombre);
        resp.setEmpresaId(usuario.getEmpresaId());
        resp.setEmpresaSlug(empresaSlug);
        resp.setEmpresaNombre(empresaNombre);
        resp.setPermisos(permisos);
        return resp;
    }

    private Usuario usuarioFromRequest(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new SecurityException("Token de autenticación requerido");
        }
        Long userId = jwtUtil.extractUserId(auth.substring(7));
        return usuarioService.buscarPorId(userId)
                .orElseThrow(() -> new SecurityException("Usuario no encontrado"));
    }
}
