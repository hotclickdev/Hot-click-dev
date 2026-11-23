package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.InvitacionEquipo;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionEquipoRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.EmpresaNombre;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class EquipoService {

    static final int MAX_EMPRESAS_POR_USUARIO = 20;

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private TenantService tenantService;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private InvitacionEquipoRepository invitacionRepository;
    @Autowired private SesionesUsuarioService sesionesUsuarioService;
    @Autowired private InvitacionEquipoService invitacionEquipoService;
    @Autowired private com.hotclick.service.telegram.TelegramRevocacionMiembro telegramRevocacionMiembro;

    public List<Map<String, Object>> listar(Long empresaId) {
        return miembroEmpresaRepository.findByEmpresaIdAndEstado(empresaId, 1).stream()
            .map(this::filaMiembro)
            .toList();
    }

    /**
     * Invita al equipo de {@code empresaId}. NUNCA agrega al miembro ni crea el Usuario: solo emite una invitación
     * pendiente de un solo uso que la persona acepta con el enlace del correo. El resultado es indistinguible para
     * quien invita (exista o no la cuenta, ya sea miembro, esté suspendida/inactiva o en el tope de negocios): en esos casos no
     * se emite invitación usable y no se manda correo, pero tampoco se lanza ningún error. La empresa se resuelve UNA
     * vez con lock pesimista (cupo del plan sin TOCTOU). El llamador debe haber verificado que puede gestionar
     * {@code empresaId}.
     */
    @Transactional
    public void invitar(Long empresaId, String nombre, String correoNorm,
                        String telefono, String rolEnEmpresa) {
        invitar(empresaId, nombre, correoNorm, telefono, rolEnEmpresa, null);
    }

    @Transactional
    public void invitar(Long empresaId, String nombre, String correoNorm,
                        String telefono, String rolEnEmpresa, Long invitaUsuarioId) {
        if (empresaId == null) throw new com.hotclick.exception.EmpresaRequeridaException();
        Empresa empresa = empresaRepository.findByIdForUpdate(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        long pendientes = invitacionRepository.contarPendientesExcluyendoCorreo(empresa.getId(), correoNorm, ahora);
        tenantService.verificarLimiteUsuariosEquipo(empresa.getId(), pendientes);
        // La invitación viva anterior de este correo y negocio deja de servir, se emita o no una nueva.
        invitacionRepository.revocarPendientes(empresa.getId(), correoNorm, ahora);
        // findByCorreo ignora ELIMINADAS; el camino de reactivación (SALIDA_EQUIPO) las busca aparte.
        Optional<Usuario> existente = usuarioRepository.findByCorreo(correoNorm)
            .or(() -> usuarioRepository.findEliminadoByCorreo(correoNorm));
        if (existente.isPresent() && !puedeInvitarseCuentaExistente(existente.get(), empresa)) {
            return;
        }
        // SCALE1: no hay N+1. Es UNA invitación (un INSERT y un correo, sin bucle); la empresa ya viene cargada por
        // findByIdForUpdate y EmpresaNombre.mostrar solo lee sus columnas; de `existente` solo se leen id/estado/motivo
        // (sin tocar roles ni otras colecciones lazy). El INSERT vive en InvitacionEquipoService.emitir.
        String token = invitacionEquipoService.emitir(empresa, nombre, correoNorm, telefono, rolEnEmpresa, invitaUsuarioId, ahora);
        notificacionEmailService.enviarInvitacionMiembro(
            correoNorm, nombre.trim(), rolEnEmpresa, EmpresaNombre.mostrar(empresa, null),
            // Cuenta nueva (true) = la persona tiene que definir una contraseña: no existe cuenta, o está ELIMINADA
            // y no puede iniciar sesión. false solo si es una cuenta ACTIVA que entra con su contraseña habitual.
            existente.isEmpty() || !esActiva(existente.get()), token);
    }

    private static boolean esActiva(Usuario u) {
        return Integer.valueOf(Constants.ESTADO_ACTIVO).equals(u.getEstado());
    }

    /**
     * Cuenta existente: ACTIVA, o ELIMINADA con motivo SALIDA_EQUIPO (la reactiva su propio token al aceptar, no
     * invitar()). ELIMINADA por admin / borrado de datos / motivo NULL (filas anteriores), SUSPENDIDA, INACTIVA y
     * PENDIENTE no reciben invitación usable ni se reactivan; el dueño ve la misma respuesta (fail-closed). Además no
     * debe ser miembro activo de este equipo y debe tener cupo de negocios.
     */
    private boolean puedeInvitarseCuentaExistente(Usuario u, Empresa empresa) {
        return (esActiva(u) || InvitacionEquipoService.eliminadaPorSalidaDeEquipo(u))
            && !miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(u.getId(), empresa.getId(), 1)
            && miembroEmpresaRepository.countEmpresasByUsuarioId(u.getId()) < MAX_EMPRESAS_POR_USUARIO;
    }

    public Map<String, Object> cambiarRol(Long usuarioId, Long empresaId, String nuevoRol) {
        MiembroEmpresa m = miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1)
            .orElseThrow(() -> new RecursoNoEncontradoException("Miembro no encontrado en tu equipo"));
        if ("PROPIETARIO".equals(m.getRolEnEmpresa())) {
            throw new IllegalArgumentException("No puedes cambiar el rol del propietario");
        }
        m.setRolEnEmpresa(nuevoRol);
        miembroEmpresaRepository.save(m);
        return Map.of("rolEnEmpresa", nuevoRol);
    }

    /** true si el miembro activo de esa empresa es ADMIN o PROPIETARIO (si no existe, cambiarRol responde 404). */
    public boolean esAdminOPropietario(Long usuarioId, Long empresaId) {
        return miembroEmpresaRepository.findByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1)
            .map(m -> "ADMIN".equals(m.getRolEnEmpresa()) || "PROPIETARIO".equals(m.getRolEnEmpresa()))
            .orElse(false);
    }

    public void eliminar(Long usuarioId, Long empresaId, Long currentUserId) {
        if (usuarioId.equals(currentUserId)) {
            throw new IllegalArgumentException("No puedes eliminarte a ti mismo");
        }
        MiembroEmpresa m = miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndEstado(usuarioId, empresaId, 1)
            .orElseThrow(() -> new TenantAccessDeniedException("El usuario no pertenece a tu equipo"));
        if ("PROPIETARIO".equals(m.getRolEnEmpresa())) {
            throw new IllegalArgumentException("No puedes eliminar al propietario del negocio");
        }
        // O6: el bot de Telegram se corta ANTES de desactivar la membresía (revocar() exige membresía activa).
        // Solo bloquea/limpia esta empresa; las otras empresas del usuario no se tocan.
        telegramRevocacionMiembro.revocar(usuarioId, empresaId);
        m.setEstado(0);
        miembroEmpresaRepository.save(m);
        if (miembroEmpresaRepository.countEmpresasByUsuarioId(usuarioId) == 0) {
            usuarioRepository.findById(usuarioId).ifPresent(u -> {
                // Solo una cuenta ACTIVA y sin motivo se marca SALIDA_EQUIPO. Eliminada por admin, bloqueada,
                // suspendida, inactiva o con cualquier motivo previo: se conserva tal cual (solo se quitó la membresía);
                // si no, la salida "lavaría" la decisión del admin y la invitación reactivaría la cuenta.
                if (!esActiva(u) || u.getMotivoEliminacion() != null) return;
                u.setEstado(Constants.ESTADO_ELIMINADO);
                u.setMotivoEliminacion(Constants.MOTIVO_ELIMINACION_SALIDA_EQUIPO);
                usuarioRepository.save(u);
                sesionesUsuarioService.cortarSesiones(u);
            });
        }
    }

    /**
     * QA3-P02: parte el nombre completo del formulario (un solo campo) en {nombre, apellidoPaterno, apellidoMaterno}.
     * El apellido va al final: "Ana María Pérez" -> nombre "Ana María", apellido "Pérez". Con 4 o más palabras
     * las dos últimas son los apellidos (formato de Costa Rica): "Juan Carlos Pérez Mora". Antes la primera palabra
     * era el nombre y todo el resto el apellido ("PRUEBA QA3 Editor" -> nombre "PRUEBA", apellido "QA3 Editor").
     * Una sola palabra se guarda como nombre y el apellido queda en "Miembro" (columna NOT NULL).
     */
    static String[] partirNombreCompleto(String nombreCompleto) {
        String[] p = nombreCompleto.trim().split("\\s+");
        if (p.length == 1) return new String[] {p[0], "Miembro", null};
        if (p.length == 2) return new String[] {p[0], p[1], null};
        if (p.length == 3) return new String[] {p[0] + " " + p[1], p[2], null};
        String nombre = String.join(" ", java.util.Arrays.copyOfRange(p, 0, p.length - 2));
        return new String[] {nombre, p[p.length - 2], p[p.length - 1]};
    }

    private Map<String, Object> filaMiembro(MiembroEmpresa m) {
        Usuario u = m.getUsuario();
        Map<String, Object> r = new HashMap<>();
        r.put("id", u.getId());
        r.put("nombre", u.getNombre());
        r.put("apellidoPaterno", u.getApellidoPaterno());
        r.put("correo", u.getCorreo());
        r.put("telefono", u.getTelefono());
        r.put("fotoPerfilUrl", u.getFotoPerfilUrl());
        r.put("estado", u.getEstado());
        r.put("rolEnEmpresa", m.getRolEnEmpresa());
        r.put("fechaIngreso", m.getFechaIngreso());
        return r;
    }
}
