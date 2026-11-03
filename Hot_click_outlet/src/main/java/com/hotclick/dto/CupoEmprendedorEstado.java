package com.hotclick.dto;

/**
 * @param periodoGratis duración del trial en palabras (derivada de TRIAL_EMPRENDEDOR_DIAS, p. ej. «3 meses»);
 *                      null si quien arma el estado no la conoce (los textos usan entonces «trial gratis»).
 */
public record CupoEmprendedorEstado(int usados, int limite, int cuposGratisDisponibles, String periodoGratis) {

    public CupoEmprendedorEstado(int usados, int limite, int cuposGratisDisponibles) {
        this(usados, limite, cuposGratisDisponibles, null);
    }

    public static CupoEmprendedorEstado of(int usados, int limite) {
        return of(usados, limite, null);
    }

    public static CupoEmprendedorEstado of(int usados, int limite, String periodoGratis) {
        return new CupoEmprendedorEstado(usados, limite, Math.max(0, limite - usados), periodoGratis);
    }

    public boolean hayCupoGratis() {
        return cuposGratisDisponibles > 0;
    }

    /** «3 meses gratis» (o «trial gratis» si no se conoce la duración). */
    public String textoGratis() {
        return periodoGratis == null || periodoGratis.isBlank() ? "trial gratis" : periodoGratis + " gratis";
    }
}
