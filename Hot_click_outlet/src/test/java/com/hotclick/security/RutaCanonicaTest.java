package com.hotclick.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/** Ruta canónica del límite por IP: todas las formas de escribir la misma ruta dan la misma clave. */
class RutaCanonicaTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "/api/gift-cards/validar                       | /api/gift-cards/validar",
        "/api/gift-cards/%76alidar                     | /api/gift-cards/validar",
        "/api/gift-cards/%56alidar                     | /api/gift-cards/Validar",
        "/api/gift-cards/valida%72                     | /api/gift-cards/validar",
        "/api/gift-cards/%76%61%6c%69%64%61%72         | /api/gift-cards/validar",
        "/%61pi/gift-cards/validar                     | /api/gift-cards/validar",
        "/api/auth/%6Cogin                             | /api/auth/login",
        "/api/auth/%6cogin                             | /api/auth/login",
        "/api/gift-cards/%2576alidar                   | /api/gift-cards/validar",
        "/api/gift-cards/%252576alidar                 | /api/gift-cards/validar",
        "/api/gift-cards/validar;jsessionid=ABC        | /api/gift-cards/validar",
        "/api/gift-cards/validar;x                     | /api/gift-cards/validar",
        "/api/gift-cards;x=1/validar                   | /api/gift-cards/validar",
        "/api;/gift-cards/validar                      | /api/gift-cards/validar",
        "/api/gift-cards/validar%3Bx                   | /api/gift-cards/validar",
        "/api/gift-cards/validar/                      | /api/gift-cards/validar",
        "/api/gift-cards/validar///                    | /api/gift-cards/validar",
        "//api//gift-cards//validar                    | /api/gift-cards/validar",
        "/api/./gift-cards/./validar                   | /api/gift-cards/validar",
        "/api/x/../gift-cards/validar                  | /api/gift-cards/validar",
        "/api/%2e/gift-cards/%2E/validar               | /api/gift-cards/validar",
        "/api/x/%2e%2e/gift-cards/validar              | /api/gift-cards/validar",
        "/api/x/%252e%252E/gift-cards/validar          | /api/gift-cards/validar",
        "/../../api/gift-cards/validar                 | /api/gift-cards/validar",
        "/api/gift-cards/validar?a=b                   | /api/gift-cards/validar",
        "/api/%C3%B1/x                                 | /api/ñ/x",
        "/                                             | /",
        "                                              | /",
    })
    void sinContext_todasLasFormasDanLaMismaRuta(String uri, String esperada) {
        assertThat(RutaCanonica.de(uri == null ? "" : uri.trim(), "")).isEqualTo(esperada.trim());
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "/hotclick/api/gift-cards/validar                  | /hotclick | /api/gift-cards/validar",
        "/hotclick/api/gift-cards/%76alidar                | /hotclick | /api/gift-cards/validar",
        "/hotclick;jsessionid=A/api/gift-cards/validar     | /hotclick | /api/gift-cards/validar",
        "/%68otclick/api/gift-cards/validar                | /hotclick | /api/gift-cards/validar",
        "//hotclick//api//gift-cards/validar/              | /hotclick | /api/gift-cards/validar",
        "/hotclick/x/../api/gift-cards/validar             | /hotclick | /api/gift-cards/validar",
        "/hotclick                                         | /hotclick | /",
        "/hotclick/                                        | /hotclick | /",
        "/hotclickx/api/gift-cards/validar                 | /hotclick | /hotclickx/api/gift-cards/validar",
        "/api/gift-cards/validar                           | /         | /api/gift-cards/validar",
    })
    void conContext_quitaElContextPathCanonico(String uri, String ctx, String esperada) {
        assertThat(RutaCanonica.de(uri.trim(), ctx.trim())).isEqualTo(esperada.trim());
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "/api/%",                      // porcentaje cortado
        "/api/%7",                     // porcentaje incompleto
        "/api/%zz",                    // no es hexadecimal
        "/api/%C3",                    // UTF-8 truncado
        "/api/%FF%FE",                 // UTF-8 inválido
        "/api/%00",                    // nulo
        "/api/%0a/x",                  // salto de línea (inyección en logs)
        "/api/%0D%0A",                 // CRLF
        "/api/%5Cx",                   // contrabarra
        "/api/%25252576alidar",        // 4 niveles de encoding: más que el tope
    })
    void invalidas_devuelvenNull(String uri) {
        assertThat(RutaCanonica.de(uri, "")).isNull();
    }

    @Test
    void nulo_esRaiz() {
        assertThat(RutaCanonica.de(null, null)).isEqualTo("/");
    }

    @Test
    void tresNivelesDeEncodingSeDeshacen_elCuartoSeRechaza() {
        assertThat(RutaCanonica.de("/api/%252576alidar", "")).isEqualTo("/api/validar");
        assertThat(RutaCanonica.de("/api/%25252576alidar", "")).isNull();
    }
}
