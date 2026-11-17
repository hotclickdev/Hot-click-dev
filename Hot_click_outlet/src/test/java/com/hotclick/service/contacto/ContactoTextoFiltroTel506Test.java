package com.hotclick.service.contacto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static com.hotclick.service.contacto.ContactoTextoFiltro.OCULTO;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guarda de TEL_506: teléfono CR con prefijo 506 pero SIN "+".
 *
 * <p>Sin el paso TEL_506, TEL_INTERNACIONAL no aplica (exige "+"), y TEL_CR / DIGITOS_SEPARADOS solo
 * ocultan los 8 dígitos locales: queda "506" suelto ("506 [contacto oculto]"). Por eso se exige que
 * el resultado sea EXACTAMENTE {@link ContactoTextoFiltro#OCULTO}: solo TEL_506 se come el prefijo.
 *
 * <p>Los números son fixtures sintéticos de test (no son datos reales). TEL_506 exige que la primera
 * cifra local sea [245678], así que no se pueden usar 0000000X; se usan 2000000X y 8000000X, que no
 * son "redondos" (así TEL_CR sí los oculta) y no corresponden a una persona.
 *
 * <p>No se usa "50620000001" (todo junto): DIGITOS_LARGOS también lo ocultaría y no detectaría la regresión.
 */
@DisplayName("[NEGOCIO] ContactoTextoFiltro: TEL_506 no se puede desactivar")
class ContactoTextoFiltroTel506Test {

    @ParameterizedTest(name = "TEL_506 oculta el prefijo completo: [{0}]")
    @ValueSource(strings = {
        "506 2000 0001",
        "506-2000-0001",
        "506.2000.0001",
        "(506) 8000 0002",
        "(506)8000-0002",
    })
    @DisplayName("TEL_506 no se puede desactivar: 506 + 8 dígitos sin '+' se oculta completo")
    void tel506OcultaElPrefijoCompleto(String telefono) {
        assertThat(ContactoTextoFiltro.ocultar(telefono)).isEqualTo(OCULTO);
        assertThat(ContactoTextoFiltro.ocultar("Escribime al " + telefono + " gracias"))
            .isEqualTo("Escribime al " + OCULTO + " gracias");
    }
}
