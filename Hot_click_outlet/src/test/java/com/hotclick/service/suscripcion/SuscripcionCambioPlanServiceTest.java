package com.hotclick.service.suscripcion;

import com.hotclick.exception.PasarelaNoDisponibleException;
import com.hotclick.exception.PlanNoDisponibleException;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class SuscripcionCambioPlanServiceTest {

    @Test
    void proximoCobroCaeEnElDiaDelNegocio() {
        assertThat(SuscripcionCambioPlanService.proximoCobro(LocalDate.of(2026, 10, 12), 28)).isEqualTo(LocalDate.of(2026, 11, 28));
        assertThat(SuscripcionCambioPlanService.proximoCobro(LocalDate.of(2026, 10, 12), 13)).isEqualTo(LocalDate.of(2026, 11, 13));
        assertThat(SuscripcionCambioPlanService.proximoCobro(LocalDate.of(2027, 1, 30), 28)).isEqualTo(LocalDate.of(2027, 2, 28));
    }

    @Test
    void sinPasarela_planDePagoSeRechaza_gratisSeAplica_sinPrecioDa409() {
        PlanRepository planRepo = mock(PlanRepository.class);
        SuscripcionOnvoChangeService planLocal = mock(SuscripcionOnvoChangeService.class);
        SuscripcionCambioPlanService svc = new SuscripcionCambioPlanService(planRepo, planLocal);

        Plan pyme = plan(2L, "PYME", 12_900);
        when(planRepo.findById(2L)).thenReturn(Optional.of(pyme));
        assertThatThrownBy(() -> svc.iniciarCambioPlan(5L, 2L)).isInstanceOf(PasarelaNoDisponibleException.class);
        verify(planLocal, never()).aplicarPlanLocal(anyLong(), anyString(), any());

        Plan gratis = plan(1L, "EMPRENDEDOR", 0);
        when(planRepo.findById(1L)).thenReturn(Optional.of(gratis));
        Map<String, Object> r = svc.iniciarCambioPlan(5L, 1L);
        assertThat(r).containsEntry("estado", "ACTIVO").containsEntry("plan", "EMPRENDEDOR");
        verify(planLocal).aplicarPlanLocal(5L, "EMPRENDEDOR", null);

        Plan sinPrecio = plan(3L, "X", null);
        when(planRepo.findById(3L)).thenReturn(Optional.of(sinPrecio));
        assertThatThrownBy(() -> svc.iniciarCambioPlan(5L, 3L)).isInstanceOf(PlanNoDisponibleException.class);
    }

    private static Plan plan(Long id, String nombre, Integer precio) {
        Plan p = new Plan();
        p.setId(id);
        p.setNombre(nombre);
        p.setPrecioMensual(precio);
        return p;
    }

    @Test
    void prorrateoPorDias_primerPeriodoHastaElDiaDeCobro() {
        LocalDate hoy = LocalDate.of(2026, 10, 12);
        assertThat(ProrrateoSuscripcion.siguienteDiaCobro(hoy, 28)).isEqualTo(LocalDate.of(2026, 10, 28));
        assertThat(ProrrateoSuscripcion.siguienteDiaCobro(LocalDate.of(2026, 10, 28), 28)).isEqualTo(LocalDate.of(2026, 11, 28));
        // 16 de 30 días → ceil(12900 * 16 / 30)
        assertThat(ProrrateoSuscripcion.montoAlta("DIAS", 12_900, hoy, 28)).isEqualTo(6_880L);
        assertThat(ProrrateoSuscripcion.montoAlta(null, 12_900, hoy, 28)).isEqualTo(6_880L);
        assertThat(ProrrateoSuscripcion.montoAlta("NINGUNO", 12_900, hoy, 28)).isEqualTo(12_900L);
        assertThat(ProrrateoSuscripcion.montoAlta("DIAS", 12_900, LocalDate.of(2026, 9, 28), 28)).isEqualTo(12_900L);
        assertThat(ProrrateoSuscripcion.finPrimerPeriodo("NINGUNO", hoy, 28)).isEqualTo(LocalDate.of(2026, 11, 28));
    }
}
