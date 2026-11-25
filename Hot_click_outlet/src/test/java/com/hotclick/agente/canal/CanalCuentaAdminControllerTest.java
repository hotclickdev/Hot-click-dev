package com.hotclick.agente.canal;

import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.TenantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** AG-14 H-03: pausar, reanudar y desconectar exigen propietario o administrador del negocio. */
class CanalCuentaAdminControllerTest {

    private CanalCuentaService service;
    private PropietarioGuard guard;
    private MockMvc mvc;

    @BeforeEach
    void init() {
        service = mock(CanalCuentaService.class);
        CompanyScope scope = mock(CompanyScope.class);
        TenantService tenant = mock(TenantService.class);
        guard = mock(PropietarioGuard.class);
        when(tenant.tieneFeature("ai")).thenReturn(true);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        mvc = MockMvcBuilders.standaloneSetup(new CanalCuentaAdminController(service, scope, tenant, guard))
            .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void editorOSoporteRecibe403SinTocarElServicio() throws Exception {
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(false);
        when(guard.esAdminEquipo(7L)).thenReturn(false);
        for (String accion : new String[] {"pausar", "reanudar", "desconectar"}) {
            mvc.perform(post("/api/agente/canales/5/" + accion)).andExpect(status().isForbidden());
        }
        verify(service, never()).pausar(any(), any());
        verify(service, never()).reanudar(any(), any());
        verify(service, never()).desconectar(any(), any());
    }

    @Test
    void propietarioYAdminDeEquipoPasan() throws Exception {
        CanalCuenta cuenta = new CanalCuenta();
        cuenta.setTipo(MensajeEntrante.Canal.WHATSAPP);
        cuenta.setEstado(EstadoCanal.DESCONECTADA);
        when(service.desconectar(5L, 7L)).thenReturn(cuenta);
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(true);
        mvc.perform(post("/api/agente/canales/5/desconectar")).andExpect(status().isOk());
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(false);
        when(guard.esAdminEquipo(7L)).thenReturn(true);
        mvc.perform(post("/api/agente/canales/5/desconectar")).andExpect(status().isOk());
    }

    @Test
    void listarSigueAbiertoALosMiembros() throws Exception {
        when(guard.puedeGestionarEmpresa(7L)).thenReturn(false);
        when(service.listar(7L)).thenReturn(List.of());
        mvc.perform(get("/api/agente/canales")).andExpect(status().isOk());
    }
}
