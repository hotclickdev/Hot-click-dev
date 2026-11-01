package com.hotclick.service.pos;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.PosQrSesion;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TurnoCajaRepository;
import com.hotclick.repository.UsuarioRepository;
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

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("POS QR — M4: el QR cobra el IVA de la factura y el pedido lo registra")
class PosQrIvaRegimenTest {

    @Mock PosQrSesionRepository posQrRepo;
    @Mock UsuarioRepository usuarioRepo;
    @Mock EmpresaRepository empresaRepo;
    @Mock ProductoRepository productoRepo;
    @Mock TurnoCajaRepository turnoCajaRepo;
    @Mock BodegaRepository bodegaRepo;
    @Mock PosQrStockReserva stockReserva;
    @InjectMocks PosQrSessionService service;

    private Empresa empresa;

    @BeforeEach
    void setUp() {
        empresa = new Empresa(); empresa.setId(1L); empresa.setEstadoEmpresa("ACTIVO");
        Producto p = new Producto(); p.setId(10L); p.setEmpresa(empresa); p.setNombreProducto("Cable");
        p.setPrecioVenta(5000); p.setEstado(Constants.ESTADO_ACTIVO); p.setPorcentajeIva(new BigDecimal("13.00"));
        when(productoRepo.findEmpresaIdById(10L)).thenReturn(Optional.of(1L));
        when(productoRepo.findById(10L)).thenReturn(Optional.of(p));
        when(usuarioRepo.findById(5L)).thenReturn(Optional.of(new Usuario()));
        when(empresaRepo.findById(1L)).thenReturn(Optional.of(empresa));
        when(posQrRepo.save(any(PosQrSesion.class))).thenAnswer(i -> i.getArgument(0));
    }

    private PosQrSesion crear(boolean factura) {
        Map<String, Object> item = new HashMap<>(Map.of("productoId", 10L, "cantidad", 3));
        return service.crearSesion(5L, 1L, null, "TARJETA", null, new ArrayList<>(List.of(item)), null, null, null, factura);
    }

    @Test
    @DisplayName("simplificado + factura: el QR cobra precio + 13 % y guarda el IVA")
    void facturaSumaIva() {
        PosQrSesion s = crear(true);
        assertThat(s.isFacturaElectronica()).isTrue();
        assertThat(s.getMontoImpuesto()).isEqualTo(1950);
        assertThat(s.getTotal()).isEqualTo(16950);
    }

    @Test
    @DisplayName("tiquete o régimen tradicional: el QR cobra el precio tal cual")
    void sinIvaSumado() {
        assertThat(crear(false).getTotal()).isEqualTo(15000);
        empresa.setRegimenIva("TRADICIONAL");
        PosQrSesion s = crear(true);
        assertThat(s.getTotal()).isEqualTo(15000);
        assertThat(s.getMontoImpuesto()).isZero();
    }

    @Test
    @DisplayName("el pedido del QR separa subtotal e IVA y su XML cuadra con lo cobrado")
    void pedidoCuadraConXml() {
        var t = PosQrPedidoFactory.totalesCobrados(new PosQrPedidoFactory.TotalesQr(15000, 6000), 16950, 1950, "tokenx");
        assertThat(t.subtotal()).isEqualTo(15000);
        assertThat(t.impuesto()).isEqualTo(1950);
        assertThat(t.totalPedido()).isEqualTo(16950);

        Pedido pedido = new Pedido();
        pedido.setEmpresa(empresa);
        Producto prod = new Producto(); prod.setId(10L); prod.setNombreProducto("Cable");
        prod.setPorcentajeIva(new BigDecimal("13.00")); prod.setCodigoTarifaIva("08"); prod.setCodigoCabys("4321150100101");
        PedidoItem it = new PedidoItem(); it.setProducto(prod); it.setCantidad(3); it.setPrecioUnitarioMomento(5000);
        it.setSubtotalItem(15000); it.setPedido(pedido);
        pedido.setItems(List.of(it));
        pedido.setSubtotal(t.subtotal()); pedido.setDescuentoTotal(0); pedido.setCostoEnvio(0);
        pedido.setMontoImpuesto(t.impuesto()); pedido.setTotalPedido(t.totalPedido());
        assertThat(PosVentaIvaRegimenTest.totalXml(pedido, ComprobanteFiscal.TIPO_FACTURA)).isEqualTo(16950L);
    }

    @Test
    @DisplayName("MEDIO-2 (#428): crear QR con producto de otro negocio o inexistente da el mismo 404 fijo, sin id")
    void crearSesionNoRevelaAjenoNiInexistente() {
        when(productoRepo.findEmpresaIdById(11L)).thenReturn(Optional.of(2L));
        when(productoRepo.findEmpresaIdById(404L)).thenReturn(Optional.empty());
        Throwable a = org.assertj.core.api.Assertions.catchThrowable(() -> crearCon(11L));
        Throwable n = org.assertj.core.api.Assertions.catchThrowable(() -> crearCon(404L));
        org.assertj.core.api.Assertions.assertThat(a).isInstanceOf(com.hotclick.exception.RecursoNoEncontradoException.class)
            .hasMessage("Producto no encontrado");
        org.assertj.core.api.Assertions.assertThat(n).isInstanceOf(a.getClass()).hasMessage(a.getMessage());
        org.assertj.core.api.Assertions.assertThat(a.getMessage()).doesNotContain("11");
    }

    private PosQrSesion crearCon(Long productoId) {
        Map<String, Object> item = new HashMap<>(Map.of("productoId", productoId, "cantidad", 1));
        return service.crearSesion(5L, 1L, null, "TARJETA", null, new ArrayList<>(List.of(item)), null, null, null, false);
    }
}
