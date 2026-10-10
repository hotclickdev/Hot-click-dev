package com.hotclick.service.suscripcion;

import com.hotclick.model.Plan;
import com.hotclick.service.tenant.UsoTenant;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Regla de bajar de plan: no se borra nada, pero el cambio se rechaza mientras el uso
 * supere lo que permite el plan destino. Es la misma regla que muestra el frontend.
 */
public final class BajadaPlanPolicy {

    public static final String RECURSO_PRODUCTOS = "productos";
    public static final String RECURSO_BODEGAS = "bodegas";
    public static final String RECURSO_CAJAS = "cajas";
    public static final String RECURSO_USUARIOS = "usuarios";

    private static final int SIN_LIMITE = -1;

    private static final Map<String, Integer> ORDEN_PLAN = Map.of(
        "EMPRENDEDOR", 0, "FREE", 0,
        "PYME", 1, "PRO", 1,
        "NEGOCIO_PLUS", 2, "ENTERPRISE", 2
    );

    public record ExcesoPlan(String recurso, long uso, long limite, long exceso) {
    }

    private BajadaPlanPolicy() {
    }

    /** Nombres desconocidos no cuentan como bajada. */
    public static boolean esBajada(String planActual, String planDestino) {
        Integer actual = ordenDe(planActual);
        Integer destino = ordenDe(planDestino);
        return actual != null && destino != null && destino < actual;
    }

    public static List<ExcesoPlan> excesos(Plan destino, UsoTenant uso) {
        List<ExcesoPlan> excesos = new ArrayList<>();
        agregarSiExcede(excesos, RECURSO_PRODUCTOS, uso.productos(), destino.getMaxProductos());
        agregarSiExcede(excesos, RECURSO_BODEGAS, uso.bodegas(), destino.getMaxBodegas());
        agregarSiExcede(excesos, RECURSO_CAJAS, uso.cajas(), destino.getMaxCajas());
        agregarSiExcede(excesos, RECURSO_USUARIOS, uso.usuarios(), destino.getMaxUsuarios());
        return excesos;
    }

    private static void agregarSiExcede(List<ExcesoPlan> excesos, String recurso, long uso, Integer limite) {
        if (limite == null || limite < 0 || uso <= limite) return;
        excesos.add(new ExcesoPlan(recurso, uso, limite, uso - limite));
    }

    private static Integer ordenDe(String plan) {
        if (plan == null) return null;
        return ORDEN_PLAN.get(plan.toUpperCase(Locale.ROOT));
    }
}
