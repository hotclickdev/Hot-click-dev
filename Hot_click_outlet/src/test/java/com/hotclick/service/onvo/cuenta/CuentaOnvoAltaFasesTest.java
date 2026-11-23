package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.alta.AltaFasesAvisoService;
import com.hotclick.service.alta.AltaFasesService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.*;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Cuenta ONVO + alta por fases: aviso único, pérdida, recuperación y enlace del dueño")
class CuentaOnvoAltaFasesTest {

    private static final Instant T0 = Instant.parse("2026-11-23T18:00:00Z");
    private static final ZoneId CR = ZoneId.of("America/Costa_Rica");

    EmpresaCuentaOnvoRepository repo = mock(EmpresaCuentaOnvoRepository.class);
    EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
    OnvoCuentaConectadaClient client = mock(OnvoCuentaConectadaClient.class);
    AltaFasesService altaFases = mock(AltaFasesService.class);
    AltaFasesAvisoService avisos = mock(AltaFasesAvisoService.class);
    EmpresaCuentaOnvo fila;
    Empresa empresa;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(7L);
        empresa.setNombreComercial("Soda La Esquina");
        empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
        empresa.setAltaPorFases(true);
        fila = new EmpresaCuentaOnvo();
        fila.setEmpresaId(7L);
        fila.setOnvoAccountId("ca_test_7");
        fila.setEstado(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
        fila.setOnboardingUrl("https://onvopay.com/setup/x");
        fila.setOnboardingExpiraEn(LocalDateTime.ofInstant(T0, CR).plusDays(2));
        ReflectionTestUtils.setField(fila, "id", 70L);
        when(repo.findByEmpresaId(7L)).thenReturn(Optional.of(fila));
        when(repo.findById(70L)).thenReturn(Optional.of(fila));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(empresaRepo.findById(7L)).thenReturn(Optional.of(empresa));
    }

    CuentaOnvoService svc(boolean habilitado) {
        CuentaOnvoService s = new CuentaOnvoService(repo, empresaRepo, client, mock(PlatformTransactionManager.class),
            habilitado, Duration.ofDays(7), 50);
        s.setClock(Clock.fixed(T0, CR));
        s.setAltaFases(altaFases, avisos);
        return s;
    }

    void onvoDice(String status) {
        when(client.consultar("ca_test_7")).thenReturn(new OnvoCuentaConectadaClient.CuentaEstado("ca_test_7", status));
    }

    @Test
    @DisplayName("Pasa a ACTIVA: anota activada_en, avisa al admin UNA vez y sincroniza la venta en línea")
    void activaAvisaUnaVez() {
        onvoDice("active");
        when(repo.reclamarAvisoRevision(eq(70L), any())).thenReturn(1);

        assertThat(svc(true).consultar(70L)).isEqualTo(EmpresaCuentaOnvo.ACTIVA);

        assertThat(fila.getActivadaEn()).isNotNull();
        assertThat(fila.getRevisionAvisoEn()).isNotNull();
        verify(avisos, times(1)).avisarRevisionListaAdmin(7L, "Soda La Esquina");
        verify(altaFases).sincronizar(7L, fila);

        // el poller vuelve a correr muchas veces: ni siquiera vuelve a intentar el claim
        for (int i = 0; i < 5; i++) svc(true).consultar(70L);
        verify(avisos, times(1)).avisarRevisionListaAdmin(anyLong(), any());
        verify(repo, times(1)).reclamarAvisoRevision(anyLong(), any());
    }

    @Test
    @DisplayName("Concurrencia: si otro proceso ganó el claim en BD, este no avisa")
    void otroProcesoGanoElClaim() {
        onvoDice("active");
        when(repo.reclamarAvisoRevision(eq(70L), any())).thenReturn(0);
        svc(true).consultar(70L);
        verify(avisos, never()).avisarRevisionListaAdmin(anyLong(), any());
        assertThat(fila.getRevisionAvisoEn()).as("no debe quedar sin marcar para no pisar el claim ajeno").isNotNull();
    }

    @Test
    @DisplayName("Un negocio existente (no por fases) o ya aprobado no genera aviso de revisión")
    void noAvisaSiNoCorresponde() {
        onvoDice("active");
        empresa.setAltaPorFases(false);
        svc(true).consultar(70L);
        empresa.setAltaPorFases(true);
        empresa.setEstadoEmpresa("ACTIVO");
        fila.setEstado(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
        svc(true).consultar(70L);
        verifyNoInteractions(avisos);
        verify(repo, never()).reclamarAvisoRevision(anyLong(), any());
    }

    @Test
    @DisplayName("ACTIVA → SUSPENDIDA/INACTIVA: marca la pérdida, reinicia avisos y sincroniza (pausa cobros)")
    void perdida() {
        for (String status : new String[] {"temporally_suspended", "permanently_suspended", "restricted", "inactive"}) {
            fila.setEstado(EmpresaCuentaOnvo.ACTIVA);
            fila.setPerdidaDesde(null);
            fila.setAvisosPerdida(4);
            onvoDice(status);
            svc(true).consultar(70L);
            assertThat(fila.getPerdidaDesde()).as(status).isEqualTo(LocalDateTime.ofInstant(T0, CR));
            assertThat(fila.getAvisosPerdida()).isZero();
            assertThat(fila.getEstado()).isIn(EmpresaCuentaOnvo.SUSPENDIDA, EmpresaCuentaOnvo.INACTIVA);
        }
        verify(altaFases, times(4)).sincronizar(7L, fila);
        // la pérdida no dispara el aviso de revisión
        verify(avisos, never()).avisarRevisionListaAdmin(anyLong(), any());
    }

    @Test
    @DisplayName("Seguir suspendida no reinicia el contador; volver a ACTIVA deja pendiente el aviso de reanudación una vez")
    void recuperacion() {
        fila.setEstado(EmpresaCuentaOnvo.ACTIVA);
        fila.setActivadaEn(LocalDateTime.ofInstant(T0, CR).minusDays(9));
        fila.setRevisionAvisoEn(LocalDateTime.ofInstant(T0, CR).minusDays(9));
        onvoDice("temporally_suspended");
        svc(true).consultar(70L);
        LocalDateTime desde = fila.getPerdidaDesde();
        fila.setAvisosPerdida(3);
        svc(true).consultar(70L);
        assertThat(fila.getPerdidaDesde()).isEqualTo(desde);
        assertThat(fila.getAvisosPerdida()).isEqualTo(3);

        onvoDice("active");
        svc(true).consultar(70L);
        assertThat(fila.getPerdidaDesde()).isNull();
        assertThat(fila.isRecuperadaAvisoPendiente()).isTrue();
    }

    @Test
    @DisplayName("Error al consultar ONVO no sube ni baja la cuenta (una ACTIVA se mantiene)")
    void errorDeConsultaNoCambiaElEstado() {
        fila.setEstado(EmpresaCuentaOnvo.ACTIVA);
        when(client.consultar("ca_test_7")).thenThrow(new IllegalStateException("timeout"));
        svc(true).consultar(70L);
        assertThat(fila.getEstado()).isEqualTo(EmpresaCuentaOnvo.ACTIVA);
        assertThat(fila.getPerdidaDesde()).isNull();
    }

    @Test
    @DisplayName("Enlace del dueño: vigente se devuelve; vencido se regenera; dominio no permitido o http se descarta")
    void enlaceDelDueno() {
        CuentaOnvoService s = svc(true);
        assertThat(s.onboardingUrlParaDueno(7L)).contains("https://onvopay.com/setup/x");
        verify(client, never()).regenerarOnboarding(any());

        fila.setOnboardingExpiraEn(LocalDateTime.ofInstant(T0, CR).minusHours(1));
        when(client.regenerarOnboarding("ca_test_7")).thenReturn("https://onvopay.com/setup/nuevo");
        assertThat(s.onboardingUrlParaDueno(7L)).contains("https://onvopay.com/setup/nuevo");
        verify(client, times(1)).regenerarOnboarding("ca_test_7");

        fila.setOnboardingUrl("https://evil.example/phish");
        fila.setOnboardingExpiraEn(LocalDateTime.ofInstant(T0, CR).plusDays(1));
        assertThat(s.onboardingUrlParaDueno(7L)).isEmpty();
        fila.setOnboardingUrl("http://onvopay.com/setup/x");
        assertThat(s.onboardingUrlParaDueno(7L)).isEmpty();
    }

    @Test
    @DisplayName("Sin enlace cuando la cuenta está ACTIVA y sana, o cuando ONVO está deshabilitado")
    void sinEnlace() {
        fila.setEstado(EmpresaCuentaOnvo.ACTIVA);
        assertThat(svc(true).onboardingUrlParaDueno(7L)).isEmpty();
        fila.setEstado(EmpresaCuentaOnvo.PENDIENTE_ONBOARDING);
        assertThat(svc(false).onboardingUrlParaDueno(7L)).isEmpty();
        verifyNoInteractions(client);
    }

    @Test
    @DisplayName("Cuenta perdida: el enlace se regenera para corregir; si ONVO responde 'onboarding completado' no se inventa enlace")
    void enlaceParaCorregirPerdida() {
        fila.setEstado(EmpresaCuentaOnvo.SUSPENDIDA);
        fila.setPerdidaDesde(LocalDateTime.ofInstant(T0, CR).minusDays(1));
        fila.setOnboardingUrl(null);
        fila.setOnboardingExpiraEn(null);
        when(client.regenerarOnboarding("ca_test_7")).thenThrow(new OnvoCuentaConectadaClient.OnboardingCompletadoException("x"));
        assertThat(svc(true).onboardingUrlParaDueno(7L)).isEmpty();
        assertThat(fila.getEstado()).as("a pedido del dueño no se cambia el estado").isEqualTo(EmpresaCuentaOnvo.SUSPENDIDA);
    }

    @Test
    @DisplayName("Registro de un negocio nuevo lo deja en borrador (alRegistrar) y crea la cuenta pendiente")
    void registroMarcaBorrador() {
        when(repo.findByEmpresaId(7L)).thenReturn(Optional.empty());
        svc(false).alRegistrarEmpresa(empresa);
        verify(altaFases).alRegistrar(empresa);
        verify(repo).save(any(EmpresaCuentaOnvo.class));
    }
}
