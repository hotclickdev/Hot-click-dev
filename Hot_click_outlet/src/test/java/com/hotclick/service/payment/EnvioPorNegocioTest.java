package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.security.TenantContext;
import com.hotclick.service.CuponService;
import com.hotclick.service.GiftCardService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * A-2 y MED-3 Auditor 3: el envío se cobra una vez por negocio (no por bodega), GAM o fuera del GAM lo decide el
 * servidor con provincia y cantón del destino (desconocido = fuera del GAM) y un producto sin bodega propia que
 * despacha desde la bodega de venta online de su tienda toma su envío.
 */
@DisplayName("A-2 / MED-3 Auditor 3 | envío por negocio y zona del servidor")
class EnvioPorNegocioTest {

    private static final String GAM = "ENVIO_NORMAL_GAM";

    @AfterEach void limpiar() { TenantContext.clear(); }

    private final Map<Long, Producto> productos = new HashMap<>();
    private final List<PaymentCheckoutRequest.ItemDTO> items = new ArrayList<>();
    private long siguienteId = 900L;

    private static Empresa empresa(long id) { Empresa e = new Empresa(); e.setId(id); e.setNombreEmpresa("N" + id); return e; }
    private static Bodega bodega(long id, Empresa e) {
        Bodega b = new Bodega(); b.setId(id); b.setEmpresa(e); b.setPermiteRetiroCliente(false); return b;
    }

    private void producto(Empresa e, Bodega propia) {
        Producto p = new Producto(); p.setId(siguienteId); p.setNombreProducto("P" + siguienteId);
        p.setPrecioVenta(10_000); p.setPrecioCompra(5_000); p.setEmpresa(e); p.setBodega(propia);
        productos.put(siguienteId, p);
        PaymentCheckoutRequest.ItemDTO item = new PaymentCheckoutRequest.ItemDTO();
        item.setProductoId(siguienteId++); item.setCantidad(1);
        items.add(item);
    }

    private PaymentCheckoutRequest req(String metodo, String provincia, String canton) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setItems(items); r.setMetodoEnvio(metodo); r.setProvider("ONVO");
        r.setProvincia(provincia); r.setCanton(canton);
        return r;
    }

    private static CheckoutGrupoFactory factory() {
        OrderPricingService pricing = new OrderPricingService();
        ReflectionTestUtils.setField(pricing, "cuponService", mock(CuponService.class));
        ReflectionTestUtils.setField(pricing, "giftCardService", mock(GiftCardService.class));
        CheckoutOrderFactory orders = mock(CheckoutOrderFactory.class);
        when(orders.crearSubpedido(any(), anyInt(), anyInt(), any(), any(), any(), any(), any(), any(), any()))
            .thenAnswer(inv -> {
                OrderPricingResult r = inv.getArgument(0);
                Pedido p = new Pedido();
                p.setCostoEnvio(r.costoEnvio()); p.setTotalPedido(r.totalConGC());
                p.setBodega(inv.getArgument(5)); p.setMetodoEnvio(inv.getArgument(6));
                return p;
            });
        return new CheckoutGrupoFactory(new CheckoutValidator(), new CheckoutPaquetesPlanner(), pricing,
            orders, mock(GiftCardService.class));
    }

    private CheckoutGrupoFactory.Grupo crear(PaymentCheckoutRequest r) {
        return factory().crear(r, new StockReservationResult(0, 0, productos), null, "ONVO", null, "PENDIENTE");
    }

    private static int envioTotal(CheckoutGrupoFactory.Grupo g) {
        return g.subpedidos().stream().mapToInt(s -> s.pricing().costoEnvio()).sum();
    }

    @Test
    @DisplayName("Un negocio con 2 bodegas en el mismo pedido paga un solo envío (GAM ₡4.000)")
    void dosBodegasMismoNegocioUnEnvio() {
        Empresa a = empresa(71L);
        producto(a, bodega(711L, a));
        producto(a, bodega(712L, a));
        CheckoutGrupoFactory.Grupo g = crear(req(GAM, "San José", "Escazú"));
        assertThat(g.subpedidos()).hasSize(2);
        assertThat(envioTotal(g)).isEqualTo(4000);
        assertThat(g.subpedidos().get(0).pricing().costoEnvio()).isEqualTo(4000);
        assertThat(g.subpedidos().get(1).pricing().costoEnvio()).isZero();
        // El cobro (ONVO recibe la suma del grupo) cuadra con subtotales + un solo envío.
        assertThat(g.totalCobro()).isEqualTo(20_000 + 4000);
    }

    @Test
    @DisplayName("Dos negocios pagan dos envíos")
    void dosNegociosDosEnvios() {
        Empresa a = empresa(72L), b = empresa(73L);
        producto(a, bodega(721L, a));
        producto(b, bodega(731L, b));
        CheckoutGrupoFactory.Grupo g = crear(req(GAM, "Heredia", "Belén"));
        assertThat(g.subpedidos()).extracting(s -> s.pricing().costoEnvio()).containsExactly(4000, 4000);
        assertThat(g.totalCobro()).isEqualTo(20_000 + 8000);
    }

    @Test
    @DisplayName("Negocio con destino fuera del GAM: ₡5.500 aunque el cliente mande GAM")
    void fueraGamIgnoraLoQueMandaElCliente() {
        Empresa a = empresa(74L);
        producto(a, bodega(741L, a));
        CheckoutGrupoFactory.Grupo g = crear(req(GAM, "Limón", "Pococí"));
        assertThat(envioTotal(g)).isEqualTo(5500);
        assertThat(g.subpedidos().get(0).pedido().getMetodoEnvio()).isEqualTo("ENVIO_NORMAL_FUERA_GAM");
    }

    @Test
    @DisplayName("Negocio GAM: el cliente manda fuera del GAM y el servidor cobra GAM (₡4.000)")
    void gamAunqueElClienteMandeFuera() {
        Empresa a = empresa(75L);
        producto(a, bodega(751L, a));
        CheckoutGrupoFactory.Grupo g = crear(req("ENVIO_NORMAL_FUERA_GAM", "san jose", "ESCAZU"));
        assertThat(envioTotal(g)).isEqualTo(4000);
        assertThat(g.subpedidos().get(0).pedido().getMetodoEnvio()).isEqualTo(GAM);
    }

    @Test
    @DisplayName("Pedido mixto: negocio A con 2 bodegas + negocio B, fuera del GAM = 2 × ₡5.500")
    void mixtoDosNegocios() {
        Empresa a = empresa(76L), b = empresa(77L);
        producto(a, bodega(761L, a));
        producto(a, bodega(762L, a));
        producto(b, bodega(771L, b));
        CheckoutGrupoFactory.Grupo g = crear(req(GAM, "Alajuela", "San Carlos"));
        assertThat(g.subpedidos()).extracting(s -> s.pricing().costoEnvio()).containsExactly(5500, 0, 5500);
        assertThat(g.totalCobro()).isEqualTo(30_000 + 11_000);
    }

    @Test
    @DisplayName("Zona desconocida (sin provincia/cantón o cantón inventado): fuera del GAM")
    void zonaDesconocidaFueraGam() {
        Empresa a = empresa(78L);
        producto(a, bodega(781L, a));
        assertThat(envioTotal(crear(req(GAM, null, null)))).isEqualTo(5500);
        assertThat(envioTotal(crear(req(GAM, "San José", "Atlantis")))).isEqualTo(5500);
    }

    @Test
    @DisplayName("Clasificación de cantones: tildes y mayúsculas normalizadas; Puriscal (San José) no es GAM")
    void clasificacionCantones() {
        Empresa a = empresa(79L);
        producto(a, bodega(791L, a));
        assertThat(envioTotal(crear(req(GAM, "Cartago", "La Unión")))).isEqualTo(4000);
        assertThat(envioTotal(crear(req(GAM, "HEREDIA", "santo domingo")))).isEqualTo(4000);
        assertThat(envioTotal(crear(req(GAM, " Alajuela ", "Poás")))).isEqualTo(4000);
        assertThat(envioTotal(crear(req(GAM, "San José", "Puriscal")))).isEqualTo(5500);
        assertThat(envioTotal(crear(req(GAM, "Guanacaste", "Liberia")))).isEqualTo(5500);
    }

    @Test
    @DisplayName("MED-3 (a): producto sin bodega propia con bodegaVentaOnline toma el envío del paquete sin bodegaId")
    void sinBodegaConVentaOnlineTomaSuEnvio() {
        Empresa a = empresa(80L);
        Bodega online = bodega(801L, a);
        online.setPermiteRetiroCliente(true);
        a.setBodegaVentaOnline(online);
        producto(a, null);
        PaymentCheckoutRequest r = req("RETIRO_EN_TIENDA", "San José", "Tibás");
        PaymentCheckoutRequest.EnvioPaqueteDTO envio = new PaymentCheckoutRequest.EnvioPaqueteDTO();
        envio.setMetodoEnvio(GAM);
        r.setEnvios(List.of(envio));
        CheckoutGrupoFactory.Grupo g = crear(r);
        assertThat(g.subpedidos().get(0).pedido().getMetodoEnvio()).isEqualTo(GAM);
        assertThat(envioTotal(g)).isEqualTo(4000);
    }
}
