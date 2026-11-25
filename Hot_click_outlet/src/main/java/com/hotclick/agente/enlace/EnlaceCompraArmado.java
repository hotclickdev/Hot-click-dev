package com.hotclick.agente.enlace;

import com.hotclick.agente.enlace.EnlaceCompraService.ItemSolicitado;
import com.hotclick.agente.enlace.EnlaceCompraService.Linea;
import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Producto;
import com.hotclick.service.payment.GuestCheckoutGuard;
import com.hotclick.service.payment.OrderPricingService;
import com.hotclick.service.payment.StockReservationService;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** AG-07 en memoria (sin BD): valida lo que pidió el bot, arma las líneas del enlace y el resumen del chat. */
final class EnlaceCompraArmado {

    record Armado(List<Linea> lineas, int total) { }

    private EnlaceCompraArmado() { }

    /** Suma cantidades del mismo producto y valida cantidad ≥ 1, tope por producto, tope de líneas y de unidades. */
    static Map<Long, Integer> agrupar(List<ItemSolicitado> items, GuestCheckoutGuard guard) {
        if (items == null || items.isEmpty()) throw new EnlaceCompraException("Falta al menos un producto");
        Map<Long, Integer> m = new LinkedHashMap<>();
        for (ItemSolicitado i : items) {
            if (i == null || i.productoId() == null) throw new EnlaceCompraException("Producto inválido");
            if (i.cantidad() < 1) throw new EnlaceCompraException("La cantidad debe ser al menos 1");
            m.merge(i.productoId(), i.cantidad(), Integer::sum);
        }
        if (m.size() > PaymentCheckoutRequest.MAX_ITEMS) throw new EnlaceCompraException("Demasiados productos distintos");
        int unidades = 0;
        for (int c : m.values()) {
            if (c > guard.getMaxPorProducto()) {
                throw new EnlaceCompraException(String.format(GuestCheckoutGuard.MSG_TOPE_PRODUCTO, guard.getMaxPorProducto()));
            }
            unidades += c;
        }
        if (unidades > guard.getMaxPendientes()) {
            throw new EnlaceCompraException("Por ahora puedo armar compras de hasta " + guard.getMaxPendientes()
                + " unidades. Si necesitás más, escribile a soporte.");
        }
        return m;
    }

    /** Valida cada producto contra la regla de visibilidad y de tienda, y agrega los ítems al enlace. */
    static Armado armar(Map<Long, Integer> pedido, Map<Long, Producto> productos, Long empresaId, EnlaceCompra enlace) {
        List<Linea> lineas = new ArrayList<>();
        int total = 0;
        for (Map.Entry<Long, Integer> e : pedido.entrySet()) {
            Producto p = productos.get(e.getKey());
            int cantidad = e.getValue();
            validarProducto(p, empresaId, cantidad);
            int precio = OrderPricingService.precioEfectivo(p);
            int subtotal = precio * cantidad;
            total += subtotal;
            lineas.add(new Linea(p.getId(), p.getNombreProducto(), cantidad, precio, subtotal));
            enlace.agregarItem(new EnlaceCompraItem(p.getId(), cantidad, precio));
        }
        return new Armado(lineas, total);
    }

    /**
     * Mensaje único para producto inexistente, no publicable o de otra tienda. No lleva el nombre: el id lo genera el
     * modelo (manipulable por inyección de prompt) y el nombre de un producto oculto o de otra tienda no debe salir
     * por el chat ni servir de oráculo para enumerar ids (AG-14).
     */
    static final String MSG_NO_DISPONIBLE = "Uno de los productos no está disponible. Use solo ids de buscar_productos.";

    static void validarProducto(Producto p, Long empresaId, int cantidad) {
        if (p == null) throw new EnlaceCompraException(MSG_NO_DISPONIBLE);
        // Misma regla que el catálogo público (activo, visible, negocio ACTIVO y público) y no vendido.
        boolean comprable = StockReservationService.esPublicableEnMemoria(p)
            && p.getEmpresa() != null && !Boolean.TRUE.equals(p.getVendido());
        if (!comprable) throw new EnlaceCompraException(MSG_NO_DISPONIBLE);
        if (empresaId != null && !empresaId.equals(p.getEmpresa().getId())) {
            // Mismo mensaje que «no disponible»: el bot de una tienda no debe poder sondear otras tiendas.
            throw new EnlaceCompraException(MSG_NO_DISPONIBLE);
        }
        if (p.esACotizar() || OrderPricingService.precioEfectivo(p) == null) {
            throw new EnlaceCompraException("«" + p.getNombreProducto() + "» es a cotizar: no se puede vender por enlace");
        }
        if (!Boolean.TRUE.equals(p.getEsPersonalizado()) && p.getStockDisponible() < cantidad) {
            throw new EnlaceCompraException("De «" + p.getNombreProducto() + "» solo quedan "
                + Math.max(0, p.getStockDisponible()) + " unidades");
        }
    }

    static String resumen(List<Linea> lineas, int total) {
        StringBuilder sb = new StringBuilder();
        for (Linea l : lineas) {
            sb.append(l.cantidad()).append(" × ").append(l.nombre()).append(" = ").append(colones(l.subtotal())).append('\n');
        }
        sb.append("Total: ").append(colones(total));
        return sb.toString();
    }

    static String colones(int monto) {
        return "₡" + NumberFormat.getIntegerInstance(Locale.forLanguageTag("es-CR")).format(monto);
    }
}
