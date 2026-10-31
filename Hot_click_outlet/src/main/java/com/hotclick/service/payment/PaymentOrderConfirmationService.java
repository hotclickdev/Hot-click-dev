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

    /**
     * Estados que el UPDATE condicional nunca pasa a PAGADO: los ya confirmados más CANCELADO y REVISION_SOBREVENTA.
     * Un webhook, retorno o cleanup tardío no revive un pedido que el ADMIN (o el cliente) ya canceló, ni aunque la
     * cancelación ocurra entre la lectura y el UPDATE (seguimiento de #458).
     */
    static final Set<String> NO_RECLAMABLES = Set.of(
        Constants.PEDIDO_PAGADO, Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_LISTO_RETIRO,
        Constants.PEDIDO_ENVIADO, Constants.PEDIDO_ENTREGADO, Constants.PEDIDO_COMPLETADO,
        Constants.PEDIDO_CANCELADO, Constants.PEDIDO_REVISION_SOBREVENTA);

    /**
     * CONFIRMADO: el grupo quedó PAGADO. YA_CONFIRMADO: no hizo nada (idempotente). SOBREVENTA: cobro sin venta
     * (M-08 sin stock, o grupo cancelado): el pago queda REEMBOLSO_PENDIENTE.
     */
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
        if (porConfirmar.isEmpty()) {
            // Grupo cancelado: no se revive, pero si el proveedor ya cobró la plata queda para reembolso.
            return cobroSobreCancelado(pago, principal);
        }
        porConfirmar.forEach(p -> Hibernate.initialize(p.getItems()));
        if (!stockReservationService.productosSinStock(porConfirmar).isEmpty()) {
            pasarARevisionPorSobreventa(pago, porConfirmar);
            return Resultado.SOBREVENTA;
        }

        boolean cuponMarcado = false;
        boolean algunoReclamado = false;
        java.util.List<Long> perdidos = new java.util.ArrayList<>();
        // SCALE1: el grupo de pago es acotado (paquetes de una compra); un UPDATE condicional por paquete.
        java.util.Iterator<Pedido> paquetes = porConfirmar.iterator();
        while (paquetes.hasNext()) {
            Pedido pedido = paquetes.next();
            // Idempotencia atómica: retorno de Tilopay, webhook, cleanup o admin pueden llegar a la vez
            // con una copia vieja del pedido; solo quien gana el UPDATE condicional aplica los efectos.
            if (pedidoRepository.reclamarParaConfirmar(pedido.getId(), NO_RECLAMABLES) == 0) {
                log.info("confirmarPedido ignorado — pedido {} ya fue confirmado por otro proceso",
                    pedido.getNumeroPedido());
                perdidos.add(pedido.getId());
                continue;
            }
            algunoReclamado = true;
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
        if (!algunoReclamado && canceladoEntreLecturaYReclamo(perdidos)) {
            // Carrera: el grupo se canceló entre la lectura y el UPDATE condicional (ninguno se reclamó).
            return cobroSobreCancelado(pago, principal);
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
        // SCALE1: sale en el primer paquete con cupón; a lo sumo una marca por checkout.
        java.util.Iterator<Pedido> paquetes = grupo.iterator();
        while (paquetes.hasNext()) {
            Pedido pedido = paquetes.next();
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

    /** true si los paquetes no reclamados están cancelados en la base y ninguno fue confirmado por otro. */
    private boolean canceladoEntreLecturaYReclamo(List<Long> perdidos) {
        if (perdidos.isEmpty()) return false;
        List<String> estados = pedidoRepository.estadosDe(perdidos);
        return estados != null && estados.contains(Constants.PEDIDO_CANCELADO)
            && estados.stream().noneMatch(YA_CONFIRMADOS::contains);
    }

    /**
     * Cobro sobre un grupo cancelado (cualquier proveedor): el pedido no se revive (su stock ya se liberó),
     * el pago queda REEMBOLSO_PENDIENTE y se alerta a plataforma. Idempotente: si el pago ya está en
     * reembolso pendiente o reembolsado no se vuelve a alertar. Devuelve SOBREVENTA (cobro sin venta).
     */
    private Resultado cobroSobreCancelado(Pago pago, Pedido principal) {
        String estado = pago.getEstadoPago();
        if (Constants.PAGO_REEMBOLSO_PENDIENTE.equals(estado) || Constants.PAGO_REEMBOLSADO.equals(estado)) {
            log.info("confirmarPedido ignorado — pago {} de grupo cancelado ya está en reembolso", pago.getId());
            return Resultado.SOBREVENTA;
        }
        pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
        pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.save(pago);
        log.error("[ALERTA-PAGO] Cobro sobre grupo cancelado: pago={} pedido={}; reembolso pendiente",
            pago.getId(), principal.getNumeroPedido());
        paymentNotificationsFacade.onSobreventa(pago, principal.getNumeroPedido());
        return Resultado.SOBREVENTA;
    }
}
