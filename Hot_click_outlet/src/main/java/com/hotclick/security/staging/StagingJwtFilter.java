package com.hotclick.security.staging;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Solo staging: acepta JWT HS256 firmados con STAGING_JWT_SECRET (claims email y role).
 * Lo crea StagingAuthConfig únicamente si StagingAuthGuard.validar(...) devuelve true.
 */
public class StagingJwtFilter extends OncePerRequestFilter {

    /** Marca para que JwtRequestFilter no reprocese (ni cuente como inválido) un token de staging válido. */
    public static final String ATTR_STAGING_AUTH = "hotclick.staging.auth";


    private final SecretKey key;

    public StagingJwtFilter(String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String h = req.getHeader("Authorization");
        String raw = h != null && h.startsWith("Bearer ") ? h.substring(7) : null;
        if (raw != null && !raw.isBlank()
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                var jws = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(raw.trim());
                if (!SignatureAlgorithm.HS256.getValue().equals(jws.getHeader().getAlgorithm())) {
                    throw new JwtException("alg");
                }
                Claims c = jws.getBody();
                String email = c.get("email", String.class);
                String role = c.get("role", String.class);
                if (email == null || role == null || !role.matches("[A-Z_]{2,40}")) {
                    throw new JwtException("claims");
                }
                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                var principal = new com.hotclick.security.HotclickUserDetails(email, "", authorities, null);
                var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
                req.setAttribute(ATTR_STAGING_AUTH, Boolean.TRUE);
            } catch (JwtException | IllegalArgumentException e) {
                // No es un token de staging: sigue la cadena normal (JwtRequestFilter decide).
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(req, res);
    }
}
