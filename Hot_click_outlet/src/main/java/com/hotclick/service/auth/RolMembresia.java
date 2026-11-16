package com.hotclick.service.auth;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;

import java.util.List;
import java.util.Set;

/**
 * Convierte el rol de equipo (PROPIETARIO, EDITOR, …) al rol Spring/JWT
 * que entiende el SPA y {@code hasRole}. ADMIN de plataforma no se pisa.
 */
public final class RolMembresia {

    private RolMembresia() {}

    public static String paraJwt(MiembroEmpresa membresia, Usuario usuario) {
        if (tieneRol(usuario, Constants.ROL_ADMIN)) {
            return Constants.ROL_ADMIN;
        }
        if (membresia != null) {
            return Constants.ROL_EMPRENDEDOR;
        }
        if (usuario.getRoles() == null || usuario.getRoles().isEmpty()) {
            return Constants.ROL_USUARIO_FINAL;
        }
        return usuario.getRoles().get(0).getNombreRol();
    }

    /** Permisos que un miembro CAJERO puede usar (solo POS); el resto lo bloquean los interceptores del cajero. */
    static final Set<String> PERMISOS_CAJERO = Set.of("pos.usar", "pos.caja.abrir", "pos.caja.cerrar", "pos.descuento");

    /**
     * Rol de equipo real de la membresía activa (PROPIETARIO, ADMIN, EDITOR, LECTOR, CAJERO), tal como está en
     * {@code rol_en_empresa}. Es informativo para el SPA: NO es el rol Spring del JWT ({@link #paraJwt}).
     * Null si no hay membresía.
     */
    public static String rolEquipo(MiembroEmpresa membresia) {
        if (membresia == null || membresia.getRolEnEmpresa() == null) return null;
        return membresia.getRolEnEmpresa().trim().toUpperCase(java.util.Locale.ROOT);
    }

    /**
     * Permisos reales del miembro para que el SPA oculte lo que no puede usar. Aditivo: no toca las authorities del
     * token. CAJERO: solo los de POS; otros roles de equipo: los mismos permisos de la sesión.
     */
    public static List<String> permisosEquipo(String rolEquipo, List<String> permisos) {
        if (permisos == null) return List.of();
        if (!"CAJERO".equals(rolEquipo)) return permisos;
        return permisos.stream().filter(PERMISOS_CAJERO::contains).toList();
    }

    private static boolean tieneRol(Usuario usuario, String nombre) {
        if (usuario.getRoles() == null) return false;
        return usuario.getRoles().stream()
            .map(Rol::getNombreRol)
            .anyMatch(nombre::equals);
    }
}
