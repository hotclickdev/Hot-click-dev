package com.hotclick.service.fiscal;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Reglas fiscales de la plataforma (fila única id=1 de hot_click_config_fiscal_tb), editables solo por ADMIN.
 * Mismo patrón que {@code ConfiguracionEnvioService}.
 */
@Service
public class ConfiguracionFiscalService {

    public static final Set<String> REGIMENES = Set.of("SIMPLIFICADO", "TRADICIONAL");
    public static final BigDecimal EXTRA_MAX = new BigDecimal("50");
    public static final int DIAS_MIN = 1;
    public static final int DIAS_MAX = 60;
    public static final int MINIMO_PAGO_MAX = 10_000_000;
    public static final int COSTO_PAGO_MAX = 100_000;

    /** Los dos últimos montos (mínimo y costo de pago de ONVO) son informativos. */
    public record Reglas(String regimen, BigDecimal extraNoInscritoPct, int diasEnviarFactura,
                         int onvoPagoMinimoCrc, int onvoCostoPagoCrc) {}

    public static final String BASE_NETO = "NETO";
    public static final String BASE_BRUTO = "BRUTO";
    public static final int TOLERANCIA_MAX = 1000;

    /**
     * Reglas de la factura que el negocio le emite a HotClick (Fase 2). El mensaje receptor viene apagado: con el
     * interruptor apagado no se firma ni se envía nada a Hacienda. La tolerancia (colones) es una decisión interna.
     * La base la decide el contador del dueño: NETO = producto menos comisión; BRUTO = precio del producto.
     */
    public record ReglasFactura(boolean mensajeReceptorHabilitado, int toleranciaCrc, String base) {}

    public static final ReglasFactura FACTURA_DEFAULTS = new ReglasFactura(false, 1, BASE_NETO);
    /** Interruptores del cobro por ONVO. Ambos apagados por defecto hasta validarlos contra el sandbox de ONVO. */
    public record SwitchesOnvo(boolean cobroANombreNegocio, boolean enlacesPago) {}

    public static final SwitchesOnvo SWITCHES_APAGADOS = new SwitchesOnvo(false, false);

    public static final Reglas DEFAULTS = new Reglas("SIMPLIFICADO", new BigDecimal("14.00"), 7, 20_000, 0);

    private static final Logger log = LoggerFactory.getLogger(ConfiguracionFiscalService.class);

    private final JdbcTemplate jdbc;

    public ConfiguracionFiscalService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Reglas reglas() {
        try {
            List<Reglas> v = jdbc.query(
                "SELECT regimen_hotclick, extra_no_inscrito_pct, dias_enviar_factura, onvo_pago_minimo_crc, "
                    + "onvo_costo_pago_crc FROM hot_click_config_fiscal_tb WHERE id = 1",
                (rs, i) -> new Reglas(rs.getString(1), rs.getBigDecimal(2).setScale(2, RoundingMode.HALF_UP),
                    rs.getInt(3), rs.getInt(4), rs.getInt(5)));
            return v.isEmpty() ? DEFAULTS : v.get(0);
        } catch (DataAccessException e) {
            log.warn("config fiscal no disponible ({}); se usan los valores por defecto", e.getClass().getSimpleName());
            return DEFAULTS;
        }
    }

    /** Lee las reglas de la factura del negocio; si la tabla o las columnas no están, usa los valores seguros. */
    public ReglasFactura reglasFactura() {
        try {
            List<ReglasFactura> v = jdbc.query(
                "SELECT hacienda_mensaje_receptor_habilitado, tolerancia_factura_negocio_crc, base_factura_negocio "
                    + "FROM hot_click_config_fiscal_tb WHERE id = 1",
                (rs, i) -> new ReglasFactura(rs.getBoolean(1), rs.getInt(2), rs.getString(3)));
            return v.isEmpty() ? FACTURA_DEFAULTS : v.get(0);
        } catch (DataAccessException e) {
            log.warn("reglas de factura de negocio no disponibles ({}); se usan los valores por defecto",
                e.getClass().getSimpleName());
            return FACTURA_DEFAULTS;
        }
    }

    /** Guarda las reglas de la factura del negocio. La fila id=1 se crea si falta (con los demás valores por defecto). */
    @Transactional
    public ReglasFactura actualizarReglasFactura(ReglasFactura r) {
        ReglasFactura limpia = validarFactura(r);
        int filas = jdbc.update("UPDATE hot_click_config_fiscal_tb SET hacienda_mensaje_receptor_habilitado = ?, "
                + "tolerancia_factura_negocio_crc = ?, base_factura_negocio = ? WHERE id = 1",
            limpia.mensajeReceptorHabilitado(), limpia.toleranciaCrc(), limpia.base());
        if (filas == 0) {
            Reglas d = DEFAULTS;
            jdbc.update("INSERT INTO hot_click_config_fiscal_tb (id, regimen_hotclick, extra_no_inscrito_pct, "
                    + "dias_enviar_factura, onvo_pago_minimo_crc, onvo_costo_pago_crc, "
                    + "hacienda_mensaje_receptor_habilitado, tolerancia_factura_negocio_crc, base_factura_negocio) "
                    + "VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)",
                d.regimen(), d.extraNoInscritoPct(), d.diasEnviarFactura(), d.onvoPagoMinimoCrc(), d.onvoCostoPagoCrc(),
                limpia.mensajeReceptorHabilitado(), limpia.toleranciaCrc(), limpia.base());
        }
        return limpia;
    }

    static ReglasFactura validarFactura(ReglasFactura r) {
        if (r == null || r.base() == null
            || !(BASE_NETO.equals(r.base().trim().toUpperCase(Locale.ROOT)) || BASE_BRUTO.equals(r.base().trim().toUpperCase(Locale.ROOT)))) {
            throw new IllegalArgumentException("base inválida");
        }
        if (r.toleranciaCrc() < 0 || r.toleranciaCrc() > TOLERANCIA_MAX) {
            throw new IllegalArgumentException("tolerancia fuera de rango");
        }
        return new ReglasFactura(r.mensajeReceptorHabilitado(), r.toleranciaCrc(), r.base().trim().toUpperCase(Locale.ROOT));
    }

    /** Si no se puede leer (fila o columna ausente, error de base), ambos quedan apagados: fail-closed. */
    public SwitchesOnvo switchesOnvo() {
        try {
            List<SwitchesOnvo> v = jdbc.query(
                "SELECT onvo_cobro_a_nombre_negocio, onvo_enlaces_pago FROM hot_click_config_fiscal_tb WHERE id = 1",
                (rs, i) -> new SwitchesOnvo(rs.getBoolean(1), rs.getBoolean(2)));
            return v.isEmpty() ? SWITCHES_APAGADOS : v.get(0);
        } catch (DataAccessException e) {
            log.warn("interruptores de ONVO no disponibles ({}); quedan apagados", e.getClass().getSimpleName());
            return SWITCHES_APAGADOS;
        }
    }

    public boolean cobroANombreNegocioActivo() { return switchesOnvo().cobroANombreNegocio(); }

    public boolean enlacesPagoActivos() { return switchesOnvo().enlacesPago(); }

    @Transactional
    public SwitchesOnvo actualizarSwitchesOnvo(boolean cobroANombreNegocio, boolean enlacesPago) {
        int filas = jdbc.update(
            "UPDATE hot_click_config_fiscal_tb SET onvo_cobro_a_nombre_negocio = ?, onvo_enlaces_pago = ? WHERE id = 1",
            cobroANombreNegocio, enlacesPago);
        if (filas == 0) {
            jdbc.update("INSERT INTO hot_click_config_fiscal_tb (id, onvo_cobro_a_nombre_negocio, onvo_enlaces_pago) VALUES (1, ?, ?)",
                cobroANombreNegocio, enlacesPago);
        }
        return new SwitchesOnvo(cobroANombreNegocio, enlacesPago);
    }

    @Transactional
    public Reglas actualizar(Reglas r) {
        Reglas limpia = validar(r);
        int filas = jdbc.update(
            "UPDATE hot_click_config_fiscal_tb SET regimen_hotclick = ?, extra_no_inscrito_pct = ?, "
                + "dias_enviar_factura = ?, onvo_pago_minimo_crc = ?, onvo_costo_pago_crc = ? WHERE id = 1",
            limpia.regimen(), limpia.extraNoInscritoPct(), limpia.diasEnviarFactura(),
            limpia.onvoPagoMinimoCrc(), limpia.onvoCostoPagoCrc());
        if (filas == 0) {
            jdbc.update("INSERT INTO hot_click_config_fiscal_tb (id, regimen_hotclick, extra_no_inscrito_pct, "
                    + "dias_enviar_factura, onvo_pago_minimo_crc, onvo_costo_pago_crc) VALUES (1, ?, ?, ?, ?, ?)",
                limpia.regimen(), limpia.extraNoInscritoPct(), limpia.diasEnviarFactura(),
                limpia.onvoPagoMinimoCrc(), limpia.onvoCostoPagoCrc());
        }
        return limpia;
    }

    /** Valida rangos y normaliza (régimen en mayúsculas, extra a 2 decimales). Lanza IllegalArgumentException. */
    static Reglas validar(Reglas r) {
        if (r == null || r.regimen() == null || !REGIMENES.contains(r.regimen().trim().toUpperCase(Locale.ROOT))) {
            throw new IllegalArgumentException("régimen inválido");
        }
        BigDecimal extra = r.extraNoInscritoPct();
        if (extra == null || extra.signum() < 0 || extra.compareTo(EXTRA_MAX) > 0
            || extra.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException("extra fuera de rango");
        }
        if (r.diasEnviarFactura() < DIAS_MIN || r.diasEnviarFactura() > DIAS_MAX) {
            throw new IllegalArgumentException("días fuera de rango");
        }
        if (r.onvoPagoMinimoCrc() < 0 || r.onvoPagoMinimoCrc() > MINIMO_PAGO_MAX) {
            throw new IllegalArgumentException("mínimo fuera de rango");
        }
        if (r.onvoCostoPagoCrc() < 0 || r.onvoCostoPagoCrc() > COSTO_PAGO_MAX) {
            throw new IllegalArgumentException("costo fuera de rango");
        }
        return new Reglas(r.regimen().trim().toUpperCase(Locale.ROOT), extra.setScale(2, RoundingMode.HALF_UP),
            r.diasEnviarFactura(), r.onvoPagoMinimoCrc(), r.onvoCostoPagoCrc());
    }
}
