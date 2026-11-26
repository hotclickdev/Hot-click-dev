package com.hotclick.agente.cupo;

import com.hotclick.repository.EmpresaRepository;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.interno.HasherInterno;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.tenant.TenantInfoBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Optional;

import static com.hotclick.agente.cupo.CupoTestSupport.empresa;
import static com.hotclick.agente.cupo.CupoTestSupport.plan;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("GET /api/agente/uso: solo el uso del negocio propio (AG-29)")
class AgenteUsoControllerTest {

    private CompanyScope scope;
    private AgenteUsoRepositorio uso;
    private AgenteCupoConfig config;
    private AgenteUsoController controller;

    @BeforeEach
    void init() {
        scope = mock(CompanyScope.class);
        uso = new AgenteUsoRepositorio(CupoTestSupport.baseH2());
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        when(empresas.findByIdWithPlan(7L)).thenReturn(Optional.of(empresa(plan("EMPRENDEDOR", true, 100), "a@x.cr")));
        when(empresas.findByIdWithPlan(8L)).thenReturn(Optional.of(empresa(plan("PYME", true, 500), "b@x.cr")));
        config = new AgenteCupoConfig(new BigDecimal("3.00"), new BigDecimal("10.00"), new BigDecimal("30.00"),
            CupoTestSupport.RELOJ);
        AgenteCupoService servicio = new AgenteCupoService(empresas, uso, mock(ConversacionService.class),
            new HasherInterno("pepper-de-prueba"), new TenantInfoBuilder(mock(EmpresaRepository.class), null), config);
        controller = new AgenteUsoController(servicio, scope);
    }

    @Test
    @DisplayName("cada negocio ve su cupo, su costo y su tope; el alcance sale de CompanyScope")
    void aislamientoEntreEmpresas() {
        uso.contarConversacion(7L, config.mesActual(), "hash-a", 100);
        uso.sumarCosto(7L, config.mesActual(), new BigDecimal("1.25"));
        uso.contarConversacion(8L, config.mesActual(), "hash-b1", 500);
        uso.contarConversacion(8L, config.mesActual(), "hash-b2", 500);

        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        AgenteUsoController.UsoAgenteDto a = controller.uso().getBody();
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(8L);
        AgenteUsoController.UsoAgenteDto b = controller.uso().getBody();

        assertThat(a.mes()).isEqualTo("2026-12");
        assertThat(a.conversaciones()).isEqualTo(1);
        assertThat(a.cupo()).isEqualTo(100);
        assertThat(a.costoUsd()).isEqualByComparingTo("1.25");
        assertThat(a.topeUsd()).isEqualByComparingTo("3.00");
        assertThat(b.conversaciones()).isEqualTo(2);
        assertThat(b.cupo()).isEqualTo(500);
        assertThat(b.costoUsd()).isEqualByComparingTo("0");
        assertThat(b.topeUsd()).isEqualByComparingTo("10.00");
    }

    @Test
    @DisplayName("el ADMIN sin impersonar ve HotClick: sin cupo ni tope")
    void adminVeHotClick() {
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(null);
        ResponseEntity<AgenteUsoController.UsoAgenteDto> r = controller.uso();
        assertThat(r.getBody().cupo()).isNull();
        assertThat(r.getBody().topeUsd()).isNull();
    }
}
