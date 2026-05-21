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
 *
 * Flujo de stock:
 *   checkout()        → reserva stockReservado (SELECT FOR UPDATE)
 *   confirmarPedido() → descuenta stockActual + libera stockReservado
 *   liberarReservas() → solo libera stockReservado (pago cancelado/fallido/expirado)
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
    // CHECKOUT — Valida stock (con lock), reserva, crea Pedido + sesión
    // ================================================================
    @Transactional
    public PaymentCheckoutResponse checkout(PaymentCheckoutRequest req, String correoUsuario) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new IllegalArgumentException("El carrito no tiene productos");
        }

        // TODO[PAYXPERT-REACTIVAR]: restaurar "PAYXPERT" como default al reactivar
        String provider = req.getProvider() != null ? req.getProvider().toUpperCase() : "PAYPAL";
        if (!providerFactory.soporta(provider)) {
            throw new IllegalArgumentException("Proveedor de pago no soportado: " + provider);
        }

        Usuario usuario = usuarioRepository.findByCorreo(correoUsuario)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado: " + correoUsuario));

        Long bodegaId = req.getBodegaId() != null ? req.getBodegaId() : 1L;
        Bodega bodega = bodegaRepository.findById(bodegaId)
            .orElseThrow(() -> new RuntimeException("Bodega no encontrada: " + bodegaId));

        // ── Validar y RESERVAR stock con bloqueo pesimista ──────────────
        // La reserva (stockReservado) impide que dos compradores simultáneos
        // agoten el mismo item. Solo se descuenta stockActual al confirmar el pago.
        int subtotal   = 0;
        int costoTotal = 0;
        for (PaymentCheckoutRequest.ItemDTO item : req.getItems()) {
            // SELECT FOR UPDATE — previene race conditions al reservar
            Producto p = productoRepository.findByIdForUpdate(item.getProductoId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + item.getProductoId()));

            if (!Boolean.TRUE.equals(p.getVisibleCatalogo()) || Boolean.TRUE.equals(p.getVendido())) {
                throw new IllegalStateException("Producto no disponible: " + p.getNombreProducto());
            }
            // Validar contra stockDisponible (stockActual - stockReservado)
            if (p.getStockDisponible() < item.getCantidad()) {
                throw new IllegalStateException(
                    "Stock insuficiente para \"" + p.getNombreProducto() + "\""
                    + " (disponible: " + p.getStockDisponible()
                    + ", solicitado: " + item.getCantidad() + ")");
            }
            // Reservar unidades — se libera en cancelación/fallo, se consume en confirmación
            p.setStockReservado(p.getStockReservado() + item.getCantidad());
            productoRepository.save(p);

            subtotal   += p.getPrecioVenta()  * item.getCantidad();
            costoTotal += p.getPrecioCompra() * item.getCantidad();
        }

        int costoEnvio = "ENVIO_A_DOMICILIO".equals(req.getMetodoEnvio()) ? 2000 : 0;
        int total      = subtotal + costoEnvio;

        // ── Crear Pedido PENDIENTE ───────────────────────────────────────
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
                    .multiply(BigDecimal.valueOf(100)));
        }
        pedido.setMetodoPago(provider);
        pedido.setMetodoEnvio(req.getMetodoEnvio() != null ? req.getMetodoEnvio() : "RETIRO_EN_TIENDA");
        pedido.setNotas(req.getNotas());
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedido.setUsuarioFinal(usuario);
        pedido.setBodega(bodega);
        pedido.setEstado(Constants.ESTADO_ACTIVO);
        pedidoRepository.save(pedido);

        // Snapshot de precios al momento de compra
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

        // ── Delegar sesión al proveedor ─────────────────────────────────
        PaymentSession session;
        try {
            session = providerFactory.get(provider).crearSesion(pedido, usuario);
        } catch (RuntimeException e) {
            // Si falla la sesión, liberar reservas ya hechas
            liberarReservas(pedido);
            throw e;
        } catch (Exception e) {
            liberarReservas(pedido);
            throw new RuntimeException("Error iniciando sesión de pago: " + e.getMessage(), e);
        }

        // ── Crear registro Pago ─────────────────────────────────────────
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

        log.info("Checkout iniciado: provider={} pedido={} total={}",
            provider, pedido.getNumeroPedido(), total);

        return new PaymentCheckoutResponse(
            pedido.getId(), pedido.getNumeroPedido(),
            session.redirectUrl(), Constants.PAGO_PENDIENTE, total, provider);
    }

    // ================================================================
    // CONFIRMAR PEDIDO — Descuenta stockActual, libera stockReservado,
    //                    marca PAGADO, envía email.
    // Llamado por los providers tras una captura exitosa.
    // ================================================================
    @Transactional
    public void confirmarPedido(Pago pago) {
        Pedido pedido = pago.getPedido();
        pedido.getItems().size(); // force-load

        // Verificar que no esté ya confirmado (idempotencia)
        if (Constants.PEDIDO_PAGADO.equals(pedido.getEstadoPedido())) {
            log.info("confirmarPedido ignorado — pedido {} ya está PAGADO", pedido.getNumeroPedido());
            return;
        }

        for (PedidoItem item : pedido.getItems()) {
            Producto producto = productoRepository.findByIdForUpdate(item.getProducto().getId())
                .orElseThrow(() -> new RuntimeException("Producto no encontrado al confirmar pago"));

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
        }

        pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
        pedidoRepository.save(pedido);

        notificacionEmailService.enviarConfirmacionPedido(pedido);
        log.info("Pedido {} confirmado PAGADO via {}", pedido.getNumeroPedido(), pago.getProveedor());
    }

    // ================================================================
    // LIBERAR RESERVAS — Solo libera stockReservado sin tocar stockActual.
    // Usado en: pago cancelado, pago fallido, pago expirado.
    // ================================================================
    @Transactional
    public void liberarReservas(Pedido pedido) {
        if (pedido == null) return;
        pedido.getItems().size(); // force-load

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

    // ================================================================
    // CANCELAR POR USUARIO — El usuario regresó de la página de pago sin pagar.
    // Libera el stockReservado y marca el pedido/pago como CANCELADO.
    // ================================================================
    @Transactional
    public void cancelarPorUsuario(String numeroPedido, String correoUsuario) {
        Pedido pedido = pedidoRepository.findByNumeroPedido(numeroPedido)
            .orElseThrow(() -> new RuntimeException("Pedido no encontrado: " + numeroPedido));

        if (!pedido.getUsuarioFinal().getCorreo().equals(correoUsuario)) {
            throw new SecurityException("No tienes permiso para cancelar este pedido");
        }

        if (!Constants.PEDIDO_PENDIENTE.equals(pedido.getEstadoPedido())) {
            throw new IllegalStateException("El pedido ya fue procesado y no puede cancelarse");
        }

        Pago pago = pagoRepository.findTopByPedidoId(pedido.getId())
            .orElseThrow(() -> new RuntimeException("Pago no encontrado para pedido: " + numeroPedido));

        // Si el webhook ya confirmó o capturó el pago, no cancelar
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            throw new IllegalStateException("El pago ya fue confirmado y no puede cancelarse");
        }

        marcarFallido(pago, "Cancelado por el usuario");
        log.info("Pedido {} cancelado por el usuario {}", numeroPedido, correoUsuario);
    }

    // ================================================================
    // CAPTURAR PAYPAL — Llamado desde PaymentController tras el redirect.
    // Valida que el usuario sea dueño del pedido.
    // ================================================================
    @Transactional
    public PaymentStatusResponse capturarPayPal(String paypalOrderId, String numeroPedido,
                                                String correoUsuario) {
        Pago pago = pagoRepository.findByMerchantToken(paypalOrderId)
            .orElseThrow(() -> new RuntimeException("Pago no encontrado: " + paypalOrderId));

        // Validar propiedad — el usuario actual debe ser el dueño del pedido
        if (!pago.getUsuario().getCorreo().equals(correoUsuario)) {
            throw new SecurityException("No tienes permiso para capturar este pago");
        }

        // Verificar que el pedido coincida
        if (!pago.getPedido().getNumeroPedido().equals(numeroPedido)) {
            throw new IllegalArgumentException("El número de pedido no coincide con el pago");
        }

        // Idempotencia: ya fue capturado (webhook llegó primero)
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) {
            log.info("capturarPayPal: pago {} ya capturado, devolviendo estado actual", paypalOrderId);
            return buildStatusResponse(pago);
        }

        // Pago en estado inválido para captura
        if (Constants.PAGO_CANCELADO.equals(pago.getEstadoPago())
            || Constants.PAGO_FALLIDO.equals(pago.getEstadoPago())) {
            throw new IllegalStateException("El pago ya fue " + pago.getEstadoPago().toLowerCase()
                + " y no puede capturarse");
        }

        com.hotclick.payment.PayPalPaymentProvider payPalProvider =
            (com.hotclick.payment.PayPalPaymentProvider) providerFactory.get("PAYPAL");

        try {
            payPalProvider.capturar(paypalOrderId, pago);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error capturando pago PayPal: " + e.getMessage(), e);
        }

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
    // MARCAR PAGO FALLIDO — Llamado por webhooks cuando el pago es denegado.
    // ================================================================
    @Transactional
    public void marcarFallido(Pago pago, String motivo) {
        if (Constants.PAGO_CAPTURADO.equals(pago.getEstadoPago())) return; // ya confirmado, no revertir

        pago.setEstadoPago(Constants.PAGO_FALLIDO);
        pago.setFechaActualizacion(LocalDateTime.now());
        pagoRepository.save(pago);

        Pedido pedido = pago.getPedido();
        if (Constants.PEDIDO_PENDIENTE.equals(pedido.getEstadoPedido())) {
            pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
            pedidoRepository.save(pedido);
        }

        liberarReservas(pedido);
        notificacionEmailService.enviarPagoFallido(pedido, motivo);
        log.info("Pago {} marcado FALLIDO: {}", pago.getPedido().getNumeroPedido(), motivo);
    }

    // ================================================================
    // LIMPIEZA PROGRAMADA — Cancela pedidos PENDIENTE expirados (TTL 30 min)
    // ================================================================
    @Scheduled(fixedRate = 5 * 60 * 1000) // cada 5 minutos
    @Transactional
    public void cancelarExpirados() {
        LocalDateTime corte = LocalDateTime.now().minusMinutes(30);
        List<Pago> expirados = pagoRepository.findExpiradosPendientes(corte);

        List<Pago> pagosActualizados = new java.util.ArrayList<>();
        List<Pedido> pedidosActualizados = new java.util.ArrayList<>();

        for (Pago pago : expirados) {
            pago.setEstadoPago(Constants.PAGO_CANCELADO);
            pago.setFechaActualizacion(LocalDateTime.now());
            pagosActualizados.add(pago);

            Pedido pedido = pago.getPedido();
            if (Constants.PEDIDO_PENDIENTE.equals(pedido.getEstadoPedido())) {
                pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
                pedidosActualizados.add(pedido);
                liberarReservas(pedido);
                log.info("Pedido {} cancelado por expiración de pago TTL", pedido.getNumeroPedido());
            }
        }

        if (!pagosActualizados.isEmpty()) {
            pagoRepository.saveAll(pagosActualizados);
            pedidoRepository.saveAll(pedidosActualizados);
            log.info("Cleanup TTL: {} pagos expirados cancelados", pagosActualizados.size());
        }
    }

    // ================================================================
    // Helpers
    // ================================================================
    public PaymentStatusResponse buildStatusResponse(Pago pago) {
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
