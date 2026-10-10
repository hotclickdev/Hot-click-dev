package com.hotclick.service.suscripcion;

import com.hotclick.service.suscripcion.BajadaPlanPolicy.ExcesoPlan;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Se rechazó una bajada de plan porque el uso actual supera los límites del plan destino.
 * Lleva el detalle por recurso para que el panel muestre qué ajustar.
 */
public class BajadaPlanBloqueadaException extends IllegalStateException {

    private final transient List<ExcesoPlan> excesos;

    public BajadaPlanBloqueadaException(String planDestino, List<ExcesoPlan> excesos) {
        // TODO copy Producto
        super("Todavía no podés bajar a " + planDestino + ": tu uso supera lo que permite. Ajustalo y volvé a confirmar.");
        this.excesos = List.copyOf(excesos);
    }

    public List<ExcesoPlan> getExcesos() {
        return excesos;
    }

    public List<Map<String, Object>> excesosComoMapas() {
        return excesos.stream().map(BajadaPlanBloqueadaException::comoMapa).toList();
    }

    private static Map<String, Object> comoMapa(ExcesoPlan exceso) {
        Map<String, Object> mapa = new LinkedHashMap<>();
        mapa.put("recurso", exceso.recurso());
        mapa.put("uso", exceso.uso());
        mapa.put("limite", exceso.limite());
        mapa.put("exceso", exceso.exceso());
        return mapa;
    }
}
