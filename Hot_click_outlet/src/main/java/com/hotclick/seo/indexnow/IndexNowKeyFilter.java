package com.hotclick.seo.indexnow;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Sirve {@code /{clave}.txt} (prueba de propiedad de IndexNow) solo si hay clave configurada y la ruta coincide exacto.
 * Va antes de Spring Security para no depender de las reglas de autorización; cualquier otra ruta pasa sin tocarse.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class IndexNowKeyFilter implements Filter {

    private final IndexNowService indexNow;

    public IndexNowKeyFilter(IndexNowService indexNow) {
        this.indexNow = indexNow;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest req && response instanceof HttpServletResponse res
            && "GET".equals(req.getMethod()) && req.getRequestURI().endsWith(".txt")) {
            Optional<String> clave = indexNow.clave();
            if (clave.isPresent() && req.getRequestURI().equals("/" + clave.get() + ".txt")) {
                res.setStatus(200);
                res.setContentType("text/plain;charset=UTF-8");
                res.getOutputStream().write(clave.get().getBytes(StandardCharsets.UTF_8));
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
