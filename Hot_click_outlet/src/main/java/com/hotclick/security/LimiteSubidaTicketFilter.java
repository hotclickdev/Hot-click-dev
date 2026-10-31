package com.hotclick.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Seguridad (BAJO 3): {@code POST /api/soporte/tickets/fotos} acepta hasta 10 MB, pero el multipart global es 30 MB.
 * Rechaza por Content-Length antes de que Tomcat lea y guarde el cuerpo; el resto de subidas no cambia.
 * Sin Content-Length (chunked) sigue el tope global de 30 MB y el validador de 10 MB.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 5)
public class LimiteSubidaTicketFilter extends OncePerRequestFilter {

    public static final String RUTA = "/api/soporte/tickets/fotos";
    /** 10 MB de archivo + holgura para los encabezados multipart. */
    public static final long MAX_CUERPO = 10L * 1024 * 1024 + 64 * 1024;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        if (!"POST".equals(req.getMethod())) return true;
        String ruta = RutaCajero.normalizar(req);
        return ruta != null && !RUTA.equals(ruta);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if (largo(req) > MAX_CUERPO) {
            res.setStatus(413);
            res.setContentType("application/json;charset=UTF-8");
            res.getWriter().write("{\"success\":false,\"message\":\"La imagen no puede superar 10 MB\"}");
            return;
        }
        chain.doFilter(req, res);
    }

    static long largo(HttpServletRequest req) {
        long l = req.getContentLengthLong();
        String h = req.getHeader("Content-Length");
        if (h != null) {
            try { l = Math.max(l, Long.parseLong(h.trim())); } catch (NumberFormatException e) { return Long.MAX_VALUE; }
        }
        return l;
    }
}
