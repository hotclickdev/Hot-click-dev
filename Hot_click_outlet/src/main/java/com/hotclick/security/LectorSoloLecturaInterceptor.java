package com.hotclick.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;

/**
 * El miembro de equipo LECTOR ("solo visualización") lleva rol Spring EMPRENDEDOR; sin esto podía
 * crear/editar/borrar productos y pedidos. Corta toda escritura en las rutas registradas en
 * WebMvcConfig antes de leer el cuerpo. EDITOR, PROPIETARIO y ADMIN no se tocan.
 */
@Component
public class LectorSoloLecturaInterceptor implements HandlerInterceptor {

    static final String MSG = "Tu rol de Lector es solo de visualización.";
    private static final Set<String> LECTURAS = Set.of("GET", "HEAD", "OPTIONS");

    private final PropietarioGuard propietarioGuard;
    private final CompanyScope companyScope;

    public LectorSoloLecturaInterceptor(PropietarioGuard propietarioGuard, CompanyScope companyScope) {
        this.propietarioGuard = propietarioGuard;
        this.companyScope = companyScope;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res, @NonNull Object handler)
            throws Exception {
        if (LECTURAS.contains(req.getMethod())) return true;
        if (!propietarioGuard.esLector(companyScope.getCurrentEmpresaIdOrOwn())) return true;
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("{\"success\":false,\"message\":\"" + MSG + "\"}");
        return false;
    }
}
