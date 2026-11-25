package com.hotclick.agente.comprobante;

import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.comprobante.ComprobanteBotRepositorio.ContextoComprobante;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionMensajeRepository;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.pago.AvisoUnicoRepository;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import com.hotclick.service.facturacion.ComprobanteEmitidoEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static com.hotclick.agente.pago.PagoBotTestSupport.AHORA;
import static com.hotclick.agente.pago.PagoBotTestSupport.CONTACTO;
import static com.hotclick.agente.pago.PagoBotTestSupport.cuenta;
import static com.hotclick.agente.pago.PagoBotTestSupport.proveedor;
import static com.hotclick.agente.pago.PagoBotTestSupport.sesion;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@DisplayName("AG-34: aviso del comprobante por el chat")
class AvisoComprobanteServiceTest {

    private static final UUID SESION = UUID.fromString("00000000-0000-0000-0000-0000000000a1");
    private static final long COMPROBANTE = 900L;

    private ComprobanteBotRepositorio comprobantes;
    private ConversacionSesionRepository sesiones;
    private ConversacionMensajeRepository mensajes;
    private CanalCuentaRepository cuentas;
    private CanalMensajeria canal;
    private ConversacionService conversaciones;
    private AvisoUnicoRepository avisos;
    private ListaBajasAgente bajas;
    private ConversacionSesion conversacion;

    @BeforeEach
    void setUp() {
        comprobantes = mock(ComprobanteBotRepositorio.class);
        sesiones = mock(ConversacionSesionRepository.class);
        mensajes = mock(ConversacionMensajeRepository.class);
        cuentas = mock(CanalCuentaRepository.class);
        canal = mock(CanalMensajeria.class);
        conversaciones = mock(ConversacionService.class);
        avisos = mock(AvisoUnicoRepository.class);
        bajas = null;
        conversacion = sesion(SESION, AHORA.minus(Duration.ofHours(3)));
        when(comprobantes.contexto(COMPROBANTE)).thenReturn(Optional.of(new ContextoComprobante(COMPROBANTE, "HC-0001", SESION)));
        when(sesiones.findById(SESION)).thenReturn(Optional.of(conversacion));
        when(cuentas.findById(5L)).thenReturn(Optional.of(cuenta(EstadoCanal.ACTIVA)));
        when(mensajes.findTop20BySesionIdOrderByIdDesc(SESION)).thenReturn(List.of());
        when(avisos.reclamar("COMPROBANTE", COMPROBANTE)).thenReturn(true, false);
    }

    private AvisoComprobanteService servicio() {
        AvisoComprobanteService s = new AvisoComprobanteService(comprobantes, sesiones, mensajes, cuentas, canal,
            conversaciones, avisos, proveedor(bajas));
        s.reloj = () -> AHORA;
        return s;
    }

    @Test
    @DisplayName("dentro de la ventana manda el aviso a la conversación del enlace, lo guarda y no expone enlace ni XML")
    void dentroDeLaVentanaEnvia() {
        assertThat(servicio().alEmitir(COMPROBANTE)).isTrue();

        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(canal).enviarTexto(any(), eq(CONTACTO), texto.capture());
        assertThat(texto.getValue()).contains("HC-0001").contains("comprobante electrónico")
            .doesNotContain("http").doesNotContain(".xml").doesNotContain(".pdf");
        verify(conversaciones).registrarSalienteBot(eq(SESION), eq(7L), eq(texto.getValue()));
    }

    @Test
    @DisplayName("idempotencia: el mismo comprobante dos veces (evento repetido) manda un solo aviso")
    void unaSolaVezPorComprobante() {
        AvisoComprobanteService s = servicio();

        assertThat(s.alEmitir(COMPROBANTE)).isTrue();
        assertThat(s.alEmitir(COMPROBANTE)).isFalse();

        verify(canal, times(1)).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    @DisplayName("fuera de la ventana de 24 h no manda nada (ni plantilla) y no consume el aviso")
    void fueraDeVentanaNoEnvia() {
        conversacion.setUltimoMensajeCliente(AHORA.minus(Duration.ofHours(25)));

        assertThat(servicio().alEmitir(COMPROBANTE)).isFalse();

        verifyNoInteractions(canal);
        verify(avisos, never()).reclamar(anyString(), anyLong());
    }

    @Test
    @DisplayName("un contacto de baja (STOP) no recibe el aviso")
    void contactoDeBajaNoRecibe() {
        bajas = contactos -> Set.copyOf(contactos);

        assertThat(servicio().alEmitir(COMPROBANTE)).isFalse();

        verifyNoInteractions(canal);
        verify(avisos, never()).reclamar(anyString(), anyLong());
    }

    @Test
    @DisplayName("aislamiento: un comprobante de un pedido que no es del bot (o una nota de crédito) no toca ninguna conversación")
    void pedidoQueNoEsDelBotNoHaceNada() {
        when(comprobantes.contexto(5L)).thenReturn(Optional.empty());

        assertThat(servicio().alEmitir(5L)).isFalse();

        verifyNoInteractions(sesiones, canal, avisos);
    }

    @Test
    @DisplayName("si Meta falla se devuelve el reclamo para poder reintentar y no se propaga el error")
    void falloDelCanalLiberaElReclamo() {
        doThrow(new IllegalStateException("caído")).when(canal).enviarTexto(any(), anyString(), anyString());

        assertThat(servicio().alEmitir(COMPROBANTE)).isFalse();

        verify(avisos).liberar("COMPROBANTE", COMPROBANTE);
        verify(conversaciones, never()).registrarSalienteBot(any(), any(), anyString());
    }

    @Test
    @DisplayName("un cliente que escribió en inglés recibe el aviso en inglés")
    void avisoEnElIdiomaDelCliente() {
        ConversacionMensaje m = new ConversacionMensaje();
        m.setRol(ConversacionMensaje.ROL_CLIENTE);
        m.setContenido("Hello, I want to buy two bags please");
        when(mensajes.findTop20BySesionIdOrderByIdDesc(SESION)).thenReturn(List.of(m));

        servicio().alEmitir(COMPROBANTE);

        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(canal).enviarTexto(any(), anyString(), texto.capture());
        assertThat(texto.getValue()).startsWith("Your electronic receipt");
    }

    @Test
    @DisplayName("el listener solo delega el id del comprobante y absorbe cualquier fallo")
    void listenerAbsorbeFallos() {
        AvisoComprobanteService s = mock(AvisoComprobanteService.class);
        ComprobanteBotListener l = new ComprobanteBotListener(s);
        doThrow(new IllegalStateException("x")).when(s).alEmitir(COMPROBANTE);

        l.alEmitir(new ComprobanteEmitidoEvent(COMPROBANTE));
        l.alEmitir(new ComprobanteEmitidoEvent(null));
        l.alEmitir(null);

        verify(s, times(1)).alEmitir(anyLong());
    }

    @Test
    @DisplayName("el contexto no expone el número de pedido en toString")
    void toStringSeguro() {
        assertThat(new ContextoComprobante(1L, "HC-9999", SESION).toString()).doesNotContain("HC-9999");
    }
}
