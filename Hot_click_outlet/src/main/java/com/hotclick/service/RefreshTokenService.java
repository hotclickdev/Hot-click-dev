package com.hotclick.service;

import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private static final long REFRESH_EXPIRY_DAYS = 30L;

    @Autowired
    private RefreshTokenRepository repo;

    @Transactional
    public RefreshToken crear(Usuario usuario) {
        repo.revokeAllByUsuario(usuario, LocalDateTime.now());
        RefreshToken rt = new RefreshToken();
        rt.setToken(UUID.randomUUID().toString());
        rt.setUsuario(usuario);
        rt.setExpiresAt(LocalDateTime.now().plusDays(REFRESH_EXPIRY_DAYS));
        return repo.save(rt);
    }

    @Transactional(readOnly = true)
    public RefreshToken validar(String tokenStr) {
        return repo.findByToken(tokenStr)
                .filter(RefreshToken::isValid)
                .orElseThrow(() -> new RuntimeException("Sesión expirada. Iniciá sesión de nuevo."));
    }

    @Transactional
    public void revocar(String tokenStr) {
        repo.findByToken(tokenStr).ifPresent(rt -> {
            rt.setRevokedAt(LocalDateTime.now());
            repo.save(rt);
        });
    }

    // Limpia tokens expirados a las 3am para mantener la tabla pequeña
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void limpiarExpirados() {
        repo.deleteExpired(LocalDateTime.now());
    }
}
