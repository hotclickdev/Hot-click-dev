package com.hotclick.controller;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.SolicitudCambioPlan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SolicitudCambioPlanRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.suscripcion.SolicitudCambioPlanService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Solicitud de bajar de plan, standalone MockMvc (sin contexto de Spring): servicio real con repos mockeados.
 * 403 si no es propietario, 400 con motivo inválido, 409 con una solicitud abierta, 200 en el caso válido; y el
 * controller de ADMIN lista y marca revisada.
 */
@DisplayName("[Billing] Solicitud de cambio de plan (MockMvc standalone)")
class SolicitudCambioPlanMvcTest {

    SolicitudCambioPlanRepository repo = mock(SolicitudCambioPlanRepository.class);
    EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
    PlanRepository planRepo = mock(PlanRepository.class);
    PropietarioGuard guard = mock(PropietarioGuard.class);
    CompanyScope scope = mock(CompanyScope.class);
    MockMvc mvc;
    MockMvc mvcAdmin;

    @BeforeEach
    void setUp() {
        SolicitudCambioPlanService service = new SolicitudCambioPlanService(repo, empresaRepo, planRepo);
        mvc = MockMvcBuilders.standaloneSetup(new SolicitudCambioPlanController(service, guard, scope))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvcAdmin = MockMvcBuilders.standaloneSetup(new AdminSolicitudCambioPlanController(service, scope))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        Plan pyme = new Plan();
        pyme.setId(2L);
        pyme.setNombre("PYME");
        Plan plus = new Plan();
        plus.setId(3L);
        plus.setNombre("NEGOCIO_PLUS");
        Empresa e = new Empresa();
        e.setId(10L);
        e.setNombreEmpresa("Demo");
        e.setPlan(plus);
        when(empresaRepo.findById(10L)).thenReturn(Optional.of(e));
        when(planRepo.findById(2L)).thenReturn(Optional.of(pyme));
        when(planRepo.findById(3L)).thenReturn(Optional.of(plus));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(repo.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(scope.getCurrentUserId()).thenReturn(5L);
        when(guard.puedeGestionarEmpresa(10L)).thenReturn(true);
        TenantContext.set(10L);
    }

    @AfterEach
    void limpiar() { TenantContext.clear(); }

    private static String cuerpo(String motivo) {
        return "{\"planSolicitadoId\":2,\"motivo\":\"" + motivo + "\"}";
    }

    @Test
    void noPropietario_403_sinGuardar() throws Exception {
        when(guard.puedeGestionarEmpresa(10L)).thenReturn(false);
        mvc.perform(post("/api/billing/solicitud-cambio-plan").contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("Bajaron las ventas este mes")))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value(PropietarioGuard.MSG));
        verify(repo, never()).saveAndFlush(any());
    }

    @Test
    void motivoInvalido_400() throws Exception {
        mvc.perform(post("/api/billing/solicitud-cambio-plan").contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("no")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").exists());
        verify(repo, never()).saveAndFlush(any());
    }

    @Test
    void solicitudAbierta_409() throws Exception {
        when(repo.existsByEmpresaIdAndRevisadaFalse(10L)).thenReturn(true);
        mvc.perform(post("/api/billing/solicitud-cambio-plan").contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("Bajaron las ventas este mes")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.codigo").value("SOLICITUD_CAMBIO_PLAN_ABIERTA"));
        verify(repo, never()).saveAndFlush(any());
    }

    @Test
    void valida_200_guardaUna() throws Exception {
        mvc.perform(post("/api/billing/solicitud-cambio-plan").contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("Bajaron las ventas este mes")))
            .andExpect(status().isOk());
        verify(repo, times(1)).saveAndFlush(any());
    }

    @Test
    @DisplayName("Doble POST en carrera: el segundo pasa el check pero choca con el índice único → 409, no 500")
    void dobleInsert_unicidad_409() throws Exception {
        when(repo.saveAndFlush(any()))
            .thenAnswer(inv -> inv.getArgument(0))
            .thenThrow(new org.springframework.dao.DataIntegrityViolationException("ux_solicitud_cambio_plan_abierta"));
        mvc.perform(post("/api/billing/solicitud-cambio-plan").contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("Bajaron las ventas este mes")))
            .andExpect(status().isOk());
        mvc.perform(post("/api/billing/solicitud-cambio-plan").contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("Bajaron las ventas este mes")))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.codigo").value("SOLICITUD_CAMBIO_PLAN_ABIERTA"));
        verify(repo, times(2)).saveAndFlush(any());
    }

    @Test
    void admin_listaYRevisa() throws Exception {
        SolicitudCambioPlan s = new SolicitudCambioPlan();
        s.setEmpresaId(10L);
        s.setPlanActual("NEGOCIO_PLUS");
        s.setPlanSolicitado("PYME");
        s.setMotivo("Bajaron las ventas este mes");
        s.setRevisada(false);
        when(repo.findAllByOrderByRevisadaAscFechaSolicitudDesc(any())).thenReturn(List.of(s));
        when(empresaRepo.findAllById(any())).thenReturn(List.of());
        when(repo.findById(1L)).thenReturn(Optional.of(s));
        mvcAdmin.perform(get("/api/admin/solicitudes-cambio-plan")).andExpect(status().isOk());
        mvcAdmin.perform(post("/api/admin/solicitudes-cambio-plan/1/revisar")).andExpect(status().isOk());
    }
}
