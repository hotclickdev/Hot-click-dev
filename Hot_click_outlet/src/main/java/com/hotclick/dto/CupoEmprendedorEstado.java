package com.hotclick.dto;

public record CupoEmprendedorEstado(int usados, int limite, int cuposGratisDisponibles) {

    public static CupoEmprendedorEstado of(int usados, int limite) {
        return new CupoEmprendedorEstado(usados, limite, Math.max(0, limite - usados));
    }

    public boolean hayCupoGratis() {
        return cuposGratisDisponibles > 0;
    }
}
