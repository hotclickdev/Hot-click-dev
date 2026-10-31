package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;

/**
 * Guarda común del catálogo: el miembro de equipo CAJERO lleva rol Spring EMPRENDEDOR, así que
 * {@code hasAnyRole('ADMIN','EMPRENDEDOR')} lo dejaba crear/editar/borrar productos, stock, imágenes,
 * ofertas, categorías e inventario. Toda escritura bajo esas rutas (ver WebMvcConfig) de un CAJERO del
 * negocio resuelto recibe 403. Las lecturas siguen abiertas (el POS consulta el catálogo).
 */
@Component
public class CajeroSinCatalogoInterceptor implements HandlerInterceptor {

    static final String MSG = "Tu rol de Cajero solo opera el punto de venta; no podés modificar el catálogo.";
    private static final Set<String> LECTURAS = Set.of("GET", "HEAD", "OPTIONS");

    private final PropietarioGuard propietarioGuard;
    private final CompanyScope companyScope;
    private final ObjectMapper objectMapper;

    public CajeroSinCatalogoInterceptor(PropietarioGuard propietarioGuard, CompanyScope companyScope,
                                        ObjectMapper objectMapper) {
        this.propietarioGuard = propietarioGuard;
        this.companyScope = companyScope;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res, @NonNull Object handler)
            throws Exception {
        if (LECTURAS.contains(req.getMethod())) return true;
        if (!propietarioGuard.esCajero(companyScope.getCurrentEmpresaIdOrOwn())) return true;
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(res.getWriter(), ResponseDTO.error(MSG));
        return false;
    }
}
