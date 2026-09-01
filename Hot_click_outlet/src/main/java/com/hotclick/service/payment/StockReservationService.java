package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.sse.StockCambioEvent;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StockReservationService {

    private static final Logger log = LoggerFactory.getLogger(StockReservationService.class);

    @Autowired private ProductoRepository productoRepository;

    /**
     * Valida y RESERVA stock con bloqueo pesimista.
     * La reserva (stockReservado) impide que dos compradores simultáneos
     * agoten el mismo item. Solo se descuenta stockActual al confirmar el pago.
     */
    public StockReservationResult reserveForCheckout(List<PaymentCheckoutRequest.ItemDTO> items) {
        int subtotal   = 0;
        int costoTotal = 0;
        // Cache de productos cargados con SELECT FOR UPDATE — evita N+1 en el snapshot posterior
        Map<Long, Producto> productosMap = new HashMap<>();
        for (PaymentCheckoutRequest.ItemDTO item : items) {
            // SELECT FOR UPDATE — previene race conditions al reservar
            Producto p = productoRepository.findByIdForUpdate(item.getProductoId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", item.getProductoId()));

            if (!Boolean.TRUE.equals(p.getVisibleCatalogo()) || Boolean.TRUE.equals(p.getVendido())) {
                throw new IllegalStateException("Producto no disponible: " + p.getNombreProducto());
            }
            // Validar contra stockDisponible (stockActual - stockReservado)
            if (p.getStockDisponible() < item.getCantidad()) {
                throw new StockInsuficienteException(p.getNombreProducto(), p.getStockDisponible(), item.getCantidad());
            }
            // Reservar unidades — se libera en cancelación/fallo, se consume en confirmación
            p.setStockReservado(p.getStockReservado() + item.getCantidad());
            productoRepository.save(p);
            productosMap.put(p.getId(), p);

            int precioUnitario = item.getPrecioUnitarioOverride() != null
                ? item.getPrecioUnitarioOverride()
                : p.getPrecioVenta();
            subtotal   += precioUnitario * item.getCantidad();
            costoTotal += p.getPrecioCompra() * item.getCantidad();
        }
        return new StockReservationResult(subtotal, costoTotal, productosMap);
    }

    public void consumeForGiftCard(Pedido pedido) {
        for (PedidoItem item : pedido.getItems()) {
            Producto p = productoRepository.findByIdForUpdate(item.getProducto().getId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", item.getProducto().getId()));
            p.setStockActual(Math.max(0, p.getStockActual() - item.getCantidad()));
            p.setStockReservado(Math.max(0, p.getStockReservado() - item.getCantidad()));
            if (Boolean.TRUE.equals(p.getEsUnico())) { p.setVendido(true); p.setVisibleCatalogo(false); }
            productoRepository.save(p);
        }
    }

    /**
     * Descuenta stockActual, libera stockReservado y publica eventos de cambio de stock.
     */
    public void confirmAndConsumeStock(Pedido pedido, Object eventSource, ApplicationEventPublisher eventPublisher) {
        for (PedidoItem item : pedido.getItems()) {
            Producto producto = productoRepository.findByIdForUpdate(item.getProducto().getId())
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto no encontrado al confirmar pago"));

            int cantidad   = item.getCantidad();
            int nuevoStock = producto.getStockActual() - cantidad;

            if (nuevoStock < 0) {
                log.error("OVERSELL: producto={} stockActual={} cantidad={}",
                    producto.getId(), producto.getStockActual(), cantidad);
                nuevoStock = 0;
            }
            producto.setStockActual(nuevoStock);

            // Liberar la reserva (puede quedar negativa si ya fue liberada antes → clamp a 0)
            int nuevoReservado = Math.max(0, producto.getStockReservado() - cantidad);
            producto.setStockReservado(nuevoReservado);

            if (Boolean.TRUE.equals(producto.getEsUnico())) {
                producto.setVendido(true);
                producto.setVisibleCatalogo(false);
            }
            productoRepository.save(producto);

            eventPublisher.publishEvent(new StockCambioEvent(
                eventSource, producto.getId(), producto.getEmpresaId(), nuevoStock));
        }
    }

    /**
     * Solo libera stockReservado sin tocar stockActual.
     * Usado en: pago cancelado, pago fallido, pago expirado.
     */
    public void liberarReservas(Pedido pedido) {
        if (pedido == null) return;
        Hibernate.initialize(pedido.getItems());

        for (PedidoItem item : pedido.getItems()) {
            try {
                Producto producto = productoRepository.findByIdForUpdate(item.getProducto().getId())
                    .orElse(null);
                if (producto == null) continue;

                int nuevoReservado = Math.max(0, producto.getStockReservado() - item.getCantidad());
                producto.setStockReservado(nuevoReservado);
                productoRepository.save(producto);
            } catch (Exception e) {
                log.error("Error liberando reserva producto={}: {}", item.getProducto().getId(), e.getMessage());
            }
        }
        log.info("Reservas liberadas para pedido {}", pedido.getNumeroPedido());
    }
}
