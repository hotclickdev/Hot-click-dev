package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
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
        "/api/categorias", "/api/categorias/**", "/api/bodegas", "/api/bodegas/**",
        // ClienteSelector / POSPaymentPanel buscan al cliente de la venta (solo lectura; crear cliente no)
        "/api/crm/clientes/buscar");
    /**
     * Escrituras del POS fuera de /api/pos (decisión del Mentor, #475): alta rápida de cliente de la venta y ticket de
     * soporte. Solo POST exacto; ambos controllers toman la empresa del token (nunca del body). PUT/PATCH/DELETE de
     * clientes, fotos de tickets y listados siguen en 403.
     */
    private static final List<String> SOLO_POST = List.of("/api/crm/clientes", "/api/soporte/tickets", "/api/soporte/tickets/fotos");

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
        String ruta = RutaCajero.normalizar(req);
        if (RutaCajero.coincide(SIEMPRE, ruta)) return true;
        if (LECTURAS.contains(req.getMethod()) && RutaCajero.coincide(SOLO_LECTURA, ruta)) return true;
        if ("POST".equals(req.getMethod()) && RutaCajero.coincide(SOLO_POST, ruta)) return true;
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(res.getWriter(), ResponseDTO.error(MSG));
        return false;
    }
}
