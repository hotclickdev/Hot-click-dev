package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.*;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.EncargoService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class CheckoutOrderFactory {

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired @Lazy private EncargoService encargoService;

    public Pedido createPendingOrder(PaymentCheckoutRequest req, OrderPricingResult pricing,
                                     int subtotal, int costoTotal, String provider,
                                     Usuario usuario, Bodega bodega) {
        Pedido pedido = crearSubpedido(pricing, subtotal, costoTotal, provider, usuario, bodega,
            req.getMetodoEnvio(), req.getNotas(), null, Constants.PEDIDO_PENDIENTE);
        return aplicarDireccion(pedido, req.getDireccionEntrega());
    }

    /**
     * Guarda la dirección en el pedido (para los correos: «Enviamos a …») solo si el
     * paquete se envía. Se normalizan espacios y se corta a 500 caracteres.
     */
    public Pedido aplicarDireccion(Pedido pedido, String direccion) {
        String limpia = direccionDeEntrega(direccion, pedido.getMetodoEnvio());
        if (limpia == null) return pedido;
        pedido.setDireccionEntrega(limpia);
        return pedidoRepository.save(pedido);
    }

    static String direccionDeEntrega(String direccion, String metodoEnvio) {
        if (direccion == null || esRetiro(metodoEnvio)) return null;
        String limpia = direccion.replaceAll("[\\p{Cntrl}\\s]+", " ").trim();
        if (limpia.isEmpty()) return null;
        return limpia.length() <= 500 ? limpia : limpia.substring(0, 500);
    }

    static boolean esRetiro(String metodoEnvio) {
        return metodoEnvio == null || Constants.ENVIO_RETIRO.equals(metodoEnvio)
            || "RETIRO".equals(metodoEnvio) || "EN_TIENDA".equals(metodoEnvio);
    }

    /** Un paquete de un checkout multivendedor. Todos los subpedidos del checkout comparten {@code grupoPago}. */
    public Pedido crearSubpedido(OrderPricingResult pricing, int subtotal, int costoTotal, String provider,
                                 Usuario usuario, Bodega bodega, String metodoEnvio, String notas,
                                 String grupoPago, String estadoInicial) {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido(Constants.generarNumeroPedido("ORD-"));
        pedido.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        pedido.setSubtotal(subtotal);
        pedido.setTotalPedido(pricing.totalConGC());
        pedido.setCostoEnvio(pricing.costoEnvio());
        pedido.setCostoTotalProductos(costoTotal);
        pedido.setUtilidadBruta(subtotal - costoTotal - pricing.descuento());
        pedido.setDescuentoTotal(pricing.descuento());
        pedido.setCuponCodigo(pricing.codigoCuponAplicado());
        pedido.setGiftCardCodigo(pricing.gcMonto() > 0 ? pricing.gcCodigo() : null);
        pedido.setGiftCardMonto(pricing.gcMonto());
        pedido.setMontoImpuesto(0);
        pedido.setAplicaImpuesto(false);
        if (subtotal > 0) {
            pedido.setMargenGananciaPedido(
                BigDecimal.valueOf((long) subtotal - costoTotal)
                    .divide(BigDecimal.valueOf(subtotal), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)));
        }
        pedido.setMetodoPago(provider);
        pedido.setMetodoEnvio(metodoEnvio != null ? metodoEnvio : Constants.ENVIO_RETIRO);
        pedido.setNotas(notas);
        pedido.setGrupoPago(grupoPago);
        pedido.setEstadoPedido(estadoInicial);
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setEmpresa(bodega.getEmpresa());
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        return pedidoRepository.save(pedido);
    }

    public void addItemSnapshots(Pedido pedido, List<PaymentCheckoutRequest.ItemDTO> items,
                                 Map<Long, Producto> productosMap) {
        for (PaymentCheckoutRequest.ItemDTO item : items) {
            Producto p = productosMap.get(item.getProductoId());
            int precioUnitario = item.getPrecioUnitarioOverride() != null
                ? item.getPrecioUnitarioOverride()
                : p.getPrecioVenta();
            PedidoItem pi = new PedidoItem();
            pi.setCantidad(item.getCantidad());
            pi.setPrecioUnitarioMomento(precioUnitario);
            int costoUnitario = p.getPrecioCompra() != null ? p.getPrecioCompra() : 0;
            pi.setCostoUnitarioMomento(costoUnitario);
            pi.setSubtotalItem(precioUnitario * item.getCantidad());
            pi.setUtilidadItem((precioUnitario - costoUnitario) * item.getCantidad());
            pi.setDescuentoAplicado(0);
            pi.setProducto(p);
            pi.setPedido(pedido);
            pi.setEstado(Constants.ESTADO_ACTIVO);
            pedido.getItems().add(pi);
        }
        pedidoRepository.save(pedido);
        encargoService.crearEncargosDesdeCheckout(pedido, items, pedido.getUsuarioFinal());
    }
}
