package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.Bodega;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.GiftCardService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Crea los subpedidos de un checkout: uno por paquete (bodega de origen), todos bajo el mismo
 * {@code grupoPago}. Lo usan el cobro con pasarela y el de SINPE.
 */
@Service
public class CheckoutGrupoFactory {

    private final CheckoutValidator checkoutValidator;
    private final CheckoutPaquetesPlanner planner;
    private final OrderPricingService orderPricingService;
    private final CheckoutOrderFactory checkoutOrderFactory;
    private final GiftCardService giftCardService;

    public CheckoutGrupoFactory(CheckoutValidator checkoutValidator, CheckoutPaquetesPlanner planner,
                                OrderPricingService orderPricingService, CheckoutOrderFactory checkoutOrderFactory,
                                GiftCardService giftCardService) {
        this.checkoutValidator = checkoutValidator;
        this.planner = planner;
        this.orderPricingService = orderPricingService;
        this.checkoutOrderFactory = checkoutOrderFactory;
        this.giftCardService = giftCardService;
    }

    public record Subpedido(Pedido pedido, OrderPricingResult pricing) {}

    public record Grupo(List<Subpedido> subpedidos, int totalCobro) {
        public Pedido principal() { return subpedidos.get(0).pedido(); }
        public List<Pedido> pedidos() { return subpedidos.stream().map(Subpedido::pedido).toList(); }
        /** Todo el pedido lo cubre la tarjeta de regalo: no hace falta pasarela. */
        public boolean cubiertoPorGiftCard() {
            return totalCobro == 0 && subpedidos.stream().anyMatch(s -> s.pricing().gcMonto() > 0);
        }
    }

    public Grupo crear(PaymentCheckoutRequest req, StockReservationResult reservation, Bodega bodegaDefault,
                       String provider, Usuario usuario, String estadoInicial) {
        List<CheckoutPaquetesPlanner.Paquete> paquetes =
            planner.planificar(req, reservation.productosMap(), bodegaDefault);
        for (CheckoutPaquetesPlanner.Paquete paquete : paquetes) {
            checkoutValidator.assertBodegaTenant(paquete.bodega(), paquete.bodega().getId());
            checkoutValidator.validarRetiroPaquete(paquete.metodoEnvio(), paquete.bodega());
        }

        String grupoPago = "GP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        int gcRestante = saldoGiftCard(req);
        int totalCobro = 0;
        List<Subpedido> subpedidos = new ArrayList<>();
        for (CheckoutPaquetesPlanner.Paquete paquete : paquetes) {
            OrderPricingResult pricing = orderPricingService.calcularPaquete(
                req, paquete.bodega(), paquete.subtotal(), paquete.metodoEnvio(), gcRestante);
            gcRestante -= pricing.gcMonto();
            Pedido pedido = checkoutOrderFactory.crearSubpedido(pricing, paquete.subtotal(), paquete.costoTotal(),
                provider, usuario, paquete.bodega(), paquete.metodoEnvio(), paquete.notas(), grupoPago, estadoInicial);
            checkoutOrderFactory.addItemSnapshots(pedido, paquete.items(), reservation.productosMap());
            subpedidos.add(new Subpedido(pedido, pricing));
            totalCobro += pricing.totalConGC();
        }
        return new Grupo(subpedidos, totalCobro);
    }

    private int saldoGiftCard(PaymentCheckoutRequest req) {
        String codigo = req.getCodigoGiftCard();
        if (codigo == null || codigo.isBlank()) return 0;
        return giftCardService.validarPublico(codigo).map(gc -> gc.getSaldoActual()).orElse(0);
    }

    /**
     * Las pasarelas cobran con el número y el id del paquete principal (el Pago vive en él)
     * pero por el total del grupo. Copia en memoria: nunca se persiste.
     */
    public static Pedido paraCobro(Pedido principal, int totalGrupo) {
        Pedido cobro = new Pedido();
        cobro.setId(principal.getId());
        cobro.setNumeroPedido(principal.getNumeroPedido());
        cobro.setTotalPedido(totalGrupo);
        cobro.setUsuarioFinal(principal.getUsuarioFinal());
        cobro.setEmpresa(principal.getEmpresa());
        cobro.setBodega(principal.getBodega());
        cobro.setGrupoPago(principal.getGrupoPago());
        return cobro;
    }

    public static List<PaymentCheckoutResponse.Paquete> resumen(List<Pedido> pedidos) {
        return pedidos.stream().map(p -> {
            Bodega b = p.getBodega();
            String tienda = p.getEmpresa() != null && p.getEmpresa().getNombreEmpresa() != null
                ? p.getEmpresa().getNombreEmpresa() : (b != null ? b.getNombreBodega() : "HotClick");
            String origen = b != null && b.getProvincia() != null && !b.getProvincia().isBlank() ? b.getProvincia() : null;
            return new PaymentCheckoutResponse.Paquete(p.getNumeroPedido(), tienda, origen,
                p.getMetodoEnvio(), p.getCostoEnvio(), p.getTotalPedido());
        }).toList();
    }
}
