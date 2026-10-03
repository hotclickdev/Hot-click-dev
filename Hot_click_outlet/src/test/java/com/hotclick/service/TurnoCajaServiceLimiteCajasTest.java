package com.hotclick.service;

import com.hotclick.exception.PlanLimitException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.TurnoCaja;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TurnoCajaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.tenant.TenantLimitChecker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TurnoCajaService — límite de cajas abiertas por plan (decisión 3.2 A)")
class TurnoCajaServiceLimiteCajasTest {

    @Mock private TurnoCajaRepository turnoCajaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private EmpresaRepository empresaRepository;
    @Mock private CompanyScope companyScope;

    private TurnoCajaService service;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(10L);
        Usuario cajero = new Usuario();
        cajero.setId(5L);
        when(turnoCajaRepository.findByUsuario_IdAndEstado(5L, "ABIERTO")).thenReturn(Optional.empty());
        when(usuarioRepository.findById(5L)).thenReturn(Optional.of(cajero));
        when(empresaRepository.findById(10L)).thenReturn(Optional.of(empresa));

        service = new TurnoCajaService();
        ReflectionTestUtils.setField(service, "turnoCajaRepository", turnoCajaRepository);
        ReflectionTestUtils.setField(service, "usuarioRepository", usuarioRepository);
        ReflectionTestUtils.setField(service, "empresaRepository", empresaRepository);
        ReflectionTestUtils.setField(service, "companyScope", companyScope);
        ReflectionTestUtils.setField(service, "tenantLimitChecker", new TenantLimitChecker(empresaRepository));
    }

    private void conPlan(int maxCajas) {
        Plan plan = new Plan();
        plan.setNombre("EMPRENDEDOR");
        plan.setMaxCajas(maxCajas);
        empresa.setPlan(plan);
    }

    @Test
    @DisplayName("Emprendedor (1 caja) con una caja abierta → no abre otra y explica el límite")
    void emprendedorConUnaAbierta_bloquea() {
        conPlan(1);
        when(turnoCajaRepository.countByEmpresa_IdAndEstado(10L, "ABIERTO")).thenReturn(1L);

        assertThatThrownBy(() -> service.abrirTurno(5L, 10L, 0))
            .isInstanceOf(PlanLimitException.class)
            .hasMessage("Tu plan permite 1 caja(s) abierta(s). Cerrá una o mejorá tu plan.");
        verify(turnoCajaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Pyme (2 cajas) con una abierta → abre la segunda")
    void pymeConUnaAbierta_abre() {
        conPlan(2);
        when(turnoCajaRepository.countByEmpresa_IdAndEstado(10L, "ABIERTO")).thenReturn(1L);
        when(turnoCajaRepository.save(any(TurnoCaja.class))).thenAnswer(inv -> inv.getArgument(0));

        TurnoCaja turno = service.abrirTurno(5L, 10L, 1000);

        assertThat(turno.getEstado()).isEqualTo("ABIERTO");
        assertThat(turno.getMontoInicial()).isEqualTo(1000);
    }

    @Test
    @DisplayName("Negocio Plus (sin tope, -1) → abre aunque haya muchas abiertas")
    void negocioPlusSinTope_abre() {
        conPlan(-1);
        when(turnoCajaRepository.countByEmpresa_IdAndEstado(10L, "ABIERTO")).thenReturn(40L);
        when(turnoCajaRepository.save(any(TurnoCaja.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.abrirTurno(5L, 10L, 0).getEstado()).isEqualTo("ABIERTO");
    }
}
