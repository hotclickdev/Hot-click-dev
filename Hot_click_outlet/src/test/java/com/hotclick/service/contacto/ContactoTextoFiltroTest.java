package com.hotclick.service.contacto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Duration;

import static com.hotclick.service.contacto.ContactoTextoFiltro.OCULTO;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

@DisplayName("[NEGOCIO] Texto público del vendedor sin contacto directo (EMPRENDEDOR)")
class ContactoTextoFiltroTest {

    @ParameterizedTest(name = "oculta: {0}")
    @ValueSource(strings = {
        "Escribime al 8888-8888",
        "Escribime al 8888 8888",
        "Escribime al 8888.8888",
        "Escribime al 88888888",
        "Escribime al 2222-3333",
        "Escribime al +506 8888-8888",
        "Escribime al +50688888888",
        "Escribime al (506) 8888 8888",
        "Escribime al 506 8888-8888",
        "Escribime al 8 8 8 8 8 8 8 8",
        "Escribime al 8.8.8.8.8.8.8.8",
        "Escribime al 1234567",
        "Escribime al +1 305 555 1234",
        "Escribime a ventas@casaluna.cr",
        "Escribime a ventas arroba gmail punto com",
        "Seguinos en @casaluna506",
        "Pedidos por wa.me/50688888888",
        "Pedidos por https://wa.me/50688888888?text=hola",
        "Mirá instagram.com/casaluna506",
        "Mirá https://www.instagram.com/casaluna506/",
        "Mirá tiktok.com/@casaluna",
        "Mirá facebook.com/casaluna",
        "Grupo t.me/casaluna",
        "Todo en linktr.ee/casaluna",
        "Visitá www.casaluna.com",
        "Visitá casaluna.com",
        "Visitá https://casaluna.store/catalogo",
        "Llamá: tel:88888888",
        "Correo mailto:ventas@casaluna.cr",
    })
    void oculta(String texto) {
        String r = ContactoTextoFiltro.ocultar(texto);
        assertThat(r).contains(OCULTO);
        assertThat(r).doesNotContainPattern("\\d{4}[\\s.-]?\\d{4}|@\\w|wa\\.me|instagram|tiktok|facebook|t\\.me|linktr|casaluna\\.");
    }

    @ParameterizedTest(name = "no toca: {0}")
    @ValueSource(strings = {
        "Precio ₡17.500",
        "Antes ₡1.250.000, ahora ₡990.000",
        "Precio 1.250.000 colones",
        "Entre 4000-5000 colones",
        "Medidas 200x90 cm",
        "Medidas 200 x 90 x 75 cm",
        "Modelo 2026",
        "Colección 2025-2026",
        "Tallas 38 39 40 41",
        "Tallas 40 41 42 43",
        "Tallas 38, 39, 40",
        "Peso 1.5 kg, 12 piezas",
        "Horario 9:00 a 18:00",
        "Hecho el 03-10-2026",
        "Garantía de 12 meses",
        "Más info en hotclick.lat/tienda/casa-luna",
        "Más info en https://hotclick.lat/productos/12",
        "Algodón 100% · 3 colores",
        "Capacidad 750 ml",
    })
    void respeta(String texto) {
        assertThat(ContactoTextoFiltro.ocultar(texto)).isEqualTo(texto);
    }

    @Test
    @DisplayName("Ejemplo completo: solo cambia el contacto, el resto del texto queda igual")
    void ejemploCompleto() {
        String antes = "Bolso de cuero ₡17.500. Medidas 30x20 cm. Pedidos al 8888-8888 o @casaluna506.";
        assertThat(ContactoTextoFiltro.ocultar(antes))
            .isEqualTo("Bolso de cuero ₡17.500. Medidas 30x20 cm. Pedidos al " + OCULTO + " o " + OCULTO + ".");
    }

    @Test
    @DisplayName("HTML del editor: el enlace externo pierde el href, las imágenes y el formato quedan")
    void html() {
        String antes = "<p>Bolso <strong>₡17.500</strong></p><p><a href=\"https://wa.me/50688888888\" target=\"_blank\">Escribime</a>"
            + " al 8888&nbsp;8888</p><img src=\"https://pub-1.r2.dev/foto.jpg\"><a href=\"/productos/3\">Ver otro</a>";
        String r = ContactoTextoFiltro.ocultar(antes);
        assertThat(r).contains("<p>Bolso <strong>₡17.500</strong></p>", "<a>Escribime</a>", "al " + OCULTO,
            "<img src=\"https://pub-1.r2.dev/foto.jpg\">", "<a href=\"/productos/3\">Ver otro</a>");
        assertThat(r).doesNotContain("wa.me", "8888");
    }

    @Test
    void nuloYVacio() {
        assertThat(ContactoTextoFiltro.ocultar(null)).isNull();
        assertThat(ContactoTextoFiltro.ocultar("")).isEmpty();
    }

    // ── Video ────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest(name = "video permitido: {0}")
    @ValueSource(strings = {
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ",
        "https://youtube.com/shorts/dQw4w9WgXcQ?feature=share",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://www.instagram.com/reel/C9abcDEF123/",
        "https://www.instagram.com/p/C9abcDEF123/?igsh=xyz",
        "https://www.tiktok.com/@casaluna/video/7301234567890123456",
        "https://vimeo.com/123456789",
        "https://player.vimeo.com/video/123456789",
    })
    void videoPermitido(String url) {
        assertThat(ContactoTextoFiltro.videoPermitido(url)).isEqualTo(url);
    }

    @ParameterizedTest(name = "video descartado: {0}")
    @ValueSource(strings = {
        "https://www.youtube.com/@casaluna",
        "https://www.youtube.com/channel/UC123",
        "https://www.youtube.com/",
        "https://www.instagram.com/casaluna506/",
        "https://www.instagram.com/",
        "https://www.tiktok.com/@casaluna",
        "https://vm.tiktok.com/ZMabc123/",
        "https://www.facebook.com/casaluna",
        "https://vimeo.com/casaluna",
        "https://casaluna.com/video",
        "https://wa.me/50688888888",
        "no es un enlace",
    })
    void videoDescartado(String url) {
        assertThat(ContactoTextoFiltro.videoPermitido(url)).isNull();
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
        "https://www.instagram.com/casaluna506/reel/C9abcDEF123/, https://www.instagram.com/reel/C9abcDEF123/",
        "https://instagram.com/casaluna506/reels/C9abcDEF123, https://www.instagram.com/reel/C9abcDEF123/",
    })
    void instagramConUsuario_seNormalizaSinUsuario(String url, String esperado) {
        assertThat(ContactoTextoFiltro.videoPermitido(url)).isEqualTo(esperado);
    }

    @Test
    @DisplayName("Textos largos con muchos subdominios no desbordan la pila (Sonar java:S5998)")
    void textoLargo_sinStackOverflow() {
        String subdominios = "a.".repeat(4_000);
        assertTimeoutPreemptively(Duration.ofSeconds(10), () -> {
            assertThat(ContactoTextoFiltro.ocultar("Escribime a ventas@" + subdominios + "com")).doesNotContain("ventas@").contains(OCULTO);
            assertThat(ContactoTextoFiltro.ocultar("Visitá " + subdominios + "com")).doesNotContain("a.com").contains(OCULTO);
            assertThat(ContactoTextoFiltro.ocultar("Seguinos " + subdominios + "instagram.com/casa")).doesNotContain("instagram.com").contains(OCULTO);
        });
    }

    @ParameterizedTest(name = "subdominios: {0}")
    @ValueSource(strings = {
        "Escribime a ventas@mail.casa-luna.co.cr",
        "Mirá tienda.casaluna.shop",
        "Seguinos en m.facebook.com/casaluna",
        "Seguinos en www.instagram.com/casaluna",
    })
    void subdominios_seOcultan(String texto) {
        assertThat(ContactoTextoFiltro.ocultar(texto)).contains(OCULTO).doesNotContain("casaluna").doesNotContain("casa-luna");
    }

    @ParameterizedTest(name = "se respeta: {0}")
    @ValueSource(strings = {
        "Comprá en hotclick.lat/tienda/casa-luna",
        "Más info en www.hotclick.lat",
        "Tela xinstagram mide 200x90 cm",
    })
    void respetaHotclickYPalabrasParecidas(String texto) {
        assertThat(ContactoTextoFiltro.ocultar(texto)).isEqualTo(texto);
    }
}
