package com.hotclick.service.analytics;

import com.hotclick.utils.Constants;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Métricas reales de la plataforma para el pitch (tracción) y el embudo de alta de vendedores:
 * de los negocios registrados en la ventana, cuántos crearon bodega, publicaron un producto y vendieron.
 * Solo cuenta datos de la base; no inventa ni proyecta nada.
 */
@Service
public class MetricasPlataformaService {

    static final List<String> ESTADOS_VENTA = List.of("PAGADO", "EN_PREPARACION", "ENVIADO", "LISTO_RETIRO", "ENTREGADO", "COMPLETADO");

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public Map<String, Object> traccion(int dias) {
        LocalDateTime desde = LocalDateTime.now(Constants.ZONA_CR).minusDays(dias);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("dias", dias);
        r.put("negociosActivos", contar("SELECT COUNT(e) FROM Empresa e WHERE e.estadoEmpresa = 'ACTIVO'", null));
        r.put("productosVisibles", contar("SELECT COUNT(p) FROM Producto p WHERE p.visibleCatalogo = true", null));
        r.put("pedidosVendidos", contarVentas("SELECT COUNT(p) FROM Pedido p WHERE p.estadoPedido IN :estados AND p.fechaPedido >= :desde", desde));
        r.put("ventasColones", contarVentas("SELECT COALESCE(SUM(p.totalPedido), 0) FROM Pedido p WHERE p.estadoPedido IN :estados AND p.fechaPedido >= :desde", desde));
        r.put("onboarding", embudo(
            contar("SELECT COUNT(e) FROM Empresa e WHERE e.fechaRegistro >= :desde", desde),
            contar("SELECT COUNT(DISTINCT b.empresa.id) FROM Bodega b WHERE b.empresa.fechaRegistro >= :desde", desde),
            contar("SELECT COUNT(DISTINCT p.empresa.id) FROM Producto p WHERE p.empresa.fechaRegistro >= :desde", desde),
            contarVentas("SELECT COUNT(DISTINCT p.empresa.id) FROM Pedido p WHERE p.estadoPedido IN :estados AND p.empresa.fechaRegistro >= :desde", desde)));
        return r;
    }

    /** Pasos del alta con cantidad, % sobre registrados y caída respecto al paso anterior. */
    static List<Map<String, Object>> embudo(long registrados, long conBodega, long conProducto, long conVenta) {
        String[] pasos = {"REGISTRO", "BODEGA", "PRIMER_PRODUCTO", "PRIMERA_VENTA"};
        long[] valores = {registrados, conBodega, conProducto, conVenta};
        List<Map<String, Object>> salida = new ArrayList<>();
        for (int i = 0; i < pasos.length; i++) {
            Map<String, Object> paso = new LinkedHashMap<>();
            paso.put("paso", pasos[i]);
            paso.put("negocios", valores[i]);
            paso.put("porcentaje", registrados == 0 ? null : Math.round(valores[i] * 1000.0 / registrados) / 10.0);
            long anterior = i == 0 ? valores[0] : valores[i - 1];
            paso.put("seVan", i == 0 ? 0 : Math.max(0, anterior - valores[i]));
            salida.add(paso);
        }
        return salida;
    }

    private long contar(String jpql, LocalDateTime desde) {
        var q = em.createQuery(jpql, Long.class);
        if (desde != null) q.setParameter("desde", desde);
        Long n = q.getSingleResult();
        return n == null ? 0 : n;
    }

    private long contarVentas(String jpql, LocalDateTime desde) {
        Number n = em.createQuery(jpql, Number.class)
            .setParameter("estados", ESTADOS_VENTA)
            .setParameter("desde", desde)
            .getSingleResult();
        return n == null ? 0 : n.longValue();
    }
}