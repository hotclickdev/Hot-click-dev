package com.hotclick.utils;

import com.hotclick.model.Empresa;

/** Nombre visible de un negocio: comercial si hay, si no el legal. */
public final class EmpresaNombre {

    private EmpresaNombre() {}

    public static String mostrar(Empresa empresa, String siAusente) {
        if (empresa == null) return siAusente;
        if (empresa.getNombreComercial() != null && !empresa.getNombreComercial().isBlank()) {
            return empresa.getNombreComercial();
        }
        return empresa.getNombreEmpresa();
    }
}
