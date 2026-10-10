package com.hotclick.service.territorio;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DivisionTerritorialCopiaLocalTest {

    @Test
    void copiaLocalTraeSieteProvinciasYDistritosDeSanCarlos() {
        List<ProvinciaDivision> catalogo = new DivisionTerritorialService().copiaLocal();
        assertThat(catalogo).hasSize(7);
        ProvinciaDivision alajuela = catalogo.stream().filter(p -> p.nombre().equals("Alajuela")).findFirst().orElseThrow();
        CantonDivision sanCarlos = alajuela.cantones().stream().filter(c -> c.nombre().equals("San Carlos")).findFirst().orElseThrow();
        assertThat(sanCarlos.distritos()).contains("Quesada", "La Fortuna");
    }
}
