package com.hotclick.utils;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Lo que aplican Branding/Proveedor/Plugin: cleanWithLimit quita etiquetas y respeta el largo de columna. */
class InputSanitizerNombresXssTest {
    private final InputSanitizer s = new InputSanitizer();

    @Test
    void quitaScriptYRespetaLimite() {
        assertThat(s.cleanWithLimit("Tienda</script><img src=x onerror=alert(1)>", 150)).isEqualTo("Tienda");
        assertThat(s.cleanWithLimit("x".repeat(300), 100)).hasSize(100);
        assertThat(s.cleanWithLimit(null, 100)).isNull();
    }
}
