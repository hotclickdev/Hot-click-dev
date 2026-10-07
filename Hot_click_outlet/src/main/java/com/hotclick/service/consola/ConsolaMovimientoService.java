package com.hotclick.service.consola;

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

@Service
public class ConsolaMovimientoService {

    private static final String[] DIAS = {"Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"};

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public Map<String, Object> movimiento(int dias) {
        int ventana = Math.min(Math.max(dias, 1), 90);
        LocalDateTime desde = LocalDateTime.now(Constants.ZONA_CR).minusDays(ventana);
        List<Object[]> horas = em.createNativeQuery("""
            SELECT CAST(EXTRACT(DOW FROM fecha_pedido) AS int),
                   CAST(EXTRACT(HOUR FROM fecha_pedido) AS int),
                   COUNT(*),
                   COALESCE(SUM(subtotal), 0)
            FROM hot_click_pedido_tb
            WHERE fecha_pedido >= :desde
              AND estado_pedido IN ('PAGADO','ENVIADO','ENTREGADO','LISTO')
            GROUP BY 1, 2
            """).setParameter("desde", desde).getResultList();
        Map<String, Object> salida = new LinkedHashMap<>();
        salida.put("dias", porDia(horas));
        salida.put("horas", porHora(horas));
        salida.put("productos", ranking("""
            SELECT pr.nombre_producto, COALESCE(SUM(i.cantidad), 0), COALESCE(SUM(i.subtotal_item), 0)
            FROM hot_click_pedido_item_tb i
            JOIN hot_click_pedido_tb p ON p.id_pedido = i.fk_id_pedido
            JOIN hot_click_producto_tb pr ON pr.id_producto = i.fk_id_producto
            WHERE p.fecha_pedido >= :desde
              AND p.estado_pedido IN ('PAGADO','ENVIADO','ENTREGADO','LISTO')
            GROUP BY pr.nombre_producto
            ORDER BY SUM(i.cantidad) DESC
            LIMIT 8
            """, desde));
        salida.put("categorias", ranking("""
            SELECT COALESCE(c.nombre_categoria, 'Sin categoría'), COALESCE(SUM(i.cantidad), 0), COALESCE(SUM(i.subtotal_item), 0)
            FROM hot_click_pedido_item_tb i
            JOIN hot_click_pedido_tb p ON p.id_pedido = i.fk_id_pedido
            JOIN hot_click_producto_tb pr ON pr.id_producto = i.fk_id_producto
            LEFT JOIN hot_click_categoria_tb c ON c.id_categoria = pr.fk_id_categoria
            WHERE p.fecha_pedido >= :desde
              AND p.estado_pedido IN ('PAGADO','ENVIADO','ENTREGADO','LISTO')
            GROUP BY c.nombre_categoria
            ORDER BY SUM(i.subtotal_item) DESC
            LIMIT 8
            """, desde));
        salida.put("hayDatos", !horas.isEmpty());
        return salida;
    }

    private List<Map<String, Object>> porDia(List<Object[]> horas) {
        long[] pedidos = new long[7];
        long[] ingresos = new long[7];
        for (Object[] fila : horas) {
            int dia = ((Number) fila[0]).intValue();
            if (dia < 0 || dia > 6) continue;
            pedidos[dia] += ((Number) fila[2]).longValue();
            ingresos[dia] += ((Number) fila[3]).longValue();
        }
        if (suma(pedidos) == 0) return List.of();
        List<Map<String, Object>> filas = new ArrayList<>();
        int[] orden = {1, 2, 3, 4, 5, 6, 0};
        for (int dia : orden) filas.add(punto(DIAS[dia], pedidos[dia], ingresos[dia]));
        return filas;
    }

    private List<Map<String, Object>> porHora(List<Object[]> horas) {
        Map<Integer, long[]> porHora = new LinkedHashMap<>();
        for (Object[] fila : horas) {
            int hora = ((Number) fila[1]).intValue();
            long[] actual = porHora.computeIfAbsent(hora, k -> new long[2]);
            actual[0] += ((Number) fila[2]).longValue();
            actual[1] += ((Number) fila[3]).longValue();
        }
        return porHora.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entrada -> punto(entrada.getKey() + "h", entrada.getValue()[0], entrada.getValue()[1]))
            .toList();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> ranking(String sql, LocalDateTime desde) {
        List<Object[]> filas = em.createNativeQuery(sql).setParameter("desde", desde).getResultList();
        List<Map<String, Object>> salida = new ArrayList<>();
        for (Object[] fila : filas) {
            long unidades = ((Number) fila[1]).longValue();
            if (unidades <= 0) continue;
            Map<String, Object> punto = new LinkedHashMap<>();
            punto.put("nombre", String.valueOf(fila[0]));
            punto.put("unidades", unidades);
            punto.put("ingresos", ((Number) fila[2]).longValue());
            salida.add(punto);
        }
        return salida;
    }

    private static Map<String, Object> punto(String etiqueta, long pedidos, long ingresos) {
        Map<String, Object> punto = new LinkedHashMap<>();
        punto.put("etiqueta", etiqueta);
        punto.put("pedidos", pedidos);
        punto.put("ingresos", ingresos);
        return punto;
    }

    private static long suma(long[] valores) {
        long total = 0;
        for (long valor : valores) total += valor;
        return total;
    }
}
