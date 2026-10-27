package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PermisoRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.security.PlatformStaff;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service
public class AuthSupport {

    private static final Logger log = LoggerFactory.getLogger(AuthSupport.class);

    @Autowired private UsuarioService      usuarioService;
    @Autowired private JwtUtil             jwtUtil;
    @Autowired private RefreshTokenService refreshTokenService;
    @Autowired private PermisoRepository   permisoRepository;
    @Autowired private RateLimiter         rateLimiter;
    @Autowired private ClientIpResolver    clientIpResolver;

    // Tope por usuario (no por IP) en /2fa/*: un atacante con varias IP no multiplica los intentos.
    // Gestión (sesión): setup, activate, disable, recovery-codes/regenerate, email/enable|activate|disable.
    @Value("${hotclick.ratelimit.2fa-usuario.max:15}")         private int tfaUsuarioMax = 15;
    @Value("${hotclick.ratelimit.2fa-usuario.window:300}")     private int tfaUsuarioWindow = 300;
    // Login (tempToken): /2fa/verify y /2fa/email/send. Va aparte para que gestionar el 2FA no consuma intentos de login.
    @Value("${hotclick.ratelimit.2fa-login-usuario.max:10}")   private int tfaLoginMax = 10;
    @Value("${hotclick.ratelimit.2fa-login-usuario.window:300}") private int tfaLoginWindow = 300;

    private static final String MSG_LIMITE_2FA = "Demasiados intentos. Esperá un momento antes de volver a intentar.";

    /** null si pasa; 429 si el usuario superó el tope de gestión 2FA. Falla cerrado si la BD no responde. */
    public ResponseEntity<ResponseDTO> limite2faUsuario(Long usuarioId) {
        return limite("2fa:usuario:" + usuarioId, tfaUsuarioMax, tfaUsuarioWindow);
    }

    /**
     * Igual, para /2fa/verify y /2fa/email/send (el usuario sale del tempToken). El cupo es por usuario + IP:
     * quien conoce la contraseña (y por eso obtiene un tempToken) y dispara intentos desde otra IP no le gasta el
     * cupo de login al dueño de la cuenta. El bloqueo de cuenta por fallos ({@code registrarFalloAutenticacion})
     * sigue siendo el tope global por usuario.
     */
    public ResponseEntity<ResponseDTO> limite2faLoginUsuario(Long usuarioId, HttpServletRequest request) {
        String ip = ipCliente(request);
        return limite("2fa:login:usuario:" + usuarioId + ":ip:" + ip, tfaLoginMax, tfaLoginWindow);
    }

    // ── Bloqueo por fallos de credencial (ver UsuarioService.registrarFalloAutenticacion) ──

    /** IP del cliente tal como la ve el limitador (misma fuente que el resto de llaves por IP). */
    public String ipCliente(HttpServletRequest request) {
        return request == null ? "desconocida" : prefijoIp(clientIpResolver.resolve(request));
    }

    /**
     * Para las llaves de fallos: una IPv6 se reduce a su /64 (quien tiene un /64 o más rota 2^64 direcciones y
     * esquivaría el tope por IP). IPv4 e IPv4-mapeada quedan completas; NAT64 (64:ff9b::/96) usa su IPv4 embebida. Lo que no sea una IP literal pasa igual.
     */
    static String prefijoIp(String ip) {
        return com.hotclick.security.IpParaLlave.reducir(ip);
    }

    /**
     * Para endpoints con sesión o tempToken: 403 si esta IP ya agotó sus fallos contra este usuario (antes de mirar
     * la contraseña o el código); null si puede seguir. Solo esa IP queda afuera: el dueño, desde la suya, no.
     */
    public ResponseEntity<ResponseDTO> bloqueoPorFallos(Long usuarioId, HttpServletRequest request) {
        if (!usuarioService.ipBloqueadaParaUsuario(usuarioId, ipCliente(request))) return null;
        return ResponseEntity.status(403).body(ResponseDTO.error(
            "Demasiados intentos fallidos desde esta ubicación. Esperá unos minutos antes de volver a intentar."));
    }

    /** Autenticación completa por otro camino (p. ej. WebAuthn): limpia los contadores igual que un login completo. */
    public void autenticacionCompleta(Long usuarioId, HttpServletRequest request) {
        usuarioService.resetearIntentosFallidos(usuarioId, ipCliente(request));
    }

    /** Cuenta una contraseña o código incorrecto (login, 2FA verify y gestión 2FA cuentan por el mismo camino). */
    public void registrarFalloCredencial(Long usuarioId, HttpServletRequest request) {
        usuarioService.registrarFalloAutenticacion(usuarioId, ipCliente(request));
    }

    private ResponseEntity<ResponseDTO> limite(String bucket, int max, int window) {
        if (rateLimiter.tryAcquireEstricto(bucket, max, window)) return null;
        return ResponseEntity.status(429).body(ResponseDTO.error(MSG_LIMITE_2FA));
    }

    /** Solo estado 1 (activo) recibe tokens: eliminado, suspendido, inactivo, pendiente o sin estado, no. */
    public static boolean estaActiva(Usuario usuario) {
        return usuario != null && Integer.valueOf(Constants.ESTADO_ACTIVO).equals(usuario.getEstado());
    }

    /** Falla cerrado con una respuesta genérica si la cuenta no está activa (sin revelar el estado). */
    public void exigirCuentaActiva(Usuario usuario) {
        if (!estaActiva(usuario)) {
            throw new CuentaNoActivaException();
        }
    }

    /**
     * Único punto por el que se emiten access y refresh token al iniciar sesión (contraseña, 2FA, Clerk, registro):
     * una cuenta con estado distinto de 1 no recibe tokens, sin importar por qué camino llegó acá.
     */
    public AuthResponse buildAuthResponse(Usuario usuario) {
        exigirCuentaActiva(usuario);
        String rol = PlatformStaff.rolPrincipal(
            usuario.getRoles().stream().map(r -> r.getNombreRol()).toList());
        // ADMIN y staff de plataforma: JWT y response sin tenant (V119 + V126).
        boolean sinTenant = PlatformStaff.esSinTenant(rol);
        Long empresaId = sinTenant ? null : usuario.getEmpresaId();
        String empresaSlug = (!sinTenant && usuario.getEmpresa() != null)
            ? usuario.getEmpresa().getSlug() : null;
        String empresaNombre = (!sinTenant && usuario.getEmpresa() != null)
            ? usuario.getEmpresa().getNombreEmpresa() : null;
        List<String> permisos = permisosDe(usuario.getId());
        String accessToken  = jwtUtil.generateTokenFull(
            usuario.getCorreo(), usuario.getId(), rol,
            empresaId, empresaSlug, permisos
        );
        RefreshToken refreshToken = refreshTokenService.crear(usuario);
        String nombre       = usuario.getNombre() != null ? usuario.getNombre() : usuario.getCorreo().split("@")[0];
        // Cookie HttpOnly es el mecanismo real; el raw también va en el JSON por
        // compat con clientes que no lo leen de la cookie (el FE no lo persiste).
        AuthResponse resp   = new AuthResponse(accessToken, refreshToken.getRawToken(), usuario.getId(), usuario.getCorreo(), rol, nombre);
        resp.setEmpresaId(empresaId);
        resp.setEmpresaSlug(empresaSlug);
        resp.setEmpresaNombre(empresaNombre);
        resp.setPermisos(permisos);
        resp.setCorreoVerificado(usuario.getCorreoVerificado());
        return resp;
    }

    /**
     * Permisos del rol. Si falta la tabla nativa (H2 sin Flyway), el login
     * sigue con el JWT de rol; no se bloquea la sesión.
     */
    public List<String> permisosDe(Long userId) {
        try {
            return permisoRepository.findPermisosByUsuarioId(userId);
        } catch (DataAccessException ex) {
            log.warn("No se pudieron leer permisos userId={}: {}", userId, ex.getMessage());
            return List.of();
        }
    }

    public Usuario usuarioFromRequest(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            throw new SecurityException("Token de autenticación requerido");
        }
        Long userId = jwtUtil.extractUserId(auth.substring(7));
        return usuarioService.buscarPorId(userId)
                .orElseThrow(() -> new SecurityException("Usuario no encontrado"));
    }

    /** Minimum 8 chars, at least one uppercase letter and one digit. */
    public boolean esContrasenaValida(String pwd) {
        if (pwd == null || pwd.length() < 8) return false;
        boolean hasUpper = false, hasDigit = false;
        for (char c : pwd.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            if (Character.isDigit(c))     hasDigit = true;
        }
        return hasUpper && hasDigit;
    }

    /** Mismo rango que RegisterRequest.contrasena (el tope es de request; bcrypt usa 72 bytes). */
    static final int CONTRASENA_MIN = 8;
    static final int CONTRASENA_MAX = 128;

    /**
     * Política de la nueva contraseña al recuperarla (Figma "Recuperar contraseña · 3 nueva"):
     * entre 8 y 128 caracteres y distinta del correo. Es la misma regla de largo que el registro.
     */
    public static boolean esContrasenaRecuperacionValida(String pwd, String correo) {
        if (pwd == null || pwd.length() < CONTRASENA_MIN || pwd.length() > CONTRASENA_MAX) return false;
        return correo == null || !pwd.trim().equalsIgnoreCase(correo.trim());
    }

    public String slugify(String text) {
        String normalized = Normalizer.normalize(text.toLowerCase(Locale.ROOT).trim(), Normalizer.Form.NFD);
        return normalized.replaceAll("[^\\p{ASCII}]", "")
                         .replaceAll("[^a-z0-9\\s-]", "")
                         .replaceAll("\\s+", "-")
                         .replaceAll("-{2,}", "-")
                         .replaceAll("(^-)|(-$)", "");
    }
}
