package com.hotclick.model;

/** Acceso de test a los callbacks JPA package-private de {@link Pedido}. */
public final class PedidoOrigenGuardAccess {
    private PedidoOrigenGuardAccess() {}
    public static void prePersist(Pedido p) { p.asegurarTokenSeguimiento(); }
    public static void preUpdate(Pedido p) { p.normalizarOrigen(); }
}
