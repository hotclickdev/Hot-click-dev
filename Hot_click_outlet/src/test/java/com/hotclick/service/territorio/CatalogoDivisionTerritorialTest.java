package com.hotclick.service.territorio;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CatalogoDivisionTerritorialTest {

    @Test
    @DisplayName("pone título y deja en minúscula de, del y la")
    void titulo() {
        assertThat(CatalogoDivisionTerritorial.titulo("SAN FRANCISCO DE DOS RÍOS"))
                .isEqualTo("San Francisco de Dos Ríos");
        assertThat(CatalogoDivisionTerritorial.titulo("SAN SEBASTIÁN")).isEqualTo("San Sebastián");
    }

    @Test
    @DisplayName("agrupa distritos bajo su cantón y no repite")
    void armar() {
        List<ProvinciaDivision> catalogo = CatalogoDivisionTerritorial.armar(List.of(
                new FilaDivision("San José", "ESCAZU", "SAN RAFAEL"),
                new FilaDivision("San José", "ESCAZU", "SAN RAFAEL"),
                new FilaDivision("San José", "SAN JOSE", "CATEDRAL"),
                new FilaDivision("Alajuela", "RIO CUARTO", "SANTA ISABEL")
        ));

        assertThat(catalogo).extracting(ProvinciaDivision::nombre).containsExactly("Alajuela", "San José");
        ProvinciaDivision sanJose = catalogo.get(1);
        assertThat(sanJose.cantones()).extracting(CantonDivision::nombre).containsExactly("Escazu", "San Jose");
        assertThat(sanJose.cantones().get(0).distritos()).containsExactly("San Rafael");
        assertThat(catalogo.get(0).cantones().get(0).distritos()).containsExactly("Santa Isabel");
    }
}
