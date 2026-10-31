package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.CuponService;
import com.hotclick.service.EncargoService;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.utils.Constants;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Confirma el pago de un checkout. Un checkout multivendedor tiene N subpedidos bajo un mismo
 * Pago: todos se marcan PAGADO, cada uno consume su propio stock y acredita a su propia empresa.
 */
@Service
public class PaymentOrderConfirmationService {

    private static final Logger log = LoggerFactory.getLogger(PaymentOrderConfirmationService.class);

    /** Estados posteriores al pago: confirmar de nuevo descontaría stock y cupones otra vez. */
    static final Set<String> YA_CONFIRMADOS = Set.of(
        Constants.PEDIDO_PAGADO, Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_LISTO_RETIRO,
        Constants.PEDIDO_ENVIADO, Constants.PEDIDO_ENTREGADO, Constants.PEDIDO_COMPLETADO);

    /** CONFIRMADO: el grupo quedó PAGADO. YA_CONFIRMADO: no hizo nada (idempotente). SOBREVENTA: ver M-08. */
    public enum Resultado { CONFIRMADO, YA_CONFIRMADO, SOBREVENTA }

    @Autowired private PedidoRepository           pedidoRepository;
    @Autowired private PagoRepository             pagoRepository;
    @Autowired private CuponService               cuponService;
    @Autowired private GiftCardService            giftCardService;
    @Autowired private StockReservationService    stockReservationService;
    @Autowired private PaymentNotificationsFacade paymentNotificationsFacade;
    @Autowired private PosQrVentaService          posQrVentaService;
    @Autowired private PedidoGrupoService         pedidoGrupoService;
    @Autowired @Lazy private EncargoService       encargoService;

    /**
     * M-08: si entre el cobro y la confirmación el stock se agotó (segundo pago sobre la última unidad), el
     * cobro NO se pierde ni se lanza excepción (el rollback dejaría la plata cobrada sin registro y ONVO
     * reintentaría sin fin): el pago queda REEMBOLSO_PENDIENTE y el grupo en REVISION_SOBREVENTA, que no se
     * despacha. El stock nunca queda negativo. Los productos personalizados o bajo pedido están exentos.
     */
    @Transactional
    public Resultado confirmarPedido(Pago pago, Object paymentServiceSelf, ApplicationEventPublisher eventPublisher) {
        Pedido principal = pago.getPedido();
        if (principal == null) {
            log.warn("confirmarPedido ignorado — pago {} sin pedido asociado", pago.getId());
            return Resultado.YA_CONFIRMADO;
        }
        List<Pedido> grupo = pedidoGrupoService.delGrupo(principal);

        // Idempotencia rápida: si el principal ya figura confirmado, el grupo entero ya se procesó.
        if (YA_CONFIRMADOS.contains(principal.getEstadoPedido())) {
            log.info("confirmarPedido ignorado — pedido {} ya está confirmado", principal.getNumeroPedido());
            return Resultado.YA_CONFIRMADO;
        }
        if (Constants.PEDIDO_REVISION_SOBREVENTA.equals(principal.getEstadoPedido())) {
            log.info("confirmarPedido ignorado — pedido {} ya está en revisión por sobreventa", principal.getNumeroPedido());
            return Resultado.SOBREVENTA;
        }
        List<Pedido> porConfirmar = grupo.stream()
            .filter(p -> !Constants.PEDIDO_CANCELADO.equals(p.getEstadoPedido())).toList();
        porConfirmar.forEach(p -> Hibernate.initialize(p.getItems()));
        if (!stockReservationService.productosSinStock(porConfirmar).isEmpty()) {
            pasarARevisionPorSobreventa(pago, porConfirmar);
            return Resultado.SOBREVENTA;
        }

        boolean cuponMarcado = false;
        for (Pedido pedido : grupo) {
            // Idempotencia atómica: retorno de Tilopay, webhook, cleanup o admin pueden llegar a la vez
            // con una copia vieja del pedido; solo quien gana el UPDATE condicional aplica los efectos.
            if (pedidoRepository.reclamarParaConfirmar(pedido.getId(), YA_CONFIRMADOS) == 0) {
                log.info("confirmarPedido ignorado — pedido {} ya fue confirmado por otro proceso",
                    pedido.getNumeroPedido());
                continue;
            }
            if (!cuponMarcado) {
                marcarCuponUsadoUnaVez(grupo);
                cuponMarcado = true;
            }
            Hibernate.initialize(pedido.getItems());
            stockReservationService.confirmAndConsumeStock(pedido, paymentServiceSelf, eventPublisher);

            pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
            pedidoRepository.save(pedido);

            if (pedido.getGiftCardCodigo() != null && pedido.getGiftCardMonto() != null && pedido.getGiftCardMonto() > 0) {
                giftCardService.canjear(pedido.getGiftCardCodigo(), pedido, pedido.getGiftCardMonto());
            }
            encargoService.marcarPagadosPorPedido(pedido.getId());
            paymentNotificationsFacade.onPedidoConfirmado(pedido, pago);
            posQrVentaService.marcarPagadoPorPedidoTienda(pedido.getId());
        }
        publicarCompraPagada(principal, eventPublisher);
        return Resultado.CONFIRMADO;
    }

    /**
     * Pago manual registrado sin fila de Pago previa: mismo chequeo de sobreventa que {@link #confirmarPedido}
     * pero sin confirmar (ese camino no consume stock acá). true si el grupo quedó en revisión.
     */
    @Transactional
    public boolean revisarSobreventa(Pago pago) {
        Pedido principal = pago.getPedido();
        if (principal == null) return false;
        List<Pedido> porConfirmar = pedidoGrupoService.delGrupo(principal).stream()
            .filter(p -> !Constants.PEDIDO_CANCELADO.equals(p.getEstadoPedido())).toList();
        porConfirmar.forEach(p -> Hibernate.initialize(p.getItems()));
        if (stockReservationService.productosSinStock(porConfirmar).isEmpty()) return false;
        pasarARevisionPorSobreventa(pago, porConfirmar);
        return true;
    }

    /** M-08: grupo a revisión, reservas liberadas (sin stock negativo), pago para reembolso. Sin PII en el log. */
    private void pasarARevisionPorSobreventa(Pago pago, List<Pedido> grupo) {
        StringBuilder numeros = new StringBuilder();
        for (Pedido pedido : grupo) {
            pedido.setEstadoPedido(Constants.PEDIDO_REVISION_SOBREVENTA);
            stockReservationService.liberarReservas(pedido);
            if (numeros.length() > 0) numeros.append(',');
            numeros.append(pedido.getNumeroPedido());
        }
        pedidoRepository.saveAll(grupo);
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);
        log.error("[ALERTA-PAGO] Cobro sin stock (sobreventa): pago={} pedidos={}; en revisión, reembolso pendiente",
            pago.getId(), numeros);
        // MED-2: alerta a plataforma (cola: pagos REEMBOLSO_PENDIENTE en Admin → Pagos).
        paymentNotificationsFacade.onSobreventa(pago, numeros.toString());
    }

    /**
     * Tiquete electrónico de la compra (D-105): {@code TiqueteCompraListener} lo emite después del
     * COMMIT. Se publica una sola vez, solo cuando esta llamada confirmó el grupo; las confirmaciones
     * repetidas salen antes por la guarda de idempotencia y la emisión también es idempotente.
     */
    private void publicarCompraPagada(Pedido principal, ApplicationEventPublisher eventPublisher) {
        Long compraId = principal.getCompraId();
        if (compraId != null && eventPublisher != null) {
            eventPublisher.publishEvent(new CompraPagadaEvent(compraId));
        }
    }

    /**
     * Un cupón se usa una sola vez por checkout, aunque su descuento se haya aplicado a varios
     * paquetes (cupón de plataforma) — evita consumir el límite de usos N veces.
     */
    private void marcarCuponUsadoUnaVez(List<Pedido> grupo) {
        for (Pedido pedido : grupo) {
            String codigo = pedido.getCuponCodigo();
            if (codigo == null) continue;
            Long empresaId = pedido.getEmpresaId();
            if (cuponService.esDeEmpresa(codigo, empresaId)) {
                cuponService.marcarUsado(codigo, empresaId);
            } else {
                cuponService.marcarUsado(codigo);
            }
            return;
        }
    }
}
