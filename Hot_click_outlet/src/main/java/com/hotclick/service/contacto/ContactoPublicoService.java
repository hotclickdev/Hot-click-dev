package com.hotclick.service.contacto;

import com.hotclick.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * Resuelve en el backend si un negocio puede mostrar su contacto directo al visitante
 * ({@link ContactoPublicoPolicy}). Nunca se confía en lo que diga el frontend.
 * El resultado se guarda por petición para no consultar el plan una vez por campo.
 */
@Service
public class ContactoPublicoService {

    private static final Logger log = LoggerFactory.getLogger(ContactoPublicoService.class);
    private static final String ATRIBUTO_CACHE = ContactoPublicoService.class.getName() + ".";

    private final EmpresaRepository empresaRepository;

    public ContactoPublicoService(EmpresaRepository empresaRepository) {
        this.empresaRepository = empresaRepository;
    }

    @Transactional(readOnly = true)
    public boolean permiteContacto(Long empresaId) {
        if (empresaId == null) return false;
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        String clave = ATRIBUTO_CACHE + empresaId;
        if (attrs != null && attrs.getAttribute(clave, RequestAttributes.SCOPE_REQUEST) instanceof Boolean previo) {
            return previo;
        }
        boolean resultado = calcular(empresaId);
        if (attrs != null) {
            attrs.setAttribute(clave, resultado, RequestAttributes.SCOPE_REQUEST);
        }
        return resultado;
    }

    private boolean calcular(Long empresaId) {
        try {
            return empresaRepository.findNombrePlanEfectivo(empresaId)
                .map(ContactoPublicoPolicy::permiteContacto)
                .orElse(false);
        } catch (RuntimeException e) {
            log.warn("[contacto-publico] No se pudo leer el plan de empresa={}: {}", empresaId, e.getMessage());
            return false;
        }
    }
}
