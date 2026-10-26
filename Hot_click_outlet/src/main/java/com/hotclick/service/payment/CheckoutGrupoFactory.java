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

    /**
     * CMP-4: la {@code bodegaId} del body tiene que ser de un negocio que vende algo del carrito.
     * Si no se mandó o es la default HotClick (id 1), o la bodega no tiene negocio, no se exige.
     */
    static void exigirBodegaDeLaTienda(PaymentCheckoutRequest req, java.util.Map<Long, com.hotclick.model.Producto> productos,
                                       Bodega bodega) {
        // bodegaId=1 es la default HotClick que el front manda en todo envío: se trata como "no se mandó".
        if (req.getBodegaId() == null || java.util.Objects.equals(req.getBodegaId(), com.hotclick.utils.Constants.BODEGA_DEFAULT_ID)
            || bodega == null || bodega.getEmpresa() == null || productos == null || productos.isEmpty()) return;
        Long empresaBodega = bodega.getEmpresa().getId();
        boolean coincide = productos.values().stream()
            .anyMatch(p -> empresaBodega.equals(empresaDe(p)));
        if (!coincide) throw new IllegalArgumentException("La bodega elegida no es de la tienda de estos productos.");
    }

    /** E2E-CMP-01: empresas que venden los productos del paquete; un ítem sin empresa aporta null (se rechaza). */
    static java.util.Set<Long> empresasVendedoras(CheckoutPaquetesPlanner.Paquete paquete,
                                                  java.util.Map<Long, com.hotclick.model.Producto> productos) {
        java.util.Set<Long> ids = new java.util.HashSet<>();
        if (productos == null) return ids;
        for (PaymentCheckoutRequest.ItemDTO item : paquete.items()) {
            com.hotclick.model.Producto p = productos.get(item.getProductoId());
            ids.add(p != null ? empresaDe(p) : null);
        }
        return ids;
    }

    private static Long empresaDe(com.hotclick.model.Producto p) {
        if (p.getEmpresa() != null) return p.getEmpresa().getId();
        return p.getBodega() != null && p.getBodega().getEmpresa() != null ? p.getBodega().getEmpresa().getId() : null;
    }

    public Grupo crear(PaymentCheckoutRequest req, StockReservationResult reservation, Bodega bodegaDefault,
                       String provider, Usuario usuario, String estadoInicial) {
        exigirBodegaDeLaTienda(req, reservation.productosMap(), bodegaDefault);
        List<CheckoutPaquetesPlanner.Paquete> paquetes =
            planner.planificar(req, reservation.productosMap(), bodegaDefault);
        for (CheckoutPaquetesPlanner.Paquete paquete : paquetes) {
            checkoutValidator.assertBodegaTenant(paquete.bodega(), paquete.bodega() != null ? paquete.bodega().getId() : null,
                empresasVendedoras(paquete, reservation.productosMap()));
            checkoutValidator.validarRetiroPaquete(paquete.metodoEnvio(), paquete.bodega());
        }
        orderPricingService.exigirCuponValido(req.getCodigoCupon(), paquetes.stream()
            .map(p -> p.bodega().getEmpresa() != null ? p.bodega().getEmpresa().getId() : null)
            .collect(java.util.stream.Collectors.toCollection(java.util.ArrayList::new)));

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
            checkoutOrderFactory.aplicarDireccion(pedido, req.getDireccionEntrega());
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
            // Nombre visible del negocio (EmpresaNombre); nunca el nombre interno de la bodega (NP-19).
            String tienda = com.hotclick.utils.EmpresaNombre.mostrar(p.getEmpresa(), "HotClick");
            String origen = b != null && b.getProvincia() != null && !b.getProvincia().isBlank() ? b.getProvincia() : null;
            return new PaymentCheckoutResponse.Paquete(p.getNumeroPedido(), tienda, origen,
                p.getMetodoEnvio(), p.getCostoEnvio(), p.getTotalPedido());
        }).toList();
    }
}
