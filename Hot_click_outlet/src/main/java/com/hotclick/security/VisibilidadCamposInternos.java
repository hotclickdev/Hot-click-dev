package com.hotclick.security;

import com.hotclick.exception.TenantAccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * Decide si quien hace la petición puede ver costos y datos operativos de un recurso
 * (precio de compra, margen, proveedor, contacto de bodega).
 *
 * Exige un usuario autenticado: un visitante anónimo de /api/tienda/{slug} tiene
 * TenantContext cargado por SlugTenantInterceptor y pasaría assertCanAccess solo.
 */
@Component
public class VisibilidadCamposInternos {

    private static final String ATRIBUTO_CACHE = VisibilidadCamposInternos.class.getName() + ".";

    private final CompanyScope companyScope;

    public VisibilidadCamposInternos(CompanyScope companyScope) {
        this.companyScope = companyScope;
    }

    public boolean puedeVer(Long empresaIdRecurso) {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        String clave = ATRIBUTO_CACHE + empresaIdRecurso;
        if (attrs != null && attrs.getAttribute(clave, RequestAttributes.SCOPE_REQUEST) instanceof Boolean previo) {
            return previo;
        }
        boolean resultado = calcular(empresaIdRecurso);
        if (attrs != null) {
            attrs.setAttribute(clave, resultado, RequestAttributes.SCOPE_REQUEST);
        }
        return resultado;
    }

    private boolean calcular(Long empresaIdRecurso) {
        if (companyScope.getCurrentUser() == null) {
            return false;
        }
        try {
            companyScope.assertCanAccessNullable(empresaIdRecurso);
            return true;
        } catch (TenantAccessDeniedException e) {
            return false;
        }
    }
}
