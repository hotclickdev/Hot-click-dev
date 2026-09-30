package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Producto;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Divide un carrito en paquetes: uno por bodega de origen. Cada paquete se despacha por separado
 * y lleva su propia forma de entrega y su propio costo de envío.
 */
@Service
public class CheckoutPaquetesPlanner {

    public record Paquete(Bodega bodega, List<PaymentCheckoutRequest.ItemDTO> items,
                          int subtotal, int costoTotal, String metodoEnvio, String notas) {}

    public List<Paquete> planificar(PaymentCheckoutRequest req, Map<Long, Producto> productos, Bodega bodegaDefault) {
        Map<Long, Bodega> bodegas = new LinkedHashMap<>();
        Map<Long, List<PaymentCheckoutRequest.ItemDTO>> itemsPorBodega = new LinkedHashMap<>();
        for (PaymentCheckoutRequest.ItemDTO item : req.getItems()) {
            Producto p = productos.get(item.getProductoId());
            Bodega origen = bodegaDeOrigen(p, bodegaDefault);
            bodegas.putIfAbsent(origen.getId(), origen);
            itemsPorBodega.computeIfAbsent(origen.getId(), k -> new ArrayList<>()).add(item);
        }

        List<Paquete> paquetes = new ArrayList<>();
        for (Map.Entry<Long, List<PaymentCheckoutRequest.ItemDTO>> e : itemsPorBodega.entrySet()) {
            int subtotal = 0;
            int costoTotal = 0;
            for (PaymentCheckoutRequest.ItemDTO item : e.getValue()) {
                Producto p = productos.get(item.getProductoId());
                int precio = item.getPrecioUnitarioOverride() != null ? item.getPrecioUnitarioOverride() : p.getPrecioVenta();
                int costo = p.getPrecioCompra() != null ? p.getPrecioCompra() : 0;
                subtotal += precio * item.getCantidad();
                costoTotal += costo * item.getCantidad();
            }
            PaymentCheckoutRequest.EnvioPaqueteDTO envio = envioDe(req, e.getKey());
            String metodo = envio != null ? envio.getMetodoEnvio()
                : req.getMetodoEnvio() != null ? req.getMetodoEnvio() : Constants.ENVIO_RETIRO;
            String notas = envio != null && envio.getNotas() != null && !envio.getNotas().isBlank()
                ? envio.getNotas() : req.getNotas();
            paquetes.add(new Paquete(bodegas.get(e.getKey()), e.getValue(), subtotal, costoTotal, metodo, notas));
        }
        return paquetes;
    }

    /** Bodega del producto; si no tiene, la de venta online de su tienda; si tampoco, HotClick coordina. */
    public static Bodega bodegaDeOrigen(Producto p, Bodega bodegaDefault) {
        if (p.getBodega() != null) return p.getBodega();
        if (p.getEmpresa() != null && p.getEmpresa().getBodegaVentaOnline() != null) {
            return p.getEmpresa().getBodegaVentaOnline();
        }
        return bodegaDefault;
    }

    private static PaymentCheckoutRequest.EnvioPaqueteDTO envioDe(PaymentCheckoutRequest req, Long bodegaId) {
        if (req.getEnvios() == null) return null;
        return req.getEnvios().stream()
            .filter(en -> bodegaId.equals(en.getBodegaId()))
            .findFirst().orElse(null);
    }
}
