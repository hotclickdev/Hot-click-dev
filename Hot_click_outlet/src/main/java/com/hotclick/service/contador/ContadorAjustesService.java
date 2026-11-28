package com.hotclick.service.contador;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Ajustes del Contador IA en la fila única id=1 de hot_click_config_fiscal_tb (V263): salario base, tope mensual de
 * IA, preguntas por día . Mismo patrón que {@code ConfiguracionFiscalService}.
 */
@Service
public class ContadorAjustesService {

    public record Ajustes(int salarioBaseCrc, BigDecimal topeIaMesUsd, int limitePreguntasDia) {}

    public static final Ajustes DEFAULTS = new Ajustes(462_200, new BigDecimal("20.00"), 30);

    private static final Logger log = LoggerFactory.getLogger(ContadorAjustesService.class);

    private final JdbcTemplate jdbc;

    public ContadorAjustesService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Ajustes ajustes() {
        try {
            List<Ajustes> v = jdbc.query(
                "SELECT salario_base_crc, tope_ia_mes_usd, limite_preguntas_dia "
                    + "FROM hot_click_config_fiscal_tb WHERE id = 1",
                (rs, i) -> new Ajustes(rs.getInt(1), rs.getBigDecimal(2).setScale(2, RoundingMode.HALF_UP), rs.getInt(3)));
            return v.isEmpty() ? DEFAULTS : v.get(0);
        } catch (DataAccessException e) {
            log.warn("ajustes del contador no disponibles ({}); se usan los valores por defecto", e.getClass().getSimpleName());
            return DEFAULTS;
        }
    }

    @Transactional
    public Ajustes actualizar(Ajustes a) {
        Ajustes limpia = validar(a);
        // La fila única puede no existir todavía: se crea con los valores por defecto de la tabla y se actualiza.
        jdbc.update("INSERT INTO hot_click_config_fiscal_tb (id) VALUES (1) ON CONFLICT (id) DO NOTHING");
        jdbc.update("UPDATE hot_click_config_fiscal_tb SET salario_base_crc = ?, tope_ia_mes_usd = ?, "
                + "limite_preguntas_dia = ? WHERE id = 1",
            limpia.salarioBaseCrc(), limpia.topeIaMesUsd(), limpia.limitePreguntasDia());
        return limpia;
    }

    static Ajustes validar(Ajustes a) {
        if (a == null) throw new IllegalArgumentException("ajustes requeridos");
        if (a.salarioBaseCrc() < 100_000 || a.salarioBaseCrc() > 5_000_000) throw new IllegalArgumentException("salario base fuera de rango");
        if (a.topeIaMesUsd() == null || a.topeIaMesUsd().signum() < 0 || a.topeIaMesUsd().compareTo(new BigDecimal("10000")) > 0
            || a.topeIaMesUsd().stripTrailingZeros().scale() > 2) throw new IllegalArgumentException("tope de IA fuera de rango");
        if (a.limitePreguntasDia() < 1 || a.limitePreguntasDia() > 500) throw new IllegalArgumentException("límite diario fuera de rango");
        return new Ajustes(a.salarioBaseCrc(), a.topeIaMesUsd().setScale(2, RoundingMode.HALF_UP), a.limitePreguntasDia());
    }
}
