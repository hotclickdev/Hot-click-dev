package com.hotclick.agente.metricas;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.canal.FilaLista;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.conversacion.EstadoConversacion;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.metricas.EncuestaService.Resultado;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static com.hotclick.agente.pago.PagoBotTestSupport.CONTACTO;
import static com.hotclick.agente.pago.PagoBotTestSupport.cuenta;
import static com.hotclick.agente.pago.PagoBotTestSupport.proveedor;
import static com.hotclick.agente.pago.PagoBotTestSupport.sesion;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** AG-38: la encuesta al cerrar y el guardado de la nota (sin el texto de la persona). */
class EncuestaServiceTest {

    private static final Instant AHORA = Instant.parse("2026-12-10T18:00:00Z");

    private ConversacionSesionRepository sesiones;
    private CanalCuentaRepository cuentas;
    private CanalMensajeria canal;
    private ListaBajasAgente bajas;
    private EncuestaService servicio;
    private IdiomaConversacion idiomas;
    private UUID id;
    private ConversacionSesion sesion;
    private CanalCuenta cuenta;

    @BeforeEach
    void init() {
        sesiones = mock(ConversacionSesionRepository.class);
        cuentas = mock(CanalCuentaRepository.class);
        canal = mock(CanalMensajeria.class);
        bajas = mock(ListaBajasAgente.class);
        idiomas = mock(IdiomaConversacion.class);
        servicio = new EncuestaService(sesiones, cuentas, canal, proveedor(bajas), idiomas, Clock.fixed(AHORA, ZoneOffset.UTC));

        id = UUID.randomUUID();
        sesion = sesion(id, AHORA.minusSeconds(600));
        sesion.setEstado(EstadoConversacion.CERRADA);
        sesion.setPerfil(PerfilConversacion.NEGOCIO_VENTAS);
        cuenta = cuenta(EstadoCanal.ACTIVA);
        when(sesiones.findById(id)).thenReturn(Optional.of(sesion));
        when(idiomas.deSesion(id)).thenReturn(Idioma.ES);
        when(cuentas.findById(5L)).thenReturn(Optional.of(cuenta));
        when(bajas.dadosDeBaja(any())).thenReturn(Set.of());
        when(sesiones.reclamarEncuesta(eq(id), any())).thenReturn(1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void alCerrarMandaUnaListaConLasNotasDel1Al5() {
        assertThat(servicio.enviarAlCerrar(id, 7L)).isEqualTo(Resultado.ENVIADA);

        ArgumentCaptor<List<FilaLista>> filas = ArgumentCaptor.forClass(List.class);
        verify(canal).enviarLista(eq(cuenta), eq(CONTACTO), anyString(), anyString(), filas.capture(), eq(Idioma.ES));
        assertThat(filas.getValue()).hasSize(5);
        assertThat(filas.getValue().get(0).id()).isEqualTo("encuesta:" + id + ":1");
        assertThat(filas.getValue().get(4).id()).isEqualTo("encuesta:" + id + ":5");
        verify(sesiones).reclamarEncuesta(id, AHORA);
    }

    @Test
    @SuppressWarnings("unchecked")
    void laEncuestaYElAgradecimientoSalenEnElIdiomaDeLaConversacion() {
        when(idiomas.deSesion(id)).thenReturn(Idioma.EN);
        when(sesiones.guardarNotaEncuesta(eq(id), eq(5), any())).thenReturn(1);

        servicio.enviarAlCerrar(id, 7L);
        ArgumentCaptor<List<FilaLista>> filas = ArgumentCaptor.forClass(List.class);
        verify(canal).enviarLista(eq(cuenta), eq(CONTACTO), eq(TextosFijos.encuestaPregunta(Idioma.EN)),
            eq(TextosFijos.encuestaBoton(Idioma.EN)), filas.capture(), eq(Idioma.EN));
        assertThat(filas.getValue().get(0).titulo()).isEqualTo("1 - Very bad");

        servicio.registrarRespuesta(cuenta, CONTACTO, "encuesta:" + id + ":5");
        verify(canal).enviarTexto(cuenta, CONTACTO, TextosFijos.encuestaGracias(Idioma.EN));
    }

    @Test
    void unaSolaVezPorConversacion() {
        when(sesiones.reclamarEncuesta(eq(id), any())).thenReturn(0);

        assertThat(servicio.enviarAlCerrar(id, 7L)).isEqualTo(Resultado.YA_ENVIADA);
        verify(canal, never()).enviarLista(any(), anyString(), anyString(), anyString(), anyList(), any());
    }

    @Test
    void soloSeMandaSiLaConversacionEstaCerradaYEsDelAlcance() {
        sesion.setEstado(EstadoConversacion.ABIERTA);
        assertThat(servicio.enviarAlCerrar(id, 7L)).isEqualTo(Resultado.NO_APLICA);

        sesion.setEstado(EstadoConversacion.CERRADA);
        assertThat(servicio.enviarAlCerrar(id, 8L)).isEqualTo(Resultado.NO_APLICA);       // otro negocio
        assertThat(servicio.enviarAlCerrar(null, null)).isEqualTo(Resultado.NO_APLICA);   // ADMIN no ve las de un negocio
        sesion.setPerfil(PerfilConversacion.NEGOCIO_INTERNO);
        assertThat(servicio.enviarAlCerrar(id, 7L)).isEqualTo(Resultado.NO_APLICA);
        verify(canal, never()).enviarLista(any(), anyString(), anyString(), anyString(), anyList(), any());
    }

    @Test
    void fueraDeLaVentanaDe24HNoSeMandaNada() {
        sesion.setUltimoMensajeCliente(AHORA.minusSeconds(24 * 3600 + 1));

        assertThat(servicio.enviarAlCerrar(id, 7L)).isEqualTo(Resultado.FUERA_DE_VENTANA);
        verify(sesiones, never()).reclamarEncuesta(any(), any());
    }

    @Test
    void siElContactoSeDioDeBajaNoSeLeEncuesta() {
        when(bajas.dadosDeBaja(any())).thenReturn(Set.of(new ListaBajasAgente.Contacto(7L, "WHATSAPP", CONTACTO)));

        assertThat(servicio.enviarAlCerrar(id, 7L)).isEqualTo(Resultado.EN_BAJA);
        verify(canal, never()).enviarLista(any(), anyString(), anyString(), anyString(), anyList(), any());
    }

    @Test
    void soloWhatsappTieneLista() {
        cuenta.setTipo(MensajeEntrante.Canal.INSTAGRAM);

        assertThat(servicio.enviarAlCerrar(id, 7L)).isEqualTo(Resultado.NO_APLICA);
        verify(canal, never()).enviarLista(any(), anyString(), anyString(), anyString(), anyList(), any());
    }

    @Test
    void siMetaFallaSeLiberaLaReclamacion() {
        doThrow(new IllegalStateException("meta")).when(canal).enviarLista(any(), anyString(), anyString(), anyString(), anyList(), any());

        assertThat(servicio.enviarAlCerrar(id, 7L)).isEqualTo(Resultado.ERROR);
        verify(sesiones).liberarEncuesta(id);
    }

    // ── Respuesta ──────────────────────────────────────────────────────────────

    @Test
    void laRespuestaGuardaSoloLaNotaYAgradece() {
        when(sesiones.guardarNotaEncuesta(eq(id), eq(4), any())).thenReturn(1);

        assertThat(servicio.registrarRespuesta(cuenta, CONTACTO, "encuesta:" + id + ":4")).isTrue();

        verify(sesiones).guardarNotaEncuesta(id, 4, AHORA);
        verify(canal).enviarTexto(cuenta, CONTACTO, TextosFijos.encuestaGracias(Idioma.ES));
    }

    @Test
    void notaBajaRecibeUnAgradecimientoDistinto() {
        when(sesiones.guardarNotaEncuesta(eq(id), eq(1), any())).thenReturn(1);

        servicio.registrarRespuesta(cuenta, CONTACTO, "encuesta:" + id + ":1");

        verify(canal).enviarTexto(cuenta, CONTACTO, TextosFijos.encuestaGraciasNotaBaja(Idioma.ES));
    }

    @Test
    void otroContactoNoPuedeCalificarLaConversacionAjena() {
        assertThat(servicio.registrarRespuesta(cuenta, "otro-contacto", "encuesta:" + id + ":5")).isTrue();

        verify(sesiones, never()).guardarNotaEncuesta(any(), anyInt(), any());
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    void otraCuentaNoPuedeCalificarLaConversacion() {
        CanalCuenta otra = cuenta(EstadoCanal.ACTIVA);
        otra.setId(99L);

        servicio.registrarRespuesta(otra, CONTACTO, "encuesta:" + id + ":5");

        verify(sesiones, never()).guardarNotaEncuesta(any(), anyInt(), any());
    }

    @Test
    void laSegundaRespuestaNoSobrescribeNiVuelveAAgradecer() {
        when(sesiones.guardarNotaEncuesta(eq(id), anyInt(), any())).thenReturn(0);

        assertThat(servicio.registrarRespuesta(cuenta, CONTACTO, "encuesta:" + id + ":2")).isTrue();
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
    }

    @Test
    void unIdQueNoEsDeLaEncuestaNoSeConsume() {
        assertThat(servicio.registrarRespuesta(cuenta, CONTACTO, "comprar:5")).isFalse();
        assertThat(servicio.registrarRespuesta(cuenta, CONTACTO, null)).isFalse();
    }

    @Test
    void idMalFormadoOFueraDeRangoSeConsumeSinGuardar() {
        assertThat(servicio.registrarRespuesta(cuenta, CONTACTO, "encuesta:" + id + ":9")).isTrue();
        assertThat(servicio.registrarRespuesta(cuenta, CONTACTO, "encuesta:no-es-uuid:3")).isTrue();
        assertThat(servicio.registrarRespuesta(cuenta, CONTACTO, "encuesta:" + id)).isTrue();

        verify(sesiones, never()).guardarNotaEncuesta(any(), anyInt(), any());
    }

    @Test
    void elInterceptorConsumeLaRespuestaYNoLaDejaPasarAlBot() {
        when(sesiones.guardarNotaEncuesta(eq(id), eq(5), any())).thenReturn(1);
        InterceptorEncuesta interceptor = new InterceptorEncuesta(servicio);
        MensajeEntrante rta = new MensajeEntrante(MensajeEntrante.Canal.WHATSAPP, "PNID", CONTACTO, null, "wamid.test",
            "interactive", "5 - Excelente", null, 1L, "encuesta:" + id + ":5");
        MensajeEntrante normal = new MensajeEntrante(MensajeEntrante.Canal.WHATSAPP, "PNID", CONTACTO, null,
            "wamid.test2", "text", "hola", null, 1L);
        MensajeEntrante boton = new MensajeEntrante(MensajeEntrante.Canal.WHATSAPP, "PNID", CONTACTO, null,
            "wamid.test3", "interactive", "Comprar", null, 1L, "comprar:5");

        assertThat(interceptor.interceptar(cuenta, rta)).isTrue();
        assertThat(interceptor.interceptar(cuenta, normal)).isFalse();
        assertThat(interceptor.interceptar(cuenta, boton)).isFalse();
        verify(sesiones).guardarNotaEncuesta(id, 5, AHORA);
    }

    @Test
    void siGuardarFallaElInterceptorIgualConsumeElMensaje() {
        when(sesiones.guardarNotaEncuesta(any(), anyInt(), any())).thenThrow(new IllegalStateException("base"));
        InterceptorEncuesta interceptor = new InterceptorEncuesta(servicio);
        MensajeEntrante rta = new MensajeEntrante(MensajeEntrante.Canal.WHATSAPP, "PNID", CONTACTO, null, "wamid.test",
            "interactive", "3 - Regular", null, 1L, "encuesta:" + id + ":3");

        assertThat(interceptor.interceptar(cuenta, rta)).isTrue();
    }
}
