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

    /**
     * Interruptor de la Factura Electrónica de Compra (FEC, tipo 08). Apagada por defecto: solo corre con el
     * régimen TRADICIONAL y {@code habilitada}. {@code permitirNoInscrito} sigue sin confirmarse con Hacienda.
     */
    public record Fec(boolean habilitada, boolean permitirNoInscrito) {}

    public static final Fec FEC_APAGADA = new Fec(false, false);

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

    /** Lee el interruptor de la FEC; ante cualquier fallo de BD devuelve apagado (falla cerrado). */
    public Fec fec() {
        try {
            List<Fec> v = jdbc.query(
                "SELECT fec_habilitada, fec_permitir_no_inscrito FROM hot_click_config_fiscal_tb WHERE id = 1",
                (rs, i) -> new Fec(rs.getBoolean(1), rs.getBoolean(2)));
            return v.isEmpty() ? FEC_APAGADA : v.get(0);
        } catch (DataAccessException e) {
            log.warn("interruptor FEC no disponible ({}); queda apagado", e.getClass().getSimpleName());
            return FEC_APAGADA;
        }
    }

    /** La FEC solo corre con el régimen de HotClick TRADICIONAL y el interruptor encendido. */
    public boolean fecActiva() {
        return activa(reglas().regimen(), fec());
    }

    public static boolean activa(String regimen, Fec fec) {
        return "TRADICIONAL".equals(regimen) && fec != null && fec.habilitada();
    }

    /** Con régimen SIMPLIFICADO la FEC se guarda siempre apagada, sin importar lo pedido. */
    @Transactional
    public Fec actualizarFec(String regimen, Fec pedido) {
        Fec limpia = new Fec("TRADICIONAL".equals(regimen) && pedido.habilitada(), pedido.permitirNoInscrito());
        jdbc.update("UPDATE hot_click_config_fiscal_tb SET fec_habilitada = ?, fec_permitir_no_inscrito = ? WHERE id = 1",
            limpia.habilitada(), limpia.permitirNoInscrito());
        return limpia;
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
