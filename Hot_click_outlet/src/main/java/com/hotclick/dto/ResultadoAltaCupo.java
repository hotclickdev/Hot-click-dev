package com.hotclick.dto;

/**
 * Resultado del alta de un Emprendedor. Desde V207 el puesto del trial NO se toma al registrarse: el alta de un negocio
 * real queda {@code pendienteCupo} y el puesto se asigna cuando HotClick lo aprueba (ver
 * {@code CupoEmprendedorAprobacionService}). {@code gratis}/{@code pago} se conservan para el resultado ya resuelto.
 */
public record ResultadoAltaCupo(boolean cupoGratis, boolean demo, CupoEmprendedorEstado estado, boolean pendienteCupo) {

    public ResultadoAltaCupo(boolean cupoGratis, boolean demo, CupoEmprendedorEstado estado) {
        this(cupoGratis, demo, estado, false);
    }

    public static ResultadoAltaCupo gratis(CupoEmprendedorEstado estado) {
        return new ResultadoAltaCupo(true, false, estado, false);
    }

    public static ResultadoAltaCupo pago(CupoEmprendedorEstado estado) {
        return new ResultadoAltaCupo(false, false, estado, false);
    }

    public static ResultadoAltaCupo demo(CupoEmprendedorEstado estado) {
        return new ResultadoAltaCupo(true, true, estado, false);
    }

    /** Negocio real recién registrado: el puesto y el trial se deciden al aprobarlo. */
    public static ResultadoAltaCupo pendiente(CupoEmprendedorEstado estado) {
        return new ResultadoAltaCupo(false, false, estado, true);
    }
}
