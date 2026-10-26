package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** P-04 ciclo 2: un pedido es_prueba (llave ONVO test) no cuenta en métricas, reportes ni quincena. */
@DisplayName("P-04 | es_prueba excluido de métricas")
class PedidoPruebaMetricasTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private WalletTransaccionRepository txRepository;
    @Autowired private CrmPedidoRepository crmPedidoRepository;
    @Autowired private PagoRepository pagoRepository;

    private Empresa empresa;
    private Bodega bodega;
    private Pedido real;
    private Pedido prueba;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setNombreEmpresa("Prueba Metricas");
        empresa.setSlug("prueba-metricas-test");
        empresa.setCorreoEmpresa("pmet@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega PMET");
        b.setDireccionExacta("Calle 1");
        b.setTelefono("88880001");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(b);
        real = crear("ORD-PMET-1", false);
        prueba = crear("ORD-PMET-2", true);
    }

    @AfterEach
    void tearDown() {
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    void metricasYReportesExcluyenPedidosDePrueba() {
        Long id = empresa.getId();
        assertThat(pedidoRepository.countTotalPedidosByEmpresaId(id)).isEqualTo(1);
        assertThat(pedidoRepository.sumTotalVentasByEmpresaId(id)).isEqualTo(15000);
        assertThat(pedidoRepository.countByEmpresaIdAndEstadoPedidoAndEstado(id, Constants.PEDIDO_ENTREGADO, Constants.ESTADO_ACTIVO)).isEqualTo(1);
        assertThat(pedidoRepository.countByEstadoPedidoAndEstado(Constants.PEDIDO_ENTREGADO, Constants.ESTADO_ACTIVO)).isEqualTo(1);
        assertThat(pedidoRepository.countTotalPedidos()).isEqualTo(1);
        assertThat(pedidoRepository.sumTotalVentas()).isEqualTo(15000);
        LocalDateTime desde = LocalDateTime.now().minusDays(1), hasta = LocalDateTime.now().plusDays(1);
        List<String> estados = List.of(Constants.PEDIDO_ENTREGADO);
        assertThat(pedidoRepository.sumTotalEnPeriodo(id, desde, hasta, estados)).isEqualTo(15000);
        assertThat(pedidoRepository.countPorEstadosEnPeriodo(desde, hasta, estados)).isEqualTo(1);
        assertThat(pedidoRepository.findConEmpresaEnPeriodo(desde, hasta, estados)).extracting(Pedido::getId).containsExactly(real.getId());
        assertThat(pedidoRepository.sumVentasPorEmpresa()).hasSize(1);
        assertThat(txRepository.findPedidosPrueba(List.of(real.getId(), prueba.getId()))).containsExactly(prueba.getId());
    }

    /** Ciclo 3: la consola CRM no lista ni suma pedidos de prueba. */
    @Test
    void crmExcluyePedidosDePrueba() {
        Long id = empresa.getId();
        List<String> pagados = List.of(Constants.PEDIDO_ENTREGADO);
        assertThat(crmPedidoRepository.buscar(id, null, org.springframework.data.domain.PageRequest.of(0, 10)))
            .extracting(Pedido::getId).containsExactly(real.getId());
        Object[] neg = crmPedidoRepository.resumenNegocio(id, pagados).get(0);
        assertThat(((Number) neg[0]).longValue()).isEqualTo(1);
        assertThat(((Number) neg[1]).longValue()).isEqualTo(15000);
        Object[] comp = crmPedidoRepository.resumenComprador(testUser.getId(), pagados).get(0);
        assertThat(((Number) comp[0]).longValue()).isEqualTo(1);
        assertThat(crmPedidoRepository.compradoresDistintosDeNegocio(id)).isEqualTo(1);
    }

    /** Ciclo 3 (BAJO): los conteos de pagos por empresa no incluyen cobros de prueba. */
    @Test
    void conteosDePagoPorEmpresaExcluyenPrueba() {
        pago(real, "tok-pmet-real");
        pago(prueba, "tok-pmet-prueba");
        Long id = empresa.getId();
        assertThat(pagoRepository.countByEstadoPagoAndEmpresa(Constants.PAGO_PENDIENTE, id)).isEqualTo(1);
        assertThat(pagoRepository.countByProveedorAndEmpresa(Constants.PROVEEDOR_SINPE, id)).isEqualTo(1);
    }

    private void pago(Pedido pedido, String token) {
        Pago p = new Pago();
        p.setMerchantToken(token);
        p.setMonto(15000);
        p.setProveedor(Constants.PROVEEDOR_SINPE);
        p.setEstadoPago(Constants.PAGO_PENDIENTE);
        p.setPedido(pedido);
        p.setUsuario(testUser);
        p.setFechaCreacion(LocalDateTime.now());
        pagoRepository.saveAndFlush(p);
    }

    /** Las consultas nativas (DATE() de Postgres) no corren en H2: se fija el filtro en la SQL. */
    @Test
    void consultasNativasDeReportesFiltranEsPrueba() {
        for (String m : List.of("reporteIvaKpis", "reporteIvaDetalle", "statsPorUsuario", "statsPorUsuarioYEmpresa")) {
            String sql = java.util.Arrays.stream(PedidoRepository.class.getMethods())
                .filter(x -> x.getName().equals(m)).findFirst().orElseThrow()
                .getAnnotation(org.springframework.data.jpa.repository.Query.class).value();
            assertThat(sql).as(m).contains("p.es_prueba = false");
        }
    }

    private Pedido crear(String numero, boolean esPrueba) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_ENTREGADO);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(15000);
        p.setTotalPedido(15000);
        p.setCostoTotalProductos(10000);
        p.setUtilidadBruta(5000);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        p.setEsPrueba(esPrueba);
        return pedidoRepository.saveAndFlush(p);
    }
}
