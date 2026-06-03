package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Generación segura del número consecutivo fiscal para Hacienda CR.
 *
 * DISEÑO CRÍTICO:
 * - Usa UPDATE atómico en tabla dedicada (no advisory locks — incompatibles con PgBouncer).
 * - La transacción que actualiza el consecutivo es CORTA e INDEPENDIENTE.
 * - NO hay I/O externo (llamadas HTTP a Hacienda) dentro de esta transacción.
 * - Propagation.REQUIRES_NEW: garantiza que el número se confirma en BD antes de
 *   intentar enviar a Hacienda. Si el envío falla, el número queda como ANULADO
 *   en el comprobante (gap documentado, no número duplicado).
 *
 * PgBouncer transaction mode: cada transacción obtiene una conexión fresca del pool.
 * El UPDATE atómico garantiza exclusión mutua sin necesidad de advisory locks.
 */
@Service
public class ConsecutivoFiscalService {

    private static final Logger log = LoggerFactory.getLogger(ConsecutivoFiscalService.class);

    private final JdbcTemplate jdbc;

    public ConsecutivoFiscalService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Obtiene y reserva el siguiente número consecutivo para la empresa y tipo dados.
     *
     * Operación atómica: UPDATE con RETURNING garantiza que dos threads concurrentes
     * nunca obtienen el mismo número.
     *
     * Propagation.REQUIRES_NEW: abre su propia transacción, hace commit inmediatamente
     * al retornar. El consecutivo queda reservado aunque la transacción padre falle.
     *
     * @param empresaId ID de la empresa
     * @param tipo      '01'=Factura, '04'=Tiquete, '02'=NDebito, '03'=NCredito
     * @return número siguiente (≥ 1)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long siguienteNumero(Long empresaId, String tipo) {
        // Asegura que existe la fila (upsert inicial)
        jdbc.update("""
            INSERT INTO hot_click_consecutivo_fiscal_tb (fk_id_empresa, tipo, ultimo_numero)
            VALUES (?, ?, 0)
            ON CONFLICT (fk_id_empresa, tipo) DO NOTHING
            """, empresaId, tipo);

        // UPDATE atómico + RETURNING — operación completa en un solo roundtrip
        Long siguiente = jdbc.queryForObject("""
            UPDATE hot_click_consecutivo_fiscal_tb
            SET ultimo_numero = ultimo_numero + 1
            WHERE fk_id_empresa = ? AND tipo = ?
            RETURNING ultimo_numero
            """, Long.class, empresaId, tipo);

        if (siguiente == null) {
            throw new IllegalStateException(
                "No se pudo generar consecutivo para empresa=" + empresaId + " tipo=" + tipo
            );
        }

        log.debug("[consecutivo-fiscal] empresa={} tipo={} num={}", empresaId, tipo, siguiente);
        return siguiente;
    }
}
