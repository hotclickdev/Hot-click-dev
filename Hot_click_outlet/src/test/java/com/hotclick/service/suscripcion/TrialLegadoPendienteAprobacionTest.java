package com.hotclick.service.suscripcion;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.controller.SuscripcionController;
import com.hotclick.exception.EmpresaPendienteAprobacionException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.security.TenantContext;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.suscripcion.CobroSuscripcionService;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * QA final 15-nov (MEDIA): POST /api/billing/trial daba PYME en TRIAL a un negocio PENDIENTE_APROBACION.
 * Debe responder 409 EMPRESA_PENDIENTE_APROBACION (igual que cambiar-plan) antes de escribir nada.
 */
@DisplayName("Trial legado: negocio sin aprobar → 409 y cero escrituras")
class TrialLegadoPendienteAprobacionTest {

    private SuscripcionRepository subs;
    private EmpresaRepository empresas;
    private PlanRepository planes;
    private SuscripcionBillingService svc;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        subs = mock(SuscripcionRepository.class);
        empresas = mock(EmpresaRepository.class);
        planes = mock(PlanRepository.class);
        Plan pyme = new Plan();
        pyme.setNombre("PYME");
        when(planes.findByNombre("PYME")).thenReturn(Optional.of(pyme));
        empresa = new Empresa();
        empresa.setId(7L);
        when(empresas.findByIdForUpdate(7L)).thenReturn(Optional.of(empresa));
        when(subs.findActivaByEmpresaId(7L)).thenReturn(Optional.empty());
        svc = new SuscripcionBillingService();
        ReflectionTestUtils.setField(svc, "suscripcionRepo", subs);
        ReflectionTestUtils.setField(svc, "empresaRepo", empresas);
        ReflectionTestUtils.setField(svc, "planRepo", planes);
    }

    @AfterEach
    void limpiar() { TenantContext.clear(); }

    @Test
    @DisplayName("PENDIENTE_APROBACION → EmpresaPendienteAprobacionException, sin filas ni cambios en la empresa")
    void pendiente_lanzaYNoEscribe() {
        empresa.setEstadoEmpresa("PENDIENTE_APROBACION");
        String planAntes = empresa.getEstadoPlan();

        assertThatThrownBy(() -> svc.iniciarTrial(7L)).isInstanceOf(EmpresaPendienteAprobacionException.class);

        verify(subs, never()).save(any());
        verify(empresas, never()).save(any());
        assertThat(empresa.getEstadoPlan()).isEqualTo(planAntes);
        assertThat(empresa.getTrialHasta()).isNull();
        assertThat(empresa.getPlan()).isNull();
    }

    @Test
    @DisplayName("ACTIVO (estado_plan por defecto) → ya NO crea trial legado: rechaza sin escribir (fail-closed)")
    void activo_yaNoRecibeTrialLegado() {
        empresa.setEstadoEmpresa("ACTIVO");

        assertThatThrownBy(() -> svc.iniciarTrial(7L)).isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("prueba gratuita");

        verify(subs, never()).save(any());
        verify(empresas, never()).save(any());
        verify(empresas).findByIdForUpdate(7L);
        verify(empresas, never()).findById(any());
        assertThat(empresa.getTrialHasta()).isNull();
    }

    @Test
    @DisplayName("MVC: POST /api/billing/trial pendiente → 409 con codigo y error de cambiar-plan")
    void mvc_pendiente_409() throws Exception {
        SuscripcionService servicio = mock(SuscripcionService.class);
        when(servicio.iniciarTrial(7L)).thenThrow(new EmpresaPendienteAprobacionException());
        PropietarioGuard guard = mock(PropietarioGuard.class);
        when(guard.puedeGestionarEmpresa(any())).thenReturn(true);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new SuscripcionController(servicio, mock(PlanRepository.class),
                mock(AuthSupport.class), mock(CobroSuscripcionService.class), mock(PreciosPlanesConfig.class), guard))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
        TenantContext.set(7L);

        mvc.perform(post("/api/billing/trial"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.codigo").value(EmpresaPendienteAprobacionException.CODIGO))
            .andExpect(jsonPath("$.error").value(EmpresaPendienteAprobacionException.MENSAJE));
    }
}
