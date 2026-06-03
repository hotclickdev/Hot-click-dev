package com.hotclick.scheduler;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.InventoryForecastService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * F31-01 — Heap bomb fix: cursor paging en AbcAnalysisScheduler.
 *
 * Verifica que el scheduler NO carga todas las empresas en heap (findAll()),
 * sino que itera en páginas de 50 con cursor.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("F31-01 — AbcAnalysisScheduler: cursor paging (heap bomb)")
class AbcAnalysisSchedulerTest {

    @Mock EmpresaRepository        empresaRepository;
    @Mock InventoryForecastService forecastService;

    @InjectMocks AbcAnalysisScheduler scheduler;

    // ── Caso feliz: 3 páginas de 50 empresas ─────────────────────────────────

    @Test
    @DisplayName("3 lotes de 50 empresas → foreach con cursor, no findAll()")
    void ejecutar_pagesThrough3Batches() {
        // Página 1: IDs 1-50
        List<Long> page1 = ids(1L, 50L);
        // Página 2: IDs 51-100
        List<Long> page2 = ids(51L, 100L);
        // Página 3: IDs 101-120 (último lote, < 50)
        List<Long> page3 = ids(101L, 120L);
        // Página 4: vacía → termina el loop
        List<Long> empty = Collections.emptyList();

        when(empresaRepository.findIdsByEstadoAfterCursor(eq("ACTIVO"), eq(0L),    eq(PageRequest.of(0, 50)))).thenReturn(page1);
        when(empresaRepository.findIdsByEstadoAfterCursor(eq("ACTIVO"), eq(50L),   eq(PageRequest.of(0, 50)))).thenReturn(page2);
        when(empresaRepository.findIdsByEstadoAfterCursor(eq("ACTIVO"), eq(100L),  eq(PageRequest.of(0, 50)))).thenReturn(page3);
        when(empresaRepository.findIdsByEstadoAfterCursor(eq("ACTIVO"), eq(120L),  eq(PageRequest.of(0, 50)))).thenReturn(empty);

        scheduler.ejecutar();

        // Se llamó al servicio 120 veces (una por empresa)
        verify(forecastService, times(120)).actualizarAnalisisEmpresa(anyLong());
        // NUNCA se llamó findAll() — verificar que el método de cursor fue el único usado
        verify(empresaRepository, never()).findAll();
        verify(empresaRepository, never()).findByEstadoEmpresaOrderByFechaRegistroAsc(anyString());
    }

    // ── Caso error: empresa falla, el scheduler continúa ─────────────────────

    @Test
    @DisplayName("Error en empresa 3 → scheduler continúa con el resto")
    void ejecutar_errorInOneEmpresa_continuesWithRest() {
        List<Long> page = ids(1L, 5L); // 5 empresas
        when(empresaRepository.findIdsByEstadoAfterCursor(eq("ACTIVO"), eq(0L), any()))
            .thenReturn(page);
        when(empresaRepository.findIdsByEstadoAfterCursor(eq("ACTIVO"), eq(5L), any()))
            .thenReturn(Collections.emptyList());

        // Empresa 3 lanza excepción
        doThrow(new RuntimeException("BD timeout"))
            .when(forecastService).actualizarAnalisisEmpresa(3L);

        scheduler.ejecutar();

        // Las otras 4 empresas SÍ se procesaron (no se detuvo en la 3)
        verify(forecastService, times(5)).actualizarAnalisisEmpresa(anyLong());
        verify(forecastService, times(1)).actualizarAnalisisEmpresa(1L);
        verify(forecastService, times(1)).actualizarAnalisisEmpresa(2L);
        verify(forecastService, times(1)).actualizarAnalisisEmpresa(4L);
        verify(forecastService, times(1)).actualizarAnalisisEmpresa(5L);
    }

    // ── Caso: sin empresas activas ────────────────────────────────────────────

    @Test
    @DisplayName("Sin empresas activas → ejecutar() completa sin errores")
    void ejecutar_noEmpresas_completesGracefully() {
        when(empresaRepository.findIdsByEstadoAfterCursor(any(), anyLong(), any()))
            .thenReturn(Collections.emptyList());

        scheduler.ejecutar();

        verify(forecastService, never()).actualizarAnalisisEmpresa(anyLong());
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private List<Long> ids(long from, long to) {
        List<Long> list = new java.util.ArrayList<>();
        for (long i = from; i <= to; i++) list.add(i);
        return list;
    }
}
