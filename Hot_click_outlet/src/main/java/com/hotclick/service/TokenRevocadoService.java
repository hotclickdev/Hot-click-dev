package com.hotclick.service;

import com.hotclick.model.TokenRevocado;
import com.hotclick.repository.TokenRevocadoRepository;
import com.hotclick.security.JwtUtil;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Date;

/**
 * Denylist de JWT por jti. Se consulta en {@code JwtRequestFilter} en cada request autenticado
 * (búsqueda por PK). Tokens viejos sin jti no se pueden revocar uno por uno: vencen solos (15/30 min).
 */
@Service
public class TokenRevocadoService {

    private static final Logger log = LoggerFactory.getLogger(TokenRevocadoService.class);

    public static final String MOTIVO_IMPERSONACION_FIN = "IMPERSONACION_FIN";
    public static final String MOTIVO_IMPERSONACION_ESCRITURA = "IMPERSONACION_ESCRITURA";
    public static final String MOTIVO_LOGOUT = "LOGOUT";

    @Autowired private TokenRevocadoRepository repository;
    @Autowired private JwtUtil jwtUtil;

    /** Revoca el token hasta su exp. Idempotente; un token ilegible o sin jti se ignora. */
    @Transactional
    public void revocar(String rawToken, String motivo) {
        String jti;
        Date exp;
        try {
            jti = jwtUtil.extractJti(rawToken);
            exp = jwtUtil.extractExpiration(rawToken);
        } catch (Exception e) {
            log.debug("[token-revocado] token ilegible, no se revoca: {}", e.getMessage());
            return;
        }
        if (jti == null || jti.isBlank() || repository.existsById(jti)) return;
        LocalDateTime expiraEn = LocalDateTime.ofInstant(exp.toInstant(), Constants.ZONA_CR);
        repository.save(new TokenRevocado(jti, expiraEn, motivo, LocalDateTime.now(Constants.ZONA_CR)));
    }

    public boolean estaRevocado(String jti) {
        return jti != null && !jti.isBlank() && repository.existsById(jti);
    }

    /** Purga cada hora las entradas cuyo token ya venció (ya no sirven de nada). */
    @Scheduled(cron = "0 17 * * * *", zone = "America/Costa_Rica")
    @SchedulerLock(name = "token-revocado-purga", lockAtMostFor = "PT5M", lockAtLeastFor = "PT30S")
    @Transactional
    public void purgarVencidosProgramado() {
        purgarVencidos();
    }

    @Transactional
    public int purgarVencidos() {
        int n = repository.borrarVencidos(LocalDateTime.now(Constants.ZONA_CR));
        if (n > 0) log.info("[token-revocado] purgados {} jti vencidos", n);
        return n;
    }
}
