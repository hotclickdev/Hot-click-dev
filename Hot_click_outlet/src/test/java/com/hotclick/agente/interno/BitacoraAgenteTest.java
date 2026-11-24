package com.hotclick.agente.interno;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BitacoraAgenteTest {

    @Test
    void registraUsuarioEmpresaAccionResultadoYFecha() {
        AgenteAccionRepository repo = mock(AgenteAccionRepository.class);
        Clock reloj = Clock.fixed(InternoTestSupport.T0, ZoneOffset.UTC);
        new BitacoraAgente(repo, reloj).registrar(7L, 100L, "PEDIDO_ESTADO", AgenteAccion.EJECUTADA, 55L);

        ArgumentCaptor<AgenteAccion> c = ArgumentCaptor.forClass(AgenteAccion.class);
        verify(repo).save(c.capture());
        AgenteAccion a = c.getValue();
        assertThat(a.getEmpresaId()).isEqualTo(7L);
        assertThat(a.getUsuarioId()).isEqualTo(100L);
        assertThat(a.getAccion()).isEqualTo("PEDIDO_ESTADO");
        assertThat(a.getResultado()).isEqualTo("EJECUTADA");
        assertThat(a.getEntidadId()).isEqualTo(55L);
        assertThat(a.getFechaCreacion()).isEqualTo(InternoTestSupport.T0);
        assertThat(a.getCanal()).isEqualTo("WHATSAPP");
    }

    @Test
    void unFalloDeLaBitacoraNoDeshaceLaAccionYaAplicada() {
        AgenteAccionRepository repo = mock(AgenteAccionRepository.class);
        when(repo.save(any())).thenThrow(new IllegalStateException("bd caída"));
        assertThatCode(() -> new BitacoraAgente(repo, Clock.systemUTC())
            .registrar(7L, 100L, "PEDIDO_ESTADO", AgenteAccion.EJECUTADA, 55L)).doesNotThrowAnyException();
    }

    @Test
    void laEntidadSoloGuardaIdsNoTextoDeClientes() {
        // Contrato: ningún campo de la bitácora es texto libre (accion y resultado son códigos cortos).
        assertThat(java.util.Arrays.stream(AgenteAccion.class.getDeclaredFields())
            .map(f -> f.getName()).toList())
            .containsExactlyInAnyOrder("EJECUTADA", "CANCELADA", "RECHAZADA", "ERROR", "id", "empresaId", "usuarioId",
                "canal", "accion", "resultado", "entidadId", "fechaCreacion");
    }
}
