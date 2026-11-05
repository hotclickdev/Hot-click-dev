package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.SolicitudCambioPlan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SolicitudCambioPlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("[Billing] Solicitud de bajar de plan")
class SolicitudCambioPlanServiceTest {

    @Mock SolicitudCambioPlanRepository repo;
    @Mock EmpresaRepository empresaRepo;
    @Mock PlanRepository planRepo;
    SolicitudCambioPlanService service;
    Empresa empresa;

    @BeforeEach
    void setUp() {
        service = new SolicitudCambioPlanService(repo, empresaRepo, planRepo);
        Plan plus = plan(3L, "NEGOCIO_PLUS");
        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setNombreEmpresa("Demo");
        empresa.setPlan(plus);
        lenient().when(empresaRepo.findById(10L)).thenReturn(Optional.of(empresa));
        lenient().when(planRepo.findById(3L)).thenReturn(Optional.of(plus));
        lenient().when(planRepo.findById(2L)).thenReturn(Optional.of(plan(2L, "PYME")));
        org.mockito.stubbing.Answer<Object> conId = inv -> {
            SolicitudCambioPlan s = inv.getArgument(0);
            if (s.getId() == null) s.setId(99L);
            return s;
        };
        lenient().when(repo.save(any())).thenAnswer(conId);
        lenient().when(repo.saveAndFlush(any())).thenAnswer(conId);
    }

    private static Plan plan(Long id, String n) {
        Plan p = new Plan();
        p.setId(id);
        p.setNombre(n);
        return p;
    }

    @Test
    @DisplayName("Guarda pyme, plan actual, plan pedido, motivo y fecha; no toca el plan")
    void solicitar_guarda() {
        Map<String, Object> out = service.solicitar(10L, 5L, 2L, "  Bajaron las ventas  ");
        assertThat(out.get("planActual")).isEqualTo("NEGOCIO_PLUS");
        assertThat(out.get("planSolicitado")).isEqualTo("PYME");
        assertThat(out.get("motivo")).isEqualTo("Bajaron las ventas");
        assertThat(out.get("fechaSolicitud")).isNotNull();
        assertThat(out.get("revisada")).isEqualTo(false);
        assertThat(empresa.getPlan().getNombre()).isEqualTo("NEGOCIO_PLUS");
    }

    @Test
    @DisplayName("Solo planes más bajos: pedir el mismo o uno más alto es inválido")
    void soloMasBajo() {
        assertThatThrownBy(() -> service.solicitar(10L, 5L, 3L, "motivo valido"))
            .isInstanceOf(SolicitudCambioPlanService.SolicitudInvalidaException.class);
        verify(repo, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Motivo vacío o muy largo: inválido")
    void motivoInvalido() {
        assertThatThrownBy(() -> service.solicitar(10L, 5L, 2L, " "))
            .isInstanceOf(SolicitudCambioPlanService.SolicitudInvalidaException.class);
        assertThatThrownBy(() -> service.solicitar(10L, 5L, 2L, "x".repeat(501)))
            .isInstanceOf(SolicitudCambioPlanService.SolicitudInvalidaException.class);
    }

    @Test
    @DisplayName("Una sola solicitud abierta por negocio")
    void unaAbierta() {
        when(repo.existsByEmpresaIdAndRevisadaFalse(10L)).thenReturn(true);
        assertThatThrownBy(() -> service.solicitar(10L, 5L, 2L, "motivo valido"))
            .isInstanceOf(SolicitudCambioPlanService.SolicitudAbiertaException.class);
    }

    @Test
    @DisplayName("ADMIN marca revisada: guarda quién y cuándo; repetir no pisa al primero")
    void marcarRevisada() {
        SolicitudCambioPlan s = new SolicitudCambioPlan();
        s.setId(99L);
        s.setEmpresaId(10L);
        s.setFechaSolicitud(LocalDateTime.now());
        when(repo.findById(99L)).thenReturn(Optional.of(s));

        Map<String, Object> out = service.marcarRevisada(99L, 1L);
        assertThat(out.get("revisada")).isEqualTo(true);
        assertThat(out.get("revisadaPor")).isEqualTo(1L);
        assertThat(out.get("fechaRevision")).isNotNull();

        service.marcarRevisada(99L, 2L);
        assertThat(s.getRevisadaPor()).isEqualTo(1L);
    }

    @Test
    @DisplayName("Lista del admin: nombres de todas las pymes en un solo query (sin N+1) y tope 500")
    void listarSinNMasUno() {
        SolicitudCambioPlan a = new SolicitudCambioPlan(); a.setId(1L); a.setEmpresaId(10L);
        SolicitudCambioPlan b = new SolicitudCambioPlan(); b.setId(2L); b.setEmpresaId(10L);
        when(repo.findAllByOrderByRevisadaAscFechaSolicitudDesc(org.mockito.ArgumentMatchers.any()))
            .thenReturn(List.of(a, b));
        Empresa e = new Empresa(); e.setId(10L); e.setNombreEmpresa("Pyme Uno");
        when(empresaRepo.findAllById(org.mockito.ArgumentMatchers.<Iterable<Long>>any())).thenReturn(List.of(e));

        List<Map<String, Object>> out = service.listar(9999);

        assertThat(out).hasSize(2);
        assertThat(out.get(1).get("nombreEmpresa")).isEqualTo("Pyme Uno");
        org.mockito.Mockito.verify(empresaRepo, org.mockito.Mockito.times(1)).findAllById(org.mockito.ArgumentMatchers.<Iterable<Long>>any());
        org.mockito.Mockito.verify(empresaRepo, org.mockito.Mockito.never()).findById(org.mockito.ArgumentMatchers.anyLong());
        org.mockito.Mockito.verify(repo).findAllByOrderByRevisadaAscFechaSolicitudDesc(
            org.springframework.data.domain.PageRequest.of(0, 500));
    }
}
