package com.hotclick.agente.canal;

import com.hotclick.agente.idioma.Idioma;

import java.math.BigDecimal;
import java.util.List;

/**
 * Producto a mostrar con foto, nombre y precio en colones. {@code imagenUrl} debe ser https; si no, se envía sin foto.
 * {@code botones} vacío o nulo = botones estándar (Comprar, Ver más, Hablar con persona).
 */
public record TarjetaProducto(Long productoId, String nombre, BigDecimal precio, String imagenUrl,
                              String descripcion, List<Boton> botones, Idioma idioma) {

    public TarjetaProducto(Long productoId, String nombre, BigDecimal precio, String imagenUrl,
                           String descripcion, List<Boton> botones) {
        this(productoId, nombre, precio, imagenUrl, descripcion, botones, Idioma.ES);
    }

    public TarjetaProducto(Long productoId, String nombre, BigDecimal precio, String imagenUrl) {
        this(productoId, nombre, precio, imagenUrl, null, null, Idioma.ES);
    }

    public List<Boton> botonesEfectivos() {
        return botones == null || botones.isEmpty() ? Boton.estandar(productoId, idioma) : botones;
    }
}
