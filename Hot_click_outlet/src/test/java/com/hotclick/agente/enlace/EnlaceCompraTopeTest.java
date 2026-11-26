package com.hotclick.agente.enlace;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** AG-14 H-04: tope de enlaces vigentes por conversación y contacto. */
class EnlaceCompraTopeTest {

    private static final LocalDateTime AHORA = LocalDateTime.of(2026, 12, 7, 10, 0);
    private static final UUID SESION = UUID.fromString("11111111-2222-3333-4444-555555555555");

    private EnlaceCompraRepository repo;
    private EnlaceCompraReserva reserva;
    private EnlaceCompraTope tope;

    @BeforeEach
    void init() {
        repo = mock(EnlaceCompraRepository.class);
        reserva = mock(EnlaceCompraReserva.class);
        when(reserva.invalidarSinPagar(anyLong())).thenReturn(true);
        tope = new EnlaceCompraTope(repo, reserva, 3);
    }

    @Test
    void conMenosDelTopeNoVenceNada() {
        when(repo.idsVigentesSinPedido(any(), eq(7L), any(), any(), any())).thenReturn(List.of(1L, 2L));
        assertThat(tope.hacerEspacio(7L, SESION, "WHATSAPP", "contacto", AHORA)).isZero();
        verify(reserva, never()).invalidarSinPagar(anyLong());
    }

    @Test
    void enElTopeVenceSoloElMasViejo() {
        when(repo.idsVigentesSinPedido(any(), eq(7L), any(), any(), any())).thenReturn(List.of(1L, 2L, 3L));
        assertThat(tope.hacerEspacio(7L, SESION, "WHATSAPP", "contacto", AHORA)).isEqualTo(1);
        verify(reserva).invalidarSinPagar(1L);
        verify(reserva, never()).invalidarSinPagar(2L);
    }

    @Test
    void porEncimaDelTopeVenceLosQueSobran() {
        when(repo.idsVigentesSinPedido(any(), eq(7L), any(), any(), any())).thenReturn(List.of(1L, 2L, 3L, 4L, 5L));
        assertThat(tope.hacerEspacio(7L, SESION, "WHATSAPP", "contacto", AHORA)).isEqualTo(3);
        verify(reserva).invalidarSinPagar(3L);
        verify(reserva, never()).invalidarSinPagar(4L);
    }

    @Test
    void cuentaDeHotClickUsaLaConsultaSinEmpresaYTolerasinSesionNiContacto() {
        when(repo.idsVigentesSinPedidoHotClick(any(), any(), any(), any())).thenReturn(List.of(1L, 2L, 3L));
        assertThat(tope.hacerEspacio(null, null, "INSTAGRAM", null, AHORA)).isEqualTo(1);
        verify(repo, never()).idsVigentesSinPedido(any(), any(), any(), any(), any());
        verify(repo).idsVigentesSinPedidoHotClick(eq(new UUID(0L, 0L)), eq("INSTAGRAM"), eq(""), eq(AHORA));
    }
}
