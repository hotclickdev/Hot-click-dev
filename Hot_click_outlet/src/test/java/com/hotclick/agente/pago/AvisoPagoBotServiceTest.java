package com.hotclick.agente.pago;

import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static com.hotclick.agente.pago.PagoBotTestSupport.AHORA;
import static com.hotclick.agente.pago.PagoBotTestSupport.CONTACTO;
import static com.hotclick.agente.pago.PagoBotTestSupport.cuenta;
import static com.hotclick.agente.pago.PagoBotTestSupport.proveedor;
import static com.hotclick.agente.pago.PagoBotTestSupport.sesion;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** AG-08: lo que el cliente recibe en el chat al pagar o fallar el pago. */
class AvisoPagoBotServiceTest {

    private static final UUID SESION = UUID.fromString("00000000-0000-0000-0000-000000000001");

    private PagoBotTransicion transicion;
    private ConversacionSesionRepository sesiones;
    private CanalCuentaRepository cuentas;
    private ConversacionService conversaciones;
    private CanalMensajeria canal;
    private AvisoFueraDeVentana plantillas;
    private AvisoPagoBotService servicio;
    private ConversacionSesion conversacion;

    @BeforeEach
    void setUp() {
        transicion = mock(PagoBotTransicion.class);
        sesiones = mock(ConversacionSesionRepository.class);
        cuentas = mock(CanalCuentaRepository.class);
        conversaciones = mock(ConversacionService.class);
        canal = mock(CanalMensajeria.class);
        plantillas = mock(AvisoFueraDeVentana.class);
        EnvioConversacion envio = new EnvioConversacion(canal, conversaciones, proveedor(plantillas));
        servicio = new AvisoPagoBotService(transicion, sesiones, cuentas, conversaciones, envio, "https://hotclick.example");
        servicio.reloj = () -> AHORA;
        conversacion = sesion(SESION, AHORA.minusSeconds(3600));
        when(sesiones.findById(SESION)).thenReturn(Optional.of(conversacion));
        when(cuentas.findById(5L)).thenReturn(Optional.of(cuenta(EstadoCanal.ACTIVA)));
    }

    private ContextoPago ctx(int rechazos) {
        return new ContextoPago(42L, 7L, SESION, "CodigoDePrueba42", "HC-0100", 12500, LocalDate.of(2026, 12, 10), rechazos);
    }

    @Test
    void pagadoAvisaNumeroTotalYEntrega() {
        when(transicion.registrarPagado(42L, 100L)).thenReturn(Optional.of(ctx(0)));

        servicio.alPagar(new PedidoBotPagadoEvent(100L, 42L));

        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(canal).enviarTexto(any(), eq(CONTACTO), texto.capture());
        assertThat(texto.getValue()).contains("HC-0100").contains("₡12.500").contains("10 de diciembre");
        verify(conversaciones).registrarSalienteBot(eq(SESION), eq(7L), anyString());
    }

    @Test
    void pagoRepetidoNoAvisaDosVeces() {
        when(transicion.registrarPagado(42L, 100L)).thenReturn(Optional.of(ctx(0))).thenReturn(Optional.empty());

        servicio.alPagar(new PedidoBotPagadoEvent(100L, 42L));
        servicio.alPagar(new PedidoBotPagadoEvent(100L, 42L));

        verify(canal, org.mockito.Mockito.times(1)).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    void primerRechazoOfreceReintentarConElMismoEnlaceYSinpeSinPasarAPersona() {
        when(transicion.registrarRechazado(42L, 100L)).thenReturn(Optional.of(ctx(1)));

        servicio.alRechazar(new PedidoBotRechazadoEvent(100L, 42L));

        ArgumentCaptor<String> texto = ArgumentCaptor.forClass(String.class);
        verify(canal).enviarTexto(any(), eq(CONTACTO), texto.capture());
        assertThat(texto.getValue()).contains("https://hotclick.example/c/CodigoDePrueba42").contains("SINPE");
        verify(conversaciones, never()).pausarBot(any(), any());
    }

    @Test
    void segundoRechazoPasaLaConversacionAPersona() {
        when(transicion.registrarRechazado(42L, 100L)).thenReturn(Optional.of(ctx(2)));

        servicio.alRechazar(new PedidoBotRechazadoEvent(100L, 42L));

        verify(canal).enviarTexto(any(), eq(CONTACTO), anyString());
        verify(conversaciones).pausarBot(SESION, 7L);
    }

    @Test
    void rechazoRepetidoNoAvisaNiPausa() {
        when(transicion.registrarRechazado(42L, 100L)).thenReturn(Optional.empty());

        servicio.alRechazar(new PedidoBotRechazadoEvent(100L, 42L));

        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(conversaciones, never()).pausarBot(any(), any());
    }

    @Test
    void fueraDeVentanaNoMandaTextoLibreYUsaLaInterfazDePlantillas() {
        conversacion.setUltimoMensajeCliente(AHORA.minusSeconds(25 * 3600L));
        when(transicion.registrarPagado(42L, 100L)).thenReturn(Optional.of(ctx(0)));
        when(plantillas.enviar(any(), eq(CONTACTO), eq(AvisoFueraDeVentana.Tipo.PAGO_CONFIRMADO), any())).thenReturn(true);

        servicio.alPagar(new PedidoBotPagadoEvent(100L, 42L));

        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(plantillas).enviar(any(), eq(CONTACTO), eq(AvisoFueraDeVentana.Tipo.PAGO_CONFIRMADO), any());
        verify(transicion, never()).marcarAvisoPendiente(any(), anyString());
    }

    @Test
    void fueraDeVentanaSinPlantillasQuedaPendiente() {
        conversacion.setUltimoMensajeCliente(AHORA.minusSeconds(25 * 3600L));
        EnvioConversacion sinPlantillas = new EnvioConversacion(canal, conversaciones, proveedor(null));
        servicio = new AvisoPagoBotService(transicion, sesiones, cuentas, conversaciones, sinPlantillas, "https://hotclick.example");
        servicio.reloj = () -> AHORA;
        when(transicion.registrarPagado(42L, 100L)).thenReturn(Optional.of(ctx(0)));

        servicio.alPagar(new PedidoBotPagadoEvent(100L, 42L));

        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(transicion).marcarAvisoPendiente(42L, "PAGADO");
    }

    @Test
    void fueraDeVentanaElSegundoRechazoIgualPasaAPersona() {
        conversacion.setUltimoMensajeCliente(AHORA.minusSeconds(25 * 3600L));
        when(transicion.registrarRechazado(42L, 100L)).thenReturn(Optional.of(ctx(2)));

        servicio.alRechazar(new PedidoBotRechazadoEvent(100L, 42L));

        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(conversaciones).pausarBot(SESION, 7L);
    }

    @Test
    void pedidoSinEnlaceNoPublicaNingunEvento() {
        org.springframework.context.ApplicationEventPublisher publisher = mock(org.springframework.context.ApplicationEventPublisher.class);
        Pedido normal = new Pedido();
        normal.setId(1L);

        PedidoBotEventos.publicarPagado(normal, publisher);
        PedidoBotEventos.publicarRechazado(normal, publisher);

        verify(publisher, never()).publishEvent(any(Object.class));
    }

    @Test
    void pedidoConEnlacePublicaElEvento() {
        org.springframework.context.ApplicationEventPublisher publisher = mock(org.springframework.context.ApplicationEventPublisher.class);
        Pedido delBot = new Pedido();
        delBot.setId(100L);
        delBot.setEnlaceCompraId(42L);

        PedidoBotEventos.publicarPagado(delBot, publisher);
        PedidoBotEventos.publicarRechazado(delBot, publisher);

        verify(publisher).publishEvent(new PedidoBotPagadoEvent(100L, 42L));
        verify(publisher).publishEvent(new PedidoBotRechazadoEvent(100L, 42L));
    }
}
