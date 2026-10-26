package com.hotclick.controller.spa;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SpaSeoSupportEscJsonTest {

    @Test
    void escapaCierreDeScript() {
        String out = SpaSeoSupport.escJson("Tienda</script><form action=https://evil.example>");
        assertThat(out).doesNotContain("<").doesNotContain(">").doesNotContain("</script");
        assertThat(out).contains("\\u003c/script\\u003e");
    }

    @Test
    void escapaAmpersandYSeparadoresDeLinea() {
        String out = SpaSeoSupport.escJson("A & B\u2028C\u2029D<!--");
        assertThat(out).isEqualTo("A \\u0026 B\\u2028C\\u2029D\\u003c!--");
        assertThat(out).doesNotContain("\u2028").doesNotContain("\u2029");
    }

    @Test
    void mantieneEscapesJsonPrevios() {
        assertThat(SpaSeoSupport.escJson("a\"b\\c\nd")).isEqualTo("a\\\"b\\\\c d");
        assertThat(SpaSeoSupport.escJson(null)).isEmpty();
    }

    @Test
    void escapaCaracteresDeControl() {
        assertThat(SpaSeoSupport.escJson("a\tb\u0000c\u001fd")).isEqualTo("a\\u0009b\\u0000c\\u001fd");
    }
}
