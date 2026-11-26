package com.hotclick.agente.campana;

/**
 * Segmento simple de una campaña. Siempre es una INTERSECCIÓN con los contactos que tienen consentimiento activo:
 * un segmento nunca amplía a quién se puede escribir.
 *
 * @param tipo        a quién
 * @param dias        COMPRADORES_RECIENTES: compraron en los últimos N días; INTERES_CATEGORIA y LEADS: ventana en días
 * @param categoriaId INTERES_CATEGORIA: categoría de producto
 */
public record Segmento(Tipo tipo, Integer dias, Long categoriaId) {

    public static final int DIAS_MAX = 365;
    public static final int DIAS_POR_DEFECTO = 90;

    public enum Tipo { TODOS, COMPRADORES_RECIENTES, INTERES_CATEGORIA, LEADS }

    public Segmento {
        if (tipo == null) throw new IllegalArgumentException("El segmento es obligatorio");
        if (tipo == Tipo.INTERES_CATEGORIA && categoriaId == null)
            throw new IllegalArgumentException("Elegí la categoría de interés");
        if (tipo != Tipo.TODOS) {
            int d = dias == null ? DIAS_POR_DEFECTO : dias;
            if (d < 1 || d > DIAS_MAX) throw new IllegalArgumentException("Los días van de 1 a " + DIAS_MAX);
            dias = d;
        }
    }
}
