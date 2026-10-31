package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;
import java.util.Set;

/**
 * Rol de equipo CAJERO: deny por defecto. El miembro lleva rol Spring EMPRENDEDOR, así que sin esta guarda
 * entraría a pedidos, clientes, cupones, gastos, etc. Solo opera el POS del negocio de su token: todo
 * {@code /api/pos/**} y las lecturas que el POS necesita (catálogo, categorías y bodegas) más su propia cuenta.
 * Cualquier otra ruta de {@code /api/**} (ver exclusiones en WebMvcConfig) recibe 403.
 */
@Component
public class CajeroSoloPosInterceptor implements HandlerInterceptor {

    static final String MSG = "Tu rol de Cajero solo opera el punto de venta.";
    private static final Set<String> LECTURAS = Set.of("GET", "HEAD", "OPTIONS");
    private static final List<String> SIEMPRE = List.of("/api/pos", "/api/pos/**", "/api/cuenta", "/api/cuenta/**",
        "/api/consentimiento", "/api/consentimiento/**");
    private static final List<String> SOLO_LECTURA = List.of("/api/productos", "/api/productos/**",
        "/api/categorias", "/api/categorias/**", "/api/bodegas", "/api/bodegas/**");
    private static final AntPathMatcher MATCHER = new AntPathMatcher();

    private final PropietarioGuard propietarioGuard;
    private final CompanyScope companyScope;
    private final ObjectMapper objectMapper;

    public CajeroSoloPosInterceptor(PropietarioGuard propietarioGuard, CompanyScope companyScope,
                                    ObjectMapper objectMapper) {
        this.propietarioGuard = propietarioGuard;
        this.companyScope = companyScope;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res, @NonNull Object handler)
            throws Exception {
        if ("OPTIONS".equals(req.getMethod())) return true;
        if (!propietarioGuard.esCajero(companyScope.getCurrentEmpresaIdOrOwn())) return true;
        String ruta = req.getRequestURI().substring(req.getContextPath().length());
        if (coincide(SIEMPRE, ruta)) return true;
        if (LECTURAS.contains(req.getMethod()) && coincide(SOLO_LECTURA, ruta)) return true;
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(res.getWriter(), ResponseDTO.error(MSG));
        return false;
    }

    private static boolean coincide(List<String> patrones, String ruta) {
        for (String p : patrones) if (MATCHER.match(p, ruta)) return true;
        return false;
    }
}
