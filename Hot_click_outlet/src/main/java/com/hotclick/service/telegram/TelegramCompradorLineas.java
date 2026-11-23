package com.hotclick.service.telegram;

import com.hotclick.model.Producto;
import com.hotclick.service.payment.OrderPricingService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/** Líneas del carrito para mostrar. Sin acceso a base de datos: el producto lo resuelve quien llama. */
final class TelegramCompradorLineas {

    record Resultado(List<TelegramCompradorUi.Linea> lineas, boolean cambio) {}

    private TelegramCompradorLineas() {}

    /** Arma las líneas y quita del carrito los productos que ya no existen en la tienda ({@code cambio} = hay que guardar). */
    static Resultado armar(TelegramCompradorCtx c, Function<Long, Producto> productoDeLaTienda) {
        List<TelegramCompradorUi.Linea> out = new ArrayList<>();
        boolean cambio = false;
        for (var it = c.carrito.entrySet().iterator(); it.hasNext(); ) {
            Map.Entry<Long, Integer> e = it.next();
            Producto p = productoDeLaTienda.apply(e.getKey());
            if (p == null) { it.remove(); cambio = true; continue; }
            out.add(new TelegramCompradorUi.Linea(p.getId(), p.getNombreProducto(), e.getValue(), OrderPricingService.precioEfectivo(p)));
        }
        return new Resultado(out, cambio);
    }
}
