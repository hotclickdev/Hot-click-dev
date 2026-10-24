package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.ResourceAccessException;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Cuenta conectada ONVO por empresa — fail-closed y polling")
class CuentaOnvoServiceTest {

    private static final Instant T0 = Instant.parse("2026-10-23T18:00:00Z");
    private static final ZoneId CR = ZoneId.of("America/Costa_Rica");

    private EmpresaCuentaOnvoRepository repo;
    private EmpresaRepository empresaRepo;
    private OnvoCuentaConectadaClient client;
    private EmpresaCuentaOnvo fila;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        repo = mock(EmpresaCuentaOnvoRepository.class);
        empresaRepo = mock(EmpresaRepository.class);
        client = mock(OnvoCuentaConectadaClient.class);
        empresa = new Empresa();
        empresa.setId(7L);
        empresa.setNombreEmpresa("Soda La Esquina S.A.");
        empresa.setNombreComercial("Soda La Esquina");
        fila = new EmpresaCuentaOnvo();
        fila.setEmpresaId(7L);
        ReflectionTestUtils.setField(fila, "id", 70L);
        when(repo.findByEmpresaId(7L)).thenReturn(Optional.of(fila));
        when(repo.findById(70L)).thenReturn(Optional.of(fila));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(empresaRepo.findById(7L)).thenReturn(Optional.of(empresa));
    }

    private CuentaOnvoService svc(boolean habilitado) {
        CuentaOnvoService s = new CuentaOnvoService(repo, empresaRepo, client,
            mock(PlatformTransactionManager.class), habilitado, Duration.ofDays(7), 50);
        s.setClock(Clock.fixed(T0, CR));
        return s;
    }

    private LocalDateTime ahora() { return LocalDateTime.ofInstant(T0, CR); }

    @Test
    @DisplayName("Registro con ONVO OK: guarda id, onboardingUrl y vence a los 7 días (configurable)")
    void registroOnvoOk() {
        when(client.crear("Soda La Esquina")).thenReturn(
            new OnvoCuentaConectadaClient.CuentaCreada("cl_abc123", "pending_onboarding", "https://onvopay.com/setup/x"));

        assertThat(svc(true).intentarCrear(7L)).isEqualTo(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
        assertThat(fila.getOnvoAccountId()).isEqualTo("cl_abc123");
        assertThat(fila.getOnboardingUrl()).isEqualTo("https://onvopay.com/setup/x");
        assertThat(fila.getOnboardingExpiraEn()).isEqualTo(ahora().plusDays(7));
        assertThat(fila.isActiva()).isFalse();
    }

    @Test
    @DisplayName("Vigencia del onboarding sale de config, no está fija")
    void vigenciaConfigurable() {
        CuentaOnvoService s = new CuentaOnvoService(repo, empresaRepo, client,
            mock(PlatformTransactionManager.class), true, Duration.ofHours(36), 50);
        s.setClock(Clock.fixed(T0, CR));
        when(client.crear(anyString())).thenReturn(
            new OnvoCuentaConectadaClient.CuentaCreada("cl_1", "pending_onboarding", "https://onvopay.com/setup/y"));
        s.intentarCrear(7L);
        assertThat(fila.getOnboardingExpiraEn()).isEqualTo(ahora().plusHours(36));
    }

    @Test
    @DisplayName("ONVO con error: queda PENDIENTE_ONVO, cuenta intento y nunca activa")
    void onvoError() {
        when(client.crear(anyString())).thenThrow(new ResourceAccessException("timeout"));
        assertThat(svc(true).intentarCrear(7L)).isEqualTo(EmpresaCuentaOnvo.PENDIENTE_ONVO);
        assertThat(fila.getIntentos()).isEqualTo(1);
        assertThat(fila.getOnvoAccountId()).isNull();
        assertThat(svc(true).onBehalfOfPara(empresa)).isNull();
    }

    @Test
    @DisplayName("Sin llave: PENDIENTE_ONVO sin inventar cuenta")
    void sinLlave() {
        when(client.crear(anyString())).thenThrow(new OnvoCuentaConectadaClient.OnvoNoConfiguradoException("x"));
        assertThat(svc(true).intentarCrear(7L)).isEqualTo(EmpresaCuentaOnvo.PENDIENTE_ONVO);
        assertThat(fila.getOnvoAccountId()).isNull();
    }

    @Test
    @DisplayName("ONVO deshabilitado: no llama a ONVO y queda PENDIENTE_ONVO")
    void deshabilitado() {
        assertThat(svc(false).intentarCrear(7L)).isEqualTo(EmpresaCuentaOnvo.PENDIENTE_ONVO);
        verifyNoInteractions(client);
    }

    @Test
    @DisplayName("alRegistrarEmpresa nunca lanza hacia el registro aunque ONVO falle")
    void registroNoSeCae() {
        when(repo.findByEmpresaId(7L)).thenReturn(Optional.empty()).thenReturn(Optional.of(fila));
        when(client.crear(anyString())).thenThrow(new RuntimeException("500"));
        assertThatCode(() -> svc(true).alRegistrarEmpresa(empresa)).doesNotThrowAnyException();
        verify(repo, atLeastOnce()).save(argThat(c -> c.getEmpresaId().equals(7L)));
        assertThat(fila.getEstado()).isEqualTo(EmpresaCuentaOnvo.PENDIENTE_ONVO);
    }

    @Test
    @DisplayName("Poller: reintenta PENDIENTE_ONVO y pasa pending → ACTIVA con GET")
    void pollerTransiciones() {
        CuentaOnvoService s = svc(true);
        when(repo.findByEstadoInOrderByActualizadoEnAsc(eq(CuentaOnvoService.ESTADOS_POR_CREAR), any()))
            .thenReturn(List.of(fila));
        when(repo.findByEstadoInOrderByActualizadoEnAsc(eq(CuentaOnvoService.ESTADOS_POR_CONSULTAR), any()))
            .thenReturn(List.of(fila));
        when(client.crear(anyString())).thenReturn(
            new OnvoCuentaConectadaClient.CuentaCreada("cl_abc123", "pending_onboarding", "https://onvopay.com/setup/x"));
        when(client.consultar("cl_abc123")).thenReturn(new OnvoCuentaConectadaClient.CuentaEstado("cl_abc123", "active"));

        s.ciclo();

        assertThat(fila.getEstado()).isEqualTo(EmpresaCuentaOnvo.ACTIVA);
        assertThat(s.onBehalfOfPara(empresa)).isEqualTo("cl_abc123");
    }

    @Test
    @DisplayName("GET con error nunca sube a ACTIVA")
    void getErrorNoActiva() {
        fila.setOnvoAccountId("cl_abc123");
        fila.setEstado(EmpresaCuentaOnvo.EN_APROBACION);
        when(client.consultar(anyString())).thenThrow(new ResourceAccessException("x"));
        assertThat(svc(true).consultar(70L)).isEqualTo(EmpresaCuentaOnvo.EN_APROBACION);
        assertThat(svc(true).onBehalfOfPara(empresa)).isNull();
    }

    @Test
    @DisplayName("onboardingUrl vencido: se regenera con POST onboarding-link y renueva vencimiento")
    void onboardingVencidoRegenera() {
        fila.setOnvoAccountId("cl_abc123");
        fila.setEstado(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
        fila.setOnboardingUrl("https://onvopay.com/setup/viejo");
        fila.setOnboardingExpiraEn(ahora().minusMinutes(1));
        when(client.consultar(anyString())).thenReturn(new OnvoCuentaConectadaClient.CuentaEstado("cl_abc123", "pending_onboarding"));
        when(client.regenerarOnboarding("cl_abc123")).thenReturn("https://onvopay.com/setup/nuevo");

        CuentaOnvoService s = svc(true);
        assertThat(s.onboardingUrlVigente(7L)).isEmpty();
        s.consultar(70L);
        assertThat(fila.getOnboardingUrl()).isEqualTo("https://onvopay.com/setup/nuevo");
        assertThat(fila.getOnboardingExpiraEn()).isEqualTo(ahora().plusDays(7));
        assertThat(s.onboardingUrlVigente(7L)).contains("https://onvopay.com/setup/nuevo");
    }

    @Test
    @DisplayName("onboardingUrl vigente: no se regenera")
    void onboardingVigenteNoRegenera() {
        fila.setOnvoAccountId("cl_abc123");
        fila.setEstado(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
        fila.setOnboardingUrl("https://onvopay.com/setup/x");
        fila.setOnboardingExpiraEn(ahora().plusDays(1));
        when(client.consultar(anyString())).thenReturn(new OnvoCuentaConectadaClient.CuentaEstado("cl_abc123", "pending_onboarding"));
        svc(true).consultar(70L);
        verify(client, never()).regenerarOnboarding(anyString());
    }

    @Test
    @DisplayName("Vencido y regenerar falla: se descarta el enlace vencido, sigue pendiente")
    void onboardingVencidoFalla() {
        fila.setOnvoAccountId("cl_abc123");
        fila.setEstado(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
        fila.setOnboardingUrl("https://onvopay.com/setup/viejo");
        fila.setOnboardingExpiraEn(ahora().minusDays(1));
        when(client.consultar(anyString())).thenReturn(new OnvoCuentaConectadaClient.CuentaEstado("cl_abc123", "pending_onboarding"));
        when(client.regenerarOnboarding(anyString())).thenThrow(new ResourceAccessException("x"));
        svc(true).consultar(70L);
        assertThat(fila.getOnboardingUrl()).isNull();
        assertThat(fila.getEstado()).isEqualTo(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
    }

    @Test
    @DisplayName("Vencido y ONVO responde 409 (onboarding completo): pasa a EN_APROBACION")
    void onboardingVencidoCompletado() {
        fila.setOnvoAccountId("cl_abc123");
        fila.setEstado(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
        fila.setOnboardingUrl("https://onvopay.com/setup/viejo");
        fila.setOnboardingExpiraEn(ahora().minusDays(1));
        when(client.consultar(anyString())).thenReturn(new OnvoCuentaConectadaClient.CuentaEstado("cl_abc123", "pending_onboarding"));
        when(client.regenerarOnboarding(anyString())).thenThrow(new OnvoCuentaConectadaClient.OnboardingCompletadoException("x"));
        svc(true).consultar(70L);
        assertThat(fila.getEstado()).isEqualTo(EmpresaCuentaOnvo.EN_APROBACION);
    }

    @Test
    @DisplayName("onBehalfOf solo con ACTIVA; pendiente, en aprobación, suspendida o sin fila → null")
    void onBehalfOfSoloActiva() {
        CuentaOnvoService s = svc(true);
        fila.setOnvoAccountId("cl_abc123");
        for (String e : List.of(EmpresaCuentaOnvo.PENDIENTE_ONVO, EmpresaCuentaOnvo.PENDIENTE_ONBOARDING,
                EmpresaCuentaOnvo.EN_APROBACION, EmpresaCuentaOnvo.SUSPENDIDA, EmpresaCuentaOnvo.INACTIVA)) {
            fila.setEstado(e);
            assertThat(s.onBehalfOfPara(empresa)).as(e).isNull();
        }
        fila.setEstado(EmpresaCuentaOnvo.ACTIVA);
        assertThat(s.onBehalfOfPara(empresa)).isEqualTo("cl_abc123");
        when(repo.findByEmpresaId(7L)).thenReturn(Optional.empty());
        assertThat(s.onBehalfOfPara(empresa)).isNull();
    }

    @Test
    @DisplayName("Mapeo de estados ONVO: solo 'active' es ACTIVA; desconocido → INACTIVA")
    void mapeo() {
        assertThat(CuentaOnvoService.mapear("active")).isEqualTo(EmpresaCuentaOnvo.ACTIVA);
        assertThat(CuentaOnvoService.mapear("awaiting_approval")).isEqualTo(EmpresaCuentaOnvo.EN_APROBACION);
        assertThat(CuentaOnvoService.mapear("temporally_suspended")).isEqualTo(EmpresaCuentaOnvo.SUSPENDIDA);
        assertThat(CuentaOnvoService.mapear("algo_nuevo")).isEqualTo(EmpresaCuentaOnvo.INACTIVA);
        assertThat(CuentaOnvoService.mapear("ACTIVEX")).isEqualTo(EmpresaCuentaOnvo.INACTIVA);
    }

    @Test
    @DisplayName("businessName respeta el máximo de 50 de ONVO")
    void businessNameMax() {
        empresa.setNombreComercial("x".repeat(80));
        assertThat(CuentaOnvoService.businessName(empresa)).hasSize(50);
    }
}
