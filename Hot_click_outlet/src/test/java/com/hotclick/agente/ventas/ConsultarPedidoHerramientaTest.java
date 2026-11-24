package com.hotclick.agente.ventas;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Aislamiento: solo pedidos del mismo teléfono y de la misma empresa. */
class ConsultarPedidoHerramientaTest {

    private static final ObjectMapper OM = new ObjectMapper();

    private PedidoVentasRepository repo;
    private ConsultarPedidoHerramienta tool;

    @BeforeEach
    void init() {
        repo = mock(PedidoVentasRepository.class);
        tool = new ConsultarPedidoHerramienta(repo);
    }

    private static Pedido pedido(Long empresaId, String numero, String tel, String estado, int total, String guia) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        Pedido p = new Pedido();
        p.setEmpresa(e);
        p.setNumeroPedido(numero);
        p.setClienteTel(tel);
        p.setEstadoPedido(estado);
        p.setTotalPedido(total);
        p.setNumeroGuia(guia);
        return p;
    }

    private ResultadoHerramienta consulta(Long empresaId, String contacto, String json) throws Exception {
        return tool.ejecutar(new ContextoHerramienta(empresaId, contacto, PerfilAgente.NEGOCIO_VENTAS), OM.readTree(json));
    }

    @Test
    void devuelveSoloPedidosDelMismoTelefonoNormalizado() throws Exception {
        when(repo.recientesDeEmpresa(eq(7L), any(Pageable.class))).thenReturn(List.of(
            pedido(7L, "HC-1", "8888-7777", "ENVIADO", 15000, "GUIA9"),
            pedido(7L, "HC-2", "50611112222", "PAGADO", 9000, null)));

        ResultadoHerramienta r = consulta(7L, "50688887777", "{\"numeroPedido\":\"\"}");

        assertThat(r.esError()).isFalse();
        assertThat(r.contenido()).contains("HC-1", "ENVIADO", "GUIA9", "15.000").doesNotContain("HC-2");
    }

    @Test
    void nuncaMuestraPedidosDeOtraEmpresaAunqueElRepositorioLosDevuelva() throws Exception {
        when(repo.recientesDeEmpresa(eq(7L), any(Pageable.class))).thenReturn(List.of(
            pedido(99L, "HC-OTRA", "88887777", "PAGADO", 1000, null)));

        ResultadoHerramienta r = consulta(7L, "50688887777", "{\"numeroPedido\":\"\"}");

        assertThat(r.contenido()).doesNotContain("HC-OTRA").contains("No se encontraron");
    }

    @Test
    void numeroDePedidoDeOtroClienteNoSeRevela() throws Exception {
        when(repo.recientesDeEmpresa(eq(7L), any(Pageable.class))).thenReturn(List.of(
            pedido(7L, "HC-AJENO", "70000000", "PAGADO", 5000, null)));

        ResultadoHerramienta r = consulta(7L, "50688887777", "{\"numeroPedido\":\"HC-AJENO\"}");

        assertThat(r.contenido()).doesNotContain("PAGADO").contains("No se encontraron");
    }

    @Test
    void consultaSiempreUsaLaEmpresaDelContexto() throws Exception {
        when(repo.recientesDeEmpresa(any(), any(Pageable.class))).thenReturn(List.of());

        consulta(7L, "WAID-1", "{\"numeroPedido\":\"\",\"empresaId\":999}");
        // WAID-1 no es un teléfono válido: ni siquiera consulta
        org.mockito.Mockito.verifyNoInteractions(repo);

        consulta(7L, "50688887777", "{\"numeroPedido\":\"\",\"empresaId\":999}");
        org.mockito.Mockito.verify(repo).recientesDeEmpresa(eq(7L), any(Pageable.class));
    }

    @Test
    void contactoNoVerificableEsError() throws Exception {
        assertThat(consulta(7L, "WAID-1", "{\"numeroPedido\":\"\"}").esError()).isTrue();
    }
}
