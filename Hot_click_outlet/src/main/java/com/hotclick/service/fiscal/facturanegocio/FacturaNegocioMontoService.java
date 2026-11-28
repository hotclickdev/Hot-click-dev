package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.consola.QuincenaAdminService;
import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioCalculo.LineaDesglose;
import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioCalculo.Periodo;
import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioCalculo.VentaProducto;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Cuánto le debe facturar un negocio a HotClick por una quincena, con la liquidación existente: ventas de productos
 * menos la comisión de HotClick (NETO) o el total de productos (BRUTO). El envío no entra. Desglose por producto.
 */
@Service
public class FacturaNegocioMontoService {

    /** Topes de lectura por negocio y quincena (muy por encima del volumen real). */
    static final int MAX_PEDIDOS = 5000;
    static final int MAX_PRODUCTOS = 500;

    public record Monto(long productos, long comision, long monto, String base, List<LineaDesglose> desglose) {}

    private final PedidoRepository pedidos;
    private final FacturaNegocioLiquidacionLotes lotes;

    public FacturaNegocioMontoService(PedidoRepository pedidos, FacturaNegocioLiquidacionLotes lotes) {
        this.pedidos = pedidos;
        this.lotes = lotes;
    }

    @Transactional(readOnly = true)
    public Monto calcular(Long empresaId, Periodo periodo, String base) {
        var desde = periodo.desde().atStartOfDay();
        var hasta = periodo.hasta().plusDays(1).atStartOfDay();
        var lista = pedidos.pedidosParaFacturaNegocio(empresaId, desde, hasta, QuincenaAdminService.ESTADOS,
            PageRequest.of(0, MAX_PEDIDOS));
        FacturaNegocioLiquidacionLotes.Sumas s = lotes.sumar(lista);
        long monto = FacturaNegocioCalculo.monto(base, s.productos(), s.comision());
        List<VentaProducto> ventas = pedidos.productosParaFacturaNegocio(empresaId, desde, hasta,
                QuincenaAdminService.ESTADOS, PageRequest.of(0, MAX_PRODUCTOS))
            .stream().map(FacturaNegocioMontoService::venta).toList();
        return new Monto(s.productos(), s.comision(), monto, base, FacturaNegocioCalculo.repartir(ventas, monto));
    }

    static VentaProducto venta(Object[] r) {
        return new VentaProducto(r[0] == null ? null : ((Number) r[0]).longValue(), (String) r[1], (String) r[2],
            r[3] == null ? 0L : ((Number) r[3]).longValue(), r[4] == null ? 0L : ((Number) r[4]).longValue());
    }
}
