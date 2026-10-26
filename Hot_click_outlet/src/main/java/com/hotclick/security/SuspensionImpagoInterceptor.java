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
 * Suscripción impaga (día 9+): el negocio SUSPENDIDO_IMPAGO solo puede entrar a pagar. Toda escritura bajo
 * /api/** del negocio resuelto (JWT o empresa propia) recibe 402, salvo billing y auth (ver WebMvcConfig).
 * Las rutas de comprador quedan excluidas aquí porque ya rechazan tiendas no ACTIVO (esPublicable).
 */
@Component
public class SuspensionImpagoInterceptor implements HandlerInterceptor {

    static final String CODIGO = "SUSCRIPCION_IMPAGA";
    static final String MSG = "Tu suscripción está impaga. Pagá la mensualidad para reactivar la tienda.";
    private static final Set<String> LECTURAS = Set.of("GET", "HEAD", "OPTIONS");

    private final CompanyScope companyScope;
    private final EmpresaRepository empresaRepository;
    private final ObjectMapper objectMapper;

    public SuspensionImpagoInterceptor(CompanyScope companyScope, EmpresaRepository empresaRepository,
                                       ObjectMapper objectMapper) {
        this.companyScope = companyScope;
        this.empresaRepository = empresaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public boolean preHandle(@NonNull HttpServletRequest req, @NonNull HttpServletResponse res, @NonNull Object handler)
            throws Exception {
        if (LECTURAS.contains(req.getMethod())) return true;
        Long empresaId = companyScope.getCurrentEmpresaIdOrOwn();
        if (empresaId == null) return true;
        String estado = empresaRepository.findEstadoEmpresaById(empresaId).orElse(null);
        if (!SuspensionImpago.estaSuspendida(estado)) return true;
        res.setStatus(HttpServletResponse.SC_PAYMENT_REQUIRED);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(res.getWriter(), ResponseDTO.error(MSG, Map.of("codigo", CODIGO)));
        return false;
    }
}
