package com.hotclick.security;

import com.hotclick.utils.Constants;

import java.util.Set;

/**
 * Roles sin tenant de plataforma. Tras V132 solo queda ADMIN
 * (SUPPORT/FINANCE/TRUST inactivos).
 */
public final class PlatformStaff {

    /** Staff legacy — vacío: ya no hay roles intermedios de plataforma. */
    public static final Set<String> ROLES = Set.of();

    /** Solo ADMIN opera la plataforma sin empresaId. */
    public static final Set<String> ROLES_SIN_TENANT = Set.of(Constants.ROL_ADMIN);

    /**
     * Matriz permiso → roles staff (vacía: ADMIN tiene todos los global.*).
     */
    public static final String[][] PERMISO_A_ROLES = {};

    private PlatformStaff() {}

    public static boolean esStaff(String rol) {
        return rol != null && ROLES.contains(rol);
    }

    public static boolean esSinTenant(String rol) {
        return rol != null && ROLES_SIN_TENANT.contains(rol);
    }

    /**
     * Rol principal para el JWT: ADMIN gana; si no, el primer rol; vacío → USUARIO_FINAL.
     */
    public static String rolPrincipal(java.util.List<String> nombresRol) {
        if (nombresRol == null || nombresRol.isEmpty()) {
            return Constants.ROL_USUARIO_FINAL;
        }
        if (nombresRol.contains(Constants.ROL_ADMIN)) {
            return Constants.ROL_ADMIN;
        }
        return nombresRol.get(0);
    }
}
