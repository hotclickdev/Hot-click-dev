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

/**
 * Confirma el pago de un checkout. Un checkout multivendedor tiene N subpedidos bajo un mismo
 * Pago: todos se marcan PAGADO, cada uno consume su propio stock y acredita a su propia empresa.
 */
@Service
public class PaymentOrderConfirmationService {

    private static final Logger log = LoggerFactory.getLogger(PaymentOrderConfirmationService.class);

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

        // Idempotencia: si el principal ya está pagado, el grupo entero ya se procesó.
        if (Constants.PEDIDO_PAGADO.equals(principal.getEstadoPedido())) {
            log.info("confirmarPedido ignorado — pedido {} ya está PAGADO", principal.getNumeroPedido());
            return;
        }

        marcarCuponUsadoUnaVez(grupo);

        for (Pedido pedido : grupo) {
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
