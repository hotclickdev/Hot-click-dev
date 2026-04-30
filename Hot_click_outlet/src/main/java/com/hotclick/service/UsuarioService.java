package com.hotclick.service;

import com.hotclick.model.Usuario;
import com.hotclick.model.Rol;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.RolRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    @Transactional
    public Usuario registrarUsuario(Usuario usuario) {
        if (usuarioRepository.existsByCorreo(usuario.getCorreo())) {
            throw new RuntimeException("El correo ya está registrado");
        }
        if (usuarioRepository.existsByIdentificacion(usuario.getIdentificacion())) {
            throw new RuntimeException("La identificación ya está registrada");
        }
        Optional<Rol> rolDefault = rolRepository.findByNombreRol(Constants.ROL_USUARIO_FINAL);
        if (rolDefault.isPresent()) {
            usuario.getRoles().add(rolDefault.get());
        }
        usuario.setEstado(Constants.ESTADO_ACTIVO);
        usuario.setIntentosFallidos(0);
        return usuarioRepository.save(usuario);
    }

    public Optional<Usuario> buscarPorCorreo(String correo) {
        return usuarioRepository.findByCorreo(correo);
    }

    public Optional<Usuario> buscarPorId(Long id) {
        return usuarioRepository.findById(id);
    }

    @Transactional
    public void actualizarUltimoAcceso(Long id) {
        usuarioRepository.updateUltimoAcceso(id, LocalDateTime.now());
    }

    @Transactional
    public void incrementarIntentosFallidos(Long id) {
        usuarioRepository.incrementarIntentosFallidos(id);
        Usuario usuario = usuarioRepository.findById(id).orElse(null);
        if (usuario != null && usuario.getIntentosFallidos() >= 5) {
            usuarioRepository.bloquearUsuario(id, LocalDateTime.now().plusMinutes(30));
        }
    }

    @Transactional
    public void resetearIntentosFallidos(Long id) {
        usuarioRepository.resetearIntentosFallidos(id);
    }
}
