package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RefreshTokenRepository;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.security.SecurityEventType;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class RefreshTokenService {

    public static final String COOKIE_NAME = "hotclick_refresh";
    public static final String COOKIE_PATH = "/api/auth/refresh";

    private static final long REFRESH_EXPIRY_DAYS = 30L;
    private static final Duration COOKIE_MAX_AGE = Duration.ofDays(REFRESH_EXPIRY_DAYS);

    @Autowired
    private RefreshTokenRepository repo;

    @Autowired
    private SecurityAuditService auditService;

    @Transactional
    public RefreshToken crear(Usuario usuario) {
        repo.revokeAllByUsuario(usuario, LocalDateTime.now(Constants.ZONA_CR));
        return persistNew(usuario);
    }

    /**
     * Rotación: revoca el token presentado y emite uno nuevo.
     * Si el token ya estaba revocado y aún no expiró → reuso (posible robo):
     * se revoca toda la familia del usuario y se audita.
     */
    @Transactional
    public RefreshToken rotar(String rawToken, HttpServletRequest request) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalStateException("Sesión expirada. Iniciá sesión de nuevo.");
        }
        String hash = hashToken(rawToken);
        RefreshToken existing = repo.findByToken(hash)
                .orElseThrow(() -> new IllegalStateException("Sesión expirada. Iniciá sesión de nuevo."));

        if (existing.isRevoked() && !existing.isExpired()) {
            Usuario usuario = existing.getUsuario();
            LocalDateTime now = LocalDateTime.now(Constants.ZONA_CR);
            repo.revokeAllByUsuario(usuario, now);
            auditReuse(usuario, request);
            throw new IllegalStateException("Sesión inválida. Iniciá sesión de nuevo.");
        }
        if (!existing.isValid()) {
            throw new IllegalStateException("Sesión expirada. Iniciá sesión de nuevo.");
        }

        existing.setRevokedAt(LocalDateTime.now(Constants.ZONA_CR));
        repo.save(existing);
        return persistNew(existing.getUsuario());
    }

    @Transactional(readOnly = true)
    public RefreshToken validar(String rawToken) {
        return repo.findByToken(hashToken(rawToken))
                .filter(RefreshToken::isValid)
                .orElseThrow(() -> new IllegalStateException("Sesión expirada. Iniciá sesión de nuevo."));
    }

    @Transactional
    public void revocar(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        repo.findByToken(hashToken(rawToken)).ifPresent(rt -> {
            rt.setRevokedAt(LocalDateTime.now(Constants.ZONA_CR));
            repo.save(rt);
        });
    }

    @Transactional
    public void revocarTodosDeUsuario(Usuario usuario) {
        if (usuario == null) return;
        repo.revokeAllByUsuario(usuario, LocalDateTime.now(Constants.ZONA_CR));
    }

    public String readCookie(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                String value = cookie.getValue();
                return (value == null || value.isBlank()) ? null : value;
            }
        }
        return null;
    }

    public void writeCookie(HttpServletResponse response, String rawToken) {
        if (response == null || rawToken == null || rawToken.isBlank()) return;
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie(rawToken, COOKIE_MAX_AGE).toString());
    }

    public void clearCookie(HttpServletResponse response) {
        if (response == null) return;
        response.addHeader(HttpHeaders.SET_COOKIE, buildCookie("", Duration.ZERO).toString());
    }

    /** SHA-256 hex del valor en claro. Usado por findByToken. */
    public static String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    private RefreshToken persistNew(Usuario usuario) {
        String raw = UUID.randomUUID().toString();
        RefreshToken rt = new RefreshToken();
        rt.setToken(hashToken(raw));
        rt.setRawToken(raw);
        rt.setUsuario(usuario);
        rt.setExpiresAt(LocalDateTime.now(Constants.ZONA_CR).plusDays(REFRESH_EXPIRY_DAYS));
        RefreshToken saved = repo.save(rt);
        saved.setRawToken(raw);
        attachCookieToCurrentResponse(raw);
        return saved;
    }

    private void attachCookieToCurrentResponse(String rawToken) {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return;
        writeCookie(attrs.getResponse(), rawToken);
    }

    private ResponseCookie buildCookie(String value, Duration maxAge) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(requestIsSecure())
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }

    /** HTTPS (o X-Forwarded-Proto=https detrás de Nginx). En http://localhost queda sin Secure. */
    private boolean requestIsSecure() {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return true;
        return attrs.getRequest().isSecure();
    }

    private void auditReuse(Usuario usuario, HttpServletRequest request) {
        auditService.log(
                SecurityEventType.TOKEN_REJECTED,
                SecurityEventSeverity.HIGH,
                usuario != null ? usuario.getId() : null,
                usuario != null ? usuario.getCorreo() : null,
                auditService.getIp(request),
                auditService.getUa(request),
                "/api/auth/refresh",
                Map.of("reason", "refresh_token_reuse")
        );
    }

    @Scheduled(cron = "0 15 3 * * *")
    @SchedulerLock(name = "refresh_token_cleanup", lockAtMostFor = "PT10M", lockAtLeastFor = "PT5M")
    @Transactional
    public void limpiarExpirados() {
        repo.deleteExpired(LocalDateTime.now(Constants.ZONA_CR));
        repo.deleteRevoked(LocalDateTime.now(Constants.ZONA_CR).minusHours(24));
    }
}
