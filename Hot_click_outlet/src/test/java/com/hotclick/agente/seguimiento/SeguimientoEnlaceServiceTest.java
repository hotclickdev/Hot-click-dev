package com.hotclick.agente.seguimiento;

import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.conversacion.ModoConversacion;
import com.hotclick.agente.enlace.EnlaceCompra;
import com.hotclick.agente.enlace.EnlaceCompraEstado;
import com.hotclick.agente.enlace.EnlaceCompraEstadoService;
import com.hotclick.agente.enlace.EnlaceCompraRepository;
import com.hotclick.agente.pago.AvisoFueraDeVentana;
import com.hotclick.agente.pago.EnvioConversacion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static com.hotclick.agente.pago.PagoBotTestSupport.AHORA;
import static com.hotclick.agente.pago.PagoBotTestSupport.AHORA_CR;
import static com.hotclick.agente.pago.PagoBotTestSupport.CONTACTO;
import static com.hotclick.agente.pago.PagoBotTestSupport.cuenta;
import static com.hotclick.agente.pago.PagoBotTestSupport.enlace;
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

/** AG-12: recordatorios (tiempos, máximo, baja STOP y ventana de 24 h). */
class SeguimientoEnlaceServiceTest {

    private static final UUID SESION = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private EnlaceCompraRepository enlaces;
    private ConversacionSesionRepository sesiones;
    private CanalCuentaRepository cuentas;
    private EnlaceCompraEstadoService estado;
    private CanalMensajeria canal;
    private ConversacionSesion conversacion;
    private ListaBajasAgente bajas;
    private SeguimientoEnlaceService servicio;

    @BeforeEach
    void setUp() {
        enlaces = mock(EnlaceCompraRepository.class);
        sesiones = mock(ConversacionSesionRepository.class);
        cuentas = mock(CanalCuentaRepository.class);
        estado = mock(EnlaceCompraEstadoService.class);
        canal = mock(CanalMensajeria.class);
        bajas = null;
        conversacion = sesion(SESION, AHORA.minus(Duration.ofHours(3)));
        when(sesiones.findAllById(any())).thenReturn(List.of(conversacion));
        when(cuentas.findAllById(any())).thenReturn(List.of(cuenta(EstadoCanal.ACTIVA)));
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of());
        when(enlaces.paraRecordatorio2(any(), any(), any())).thenReturn(List.of());
        armar();
    }

    private void armar() {
        EnvioConversacion envio = new EnvioConversacion(canal, mock(ConversacionService.class),
            proveedor(mock(AvisoFueraDeVentana.class)));
        servicio = new SeguimientoEnlaceService(enlaces, sesiones, cuentas, estado, envio, proveedor(bajas),
            120, 30, "https://hotclick.example");
    }

    private EnlaceCompra creadoHaceDosHoras() {
        return enlace(1L, EnlaceCompraEstado.CREADO, SESION, AHORA_CR.minusHours(2).minusMinutes(1));
    }

    private EnlaceCompra abiertoHaceMediaHora() {
        EnlaceCompra e = enlace(2L, EnlaceCompraEstado.ABIERTO, SESION, AHORA_CR.minusHours(1));
        e.setAbierto(AHORA_CR.minusMinutes(31));
        return e;
    }

    @Test
    void consultaConLosLimitesDeTiempoCorrectos() {
        servicio.barrer(AHORA_CR, AHORA);

        verify(enlaces).paraRecordatorio1(eq(AHORA_CR.minusHours(2)), eq(AHORA_CR), any());
        verify(enlaces).paraRecordatorio2(eq(AHORA_CR.minusMinutes(30)), eq(AHORA_CR), any());
    }

    @Test
    void recordatorio1ParaEnlaceSinAbrirSeEnviaYSeCuenta() {
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(creadoHaceDosHoras()));

        int enviados = servicio.barrer(AHORA_CR, AHORA);

        assertThat(enviados).isEqualTo(1);
        verify(canal).enviarTexto(any(), eq(CONTACTO), anyString());
        verify(estado).registrarRecordatorio(1L);
    }

    @Test
    void recordatorio2ParaEnlaceAbiertoSinPagarMarcaElCheckout() {
        when(enlaces.paraRecordatorio2(any(), any(), any())).thenReturn(List.of(abiertoHaceMediaHora()));

        int enviados = servicio.barrer(AHORA_CR, AHORA);

        assertThat(enviados).isEqualTo(1);
        verify(estado).registrarRecordatorioCheckout(2L, AHORA_CR);
        verify(estado, never()).registrarRecordatorio(any());
    }

    @Test
    void conDosRecordatoriosYaEnviadosNoMandaMas() {
        EnlaceCompra e = abiertoHaceMediaHora();
        e.setRecordatoriosEnviados(2);
        when(enlaces.paraRecordatorio2(any(), any(), any())).thenReturn(List.of(e));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    void contactoDeBajaStopNoRecibeNada() {
        bajas = contactos -> Set.copyOf(contactos);
        armar();
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(creadoHaceDosHoras()));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(estado, never()).registrarRecordatorio(any());
    }

    @Test
    void sinListaDeBajasPorDefectoNadieEstaDeBaja() {
        assertThat(ListaBajasAgente.NINGUNA.dadosDeBaja(List.of(
            new ListaBajasAgente.Contacto(7L, "WHATSAPP", CONTACTO)))).isEmpty();
    }

    @Test
    void fueraDeLaVentanaDe24hNoEnvia() {
        conversacion.setUltimoMensajeCliente(AHORA.minus(Duration.ofHours(25)));
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(creadoHaceDosHoras()));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(estado, never()).registrarRecordatorio(any());
    }

    @Test
    void conversacionAtendidaPorPersonaNoRecibeRecordatorio() {
        conversacion.setModo(ModoConversacion.PERSONA);
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(creadoHaceDosHoras()));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
    }

    @Test
    void canalNoActivoNoEnvia() {
        when(cuentas.findAllById(any())).thenReturn(List.of(cuenta(EstadoCanal.PAUSADA)));
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(creadoHaceDosHoras()));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
    }

    @Test
    void sinEnlacesPendientesNoConsultaConversaciones() {
        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
        verify(sesiones, never()).findAllById(any());
    }

    @Test
    void unFalloDeEnvioNoFrenaAlSiguienteNiCuentaElRecordatorio() {
        EnlaceCompra a = creadoHaceDosHoras();
        EnlaceCompra b = enlace(3L, EnlaceCompraEstado.CREADO, SESION, AHORA_CR.minusHours(5));
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(a, b));
        when(canal.enviarTexto(any(), anyString(), anyString())).thenThrow(new IllegalStateException("caído"))
            .thenReturn("simulado");

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isEqualTo(1);
        verify(estado, never()).registrarRecordatorio(1L);
        verify(estado).registrarRecordatorio(3L);
    }

    @Test
    void recordatorio1FueraDeLaVentanaUsaLaPlantillaYSeRegistraUnaSolaVez() {
        AvisoFueraDeVentana plantillas = mock(AvisoFueraDeVentana.class);
        when(plantillas.enviar(any(), anyString(), eq(AvisoFueraDeVentana.Tipo.RECORDATORIO_1), any())).thenReturn(true);
        servicio = new SeguimientoEnlaceService(enlaces, sesiones, cuentas, estado,
            new EnvioConversacion(canal, mock(ConversacionService.class), proveedor(plantillas)), proveedor(bajas),
            120, 30, "https://hotclick.example");
        conversacion.setUltimoMensajeCliente(AHORA.minus(Duration.ofHours(25)));
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(creadoHaceDosHoras()));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isEqualTo(1);
        verify(plantillas).enviar(any(), eq(CONTACTO), eq(AvisoFueraDeVentana.Tipo.RECORDATORIO_1), any());
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        verify(estado).registrarRecordatorio(1L);
    }

    @Test
    void recordatorio1FueraDeLaVentanaSinPlantillaNoRegistraNada() {
        conversacion.setUltimoMensajeCliente(AHORA.minus(Duration.ofHours(25)));
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(creadoHaceDosHoras()));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
        verify(estado, never()).registrarRecordatorio(any());
    }

    @Test
    void recordatorio2NuncaSaleDeLaVentanaNiConPlantilla() {
        AvisoFueraDeVentana plantillas = mock(AvisoFueraDeVentana.class);
        when(plantillas.enviar(any(), anyString(), any(), any())).thenReturn(true);
        servicio = new SeguimientoEnlaceService(enlaces, sesiones, cuentas, estado,
            new EnvioConversacion(canal, mock(ConversacionService.class), proveedor(plantillas)), proveedor(bajas),
            120, 30, "https://hotclick.example");
        conversacion.setUltimoMensajeCliente(AHORA.minus(Duration.ofHours(25)));
        when(enlaces.paraRecordatorio2(any(), any(), any())).thenReturn(List.of(abiertoHaceMediaHora()));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
        verify(plantillas, never()).enviar(any(), anyString(), any(), any());
    }

    @Test
    void maximoUnRecordatorioFueraDeVentanaPorEnlace() {
        AvisoFueraDeVentana plantillas = mock(AvisoFueraDeVentana.class);
        when(plantillas.enviar(any(), anyString(), any(), any())).thenReturn(true);
        servicio = new SeguimientoEnlaceService(enlaces, sesiones, cuentas, estado,
            new EnvioConversacion(canal, mock(ConversacionService.class), proveedor(plantillas)), proveedor(bajas),
            120, 30, "https://hotclick.example");
        conversacion.setUltimoMensajeCliente(AHORA.minus(Duration.ofHours(25)));
        EnlaceCompra e = creadoHaceDosHoras();
        e.setRecordatoriosEnviados(1);
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(e));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
        verify(plantillas, never()).enviar(any(), anyString(), any(), any());
    }

    @Test
    void contactoDeBajaNoRecibeNiLaPlantillaFueraDeVentana() {
        AvisoFueraDeVentana plantillas = mock(AvisoFueraDeVentana.class);
        when(plantillas.enviar(any(), anyString(), any(), any())).thenReturn(true);
        bajas = contactos -> Set.copyOf(contactos);
        servicio = new SeguimientoEnlaceService(enlaces, sesiones, cuentas, estado,
            new EnvioConversacion(canal, mock(ConversacionService.class), proveedor(plantillas)), proveedor(bajas),
            120, 30, "https://hotclick.example");
        conversacion.setUltimoMensajeCliente(AHORA.minus(Duration.ofHours(25)));
        when(enlaces.paraRecordatorio1(any(), any(), any())).thenReturn(List.of(creadoHaceDosHoras()));

        assertThat(servicio.barrer(AHORA_CR, AHORA)).isZero();
        verify(plantillas, never()).enviar(any(), anyString(), any(), any());
    }
}
