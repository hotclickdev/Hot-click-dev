package com.hotclick.dto;

public record ResultadoAltaCupo(boolean cupoGratis, boolean demo, CupoEmprendedorEstado estado) {

    public static ResultadoAltaCupo gratis(CupoEmprendedorEstado estado) {
        return new ResultadoAltaCupo(true, false, estado);
    }

    public static ResultadoAltaCupo pago(CupoEmprendedorEstado estado) {
        return new ResultadoAltaCupo(false, false, estado);
    }

    public static ResultadoAltaCupo demo(CupoEmprendedorEstado estado) {
        return new ResultadoAltaCupo(true, true, estado);
    }
}
