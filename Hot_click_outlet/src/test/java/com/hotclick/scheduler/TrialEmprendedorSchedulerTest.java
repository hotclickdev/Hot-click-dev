package com.hotclick.scheduler;

import com.hotclick.service.suscripcion.TrialEmprendedorService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Scheduler de cierre de trials Emprendedor")
class TrialEmprendedorSchedulerTest {

    @Test
    @DisplayName("Un fallo en un negocio no impide cerrar los demás")
    void unFalloNoDetieneElResto() {
        TrialEmprendedorService service = mock(TrialEmprendedorService.class);
        when(service.idsTrialVencidos(any(LocalDate.class))).thenReturn(List.of(1L, 2L, 3L));
        when(service.cerrarTrial(eq(1L), any())).thenThrow(new IllegalStateException("boom"));
        when(service.cerrarTrial(eq(2L), any())).thenReturn(true);
        when(service.cerrarTrial(eq(3L), any())).thenReturn(false);

        new TrialEmprendedorScheduler(service).cerrarTrialsVencidos();

        verify(service).cerrarTrial(eq(1L), any());
        verify(service).cerrarTrial(eq(2L), any());
        verify(service).cerrarTrial(eq(3L), any());
    }
}
