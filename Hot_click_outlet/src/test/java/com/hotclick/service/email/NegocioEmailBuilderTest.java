package com.hotclick.service.email;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("NegocioEmailBuilder — cupón de bienvenida (Figma: Correo · Cupón de bienvenida)")
class NegocioEmailBuilderTest {

    private final NegocioEmailBuilder builder = new NegocioEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    @Test
    @DisplayName("Muestra el código de cupón")
    void muestraCodigo() {
        String html = builder.buildCuponBienvenida("HOLA13");
        assertThat(html).contains("HOLA13").contains("13%");
    }

    @Test
    @DisplayName("Escapa el código de cupón por si llega con caracteres de HTML")
    void escapaCodigo() {
        String html = builder.buildCuponBienvenida("<script>1</script>");
        assertThat(html).doesNotContain("<script>1</script>").contains("&lt;script&gt;");
    }
}
