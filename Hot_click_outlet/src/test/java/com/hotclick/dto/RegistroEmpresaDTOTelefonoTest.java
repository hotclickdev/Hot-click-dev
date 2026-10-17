package com.hotclick.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** BUG-S1-07: el teléfono «(opcional)» no puede tumbar el registro. */
class RegistroEmpresaDTOTelefonoTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void vacioOSoloCodigoDePaisQuedaNulo() {
        for (String v : new String[]{null, "", "   ", "+506", "+506 ", " +1 "}) {
            RegistroEmpresaDTO dto = new RegistroEmpresaDTO();
            dto.setTelefonoEmpresa(v);
            dto.setTelefonoAdmin(v);
            assertThat(dto.getTelefonoEmpresa()).as("empresa «%s»", v).isNull();
            assertThat(dto.getTelefonoAdmin()).as("admin «%s»", v).isNull();
            assertThat(validator.validateProperty(dto, "telefonoEmpresa")).isEmpty();
            assertThat(validator.validateProperty(dto, "telefonoAdmin", RegistroEmpresaDTO.AltaCuenta.class)).isEmpty();
        }
    }

    @Test
    void numeroRealSeConservaYUnoInvalidoSigueFallando() {
        RegistroEmpresaDTO dto = new RegistroEmpresaDTO();
        dto.setTelefonoAdmin(" +506 8888 1234 ");
        assertThat(dto.getTelefonoAdmin()).isEqualTo("+506 8888 1234");
        assertThat(validator.validateProperty(dto, "telefonoAdmin", RegistroEmpresaDTO.AltaCuenta.class)).isEmpty();

        dto.setTelefonoEmpresa("+506 abc");
        assertThat(validator.validateProperty(dto, "telefonoEmpresa")).isNotEmpty();
    }
}
