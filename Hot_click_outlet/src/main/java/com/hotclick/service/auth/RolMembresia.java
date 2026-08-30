package com.hotclick.service.auth;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;

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

    private static boolean tieneRol(Usuario usuario, String nombre) {
        if (usuario.getRoles() == null) return false;
        return usuario.getRoles().stream()
            .map(Rol::getNombreRol)
            .anyMatch(nombre::equals);
    }
}
