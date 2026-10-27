package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.EmpresaNombre;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class EquipoService {

    static final int MAX_EMPRESAS_POR_USUARIO = 20;

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private NotificacionEmailService notificacionEmailService;
    @Autowired private TenantService tenantService;
    @Autowired private EmpresaRepository empresaRepository;

    public List<Map<String, Object>> listar(Long empresaId) {
        return miembroEmpresaRepository.findByEmpresaIdAndEstado(empresaId, 1).stream()
            .map(this::filaMiembro)
            .toList();
    }

    /**
     * Invita al equipo de {@code empresaId}. La empresa destino se resuelve UNA vez, con lock pesimista hasta el
     * commit, y esa misma instancia se usa para el cupo del plan y para el alta del miembro: dos invitaciones
     * simultáneas no pueden pasar el mismo conteo (TOCTOU) y el miembro nunca cae en un negocio distinto al
     * del límite evaluado. El llamador debe haber verificado que el usuario puede gestionar {@code empresaId}.
     */
    @Transactional
    public void invitar(Long empresaId, String nombre, String correoNorm,
                        String password, String telefono, String rolEnEmpresa) {
        if (empresaId == null) throw new com.hotclick.exception.EmpresaRequeridaException();
        Empresa empresa = empresaRepository.findByIdForUpdate(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa no encontrada"));
        tenantService.verificarLimiteUsuariosEquipo(empresa.getId());
        var rolMiembro = rolRepository.findByNombreRol(Constants.ROL_EMPRENDEDOR)
            .orElseThrow(() -> new RecursoNoEncontradoException("Rol EMPRENDEDOR no configurado"));
        Optional<Usuario> existente = usuarioRepository.findByCorreo(correoNorm);
        if (existente.isPresent()) {
            agregarExistente(existente.get(), empresa, rolMiembro, rolEnEmpresa);
            return;
        }
        crearNuevo(empresa, rolMiembro, nombre, correoNorm, password, telefono, rolEnEmpresa);
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
        m.setEstado(0);
        miembroEmpresaRepository.save(m);
        if (miembroEmpresaRepository.countEmpresasByUsuarioId(usuarioId) == 0) {
            usuarioRepository.findById(usuarioId).ifPresent(u -> {
                u.setEstado(Constants.ESTADO_ELIMINADO);
                usuarioRepository.save(u);
            });
        }
    }

    private void agregarExistente(Usuario u, Empresa empresa, com.hotclick.model.Rol rolMiembro, String rolEnEmpresa) {
        // Solo cuentas activas. Excepción: ELIMINADO con una membresía previa en ESTE equipo es el reingreso de
        // quien se quitó del equipo (eliminar() marca eliminado al usuario sin otros negocios): se mantiene ese flujo.
        // Suspendido, inactivo, pendiente o eliminado sin vínculo con este equipo no entran.
        boolean activo = Integer.valueOf(Constants.ESTADO_ACTIVO).equals(u.getEstado());
        boolean reingreso = Integer.valueOf(Constants.ESTADO_ELIMINADO).equals(u.getEstado())
            && miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), empresa.getId()).isPresent();
        if (!activo && !reingreso) {
            throw new IllegalArgumentException("Este usuario no está activo y no se puede agregar al equipo");
        }
        if (miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(u.getId(), empresa.getId(), 1)) {
            throw new IllegalArgumentException("Este usuario ya es miembro activo de tu equipo");
        }
        if (miembroEmpresaRepository.countEmpresasByUsuarioId(u.getId()) >= MAX_EMPRESAS_POR_USUARIO) {
            throw new IllegalArgumentException(
                "El usuario ya pertenece al máximo de " + MAX_EMPRESAS_POR_USUARIO + " negocios permitidos");
        }
        boolean tieneRol = u.getRoles().stream().anyMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()));
        if (!tieneRol) u.getRoles().add(rolMiembro);
        if (u.getEmpresa() == null) u.setEmpresa(empresa);
        usuarioRepository.save(u);
        reactivarOCrearMembresia(u, empresa, rolEnEmpresa);
        notificacionEmailService.enviarInvitacionMiembro(
            u.getCorreo(), u.getNombre(), rolEnEmpresa, EmpresaNombre.mostrar(empresa, null), null);
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

    private void crearNuevo(Empresa empresa, com.hotclick.model.Rol rolMiembro, String nombre,
                            String correoNorm, String password, String telefono, String rolEnEmpresa) {
        String[] partes = partirNombreCompleto(nombre);
        Usuario nuevo = new Usuario();
        nuevo.setNombre(partes[0]);
        nuevo.setApellidoPaterno(partes[1]);
        nuevo.setApellidoMaterno(partes[2]);
        nuevo.setIdentificacion("ADM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        nuevo.setCorreo(correoNorm);
        nuevo.setContrasenaHash(passwordEncoder.encode(password));
        nuevo.setTelefono(telefono);
        nuevo.setEstado(Constants.ESTADO_ACTIVO);
        // QA3 (seguridad): el correo del invitado no está probado, lo escribió quien invita. El default de
        // Usuario es true; sin esto el LECTOR/EDITOR invitado pasaría los gates de "correo verificado".
        nuevo.setCorreoVerificado(false);
        nuevo.setIntentosFallidos(0);
        nuevo.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        nuevo.setEmpresa(empresa);
        nuevo.getRoles().add(rolMiembro);
        Usuario saved = usuarioRepository.save(nuevo);
        miembroEmpresaRepository.save(new MiembroEmpresa(saved, empresa, rolEnEmpresa));
        notificacionEmailService.enviarInvitacionMiembro(
            correoNorm, saved.getNombre(), rolEnEmpresa, EmpresaNombre.mostrar(empresa, null), password);
    }

    private void reactivarOCrearMembresia(Usuario u, Empresa empresa, String rolEnEmpresa) {
        Optional<MiembroEmpresa> previo = miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), empresa.getId());
        if (previo.isPresent()) {
            MiembroEmpresa m = previo.get();
            m.setEstado(1);
            m.setRolEnEmpresa(rolEnEmpresa);
            m.setFechaIngreso(LocalDateTime.now(Constants.ZONA_CR));
            miembroEmpresaRepository.save(m);
            return;
        }
        miembroEmpresaRepository.save(new MiembroEmpresa(u, empresa, rolEnEmpresa));
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
