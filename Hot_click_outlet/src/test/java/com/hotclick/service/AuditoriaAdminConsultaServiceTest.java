package com.hotclick.service;

import com.hotclick.model.AuditoriaAdmin;
import com.hotclick.model.Empresa;
import com.hotclick.repository.AuditoriaAdminRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuditoriaAdminConsultaService — listado con retención")
class AuditoriaAdminConsultaServiceTest {

    @Mock AuditoriaAdminRepository auditoriaRepo;
    @Mock EmpresaRepository empresaRepo;
    @InjectMocks AuditoriaAdminConsultaService service;

    @Test
    @DisplayName("listar clampa desde al límite de retención de 90 días")
    void listar_clampaRetencion() {
        AuditoriaAdmin fila = fila(1L, "APROBAR_SINPE", 7L);
        when(auditoriaRepo.buscar(isNull(), isNull(), isNull(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(fila)));
        Empresa emp = new Empresa();
        emp.setId(7L);
        emp.setNombreComercial("Café Norte");
        when(empresaRepo.findAllById(any())).thenReturn(List.of(emp));

        LocalDate muyViejo = LocalDate.now(Constants.ZONA_CR).minusDays(400);
        Map<String, Object> resp = service.listar(null, null, null, muyViejo, null, 0, 20);

        ArgumentCaptor<LocalDateTime> desdeCap = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(auditoriaRepo).buscar(isNull(), isNull(), isNull(), desdeCap.capture(), any(), any());
        LocalDateTime limite = LocalDateTime.now(Constants.ZONA_CR)
                .minusDays(Constants.DIAS_RETENCION_AUDITORIA_ADMIN);
        assertThat(desdeCap.getValue()).isAfterOrEqualTo(limite.minusMinutes(1));
        assertThat(resp.get("diasRetencion")).isEqualTo(90);
        @SuppressWarnings("unchecked")
        List<Object> content = (List<Object>) resp.get("content");
        assertThat(content).hasSize(1);
    }

    @Test
    @DisplayName("listar filtra por acción, email y empresa")
    void listar_aplicaFiltros() {
        when(auditoriaRepo.buscar(eq("APROBAR_SINPE"), eq("ana@test.cr"), eq(3L), any(), any(), any()))
                .thenReturn(Page.empty());

        service.listar("APROBAR_SINPE", "ana@test.cr", 3L, null, null, 0, 10);

        verify(auditoriaRepo).buscar(eq("APROBAR_SINPE"), eq("ana@test.cr"), eq(3L), any(), any(), any(Pageable.class));
    }

    @Test
    @DisplayName("resolverDesde no permite fechas anteriores a retención")
    void resolverDesde_respetaRetencion() {
        LocalDateTime limite = LocalDateTime.of(2026, 6, 1, 0, 0);
        LocalDateTime res = AuditoriaAdminConsultaService.resolverDesde(LocalDate.of(2020, 1, 1), limite);
        assertThat(res).isEqualTo(limite);
    }

    private static AuditoriaAdmin fila(Long id, String accion, Long empresaId) {
        AuditoriaAdmin a = new AuditoriaAdmin();
        a.setId(id);
        a.setAccion(accion);
        a.setEntidad("COMPROBANTE_SINPE");
        a.setAdminEmail("ops@hotclick.lat");
        a.setFecha(LocalDateTime.now(Constants.ZONA_CR));
        a.setEmpresaId(empresaId);
        return a;
    }
}
