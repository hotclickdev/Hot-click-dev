package com.hotclick.catalogo;

import com.hotclick.utils.Constants;

/**
 * Gate del catálogo público. Además de tienda activa y visible, una membresía sin confirmar
 * ({@code estado_plan = REQUIERE_MEMBRESIA}) no se lista: el negocio puede usar el panel para pagar,
 * pero no aparece en el marketplace, la ficha, el checkout ni el SEO hasta que el cobro ONVO queda activo.
 * Trial, gracia de impago y el resto de los estados de plan no se filtran acá.
 */
public final class CatalogoPublicoGate {

    private CatalogoPublicoGate() {}

    /** Unico predicado: null u otro estado sigue publico; solo REQUIERE_MEMBRESIA queda afuera. */
    public static boolean membresiaConfirmada(String estadoPlan) {
        return !Constants.ESTADO_PLAN_REQUIERE_MEMBRESIA.equals(estadoPlan);
    }

    /**
     * Alta por fases (V244): el negocio solo se publica y vende en línea si {@code venta_online_habilitada}
     * (cuenta ONVO ACTIVA para negocios nuevos; TRUE para los existentes). Predicado único en memoria.
     */
    public static boolean ventaOnlineHabilitada(com.hotclick.model.Empresa e) {
        return e == null || e.isVentaOnlineHabilitada();
    }

    /** Membresía confirmada Y alta por fases completa: el único predicado «empresa publicable» en memoria. */
    public static boolean empresaPublicable(com.hotclick.model.Empresa e) {
        return e == null || (membresiaConfirmada(e.getEstadoPlan()) && e.isVentaOnlineHabilitada());
    }

    /** Alias {@code e} en SQL nativo. */
    public static final String NATIVA_E =
        "((e.estado_plan IS NULL OR e.estado_plan <> 'REQUIERE_MEMBRESIA') AND e.venta_online_habilitada = TRUE)";

    /** Alias {@code emp} en el SQL del chat y del RAG. */
    public static final String NATIVA_EMP =
        "((emp.estado_plan IS NULL OR emp.estado_plan <> 'REQUIERE_MEMBRESIA') AND emp.venta_online_habilitada = TRUE)";

    /** Alias {@code e} en JPQL. */
    public static final String JPQL_E =
        "((e.estadoPlan IS NULL OR e.estadoPlan <> 'REQUIERE_MEMBRESIA') AND e.ventaOnlineHabilitada = true)";

    /** WHERE de listado (alias e): activa, visible y con membresía confirmada o sin ese estado. */
    public static final String SQL_LISTADO =
        "e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE AND " + NATIVA_E;
}
