package com.hotclick.utils;

import com.hotclick.service.contacto.ContactoTextoFiltro;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("LAN-4 | videos de redes en plan Emprendedor")
class VideoRedesPlanTest {

    @Test
    void emprendedorSoloYoutube() {
        assertThatThrownBy(() -> VideoUrlPermitida.exigirSegunPlan("https://www.instagram.com/p/BWne3rFBmY0/", false))
            .hasMessage(VideoUrlPermitida.MENSAJE_PLAN);
        assertThatThrownBy(() -> VideoUrlPermitida.exigirSegunPlan("https://www.tiktok.com/@x/video/123", false))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatCode(() -> VideoUrlPermitida.exigirSegunPlan("https://youtu.be/dQw4w9WgXcQ", false)).doesNotThrowAnyException();
        assertThatCode(() -> VideoUrlPermitida.exigirSegunPlan("", false)).doesNotThrowAnyException();
    }

    @Test
    void pymeAceptaRedes() {
        assertThatCode(() -> VideoUrlPermitida.exigirSegunPlan("https://www.instagram.com/p/BWne3rFBmY0/", true)).doesNotThrowAnyException();
    }

    @Test
    void publicoSinRedesOcultaInstagramYa_guardado() {
        assertThat(ContactoTextoFiltro.videoSinRedes("https://www.instagram.com/p/BWne3rFBmY0/")).isNull();
        assertThat(ContactoTextoFiltro.videoSinRedes("https://youtu.be/dQw4w9WgXcQ")).isEqualTo("https://youtu.be/dQw4w9WgXcQ");
    }
}
