package com.hotclick.agente.enlace;

import com.hotclick.model.Producto;
import com.hotclick.service.payment.OrderPricingService;
import com.hotclick.service.payment.StockReservationService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * AG-09 en memoria (sin BD): con los productos ya bloqueados recalcula el precio actual de cada línea, detecta los
 * cambios de precio y de stock y suma la reserva. El servicio de apertura solo carga y guarda.
 */
final class EnlaceCompraRecalculo {

    record Resultado(List<EnlaceAbiertoDto.Item> items, int totalActual, boolean precioCambio, boolean stockCambio,
                     boolean algunaReserva) { }

    private EnlaceCompraRecalculo() { }

    static Resultado recalcular(EnlaceCompra e, Map<Long, Producto> productos, boolean reservar) {
        List<EnlaceAbiertoDto.Item> items = new ArrayList<>();
        int totalActual = 0;
        boolean precioCambio = false;
        boolean stockCambio = false;
        boolean algunaReserva = false;

        for (EnlaceCompraItem i : e.getItems()) {
            Producto p = productos.get(i.getProductoId());
            if (!comprable(e, p)) {
                stockCambio = true;
                items.add(new EnlaceAbiertoDto.Item(i.getProductoId(), p != null ? p.getNombreProducto() : "Producto",
                    p != null ? p.getImagenPrincipalUrl() : null, 0, i.getCantidad(), 0, i.getPrecioUnitarioCreado(), false));
                continue;
            }
            int precio = OrderPricingService.precioEfectivo(p);
            boolean personalizado = Boolean.TRUE.equals(p.getEsPersonalizado());
            // «Bajo pedido»: se vende sin stock, no se reserva nada (igual que el checkout, M-08).
            int cantidad = personalizado ? i.getCantidad() : Math.min(i.getCantidad(), Math.max(0, p.getStockDisponible()));
            if (cantidad < i.getCantidad()) stockCambio = true;
            if (precio != i.getPrecioUnitarioCreado()) precioCambio = true;
            if (reservar && !personalizado && cantidad > 0) {
                p.setStockReservado(p.getStockReservado() + cantidad);
                i.setCantidadReservada(cantidad);
                algunaReserva = true;
            }
            totalActual += precio * cantidad;
            items.add(new EnlaceAbiertoDto.Item(p.getId(), p.getNombreProducto(), p.getImagenPrincipalUrl(), cantidad,
                i.getCantidad(), precio, i.getPrecioUnitarioCreado(), cantidad > 0));
        }
        return new Resultado(items, totalActual, precioCambio, stockCambio, algunaReserva);
    }

    private static boolean comprable(EnlaceCompra e, Producto p) {
        return p != null && StockReservationService.esPublicableEnMemoria(p) && p.getEmpresa() != null
            && !Boolean.TRUE.equals(p.getVendido()) && !p.esACotizar() && OrderPricingService.precioEfectivo(p) != null
            && (e.getEmpresaId() == null || e.getEmpresaId().equals(p.getEmpresa().getId()));
    }

    /** Hasta cuándo queda reservado el stock; null si no se reservó nada. */
    static LocalDateTime reservaHasta(Resultado r, LocalDateTime ahora, int minutos, LocalDateTime tope) {
        if (!r.algunaReserva()) return null;
        LocalDateTime hasta = ahora.plusMinutes(minutos);
        return tope != null && tope.isBefore(hasta) ? tope : hasta;
    }
}
