package com.hotclick.agente.onboarding;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.conversacion.ModoConversacion;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.onboarding.OnboardingRepositorio.EmpresaNueva;
import com.hotclick.agente.onboarding.OnboardingRepositorio.LeadNegocio;
import com.hotclick.agente.pago.AvisoUnicoRepository;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static com.hotclick.agente.pago.PagoBotTestSupport.AHORA;
import static com.hotclick.agente.pago.PagoBotTestSupport.AHORA_CR;
import static com.hotclick.agente.pago.PagoBotTestSupport.cuenta;
import static com.hotclick.agente.pago.PagoBotTestSupport.proveedor;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("AG-40: acompañamiento de negocios nuevos")
class OnboardingNegocioServiceTest {

    private static final UUID SESION = UUID.fromString("00000000-0000-0000-0000-0000000000b1");
    private static final String WA_ID = "50688880001";
    private static final long LEAD = 31L;

    private OnboardingRepositorio repo;
    private ConversacionSesionRepository sesiones;
    private CanalCuentaRepository cuentas;
    private AvisoUnicoRepository avisos;
    private OnboardingEnvio envio;
    private ListaBajasAgente bajas;
    private ConversacionSesion conversacion;
    private LeadNegocio lead;

    @BeforeEach
    void setUp() {
        repo = mock(OnboardingRepositorio.class);
        sesiones = mock(ConversacionSesionRepository.class);
        cuentas = mock(CanalCuentaRepository.class);
        avisos = mock(AvisoUnicoRepository.class);
        envio = mock(OnboardingEnvio.class);
        bajas = null;
        conversacion = new ConversacionSesion();
        conversacion.setId(SESION);
        conversacion.setEmpresaId(null);
        conversacion.setCanal("WHATSAPP");
        conversacion.setCanalCuentaId(5L);
        conversacion.setPerfil(PerfilConversacion.HOTCLICK);
        conversacion.setContactoExterno(WA_ID);
        conversacion.setUltimoMensajeCliente(AHORA.minus(Duration.ofHours(2)));
        lead = new LeadNegocio(LEAD, SESION, "CONTACTADO", AHORA_CR.minusHours(5));
        when(repo.leadsNegocio(any(), anyInt())).thenReturn(List.of(lead));
        when(repo.empresasDesde(any(), anyInt())).thenReturn(List.of(empresa(1L, "8888-0001", AHORA_CR.minusHours(1))));
        when(sesiones.findAllById(any())).thenReturn(List.of(conversacion));
        when(cuentas.findAllById(any())).thenReturn(List.of(cuenta(EstadoCanal.ACTIVA)));
        when(avisos.enviados(anyString(), anyCollection())).thenReturn(Map.of());
        when(envio.enviar(anyLong(), any(), any(), any())).thenReturn(true);
    }

    private static EmpresaNueva empresa(long id, String whatsapp, LocalDateTime registrada) {
        return new EmpresaNueva(id, whatsapp.replaceAll("\\D", ""), "", registrada);
    }

    private OnboardingNegocioService servicio() {
        return new OnboardingNegocioService(repo, sesiones, cuentas, avisos, envio, proveedor(bajas), 2);
    }

    @Test
    @DisplayName("al registrarse el negocio el lead pasa a CONVERTIDO y recibe el paso 1 con botón al panel")
    void registroConvierteYEnviaPaso1() {
        int enviados = servicio().barrer(AHORA_CR, AHORA);

        assertThat(enviados).isEqualTo(1);
        verify(repo).marcarConvertidos(List.of(LEAD));
        verify(envio).enviar(eq(LEAD), eq(OnboardingPaso.PERFIL), eq(conversacion), any());
    }

    @Test
    @DisplayName("el vínculo es el contacto: el WhatsApp con 506 coincide con el teléfono local del registro")
    void vinculoPorUltimosOchoDigitos() {
        assertThat(OnboardingNegocioService.finales("+506 8888-0001")).isEqualTo("88880001");
        assertThat(OnboardingNegocioService.finales("50688880001")).isEqualTo("88880001");
        assertThat(OnboardingNegocioService.finales("12345")).isNull();
        assertThat(OnboardingNegocioService.finales(null)).isNull();
    }

    @Test
    @DisplayName("aislamiento: otro número, o una empresa registrada ANTES del lead, no se vincula")
    void sinVinculoNoHaceNada() {
        when(repo.empresasDesde(any(), anyInt())).thenReturn(List.of(
            empresa(2L, "8999-1111", AHORA_CR.minusHours(1)),
            empresa(3L, "8888-0001", AHORA_CR.minusDays(3))));

        assertThat(servicio().barrer(AHORA_CR, AHORA)).isZero();

        verify(repo, never()).marcarConvertidos(any());
        verify(envio, never()).enviar(anyLong(), any(), any(), any());
    }

    @Test
    @DisplayName("fuera de la ventana de 24 h no se manda el paso, pero el lead sí queda CONVERTIDO")
    void fueraDeVentana() {
        conversacion.setUltimoMensajeCliente(AHORA.minus(Duration.ofHours(30)));

        assertThat(servicio().barrer(AHORA_CR, AHORA)).isZero();

        verify(repo).marcarConvertidos(List.of(LEAD));
        verify(envio, never()).enviar(anyLong(), any(), any(), any());
    }

    @Test
    @DisplayName("un contacto de baja (STOP) o una conversación con una persona no reciben pasos")
    void bajaYPersona() {
        bajas = contactos -> Set.copyOf(contactos);
        assertThat(servicio().barrer(AHORA_CR, AHORA)).isZero();

        bajas = null;
        conversacion.setModo(ModoConversacion.PERSONA);
        assertThat(servicio().barrer(AHORA_CR, AHORA)).isZero();

        verify(envio, never()).enviar(anyLong(), any(), any(), any());
    }

    @Test
    @DisplayName("solo el bot de HotClick acompaña: una conversación de un negocio no se usa")
    void soloPerfilHotClick() {
        conversacion.setPerfil(PerfilConversacion.NEGOCIO_VENTAS);

        assertThat(servicio().barrer(AHORA_CR, AHORA)).isZero();
    }

    @Test
    @DisplayName("sin canal activo no se envía")
    void canalInactivo() {
        when(cuentas.findAllById(any())).thenReturn(List.of(cuenta(EstadoCanal.PAUSADA)));

        assertThat(servicio().barrer(AHORA_CR, AHORA)).isZero();
    }

    @Test
    @DisplayName("un paso a la vez: el 2 espera el intervalo y el 3 el siguiente; terminados los 3 no manda más")
    void secuenciaDeTresPasos() {
        Duration intervalo = Duration.ofHours(2);
        Map<OnboardingPaso, Map<Long, Instant>> enviados = new java.util.EnumMap<>(OnboardingPaso.class);

        assertThat(OnboardingNegocioService.siguiente(LEAD, enviados, AHORA, intervalo)).isEqualTo(OnboardingPaso.PERFIL);

        enviados.put(OnboardingPaso.PERFIL, Map.of(LEAD, AHORA.minus(Duration.ofMinutes(30))));
        assertThat(OnboardingNegocioService.siguiente(LEAD, enviados, AHORA, intervalo)).isNull(); // todavía no toca

        enviados.put(OnboardingPaso.PERFIL, Map.of(LEAD, AHORA.minus(Duration.ofHours(3))));
        assertThat(OnboardingNegocioService.siguiente(LEAD, enviados, AHORA, intervalo)).isEqualTo(OnboardingPaso.PRIMER_PRODUCTO);

        enviados.put(OnboardingPaso.PRIMER_PRODUCTO, Map.of(LEAD, AHORA.minus(Duration.ofHours(2))));
        assertThat(OnboardingNegocioService.siguiente(LEAD, enviados, AHORA, intervalo)).isEqualTo(OnboardingPaso.CONECTAR_CANAL);

        enviados.put(OnboardingPaso.CONECTAR_CANAL, Map.of(LEAD, AHORA.minus(Duration.ofHours(1))));
        assertThat(OnboardingNegocioService.siguiente(LEAD, enviados, AHORA, intervalo)).isNull();
    }

    @Test
    @DisplayName("idempotencia: con el paso 1 ya enviado hace poco el barrido repetido no manda nada")
    void barridoRepetidoNoDuplica() {
        when(avisos.enviados(eq("ONB_1"), anyCollection())).thenReturn(Map.of(LEAD, AHORA.minus(Duration.ofMinutes(10))));

        assertThat(servicio().barrer(AHORA_CR, AHORA)).isZero();

        verify(envio, never()).enviar(anyLong(), any(), any(), any());
    }

    @Test
    @DisplayName("los 3 pasos son mensajes con botón a rutas del panel del emprendedor y el toString no expone datos")
    void pasosApuntanAlPanel() {
        assertThat(OnboardingPaso.values()).extracting(OnboardingPaso::ruta)
            .containsExactly("/emprendedor/opciones/perfil", "/emprendedor/productos/nuevo", "/emprendedor/bot");
        assertThat(OnboardingPaso.values()).allSatisfy(p -> assertThat(p.tituloBoton().length()).isLessThanOrEqualTo(20));
        assertThat(lead.toString()).doesNotContain(SESION.toString());
        assertThat(empresa(9L, "8888-0001", AHORA_CR).toString()).doesNotContain("88880001");
    }
}
