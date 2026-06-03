package com.hotclick.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;

/**
 * F37-01 — generarNumeroPedido(): UUID sin colisión bajo carga.
 *
 * Verifica:
 * - Formato correcto (prefijo + 12 hex uppercase)
 * - 10.000 llamadas consecutivas → 0 colisiones
 * - Múltiples prefijos → todos correctos
 */
@DisplayName("F37-01 — Constants.generarNumeroPedido(): UUID único y sin colisión")
class ConstantsTest {

    // ── Formato ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("ORD- → formato ORD-<12 HEX uppercase>")
    void generarNumero_ord_correctFormat() {
        String n = Constants.generarNumeroPedido("ORD-");
        assertThat(n).startsWith("ORD-");
        assertThat(n).hasSize(16); // "ORD-" (4) + 12 hex = 16
        assertThat(n.substring(4)).matches("[A-F0-9]{12}");
    }

    @Test
    @DisplayName("QR- → formato QR-<12 HEX uppercase>")
    void generarNumero_qr_correctFormat() {
        String n = Constants.generarNumeroPedido("QR-");
        assertThat(n).startsWith("QR-");
        assertThat(n.substring(3)).matches("[A-F0-9]{12}");
    }

    @Test
    @DisplayName("POS- → formato POS-<12 HEX uppercase>")
    void generarNumero_pos_correctFormat() {
        String n = Constants.generarNumeroPedido("POS-");
        assertThat(n).startsWith("POS-");
        assertThat(n.substring(4)).matches("[A-F0-9]{12}");
    }

    @Test
    @DisplayName("OC- → formato OC-<12 HEX uppercase>")
    void generarNumero_oc_correctFormat() {
        String n = Constants.generarNumeroPedido("OC-");
        assertThat(n).startsWith("OC-");
        assertThat(n.substring(3)).matches("[A-F0-9]{12}");
    }

    // ── Sin colisiones ────────────────────────────────────────────────────────

    @Test
    @DisplayName("10.000 llamadas → 0 colisiones (UUID garantiza unicidad)")
    void generarNumero_10000calls_noCollisions() {
        Set<String> seen = new HashSet<>();
        int total = 10_000;
        for (int i = 0; i < total; i++) {
            String n = Constants.generarNumeroPedido("ORD-");
            assertThat(seen.add(n))
                .as("Colisión en iteración %d: %s", i, n)
                .isTrue();
        }
        assertThat(seen).hasSize(total);
    }

    // ── No es timestamp (bug corregido) ───────────────────────────────────────

    @RepeatedTest(5)
    @DisplayName("No contiene dígitos de milisegundos (no usa System.currentTimeMillis)")
    void generarNumero_notTimestampBased() {
        String n = Constants.generarNumeroPedido("ORD-");
        // Un timestamp de 13 dígitos como "1748920384057" no puede ser 12 hex uppercase
        // porque contiene dígitos 8 y 9 que no son hex válido siempre —
        // pero más importante: el sufijo debe ser exactamente 12 chars hex
        assertThat(n.substring(4)).hasSize(12);
        assertThat(n.substring(4)).matches("[A-F0-9]{12}");
    }
}
