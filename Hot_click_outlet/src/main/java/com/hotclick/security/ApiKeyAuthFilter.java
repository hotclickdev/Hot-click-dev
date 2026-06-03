package com.hotclick.security;

import com.hotclick.model.ApiKey;
import com.hotclick.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Authenticates requests using HOTCLICK API keys (hck_live_... / hck_test_...).
 *
 * When a valid API key is found:
 *   1. Sets ROLE_EMPRENDEDOR authentication in SecurityContextHolder.
 *   2. Stores the empresaId as a request attribute so TenantFilter can pick it up.
 *
 * Must be registered BEFORE JwtRequestFilter in SecurityConfig.
 */
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    static final String ATTR_EMPRESA_ID = "_hck_api_empresa_id";

    @Autowired
    private ApiKeyService apiKeyService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer hck_")) {
            String plainKey = header.substring(7);
            Optional<ApiKey> keyOpt = apiKeyService.autenticar(plainKey);
            if (keyOpt.isPresent()) {
                ApiKey apiKey = keyOpt.get();
                request.setAttribute(ATTR_EMPRESA_ID, apiKey.getEmpresa().getId());

                List<SimpleGrantedAuthority> authorities = buildAuthorities(apiKey.getScopes());
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    apiKey.getEmpresa().getCorreoEmpresa(),
                    null,
                    authorities
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        chain.doFilter(request, response);
    }

    /**
     * Convierte el campo scopes (CSV) en authorities de Spring Security.
     *
     * "read:all" → ROLE_EMPRENDEDOR (acceso completo, retrocompatible).
     * Scopes específicos → ROLE_API_CLIENT + SCOPE_<scope> por cada scope.
     *   - ROLE_API_CLIENT permite pasar las reglas de SecurityConfig para los endpoints habilitados.
     *   - SCOPE_<scope> es evaluado por @PreAuthorize en cada endpoint para restricción granular.
     */
    private List<SimpleGrantedAuthority> buildAuthorities(String scopes) {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        if (scopes == null || scopes.isBlank() || scopes.contains("read:all")) {
            authorities.add(new SimpleGrantedAuthority("ROLE_EMPRENDEDOR"));
            return authorities;
        }
        // Scoped API key: pasa SecurityConfig vía ROLE_API_CLIENT; @PreAuthorize restringe por scope
        authorities.add(new SimpleGrantedAuthority("ROLE_API_CLIENT"));
        for (String scope : scopes.split(",")) {
            String s = scope.trim();
            if (!s.isEmpty()) {
                authorities.add(new SimpleGrantedAuthority("SCOPE_" + s));
            }
        }
        return authorities;
    }
}
