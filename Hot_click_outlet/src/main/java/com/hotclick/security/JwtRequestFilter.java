package com.hotclick.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TokenRevocadoService;
import com.hotclick.service.SecurityDetectionService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;
import com.hotclick.utils.Constants;

import java.time.Instant;

import java.io.IOException;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

public class JwtRequestFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtRequestFilter.class);

    @Autowired private JwtUtil                jwtUtil;
    @Autowired private UserDetailsService     userDetailsService;
    @Autowired private SecurityAuditService   auditService;
    @Autowired private SecurityDetectionService detectionService;
    @Autowired private Cache<String, UserDetails> userDetailsCache;
    @Autowired private TokenRevocadoService   tokenRevocadoService;
    @Autowired private AuditoriaAdminRegistroService auditoriaAdminRegistroService;

    /** Rutas de escritura permitidas en modo solo lectura de «Ver como el negocio». */
    private static final Pattern RUTAS_PERMITIDAS_SOLO_LECTURA =
        Pattern.compile("^/api/impersonacion/\\d+/(finalizar|escritura)$|^/api/auth/logout$");
    private static final Set<String> METODOS_ESCRITURA = Set.of("POST", "PUT", "PATCH", "DELETE");
    static final String MSG_SOLO_LECTURA =
        "Modo solo lectura: estás viendo este negocio como soporte. Para hacer cambios, habilitá el modo escritura con un motivo.";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        String username = null;
        String jwt      = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            jwt = authHeader.substring(7);
            try {
                username = jwtUtil.extractUsername(jwt);
            } catch (ExpiredJwtException e) {
                // Expired token: log for analytics but don't block (public endpoints still accessible)
                log.debug("[JWT] Expired token from ip={}", request.getRemoteAddr());
                try {
                    auditService.logTokenExpired(request.getRemoteAddr(),
                        request.getHeader("User-Agent"), request.getServletPath());
                } catch (Exception ae) { log.warn("audit error: {}", ae.getMessage()); }
            } catch (JwtException | IllegalArgumentException e) {
                // Invalid/tampered token
                log.debug("[JWT] Invalid token from ip={}: {}", request.getRemoteAddr(), e.getMessage());
                try {
                    String ip = request.getRemoteAddr();
                    auditService.logTokenRejected(ip,
                        request.getHeader("User-Agent"),
                        request.getServletPath(),
                        e.getClass().getSimpleName());
                    detectionService.recordInvalidJwt(ip);
                } catch (Exception ae) { log.warn("audit error: {}", ae.getMessage()); }
            }
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                // Single-purpose tokens (2FA step, empresa selection) must not act as full auth
                if (jwtUtil.isTempToken(jwt) || jwtUtil.isEmpresaSelectionToken(jwt)) {
                    chain.doFilter(request, response);
                    return;
                }
                UserDetails userDetails = userDetailsCache.get(username,
                        k -> userDetailsService.loadUserByUsername(k));
                if (jwtUtil.validateToken(jwt, username) && tokenRevocadoService.estaRevocado(jwtUtil.extractJti(jwt))) {
                    log.debug("[JWT] Token revocado (jti) from ip={}", request.getRemoteAddr());
                    try {
                        auditService.logTokenRejected(request.getRemoteAddr(),
                            request.getHeader("User-Agent"), request.getServletPath(), "TokenRevocado");
                    } catch (Exception ae) { log.warn("audit error: {}", ae.getMessage()); }
                    chain.doFilter(request, response);
                    return;
                }
                if (jwtUtil.validateToken(jwt, username)) {
                    // Soporte: authorities del claim rol (EMPRENDEDOR), no roles de BD del ADMIN.
                    Collection<? extends GrantedAuthority> authorities = userDetails.getAuthorities();
                    if (jwtUtil.isImpersonationToken(jwt)) {
                        String rolJwt = jwtUtil.extractRol(jwt);
                        if (rolJwt != null && !rolJwt.isBlank()) {
                            authorities = List.of(new SimpleGrantedAuthority("ROLE_" + rolJwt));
                        }
                    }
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, authorities);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (Exception e) {
                log.error("[JWT] Auth failed for user {}: {}", username, e.toString());
                SecurityContextHolder.clearContext();
            }
        }
        if (SecurityContextHolder.getContext().getAuthentication() != null
                && jwt != null && METODOS_ESCRITURA.contains(request.getMethod())
                && jwtUtil.isImpersonationToken(jwt)) {
            filtrarEscrituraImpersonacion(jwt, request, response, chain);
            return;
        }
        chain.doFilter(request, response);
    }

    /**
     * Soporte en modo lectura: 403 salvo finalizar/escritura/logout. En modo escritura deja
     * pasar y audita cada request con el admin original, la empresa, método, ruta y status.
     */
    private void filtrarEscrituraImpersonacion(String jwt, HttpServletRequest request,
                                               HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        String ruta = request.getRequestURI().substring(request.getContextPath().length());
        if (RUTAS_PERMITIDAS_SOLO_LECTURA.matcher(ruta).matches()) {
            chain.doFilter(request, response);
            return;
        }
        if (!jwtUtil.isImpersonationWriteMode(jwt)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setCharacterEncoding("UTF-8");
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"code\":\"IMPERSONACION_SOLO_LECTURA\",\"message\":\""
                + MSG_SOLO_LECTURA + "\"}");
            return;
        }
        try {
            chain.doFilter(request, response);
        } finally {
            try {
                auditoriaAdminRegistroService.registrarEscrituraImpersonacion(
                    jwtUtil.extractAdminOriginalId(jwt), jwtUtil.extractAdminOriginalCorreo(jwt),
                    jwtUtil.extractEmpresaId(jwt), request.getMethod(), ruta, response.getStatus());
            } catch (Exception ae) {
                log.error("[impersonacion] no se pudo auditar {} {}: {}", request.getMethod(), ruta, ae.toString());
            }
        }
    }

    /**
     * Sin jti no se puede revocar un token puntual, pero un cambio/reset de
     * contraseña marca sesionesInvalidadasEn: cualquier token emitido antes
     * de ese instante se trata como revocado aunque no haya expirado.
     */
    private boolean fueInvalidadoPorCambioDeSesion(UserDetails userDetails, String jwt) {
        if (!(userDetails instanceof HotclickUserDetails hud) || hud.getSesionesInvalidadasEn() == null) {
            return false;
        }
        try {
            Instant emitidoEn = jwtUtil.extractIssuedAt(jwt).toInstant();
            Instant cortadoEn = hud.getSesionesInvalidadasEn().atZone(Constants.ZONA_CR).toInstant();
            return emitidoEn.isBefore(cortadoEn);
        } catch (Exception e) {
            return false;
        }
    }
}
