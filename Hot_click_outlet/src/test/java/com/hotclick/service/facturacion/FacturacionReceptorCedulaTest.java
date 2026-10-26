package com.hotclick.service.facturacion;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/** #318 NO APTO (MEDIO): identificaciones internas (REG-, EMP-, GUEST-, CL…) nunca llegan a Hacienda como cédula del receptor. */
@DisplayName("#318 | receptor Hacienda solo con cédula real")
class FacturacionReceptorCedulaTest {

    private static ComprobanteFiscal copiar(String ident) {
        Usuario u = new Usuario();
        u.setNombre("Cliente");
        u.setApellidoPaterno("");
        u.setCorreo("c@example.test");
        u.setIdentificacion(ident);
        ComprobanteFiscal cf = new ComprobanteFiscal();
        FacturacionEmisionSupport.copiarReceptor(cf, u);
        return cf;
    }

    @ParameterizedTest
    @ValueSource(strings = {"REG-1234567890abcdef", "REG-123456789012ab", "EMP-123456789012", "EMP-1a2b3c4d5e6f",
        "GUEST-1234567890123", "CL2abc123456789012", "SISTEMA-POS-MOST"})
    void identificacionInternaNoEsReceptor(String ident) {
        ComprobanteFiscal cf = copiar(ident);
        assertThat(cf.getReceptorCedula()).isNull();
        assertThat(cf.getReceptorTipo()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"112340567", "1-1234-0567", "1 1234 0567", " 112340567 "})
    void cedulaFisicaRealSeCopia(String ident) {
        ComprobanteFiscal cf = copiar(ident);
        assertThat(cf.getReceptorCedula()).isEqualTo("112340567");
        assertThat(cf.getReceptorTipo()).isEqualTo("01");
    }

    @ParameterizedTest
    @ValueSource(strings = {"3101123456", "155812345678"})
    void juridicaYDimexSeCopian(String ident) {
        assertThat(copiar(ident).getReceptorCedula()).isEqualTo(ident);
    }
}
