package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Compra;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.CompraRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Crea la compra del marketplace: reserva stock, arma un paquete por negocio
 * y crea un pedido por paquete con su envío, cupón, descuento SINPE y tarjeta
 * de regalo. El cobro (tarjeta o SINPE) lo hace quien llama, una sola vez.
 */
@Service
public class CompraCheckoutService {

    @Autowired private StockReservationService stockReservationService;
    @Autowired private PaquetesCheckoutBuilder paquetesCheckoutBuilder;
    @Autowired private OrderPricingService     orderPricingService;
    @Autowired private CheckoutOrderFactory    checkoutOrderFactory;
    @Autowired private CompraRepository        compraRepository;

    public CompraCheckoutResult crear(PaymentCheckoutRequest req, Usuario usuario,
                                      String provider, String estadoInicial) {
        StockReservationResult reserva = stockReservationService.reserveForCheckout(req.getItems());
        List<PaqueteCheckout> paquetes = paquetesCheckoutBuilder.armar(req, reserva.productosMap());
        List<OrderPricingResult> precios = paquetes.stream()
            .map(p -> orderPricingService.calculate(req, p.metodoEnvio(), p.origen(), p.subtotal()))
            .toList();

        Compra compra = guardarCompra(usuario, provider, paquetes.size(), precios);
        CompraContexto ctx = new CompraContexto(req, usuario, provider, estadoInicial, compra);

        List<Pedido> pedidos = new ArrayList<>();
        for (int i = 0; i < paquetes.size(); i++) {
            PaqueteCheckout paquete = paquetes.get(i);
            Pedido pedido = checkoutOrderFactory.createPendingOrder(ctx, paquete, precios.get(i));
            checkoutOrderFactory.addItemSnapshots(pedido, paquete.items(), reserva.productosMap());
            pedidos.add(pedido);
        }
        return new CompraCheckoutResult(compra, pedidos, precios);
    }

    private Compra guardarCompra(Usuario usuario, String provider, int cantidadPaquetes,
                                 List<OrderPricingResult> precios) {
        Compra compra = new Compra();
        compra.setNumeroCompra(Constants.generarNumeroPedido("ORD-"));
        compra.setFechaCompra(LocalDateTime.now(Constants.ZONA_CR));
        compra.setTotalCompra(precios.stream().mapToInt(OrderPricingResult::totalConGC).sum());
        compra.setCantidadPaquetes(cantidadPaquetes);
        compra.setMetodoPago(provider);
        compra.setUsuarioFinal(usuario);
        compra.setEstado(Constants.ESTADO_ACTIVO);
        return compraRepository.save(compra);
    }
}
