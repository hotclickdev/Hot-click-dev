package com.hotclick.service.alta;

import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Migración de negocios existentes al flujo por fases (flag apagado por defecto)")
class AltaFasesMigracionExistentesServiceTest {

    EmpresaCuentaOnvoRepository repo = mock(EmpresaCuentaOnvoRepository.class);
    AltaFasesService altaFases = mock(AltaFasesService.class);
    PlatformTransactionManager tm = mock(PlatformTransactionManager.class);

    AltaFasesMigracionExistentesService svc(boolean migrar, boolean fasesEnabled) {
        when(altaFases.exigirFasesAlNuevos()).thenReturn(fasesEnabled);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        return new AltaFasesMigracionExistentesService(repo, altaFases, tm, migrar, 100);
    }

    @Test
    @DisplayName("flag apagado: no lee ni escribe nada")
    void apagadoNoHaceNada() {
        assertThat(svc(false, true).ciclo()).isZero();
        verifyNoInteractions(repo);
    }

    @Test
    @DisplayName("migrar-existentes=true pero alta-fases.enabled=false: tampoco actúa")
    void sinFlagDeNuevosNoActua() {
        assertThat(svc(true, false).ciclo()).isZero();
        verifyNoInteractions(repo);
    }

    @Test
    @DisplayName("flag encendido: migra el lote y limpia cachés; sin candidatos no escribe (idempotente)")
    void encendidoMigraEnLote() {
        AltaFasesMigracionExistentesService s = svc(true, true);
        when(repo.idsExistentesParaMigrar(any())).thenReturn(List.of(1L, 2L)).thenReturn(List.of());
        when(repo.migrarAFases(List.of(1L, 2L))).thenReturn(2);
        assertThat(s.ciclo()).isEqualTo(2);
        verify(altaFases).limpiarCaches(null);
        assertThat(s.ciclo()).isZero();
        verify(repo, times(1)).migrarAFases(any());
    }

    @Test
    @DisplayName("un fallo de BD no tumba el poller")
    void falloNoPropaga() {
        AltaFasesMigracionExistentesService s = svc(true, true);
        when(repo.idsExistentesParaMigrar(any())).thenThrow(new IllegalStateException("db"));
        assertThat(s.ciclo()).isZero();
    }
}
