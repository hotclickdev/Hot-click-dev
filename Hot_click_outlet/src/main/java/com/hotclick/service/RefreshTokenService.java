package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
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
        repo.revokeAllByUsuario(usuario, LocalDateTime.now(Constants.ZONA_CR));
        RefreshToken rt = new RefreshToken();
        rt.setToken(UUID.randomUUID().toString());
        rt.setUsuario(usuario);
        rt.setExpiresAt(LocalDateTime.now(Constants.ZONA_CR).plusDays(REFRESH_EXPIRY_DAYS));
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
            rt.setRevokedAt(LocalDateTime.now(Constants.ZONA_CR));
            repo.save(rt);
        });
    }

    // Limpia tokens expirados a las 3:15 AM — escalonado para no competir con BillingRenewal (3:00)
    @Scheduled(cron = "0 15 3 * * *")
    @SchedulerLock(name = "refresh_token_cleanup", lockAtMostFor = "PT10M", lockAtLeastFor = "PT5M")
    @Transactional
    public void limpiarExpirados() {
        repo.deleteExpired(LocalDateTime.now(Constants.ZONA_CR));
        repo.deleteRevoked(LocalDateTime.now(Constants.ZONA_CR).minusHours(24));
    }
}
