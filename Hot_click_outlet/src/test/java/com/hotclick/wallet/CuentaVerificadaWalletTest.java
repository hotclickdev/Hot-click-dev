package com.hotclick.wallet;

import com.hotclick.model.MetodoCobro;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.service.wallet.CuentaCobroVerificada;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** seg-altos-2 (d): los pagos solo salen a una cuenta SINPE/IBAN aprobada y no recién registrada. */
class CuentaVerificadaWalletTest {

    private static MetodoCobro cuenta(String tipo, boolean enRevision, LocalDateTime alta) {
        MetodoCobro m = new MetodoCobro();
        m.setTipo(tipo);
        m.setDestino("88880000");
        m.setEnRevision(enRevision);
        m.setActivo(true);
        m.setFechaCreacion(alta);
        return m;
    }

    @Test
    void soloSinpeOIbanAprobadaYDeQuincenaAnterior() {
        MetodoCobroRepository repo = mock(MetodoCobroRepository.class);
        CuentaCobroVerificada v = new CuentaCobroVerificada(repo);
        LocalDateTime vieja = LocalDateTime.now().minusMonths(2);

        when(repo.findActivosByEmpresaId(1L)).thenReturn(List.of(cuenta(MetodoCobro.TIPO_SINPE, true, vieja)));
        assertThat(v.buscar(1L)).as("en revisión").isEmpty();

        when(repo.findActivosByEmpresaId(2L)).thenReturn(List.of(cuenta(MetodoCobro.TIPO_TARJETA, false, vieja)));
        assertThat(v.buscar(2L)).as("tarjeta no recibe pagos").isEmpty();

        when(repo.findActivosByEmpresaId(3L)).thenReturn(List.of(cuenta(MetodoCobro.TIPO_IBAN, false, LocalDateTime.now())));
        assertThat(v.buscar(3L)).as("registrada esta quincena").isEmpty();

        when(repo.findActivosByEmpresaId(4L)).thenReturn(List.of(cuenta(MetodoCobro.TIPO_SINPE, false, vieja)));
        assertThat(v.buscar(4L)).isPresent();

        when(repo.findActivosByEmpresaId(5L)).thenReturn(List.of());
        assertThatThrownBy(() -> v.exigir(5L)).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("SINPE");
    }
}
