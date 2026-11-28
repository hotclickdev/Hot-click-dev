package com.hotclick.service.contador;

import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Avisos dentro de la app para el ADMIN: 3 dias antes de cada vencimiento del calendario. No existia una bandeja de
 * notificaciones para el ADMIN, asi que se guardan en hot_click_contador_aviso_tb (clave unica: nunca se repiten) y la
 * consola los muestra como insignia y lista.
 */
@Service
public class ContadorAvisosService {

    public static final int DIAS_ANTES = 3;
    public static final int MAX_LISTA = 50;

    private static final Logger log = LoggerFactory.getLogger(ContadorAvisosService.class);

    private final JdbcTemplate jdbc;
    private final ConfiguracionFiscalService config;
    private final ContadorParametrosService parametros;

    public ContadorAvisosService(JdbcTemplate jdbc, ConfiguracionFiscalService config, ContadorParametrosService parametros) {
        this.jdbc = jdbc;
        this.config = config;
        this.parametros = parametros;
    }

    /** Crea los avisos que faltan (idempotente). Devuelve cuantos creo. */
    public int generar(LocalDate hoy) {
        var reglas = config.reglas();
        List<Object[]> filas = new ArrayList<>();
        for (ContadorCalendario.Evento e : ContadorCalendario.eventos(reglas.regimen(), hoy, reglas.diasEnviarFactura(), parametros.todos())) {
            if (e.diasRestantes() > DIAS_ANTES) continue;
            String mensaje = "Vence el " + e.fecha() + (e.verificar() ? ". Verificar con contador." : ".");
            filas.add(new Object[] {e.clave(), e.tipo(), recortar(e.titulo(), 160), recortar(mensaje, 400), e.fecha()});
        }
        if (filas.isEmpty()) return 0;
        // Un solo lote: la clave unica evita duplicar avisos si el job corre dos veces.
        int creados = 0;
        for (int n : jdbc.batchUpdate("INSERT INTO hot_click_contador_aviso_tb (clave, tipo, titulo, mensaje, vence_el) "
            + "VALUES (?, ?, ?, ?, ?) ON CONFLICT (clave) DO NOTHING", filas)) {
            if (n > 0) creados += n;
        }
        if (creados > 0) log.info("[contador] {} aviso(s) de vencimiento creados", creados);
        return creados;
    }

    public List<Map<String, Object>> listar() {
        return jdbc.query("SELECT id, tipo, titulo, mensaje, vence_el, leido FROM hot_click_contador_aviso_tb "
                + "ORDER BY vence_el DESC, id DESC LIMIT " + MAX_LISTA,
            (rs, i) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", rs.getLong(1));
                m.put("tipo", rs.getString(2));
                m.put("titulo", rs.getString(3));
                m.put("mensaje", rs.getString(4));
                m.put("venceEl", rs.getDate(5).toString());
                m.put("leido", rs.getBoolean(6));
                return m;
            });
    }

    public long sinLeer() {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_contador_aviso_tb WHERE leido = FALSE AND vence_el >= ?",
            Long.class, LocalDate.now(Constants.ZONA_CR).minusDays(1));
        return n == null ? 0 : n;
    }

    public void marcarLeido(long id) {
        jdbc.update("UPDATE hot_click_contador_aviso_tb SET leido = TRUE WHERE id = ?", id);
    }

    private static String recortar(String s, int max) { return s.length() <= max ? s : s.substring(0, max); }
}
