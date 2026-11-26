package com.hotclick.agente.cupo;

import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.interno.HasherInterno;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.tenant.TenantInfoBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static com.hotclick.agente.cupo.CupoTestSupport.empresa;
import static com.hotclick.agente.cupo.CupoTestSupport.plan;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("Cupo de conversaciones por plan y tope de gasto de IA (AG-29)")
class AgenteCupoServiceTest {

    private JdbcTemplate jdbc;
    private AgenteUsoRepositorio uso;
    private EmpresaRepository empresas;
    private ConversacionService conversaciones;
    private AgenteCupoConfig config;
    private AgenteCupoService servicio;

    @BeforeEach
    void init() {
        jdbc = CupoTestSupport.baseH2();
        uso = new AgenteUsoRepositorio(jdbc);
        empresas = mock(EmpresaRepository.class);
        conversaciones = mock(ConversacionService.class);
        config = new AgenteCupoConfig(new BigDecimal("3.00"), new BigDecimal("10.00"), new BigDecimal("30.00"),
            CupoTestSupport.RELOJ);
        TenantInfoBuilder planes = new TenantInfoBuilder(mock(EmpresaRepository.class), null);
        servicio = new AgenteCupoService(empresas, uso, conversaciones, new HasherInterno("pepper-de-prueba"), planes, config);
    }

    private void conPlan(Long empresaId, String nombre, boolean agente, int cupo) {
        when(empresas.findByIdWithPlan(empresaId)).thenReturn(Optional.of(empresa(plan(nombre, agente, cupo), "d@x.cr")));
    }

    private ConversacionActiva conv(Long empresaId, String contacto) {
        return CupoTestSupport.conversacion(empresaId, PerfilConversacion.NEGOCIO_VENTAS, contacto);
    }

    @Test
    @DisplayName("un mismo cliente cuenta una sola vez al mes")
    void unClienteCuentaUnaVez() {
        conPlan(7L, "EMPRENDEDOR", true, 2);
        for (int i = 0; i < 5; i++) assertThat(servicio.permitir(conv(7L, "50688880001"))).isTrue();
        assertThat(servicio.resumen(7L).conversaciones()).isEqualTo(1);
    }

    @Test
    @DisplayName("al pasar el cupo el bot se corta y la conversación pasa a PERSONA con marca de cupo agotado")
    void corteAlPasarElCupo() {
        conPlan(7L, "EMPRENDEDOR", true, 2);
        assertThat(servicio.permitir(conv(7L, "50688880001"))).isTrue();
        assertThat(servicio.permitir(conv(7L, "50688880002"))).isTrue();
        ConversacionActiva tercero = conv(7L, "50688880003");
        assertThat(servicio.permitir(tercero)).isFalse();
        verify(conversaciones).pausarPorCupo(tercero.sesionId(), 7L);
        // El cliente que ya estaba contado sigue siendo atendido, y el rechazado no quedó contado.
        assertThat(servicio.permitir(conv(7L, "50688880001"))).isTrue();
        assertThat(servicio.resumen(7L).conversaciones()).isEqualTo(2);
    }

    @Test
    @DisplayName("la cuenta de HotClick (empresa null) no tiene cupo ni se cuenta")
    void hotClickSinCupo() {
        for (int i = 0; i < 10; i++) {
            assertThat(servicio.permitir(CupoTestSupport.conversacion(null, PerfilConversacion.HOTCLICK, "5060000000" + i))).isTrue();
        }
        verify(conversaciones, never()).pausarPorCupo(any(), anyLong());
        assertThat(servicio.resumen(null).cupo()).isNull();
    }

    @Test
    @DisplayName("el modo interno no consume cupo")
    void internoNoConsume() {
        assertThat(servicio.permitir(CupoTestSupport.conversacion(7L, PerfilConversacion.NEGOCIO_INTERNO, "50688880001"))).isTrue();
        assertThat(uso.leer(7L, config.mesActual()).conversaciones()).isZero();
    }

    @Test
    @DisplayName("un plan sin la función agente no tiene bot")
    void planSinAgente() {
        conPlan(7L, "OTRO", false, 0);
        assertThat(servicio.permitir(conv(7L, "50688880001"))).isFalse();
        verify(conversaciones).pausarPorCupo(any(), anyLong());
    }

    @Test
    @DisplayName("cupo -1 es ilimitado")
    void ilimitado() {
        conPlan(7L, "NEGOCIO_PLUS", true, -1);
        for (int i = 0; i < 4; i++) assertThat(servicio.permitir(conv(7L, "5068888000" + i))).isTrue();
        assertThat(servicio.resumen(7L).conversaciones()).isEqualTo(4);
    }

    @Test
    @DisplayName("el tope de gasto de IA corta al bot aunque quede cupo")
    void topeDeGasto() {
        conPlan(7L, "EMPRENDEDOR", true, 100);
        assertThat(servicio.permitir(conv(7L, "50688880001"))).isTrue();
        uso.sumarCosto(7L, config.mesActual(), new BigDecimal("3.00"));
        ConversacionActiva otra = conv(7L, "50688880009");
        assertThat(servicio.permitir(otra)).isFalse();
        verify(conversaciones).pausarPorCupo(otra.sesionId(), 7L);
        assertThat(servicio.resumen(7L).conversaciones()).isEqualTo(1); // el cortado por gasto no consume cupo
    }

    @Test
    @DisplayName("los topes de plan distintos: PyME admite más gasto que Emprendedor")
    void topePorPlan() {
        conPlan(8L, "PYME", true, 500);
        uso.sumarCosto(8L, config.mesActual(), new BigDecimal("5.00"));
        assertThat(servicio.permitir(conv(8L, "50688880001"))).isTrue();
    }

    @Test
    @DisplayName("el uso de un negocio no se mezcla con el de otro")
    void aislamientoEntreEmpresas() {
        conPlan(7L, "EMPRENDEDOR", true, 1);
        conPlan(8L, "EMPRENDEDOR", true, 1);
        assertThat(servicio.permitir(conv(7L, "50688880001"))).isTrue();
        assertThat(servicio.permitir(conv(8L, "50688880001"))).isTrue(); // mismo cliente, otro negocio: cuenta aparte
        uso.sumarCosto(7L, config.mesActual(), new BigDecimal("1.50"));
        assertThat(servicio.resumen(8L).costoUsd()).isEqualByComparingTo("0");
        assertThat(servicio.resumen(7L).costoUsd()).isEqualByComparingTo("1.50");
    }

    @Test
    @DisplayName("un error de base de datos no deja responder al bot (falla cerrado)")
    void falloCerrado() {
        when(empresas.findByIdWithPlan(7L)).thenThrow(new IllegalStateException("bd"));
        assertThat(servicio.permitir(conv(7L, "50688880001"))).isFalse();
    }
}
