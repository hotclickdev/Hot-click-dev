package com.hotclick.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * CMP-3 / QA-CONC-5: {@code ?page=999999999} desbordaba el offset y daba 500.
 * Para /api/**: page entero entre 0 y {@value #MAX_PAGE}, size entero entre 1 y {@value #MAX_SIZE}; si no, 400.
 * (Cada endpoint sigue capeando size a su propio máximo.)
 */
@Component
public class PaginacionLimiteFilter extends OncePerRequestFilter {

    static final int MAX_PAGE = 10_000;
    static final int MAX_SIZE = 10_000; // export CSV pide size=9999
    static final String MSG = "Parámetros de paginación inválidos (page 0-" + MAX_PAGE + ", size 1-" + MAX_SIZE + ").";

    static boolean valido(String valor, int min, int max) {
        if (valor == null) return true;
        String t = valor.trim();
        if (t.isEmpty() || t.length() > 9 || !t.chars().allMatch(Character::isDigit)) return false;
        int n = Integer.parseInt(t);
        return n >= min && n <= max;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        if (!valido(request.getParameter("page"), 0, MAX_PAGE) || !valido(request.getParameter("size"), 1, MAX_SIZE)) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"" + MSG + "\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
