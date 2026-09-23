package com.hotclick.service.producto;

import com.hotclick.utils.Constants;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * SKU y número local son internos: admin, dueños y staff del negocio.
 * Compradores anónimos o USUARIO_FINAL no los ven.
 */
public final class SkuVisibility {

    private static final Set<String> ROLES_INTERNOS = Set.of(
        "ROLE_" + Constants.ROL_ADMIN,
        "ROLE_" + Constants.ROL_EMPRENDEDOR,
        "ROLE_" + Constants.ROL_SUPPORT,
        "ROLE_" + Constants.ROL_FINANCE,
        "ROLE_" + Constants.ROL_TRUST,
        "ROLE_CAJERO",
        "ROLE_GERENTE",
        "ROLE_SUPERVISOR"
    );

    private SkuVisibility() {}

    public static boolean puedeVer() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof AnonymousAuthenticationToken) return false;
        if (auth == null || !auth.isAuthenticated()) return false;
        Object principal = auth.getPrincipal();
        if (principal == null || "anonymousUser".equals(principal)) return false;
        for (GrantedAuthority granted : auth.getAuthorities()) {
            if (ROLES_INTERNOS.contains(granted.getAuthority())) return true;
        }
        return false;
    }

    /** Copia el mapa de producto público sin SKU ni número interno. */
    public static Map<String, Object> sinInternos(Map<String, Object> row) {
        Map<String, Object> copy = new LinkedHashMap<>(row);
        copy.remove("sku");
        copy.remove("SKU");
        copy.remove("numero_local");
        copy.remove("numeroLocal");
        return copy;
    }

    public static List<Map<String, Object>> sinInternos(List<Map<String, Object>> rows) {
        if (rows == null || rows.isEmpty()) return rows == null ? List.of() : rows;
        return rows.stream().map(fila -> sinInternos(fila)).toList();
    }
}
