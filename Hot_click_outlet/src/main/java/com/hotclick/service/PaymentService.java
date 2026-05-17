package com.hotclick.service;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.PaymentStatusResponse;
import com.hotclick.model.*;
import com.hotclick.payment.PaymentProviderFactory;
import com.hotclick.payment.PaymentSession;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Servicio central de pagos.
 * Orquesta: validación de ítems → creación de Pedido → delegación al proveedor →
 * creación de Pago → confirmación de stock y email al capturar.
 */
@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    @Autowired private PaymentProviderFactory      providerFactory;
    @Autowired private PedidoRepository            pedidoRepository;
    @Autowired private ProductoRepository          productoRepository;
    @Autowired private BodegaRepository            bodegaRepository;
    @Autowired private UsuarioRepository           usuarioRepository;
    @Autowired private PagoRepository              pagoRepository;
    @Autowired private TransaccionPagoRepository   transaccionPagoRepository;
    @Autowired private NotificacionEmailService    notificacionEmailService;

    // ================================================================
    // CHECKOUT — Crea Pedido + sesión de pago con el proveedor elegido
    // ================================================================
    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new IllegalArgumentException("El carrito no tiene productos");
        }

        String provider = req.getProvider() != null ? req.getProvider().toUpperCase() : "PAYXPERT";
        if (!providerFactory.soporta(provider)) {
            throw new IllegalArgumentException("Proveedor de pago no soportado: " + provider);
        }

        Usuario usuario = usuarioRepository.findByCorreo(correoUsuario)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + correoUsuario));

        Long bodegaId = req.getBodegaId() != null ? req.getBodegaId() : 1L;
        Bodega bodega = bodegaRepository.findById(bodegaId)
            .orElseThrow(() -> new RuntimeException("Bodega no encontrada: " + bodegaId));

        // Calcular totales desde DB (nunca confiar en el frontend)
        int subtotal   = 0;
        int costoTotal = 0;
        for (PaymentCheckoutRequest.ItemDTO item : req.getItems()) {
            Producto p = productoRepository.findById(item.getProductoId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + item.getProductoId()));
            if (!Boolean.TRUE.equals(p.getVisibleCatalogo()) || Boolean.TRUE.equals(p.getVendido())) {
                throw new IllegalStateException("Producto no disponible: " + p.getNombreProducto());
            }
            if (p.getStockActual() < item.getCantidad()) {
                throw new IllegalStateException("Stock insuficiente para: " + p.getNombreProducto()
                    + " (disponible: " + p.getStockActual() + ", solicitado: " + item.getCantidad() + ")");
            }
            subtotal   += p.getPrecioVenta()  * item.getCantidad();
            costoTotal += p.getPrecioCompra() * item.getCantidad();
        }

        int costoEnvio = "ENVIO_A_DOMICILIO".equals(req.getMetodoEnvio()) ? 2000 : 0;
        int total      = subtotal + costoEnvio;

        // Crear Pedido en estado PENDIENTE
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-" + System.currentTimeMillis());
        pedido.setFechaPedido(LocalDateTime.now());
        pedido.setSubtotal(subtotal);
        pedido.setTotalPedido(total);
        pedido.setCostoEnvio(costoEnvio);
        pedido.setCostoTotalProductos(costoTotal);
        pedido.setUtilidadBruta(subtotal - costoTotal);
        pedido.setDescuentoTotal(0);
        pedido.setMontoImpuesto(0);
        pedido.setAplicaImpuesto(false);
        if (subtotal > 0) {
            pedido.setMargenGananciaPedido(
                BigDecimal.valueOf(subtotal - costoTotal)
                    .divide(BigDecimal.valueOf(subtotal), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
            );
        }
        pedido.setMetodoPago(provider);
        pedido.setMetodoEnvio(req.getMetodoEnvio() != null ? req.getMetodoEnvio() : "RETIRO_EN_TIENDA");
        pedido.setNotas(req.getNotas());
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        pedidoRepository.save(pedido);

        // Crear PedidoItems (snapshot de precios en el momento de compra)
        for (PaymentCheckoutRequest.ItemDTO item : req.getItems()) {
            Producto p = productoRepository.findById(item.getProductoId()).orElseThrow();
            PedidoItem pi = new PedidoItem();
            pi.setCantidad(item.getCantidad());
            pi.setPrecioUnitarioMomento(p.getPrecioVenta());
            pi.setCostoUnitarioMomento(p.getPrecioCompra());
            pi.setSubtotalItem(p.getPrecioVenta() * item.getCantidad());
            pi.setUtilidadItem((p.getPrecioVenta() - p.getPrecioCompra()) * item.getCantidad());
            pi.setDescuentoAplicado(0);
            pi.setProducto(p);
            pi.setPedido(pedido);
            pi.setEstado(Constants.ESTADO_ACTIVO);
            pedido.getItems().add(pi);
        }
        pedidoRepository.save(pedido);

        // Delegar la sesión de pago al proveedor elegido
        PaymentSession session;
        try {
            session = providerFactory.get(provider).crearSesion(pedido, usuario);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error iniciando sesión de pago: " + e.getMessage(), e);
        }

        // Crear registro Pago
        Pago pago = new Pago();
        pago.setMerchantToken(session.externalId());
        pago.setRedirectUrl(session.redirectUrl());
        pago.setMonto(total);
        pago.setMoneda("CRC");
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setProveedor(provider);
        pago.setFechaCreacion(LocalDateTime.now());
        pago.setFechaActualizacion(LocalDateTime.now());
        pago.setFechaExpiracion(LocalDateTime.now().plusMinutes(30));
        pago.setPedido(pedido);
        pago.setUsuario(usuario);
        pago.setEstado(Constants.ESTADO_ACTIVO);
        pagoRepository.save(pago);

        log.info("Checkout iniciado: provider={} numeroPedido={} total={}",
            provider, pedido.getNumeroPedido(), total);

        return new PaymentCheckoutResponse(
            pedido.getId(), pedido.getNumeroPedido(), session.redirectUrl(),
            Constants.PAGO_PENDIENTE, total, provider
        );
    }

    // ================================================================
    // CONFIRMAR PEDIDO — Reduce stock, marca PAGADO, envía email
    // Llamado por los providers tras una captura exitosa.
    // ================================================================
    @Transactional
    public void confirmarPedido(Pago pago) {
        Pedido pedido = pago.getPedido();
        pedido.getItems().size(); // force-load en sesión activa

        for (PedidoItem item : pedido.getItems()) {
            Producto producto = productoRepository.findByIdForUpdate(item.getProducto().getId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado al confirmar pago"));

            int nuevoStock = producto.getStockActual() - item.getCantidad();
            if (nuevoStock < 0) {
                // Registrar como 0 pero loguear la anomalía para revisión manual
                log.error("STOCK NEGATIVO: producto={} stockActual={} cantidad={}",
                    producto.getId(), producto.getStockActual(), item.getCantidad());
                nuevoStock = 0;
            }
            producto.setStockActual(nuevoStock);

            if (Boolean.TRUE.equals(producto.getEsUnico())) {
                producto.setVendido(true);
                producto.setVisibleCatalogo(false);
            }
            productoRepository.save(producto);
        }

        pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
        pedidoRepository.save(pedido);

        notificacionEmailService.enviarConfirmacionPedido(pedido);
        log.info("Pedido {} confirmado como PAGADO via {}", pedido.getNumeroPedido(), pago.getProveedor());
    }

    // ================================================================
    // CAPTURAR PAYPAL — Llamado desde PaymentController tras el redirect
    // ================================================================
    @Transactional
    public PaymentStatusResponse capturarPayPal(String paypalOrderId, String numeroPedido) {
        Pago pago = pagoRepository.findByMerchantToken(paypalOrderId)
            .orElseThrow(() -> new RuntimeException("Pago no encontrado para PayPal orderId: " + paypalOrderId));

        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            // Ya capturado (webhook llegó primero) — devolver estado actual
            return buildStatusResponse(pago);
        }

        // Obtener el provider PayPal directamente para capturar
        com.hotclick.payment.PayPalPaymentProvider payPalProvider =
            (com.hotclick.payment.PayPalPaymentProvider) providerFactory.get("PAYPAL");

        try {
            payPalProvider.capturar(paypalOrderId, pago);
        } catch (Exception e) {
            throw new RuntimeException("Error capturando pago PayPal: " + e.getMessage(), e);
        }

        // Re-leer estado actualizado
        pago = pagoRepository.findByMerchantToken(paypalOrderId).orElseThrow();
        return buildStatusResponse(pago);
    }

    // ================================================================
    // CONSULTAR ESTADO
    // ================================================================
    @Transactional(readOnly = true)
    public PaymentStatusResponse consultarEstado(String numeroPedido) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado: " + numeroPedido));

        Pago pago = pagoRepository.findTopByPedidoId(pedido.getId())
            .orElseThrow(() -> new RuntimeException("Pago no encontrado para pedido: " + numeroPedido));

        return buildStatusResponse(pago);
    }

    // ================================================================
    // LIMPIEZA PROGRAMADA — Cancela pedidos PENDIENTE expirados
    // ================================================================
    @Scheduled(fixedRate = 5 * 60 * 1000) // cada 5 minutos
    @Transactional
    public void cancelarExpirados() {
        LocalDateTime corte = LocalDateTime.now().minusMinutes(35); // TTL 30 min + 5 de margen
        List<Pago> expirados = pagoRepository.findExpiradosPendientes(corte);

        for (Pago pago : expirados) {
            pago.setEstadoPago(Constants.PAGO_CANCELADO);
            pago.setFechaActualizacion(LocalDateTime.now());
            pagoRepository.save(pago);

            Pedido pedido = pago.getPedido();
            if (Constants.PEDIDO_PENDIENTE.equals(pedido.getEstadoPedido())) {
                pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
                pedidoRepository.save(pedido);
                log.info("Pedido {} cancelado por expiración de pago ({})", pedido.getNumeroPedido(), pago.getProveedor());
            }
        }

        if (!expirados.isEmpty()) {
            log.info("Cleanup: {} pagos expirados cancelados", expirados.size());
        }
    }

    // ================================================================
    // Helpers
    // ================================================================

    private PaymentStatusResponse buildStatusResponse(Pago pago) {
        TransaccionPago txn = transaccionPagoRepository
            .findTopByPagoIdOrderByFechaTransaccionDesc(pago.getId())
            .orElse(null);

        PaymentStatusResponse resp = new PaymentStatusResponse();
        resp.setPagoId(pago.getId());
        resp.setEstadoPago(pago.getEstadoPago());
        resp.setNumeroPedido(pago.getPedido().getNumeroPedido());
        resp.setMetodoPago(pago.getMetodoPagoTipo() != null ? pago.getMetodoPagoTipo() : pago.getProveedor());
        resp.setTotal(pago.getMonto());
        resp.setProveedor(pago.getProveedor());
        if (txn != null) {
            resp.setCardLast4(txn.getCardLast4());
            resp.setCardBrand(txn.getCardBrand());
            resp.setFechaTransaccion(txn.getFechaTransaccion() != null
                ? txn.getFechaTransaccion().toString() : null);
        }
        return resp;
    }
}
