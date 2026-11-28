package com.hotclick.service.contador;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Parametros fiscales editables del Contador (hot_click_contador_param_tb, V263). Ningun valor dudoso va fijo en el
 * codigo: lo que el experto no confirmo (factores del RTS, formularios, tramos) se edita aca y se muestra con la
 * etiqueta "Verificar con contador". Un parametro vacio significa "sin configurar" y nada se calcula con el.
 */
@Service
public class ContadorParametrosService {

    public static final String RTS_ACTIVIDAD = "RTS_ACTIVIDAD";
    public static final String RTS_FACTOR_IVA_4719 = "RTS_FACTOR_IVA_4719_9";
    public static final String RTS_FACTOR_RENTA_4719 = "RTS_FACTOR_RENTA_4719_9";
    public static final String RTS_FACTOR_IVA_4741 = "RTS_FACTOR_IVA_4741_0";
    public static final String RTS_FACTOR_RENTA_4741 = "RTS_FACTOR_RENTA_4741_0";
    public static final String RTS_FORMULARIO = "RTS_FORMULARIO";
    public static final String RTS_DIA_LIMITE = "RTS_DIA_LIMITE";
    public static final String PERIODO_RENTA = "PERIODO_FISCAL_RENTA";
    public static final String TIPO_PERSONA = "TIPO_PERSONA";
    public static final String PAGOS_PARCIALES = "PAGOS_PARCIALES";
    public static final String PAGOS_PARCIALES_PCT = "PAGOS_PARCIALES_PCT";
    public static final String FORMULARIO_INFORMATIVA = "FORMULARIO_INFORMATIVA";
    public static final String DIA_INFORMATIVA = "DIA_INFORMATIVA";
    public static final String DIA_RETENCIONES = "DIA_RETENCIONES";
    public static final String RENTA_UMBRAL = "RENTA_UMBRAL";
    public static final String RENTA_TASA_SOBRE_UMBRAL = "RENTA_TASA_SOBRE_UMBRAL";
    public static final String RENTA_TRAMOS_JURIDICA = "RENTA_TRAMOS_JURIDICA";
    public static final String RENTA_TRAMOS_FISICA = "RENTA_TRAMOS_FISICA";

    private enum Tipo { FACTOR_OPC, TEXTO_OPC, ENTERO, ENUM, TRAMOS, FECHAS }

    private record Def(String clave, String defecto, Tipo tipo, long min, long max, List<String> opciones) {}

    private static final Pattern TEXTO = Pattern.compile("[\\p{L}\\p{N} ./,()\\-]{0,60}");
    private static final Pattern FACTOR = Pattern.compile("0(\\.\\d{1,6})?|1(\\.0{1,6})?");
    private static final Pattern TRAMO = Pattern.compile("(\\d{1,10})?:(\\d{1,2}(\\.\\d{1,2})?)");
    private static final Pattern FECHA = Pattern.compile("(0[1-9]|[12]\\d|3[01])-(0[1-9]|1[0-2])");

    private static final Map<String, Def> DEFS = new LinkedHashMap<>();

    static {
        d(RTS_ACTIVIDAD, "4719.9", Tipo.ENUM, 0, 0, List.of("4719.9", "4741.0"));
        d(RTS_FACTOR_IVA_4719, "", Tipo.FACTOR_OPC, 0, 0, null);
        d(RTS_FACTOR_RENTA_4719, "", Tipo.FACTOR_OPC, 0, 0, null);
        d(RTS_FACTOR_IVA_4741, "", Tipo.FACTOR_OPC, 0, 0, null);
        d(RTS_FACTOR_RENTA_4741, "", Tipo.FACTOR_OPC, 0, 0, null);
        d(RTS_FORMULARIO, "", Tipo.TEXTO_OPC, 0, 0, null);
        d(RTS_DIA_LIMITE, "15", Tipo.ENTERO, 1, 28, null);
        d(PERIODO_RENTA, "OCT_SEP", Tipo.ENUM, 0, 0, List.of("OCT_SEP", "ENE_DIC"));
        d(TIPO_PERSONA, "JURIDICA", Tipo.ENUM, 0, 0, List.of("JURIDICA", "FISICA"));
        d(PAGOS_PARCIALES, "31-03,30-06,30-09", Tipo.FECHAS, 0, 0, null);
        d(PAGOS_PARCIALES_PCT, "25", Tipo.ENTERO, 1, 100, null);
        d(FORMULARIO_INFORMATIVA, "", Tipo.TEXTO_OPC, 0, 0, null);
        d(DIA_INFORMATIVA, "25", Tipo.ENTERO, 1, 28, null);
        d(DIA_RETENCIONES, "15", Tipo.ENTERO, 1, 28, null);
        d(RENTA_UMBRAL, "119174000", Tipo.ENTERO, 1, 2_000_000_000L, null);
        d(RENTA_TASA_SOBRE_UMBRAL, "30", Tipo.ENTERO, 1, 100, null);
        d(RENTA_TRAMOS_JURIDICA, "5621000:5;8433000:10;11243000:15;:20", Tipo.TRAMOS, 0, 0, null);
        d(RENTA_TRAMOS_FISICA, "6244000:0;8329000:10;10414000:15;20872000:20;:25", Tipo.TRAMOS, 0, 0, null);
    }

    private static void d(String c, String def, Tipo t, long min, long max, List<String> ops) {
        DEFS.put(c, new Def(c, def, t, min, max, ops));
    }

    private static final Logger log = LoggerFactory.getLogger(ContadorParametrosService.class);

    private final JdbcTemplate jdbc;

    public ContadorParametrosService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Todos los parametros (el guardado o el valor por defecto), en orden estable. */
    public Map<String, String> todos() {
        Map<String, String> out = new LinkedHashMap<>();
        DEFS.forEach((k, v) -> out.put(k, v.defecto()));
        try {
            jdbc.query("SELECT clave, valor FROM hot_click_contador_param_tb", rs -> {
                if (DEFS.containsKey(rs.getString(1))) out.put(rs.getString(1), rs.getString(2));
            });
        } catch (DataAccessException e) {
            log.warn("parametros del contador no disponibles ({}); se usan los valores por defecto", e.getClass().getSimpleName());
        }
        return out;
    }

    @Transactional
    public Map<String, String> actualizar(Map<String, String> cambios) {
        if (cambios == null || cambios.isEmpty() || cambios.size() > DEFS.size()) throw new IllegalArgumentException("sin cambios");
        Map<String, String> limpios = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : cambios.entrySet()) {
            Def def = DEFS.get(e.getKey());
            if (def == null) throw new IllegalArgumentException("parametro desconocido");
            limpios.put(def.clave(), validar(def, e.getValue()));
        }
        // Una sola ida a la base para todos los cambios (lote), no una consulta por parametro.
        List<Object[]> filas = new ArrayList<>();
        limpios.forEach((k, v) -> filas.add(new Object[] {k, v}));
        jdbc.batchUpdate("INSERT INTO hot_click_contador_param_tb (clave, valor, actualizado_en) VALUES (?, ?, NOW()) "
            + "ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = NOW()", filas);
        return todos();
    }

    private static String validar(Def d, String crudo) {
        String v = crudo == null ? "" : crudo.trim();
        switch (d.tipo()) {
            case FACTOR_OPC -> {
                if (!v.isEmpty() && !FACTOR.matcher(v).matches()) throw new IllegalArgumentException("factor invalido");
            }
            case TEXTO_OPC -> {
                if (!TEXTO.matcher(v).matches()) throw new IllegalArgumentException("texto invalido");
            }
            case ENTERO -> {
                long n;
                try {
                    n = Long.parseLong(v);
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("numero invalido");
                }
                if (n < d.min() || n > d.max()) throw new IllegalArgumentException("fuera de rango");
            }
            case ENUM -> {
                if (!d.opciones().contains(v)) throw new IllegalArgumentException("opcion invalida");
            }
            case TRAMOS -> {
                if (parseTramos(v) == null) throw new IllegalArgumentException("tramos invalidos");
            }
            case FECHAS -> {
                if (v.isEmpty()) return v;
                String[] partes = v.split(",");
                if (partes.length > 6) throw new IllegalArgumentException("demasiadas fechas");
                List<String> limpias = new ArrayList<>();
                for (String p : partes) {
                    if (!FECHA.matcher(p.trim()).matches()) throw new IllegalArgumentException("fecha invalida");
                    limpias.add(p.trim());
                }
                return String.join(",", limpias);
            }
        }
        return v;
    }

    public static String defecto(String clave) { return DEFS.get(clave).defecto(); }

    public record Tramo(Long hasta, BigDecimal tasaPct) {}

    /** Texto "5621000:5;8433000:10;:20" a tramos; el ultimo va sin tope. Null si el formato no es valido. */
    public static List<Tramo> parseTramos(String texto) {
        if (texto == null || texto.isBlank()) return null;
        String[] partes = texto.trim().split(";");
        if (partes.length > 8) return null;
        List<Tramo> out = new ArrayList<>();
        long anterior = -1;
        for (int i = 0; i < partes.length; i++) {
            var m = TRAMO.matcher(partes[i].trim());
            if (!m.matches()) return null;
            boolean ultimo = i == partes.length - 1;
            if (m.group(1) == null) {
                if (!ultimo) return null;
                out.add(new Tramo(null, new BigDecimal(m.group(2))));
            } else {
                long hasta = Long.parseLong(m.group(1));
                if (ultimo || hasta <= anterior) return null;
                anterior = hasta;
                out.add(new Tramo(hasta, new BigDecimal(m.group(2))));
            }
        }
        return List.copyOf(out);
    }

    /** Factores (IVA y renta) de la actividad elegida, o null si falta alguno. */
    public static BigDecimal[] factoresRts(Map<String, String> p) {
        boolean a4719 = !"4741.0".equals(p.get(RTS_ACTIVIDAD));
        String iva = p.get(a4719 ? RTS_FACTOR_IVA_4719 : RTS_FACTOR_IVA_4741);
        String renta = p.get(a4719 ? RTS_FACTOR_RENTA_4719 : RTS_FACTOR_RENTA_4741);
        if (iva == null || iva.isBlank() || renta == null || renta.isBlank()) return null;
        return new BigDecimal[] {new BigDecimal(iva), new BigDecimal(renta)};
    }
}
