package com.hotclick.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuditoriaFiltroTextoTest {
    @Test
    void nuncaNull() {
        assertThat(AuditoriaAdminConsultaService.filtroTexto(null)).isEmpty();
        assertThat(AuditoriaAdminConsultaService.filtroTexto("   ")).isEmpty();
        assertThat(AuditoriaAdminConsultaService.filtroTexto(" ana@x.cr ")).isEqualTo("ana@x.cr");
    }
}
