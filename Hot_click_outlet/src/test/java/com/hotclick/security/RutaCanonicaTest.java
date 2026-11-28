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
        "/api/division-territorial/validar                       | /api/division-territorial/validar",
        "/api/division-territorial/%76alidar                     | /api/division-territorial/validar",
        "/api/division-territorial/%56alidar                     | /api/division-territorial/Validar",
        "/api/division-territorial/valida%72                     | /api/division-territorial/validar",
        "/api/division-territorial/%76%61%6c%69%64%61%72         | /api/division-territorial/validar",
        "/%61pi/division-territorial/validar                     | /api/division-territorial/validar",
        "/api/auth/%6Cogin                             | /api/auth/login",
        "/api/auth/%6cogin                             | /api/auth/login",
        "/api/division-territorial/%2576alidar                   | /api/division-territorial/validar",
        "/api/division-territorial/%252576alidar                 | /api/division-territorial/validar",
        "/api/division-territorial/validar;jsessionid=ABC        | /api/division-territorial/validar",
        "/api/division-territorial/validar;x                     | /api/division-territorial/validar",
        "/api/division-territorial;x=1/validar                   | /api/division-territorial/validar",
        "/api;/division-territorial/validar                      | /api/division-territorial/validar",
        "/api/division-territorial/validar%3Bx                   | /api/division-territorial/validar",
        "/api/division-territorial/validar/                      | /api/division-territorial/validar",
        "/api/division-territorial/validar///                    | /api/division-territorial/validar",
        "//api//division-territorial//validar                    | /api/division-territorial/validar",
        "/api/./division-territorial/./validar                   | /api/division-territorial/validar",
        "/api/x/../division-territorial/validar                  | /api/division-territorial/validar",
        "/api/%2e/division-territorial/%2E/validar               | /api/division-territorial/validar",
        "/api/x/%2e%2e/division-territorial/validar              | /api/division-territorial/validar",
        "/api/x/%252e%252E/division-territorial/validar          | /api/division-territorial/validar",
        "/../../api/division-territorial/validar                 | /api/division-territorial/validar",
        "/api/division-territorial/validar?a=b                   | /api/division-territorial/validar",
        "/api/%C3%B1/x                                 | /api/ñ/x",
        "/                                             | /",
        "                                              | /",
    })
    void sinContext_todasLasFormasDanLaMismaRuta(String uri, String esperada) {
        assertThat(RutaCanonica.de(uri == null ? "" : uri.trim(), "")).isEqualTo(esperada.trim());
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "/hotclick/api/division-territorial/validar                  | /hotclick | /api/division-territorial/validar",
        "/hotclick/api/division-territorial/%76alidar                | /hotclick | /api/division-territorial/validar",
        "/hotclick;jsessionid=A/api/division-territorial/validar     | /hotclick | /api/division-territorial/validar",
        "/%68otclick/api/division-territorial/validar                | /hotclick | /api/division-territorial/validar",
        "//hotclick//api//division-territorial/validar/              | /hotclick | /api/division-territorial/validar",
        "/hotclick/x/../api/division-territorial/validar             | /hotclick | /api/division-territorial/validar",
        "/hotclick                                         | /hotclick | /",
        "/hotclick/                                        | /hotclick | /",
        "/hotclickx/api/division-territorial/validar                 | /hotclick | /hotclickx/api/division-territorial/validar",
        "/api/division-territorial/validar                           | /         | /api/division-territorial/validar",
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
