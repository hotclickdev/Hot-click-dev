package com.hotclick.service;

import com.hotclick.model.AiUso;
import com.hotclick.model.Empresa;
import com.hotclick.repository.AiUsoRepository;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * F31-02 — AI Quota TOCTOU: verificarYReservar() atómico.
 *
 * Verifica que el path de reserva atómica funciona correctamente:
 * - ADMIN: siempre true (unlimited)
 * - Plan sin cuota: siempre false
 * - Empresa no encontrada: false
 * - Slot disponible: reservarSlot retorna valor → true
 * - Cuota agotada: reservarSlot retorna vacío → false
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("F31-02 — AiQuotaService: verificarYReservar() atómico (sin TOCTOU)")
class AiQuotaServiceTest {

    @Mock EmpresaRepository  empresaRepository;
    @Mock AiUsoRepository    aiUsoRepository;

    @InjectMocks AiQuotaService service;

    private Empresa empresaPro;
    private Empresa empresaGratuita;
    private Empresa empresaAdmin;

    @BeforeEach
    void setUp() {
        empresaPro = new Empresa();
        empresaPro.setId(1L);
        empresaPro.setPlanSaas("PRO");

        empresaGratuita = new Empresa();
        empresaGratuita.setId(2L);
        empresaGratuita.setPlanSaas("GRATUITO");

        empresaAdmin = new Empresa();
        empresaAdmin.setId(3L);
        empresaAdmin.setPlanSaas("ADMIN");
    }

    // ── ADMIN: unlimited ──────────────────────────────────────────────────────

    @Test
    @DisplayName("ADMIN → siempre true sin consultar cuota")
    void verificarYReservar_adminIt_alwaysTrue() {
        when(empresaRepository.findById(3L)).thenReturn(Optional.of(empresaAdmin));

        boolean result = service.verificarYReservar(3L);

        assertThat(result).isTrue();
        verify(aiUsoRepository, never()).reservarSlot(anyLong(), anyInt(), anyInt(), anyInt());
    }

    // ── GRATUITO: cuota = 0, siempre false ───────────────────────────────────

    @Test
    @DisplayName("Plan GRATUITO → siempre false sin consultar BD")
    void verificarYReservar_gratuito_alwaysFalse() {
        when(empresaRepository.findById(2L)).thenReturn(Optional.of(empresaGratuita));

        boolean result = service.verificarYReservar(2L);

        assertThat(result).isFalse();
        verify(aiUsoRepository, never()).reservarSlot(anyLong(), anyInt(), anyInt(), anyInt());
    }

    // ── PRO: slot disponible → true ───────────────────────────────────────────

    @Test
    @DisplayName("PRO con slot disponible → reservarSlot retorna valor → true")
    void verificarYReservar_pro_slotAvailable_returnsTrue() {
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresaPro));
        // reservarSlot retorna el nuevo valor de llamadas (≥ 1) → slot otorgado
        List<Object[]> slotResult = new java.util.ArrayList<>();
        slotResult.add(new Object[]{45});
        when(aiUsoRepository.reservarSlot(eq(1L), anyInt(), anyInt(), eq(50)))
            .thenReturn(slotResult);

        boolean result = service.verificarYReservar(1L);

        assertThat(result).isTrue();
        verify(aiUsoRepository, times(1)).reservarSlot(eq(1L), anyInt(), anyInt(), eq(50));
    }

    // ── PRO: cuota agotada → false ────────────────────────────────────────────

    @Test
    @DisplayName("PRO con cuota agotada → reservarSlot retorna vacío → false (TOCTOU imposible)")
    void verificarYReservar_pro_quotaExhausted_returnsFalse() {
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresaPro));
        // reservarSlot retorna vacío → WHERE llamadas < limite no cumplido
        when(aiUsoRepository.reservarSlot(eq(1L), anyInt(), anyInt(), eq(50)))
            .thenReturn(Collections.emptyList());

        boolean result = service.verificarYReservar(1L);

        assertThat(result).isFalse();
    }

    // ── Empresa no encontrada ─────────────────────────────────────────────────

    @Test
    @DisplayName("Empresa inexistente → false sin excepción")
    void verificarYReservar_empresaNotFound_returnsFalse() {
        when(empresaRepository.findById(99L)).thenReturn(Optional.empty());

        boolean result = service.verificarYReservar(99L);

        assertThat(result).isFalse();
        verify(aiUsoRepository, never()).reservarSlot(anyLong(), anyInt(), anyInt(), anyInt());
    }

    // ── puedeUsarAi: lectura (no reserva) ────────────────────────────────────

    @Test
    @DisplayName("puedeUsarAi PRO con 49 llamadas → true (lectura no atómica, solo para UI)")
    void puedeUsarAi_pro_under50_returnsTrue() {
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresaPro));
        AiUso uso = new AiUso();
        uso.setLlamadas(49);
        when(aiUsoRepository.findByEmpresaIdAndAnioAndMes(eq(1L), anyInt(), anyInt()))
            .thenReturn(Optional.of(uso));

        boolean result = service.puedeUsarAi(1L);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("puedeUsarAi PRO con 50 llamadas → false")
    void puedeUsarAi_pro_at50_returnsFalse() {
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresaPro));
        AiUso uso = new AiUso();
        uso.setLlamadas(50);
        when(aiUsoRepository.findByEmpresaIdAndAnioAndMes(eq(1L), anyInt(), anyInt()))
            .thenReturn(Optional.of(uso));

        boolean result = service.puedeUsarAi(1L);

        assertThat(result).isFalse();
    }
}
