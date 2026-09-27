package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutRequest.ItemDTO;
import com.hotclick.dto.PaymentCheckoutRequest.PaqueteEntregaDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Parte el carrito en un paquete por negocio. Cada paquete sale de la bodega
 * del negocio y lleva su propio método de envío, validado por separado.
 */
@Service
public class PaquetesCheckoutBuilder {

    @Autowired private CheckoutValidator checkoutValidator;

    public List<PaqueteCheckout> armar(PaymentCheckoutRequest req, Map<Long, Producto> productos) {
        Map<Long, List<ItemDTO>> itemsPorNegocio = agruparPorNegocio(req.getItems(), productos);
        boolean unicoPaquete = itemsPorNegocio.size() == 1;
        List<PaqueteCheckout> paquetes = new ArrayList<>();
        for (Map.Entry<Long, List<ItemDTO>> grupo : itemsPorNegocio.entrySet()) {
            paquetes.add(armarPaquete(paquetes.size() + 1, grupo.getKey(), grupo.getValue(),
                productos, req, unicoPaquete));
        }
        return paquetes;
    }

    static Map<Long, List<ItemDTO>> agruparPorNegocio(List<ItemDTO> items, Map<Long, Producto> productos) {
        Map<Long, List<ItemDTO>> grupos = new LinkedHashMap<>();
        for (ItemDTO item : items) {
            Long empresaId = empresaDe(productos.get(item.getProductoId()));
            grupos.computeIfAbsent(empresaId, k -> new ArrayList<>()).add(item);
        }
        return grupos;
    }

    private PaqueteCheckout armarPaquete(int numero, Long empresaId, List<ItemDTO> items,
                                         Map<Long, Producto> todos, PaymentCheckoutRequest req,
                                         boolean unicoPaquete) {
        Map<Long, Producto> productos = productosDe(items, todos);
        PaqueteEntregaDTO entrega = entregaDe(req, empresaId);
        String metodoEnvio = entrega != null ? entrega.getMetodoEnvio() : req.getMetodoEnvio();
        Long bodegaElegida = entrega != null && entrega.getBodegaId() != null
            ? entrega.getBodegaId()
            : (unicoPaquete ? req.getBodegaId() : null);

        Bodega origen = resolverOrigen(empresaId, productos, bodegaElegida);
        checkoutValidator.assertBodegaTenant(origen, origen.getId());
        checkoutValidator.validateRetiroEnTienda(metodoEnvio, origen, origen.getId(), productos);

        return new PaqueteCheckout(numero, empresaId, origen, metodoEnvio, items, productos,
            subtotal(items, productos), costoTotal(items, productos));
    }

    private Bodega resolverOrigen(Long empresaId, Map<Long, Producto> productos, Long bodegaElegida) {
        Bodega elegida = bodegaElegida != null
            ? checkoutValidator.findBodega(bodegaElegida).orElse(null)
            : null;
        if (elegida != null && Objects.equals(elegida.getEmpresaId(), empresaId)) return elegida;
        Producto primero = productos.values().iterator().next();
        Empresa empresa = primero.getEmpresa();
        if (empresa != null && empresa.getBodegaVentaOnline() != null) {
            return empresa.getBodegaVentaOnline();
        }
        if (primero.getBodega() == null) {
            throw new IllegalStateException("El producto " + primero.getNombreProducto()
                + " no tiene bodega de despacho");
        }
        return primero.getBodega();
    }

    private static Long empresaDe(Producto producto) {
        if (producto.getEmpresaId() != null) return producto.getEmpresaId();
        return producto.getBodega() != null ? producto.getBodega().getEmpresaId() : null;
    }

    private static PaqueteEntregaDTO entregaDe(PaymentCheckoutRequest req, Long empresaId) {
        if (req.getPaquetes() == null || empresaId == null) return null;
        return req.getPaquetes().stream()
            .filter(p -> empresaId.equals(p.getEmpresaId()))
            .findFirst()
            .orElse(null);
    }

    private static Map<Long, Producto> productosDe(List<ItemDTO> items, Map<Long, Producto> todos) {
        Map<Long, Producto> productos = new HashMap<>();
        items.forEach(i -> productos.put(i.getProductoId(), todos.get(i.getProductoId())));
        return productos;
    }

    static int subtotal(List<ItemDTO> items, Map<Long, Producto> productos) {
        int total = 0;
        for (ItemDTO item : items) {
            Producto p = productos.get(item.getProductoId());
            int precio = item.getPrecioUnitarioOverride() != null
                ? item.getPrecioUnitarioOverride()
                : p.getPrecioVenta();
            total += precio * item.getCantidad();
        }
        return total;
    }

    static int costoTotal(List<ItemDTO> items, Map<Long, Producto> productos) {
        int total = 0;
        for (ItemDTO item : items) {
            total += productos.get(item.getProductoId()).getPrecioCompra() * item.getCantidad();
        }
        return total;
    }
}
