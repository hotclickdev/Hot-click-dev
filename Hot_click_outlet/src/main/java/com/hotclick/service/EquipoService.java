package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.EmpresaNombre;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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

    public List<Map<String, Object>> listar(Long empresaId) {
        return miembroEmpresaRepository.findByEmpresaIdAndEstado(empresaId, 1).stream()
            .map(this::filaMiembro)
            .toList();
    }

    public void invitar(Empresa empresa, Long empresaId, String nombre, String correoNorm,
                        String password, String telefono, String rolEnEmpresa) {
        if (empresaId != null) tenantService.verificarLimiteUsuariosEquipo(empresaId);
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

    private void crearNuevo(Empresa empresa, com.hotclick.model.Rol rolMiembro, String nombre,
                            String correoNorm, String password, String telefono, String rolEnEmpresa) {
        String[] partes = nombre.trim().split("\\s+", 2);
        Usuario nuevo = new Usuario();
        nuevo.setNombre(partes[0]);
        nuevo.setApellidoPaterno(partes.length > 1 ? partes[1] : "Miembro");
        nuevo.setIdentificacion("ADM-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        nuevo.setCorreo(correoNorm);
        nuevo.setContrasenaHash(passwordEncoder.encode(password));
        nuevo.setTelefono(telefono);
        nuevo.setEstado(Constants.ESTADO_ACTIVO);
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
