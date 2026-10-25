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
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;

    /**
     * QA-CONC-1: si el Producto ya estaba en el contexto (cargado con los ítems del pedido), la consulta
     * FOR UPDATE devuelve esa instancia con datos y @Version viejos → OptimisticLock al hacer flush.
     * Con el lock ya tomado, refrescar trae la fila actual y las confirmaciones quedan en serie.
     */
    private Producto bloquearActual(Long id, java.util.function.Supplier<RuntimeException> siFalta) {
        Producto p = productoRepository.findByIdForUpdate(id).orElseThrow(siFalta);
        if (entityManager != null && entityManager.contains(p)) entityManager.refresh(p);
        return p;
    }

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

            // ESC-1: mismo criterio que el catálogo público (activo, visible, negocio ACTIVO y público).
            if (!esPublicableEnMemoria(p) || Boolean.TRUE.equals(p.getVendido())) {
                throw new IllegalStateException("Producto no disponible: " + p.getNombreProducto());
            }
            // HOTFIX: «A cotizar» nunca se cobra a ₡1; solo con un precio cotizado explícito.
            if (p.esACotizar() && item.getPrecioUnitarioOverride() == null) {
                throw new IllegalArgumentException("«" + p.getNombreProducto() + "» es a cotizar: solicitá una cotización al vendedor");
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
                : OrderPricingService.precioEfectivo(p);
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
            Producto producto = bloquearActual(item.getProducto().getId(),
                () -> new RecursoNoEncontradoException("Producto no encontrado al confirmar pago"));

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
                Producto producto;
                try {
                    producto = bloquearActual(item.getProducto().getId(), () -> new RecursoNoEncontradoException("Producto"));
                } catch (RecursoNoEncontradoException e) { continue; }

                int nuevoReservado = Math.max(0, producto.getStockReservado() - item.getCantidad());
                producto.setStockReservado(nuevoReservado);
                productoRepository.save(producto);
            } catch (Exception e) {
                log.error("Error liberando reserva producto={}: {}", item.getProducto().getId(), e.getMessage());
            }
        }
        log.info("Reservas liberadas para pedido {}", pedido.getNumeroPedido());
    }

    /** ESC-1/IDOR-10: equivale a ProductoRepository.esPublicable sobre la entidad ya bloqueada. */
    public static boolean esPublicableEnMemoria(Producto p) {
        if (p.getEstado() == null || p.getEstado() != com.hotclick.utils.Constants.ESTADO_ACTIVO) return false;
        if (!Boolean.TRUE.equals(p.getVisibleCatalogo())) return false;
        com.hotclick.model.Empresa e = p.getEmpresa();
        return e == null || ("ACTIVO".equals(e.getEstadoEmpresa()) && Boolean.TRUE.equals(e.getVisibilidadPublica()));
    }
}
