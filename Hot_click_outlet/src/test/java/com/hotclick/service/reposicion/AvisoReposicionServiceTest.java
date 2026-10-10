package com.hotclick.service.reposicion;

import com.hotclick.model.Producto;
import com.hotclick.model.SuscripcionReposicion;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SuscripcionReposicionRepository;
import com.hotclick.service.ResendEmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Reposiciones concurrentes y fallos de envío: un correo por suscripción, nunca dos. */
class AvisoReposicionServiceTest {

    private final SuscripcionReposicionRepository suscripciones = mock(SuscripcionReposicionRepository.class);
    private final ProductoRepository productos = mock(ProductoRepository.class);
    private final ResendEmailService email = mock(ResendEmailService.class);
    private final ReposicionEmailBuilder plantilla = mock(ReposicionEmailBuilder.class);
    private final AvisoReposicionService service = new AvisoReposicionService(suscripciones, productos, email, plantilla);
    private SuscripcionReposicion sus;

    @BeforeEach
    void setUp() {
        Producto p = new Producto();
        p.setId(7L);
        p.setStockActual(3);
        p.setStockReservado(0);
        when(productos.findById(7L)).thenReturn(Optional.of(p));
        sus = new SuscripcionReposicion();
        sus.setId(1L);
        sus.setCorreo("ana@test.cr");
        when(suscripciones.findByProducto_IdAndNotificadoFalse(7L)).thenReturn(List.of(sus));
        when(plantilla.asunto(any())).thenReturn("asunto");
        when(plantilla.html(any())).thenReturn("<html/>");
    }

    @Test
    void otraReposicionYaReclamo_noEnvia() {
        when(suscripciones.reclamarParaAviso(eq(1L), any())).thenReturn(0);
        service.avisarSuscriptores(7L);
        verifyNoInteractions(email);
    }

    @Test
    void reclamoGanado_enviaUnaVez() {
        when(suscripciones.reclamarParaAviso(eq(1L), any())).thenReturn(1);
        service.avisarSuscriptores(7L);
        verify(email, times(1)).send("ana@test.cr", "asunto", "<html/>");
        verify(suscripciones, never()).liberarAviso(any());
    }

    @Test
    void envioFalla_liberaParaLaProxima() {
        when(suscripciones.reclamarParaAviso(eq(1L), any())).thenReturn(1);
        doThrow(new RuntimeException("sendgrid caído")).when(email).send(any(), any(), any());
        service.avisarSuscriptores(7L);
        verify(suscripciones).liberarAviso(1L);
    }

    @Test
    void productoSinStockAlEnviar_noAvisa() {
        productos.findById(7L).orElseThrow().setStockActual(0);
        service.avisarSuscriptores(7L);
        verifyNoInteractions(email);
        verify(suscripciones, never()).reclamarParaAviso(any(), any());
    }
}
