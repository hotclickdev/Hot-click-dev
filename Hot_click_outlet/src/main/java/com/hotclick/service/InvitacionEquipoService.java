package com.hotclick.service;

import com.hotclick.exception.EnlaceNoVigenteException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.InvitacionEquipo;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionEquipoRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.utils.Constants;
import com.hotclick.utils.EmpresaNombre;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Consulta y aceptación de invitaciones de equipo (token de un solo uso, atado a un correo y a un negocio). */
@Service
public class InvitacionEquipoService {

    /** Vigencia de una invitación (pendiente de confirmar por el dueño). */
    public static final int DIAS_VIGENCIA = 7;

    private static final String MSG_NO_VALIDA = "Esta invitación ya no es válida. Pedile a quien te invitó que te envíe una nueva.";
    private static final SecureRandom ALEATORIO = new SecureRandom();

    @Autowired private InvitacionEquipoRepository invitaciones;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private TenantService tenantService;
    @Autowired private SesionesUsuarioService sesionesUsuarioService;
    @Autowired private OtpService otpService;
    @Autowired private com.hotclick.repository.WebAuthnCredentialRepository webAuthnCredentialRepository;
    @Autowired private com.hotclick.repository.TelegramVinculacionRepository telegramVinculacionRepository;

    public static String tokenNuevo() {
        byte[] b = new byte[32];
        ALEATORIO.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    public static String hashToken(String token) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Datos mínimos para mostrar la invitación al portador del token. Cualquier fallo es el mismo error genérico. */
    @Transactional(readOnly = true)
    public Map<String, Object> consultar(String token) {
        InvitacionEquipo inv = vigente(token);
        Map<String, Object> r = new HashMap<>();
        r.put("negocio", EmpresaNombre.mostrar(inv.getEmpresa(), null));
        r.put("rolEnEmpresa", inv.getRolEnEmpresa());
        r.put("correo", inv.getCorreo());
        // "Hay una cuenta ACTIVA con la que puede iniciar sesión". Una cuenta ELIMINADA define contraseña nueva.
        // findByCorreo ya ignora ELIMINADAS: una fila ELIMINADA no cuenta como cuenta con la que iniciar sesión.
        Optional<Usuario> viva = usuarioRepository.findByCorreo(inv.getCorreo());
        r.put("cuentaExiste", viva.isPresent() && Integer.valueOf(Constants.ESTADO_ACTIVO).equals(viva.get().getEstado()));
        return r;
    }

    /**
     * El portador del token (dueño del correo) define su contraseña. Sin usuario: se crea. ACTIVO: 409 (inicia sesión).
     * ELIMINADO por salida del equipo (motivo SALIDA_EQUIPO, que solo se fija a cuentas ACTIVAS sin motivo): se reactiva el MISMO usuario con la contraseña
     * nueva; se cortan sesiones y refresh tokens; no se recuperan membresías ni roles viejos (solo la de este negocio).
     * SUSPENDIDO, INACTIVO, PENDIENTE y ELIMINADO con motivo distinto de SALIDA_EQUIPO (incluido NULL): 410, nunca se
     * reactivan (fail-closed). Al reactivar se invalidan OTP de todos los tipos, 2FA/TOTP y passkeys.
     */
    @Transactional
    public void aceptarCuentaNueva(String token, String contrasena) {
        InvitacionEquipo inv = vigente(token);
        // Viva primero; si no hay, la ELIMINADA (reactivación por SALIDA_EQUIPO). findByCorreo ignora ELIMINADAS.
        Optional<Usuario> existente = usuarioRepository.findByCorreo(inv.getCorreo())
            .or(() -> usuarioRepository.findEliminadoByCorreo(inv.getCorreo()));
        if (existente.isPresent()) {
            Integer estado = existente.get().getEstado();
            if (Integer.valueOf(Constants.ESTADO_ACTIVO).equals(estado)) {
                throw new EnlaceNoVigenteException(HttpStatus.CONFLICT,
                    "Ya existe una cuenta con este correo: iniciá sesión y aceptá la invitación.");
            }
            if (!eliminadaPorSalidaDeEquipo(existente.get())) throw noValida();
        }
        String falta = AuthSupport.faltantePoliticaContrasena(contrasena);
        if (falta != null) throw new IllegalArgumentException(falta);
        Empresa empresa = bloquearEmpresaConCupo(inv);
        Rol rol = rolEmprendedor();
        consumir(inv);
        if (existente.isPresent()) {
            reactivarEliminado(existente.get(), inv, empresa, rol, contrasena);
            return;
        }
        String[] partes = EquipoService.partirNombreCompleto(inv.getNombre());
        Usuario nuevo = new Usuario();
        nuevo.setNombre(partes[0]);
        nuevo.setApellidoPaterno(partes[1]);
        nuevo.setApellidoMaterno(partes[2]);
        nuevo.setIdentificacion("ADM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        nuevo.setCorreo(inv.getCorreo());
        nuevo.setContrasenaHash(passwordEncoder.encode(contrasena));
        nuevo.setTelefono(inv.getTelefono());
        nuevo.setEstado(Constants.ESTADO_ACTIVO);
        // El token llegó solo a este correo: aceptar prueba que la persona lo controla.
        nuevo.setCorreoVerificado(true);
        nuevo.setIntentosFallidos(0);
        nuevo.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        nuevo.setEmpresa(empresa);
        nuevo.getRoles().add(rol);
        Usuario saved = usuarioRepository.save(nuevo);
        miembroEmpresaRepository.save(new MiembroEmpresa(saved, empresa, inv.getRolEnEmpresa()));
    }

    /**
     * Regla fail-closed única (invitar y aceptar): solo se emite invitación usable y solo se reactiva una cuenta
     * ELIMINADA cuyo motivo_eliminacion es EXACTAMENTE SALIDA_EQUIPO. NULL (filas anteriores) u otro valor = no.
     */
    public static boolean eliminadaPorSalidaDeEquipo(Usuario u) {
        return u != null && Integer.valueOf(Constants.ESTADO_ELIMINADO).equals(u.getEstado())
            && Constants.MOTIVO_ELIMINACION_SALIDA_EQUIPO.equals(u.getMotivoEliminacion());
    }

    /**
     * Al reactivar, nada emitido antes sirve: OTP de todos los tipos (reset de contraseña, verificación de correo,
     * 2FA por correo, y cualquier tipo futuro como un cambio de correo), 2FA/TOTP completo y passkeys.
     */
    private void invalidarCredencialesPendientes(Usuario u) {
        otpService.invalidarTodosDeUsuario(u);
        u.setTwoFactorEnabled(false);
        u.setTwoFactorSecret(null);
        u.setTwoFactorPendingSecret(null);
        u.setRecoveryCodes(null);
        u.setTwoFactorMethods(null);
        u.setTotpLastUsedOtp(null);
        u.setTotpLastUsedAt(null);
        webAuthnCredentialRepository.deleteByUsuario_Id(u.getId());
    }

    private void reactivarEliminado(Usuario u, InvitacionEquipo inv, Empresa empresa, Rol rol, String contrasena) {
        if (miembroEmpresaRepository.countEmpresasByUsuarioId(u.getId()) >= EquipoService.MAX_EMPRESAS_POR_USUARIO) {
            throw noValida();
        }
        u.setContrasenaHash(passwordEncoder.encode(contrasena));
        u.setEstado(Constants.ESTADO_ACTIVO);
        u.setCorreoVerificado(true);
        u.setIntentosFallidos(0);
        u.setMotivoEliminacion(null);
        invalidarCredencialesPendientes(u);
        // Roles globales viejos (ADMIN, etc.) no vuelven: la cuenta reactivada queda SOLO como EMPRENDEDOR.
        u.getRoles().clear();
        u.getRoles().add(rol);
        // Identidad externa y bot ligados a la cuenta anterior tampoco sirven: Clerk se desliga y Telegram se revoca.
        u.setClerkUserId(null);
        revocarTelegram(u);
        // La empresa anterior puede ser un negocio del que ya no es miembro: se reasigna al que invita.
        boolean empresaVigente = u.getEmpresa() != null
            && miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(u.getId(), u.getEmpresa().getId(), 1);
        if (!empresaVigente) u.setEmpresa(empresa);
        usuarioRepository.save(u);
        activarMembresia(u, empresa, inv);
        sesionesUsuarioService.cortarSesiones(u);
    }

    private void revocarTelegram(Usuario u) {
        Optional<TelegramVinculacion> vinculo = telegramVinculacionRepository.findByUsuarioId(u.getId());
        if (vinculo.isEmpty()) return;
        TelegramVinculacion v = vinculo.get();
        v.revocar();
        telegramVinculacionRepository.revocarPorId(v.getId());
    }

    /** Crea y guarda UNA invitación pendiente y devuelve el token en claro (solo se guarda su hash). */
    String emitir(Empresa empresa, String nombre, String correoNorm, String telefono, String rolEnEmpresa,
                  Long invitaUsuarioId, LocalDateTime ahora) {
        String token = tokenNuevo();
        InvitacionEquipo inv = new InvitacionEquipo();
        inv.setEmpresa(empresa);
        inv.setCorreo(correoNorm);
        inv.setNombre(nombre.trim());
        inv.setTelefono(telefono);
        inv.setRolEnEmpresa(rolEnEmpresa);
        inv.setTokenHash(hashToken(token));
        inv.setFechaCreacion(ahora);
        inv.setVenceEn(ahora.plusDays(DIAS_VIGENCIA));
        inv.setUsuarioInvitaId(invitaUsuarioId);
        invitaciones.save(inv);
        return token;
    }

    private void activarMembresia(Usuario u, Empresa empresa, InvitacionEquipo inv) {
        Optional<MiembroEmpresa> previo = miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), empresa.getId());
        if (previo.isPresent()) {
            MiembroEmpresa m = previo.get();
            m.setEstado(1);
            m.setRolEnEmpresa(inv.getRolEnEmpresa());
            m.setFechaIngreso(LocalDateTime.now(Constants.ZONA_CR));
            miembroEmpresaRepository.save(m);
        } else {
            miembroEmpresaRepository.save(new MiembroEmpresa(u, empresa, inv.getRolEnEmpresa()));
        }
    }

    /** Cuenta existente: solo la puede aceptar quien está autenticado como el correo de la invitación. */
    @Transactional
    public void aceptarCuentaExistente(String token, Usuario actual) {
        InvitacionEquipo inv = vigente(token);
        if (actual == null || actual.getCorreo() == null || !actual.getCorreo().equalsIgnoreCase(inv.getCorreo())) {
            throw noValida();
        }
        Usuario u = usuarioRepository.findById(actual.getId()).orElseThrow(this::noValida);
        if (!Integer.valueOf(Constants.ESTADO_ACTIVO).equals(u.getEstado())) throw noValida();
        Empresa empresa = bloquearEmpresaConCupo(inv);
        if (miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(u.getId(), empresa.getId(), 1)
                || miembroEmpresaRepository.countEmpresasByUsuarioId(u.getId()) >= EquipoService.MAX_EMPRESAS_POR_USUARIO) {
            throw noValida();
        }
        Rol rol = rolEmprendedor();
        consumir(inv);
        if (u.getRoles().stream().noneMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()))) u.getRoles().add(rol);
        if (u.getEmpresa() == null) u.setEmpresa(empresa);
        usuarioRepository.save(u);
        activarMembresia(u, empresa, inv);
    }

    private InvitacionEquipo vigente(String token) {
        if (token == null || token.isBlank() || token.length() > 100) throw noValida();
        InvitacionEquipo inv = invitaciones.findByTokenHash(hashToken(token)).orElseThrow(this::noValida);
        if (inv.getUsadoEn() != null || inv.getRevocadoEn() != null
                || !inv.getVenceEn().isAfter(LocalDateTime.now(Constants.ZONA_CR))) {
            throw noValida();
        }
        return inv;
    }

    /** Bloquea el negocio y re-verifica el cupo del plan (solo miembros activos: este todavía no cuenta). */
    private Empresa bloquearEmpresaConCupo(InvitacionEquipo inv) {
        Empresa empresa = empresaRepository.findByIdForUpdate(inv.getEmpresa().getId())
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        tenantService.verificarLimiteUsuariosEquipo(empresa.getId());
        return empresa;
    }

    private void consumir(InvitacionEquipo inv) {
        if (invitaciones.consumir(inv.getId(), LocalDateTime.now(Constants.ZONA_CR)) != 1) throw noValida();
    }

    private Rol rolEmprendedor() {
        return rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
            .orElseThrow(() -> new RecursoNoEncontradoException("Rol EMPRENDEDOR no configurado"));
    }

    private EnlaceNoVigenteException noValida() {
        return new EnlaceNoVigenteException(HttpStatus.GONE, MSG_NO_VALIDA);
    }
}
