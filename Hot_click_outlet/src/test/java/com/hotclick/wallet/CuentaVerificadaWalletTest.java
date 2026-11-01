package com.hotclick.wallet;

import com.hotclick.model.MetodoCobro;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.service.wallet.CuentaCobroVerificada;
import org.junit.jupiter.api.Test;

import com.hotclick.utils.Constants;

import java.time.Clock;
import java.time.Instant;
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
        // 1-nov-2026 03:17 UTC = 31-oct-2026 21:17 CR (la hora en que falló en CI): la quincena es 16..31 oct.
        Clock reloj = Clock.fixed(Instant.parse("2026-11-01T03:17:00Z"), Constants.ZONA_CR);
        CuentaCobroVerificada v = new CuentaCobroVerificada(repo, reloj);
        LocalDateTime ahora = LocalDateTime.now(reloj);
        LocalDateTime vieja = ahora.minusMonths(2);

        when(repo.findActivosByEmpresaId(1L)).thenReturn(List.of(cuenta(MetodoCobro.TIPO_SINPE, true, vieja)));
        assertThat(v.buscar(1L)).as("en revisión").isEmpty();

        when(repo.findActivosByEmpresaId(2L)).thenReturn(List.of(cuenta(MetodoCobro.TIPO_TARJETA, false, vieja)));
        assertThat(v.buscar(2L)).as("tarjeta no recibe pagos").isEmpty();

        when(repo.findActivosByEmpresaId(3L)).thenReturn(List.of(cuenta(MetodoCobro.TIPO_IBAN, false, ahora)));
        assertThat(v.buscar(3L)).as("registrada esta quincena").isEmpty();

        when(repo.findActivosByEmpresaId(4L)).thenReturn(List.of(cuenta(MetodoCobro.TIPO_SINPE, false, vieja)));
        assertThat(v.buscar(4L)).isPresent();

        when(repo.findActivosByEmpresaId(5L)).thenReturn(List.of());
        assertThatThrownBy(() -> v.exigir(5L)).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("SINPE");
    }

    @Test
    void quincenaSeCalculaEnHoraDeCostaRica() {
        MetodoCobroRepository repo = mock(MetodoCobroRepository.class);
        Clock reloj = Clock.fixed(Instant.parse("2026-11-01T03:17:00Z"), Constants.ZONA_CR);
        CuentaCobroVerificada v = new CuentaCobroVerificada(repo, reloj);

        when(repo.findActivosByEmpresaId(1L)).thenReturn(List.of(
            cuenta(MetodoCobro.TIPO_SINPE, false, LocalDateTime.parse("2026-10-20T10:00:00"))));
        assertThat(v.buscar(1L)).as("20-oct sigue en la quincena CR 16..31 oct").isEmpty();

        when(repo.findActivosByEmpresaId(2L)).thenReturn(List.of(
            cuenta(MetodoCobro.TIPO_SINPE, false, LocalDateTime.parse("2026-10-15T23:59:00"))));
        assertThat(v.buscar(2L)).as("15-oct es de la quincena anterior").isPresent();
    }
}
