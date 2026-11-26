package com.hotclick.agente.ventas;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.enlace.EnlaceCompraException;
import com.hotclick.agente.enlace.EnlaceCompraService;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CrearEnlaceCompraHerramientaTest {

    private static final ObjectMapper OM = new ObjectMapper();
    private final UUID sesion = UUID.randomUUID();

    private EnlaceCompraService servicio;
    private CrearEnlaceCompraHerramienta tool;

    @BeforeEach
    void init() {
        servicio = mock(EnlaceCompraService.class);
        tool = new CrearEnlaceCompraHerramienta(servicio);
    }

    private ContextoHerramienta ctx(MensajeEntrante.Canal canal, String contacto) {
        return new ContextoHerramienta(7L, contacto, PerfilAgente.NEGOCIO_VENTAS, null, canal, sesion);
    }

    @Test
    @SuppressWarnings("unchecked")
    void usaCanalSesionYEmpresaDelContexto() throws Exception {
        when(servicio.crear(any(), any(), anyString(), any(), anyString(), any())).thenReturn(
            new EnlaceCompraService.EnlaceCreado("abc", "https://x/c/abc", LocalDateTime.now(), 15000,
                List.of(), "Su enlace: https://x/c/abc"));

        ResultadoHerramienta r = tool.ejecutar(ctx(MensajeEntrante.Canal.WHATSAPP, "8888-7777"),
            OM.readTree("{\"items\":[{\"productoId\":5,\"cantidad\":2}],\"empresaId\":999}"));

        ArgumentCaptor<List<EnlaceCompraService.ItemSolicitado>> items = ArgumentCaptor.forClass(List.class);
        verify(servicio).crear(eq(7L), eq(sesion), eq("50688887777"), any(), eq("WHATSAPP"), items.capture());
        assertThat(items.getValue()).containsExactly(new EnlaceCompraService.ItemSolicitado(5L, 2));
        assertThat(r.esError()).isFalse();
        assertThat(r.accion().tipo()).isEqualTo(AccionAgente.Tipo.ENLACE_CREADO);
        assertThat(r.accion().dato()).isEqualTo("https://x/c/abc");
    }

    @Test
    void enInstagramElContactoNoSeNormalizaComoTelefono() throws Exception {
        when(servicio.crear(any(), any(), anyString(), any(), anyString(), any())).thenReturn(
            new EnlaceCompraService.EnlaceCreado("abc", "u", LocalDateTime.now(), 1, List.of(), "ok"));

        tool.ejecutar(ctx(MensajeEntrante.Canal.INSTAGRAM, "IGSID-1"),
            OM.readTree("{\"items\":[{\"productoId\":5,\"cantidad\":1}]}"));

        verify(servicio).crear(eq(7L), eq(sesion), eq("IGSID-1"), any(), eq("INSTAGRAM"), any());
    }

    @Test
    void errorDeNegocioVuelveComoErrorParaElModelo() throws Exception {
        when(servicio.crear(any(), any(), anyString(), any(), anyString(), any()))
            .thenThrow(new EnlaceCompraException("Producto sin stock"));

        ResultadoHerramienta r = tool.ejecutar(ctx(MensajeEntrante.Canal.WHATSAPP, "50688887777"),
            OM.readTree("{\"items\":[{\"productoId\":5,\"cantidad\":1}]}"));

        assertThat(r.esError()).isTrue();
        assertThat(r.contenido()).contains("sin stock");
    }

    @Test
    void entradaInvalidaOSinCanalNoLlamaAlServicio() throws Exception {
        assertThat(tool.ejecutar(ctx(MensajeEntrante.Canal.WHATSAPP, "50688887777"),
            OM.readTree("{\"items\":[]}")).esError()).isTrue();
        assertThat(tool.ejecutar(ctx(MensajeEntrante.Canal.WHATSAPP, "50688887777"),
            OM.readTree("{\"items\":[{\"productoId\":\"x\",\"cantidad\":1}]}")).esError()).isTrue();
        assertThat(tool.ejecutar(ctx(null, "50688887777"),
            OM.readTree("{\"items\":[{\"productoId\":5,\"cantidad\":1}]}")).esError()).isTrue();
        verifyNoInteractions(servicio);
    }
}
