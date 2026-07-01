package com.hotclick.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Extrae el empresaId del JWT y lo pone en TenantContext para el
 * resto del request. Se registra DESPUÉS del JwtRequestFilter en
 * SecurityConfig para que el JWT ya esté validado.
 *
 * Limpia el ThreadLocal en finally — obligatorio para evitar leaks
 * en el thread pool de Tomcat.
 */
public class TenantFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TenantFilter.class);

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7);
                try {
                    Long empresaId = jwtUtil.extractEmpresaId(token);
                    if (empresaId != null) {
                        TenantContext.set(empresaId);
                    }
                } catch (Exception e) {
                    log.debug("tenant filter jwt error: {}", e.getMessage());
                }
            }
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
