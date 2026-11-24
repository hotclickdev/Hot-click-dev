package com.hotclick.agente.canal;

import java.util.List;

/** Botón de respuesta rápida. {@code id} vuelve en el webhook (button_reply / postback); estable y ≤ 256. */
public record Boton(String id, String titulo) {

    public static final String ID_PERSONA = "persona";

    public static Boton comprar(Long productoId) { return new Boton("comprar:" + productoId, "Comprar"); }

    public static Boton verMas(Long productoId) { return new Boton("ver:" + productoId, "Ver más"); }

    public static Boton hablarConPersona() { return new Boton(ID_PERSONA, "Hablar con persona"); }

    /** Los tres botones estándar de una tarjeta de producto. */
    public static List<Boton> estandar(Long productoId) {
        return List.of(comprar(productoId), verMas(productoId), hablarConPersona());
    }
}
