package com.hotclick.service;

import com.hotclick.repository.OrdenCompraRepository;
import com.hotclick.repository.PedidoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * KPIs financieros (ventas, CMV, ganancia neta, IVA) para un período — usado por
 * el reporte de analítica financiera del panel (FinanzasReporteController) y por
 * el Copilot de IA para responder consultas de finanzas con las mismas cifras
 * que ve el dueño en /admin/finanzas, sin duplicar la fórmula en dos lugares.
 */
@Service
public class FinanzasReporteService {

    @Autowired private PedidoRepository      pedidoRepository;
    @Autowired private OrdenCompraRepository ordenCompraRepository;

    public Map<String, Object> calcularKpis(Long empresaId, String desde, String hasta) {
        List<Object[]> kpisRows = pedidoRepository.reporteIvaKpis(empresaId, desde, hasta);
        Object[] row = (kpisRows != null && !kpisRows.isEmpty()) ? kpisRows.get(0) : new Object[8];

        long cantidadVentas  = toLong(row[0]);
        long ventasTotales   = toLong(row[1]);
        long subtotal        = toLong(row[2]);
        long costoEnvio      = toLong(row[3]);
        long cmv             = toLong(row[4]);
        long utilidadBruta   = toLong(row[5]);
        long ivaConfirmado   = toLong(row[6]);
        long ivaEstimado     = toLong(row[7]);

        long comprasRecibidas = ordenCompraRepository.sumComprasRecibidasEnPeriodo(empresaId, desde, hasta);
        long gananciaNeta = ventasTotales - cmv - costoEnvio;
        double margenPct = ventasTotales > 0
            ? Math.round((gananciaNeta * 1000.0) / ventasTotales) / 10.0
            : 0.0;

        Map<String, Object> kpis = new LinkedHashMap<>();
        kpis.put("cantidadVentas",    cantidadVentas);
        kpis.put("ventasTotales",     ventasTotales);
        kpis.put("subtotalProductos", subtotal);
        kpis.put("costoEnvio",        costoEnvio);
        kpis.put("cmv",               cmv);
        kpis.put("utilidadBruta",     utilidadBruta);
        kpis.put("gananciaNeta",      gananciaNeta);
        kpis.put("margenPct",         margenPct);
        kpis.put("ivaRecaudado",      ivaConfirmado);
        kpis.put("ivaEstimado",       ivaEstimado);
        kpis.put("comprasRecibidas",  comprasRecibidas);
        return kpis;
    }

    private long toLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return n.longValue();
        return Long.parseLong(v.toString());
    }
}
