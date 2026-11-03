package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.security.TenantContext;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Paquete "sin-bodega": {@code envios[].bodegaId} ausente. El planner lo asocia al paquete que armó el backend
 * con la bodega default; un paquete con bodega real solo toma el envío de su id. La validación de tenant de una
 * bodega con id no cambia.
 */
@DisplayName("envío de paquete sin bodegaId: matching en el planner y tenant intacto")
class PaqueteSinBodegaEnvioTest {

    private static final long VENDEDOR = 53L, TERCERA = 54L;

    @AfterEach void limpiar() { TenantContext.clear(); }

    private static Empresa empresa(long id) { Empresa e = new Empresa(); e.setId(id); return e; }
    private static Bodega bodega(long id, long empresaId) {
        Bodega b = new Bodega(); b.setId(id); b.setEmpresa(empresa(empresaId)); return b;
    }
    private static Producto producto(long id, Bodega propia) {
        Producto p = new Producto(); p.setId(id); p.setPrecioVenta(1000); p.setNombreProducto("P" + id);
        p.setBodega(propia);
        return p;
    }
    private static PaymentCheckoutRequest.ItemDTO item(long id) {
        PaymentCheckoutRequest.ItemDTO it = new PaymentCheckoutRequest.ItemDTO();
        it.setProductoId(id); it.setCantidad(1); return it;
    }
    private static PaymentCheckoutRequest.EnvioPaqueteDTO envio(Long bodegaId, String metodo) {
        PaymentCheckoutRequest.EnvioPaqueteDTO e = new PaymentCheckoutRequest.EnvioPaqueteDTO();
        e.setBodegaId(bodegaId); e.setMetodoEnvio(metodo); return e;
    }
    private static PaymentCheckoutRequest req(List<PaymentCheckoutRequest.EnvioPaqueteDTO> envios, Long... productos) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setItems(java.util.Arrays.stream(productos).map(PaqueteSinBodegaEnvioTest::item).toList());
        r.setEnvios(envios);
        r.setProvincia("San José"); r.setCanton("San José"); // paquetes a domicilio exigen destino (#448)
        return r;
    }

    private final Bodega bodegaDefault = bodega(1L, Constants.EMPRESA_PLATAFORMA_ID);
    private final Bodega bodegaReal = bodega(70L, 7L);

    @Test
    @DisplayName("paquete sin bodega propia toma el envío sin bodegaId")
    void sinBodegaToma_envioSinId() {
        var r = req(List.of(envio(null, Constants.ENVIO_ENCOMIENDA)), 10L);
        var paquetes = new CheckoutPaquetesPlanner().planificar(r, Map.of(10L, producto(10L, null)), bodegaDefault);
        assertThat(paquetes).hasSize(1);
        assertThat(paquetes.get(0).bodega()).isSameAs(bodegaDefault);
        assertThat(paquetes.get(0).metodoEnvio()).isEqualTo(Constants.ENVIO_ENCOMIENDA);
    }

    @Test
    @DisplayName("carrito mixto: cada paquete toma su envío, el real por id y el sin-bodega por ausencia")
    void mixto_cadaPaqueteConSuEnvio() {
        var r = req(List.of(envio(null, Constants.ENVIO_ENCOMIENDA), envio(70L, Constants.ENVIO_RETIRO)), 10L, 11L);
        var paquetes = new CheckoutPaquetesPlanner().planificar(r,
            Map.of(10L, producto(10L, null), 11L, producto(11L, bodegaReal)), bodegaDefault);
        assertThat(paquetes).hasSize(2);
        assertThat(paquetes.get(0).bodega()).isSameAs(bodegaDefault);
        assertThat(paquetes.get(0).metodoEnvio()).isEqualTo(Constants.ENVIO_ENCOMIENDA);
        assertThat(paquetes.get(1).bodega()).isSameAs(bodegaReal);
        assertThat(paquetes.get(1).metodoEnvio()).isEqualTo(Constants.ENVIO_RETIRO);
    }

    @Test
    @DisplayName("un paquete con bodega real NO toma el envío sin id: cae al método global / retiro")
    void bodegaRealNoTomaEnvioSinId() {
        var r = req(List.of(envio(null, Constants.ENVIO_ENCOMIENDA)), 11L);
        var paquetes = new CheckoutPaquetesPlanner().planificar(r, Map.of(11L, producto(11L, bodegaReal)), bodegaDefault);
        assertThat(paquetes.get(0).metodoEnvio()).isEqualTo(Constants.ENVIO_RETIRO);
    }

    @Test
    @DisplayName("el envío con id de otra bodega no se asigna al paquete sin bodega")
    void envioConOtroIdNoSeAsignaAlSinBodega() {
        var r = req(List.of(envio(999L, Constants.ENVIO_ENCOMIENDA)), 10L);
        var paquetes = new CheckoutPaquetesPlanner().planificar(r, Map.of(10L, producto(10L, null)), bodegaDefault);
        assertThat(paquetes.get(0).metodoEnvio()).isEqualTo(Constants.ENVIO_RETIRO);
    }

    @Test
    @DisplayName("un envío null dentro de la lista no rompe el matching")
    void envioNuloEnLista() {
        var lista = new java.util.ArrayList<PaymentCheckoutRequest.EnvioPaqueteDTO>();
        lista.add(null); lista.add(envio(null, Constants.ENVIO_ENCOMIENDA));
        var paquetes = new CheckoutPaquetesPlanner().planificar(req(lista, 10L), Map.of(10L, producto(10L, null)), bodegaDefault);
        assertThat(paquetes.get(0).metodoEnvio()).isEqualTo(Constants.ENVIO_ENCOMIENDA);
    }

    @Test
    @DisplayName("assertBodegaTenant sigue rechazando una bodega con id de otra tienda (tenant con negocio)")
    void bodegaAjenaConIdSigueFallando_tenant() {
        TenantContext.set(52L);
        assertThatThrownBy(() -> new CheckoutValidator().assertBodegaTenant(bodega(61L, TERCERA), 61L, Set.of(VENDEDOR)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("La bodega seleccionada no pertenece a esta tienda");
    }

    @Test
    @DisplayName("assertBodegaTenant sigue rechazando bodega de tercero también para invitado")
    void bodegaAjenaConIdSigueFallando_invitado() {
        assertThatThrownBy(() -> new CheckoutValidator().assertBodegaTenant(bodega(61L, TERCERA), 61L, Set.of(VENDEDOR)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("La bodega seleccionada no pertenece a esta tienda");
    }

    @Test
    @DisplayName("assertBodegaTenant acepta la bodega del vendedor del paquete")
    void bodegaDelVendedorPasa() {
        TenantContext.set(52L);
        new CheckoutValidator().assertBodegaTenant(bodega(60L, VENDEDOR), 60L, Set.of(VENDEDOR));
    }
}
