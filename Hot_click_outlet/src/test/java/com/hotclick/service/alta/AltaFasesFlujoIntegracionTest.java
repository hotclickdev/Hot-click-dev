package com.hotclick.service.alta;

import com.hotclick.exception.AltaFasesException;
import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.BccrService;
import com.hotclick.service.EmpresaAprobacionService;
import com.hotclick.service.GeminiService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.analytics.PostHogCaptureService;
import com.hotclick.service.onvo.cuenta.CuentaOnvoService;
import com.hotclick.service.onvo.cuenta.OnvoCuentaConectadaClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Flujo completo con base de datos real (H2) y servicios reales: registro → ONVO → revisión HotClick, aviso único
 * (secuencial y concurrente), pérdida de cuenta con recordatorios con tope, reanudación una vez y cobro fail-closed.
 * ONVO y los avisos van simulados (ningún servicio externo, ninguna llave).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
    "payments.onvo.enabled=true",
    "onvo.cuentas.poller.enabled=false"
})
@ActiveProfiles("test")
@DisplayName("[Alta por fases] Flujo real: fases, aviso único, pérdida de cuenta y cobro fail-closed")
class AltaFasesFlujoIntegracionTest {

    static final ZoneId CR = ZoneId.of("America/Costa_Rica");

    @MockitoBean ResendEmailService resendEmailService;
    @MockitoBean NotificacionEmailService notificacionEmailService;
    @MockitoBean SupabaseStorageService supabaseStorageService;
    @MockitoBean BccrService bccrService;
    @MockitoBean GeminiService geminiService;
    @MockitoBean PostHogCaptureService postHogCaptureService;
    @MockitoBean OnvoCuentaConectadaClient onvoClient;
    @MockitoBean AltaFasesAvisoService avisos;

    @Autowired EmpresaRepository empresaRepository;
    @Autowired EmpresaCuentaOnvoRepository cuentaRepository;
    @Autowired CuentaOnvoService cuentaOnvoService;
    @Autowired AltaFasesService altaFases;
    @Autowired AltaFasesSeguimientoService seguimiento;
    @Autowired EmpresaAprobacionService aprobacionService;
    @Autowired org.springframework.transaction.PlatformTransactionManager txManager;

    /** Los UPDATE de claim corren siempre dentro de una transacción (la del poller o la del seguimiento). */
    <T> T enTx(java.util.function.Supplier<T> trabajo) {
        return new org.springframework.transaction.support.TransactionTemplate(txManager).execute(s -> trabajo.get());
    }

    private static final AtomicInteger SEQ = new AtomicInteger();

    @BeforeEach
    void limpiar() {
        reset(avisos, onvoClient);
    }

    Empresa registrar() {
        int n = SEQ.incrementAndGet();
        Empresa e = new Empresa();
        e.setNombreEmpresa("Negocio de prueba " + n);
        e.setNombreComercial("Negocio de prueba " + n);
        e.setSlug("negocio-fases-" + n);
        e.setCorreoEmpresa("negocio" + n + "@test.invalid");
        e.setEstadoEmpresa("PENDIENTE_APROBACION");
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);
        when(onvoClient.crear(anyString())).thenReturn(
            new OnvoCuentaConectadaClient.CuentaCreada("ca_test_f" + n, "pending_onboarding", "https://onvopay.com/setup/f" + n));
        when(onvoClient.consultar("ca_test_f" + n)).thenReturn(new OnvoCuentaConectadaClient.CuentaEstado("ca_test_f" + n, "pending_onboarding"));
        cuentaOnvoService.alRegistrarEmpresa(e);
        return empresaRepository.findById(e.getId()).orElseThrow();
    }

    void onvoDice(Empresa e, String status) {
        EmpresaCuentaOnvo c = cuentaRepository.findByEmpresaId(e.getId()).orElseThrow();
        when(onvoClient.consultar(c.getOnvoAccountId())).thenReturn(new OnvoCuentaConectadaClient.CuentaEstado(c.getOnvoAccountId(), status));
    }

    Long cuentaId(Empresa e) { return cuentaRepository.findByEmpresaId(e.getId()).orElseThrow().getId(); }

    @Test
    @DisplayName("Registro → borrador no publicado; fases 2 y 3; aprobar sin cuenta ACTIVA falla; enlace de ONVO https")
    void registroYFasesIniciales() {
        Empresa e = registrar();
        assertThat(e.isAltaPorFases()).isTrue();
        assertThat(e.isVentaOnlineHabilitada()).isFalse();
        assertThat(e.getEstadoEmpresa()).isEqualTo("PENDIENTE_APROBACION");
        Map<String, Object> estado = altaFases.estadoDe(e.getId());
        assertThat(estado).containsEntry("fase", "PRODUCTOS").containsEntry("publicada", false)
            .containsEntry("cuentaOnvo", "PENDIENTE_ONBOARDING");

        assertThat(cuentaOnvoService.onboardingUrlParaDueno(e.getId())).hasValueSatisfying(u -> assertThat(u).startsWith("https://onvopay.com/"));
        assertThatThrownBy(() -> altaFases.exigirCobroEnLinea(e)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> aprobacionService.aprobarYPublicar(e.getId())).isInstanceOf(AltaFasesException.class);
        assertThat(empresaRepository.findById(e.getId()).orElseThrow().getEstadoEmpresa()).isEqualTo("PENDIENTE_APROBACION");
        verifyNoInteractions(avisos);
    }

    @Test
    @DisplayName("Cuenta ACTIVA → revisión HotClick y UN solo aviso aunque el poller corra muchas veces")
    void avisoUnicoSecuencial() {
        Empresa e = registrar();
        onvoDice(e, "active");
        for (int i = 0; i < 6; i++) cuentaOnvoService.consultar(cuentaId(e));

        verify(avisos, times(1)).avisarRevisionListaAdmin(eq(e.getId()), anyString());
        assertThat(altaFases.estadoDe(e.getId())).containsEntry("fase", "REVISION_HOTCLICK").containsEntry("cuentaActiva", true);
        assertThat(cuentaRepository.findByEmpresaId(e.getId()).orElseThrow().getRevisionAvisoEn()).isNotNull();
    }

    @Test
    @DisplayName("Aviso único bajo concurrencia real: 8 hilos consultando a la vez → exactamente 1 aviso")
    void avisoUnicoConcurrente() throws Exception {
        Empresa e = registrar();
        onvoDice(e, "active");
        Long cuenta = cuentaId(e);
        int hilos = 8;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<?>> fs = new ArrayList<>();
        for (int i = 0; i < hilos; i++) {
            fs.add(pool.submit(() -> {
                salida.await();
                cuentaOnvoService.consultar(cuenta);
                return null;
            }));
        }
        salida.countDown();
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        verify(avisos, times(1)).avisarRevisionListaAdmin(eq(e.getId()), anyString());
    }

    @Test
    @DisplayName("El claim del aviso en BD es atómico: de N intentos simultáneos gana uno")
    void claimAtomico() throws Exception {
        Empresa e = registrar();
        Long cuenta = cuentaId(e);
        int hilos = 8;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Integer>> fs = new ArrayList<>();
        for (int i = 0; i < hilos; i++) {
            fs.add(pool.submit(() -> {
                salida.await();
                return enTx(() -> cuentaRepository.reclamarAvisoRevision(cuenta, LocalDateTime.now()));
            }));
        }
        salida.countDown();
        int ganadores = 0;
        for (Future<Integer> f : fs) ganadores += f.get();
        pool.shutdown();
        assertThat(ganadores).isEqualTo(1);
    }

    @Test
    @DisplayName("Pérdida ACTIVA→SUSPENDIDA: pausa cobros y publicación, avisa admin+dueño, recordatorios cada 24 h con tope, reanuda y avisa una vez")
    void perdidaRecordatoriosYReanudacion() {
        Empresa e = registrar();
        Long id = e.getId();
        onvoDice(e, "active");
        cuentaOnvoService.consultar(cuentaId(e));
        // HotClick lo aprueba (simulado por estado; la aprobación real exige ubicación de despacho, ver pruebas aparte)
        Empresa aprobado = empresaRepository.findById(id).orElseThrow();
        aprobado.setEstadoEmpresa("ACTIVO");
        aprobado.setVisibilidadPublica(true);
        empresaRepository.saveAndFlush(aprobado);
        assertThat(altaFases.puedeCobrarEnLinea(empresaRepository.findById(id).orElseThrow())).isTrue();
        assertThat(altaFases.estadoDe(id)).containsEntry("fase", "PUBLICADA").containsEntry("publicada", true);

        // ONVO suspende la cuenta
        onvoDice(e, "temporally_suspended");
        cuentaOnvoService.consultar(cuentaId(e));
        Empresa perdida = empresaRepository.findById(id).orElseThrow();
        assertThat(perdida.isVentaOnlineHabilitada()).isFalse();
        assertThat(altaFases.puedeCobrarEnLinea(perdida)).isFalse();
        assertThat(altaFases.estadoDe(id)).containsEntry("cuentaPerdida", true).containsEntry("publicada", false);

        // primer aviso en el primer ciclo; ciclos repetidos dentro de las 24 h no duplican
        LocalDateTime t0 = LocalDateTime.now(CR);
        seguimiento.setClock(Clock.fixed(t0.atZone(CR).toInstant(), CR));
        seguimiento.ciclo();
        seguimiento.ciclo();
        verify(avisos, times(1)).avisarPerdida(eq(id), anyString(), eq(1), any());

        // un recordatorio por día hasta el tope (7 avisos en total), nunca más
        for (int dia = 1; dia <= 10; dia++) {
            seguimiento.setClock(Clock.fixed(t0.plusHours(25L * dia).atZone(CR).toInstant(), CR));
            seguimiento.ciclo();
            seguimiento.ciclo();
        }
        verify(avisos, times(7)).avisarPerdida(eq(id), anyString(), anyInt(), any());
        verify(avisos, times(1)).avisarPerdida(eq(id), anyString(), eq(7), any());
        verify(avisos, never()).avisarPerdida(eq(id), anyString(), eq(8), any());

        // vuelve a ACTIVA: reanuda cobros y avisa UNA vez
        onvoDice(e, "active");
        cuentaOnvoService.consultar(cuentaId(e));
        seguimiento.ciclo();
        seguimiento.ciclo();
        verify(avisos, times(1)).avisarReanudado(eq(id), anyString());
        Empresa recuperada = empresaRepository.findById(id).orElseThrow();
        assertThat(recuperada.isVentaOnlineHabilitada()).isTrue();
        assertThat(altaFases.puedeCobrarEnLinea(recuperada)).isTrue();
        EmpresaCuentaOnvo c = cuentaRepository.findByEmpresaId(id).orElseThrow();
        assertThat(c.getPerdidaDesde()).isNull();
        assertThat(c.getAvisosPerdida()).isZero();
    }

    @Test
    @DisplayName("Claim de aviso de pérdida concurrente: dos ciclos simultáneos envían un solo aviso")
    void avisoPerdidaConcurrente() throws Exception {
        Empresa e = registrar();
        onvoDice(e, "active");
        cuentaOnvoService.consultar(cuentaId(e));
        onvoDice(e, "inactive");
        cuentaOnvoService.consultar(cuentaId(e));
        Long cuenta = cuentaId(e);
        LocalDateTime ahora = LocalDateTime.now();
        int hilos = 6;
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        CountDownLatch salida = new CountDownLatch(1);
        List<Future<Integer>> fs = new ArrayList<>();
        for (int i = 0; i < hilos; i++) {
            fs.add(pool.submit(() -> {
                salida.await();
                return enTx(() -> cuentaRepository.reclamarAvisoPerdida(cuenta, ahora, ahora.minus(Duration.ofHours(24)), 7));
            }));
        }
        salida.countDown();
        int ganadores = 0;
        for (Future<Integer> f : fs) ganadores += f.get();
        pool.shutdown();
        assertThat(ganadores).isEqualTo(1);
    }

    @Test
    @DisplayName("Negocio existente (legacy) sigue publicable y cobrando con la migración aplicada y el flag apagado")
    void legacyIntacto() {
        AltaFasesService apagado = new AltaFasesService(empresaRepository, cuentaRepository,
            null, new org.springframework.beans.factory.support.DefaultListableBeanFactory().getBeanProvider(org.springframework.cache.CacheManager.class), false);
        Empresa legacy = new Empresa();
        legacy.setNombreEmpresa("Legacy");
        legacy.setSlug("legacy-fases");
        legacy.setCorreoEmpresa("legacy@test.invalid");
        legacy.setEstadoEmpresa("ACTIVO");
        legacy.setVisibilidadPublica(true);
        legacy.setFechaRegistro(LocalDateTime.now());
        legacy = empresaRepository.saveAndFlush(legacy);
        apagado.alRegistrar(legacy);
        Empresa leido = empresaRepository.findById(legacy.getId()).orElseThrow();
        assertThat(leido.isAltaPorFases()).isFalse();
        assertThat(leido.isVentaOnlineHabilitada()).isTrue();
        assertThat(altaFases.puedeCobrarEnLinea(leido)).isTrue();
        assertThat(empresaRepository.findBySlug("legacy-fases")).get().extracting(Empresa::isVentaOnlineHabilitada).isEqualTo(true);
        Optional<Empresa> p = empresaRepository.findById(legacy.getId());
        assertThat(p).isPresent();
    }
}
