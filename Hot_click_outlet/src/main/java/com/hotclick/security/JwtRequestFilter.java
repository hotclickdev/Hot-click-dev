package com.hotclick.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.hotclick.service.SecurityAuditService;
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
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class JwtRequestFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtRequestFilter.class);

    @Autowired private JwtUtil                jwtUtil;
    @Autowired private UserDetailsService     userDetailsService;
    @Autowired private SecurityAuditService   auditService;
    @Autowired private SecurityDetectionService detectionService;
    @Autowired private Cache<String, UserDetails> userDetailsCache;

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
                if (jwtUtil.validateToken(jwt, username)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (Exception e) {
                log.error("[JWT] Auth failed for user {}: {}", username, e.toString());
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
