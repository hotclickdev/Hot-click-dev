package com.hotclick.service;

import com.hotclick.exception.EnlaceNoVigenteException;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.InvitacionEquipo;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
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
        r.put("cuentaExiste", usuarioRepository.findByCorreo(inv.getCorreo())
            .map(u -> Integer.valueOf(Constants.ESTADO_ACTIVO).equals(u.getEstado())).orElse(false));
        return r;
    }

    /**
     * El portador del token (dueño del correo) define su contraseña. Sin usuario: se crea. ACTIVO: 409 (inicia sesión).
     * ELIMINADO (estado 3, incluye a quien salió de su único negocio): se reactiva el MISMO usuario con la contraseña
     * nueva; se cortan sesiones y refresh tokens; no se recuperan membresías ni roles viejos (solo la de este negocio).
     * SUSPENDIDO (bloqueo de admin), INACTIVO y PENDIENTE: 410, nunca se reactivan. No hay columna que distinga
     * ELIMINADO por equipo de ELIMINADO por admin. Sesiones: cortarSesiones cubre sesiones y refresh tokens; los
     * OTP / restablecimientos pendientes no tienen API de invalidación directa y no se tocan.
     */
    @Transactional
    public void aceptarCuentaNueva(String token, String contrasena) {
        InvitacionEquipo inv = vigente(token);
        Optional<Usuario> existente = usuarioRepository.findByCorreo(inv.getCorreo());
        if (existente.isPresent()) {
            Integer estado = existente.get().getEstado();
            if (Integer.valueOf(Constants.ESTADO_ACTIVO).equals(estado)) {
                throw new EnlaceNoVigenteException(HttpStatus.CONFLICT,
                    "Ya existe una cuenta con este correo: iniciá sesión y aceptá la invitación.");
            }
            if (!Integer.valueOf(Constants.ESTADO_ELIMINADO).equals(estado)) throw noValida();
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

    private void reactivarEliminado(Usuario u, InvitacionEquipo inv, Empresa empresa, Rol rol, String contrasena) {
        if (miembroEmpresaRepository.countEmpresasByUsuarioId(u.getId()) >= EquipoService.MAX_EMPRESAS_POR_USUARIO) {
            throw noValida();
        }
        u.setContrasenaHash(passwordEncoder.encode(contrasena));
        u.setEstado(Constants.ESTADO_ACTIVO);
        u.setCorreoVerificado(true);
        u.setIntentosFallidos(0);
        if (u.getRoles().stream().noneMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()))) u.getRoles().add(rol);
        // La empresa anterior puede ser un negocio del que ya no es miembro: se reasigna al que invita.
        boolean empresaVigente = u.getEmpresa() != null
            && miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(u.getId(), u.getEmpresa().getId(), 1);
        if (!empresaVigente) u.setEmpresa(empresa);
        usuarioRepository.save(u);
        activarMembresia(u, empresa, inv);
        sesionesUsuarioService.cortarSesiones(u);
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
