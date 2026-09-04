package com.hotclick.service;

import com.hotclick.model.MetodoCobro;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("MetodoCobroFormato")
class MetodoCobroFormatoTest {

    @Test
    void mascara_sinpe_e_iban() {
        assertThat(MetodoCobroFormato.mascara("SINPE", "88880000")).isEqualTo("••••-0000");
        assertThat(MetodoCobroFormato.mascara("IBAN", "CR21000012344521")).contains("****");
        assertThat(MetodoCobroFormato.mascara("IBAN", "CR21000012344521")).isEqualTo("CR21 **** 4521");
    }

    @Test
    void tarjeta_solo_ultimos_4() {
        assertThat(MetodoCobroFormato.limpiarDestino("TARJETA", "4111111111114412")).isEqualTo("4412");
        assertThat(MetodoCobroFormato.mascara("TARJETA", "4412")).isEqualTo("•••• 4412");
    }

    @Test
    void tipo_invalido() {
        assertThatThrownBy(() -> MetodoCobroFormato.normalizarTipo("paypal"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void normalizar_tipo_null_rechaza() {
        assertThatThrownBy(() -> MetodoCobroFormato.normalizarTipo(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("requerido");
    }

    @ParameterizedTest
    @CsvSource({
            "sinpe, SINPE",
            "SINPE, SINPE",
            " Iban , IBAN",
            "tarjeta, TARJETA"
    })
    void normalizar_tipo_acepta_variantes(String raw, String esperado) {
        assertThat(MetodoCobroFormato.normalizarTipo(raw)).isEqualTo(esperado);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void limpiar_destino_vacio_rechaza(String raw) {
        assertThatThrownBy(() -> MetodoCobroFormato.limpiarDestino(MetodoCobro.TIPO_SINPE, raw))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("dato");
    }

    @Test
    void limpiar_sinpe_quita_no_digitos() {
        assertThat(MetodoCobroFormato.limpiarDestino(MetodoCobro.TIPO_SINPE, "8888-0000"))
                .isEqualTo("88880000");
    }

    @Test
    void limpiar_sinpe_largo_incorrecto() {
        assertThatThrownBy(() -> MetodoCobroFormato.limpiarDestino(MetodoCobro.TIPO_SINPE, "123456789"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("8 dígitos");
    }

    @Test
    void limpiar_iban_corto_y_largo() {
        assertThatThrownBy(() -> MetodoCobroFormato.limpiarDestino(MetodoCobro.TIPO_IBAN, "CR21000"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("mínimo 10");
        String demasiadoLargo = "CR" + "1".repeat(35);
        assertThatThrownBy(() -> MetodoCobroFormato.limpiarDestino(MetodoCobro.TIPO_IBAN, demasiadoLargo))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("largo");
    }

    @Test
    void limpiar_iban_normaliza_espacios_y_mayusculas() {
        assertThat(MetodoCobroFormato.limpiarDestino(MetodoCobro.TIPO_IBAN, "cr21 0000 1234"))
                .isEqualTo("CR2100001234");
    }

    @Test
    void limpiar_tarjeta_menos_de_4_rechaza() {
        assertThatThrownBy(() -> MetodoCobroFormato.limpiarDestino(MetodoCobro.TIPO_TARJETA, "12"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("últimos 4");
    }

    @Test
    void mascara_destino_corto_sin_enmascarar() {
        assertThat(MetodoCobroFormato.mascara(MetodoCobro.TIPO_SINPE, "888")).isEqualTo("888");
        assertThat(MetodoCobroFormato.mascara(MetodoCobro.TIPO_IBAN, "CR21")).isEqualTo("CR21");
    }

    @Test
    void alta_rechaza_tarjeta() {
        assertThatThrownBy(() -> MetodoCobroFormato.assertTipoAlta(MetodoCobro.TIPO_TARJETA))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("SINPE o IBAN");
        MetodoCobroFormato.assertTipoAlta(MetodoCobro.TIPO_SINPE);
        MetodoCobroFormato.assertTipoAlta(MetodoCobro.TIPO_IBAN);
    }

    @Test
    void nombre_nota_y_tipo_api() {
        assertThat(MetodoCobroFormato.nombre(MetodoCobro.TIPO_SINPE)).isEqualTo("SINPE Móvil");
        assertThat(MetodoCobroFormato.nombre(MetodoCobro.TIPO_IBAN)).isEqualTo("Cuenta IBAN");
        assertThat(MetodoCobroFormato.nombre(MetodoCobro.TIPO_TARJETA)).isEqualTo("Tarjeta");
        assertThat(MetodoCobroFormato.nota(MetodoCobro.TIPO_SINPE)).contains("instante");
        assertThat(MetodoCobroFormato.nota(MetodoCobro.TIPO_IBAN)).contains("banco");
        assertThat(MetodoCobroFormato.tipoApi("SINPE")).isEqualTo("sinpe");
        assertThat(MetodoCobroFormato.tipoApi(null)).isEmpty();
    }

    @Test
    void nombre_nota_y_mascara_sin_tipo_no_npe() {
        assertThat(MetodoCobroFormato.nombre(null)).isEmpty();
        assertThat(MetodoCobroFormato.nota(null)).isEmpty();
        assertThat(MetodoCobroFormato.mascara(null, "88880000")).isEqualTo("88880000");
        assertThat(MetodoCobroFormato.mascara(MetodoCobro.TIPO_SINPE, null)).isEmpty();
    }
}
