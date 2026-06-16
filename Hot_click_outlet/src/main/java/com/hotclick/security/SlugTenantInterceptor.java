package com.hotclick.security;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;
import java.util.Map;

/**
 * Interceptor para rutas públicas de tienda por slug: /api/tienda/{slug}/**
 *
 * Lee el path variable {slug}, resuelve la Empresa en BD y escribe
 * TenantContext.set(empresaId) para que el controller lo consuma igual
 * que cualquier otro endpoint autenticado con JWT.
 *
 * IMPORTANTE — orden de ejecución en el request:
 *   TenantFilter (servlet filter) → DispatcherServlet → preHandle() → controller → afterCompletion()
 *   → TenantFilter.finally clears TenantContext.
 *
 * Esto garantiza que preHandle sobrescribe el TenantContext (null para anon) sin
 * necesidad de limpiar en afterCompletion: el TenantFilter ya lo hace.
 *
 * Restricciones de seguridad aplicadas:
 *   - Empresa debe tener estado_empresa = 'ACTIVO'
 *   - Empresa debe tener visibilidad_publica = true
 *   Cualquier incumplimiento → 404 (no revelar existencia de empresas inactivas).
 */
@Component
public class SlugTenantInterceptor implements HandlerInterceptor {

    public static final String ATTR_EMPRESA = "storefrontEmpresa";

    private final EmpresaRepository empresaRepository;

    public SlugTenantInterceptor(EmpresaRepository empresaRepository) {
        this.empresaRepository = empresaRepository;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) throws IOException {
        @SuppressWarnings("unchecked")
        Map<String, String> pathVars =
            (Map<String, String>) request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);

        if (pathVars == null || !pathVars.containsKey("slug")) {
            respond404(response);
            return false;
        }

        String slug = pathVars.get("slug");
        Empresa empresa = empresaRepository.findBySlug(slug).orElse(null);

        if (empresa == null
                || !"ACTIVO".equals(empresa.getEstadoEmpresa())
                || !Boolean.TRUE.equals(empresa.getVisibilidadPublica())) {
            respond404(response);
            return false;
        }

        // Inyecta el empresaId en TenantContext — mismo mecanismo que TenantFilter usa con JWT.
        // El TenantFilter.finally() limpiará este valor al terminar el request.
        TenantContext.set(empresa.getId());
        // Disponible en el controller para evitar un segundo lookup
        request.setAttribute(ATTR_EMPRESA, empresa);
        return true;
    }

    private void respond404(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.NOT_FOUND.value());
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"Tienda no encontrada\"}");
    }
}
