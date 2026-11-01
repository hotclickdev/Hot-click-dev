package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("PaymentExpirationCleanup: vencimiento e intervalo por propiedad, mismos valores por defecto")
class PaymentExpirationCleanupConfigTest {

    @Test
    @DisplayName("por defecto: 30 min de vencimiento, cada 5 min (fixedRate) y con ShedLock")
    void valoresPorDefecto() throws Exception {
        var m = PaymentExpirationCleanupService.class.getMethod("cancelarExpirados");
        Scheduled s = m.getAnnotation(Scheduled.class);
        assertThat(s.fixedRateString()).isEqualTo("${hotclick.pagos.onvo.cleanup-intervalo-ms:300000}");
        assertThat(300000L).isEqualTo(5 * 60 * 1000L);
        SchedulerLock lock = m.getAnnotation(SchedulerLock.class);
        assertThat(lock).isNotNull();
        assertThat(lock.name()).isEqualTo("payment_expiration_cleanup");
        assertThat(lock.lockAtMostFor()).isEqualTo("PT3M");

        Value v = PaymentExpirationCleanupService.class.getDeclaredField("vencimientoMinutos").getAnnotation(Value.class);
        assertThat(v.value()).isEqualTo("${hotclick.pagos.onvo.vencimiento-minutos:30}");
        assertThat(ReflectionTestUtils.getField(new PaymentExpirationCleanupService(), "vencimientoMinutos")).isEqualTo(30L);

        Properties p = new Properties();
        try (InputStream in = getClass().getResourceAsStream("/application.properties")) { p.load(in); }
        assertThat(p.getProperty("hotclick.pagos.onvo.vencimiento-minutos")).endsWith(":30}");
        assertThat(p.getProperty("hotclick.pagos.onvo.cleanup-intervalo-ms")).endsWith(":300000}");
        assertThat(p.getProperty("hotclick.pagos.onvo.estado-reconsulta-segundos")).endsWith(":10}");
    }

    @Test
    @DisplayName("override: el corte usa los minutos configurados (default 30, override 45)")
    void overrideDelVencimiento() {
        assertThat(corteCon(null)).isEqualTo(BASE.minusMinutes(30));
        assertThat(corteCon(45L)).isEqualTo(BASE.minusMinutes(45));
    }

    private static final LocalDateTime BASE = LocalDateTime.of(2026, 10, 28, 12, 0);

    private LocalDateTime corteCon(Long minutos) {
        PaymentExpirationCleanupService svc = new PaymentExpirationCleanupService();
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        PagoRepository pagos = mock(PagoRepository.class);
        ReservaAntiBotService reloj = mock(ReservaAntiBotService.class);
        when(reloj.ahora()).thenReturn(BASE);
        Empresa e = new Empresa();
        e.setId(1L);
        when(empresas.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")).thenReturn(List.of(e));
        when(pagos.findExpiradosPendientesByEmpresa(org.mockito.ArgumentMatchers.any(), eq(1L))).thenReturn(List.of());
        ReflectionTestUtils.setField(svc, "empresaRepository", empresas);
        ReflectionTestUtils.setField(svc, "pagoRepository", pagos);
        ReflectionTestUtils.setField(svc, "reservaAntiBot", reloj);
        ReflectionTestUtils.setField(svc, "reservaSospechosaLiberador", mock(ReservaSospechosaLiberador.class));
        if (minutos != null) ReflectionTestUtils.setField(svc, "vencimientoMinutos", minutos);
        svc.ejecutar();
        ArgumentCaptor<LocalDateTime> corte = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(pagos).findExpiradosPendientesByEmpresa(corte.capture(), eq(1L));
        return corte.getValue();
    }

    @Test
    @DisplayName("«SINPERefNumber no disponible» va a DEBUG (es informativo, no decide cobros)")
    void sinpeRefEnDebug() throws Exception {
        String src = java.nio.file.Files.readString(java.nio.file.Path.of(
            "src/main/java/com/hotclick/service/OnvoService.java"));
        assertThat(src).contains("log.debug(\"[onvo] SINPERefNumber no disponible")
            .doesNotContain("log.info(\"[onvo] SINPERefNumber no disponible");
    }
}
