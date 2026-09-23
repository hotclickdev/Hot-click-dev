package com.hotclick.service;

import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Reset plataforma conservando QA")
class ResetPlataformaKeepQaServiceTest {

    @Test
    @DisplayName("Conserva admin, 3 QA y el mostrador POS")
    void correosConservados() {
        assertThat(ResetPlataformaKeepQaService.correosConservados()).containsExactly(
            Constants.CORREO_ADMIN.toLowerCase(),
            Constants.CORREO_QA_EMPRENDEDOR.toLowerCase(),
            Constants.CORREO_QA_PYME.toLowerCase(),
            Constants.CORREO_QA_NEGOCIO_PLUS.toLowerCase(),
            ResetPlataformaKeepQaService.CORREO_MOSTRADOR.toLowerCase()
        );
        assertThat(ResetPlataformaKeepQaService.CONFIRMACION).isEqualTo("ELIMINAR PLATAFORMA");
        assertThat(ResetPlataformaKeepQaService.correosVisiblesAdmin()).containsExactly(
            Constants.CORREO_ADMIN.toLowerCase(),
            Constants.CORREO_QA_EMPRENDEDOR.toLowerCase(),
            Constants.CORREO_QA_PYME.toLowerCase(),
            Constants.CORREO_QA_NEGOCIO_PLUS.toLowerCase()
        );
        assertThat(ResetPlataformaKeepQaService.CLAVE_ONE_SHOT).contains("tiendas");
    }
}
