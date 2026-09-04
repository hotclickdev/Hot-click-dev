package com.hotclick.security;

import com.hotclick.utils.Constants;

import java.util.Set;

/**
 * Roles de staff de plataforma (HotClick IT) distintos de ADMIN.
 * Tienen permisos {@code global.*} pero <strong>no</strong> el bypass
 * de {@link CompanyScope} reservado a ADMIN.
 */
public final class PlatformStaff {

    public static final Set<String> ROLES = Set.of(
        Constants.ROL_SUPPORT,
        Constants.ROL_FINANCE,
        Constants.ROL_TRUST
    );

    /** ADMIN + staff: JWT sin empresaId (operan la plataforma, no un tenant). */
    public static final Set<String> ROLES_SIN_TENANT = Set.of(
        Constants.ROL_ADMIN,
        Constants.ROL_SUPPORT,
        Constants.ROL_FINANCE,
        Constants.ROL_TRUST
    );

    /**
     * Matriz permiso → roles que lo reciben (además de ADMIN, que tiene todos).
     * Fuente de verdad documentada; la BD se alinea en V126.
     */
    public static final String[][] PERMISO_A_ROLES = {
        { Constants.PERM_GLOBAL_COMPANIES, Constants.ROL_SUPPORT },
        { Constants.PERM_GLOBAL_METRICS,   Constants.ROL_FINANCE },
        { Constants.PERM_GLOBAL_APPROVALS, Constants.ROL_TRUST },
    };

    private PlatformStaff() {}

    public static boolean esStaff(String rol) {
        return rol != null && ROLES.contains(rol);
    }

    public static boolean esSinTenant(String rol) {
        return rol != null && ROLES_SIN_TENANT.contains(rol);
    }

    /**
     * Rol principal para el JWT: ADMIN gana; si no, el primer staff presente;
     * si no, el primer rol del usuario; vacío → USUARIO_FINAL.
     */
    public static String rolPrincipal(java.util.List<String> nombresRol) {
        if (nombresRol == null || nombresRol.isEmpty()) {
            return Constants.ROL_USUARIO_FINAL;
        }
        if (nombresRol.contains(Constants.ROL_ADMIN)) {
            return Constants.ROL_ADMIN;
        }
        for (String staff : new String[] {
            Constants.ROL_TRUST, Constants.ROL_FINANCE, Constants.ROL_SUPPORT
        }) {
            if (nombresRol.contains(staff)) {
                return staff;
            }
        }
        return nombresRol.get(0);
    }
}
