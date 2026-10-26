package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.suscripcion.SuspensionImpago;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.Set;

/**
 * Suscripción impaga (día 9+, decisión 26-oct): el negocio SUSPENDIDO_IMPAGO solo ve su cuenta, el monto
 * pendiente y paga. Todo lo demás bajo /api/** (también GET) responde 403 SUSCRIPCION_IMPAGA.
 * Allowlist por método + ruta exacta. Las rutas de comprador/webhooks se excluyen en WebMvcConfig; el comprador
 * que no es dueño no resuelve empresa propia y nunca se ve afectado.
 */
@Component
public class SuspensionImpagoInterceptor implements HandlerInterceptor {

    static final String CODIGO = "SUSCRIPCION_IMPAGA";
    static final String MSG = "Tu suscripción está impaga. Pagá la mensualidad para reactivar la tienda.";

    /** Método + ruta exacta permitidos a un negocio suspendido. */
    static final Set<String> PERMITIDAS = Set.of(
        "POST /api/auth/login", "POST /api/auth/refresh", "POST /api/auth/logout",
        "POST /api/auth/2fa/verify", "POST /api/auth/2fa/email/send",
        "GET /api/billing/impago", "POST /api/billing/impago/pagar");

    private final CompanyScope companyScope;
    private final EmpresaRepository empresaRepository;
    private final ObjectMapper objectMapper;

    public SuspensionImpagoInterceptor(CompanyScope companyScope, EmpresaRepository empresaRepository,
                                       ObjectMapper objectMapper) {
        this.companyScope = companyScope;
        this.empresaRepository = empresaRepository;
        this.objectMapper = objectMapper;
    }

    static boolean permitida(String metodo, String ruta) {
        if ("OPTIONS".equals(metodo)) return true;
        String r = ruta == null ? "" : ruta;
        if (r.length() > 1 && r.endsWith("/")) r = r.substring(0, r.length() - 1);
        return PERMITIDAS.contains(metodo + " " + r);
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res, @NonNull Object handler)
            throws Exception {
        String ruta = req.getRequestURI().substring(req.getContextPath().length());
        if (permitida(req.getMethod(), ruta)) return true;
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) return true;
        String estado = empresaRepository.findEstadoEmpresaById(empresaId).orElse(null);
        if (!SuspensionImpago.estaSuspendida(estado)) return true;
        res.setStatus(HttpServletResponse.SC_FORBIDDEN);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(res.getWriter(), ResponseDTO.error(MSG, Map.of("codigo", CODIGO)));
        return false;
    }
}
