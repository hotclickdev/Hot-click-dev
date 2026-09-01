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
        pedido.setMetodoEnvio(req.getMetodoEnvio() != null ? req.getMetodoEnvio() : "RETIRO_EN_TIENDA");
        pedido.setNotas(req.getNotas());
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
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
            pi.setCostoUnitarioMomento(p.getPrecioCompra());
            pi.setSubtotalItem(precioUnitario * item.getCantidad());
            pi.setUtilidadItem((precioUnitario - p.getPrecioCompra()) * item.getCantidad());
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
