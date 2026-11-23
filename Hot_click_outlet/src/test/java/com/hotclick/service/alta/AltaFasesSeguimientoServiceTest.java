package com.hotclick.service.alta;

import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.onvo.cuenta.CuentaOnvoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("Seguimiento de cuenta perdida: claim por aviso, intervalo y tope")
class AltaFasesSeguimientoServiceTest {

    static final Instant T0 = Instant.parse("2026-11-23T18:00:00Z");
    static final ZoneId CR = ZoneId.of("America/Costa_Rica");

    EmpresaCuentaOnvoRepository repo = mock(EmpresaCuentaOnvoRepository.class);
    EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
    AltaFasesAvisoService avisos = mock(AltaFasesAvisoService.class);
    CuentaOnvoService cuentaOnvo = mock(CuentaOnvoService.class);
    AltaFasesSeguimientoService svc;
    EmpresaCuentaOnvo c;

    @BeforeEach
    void setUp() {
        svc = new AltaFasesSeguimientoService(repo, empresaRepo, avisos, cuentaOnvo, mock(PlatformTransactionManager.class),
            Duration.ofHours(24), 7, 50);
        svc.setClock(Clock.fixed(T0, CR));
        c = new EmpresaCuentaOnvo();
        c.setEmpresaId(7L);
        ReflectionTestUtils.setField(c, "id", 70L);
        c.setAvisosPerdida(1);
        Empresa e = new Empresa();
        e.setId(7L);
        e.setNombreComercial("Soda La Esquina");
        when(empresaRepo.findById(7L)).thenReturn(Optional.of(e));
        when(repo.findById(70L)).thenReturn(Optional.of(c));
        when(cuentaOnvo.onboardingUrlParaDueno(7L)).thenReturn(Optional.of("https://onvopay.com/setup/z"));
    }

    @Test
    @DisplayName("Gana el claim: avisa al admin y al dueño con el enlace de ONVO; la cadencia es de 24 h y tope 7")
    void avisaSoloSiGanaElClaim() {
        LocalDateTime ahora = LocalDateTime.ofInstant(T0, CR);
        when(repo.reclamarAvisoPerdida(70L, ahora, ahora.minusHours(24), 7)).thenReturn(1, 0);

        assertThat(svc.avisarPerdida(70L, 7L, ahora)).isTrue();
        assertThat(svc.avisarPerdida(70L, 7L, ahora)).isFalse();

        verify(avisos, times(1)).avisarPerdida(eq(7L), eq("Soda La Esquina"), eq(1), eq(Optional.of("https://onvopay.com/setup/z")));
    }

    @Test
    @DisplayName("El ciclo recorre las cuentas perdidas y las recuperadas; recuperada avisa una sola vez")
    void ciclo() {
        when(repo.findByPerdidaDesdeIsNotNullOrderByActualizadoEnAsc(any())).thenReturn(List.of(c));
        when(repo.findByRecuperadaAvisoPendienteTrueOrderByActualizadoEnAsc(any())).thenReturn(List.of(c));
        when(repo.reclamarAvisoPerdida(anyLong(), any(), any(), anyInt())).thenReturn(1);
        when(repo.reclamarAvisoRecuperada(70L)).thenReturn(1, 0);

        svc.ciclo();
        svc.ciclo();

        verify(avisos, times(2)).avisarPerdida(eq(7L), any(), anyInt(), any());
        verify(avisos, times(1)).avisarReanudado(7L, "Soda La Esquina");
    }

    @Test
    @DisplayName("Un fallo al avisar una cuenta no corta el ciclo de las demás")
    void falloAislado() {
        EmpresaCuentaOnvo otra = new EmpresaCuentaOnvo();
        otra.setEmpresaId(8L);
        ReflectionTestUtils.setField(otra, "id", 80L);
        when(repo.findByPerdidaDesdeIsNotNullOrderByActualizadoEnAsc(any())).thenReturn(List.of(otra, c));
        when(repo.findByRecuperadaAvisoPendienteTrueOrderByActualizadoEnAsc(any())).thenReturn(List.of());
        when(repo.reclamarAvisoPerdida(anyLong(), any(), any(), anyInt())).thenReturn(1);
        when(empresaRepo.findById(8L)).thenThrow(new IllegalStateException("boom"));
        svc.ciclo();
        verify(avisos, times(1)).avisarPerdida(eq(7L), any(), anyInt(), any());
    }
}
