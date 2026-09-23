package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RolRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminUsuarioService {

    private static final List<String> ROLES_APROBACION = List.of(
        Constants.ROL_USUARIO_FINAL, Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR);

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RolRepository rolRepository;

    @Transactional(readOnly = true)
    public List<Usuario> listarTodos() {
        return usuarioRepository.findAllWithRolesOrderByIdDesc();
    }

    @Transactional(readOnly = true)
    public List<Usuario> listarPendientes() {
        return usuarioRepository.findByEstadoOrderByIdDesc(Constants.ESTADO_PENDIENTE);
    }

    @Transactional
    public String aprobar(Long id, String rolNombre) {
        String rol = rolNombre == null ? Constants.ROL_USUARIO_FINAL : rolNombre.trim();
        if (!ROLES_APROBACION.contains(rol)) {
            throw new IllegalArgumentException("Rol inválido: " + rol);
        }
        Rol entidadRol = rolRepository.findByNombreRol(rol)
            .orElseThrow(() -> new IllegalStateException("Rol '" + rol + "' no existe en la BD"));
        Usuario usuario = usuarioConRoles(id);
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.getRoles().clear();
        usuario.getRoles().add(entidadRol);
        usuarioRepository.save(usuario);
        return rol;
    }

    @Transactional
    public void cambiarRol(Long id, String rolNombre) {
        if (rolNombre == null || rolNombre.isBlank()) {
            throw new IllegalArgumentException("El campo 'rol' es requerido");
        }
        Rol rol = rolRepository.findByNombreRol(rolNombre.trim())
            .orElseThrow(() -> new IllegalArgumentException("Rol '" + rolNombre + "' no existe"));
        Usuario usuario = usuarioConRoles(id);
        usuario.getRoles().clear();
        usuario.getRoles().add(rol);
        usuarioRepository.save(usuario);
    }

    public void rechazar(Long id) {
        setEstado(id, Constants.ESTADO_ELIMINADO);
    }

    public void eliminar(Long id) {
        setEstado(id, Constants.ESTADO_ELIMINADO);
    }

    public String cambiarEstado(Long id, int nuevoEstado) {
        if (nuevoEstado != Constants.ESTADO_ACTIVO && nuevoEstado != Constants.ESTADO_INACTIVO) {
            throw new IllegalArgumentException("Estado inválido (usa 1=activo, 2=inactivo)");
        }
        setEstado(id, nuevoEstado);
        return nuevoEstado == Constants.ESTADO_ACTIVO ? "Usuario activado" : "Usuario desactivado";
    }

    public void restaurar(Long id) {
        Usuario usuario = usuario(id);
        if (usuario.getEstado() == null || usuario.getEstado() != Constants.ESTADO_ELIMINADO) {
            throw new IllegalArgumentException("El usuario no está eliminado");
        }
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuarioRepository.save(usuario);
    }

    public void bloquear(Long id) {
        Usuario usuario = usuario(id);
        if (usuario.getEstado() != null && usuario.getEstado() == Constants.ESTADO_ELIMINADO) {
            throw new IllegalArgumentException("No se puede bloquear un usuario eliminado");
        }
        usuario.setEstado(Constants.ESTADO_SUSPENDIDO);
        usuarioRepository.save(usuario);
    }

    public void desbloquear(Long id) {
        Usuario usuario = usuario(id);
        if (usuario.getEstado() == null || usuario.getEstado() != Constants.ESTADO_SUSPENDIDO) {
            throw new IllegalArgumentException("El usuario no está bloqueado");
        }
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuarioRepository.save(usuario);
    }

    private Usuario usuario(Long id) {
        return usuarioRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
    }

    private Usuario usuarioConRoles(Long id) {
        return usuarioRepository.findByIdWithRoles(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
    }

    private void setEstado(Long id, int estado) {
        Usuario usuario = usuario(id);
        usuario.setEstado(estado);
        usuarioRepository.save(usuario);
    }
}
