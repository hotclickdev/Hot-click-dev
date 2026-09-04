package com.hotclick.service.tenant;

import com.hotclick.exception.RecursoNoEncontradoException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TenantUsoService")
class TenantUsoServiceTest {

    @Mock JdbcTemplate jdbc;
    @InjectMocks TenantUsoService service;

    @Test
    @DisplayName("ranking filtra la empresa plataforma y usa una sola query")
    @SuppressWarnings("unchecked")
    void rankingUnaQuerySinPlataforma() {
        Map<String, Object> plataforma = TenantUsoAgregacion.filaUso(
            1L, "HotClick", "hotclick", "ACTIVO", "ADMIN",
            9_999L, 99L, 100L, 1L, 0L, 0L, 0L, -1, 0L, 0L);
        Map<String, Object> cafe = TenantUsoAgregacion.filaUso(
            2L, "Café CR", "cafe-cr", "ACTIVO", "PYME",
            150_000L, 12L, 40_000L, 3L, 80L, 1000L, 500L, 100, 25L, 40L);
        when(jdbc.query(anyString(), any(RowMapper.class), any(), any(), any(), any()))
            .thenReturn(List.of(plataforma, cafe));

        Map<String, Object> out = service.ranking(2026, 9);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> tenants = (List<Map<String, Object>>) out.get("tenants");
        assertThat(tenants).hasSize(1);
        assertThat(tenants.get(0).get("empresaId")).isEqualTo(2L);
        assertThat(out.get("anio")).isEqualTo(2026);
        assertThat(out.get("mes")).isEqualTo(9);
        Map<String, Object> resumen = (Map<String, Object>) out.get("resumen");
        assertThat(resumen.get("gmvTotal")).isEqualTo(150_000L);
        verify(jdbc, times(1)).query(anyString(), any(RowMapper.class), any(), any(), any(), any());
    }

    @Test
    @DisplayName("detalle de empresa inexistente → 404 de dominio")
    @SuppressWarnings("unchecked")
    void detalleEmpresaAusente() {
        when(jdbc.query(anyString(), any(RowMapper.class), any(), any(), any(), any(), any()))
            .thenReturn(List.of());

        assertThatThrownBy(() -> service.detalle(99L, 2026, 9))
            .isInstanceOf(RecursoNoEncontradoException.class)
            .hasMessageContaining("99");
    }

    @Test
    @DisplayName("detalle agrega créditos restantes y nota de almacenamiento")
    @SuppressWarnings("unchecked")
    void detalleEnriqueceFila() {
        Map<String, Object> cafe = TenantUsoAgregacion.filaUso(
            2L, "Café CR", "cafe-cr", "ACTIVO", "PYME",
            150_000L, 12L, 40_000L, 3L, 80L, 1000L, 500L, 100, 25L, 40L);
        when(jdbc.query(anyString(), any(RowMapper.class), any(), any(), any(), any(), any()))
            .thenReturn(List.of(cafe));

        Map<String, Object> out = service.detalle(2L, 2026, 9);

        assertThat(out.get("creditosRestantes")).isEqualTo(20);
        assertThat(out.get("notaAlmacenamiento")).isEqualTo(TenantUsoAgregacion.NOTA_ALMACENAMIENTO);
        assertThat(out.get("gmvMes")).isEqualTo(40_000L);
        verify(jdbc, times(1)).query(anyString(), any(RowMapper.class), any(), any(), any(), any(), any());
    }

    @Test
    void mesInvalidoRechaza() {
        assertThatThrownBy(() -> service.ranking(2026, 13))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("mes");
    }
}
