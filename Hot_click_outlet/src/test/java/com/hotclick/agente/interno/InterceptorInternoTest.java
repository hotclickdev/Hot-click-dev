package com.hotclick.agente.interno;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.EnrutadorConversaciones;
import com.hotclick.agente.conversacion.RespondedorDespacho;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InterceptorInternoTest {

    private static final long EMPRESA = 7L;
    private static final String TEL = "50660000001";
    private static final Instant AHORA = Instant.parse("2026-12-01T10:00:00Z");

    private VinculacionInternaService vinc;
    private ProcesadorInterno proc;
    private InterceptorInterno interceptor;
    private CanalCuenta cuenta;

    @BeforeEach
    void init() {
        vinc = mock(VinculacionInternaService.class);
        proc = mock(ProcesadorInterno.class);
        when(vinc.ahora()).thenReturn(AHORA);
        interceptor = new InterceptorInterno(vinc, proc);
        cuenta = new CanalCuenta();
        cuenta.setId(1L);
        cuenta.setTipo(Canal.WHATSAPP);
        cuenta.setEmpresaId(EMPRESA);
    }

    private MensajeEntrante msg(String texto) {
        return new MensajeEntrante(Canal.WHATSAPP, "PNID", TEL, "Nombre", "wamid.1", "text", texto, null, 1L);
    }

    private AgenteVinculacion activaConPendiente(String tipo, Instant expira) {
        AgenteVinculacion v = new AgenteVinculacion();
        v.setId(5L);
        v.setEstado(AgenteVinculacion.ACTIVA);
        v.setPendiente(tipo, "{}", expira);
        when(vinc.vinculacionActiva(EMPRESA, TEL)).thenReturn(Optional.of(v));
        return v;
    }

    @Test
    void codigoConPalabraVincularSiempreSeConsume() {
        assertThat(interceptor.interceptar(cuenta, msg("vincular ab23cd45"))).isTrue();
        verify(proc).activar(cuenta, TEL, "AB23CD45");
    }

    @Test
    void codigoSoloSeConsumeSiHayUnoVigenteEnEseNegocio() {
        when(vinc.existeCodigoVigente(EMPRESA, "AB23CD45")).thenReturn(false);
        assertThat(interceptor.interceptar(cuenta, msg("AB23CD45"))).isFalse();
        verify(proc, never()).activar(any(), anyString(), anyString());

        when(vinc.existeCodigoVigente(EMPRESA, "AB23CD45")).thenReturn(true);
        assertThat(interceptor.interceptar(cuenta, msg("AB23CD45"))).isTrue();
        verify(proc).activar(cuenta, TEL, "AB23CD45");
    }

    @Test
    void clienteQueEscribeUnNumeroNoSeToca() {
        when(vinc.vinculacionActiva(EMPRESA, TEL)).thenReturn(Optional.empty());
        assertThat(interceptor.interceptar(cuenta, msg("1234"))).isFalse();
        verify(proc, never()).pin(any(), anyString(), anyString());
    }

    @Test
    void soloWhatsappDeUnNegocio() {
        cuenta.setTipo(Canal.INSTAGRAM);
        assertThat(interceptor.interceptar(cuenta, msg("VINCULAR AB23CD45"))).isFalse();
        cuenta.setTipo(Canal.WHATSAPP);
        cuenta.setEmpresaId(null);
        assertThat(interceptor.interceptar(cuenta, msg("VINCULAR AB23CD45"))).isFalse();
        assertThat(interceptor.interceptar(cuenta, msg(null))).isFalse();
    }

    @Test
    void siYNoConfirmanOCancelanLaPropuesta() {
        activaConPendiente(AgenteVinculacion.PEND_CONFIRMAR, AHORA.plus(Duration.ofMinutes(3)));
        assertThat(interceptor.interceptar(cuenta, msg("Sí"))).isTrue();
        verify(proc).confirmar(cuenta, TEL);
        assertThat(interceptor.interceptar(cuenta, msg(" NO. "))).isTrue();
        verify(proc).cancelar(cuenta, TEL);
    }

    @Test
    void otroTemaAbandonaLaEsperaYSigueSuCamino() {
        activaConPendiente(AgenteVinculacion.PEND_CONFIRMAR, AHORA.plus(Duration.ofMinutes(3)));
        assertThat(interceptor.interceptar(cuenta, msg("cuántas ventas hubo hoy"))).isFalse();
        verify(vinc).limpiarPendiente(5L);
    }

    @Test
    void esperaVencidaSeLimpiaYNoConsumeNada() {
        activaConPendiente(AgenteVinculacion.PEND_CONFIRMAR, AHORA.minusSeconds(1));
        assertThat(interceptor.interceptar(cuenta, msg("sí"))).isFalse();
        verify(vinc).limpiarPendiente(5L);
        verify(proc, never()).confirmar(any(), anyString());
    }

    @Test
    void elPinSeConsumeSoloMientrasSeEsperaYNoSeGuarda() {
        activaConPendiente(AgenteVinculacion.PEND_PIN_ACCION, AHORA.plus(Duration.ofMinutes(3)));
        assertThat(interceptor.interceptar(cuenta, msg("4827"))).isTrue();
        verify(proc).pin(cuenta, TEL, "4827");
        // Texto que no es PIN durante la espera: se abandona y sigue normal.
        assertThat(interceptor.interceptar(cuenta, msg("hola"))).isFalse();
    }

    @Test
    void sinEsperaUnNumeroDeCuatroDigitosNoEsPin() {
        AgenteVinculacion v = new AgenteVinculacion();
        v.setId(5L);
        when(vinc.vinculacionActiva(EMPRESA, TEL)).thenReturn(Optional.of(v));
        assertThat(interceptor.interceptar(cuenta, msg("4827"))).isFalse();
        verify(proc, never()).pin(any(), anyString(), anyString());
    }

    // ── El enrutador respeta al interceptor: lo consumido no se guarda ni llega al motor ──────────

    @SuppressWarnings("unchecked")
    @Test
    void enrutadorNoGuardaNiDespachaLoConsumido() {
        CanalCuentaService cuentas = mock(CanalCuentaService.class);
        when(cuentas.buscar(Canal.WHATSAPP, "PNID")).thenReturn(Optional.of(cuenta));
        cuenta.setEstado(com.hotclick.agente.canal.EstadoCanal.ACTIVA);
        ConversacionService conversaciones = mock(ConversacionService.class);
        RespondedorDespacho despacho = mock(RespondedorDespacho.class);
        ObjectProvider<com.hotclick.agente.conversacion.spi.InterceptorMensajeEntrante> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(interceptor);
        EnrutadorConversaciones enrutador = new EnrutadorConversaciones(cuentas, conversaciones, despacho, provider);

        activaConPendiente(AgenteVinculacion.PEND_PIN_FINANZAS, AHORA.plus(Duration.ofMinutes(3)));
        enrutador.manejar(msg("4827"));

        verify(proc).pin(cuenta, TEL, "4827");
        verify(conversaciones, never()).registrarEntrante(any(), any());
        verify(despacho, never()).despachar(any(ConversacionActiva.class), any());
    }
}
