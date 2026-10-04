package com.hotclick.service.invitacion;

import com.hotclick.dto.AceptarInvitacionRequest;
import com.hotclick.dto.AuthResponse;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.InvitacionPropietario;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionPropietarioRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.OtpService;
import com.hotclick.service.UsuarioService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class InvitacionPropietarioService {

    static final String MSG_NO_DISPONIBLE = "Este enlace ya no está disponible.";
    private static final int DIAS_VIGENCIA = 7;
    private static final int MAX_NEGOCIOS = 20;
    private static final Logger log = LoggerFactory.getLogger(InvitacionPropietarioService.class);

    @Autowired private InvitacionPropietarioRepository invitacionRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AuthSupport authSupport;
    @Autowired private UsuarioService usuarioService;
    @Autowired private OtpService otpService;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private AuditoriaAdminRegistroService auditoriaAdminRegistroService;
    @Autowired private InputSanitizer sanitizer;

    @Value("${app.url:https://hotclick.lat}")
    private String appUrl;

    @Transactional
    public Map<String, Object> generar(Long empresaId, String correo, String telefono, Long adminId) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        String correoNorm = normalizarCorreoOpcional(correo);
        String telefonoNorm = normalizarTelefonoOpcional(telefono);

        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        invitacionRepository.revocarActivas(empresaId, ahora);

        String token = InvitacionTokens.nuevo();
        InvitacionPropietario inv = new InvitacionPropietario();
        inv.setEmpresa(empresa);
        inv.setTokenHash(InvitacionTokens.hash(token));
        inv.setCorreoDestino(correoNorm);
        inv.setTelefonoDestino(telefonoNorm);
        inv.setCreadaPorId(adminId);
        inv.setExpiraEn(ahora.plusDays(DIAS_VIGENCIA));
        inv.setFechaCreacion(ahora);
        try {
            invitacionRepository.saveAndFlush(inv);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Ya hay una invitación vigente. Actualizá e intentá de nuevo.");
        }

        String url = urlPublica(token);
        if (correoNorm != null) {
            enviarCorreo(correoNorm, nombreVisible(empresa), url);
        }
        auditoriaAdminRegistroService.registrarSiAdmin(
            "INVITACION_PROPIETARIO", "EMPRESA", empresaId, empresaId,
            "Enlace de propietario generado");

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("url", url);
        data.put("expiraEn", inv.getExpiraEn().toString());
        data.put("correoDestino", correoNorm);
        data.put("telefonoDestino", telefonoNorm);
        data.put("estado", "PENDIENTE");
        return data;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> estado(Long empresaId) {
        if (!empresaRepository.existsById(empresaId)) {
            throw new RecursoNoEncontradoException("Empresa no encontrada");
        }
        Optional<InvitacionPropietario> ultima = invitacionRepository.findFirstByEmpresa_IdOrderByIdDesc(empresaId);
        Map<String, Object> data = new LinkedHashMap<>();
        if (ultima.isEmpty()) {
            data.put("estado", "NINGUNA");
            return data;
        }
        InvitacionPropietario inv = ultima.get();
        data.put("estado", clasificar(inv, LocalDateTime.now(Constants.ZONA_CR)));
        data.put("expiraEn", inv.getExpiraEn() != null ? inv.getExpiraEn().toString() : null);
        data.put("usadaEn", inv.getUsadaEn() != null ? inv.getUsadaEn().toString() : null);
        data.put("correoDestino", inv.getCorreoDestino());
        data.put("telefonoDestino", inv.getTelefonoDestino());
        return data;
    }

    @Transactional
    public void revocar(Long empresaId) {
        if (!empresaRepository.existsById(empresaId)) {
            throw new RecursoNoEncontradoException("Empresa no encontrada");
        }
        invitacionRepository.revocarActivas(empresaId, LocalDateTime.now(Constants.ZONA_CR));
        auditoriaAdminRegistroService.registrarSiAdmin(
            "INVITACION_PROPIETARIO_REVOCAR", "EMPRESA", empresaId, empresaId, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> verPublica(String token) {
        InvitacionPropietario inv = vigente(token);
        Empresa empresa = inv.getEmpresa();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("nombreComercial", nombreVisible(empresa));
        data.put("logoUrl", empresa.getLogoUrl());
        data.put("plan", empresa.getPlanSaas());
        data.put("expiraEn", inv.getExpiraEn().toString());
        return data;
    }

    /**
     * Registra o inicia sesión y deja al usuario como PROPIETARIO.
     * El UPDATE condicional decide el único ganador si dos personas aceptan a la vez.
     * El mapa puede incluir {@code otpPendiente}; el controller lo resuelve fuera de esta transacción.
     */
    @Transactional
    public Map<String, Object> aceptar(String token, AceptarInvitacionRequest body, Long usuarioSesionId) {
        InvitacionPropietario inv = vigente(token);
        Long empresaId = inv.getEmpresa().getId();
        boolean nuevo = false;
        Usuario usuario;
        if (usuarioSesionId != null) {
            usuario = usuarioRepository.findById(usuarioSesionId)
                .orElseThrow(() -> new IllegalArgumentException("Iniciá sesión de nuevo para aceptar el negocio."));
            exigirCuentaUsable(usuario);
        } else if (body != null && "registro".equalsIgnoreCase(blank(body.getModo()))) {
            usuario = registrar(body);
            nuevo = true;
        } else {
            usuario = entrar(body);
        }

        boolean yaMiembro = miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaId(usuario.getId(), empresaId)
            .isPresent();
        if (!yaMiembro && miembroEmpresaRepository.countEmpresasByUsuarioId(usuario.getId()) >= MAX_NEGOCIOS) {
            throw new IllegalArgumentException("Alcanzaste el límite de 20 negocios por cuenta");
        }

        Long usuarioId = usuario.getId();
        int ganados = invitacionRepository.reclamarSiActiva(
            inv.getId(), LocalDateTime.now(Constants.ZONA_CR), usuarioId);
        if (ganados != 1) {
            throw new IllegalArgumentException(MSG_NO_DISPONIBLE);
        }

        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        asegurarRolEmprendedor(usuario);
        usuario.setEmpresa(empresa);
        usuarioRepository.save(usuario);
        asignarPropietario(usuario, empresa);

        empresa.getSlug();
        empresa.getNombreEmpresa();
        AuthResponse auth = authSupport.buildAuthResponse(usuario);
        Map<String, Object> data = mapaAuth(auth, empresa);
        data.put("otpPendiente", nuevo);
        return data;
    }

    /** Fuera de la transacción de aceptar: un fallo de correo no revierte el alta. */
    public void completarOtp(Map<String, Object> data) {
        Object pendiente = data.remove("otpPendiente");
        if (!Boolean.TRUE.equals(pendiente)) {
            data.put("otpEnviado", false);
            return;
        }
        Object id = data.get("id");
        if (!(id instanceof Long userId)) {
            data.put("otpEnviado", false);
            return;
        }
        try {
            Usuario usuario = usuarioRepository.findById(userId).orElse(null);
            if (usuario == null) {
                data.put("otpEnviado", false);
                return;
            }
            otpService.enviarOtp(usuario, Constants.OTP_TIPO_REGISTRO);
            data.put("otpEnviado", true);
        } catch (Exception e) {
            log.warn("No se pudo enviar el OTP de la invitación: {}", e.getMessage());
            data.put("otpEnviado", false);
        }
    }

    private InvitacionPropietario vigente(String token) {
        if (token == null || token.isBlank() || token.length() > 128) {
            throw new IllegalArgumentException(MSG_NO_DISPONIBLE);
        }
        InvitacionPropietario inv = invitacionRepository.findByTokenHash(InvitacionTokens.hash(token))
            .orElseThrow(() -> new IllegalArgumentException(MSG_NO_DISPONIBLE));
        if (!"PENDIENTE".equals(clasificar(inv, LocalDateTime.now(Constants.ZONA_CR)))) {
            throw new IllegalArgumentException(MSG_NO_DISPONIBLE);
        }
        if (inv.getEmpresa() == null) {
            throw new IllegalArgumentException(MSG_NO_DISPONIBLE);
        }
        return inv;
    }

    private String clasificar(InvitacionPropietario inv, LocalDateTime ahora) {
        if (inv.getUsadaEn() != null) return "USADA";
        if (inv.getRevocadaEn() != null) return "REVOCADA";
        if (inv.getExpiraEn() == null || !inv.getExpiraEn().isAfter(ahora)) return "EXPIRADA";
        return "PENDIENTE";
    }

    private Usuario registrar(AceptarInvitacionRequest body) {
        if (body == null) throw new IllegalArgumentException("Completá tus datos para crear la cuenta.");
        String nombre = sanitizer.cleanWithLimit(body.getNombre(), 100);
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre es requerido");
        }
        String correo = body.getCorreo() == null ? "" : body.getCorreo().trim().toLowerCase();
        if (!correo.contains("@")) throw new IllegalArgumentException("El correo es requerido");
        if (usuarioRepository.existsByCorreo(correo)) {
            throw new IllegalArgumentException("Ese correo ya tiene cuenta. Entrá con tu contraseña para aceptar el negocio.");
        }
        if (!authSupport.esContrasenaValida(body.getPassword())) {
            throw new IllegalArgumentException("La contraseña necesita al menos 8 caracteres, una mayúscula y un número.");
        }
        String apellido = sanitizer.cleanWithLimit(body.getApellido(), 100);
        Usuario usuario = new Usuario();
        usuario.setNombre(nombre.trim());
        usuario.setApellidoPaterno(apellido == null || apellido.isBlank() ? "." : apellido.trim());
        usuario.setCorreo(correo);
        usuario.setContrasenaHash(passwordEncoder.encode(body.getPassword()));
        usuario.setTelefono(body.getTelefono() == null || body.getTelefono().isBlank() ? "00000000" : body.getTelefono().trim());
        usuario.setIdentificacion(identificacionLibre());
        usuario.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.setIntentosFallidos(0);
        usuario.setCorreoVerificado(false);
        return usuarioRepository.save(usuario);
    }

    private Usuario entrar(AceptarInvitacionRequest body) {
        String correo = body == null || body.getCorreo() == null ? "" : body.getCorreo().trim().toLowerCase();
        String password = body == null ? null : body.getPassword();
        Usuario usuario = correo.isBlank() ? null : usuarioRepository.findByCorreo(correo).orElse(null);
        boolean claveOk = usuario != null
            && usuario.getContrasenaHash() != null
            && password != null
            && passwordEncoder.matches(password, usuario.getContrasenaHash());
        if (!claveOk) {
            if (usuario != null) usuarioService.incrementarIntentosFallidos(usuario.getId());
            throw new IllegalArgumentException("Credenciales inválidas");
        }
        if (Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
            throw new IllegalArgumentException(
                "Tu cuenta tiene verificación en dos pasos. Iniciá sesión y volvé a abrir este enlace.");
        }
        exigirCuentaUsable(usuario);
        return usuario;
    }

    private void exigirCuentaUsable(Usuario usuario) {
        LocalDateTime hasta = usuario.getBloqueadoHasta();
        if (hasta != null && LocalDateTime.now(Constants.ZONA_CR).isBefore(hasta)) {
            throw new IllegalArgumentException(
                "Cuenta temporalmente bloqueada por múltiples intentos fallidos. Revisá tu correo para recuperar el acceso.");
        }
        int estado = usuario.getEstado() == null ? 0 : usuario.getEstado();
        if (estado != Constants.ESTADO_ACTIVO) {
            throw new IllegalArgumentException("Esta cuenta no puede aceptar el negocio. Escribinos si necesitás ayuda.");
        }
    }

    private void asegurarRolEmprendedor(Usuario usuario) {
        boolean tiene = usuario.getRoles().stream()
            .anyMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()));
        if (!tiene) {
            rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
                .ifPresent(r -> usuario.getRoles().add(r));
        }
    }

    private void asignarPropietario(Usuario usuario, Empresa empresa) {
        Optional<MiembroEmpresa> existente = miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaId(usuario.getId(), empresa.getId());
        if (existente.isPresent()) {
            MiembroEmpresa miembro = existente.get();
            miembro.setRolEnEmpresa("PROPIETARIO");
            miembro.setEstado(Constants.ESTADO_ACTIVO);
            miembroEmpresaRepository.save(miembro);
            return;
        }
        miembroEmpresaRepository.save(new MiembroEmpresa(usuario, empresa, "PROPIETARIO"));
    }

    private Map<String, Object> mapaAuth(AuthResponse auth, Empresa empresa) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accessToken", auth.getAccessToken());
        data.put("refreshToken", auth.getRefreshToken());
        data.put("id", auth.getId());
        data.put("correo", auth.getCorreo());
        data.put("rol", auth.getRol());
        data.put("nombre", auth.getNombre());
        data.put("empresaId", empresa.getId());
        data.put("empresaSlug", empresa.getSlug());
        data.put("empresaNombre", empresa.getNombreEmpresa());
        data.put("plan", empresa.getPlanSaas());
        return data;
    }

    private String identificacionLibre() {
        for (int i = 0; i < 5; i++) {
            String ident = "EMP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
            if (!usuarioRepository.existsByIdentificacion(ident)) return ident;
        }
        return "EMP-" + UUID.randomUUID().toString().replace("-", "");
    }

    private void enviarCorreo(String correo, String nombreEmpresa, String url) {
        try {
            notificacionEmailService.enviarInvitacionPropietario(correo, nombreEmpresa, url);
        } catch (Exception e) {
            log.warn("No se pudo enviar el correo de invitación: {}", e.getMessage());
        }
    }

    private String urlPublica(String token) {
        String base = appUrl == null || appUrl.isBlank() ? "https://hotclick.lat" : appUrl.trim();
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        return base + "/invitacion/" + token;
    }

    private String nombreVisible(Empresa empresa) {
        if (empresa.getNombreComercial() != null && !empresa.getNombreComercial().isBlank()) {
            return empresa.getNombreComercial();
        }
        return empresa.getNombreEmpresa();
    }

    private String normalizarCorreoOpcional(String correo) {
        if (correo == null || correo.isBlank()) return null;
        String norm = correo.trim().toLowerCase();
        if (!norm.contains("@") || norm.length() > 200) {
            throw new IllegalArgumentException("El correo de destino no es válido");
        }
        return norm;
    }

    private String normalizarTelefonoOpcional(String telefono) {
        if (telefono == null || telefono.isBlank()) return null;
        String digits = telefono.replaceAll("[^0-9]", "");
        if (digits.length() < 8 || digits.length() > 15) {
            throw new IllegalArgumentException("El teléfono de destino no es válido");
        }
        return digits;
    }

    private static String blank(String value) {
        return value == null ? "" : value.trim();
    }
}
