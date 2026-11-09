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

    /** Alias {@code e} en SQL nativo. */
    public static final String NATIVA_E =
        "(e.estado_plan IS NULL OR e.estado_plan <> 'REQUIERE_MEMBRESIA')";

    /** Alias {@code emp} en el SQL del chat y del RAG. */
    public static final String NATIVA_EMP =
        "(emp.estado_plan IS NULL OR emp.estado_plan <> 'REQUIERE_MEMBRESIA')";

    /** Alias {@code e} en JPQL. */
    public static final String JPQL_E =
        "(e.estadoPlan IS NULL OR e.estadoPlan <> 'REQUIERE_MEMBRESIA')";

    /** WHERE de listado (alias e): activa, visible y con membresía confirmada o sin ese estado. */
    public static final String SQL_LISTADO =
        "e.estado_empresa = 'ACTIVO' AND e.visibilidad_publica = TRUE AND " + NATIVA_E;
}
