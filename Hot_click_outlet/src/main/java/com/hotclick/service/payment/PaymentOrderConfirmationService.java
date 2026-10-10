package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
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

    @Autowired private PedidoRepository           pedidoRepository;
    @Autowired private CuponService               cuponService;
    @Autowired private GiftCardService            giftCardService;
    @Autowired private StockReservationService    stockReservationService;
    @Autowired private PaymentNotificationsFacade paymentNotificationsFacade;
    @Autowired private PosQrVentaService          posQrVentaService;
    @Autowired private PedidoGrupoService         pedidoGrupoService;
    @Autowired @Lazy private EncargoService       encargoService;

    @Transactional
    public void confirmarPedido(Pago pago, Object paymentServiceSelf, ApplicationEventPublisher eventPublisher) {
        Pedido principal = pago.getPedido();
        if (principal == null) {
            log.warn("confirmarPedido ignorado — pago {} sin pedido asociado", pago.getId());
            return;
        }
        List<Pedido> grupo = pedidoGrupoService.delGrupo(principal);

        // Idempotencia rápida: si el principal ya figura confirmado, el grupo entero ya se procesó.
        if (YA_CONFIRMADOS.contains(principal.getEstadoPedido())) {
            log.info("confirmarPedido ignorado — pedido {} ya está confirmado", principal.getNumeroPedido());
            return;
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
