package com.hotclick.service.hacienda;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.io.InputStream;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Los XSD 4.4 empaquetados deben ser copia byte a byte de los publicados por Hacienda en
 * https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/ (ver README.md al lado).
 */
@DisplayName("XSD 4.4 empaquetados = copia oficial de ATV (sha256)")
class XsdOficialHaciendaTest {

    @ParameterizedTest(name = "{0}")
    @CsvSource({
        "FacturaElectronica_V4.4.xsd, d384afef665573606f6499b2182d6070850ada8c93bc40fa7f0f3901a25b9cc8",
        "TiqueteElectronico_V4.4.xsd, cda1c7dd97f9a235111c29948f05d7893864663cd73792fd3b51e3dae582cfdb",
    })
    void igualAlOficial(String archivo, String sha256) throws Exception {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("hacienda/v4.4/" + archivo)) {
            assertThat(in).as(archivo).isNotNull();
            String real = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(in.readAllBytes()));
            assertThat(real).isEqualTo(sha256);
        }
    }
}
