package com.hotclick.security;

import com.hotclick.repository.IpBloqueadaRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rechaza todas las requests de IPs manualmente bloqueadas desde Security Center.
 * Falla abierto (fail-open): si la BD no responde, deja pasar la request.
 */
public class BlockedIpFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(BlockedIpFilter.class);

    @Autowired
    private IpBloqueadaRepository ipBloqueadaRepo;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String ip = request.getRemoteAddr();
        try {
            if (ip != null && ipBloqueadaRepo.existsByIpAddressAndActivaTrue(ip)) {
                log.warn("[BLOCKED-IP] Request rechazada de IP bloqueada: {}", ip);
                response.setStatus(403);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write(
                    "{\"success\":false,\"message\":\"Acceso denegado.\"}");
                return;
            }
        } catch (Exception e) {
            log.warn("[BLOCKED-IP] DB unavailable, fail-open: {}", e.getMessage());
        }
        chain.doFilter(request, response);
    }
}
