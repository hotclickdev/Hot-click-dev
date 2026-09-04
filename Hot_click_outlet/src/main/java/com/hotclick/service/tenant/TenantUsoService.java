package com.hotclick.service.tenant;

import com.hotclick.exception.RecursoNoEncontradoException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

/**
 * Agregados de uso por tenant (GMV, pedidos, IA, proxy de almacenamiento).
 * Una query SQL con LEFT JOIN de subconsultas — sin N+1.
 */
@Service
public class TenantUsoService {

    private static final String ESTADOS_GMV = "'ENTREGADO','COMPLETADO'";

    @Autowired private JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public Map<String, Object> ranking(Integer anio, Integer mes) {
        TenantUsoAgregacion.PeriodoUso periodo = TenantUsoAgregacion.periodo(anio, mes);
        List<Map<String, Object>> filas = consultar(sqlRanking(), periodo, null);
        return TenantUsoAgregacion.rankingDesdeFilas(periodo.anio(), periodo.mes(), filas);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detalle(Long empresaId, Integer anio, Integer mes) {
        TenantUsoAgregacion.PeriodoUso periodo = TenantUsoAgregacion.periodo(anio, mes);
        List<Map<String, Object>> rows = consultar(sqlDetalle(), periodo, empresaId);
        if (rows.isEmpty()) {
            throw new RecursoNoEncontradoException("Empresa", empresaId);
        }
        return TenantUsoAgregacion.detalleDesdeFila(periodo, rows.get(0));
    }

    private List<Map<String, Object>> consultar(
            String sql, TenantUsoAgregacion.PeriodoUso p, Long empresaId) {
        Timestamp inicio = Timestamp.valueOf(p.inicio().atStartOfDay());
        Timestamp fin = Timestamp.valueOf(p.fin().atStartOfDay());
        if (empresaId == null) {
            return jdbc.query(sql, this::mapearFila, inicio, fin, p.anio(), p.mes());
        }
        return jdbc.query(sql, this::mapearFila, inicio, fin, p.anio(), p.mes(), empresaId);
    }

    private Map<String, Object> mapearFila(ResultSet rs, int rowNum) throws SQLException {
        Number maxCreditos = (Number) rs.getObject("max_creditos_ai");
        Integer maxAi = maxCreditos != null ? maxCreditos.intValue() : null;
        int limite = TenantUsoAgregacion.resolverLimite(maxAi, rs.getString("plan_saas"));
        return TenantUsoAgregacion.filaUso(
            rs.getLong("id_empresa"),
            rs.getString("nombre"),
            rs.getString("slug"),
            rs.getString("estado_empresa"),
            rs.getString("plan_nombre"),
            rs.getLong("gmv"),
            rs.getLong("pedidos"),
            rs.getLong("gmv_mes"),
            rs.getLong("pedidos_mes"),
            rs.getLong("llamadas"),
            rs.getLong("tokens_entrada"),
            rs.getLong("tokens_salida"),
            limite,
            rs.getLong("productos"),
            rs.getLong("imagenes")
        );
    }

    private static String sqlRanking() {
        return sqlBase()
            + " WHERE e.id_empresa <> " + TenantUsoAgregacion.EMPRESA_PLATAFORMA_ID
            + " ORDER BY COALESCE(ped.gmv, 0) DESC, COALESCE(e.nombre_comercial, e.nombre_empresa)";
    }

    private static String sqlDetalle() {
        return sqlBase() + " WHERE e.id_empresa = ?";
    }

    private static String sqlBase() {
        return """
            SELECT
              e.id_empresa,
              COALESCE(e.nombre_comercial, e.nombre_empresa) AS nombre,
              e.slug,
              e.estado_empresa,
              e.plan_saas,
              COALESCE(pl.nombre, e.plan_saas) AS plan_nombre,
              pl.max_creditos_ai,
              COALESCE(ped.gmv, 0) AS gmv,
              COALESCE(ped.pedidos, 0) AS pedidos,
              COALESCE(ped.gmv_mes, 0) AS gmv_mes,
              COALESCE(ped.pedidos_mes, 0) AS pedidos_mes,
              COALESCE(ai.llamadas, 0) AS llamadas,
              COALESCE(ai.tokens_entrada, 0) AS tokens_entrada,
              COALESCE(ai.tokens_salida, 0) AS tokens_salida,
              COALESCE(prod.productos, 0) AS productos,
              COALESCE(img.imagenes, 0) AS imagenes
            FROM hot_click_empresa_tb e
            LEFT JOIN hot_click_plan_tb pl ON pl.id_plan = e.fk_id_plan
            LEFT JOIN (
              SELECT ped.fk_id_empresa,
                COUNT(*)::bigint AS pedidos,
                COALESCE(SUM(CASE WHEN estado_pedido IN (%s) THEN total_pedido ELSE 0 END), 0)::bigint AS gmv,
                COUNT(*) FILTER (
                  WHERE fecha_pedido >= b.inicio AND fecha_pedido < b.fin
                )::bigint AS pedidos_mes,
                COALESCE(SUM(CASE
                  WHEN estado_pedido IN (%s)
                   AND fecha_pedido >= b.inicio AND fecha_pedido < b.fin
                  THEN total_pedido ELSE 0 END), 0)::bigint AS gmv_mes
              FROM hot_click_pedido_tb ped
              CROSS JOIN (SELECT ?::timestamp AS inicio, ?::timestamp AS fin) b
              GROUP BY ped.fk_id_empresa, b.inicio, b.fin
            ) ped ON ped.fk_id_empresa = e.id_empresa
            LEFT JOIN hot_click_ai_uso_tb ai
                   ON ai.fk_id_empresa = e.id_empresa AND ai.anio = ? AND ai.mes = ?
            LEFT JOIN (
              SELECT fk_id_empresa, COUNT(*)::bigint AS productos
              FROM hot_click_producto_tb
              WHERE estado = 1
              GROUP BY fk_id_empresa
            ) prod ON prod.fk_id_empresa = e.id_empresa
            LEFT JOIN (
              SELECT p.fk_id_empresa,
                (COUNT(i.id_imagen)
                 + COUNT(DISTINCT CASE
                     WHEN p.imagen_principal_url IS NOT NULL AND p.imagen_principal_url <> ''
                     THEN p.id_producto END)
                )::bigint AS imagenes
              FROM hot_click_producto_tb p
              LEFT JOIN hot_click_producto_imagen_tb i ON i.fk_id_producto = p.id_producto
              WHERE p.estado = 1
              GROUP BY p.fk_id_empresa
            ) img ON img.fk_id_empresa = e.id_empresa
            """.formatted(ESTADOS_GMV, ESTADOS_GMV);
    }
}
