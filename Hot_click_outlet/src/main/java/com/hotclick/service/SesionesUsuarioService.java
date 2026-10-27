package com.hotclick.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Corta todas las sesiones de un usuario cuando su cuenta deja de estar activa (eliminar, rechazar, bloquear,
 * desactivar, quitar del último equipo): revoca sus refresh tokens, marca {@code sesionesInvalidadasEn} para que
 * todo access token ya emitido deje de valer y saca su UserDetails de la caché del filtro JWT.
 */
@Service
public class SesionesUsuarioService {

    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private RefreshTokenService refreshTokenService;
    @Autowired private Cache<String, UserDetails> userDetailsCache;

    @Transactional
    public void cortarSesiones(Usuario usuario) {
        if (usuario == null) return;
        usuario.setSesionesInvalidadasEn(LocalDateTime.now(Constants.ZONA_CR));
        usuarioRepository.save(usuario);
        refreshTokenService.revocarTodosDeUsuario(usuario);
        if (usuario.getCorreo() != null) {
            userDetailsCache.invalidate(usuario.getCorreo());
        }
    }
}
