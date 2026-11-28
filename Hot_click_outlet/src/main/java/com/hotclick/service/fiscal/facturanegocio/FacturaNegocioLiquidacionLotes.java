package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.model.Pedido;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.AggregatorService.Liquidacion;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Suma la liquidación existente ({@link AggregatorService#liquidarPedido}) de los pedidos que ya se cargaron.
 * Productos = total del pedido menos el envío; comisión = la misma que descuenta la quincena (o la que retuvo ONVO).
 */
@Component
public class FacturaNegocioLiquidacionLotes {

    public record Sumas(long productos, long comision) {}

    private final AggregatorService aggregator;

    public FacturaNegocioLiquidacionLotes(AggregatorService aggregator) { this.aggregator = aggregator; }

    public Sumas sumar(List<Pedido> pedidos) {
        long productos = 0;
        long comision = 0;
        for (Pedido pedido : pedidos) {
            long total = pedido.getTotalPedido() != null ? pedido.getTotalPedido() : 0L;
            Liquidacion l = aggregator.liquidarPedido(pedido);
            productos += Math.max(0L, total - l.envio());
            comision += l.detalle().resultado().totalComision();
        }
        return new Sumas(productos, comision);
    }
}
