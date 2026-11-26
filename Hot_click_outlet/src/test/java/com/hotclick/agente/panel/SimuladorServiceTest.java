package com.hotclick.agente.panel;

import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ConfigMotorAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.MotivoFin;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.OpcionesMotor;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.motor.TurnoConversacion;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.AiQuotaService;
import com.hotclick.service.ai.UsoTokens;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SimuladorServiceTest {

    private MotorAgente motor;
    private AgenteConfigService config;
    private RateLimiter limiter;
    private AiQuotaService quota;
    private SimuladorService service;

    @BeforeEach
    void init() {
        motor = mock(MotorAgente.class);
        config = new AgenteConfigService(mock(AgenteConfigRepository.class), ConfigMotorAgente.porDefecto(),
            new com.fasterxml.jackson.databind.ObjectMapper());
        limiter = mock(RateLimiter.class);
        quota = mock(AiQuotaService.class);
        when(limiter.tryAcquireEstricto(anyString(), anyInt(), anyInt())).thenReturn(true);
        service = new SimuladorService(motor, config, limiter, quota);
    }

    private static ResultadoAgente respuesta(String texto, List<AccionAgente> acciones) {
        return new ResultadoAgente(texto, acciones, UsoTokens.de(100, 20), 0.001, "m", MotivoFin.COMPLETO, 2);
    }

    @Test
    void usaElPerfilDeVentasDeLaEmpresaSinCanalNiSesionYSinCrearEnlaces() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(respuesta("Hola, ¿en qué le ayudo?", List.of()));

        SimuladorService.Resultado r = service.simular(7L, 3L, "hola", List.of(new SimuladorService.Turno("usuario", "buenas")));

        ArgumentCaptor<ContextoHerramienta> ctx = ArgumentCaptor.forClass(ContextoHerramienta.class);
        ArgumentCaptor<OpcionesMotor> op = ArgumentCaptor.forClass(OpcionesMotor.class);
        ArgumentCaptor<List<TurnoConversacion>> hist = ArgumentCaptor.forClass(List.class);
        verify(motor).ejecutar(eq(PerfilAgente.NEGOCIO_VENTAS), ctx.capture(), hist.capture(), eq("hola"), op.capture());
        assertThat(ctx.getValue().empresaId()).isEqualTo(7L);
        assertThat(ctx.getValue().canal()).isNull();
        assertThat(ctx.getValue().sesionId()).isNull();
        assertThat(op.getValue().excluidas()).contains("crear_enlace_compra");
        assertThat(hist.getValue()).containsExactly(TurnoConversacion.usuario("buenas"));
        assertThat(r.texto()).isEqualTo("Hola, ¿en qué le ayudo?");
        assertThat(r.pasoAPersona()).isFalse();
    }

    @Test
    void marcaElConsumoComoSimuladorParaLaEmpresa() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(respuesta("ok", List.of()));

        service.simular(7L, 3L, "hola", null);

        verify(quota).registrarSimulador(7L, 2, 120L);
    }

    @Test
    void indicaSiElBotPasariaAPersonaSinHacerNada() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any()))
            .thenReturn(respuesta("Le paso con una persona", List.of(AccionAgente.pasarAPersona("x"))));

        assertThat(service.simular(7L, 3L, "quiero un reclamo", null).pasoAPersona()).isTrue();
        // El simulador no depende del canal ni de conversaciones: su constructor ni siquiera los recibe.
    }

    @Test
    void conTopeAlcanzadoNoLlamaAlMotor() {
        when(limiter.tryAcquireEstricto(eq("simulador:usr:3"), anyInt(), anyInt())).thenReturn(false);

        assertThatThrownBy(() -> service.simular(7L, 3L, "hola", null))
            .isInstanceOf(SimuladorService.LimiteSimuladorException.class);
        verify(motor, never()).ejecutar(any(), any(), any(), anyString(), any());
        verify(quota, never()).registrarSimulador(anyLong(), anyInt(), anyLong());
    }

    @Test
    void mensajeVacioOLargoEsInvalido() {
        assertThatThrownBy(() -> service.simular(7L, 3L, "  ", null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.simular(7L, 3L, "x".repeat(501), null)).isInstanceOf(IllegalArgumentException.class);
        verify(motor, never()).ejecutar(any(), any(), any(), anyString(), any());
    }

    @Test
    void historialSeRecortaALosUltimos20Turnos() {
        List<SimuladorService.Turno> mucho = new java.util.ArrayList<>();
        for (int i = 0; i < 30; i++) mucho.add(new SimuladorService.Turno(i % 2 == 0 ? "usuario" : "bot", "t" + i));
        assertThat(SimuladorService.turnos(mucho)).hasSize(20);
    }
}
