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
 * Cuerpo de largo desconocido (Transfer-Encoding chunked, o HTTP/2 sin Content-Length) también da 413: Tomcat parsea el multipart leyendo su propio
 * stream interno (no el de un wrapper), así que un contador sobre getInputStream no cortaría nada, y
 * max-request-size es global al servlet. Los navegadores siempre mandan Content-Length en un FormData.
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
        String te = req.getHeader("Transfer-Encoding");
        if (te != null && !te.isBlank() && !"identity".equalsIgnoreCase(te.trim())) return Long.MAX_VALUE;
        // HTTP/2 puede mandar cuerpo sin Content-Length; en HTTP/1.1 sin CL ni TE el cuerpo es vacío.
        boolean sinLargo = req.getHeader("Content-Length") == null && req.getContentLengthLong() < 0;
        if (sinLargo && req.getProtocol() != null && req.getProtocol().startsWith("HTTP/2")) return Long.MAX_VALUE;
        long l = req.getContentLengthLong();
        String h = req.getHeader("Content-Length");
        if (h != null) {
            try { l = Math.max(l, Long.parseLong(h.trim())); } catch (NumberFormatException e) { return Long.MAX_VALUE; }
        }
        return l;
    }
}
