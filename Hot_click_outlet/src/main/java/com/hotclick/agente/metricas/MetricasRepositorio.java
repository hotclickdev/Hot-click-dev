package com.hotclick.agente.metricas;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Consultas agregadas (GROUP BY) de las métricas del bot. Son cinco sentencias por alcance, sin importar cuántas
 * conversaciones o pedidos haya: nada se consulta por fila. Todo se filtra por empresa con un fragmento fijo del
 * propio código (nunca texto del usuario); los valores van como parámetros.
 */
@Repository
public class MetricasRepositorio {

    /** Estados de un pedido que ya cobró (los mismos que usa el vencimiento de enlaces). */
    private static final String ESTADOS_PAGADOS =
        "('PAGADO','EN_PREPARACION','LISTO_RETIRO','ENVIADO','ENTREGADO','COMPLETADO')";

    /** Conversaciones por bot y canal, y cuántas pasaron a una persona. */
    public record FilaConversaciones(String perfil, String canal, long conversaciones, long aPersona) { }

    /** Enlaces por bot y canal. */
    public record FilaEnlaces(String perfil, String canal, long creados, long abiertos, long pagados, long vencidos,
                              long totalVencidos) { }

    public record FilaVentas(String canal, long cantidad, long totalColones) { }

    public record Costo(BigDecimal costoUsd, long conversaciones) { }

    /**
     * Qué negocios cuenta una consulta: uno solo, el bot de HotClick (sin empresa) o toda la plataforma.
     * Nunca se arma desde un parámetro del cliente: lo decide el servicio con el alcance del usuario autenticado.
     */
    public record Alcance(Long empresaId, boolean plataforma) {
        public static Alcance negocio(Long empresaId) {
            if (empresaId == null) throw new IllegalArgumentException("empresaId es obligatorio");
            return new Alcance(empresaId, false);
        }

        public static Alcance hotclick() {
            return new Alcance(null, false);
        }

        public static Alcance todaLaPlataforma() {
            return new Alcance(null, true);
        }

        /** Fragmento SQL fijo para la columna de empresa dada (nombres del propio código). */
        String filtro(String columna) {
            if (plataforma) return "1 = 1";
            return empresaId == null ? columna + " IS NULL" : columna + " = ?";
        }

        void agregarParametro(List<Object> args) {
            if (!plataforma && empresaId != null) args.add(empresaId);
        }
    }

    private final JdbcTemplate jdbc;

    public MetricasRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<FilaConversaciones> conversaciones(Alcance alcance, OffsetDateTime desde, OffsetDateTime hastaExcl) {
        List<Object> args = new ArrayList<>(List.of(desde, hastaExcl));
        alcance.agregarParametro(args);
        String sql = "SELECT COALESCE(s.perfil, 'SIN_PERFIL') AS perfil, s.canal AS canal, COUNT(*) AS n, "
            + "SUM(CASE WHEN s.modo = 'PERSONA' THEN 1 ELSE 0 END) AS a_persona "
            + "FROM hot_click_chat_sesion_tb s "
            + "WHERE s.fk_id_canal_cuenta IS NOT NULL AND (s.perfil IS NULL OR s.perfil <> 'NEGOCIO_INTERNO') "
            + "AND s.iniciada_en >= ? AND s.iniciada_en < ? AND " + alcance.filtro("s.fk_id_empresa") + " "
            + "GROUP BY COALESCE(s.perfil, 'SIN_PERFIL'), s.canal";
        return jdbc.query(sql, (rs, i) -> new FilaConversaciones(rs.getString("perfil"), rs.getString("canal"),
            rs.getLong("n"), rs.getLong("a_persona")), args.toArray());
    }

    public List<FilaEnlaces> enlaces(Alcance alcance, LocalDateTime desde, LocalDateTime hastaExcl) {
        List<Object> args = new ArrayList<>(List.of(desde, hastaExcl));
        alcance.agregarParametro(args);
        String sql = "SELECT COALESCE(s.perfil, 'SIN_PERFIL') AS perfil, e.canal AS canal, COUNT(*) AS creados, "
            + "SUM(CASE WHEN e.abierto IS NOT NULL OR e.estado = 'PAGADO' THEN 1 ELSE 0 END) AS abiertos, "
            + "SUM(CASE WHEN e.estado = 'PAGADO' THEN 1 ELSE 0 END) AS pagados, "
            + "SUM(CASE WHEN e.estado = 'VENCIDO' THEN 1 ELSE 0 END) AS vencidos, "
            + "SUM(CASE WHEN e.estado = 'VENCIDO' THEN e.precio_total_creado ELSE 0 END) AS total_vencidos "
            + "FROM hot_click_enlace_compra_tb e "
            + "LEFT JOIN hot_click_chat_sesion_tb s ON s.id_sesion = e.fk_id_chat_sesion "
            + "WHERE e.creado >= ? AND e.creado < ? AND " + alcance.filtro("e.fk_id_empresa") + " "
            + "GROUP BY COALESCE(s.perfil, 'SIN_PERFIL'), e.canal";
        return jdbc.query(sql, (rs, i) -> new FilaEnlaces(rs.getString("perfil"), rs.getString("canal"),
            rs.getLong("creados"), rs.getLong("abiertos"), rs.getLong("pagados"), rs.getLong("vencidos"),
            rs.getLong("total_vencidos")), args.toArray());
    }

    /** Pedidos nacidos del bot (origen_canal) y ya cobrados, por canal. */
    public List<FilaVentas> ventas(Alcance alcance, LocalDateTime desde, LocalDateTime hastaExcl) {
        List<Object> args = new ArrayList<>(List.of(desde, hastaExcl));
        alcance.agregarParametro(args);
        String sql = "SELECT p.origen_canal AS canal, COUNT(*) AS n, COALESCE(SUM(p.total_pedido), 0) AS total "
            + "FROM hot_click_pedido_tb p "
            + "WHERE p.origen_canal IS NOT NULL AND p.estado_pedido IN " + ESTADOS_PAGADOS + " "
            + "AND p.fecha_pedido >= ? AND p.fecha_pedido < ? AND " + alcance.filtro("p.fk_id_empresa") + " "
            + "GROUP BY p.origen_canal";
        return jdbc.query(sql, (rs, i) -> new FilaVentas(rs.getString("canal"), rs.getLong("n"), rs.getLong("total")),
            args.toArray());
    }

    /** Costo de IA y conversaciones cobradas de los meses que tocan el rango (el uso se guarda por mes). */
    public Costo costo(Alcance alcance, LocalDate desde, LocalDate hasta) {
        List<Object> args = new ArrayList<>(List.of(desde.withDayOfMonth(1), hasta));
        alcance.agregarParametro(args);
        String sql = "SELECT COALESCE(SUM(u.costo_usd), 0) AS costo, COALESCE(SUM(u.conversaciones), 0) AS convs "
            + "FROM hot_click_agente_uso_mes_tb u "
            + "WHERE u.mes >= ? AND u.mes <= ? AND " + alcance.filtro("u.fk_id_empresa");
        return jdbc.queryForObject(sql, (rs, i) -> new Costo(rs.getBigDecimal("costo"), rs.getLong("convs")),
            args.toArray());
    }
}
