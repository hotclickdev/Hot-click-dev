package com.hotclick.integration;

import com.hotclick.exception.ContraEntregaSoloPlataformaException;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.WalletService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Efectivo online y contra entrega (21-oct-2026) con el {@link AggregatorService} REAL. Solo se simula
 * {@link WalletService}: el upsert de la billetera usa ON CONFLICT DO UPDATE, que H2 no soporta, y lo que
 * se prueba aquí es la decisión de acreditar o no.
 */
@DisplayName("Billetera: efectivo online no acredita; contra entrega de Envío Normal sí")
class AggregatorEfectivoOnlineIntegrationTest extends BaseIntegrationTest {

    private static final String ENVIO_NORMAL = "ENVIO_NORMAL";

    @MockitoBean private WalletService walletService;

    @Autowired private AggregatorService aggregatorService;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private AuditoriaAdminRepository auditoriaRepository;

    private Empresa empresa;
    private String tokenEmp;
    private Bodega bodega;
    private int secuencia;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresa = crearEmpresa("Efectivo Online", "efectivo-online-test", "eo@test.cr");
        Usuario emprendedor = crearUsuario("vend-eo@test.cr", "Vendedor EO", rolEmp);
        emprendedor.setEmpresa(empresa);
        emprendedor = usuarioRepository.saveAndFlush(emprendedor);
        tokenEmp = tokenPara(emprendedor, Constants.ROL_EMPRENDEDOR);
        bodega = crearBodega(empresa);
        auditoriaRepository.deleteAll();
    }

    @AfterEach
    void tearDown() {
        auditoriaRepository.deleteAll();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Pedido online en efectivo con retiro en tienda: no acredita billetera")
    void efectivoOnline_noAcredita() {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PAGADO, "EFECTIVO", Constants.ENVIO_RETIRO);
        aggregatorService.acreditarVentaEnTransaccion(p);
        verify(walletService, never()).acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }

    @Test
    @DisplayName("Contra entrega con Envío Normal (online): sí acredita billetera")
    void contraEntregaEnvioNormal_acredita() {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PAGADO, "CONTRA_ENTREGA", ENVIO_NORMAL);
        aggregatorService.acreditarVentaEnTransaccion(p);
        verify(walletService).acreditarVenta(eq(empresa.getId()), anyLong(), eq(15000L), anyLong(), anyLong(), eq(p.getId()));
    }

    @Test
    @DisplayName("El vendedor no puede confirmar a mano una contra entrega de Envío Normal: 403 con codigo, nada cambia")
    void vendedor_noConfirmaContraEntregaEnvioNormal() throws Exception {
        Pedido p = crearPedido(empresa, Constants.PEDIDO_PENDIENTE, "CONTRA_ENTREGA", ENVIO_NORMAL);
        crearPago(p);

        mockMvc.perform(put("/api/pedidos/" + p.getId() + "/estado")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"PAGADO\",\"referencia\":\"recibido\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.data.codigo").value(ContraEntregaSoloPlataformaException.CODIGO));

        assertThat(pedidoRepository.findById(p.getId()).orElseThrow().getEstadoPedido())
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
        verify(walletService, never()).acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Bodega crearBodega(Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega PM");
        b.setDireccionExacta("Calle PM 1");
        b.setTelefono("77770000");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Pedido crearPedido(Empresa empresa, String estado, String metodoPago, String metodoEnvio) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-PM-" + (++secuencia));
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(15000);
        p.setTotalPedido(15000);
        p.setCostoTotalProductos(10000);
        p.setUtilidadBruta(5000);
        p.setMetodoPago(metodoPago);
        p.setMetodoEnvio(metodoEnvio);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }


    private void crearPago(Pedido p) {
        Pago pago = new Pago();
        pago.setMerchantToken("tok-" + java.util.UUID.randomUUID());
        pago.setMonto(p.getTotalPedido());
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now());
        pagoRepository.saveAndFlush(pago);
    }
}
