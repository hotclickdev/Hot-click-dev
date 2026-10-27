package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Área 2 (ALTO): los miembros EDITOR y LECTOR llevan rol Spring EMPRENDEDOR, así que las reglas
 * {@code hasAnyRole(ADMIN, EMPRENDEDOR)} de finanzas, dashboard, ads, asignar, mesas, importar y reset-datos
 * los dejaban pasar. Estas pantallas son del PROPIETARIO del negocio (o del ADMIN de plataforma):
 * {@link PropietarioGuard#puedeGestionarEmpresa}. Se registra solo en las rutas de {@code WebMvcConfig}.
 *
 * Un usuario sin negocio resuelto no se toca acá: los controladores ya lo rechazan por su cuenta
 * ({@code requireEmpresaId}); este interceptor solo niega a quien SÍ tiene negocio y no es su propietario.
 */
@Component
public class SoloPropietarioNegocioInterceptor implements HandlerInterceptor {

    private final PropietarioGuard propietarioGuard;
    private final CompanyScope companyScope;
    private final ObjectMapper objectMapper;

    public SoloPropietarioNegocioInterceptor(PropietarioGuard propietarioGuard, CompanyScope companyScope,
                                             ObjectMapper objectMapper) {
        this.propietarioGuard = propietarioGuard;
        this.companyScope = companyScope;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res, @NonNull Object handler)
            throws Exception {
        if ("OPTIONS".equals(req.getMethod())) return true;
        if (companyScope.isAdminIT()) return true;
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) return true; // sin negocio: lo rechaza el controlador
        if (propietarioGuard.puedeGestionarEmpresa(empresaId)) return true;
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(res.getWriter(), ResponseDTO.error(PropietarioGuard.MSG));
        return false;
    }
}
