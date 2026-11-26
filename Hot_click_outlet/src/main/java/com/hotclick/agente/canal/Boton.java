package com.hotclick.agente.canal;

import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.TextosFijos;

import java.util.List;

/** Botón de respuesta rápida. {@code id} vuelve en el webhook (button_reply / postback); estable y ≤ 256. */
public record Boton(String id, String titulo) {

    public static final String ID_PERSONA = "persona";

    public static Boton comprar(Long productoId) { return comprar(productoId, Idioma.ES); }

    public static Boton comprar(Long productoId, Idioma idioma) {
        return new Boton("comprar:" + productoId, TextosFijos.botonComprar(idioma));
    }

    public static Boton verMas(Long productoId) { return verMas(productoId, Idioma.ES); }

    public static Boton verMas(Long productoId, Idioma idioma) {
        return new Boton("ver:" + productoId, TextosFijos.botonVerMas(idioma));
    }

    public static Boton hablarConPersona() { return hablarConPersona(Idioma.ES); }

    public static Boton hablarConPersona(Idioma idioma) {
        return new Boton(ID_PERSONA, TextosFijos.botonHablarConPersona(idioma));
    }

    /** Los tres botones estándar de una tarjeta de producto. */
    public static List<Boton> estandar(Long productoId) { return estandar(productoId, Idioma.ES); }

    public static List<Boton> estandar(Long productoId, Idioma idioma) {
        return List.of(comprar(productoId, idioma), verMas(productoId, idioma), hablarConPersona(idioma));
    }

    /** true si el texto es el título del botón «Hablar con persona» en cualquiera de los idiomas. */
    public static boolean esTituloHablarConPersona(String texto) {
        if (texto == null) return false;
        String t = texto.strip();
        for (Idioma i : Idioma.values()) {
            if (t.equalsIgnoreCase(TextosFijos.botonHablarConPersona(i))) return true;
        }
        return false;
    }
}
