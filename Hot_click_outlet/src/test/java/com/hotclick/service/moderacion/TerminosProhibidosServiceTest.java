package com.hotclick.service.moderacion;

import com.hotclick.model.TerminoProhibido;
import com.hotclick.repository.TerminoProhibidoRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TerminosProhibidosServiceTest {

    private static TerminoProhibido t(String s) {
        TerminoProhibido tp = new TerminoProhibido();
        tp.setTermino(s);
        return tp;
    }

    private final TerminoProhibidoRepository repo = mock(TerminoProhibidoRepository.class);
    private final TerminosProhibidosService service = new TerminosProhibidosService(repo);

    @Test
    void normaliza_tildesMayusculasYSignos() {
        assertThat(TerminosProhibidosService.normalizar("  TABÁCO-Premium!! ")).isEqualTo("tabaco premium");
    }

    @Test
    void coincideAlInicioDePalabra_enNombreDescripcionOCategoria() {
        when(repo.findAll()).thenReturn(List.of(t("vape"), t("tabaco"), t("armas"), t("drogas")));
        assertThat(service.terminoEncontrado("Vapeador", null, null, null)).contains("vape");
        assertThat(service.terminoEncontrado("Caja", "con Tabáco", null, null)).contains("tabaco");
        assertThat(service.terminoEncontrado("Caja", null, null, "Armas y defensa")).contains("armas");
        assertThat(service.terminoEncontrado("Armario", "Desarmas fácil", null, "Hogar")).isEmpty();
        assertThatThrownBy(() -> service.exigirPermitido("Drogas", null, null, null))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("«drogas»");
    }
}
