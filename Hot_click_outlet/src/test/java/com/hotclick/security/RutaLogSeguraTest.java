package com.hotclick.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("QA-122-2: el token del enlace no llega entero a logs ni auditoría")
class RutaLogSeguraTest {

    @Test
    void enmascaraTokenDeTiendaRapida() {
        String enlace = "AbCd" + "EfGhIjKlMnOpQrStUvWx";
        assertThat(RutaLogSegura.enmascarar("/api/public/tienda-rapida/" + enlace))
            .isEqualTo("/api/public/tienda-rapida/AbCd…").doesNotContain(enlace.substring(4));
        assertThat(RutaLogSegura.enmascarar("/tienda-rapida/" + enlace + "?x=1")).isEqualTo("/tienda-rapida/AbCd…?x=1");
        assertThat(RutaLogSegura.enmascarar("/api/productos/12")).isEqualTo("/api/productos/12");
        assertThat(RutaLogSegura.enmascarar(null)).isNull();
    }
}
