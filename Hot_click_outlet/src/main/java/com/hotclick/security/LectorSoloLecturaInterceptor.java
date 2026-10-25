package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ResponseDTO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.AnnotationUtils;
import org.springframework.util.ClassUtils;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.Set;

/**
 * El miembro de equipo LECTOR ("solo visualización") lleva rol Spring EMPRENDEDOR. Deny por defecto:
 * toda escritura bajo /api/** (ver exclusiones en WebMvcConfig) de un usuario que es LECTOR en el negocio
 * resuelto (JWT empresaId o su empresa propia) recibe 403, salvo handlers con {@link PermiteLector}.
 * Sin negocio o sin membresía LECTOR no aplica. EDITOR, PROPIETARIO y ADMIN no se tocan.
 * <p>
 * CAJERO recibe el mismo deny por defecto (fail-closed). Además de {@link PermiteLector} (acciones personales),
 * solo abre las rutas de {@link CajeroPermisos#RUTAS} (venta POS, abrir/cerrar turno, gestión de QR POS),
 * comparando método + patrón exacto del handler resuelto.
 */
@Component
public class LectorSoloLecturaInterceptor implements HandlerInterceptor {

    static final String MSG = "Tu rol de Lector es solo de visualización.";
    static final String MSG_CAJERO = "Tu rol de Cajero solo puede operar el punto de venta.";
    private static final Set<String> LECTURAS = Set.of("GET", "HEAD", "OPTIONS");

    private final PropietarioGuard propietarioGuard;
    private final CompanyScope companyScope;
    private final ObjectMapper objectMapper;

    public LectorSoloLecturaInterceptor(PropietarioGuard propietarioGuard, CompanyScope companyScope,
                                        ObjectMapper objectMapper) {
        this.propietarioGuard = propietarioGuard;
        this.companyScope = companyScope;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res, @NonNull Object handler)
            throws Exception {
        if (LECTURAS.contains(req.getMethod())) return true;
        if (permiteLector(handler)) return true;
        String rol = propietarioGuard.rolRestringido(companyScope.getCurrentEmpresaIdOrOwn());
        if (rol == null) return true;
        boolean cajero = "CAJERO".equals(rol);
        if (cajero && handler instanceof HandlerMethod
                && CajeroPermisos.permite(req.getMethod(), req.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE))) {
            return true;
        }
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(res.getWriter(), ResponseDTO.error(cajero ? MSG_CAJERO : MSG));
        return false;
    }

    /**
     * Solo un HandlerMethod con la anotación declarada localmente (en el método o en la clase del usuario,
     * resolviendo el proxy CGLIB con ClassUtils.getUserClass) abre la escritura; no se hereda de superclases
     * ni interfaces. Todo lo demás se niega.
     */
    static boolean permiteLector(Object handler) {
        if (!(handler instanceof HandlerMethod hm)) return false;
        Class<?> clase = ClassUtils.getUserClass(hm.getBeanType());
        java.lang.reflect.Method metodo = ClassUtils.getMostSpecificMethod(hm.getMethod(), clase);
        return metodo.getDeclaringClass() == clase && metodo.getDeclaredAnnotation(PermiteLector.class) != null
            || AnnotationUtils.isAnnotationDeclaredLocally(PermiteLector.class, clase);
    }
}
