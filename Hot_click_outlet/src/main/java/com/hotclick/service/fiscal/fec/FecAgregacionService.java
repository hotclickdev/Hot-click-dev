package com.hotclick.service.fiscal.fec;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.AggregatorService.Liquidacion;
import com.hotclick.service.consola.QuincenaAdminService;
import com.hotclick.service.fiscal.fec.FecModelos.CompraEmpresa;
import com.hotclick.service.fiscal.fec.FecModelos.LineaCompra;
import com.hotclick.service.fiscal.fec.FecModelos.Vendedor;
import com.hotclick.service.hacienda.CodigoCabys;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cuánto le compró HotClick a cada negocio en una quincena: ventas de productos del negocio menos la comisión
 * de HotClick (misma liquidación por pedido que el cierre de quincena de la consola). El envío no entra:
 * se le paga completo al negocio como servicio aparte. Solo lectura.
 */
@Service
public class FecAgregacionService {

    private final PedidoRepository pedidoRepo;
    private final AggregatorService aggregator;

    public FecAgregacionService(PedidoRepository pedidoRepo, AggregatorService aggregator) {
        this.pedidoRepo = pedidoRepo;
        this.aggregator = aggregator;
    }

    @Transactional(readOnly = true)
    public List<CompraEmpresa> compras(FecPeriodo periodo) {
        LocalDateTime ini = periodo.desde().atStartOfDay();
        LocalDateTime finExclusivo = periodo.hasta().plusDays(1).atStartOfDay();
        List<Pedido> pedidos = pedidoRepo.findConEmpresaEnPeriodo(ini, finExclusivo, QuincenaAdminService.ESTADOS);

        Map<Long, Acum> porEmpresa = new LinkedHashMap<>();
        for (Pedido p : pedidos) {
            Empresa e = p.getEmpresa();
            if (e == null || e.getId() == null || e.isEsPrueba() || p.isEsPrueba()) continue;
            long total = p.getTotalPedido() != null ? p.getTotalPedido() : 0L;
            long envio = p.getCostoEnvio() != null ? p.getCostoEnvio() : 0L;
            Liquidacion liq = aggregator.liquidar(e.getId(), total, envio);
            long productos = Math.max(0L, total - liq.envio());
            long comision = Math.min(productos, liq.detalle().resultado().totalComision());
            long compra = productos - comision;
            if (compra <= 0) continue;
            Acum a = porEmpresa.computeIfAbsent(e.getId(), k -> new Acum(vendedor(e)));
            a.ventas += productos;
            a.comision += comision;
            for (LineaCompra l : repartir(p.getItems(), compra)) {
                a.lineas.merge(l.cabys() == null ? "" : l.cabys(), l, (x, y) ->
                    new LineaCompra(x.cabys(), x.detalle(), x.monto() + y.monto()));
            }
        }
        List<CompraEmpresa> salida = new ArrayList<>();
        porEmpresa.values().forEach(a -> salida.add(new CompraEmpresa(a.vendedor, a.ventas, a.comision,
            a.ventas - a.comision, new ArrayList<>(a.lineas.values()))));
        return salida;
    }

    private static Vendedor vendedor(Empresa e) {
        return new Vendedor(e.getId(), e.getSituacionFiscal(), e.getCedulaFiscal(), e.getNombreFiscal(),
            e.getActividadFiscal(), e.getCorreoFacturacion());
    }

    /**
     * Reparte {@code compra} entre los CAByS de los ítems en proporción a su valor bruto (el resto por redondeo
     * va a la última línea, para que la suma sea exacta). Sin ítems o sin valor, una sola línea genérica.
     */
    static List<LineaCompra> repartir(List<PedidoItem> items, long compra) {
        Map<String, long[]> pesos = new LinkedHashMap<>();
        long totalPeso = 0;
        if (items != null) {
            for (PedidoItem it : items) {
                Producto prod = it.getProducto();
                String cabys = prod != null && CodigoCabys.valido(prod.getCodigoCabys()) ? prod.getCodigoCabys() : "";
                long peso = (long) Math.max(0, it.getCantidad() != null ? it.getCantidad() : 0)
                    * Math.max(0, it.getPrecioUnitarioMomento() != null ? it.getPrecioUnitarioMomento() : 0);
                pesos.computeIfAbsent(cabys, k -> new long[1])[0] += peso;
                totalPeso += peso;
            }
        }
        List<LineaCompra> lineas = new ArrayList<>();
        if (totalPeso <= 0) {
            lineas.add(new LineaCompra(null, "Compra de mercancías", compra));
            return lineas;
        }
        long asignado = 0;
        int i = 0;
        for (Map.Entry<String, long[]> en : pesos.entrySet()) {
            boolean ultima = ++i == pesos.size();
            long monto = ultima ? compra - asignado : compra * en.getValue()[0] / totalPeso;
            asignado += monto;
            if (monto <= 0) continue;
            String cabys = en.getKey().isEmpty() ? null : en.getKey();
            lineas.add(new LineaCompra(cabys, "Compra de mercancías", monto));
        }
        return lineas;
    }

    private static final class Acum {
        private final Vendedor vendedor;
        private long ventas;
        private long comision;
        private final Map<String, LineaCompra> lineas = new LinkedHashMap<>();

        private Acum(Vendedor vendedor) { this.vendedor = vendedor; }
    }
}
