package com.hotclick.service.contador;

import org.springframework.stereotype.Component;

import java.time.YearMonth;

/** Implementación vacía hasta que la Fase 2 (facturas de los negocios) esté en master: no hay compras que acreditar. */
@Component
public class ComprasFiscalesVacio implements ComprasFiscalesProvider {
    @Override
    public ResumenCompras mes(YearMonth mes) {
        return ResumenCompras.SIN_DATOS;
    }

    /** Sin datos no hay nada que consultar: evita 12 llamadas vacías. */
    @Override
    public ResumenCompras[] anio(int anio) {
        ResumenCompras[] r = new ResumenCompras[12];
        java.util.Arrays.fill(r, ResumenCompras.SIN_DATOS);
        return r;
    }
}
