package com.hotclick.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rechaza bodies no-multipart (JSON, form) por encima de un tope. Los uploads
 * multipart ya tienen su propio límite en spring.servlet.multipart.max-file-size —
 * este filtro cubre el resto de los endpoints, que antes no tenían ningún tope
 * y aceptaban un JSON de cualquier tamaño.
 */
public class MaxRequestBodySizeFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(MaxRequestBodySizeFilter.class);
    private static final long MAX_BODY_BYTES = 2L * 1024 * 1024; // 2MB

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String contentType = request.getContentType();
        boolean isMultipart = contentType != null
            && contentType.toLowerCase().startsWith(MediaType.MULTIPART_FORM_DATA_VALUE);

        if (!isMultipart && request.getContentLengthLong() > MAX_BODY_BYTES) {
            log.warn("[BODY-TOO-LARGE] ip={} path={} length={}",
                request.getRemoteAddr(), request.getRequestURI(), request.getContentLengthLong());
            response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                "{\"success\":false,\"message\":\"El cuerpo de la solicitud excede el tamaño permitido\"}");
            return;
        }

        chain.doFilter(request, response);
    }
}
