package com.hotclick.service.envio;

import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * A-2: montos de envío de HotClick (normal GAM, normal fuera del GAM y rápido), fijados solo por ADMIN.
 * El servidor es la fuente de verdad: el checkout nunca toma el monto del cliente.
 */
@Service
public class ConfiguracionEnvioService {

    public static final int DEFAULT_GAM = 4000;
    public static final int DEFAULT_FUERA_GAM = 5500;
    public static final int DEFAULT_RAPIDO = 5000;
    /** Tope razonable para que un error de tipeo no cobre de más; coincide con los CHECK de V212. */
    public static final int MONTO_MAX = 50_000;

    public record Montos(int gam, int fueraGam, int rapido) {}

    public static final Montos DEFAULTS = new Montos(DEFAULT_GAM, DEFAULT_FUERA_GAM, DEFAULT_RAPIDO);

    private final JdbcTemplate jdbc;

    public ConfiguracionEnvioService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Montos montos() {
        try {
            List<Montos> v = jdbc.query(
                "SELECT monto_gam_crc, monto_fuera_gam_crc, monto_rapido_crc FROM hot_click_config_envio_tb WHERE id = 1",
                (rs, i) -> new Montos(rs.getInt(1), rs.getInt(2), rs.getInt(3)));
            return v.isEmpty() ? DEFAULTS : v.get(0);
        } catch (DataAccessException e) {
            return DEFAULTS;
        }
    }

    @Transactional
    public Montos actualizar(Montos m) {
        validar(m.gam());
        validar(m.fueraGam());
        validar(m.rapido());
        int filas = jdbc.update(
            "UPDATE hot_click_config_envio_tb SET monto_gam_crc = ?, monto_fuera_gam_crc = ?, monto_rapido_crc = ? WHERE id = 1",
            m.gam(), m.fueraGam(), m.rapido());
        if (filas == 0) {
            jdbc.update("INSERT INTO hot_click_config_envio_tb (id, monto_gam_crc, monto_fuera_gam_crc, monto_rapido_crc) "
                + "VALUES (1, ?, ?, ?)", m.gam(), m.fueraGam(), m.rapido());
        }
        return m;
    }

    private static void validar(int monto) {
        if (monto < 0 || monto > MONTO_MAX) throw new IllegalArgumentException("monto fuera de rango");
    }
}
