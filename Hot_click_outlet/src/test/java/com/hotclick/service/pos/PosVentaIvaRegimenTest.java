package com.hotclick.service.pos;

import com.hotclick.dto.PosVentaDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.StockService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.service.VentaAvisoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.cache.CacheManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PosVentaService — M4: IVA según régimen y tipo de comprobante")
public class PosVentaIvaRegimenTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock ClienteMostradorResolver clienteMostradorResolver;
    @Mock com.hotclick.repository.PosVentaTurnoRepository ventaTurnoRepository;

    @org.junit.jupiter.api.BeforeEach
    void mostradorDelegaAlRepo() {
        org.mockito.Mockito.lenient().when(clienteMostradorResolver.mostrador())
            .thenAnswer(i -> usuarioRepository.findById(Constants.ID_USUARIO_MOSTRADOR).orElseThrow());
    }
    @Mock private EmpresaRepository empresaRepository;
    @Mock private BodegaRepository bodegaRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private StockService stockService;
    @Mock private TurnoCajaService turnoCajaService;
    @Mock private CacheManager cacheManager;
    @Mock private TelegramNotificacionClienteService telegramNotificacionClienteService;
    @Mock private VentaAvisoService ventaAvisoService;
    @Mock private CompanyScope companyScope;

    @InjectMocks private PosVentaService service;

    private Empresa empresa;
    private Bodega bodega;
    private Producto producto;
    private Usuario cliente;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(1L);
        bodega = new Bodega();
        bodega.setId(2L);
        bodega.setEmpresa(empresa);
        producto = new Producto();
        producto.setId(10L);
        producto.setNombreProducto("Cable");
        producto.setPrecioVenta(5000);
        producto.setPrecioCompra(2000);
        producto.setStockActual(10);
        producto.setStockReservado(0);
        producto.setEmpresa(empresa);
        producto.setPorcentajeIva(new java.math.BigDecimal("13.00"));
        producto.setCodigoTarifaIva("08");
        producto.setCodigoCabys("4321150100101");
        cliente = new Usuario();
        cliente.setId(Constants.ID_USUARIO_MOSTRADOR);
        cliente.setNombre("Mostrador");

        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresa));
        when(usuarioRepository.findById(Constants.ID_USUARIO_MOSTRADOR)).thenReturn(Optional.of(cliente));
        when(bodegaRepository.findByEmpresaIdAndEstado(1L, Constants.ESTADO_ACTIVO))
            .thenReturn(List.of(bodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(producto));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            p.setId(99L);
            return p;
        });
        com.hotclick.model.TurnoCaja turno = new com.hotclick.model.TurnoCaja();
        turno.setId(77L);
        turno.setEmpresa(empresa);
        when(turnoCajaService.getTurnoActivo(5L)).thenReturn(Optional.of(turno));
        when(cacheManager.getCache(anyString())).thenReturn(null);
    }


    private PosVentaDTO venta(boolean factura, int cantidad) {
        PosVentaDTO dto = new PosVentaDTO();
        dto.setMetodoPago("EFECTIVO");
        dto.setFacturaElectronica(factura);
        PosVentaDTO.Item item = new PosVentaDTO.Item();
        item.setProductoId(10L);
        item.setCantidad(cantidad);
        dto.setItems(List.of(item));
        return dto;
    }

    @Test
    @DisplayName("simplificado + tiquete: cobra el precio tal cual")
    void tiqueteCobraPrecio() {
        Pedido pedido = service.crearVenta(venta(false, 1), 5L, 1L, "caja@test.cr");
        assertThat(pedido.getTotalPedido()).isEqualTo(5000);
        assertThat(pedido.getMontoImpuesto()).isZero();
        assertThat(pedido.getAplicaImpuesto()).isFalse();
    }

    @Test
    @DisplayName("simplificado + factura: cobra precio + 13 % y el cobro es igual al TotalComprobante del XML")
    void facturaCobraIvaYCuadraConXml() {
        Pedido pedido = service.crearVenta(venta(true, 3), 5L, 1L, "caja@test.cr");
        assertThat(pedido.getMontoImpuesto()).isEqualTo(1950);
        assertThat(pedido.getTotalPedido()).isEqualTo(16950);
        assertThat(pedido.getUtilidadBruta()).isEqualTo(15000 - 6000);

        assertThat(totalXml(pedido, com.hotclick.model.ComprobanteFiscal.TIPO_FACTURA))
            .isEqualTo(pedido.getTotalPedido().longValue());
    }

    @Test
    @DisplayName("tiquete simplificado: el TotalComprobante del XML también es igual al cobro")
    void tiqueteCuadraConXml() {
        Pedido pedido = service.crearVenta(venta(false, 2), 5L, 1L, "caja@test.cr");
        assertThat(totalXml(pedido, com.hotclick.model.ComprobanteFiscal.TIPO_TIQUETE)).isEqualTo(10000L);
    }

    @Test
    @DisplayName("tradicional + factura: no suma IVA (el precio ya lo incluye)")
    void tradicionalNoSuma() {
        empresa.setRegimenIva("TRADICIONAL");
        Pedido pedido = service.crearVenta(venta(true, 1), 5L, 1L, "caja@test.cr");
        assertThat(pedido.getTotalPedido()).isEqualTo(5000);
        assertThat(pedido.getMontoImpuesto()).isZero();
        assertThat(totalXml(pedido, com.hotclick.model.ComprobanteFiscal.TIPO_FACTURA)).isEqualTo(5000L);
    }

    private PosVentaDTO ventaConDescuento(boolean factura, int cantidad, int descuento) {
        PosVentaDTO dto = venta(factura, cantidad);
        dto.setDescuentoGlobal(descuento);
        when(companyScope.hasAuthority("pos.descuento")).thenReturn(true);
        return dto;
    }

    @Test
    @DisplayName("simplificado + factura con descuento de caja: IVA sobre el neto y cobro = TotalComprobante")
    void facturaConDescuentoCuadraConXml() {
        Pedido pedido = service.crearVenta(ventaConDescuento(true, 3, 1500), 5L, 1L, "caja@test.cr");
        assertThat(pedido.getDescuentoTotal()).isEqualTo(1500);
        assertThat(pedido.getMontoImpuesto()).isEqualTo(1755);      // 13 % de 13 500
        assertThat(pedido.getTotalPedido()).isEqualTo(15255);
        assertThat(totalXml(pedido, com.hotclick.model.ComprobanteFiscal.TIPO_FACTURA))
            .isEqualTo(pedido.getTotalPedido().longValue());
    }

    @Test
    @DisplayName("tiquete y tradicional con descuento: el XML cuadra con lo cobrado")
    void descuentoSinIvaSumadoCuadraConXml() {
        Pedido tiquete = service.crearVenta(ventaConDescuento(false, 2, 999), 5L, 1L, "caja@test.cr");
        assertThat(tiquete.getTotalPedido()).isEqualTo(9001);
        assertThat(totalXml(tiquete, com.hotclick.model.ComprobanteFiscal.TIPO_TIQUETE)).isEqualTo(9001L);

        empresa.setRegimenIva("TRADICIONAL");
        Pedido factura = service.crearVenta(ventaConDescuento(true, 3, 1001), 5L, 1L, "caja@test.cr");
        assertThat(factura.getMontoImpuesto()).isZero();
        assertThat(totalXml(factura, com.hotclick.model.ComprobanteFiscal.TIPO_FACTURA))
            .isEqualTo(factura.getTotalPedido().longValue());
    }

    public static long totalXml(Pedido pedido, String tipo) {
        com.hotclick.model.ComprobanteFiscal cf = new com.hotclick.model.ComprobanteFiscal();
        cf.setTipo(tipo);
        cf.setClaveNumerica("50627082600310100000000100001010000000001199999999");
        cf.setNumeroConsecutivo("00100001010000000001");
        cf.setFechaEmision(java.time.LocalDateTime.of(2026, 10, 25, 10, 0));
        cf.setReceptorNombre("Cliente de prueba");
        cf.setReceptorTipo("01");
        cf.setReceptorCedula("100000000");
        cf.setReceptorCorreo("cliente@example.com");
        Empresa e = pedido.getEmpresa();
        e.setNombreComercialFe("TIENDA PRUEBA");
        e.setActividadEconomica("722003");
        e.setTipoCedula("02");
        e.setCedulaJuridica("3101000000");
        e.setCorreoEmpresa("facturas@example.com");
        e.setUbicacionProvincia("1");
        e.setUbicacionCanton("01");
        e.setUbicacionDistrito("01");
        e.setUbicacionOtrasSenas("Dirección de prueba");
        String xml = new com.hotclick.service.XmlFacturaBuilder().construir(cf, e, pedido);
        new com.hotclick.service.hacienda.XmlFacturaSchemaValidator()
            .validar(com.hotclick.service.hacienda.CertificadoDePrueba.firmar(xml), com.hotclick.model.ComprobanteFiscal.TIPO_FACTURA.equals(tipo));
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("<TotalComprobante>(\\d+)</TotalComprobante>").matcher(xml);
        assertThat(m.find()).isTrue();
        return Long.parseLong(m.group(1));
    }
}
