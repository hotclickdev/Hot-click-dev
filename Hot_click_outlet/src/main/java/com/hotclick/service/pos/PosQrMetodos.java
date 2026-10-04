package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

/**
 * Métodos de pago que la caja habilita en un cobro por QR. El cliente elige
 * entre ellos en {@code /pos/pago/:token}; el método elegido queda en
 * {@code metodoPago} de la sesión (lo usan el pedido y los totales del turno).
 */
public final class PosQrMetodos {

    public static final String SINPE = "SINPE";
    public static final String TARJETA = "TARJETA";
    private static final List<String> VALIDOS = List.of(SINPE, TARJETA);

    private PosQrMetodos() {}

    /**
     * Lista normalizada y sin repetidos. Sin lista, usa el método principal.
     * El principal, si viene, siempre queda habilitado.
     */
    public static List<String> normalizar(Object raw, String metodoPrincipal) {
        List<String> lista = new ArrayList<>();
        if (raw instanceof Collection<?> col) {
            for (Object o : col) agregar(lista, o);
        } else if (raw instanceof String texto && !texto.isBlank()) {
            for (String parte : texto.split(",")) agregar(lista, parte);
        }
        if (metodoPrincipal != null && !metodoPrincipal.isBlank()) {
            String principal = metodoPrincipal.trim().toUpperCase(Locale.ROOT);
            if (!VALIDOS.contains(principal)) {
                throw new IllegalArgumentException("Método de pago debe ser SINPE o TARJETA");
            }
            if (!lista.contains(principal)) lista.add(0, principal);
        }
        if (lista.isEmpty()) {
            throw new IllegalArgumentException("Método de pago debe ser SINPE o TARJETA");
        }
        return lista;
    }

    private static void agregar(List<String> lista, Object valor) {
        if (valor == null) return;
        String m = String.valueOf(valor).trim().toUpperCase(Locale.ROOT);
        if (m.isEmpty()) return;
        if (!VALIDOS.contains(m)) {
            throw new IllegalArgumentException("Método de pago no válido: " + m);
        }
        if (!lista.contains(m)) lista.add(m);
    }

    public static String aCsv(List<String> metodos) {
        return String.join(",", metodos);
    }

    /** Métodos habilitados de la sesión; las sesiones viejas solo tienen {@code metodoPago}. */
    public static List<String> deSesion(PosQrSesion sesion) {
        if (sesion == null) return List.of();
        String csv = sesion.getMetodosHabilitados();
        if (csv == null || csv.isBlank()) {
            String m = sesion.getMetodoPago();
            return m == null ? List.of() : List.of(m);
        }
        List<String> lista = new ArrayList<>();
        for (String parte : csv.split(",")) {
            String m = parte.trim().toUpperCase(Locale.ROOT);
            if (VALIDOS.contains(m) && !lista.contains(m)) lista.add(m);
        }
        return lista;
    }

    public static boolean habilitado(PosQrSesion sesion, String metodo) {
        return metodo != null && deSesion(sesion).contains(metodo.trim().toUpperCase(Locale.ROOT));
    }

    /** Número de cobro que ve el cliente (Figma "Cobro #P-3391"). */
    public static String numeroCobro(PosQrSesion sesion) {
        return sesion == null || sesion.getId() == null ? null : "P-" + sesion.getId();
    }
}
