package com.hotclick.agente.cupo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Acceso a {@code hot_click_agente_uso_mes_tb} y {@code hot_click_agente_conv_mes_tb}. Cada operación es UNA
 * sentencia atómica (UPDATE condicional con conteo de filas, sin leer-y-luego-escribir) que se filtra siempre por
 * {@code empresa_clave} (0 = HotClick). Equivale al patrón UPDATE ... RETURNING de los consecutivos, pero portable a
 * la H2 de las pruebas. Nada de contactos en claro: solo el hash.
 */
@Repository
public class AgenteUsoRepositorio {

    public enum Conteo { NUEVA, YA_CONTADA, SIN_CUPO }

    /** Uso de un mes. */
    public record Uso(int conversaciones, BigDecimal costoUsd) {
        public static final Uso VACIO = new Uso(0, BigDecimal.ZERO);
    }

    private static final String ASEGURAR =
        "INSERT INTO hot_click_agente_uso_mes_tb (fk_id_empresa, empresa_clave, mes) VALUES (?, ?, ?) "
            + "ON CONFLICT DO NOTHING";
    private static final String MARCAR_CONVERSACION =
        "INSERT INTO hot_click_agente_conv_mes_tb (empresa_clave, mes, contacto_hash, fk_id_empresa) VALUES (?, ?, ?, ?) "
            + "ON CONFLICT DO NOTHING";
    private static final String TOMAR_CUPO =
        "UPDATE hot_click_agente_uso_mes_tb SET conversaciones = conversaciones + 1 "
            + "WHERE empresa_clave = ? AND mes = ? AND conversaciones < ?";
    private static final String DEVOLVER_MARCA =
        "DELETE FROM hot_click_agente_conv_mes_tb WHERE empresa_clave = ? AND mes = ? AND contacto_hash = ?";
    private static final String SUMAR_COSTO =
        "UPDATE hot_click_agente_uso_mes_tb SET costo_usd = costo_usd + ? WHERE empresa_clave = ? AND mes = ?";
    private static final String LEER =
        "SELECT conversaciones, costo_usd FROM hot_click_agente_uso_mes_tb WHERE empresa_clave = ? AND mes = ?";
    private static final String RECLAMAR_80 =
        "UPDATE hot_click_agente_uso_mes_tb SET aviso_80_en = ? "
            + "WHERE empresa_clave = ? AND mes = ? AND aviso_80_en IS NULL AND costo_usd >= ?";
    private static final String RECLAMAR_100 =
        "UPDATE hot_click_agente_uso_mes_tb SET aviso_100_en = ? "
            + "WHERE empresa_clave = ? AND mes = ? AND aviso_100_en IS NULL AND costo_usd >= ?";

    private final JdbcTemplate jdbc;

    public AgenteUsoRepositorio(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    static long clave(Long empresaId) {
        return empresaId == null ? 0L : empresaId;
    }

    private void asegurarFila(Long empresaId, LocalDate mes) {
        jdbc.update(ASEGURAR, empresaId, clave(empresaId), mes);
    }

    /**
     * El primer mensaje de un contacto en el mes consume 1 del cupo; los siguientes no. Si el cupo ya se agotó,
     * devuelve SIN_CUPO y deja todo como estaba (el contacto no queda marcado como contado).
     */
    @Transactional
    public Conteo contarConversacion(Long empresaId, LocalDate mes, String contactoHash, int cupo) {
        asegurarFila(empresaId, mes);
        long clave = clave(empresaId);
        int nueva = jdbc.update(MARCAR_CONVERSACION, clave, mes, contactoHash, empresaId);
        if (nueva == 0) return Conteo.YA_CONTADA;
        int tomada = jdbc.update(TOMAR_CUPO, clave, mes, cupo);
        if (tomada == 0) {
            jdbc.update(DEVOLVER_MARCA, clave, mes, contactoHash);
            return Conteo.SIN_CUPO;
        }
        return Conteo.NUEVA;
    }

    /** Suma el costo de una llamada y devuelve el acumulado del mes. */
    @Transactional
    public BigDecimal sumarCosto(Long empresaId, LocalDate mes, BigDecimal usd) {
        asegurarFila(empresaId, mes);
        jdbc.update(SUMAR_COSTO, usd, clave(empresaId), mes);
        return leer(empresaId, mes).costoUsd();
    }

    @Transactional(readOnly = true)
    public Uso leer(Long empresaId, LocalDate mes) {
        List<Uso> filas = jdbc.query(LEER,
            (rs, n) -> new Uso(rs.getInt(1), rs.getBigDecimal(2)), clave(empresaId), mes);
        return filas.isEmpty() ? Uso.VACIO : filas.get(0);
    }

    /**
     * Reclama el aviso (80 % o 100 %) del mes: solo UNA llamada gana aunque haya varias concurrentes, así el dueño
     * recibe un solo aviso por mes y por nivel.
     */
    @Transactional
    public boolean reclamarAviso(Long empresaId, LocalDate mes, boolean cien, BigDecimal costoMinimo, Instant ahora) {
        return jdbc.update(cien ? RECLAMAR_100 : RECLAMAR_80, Timestamp.from(ahora), clave(empresaId), mes, costoMinimo) > 0;
    }
}
