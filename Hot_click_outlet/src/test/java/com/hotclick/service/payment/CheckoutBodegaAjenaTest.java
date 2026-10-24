package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CMP-4 | bodega de otro negocio en el checkout (solo se exige con retiro en tienda)")
class CheckoutBodegaAjenaTest {

    private static final String ENVIO_NORMAL_GAM = "ENVIO_NORMAL_GAM";

    private static Empresa empresa(long id) { Empresa e = new Empresa(); e.setId(id); return e; }
    private static Bodega bodega(long empresaId) { Bodega b = new Bodega(); b.setEmpresa(empresa(empresaId)); return b; }
    private static Producto producto(long empresaId) { Producto p = new Producto(); p.setEmpresa(empresa(empresaId)); return p; }
    private static PaymentCheckoutRequest req(Long bodegaId, String metodo) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest(); r.setBodegaId(bodegaId); r.setMetodoEnvio(metodo); return r;
    }
    private static PaymentCheckoutRequest.ItemDTO item(long productoId) {
        PaymentCheckoutRequest.ItemDTO i = new PaymentCheckoutRequest.ItemDTO(); i.setProductoId(productoId); return i;
    }
    private static List<CheckoutPaquetesPlanner.Paquete> paquete(Bodega origen, String metodo, long productoId) {
        return List.of(new CheckoutPaquetesPlanner.Paquete(origen, List.of(item(productoId)), 14500, 0, metodo, null));
    }

    @Test
    void envioConBodegaDefault1YProductoDeOtraEmpresaNoLanza() {
        assertThatCode(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(1L, ENVIO_NORMAL_GAM),
            Map.of(578L, producto(54)), bodega(1), paquete(bodega(54), ENVIO_NORMAL_GAM, 578L))).doesNotThrowAnyException();
        assertThatCode(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(1L, Constants.ENVIO_DOMICILIO),
            Map.of(578L, producto(54)), bodega(1), paquete(bodega(54), Constants.ENVIO_DOMICILIO, 578L))).doesNotThrowAnyException();
    }

    @Test
    void envioConBodegaNullNoLanza() {
        assertThatCode(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(null, ENVIO_NORMAL_GAM),
            Map.of(578L, producto(54)), bodega(1), paquete(bodega(54), ENVIO_NORMAL_GAM, 578L))).doesNotThrowAnyException();
    }

    @Test
    void retiroConBodegaAjenaLanza() {
        assertThatThrownBy(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(52L, Constants.ENVIO_RETIRO),
            Map.of(578L, producto(53)), bodega(52), paquete(bodega(53), Constants.ENVIO_RETIRO, 578L)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void retiroConBodegaPropiaPasa() {
        assertThatCode(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(54L, Constants.ENVIO_RETIRO),
            Map.of(577L, producto(52)), bodega(52), paquete(bodega(52), Constants.ENVIO_RETIRO, 577L))).doesNotThrowAnyException();
    }

    @Test
    void retiroSinBodegaFailClosed() {
        assertThatThrownBy(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(null, Constants.ENVIO_RETIRO),
            Map.of(577L, producto(52)), bodega(1), paquete(bodega(52), Constants.ENVIO_RETIRO, 577L)))
            .isInstanceOf(IllegalArgumentException.class);
        Bodega sinNegocio = new Bodega();
        assertThatThrownBy(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(9L, Constants.ENVIO_RETIRO),
            Map.of(577L, producto(52)), sinNegocio, paquete(bodega(52), Constants.ENVIO_RETIRO, 577L)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void retiroPorPaqueteConBodegaDeOrigenAjenaLanza() {
        PaymentCheckoutRequest r = req(null, ENVIO_NORMAL_GAM);
        PaymentCheckoutRequest.EnvioPaqueteDTO e = new PaymentCheckoutRequest.EnvioPaqueteDTO();
        e.setBodegaId(1L); e.setMetodoEnvio(Constants.ENVIO_RETIRO);
        r.setEnvios(List.of(e));
        // Producto sin bodega propia cae en la bodega 1 (HotClick); retirar ahí un producto de la 54 se rechaza.
        assertThatThrownBy(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(r,
            Map.of(578L, producto(54)), bodega(1), paquete(bodega(1), Constants.ENVIO_RETIRO, 578L)))
            .isInstanceOf(IllegalArgumentException.class);
        // Retiro por paquete en la bodega de la propia tienda: pasa aunque el body no traiga bodegaId.
        assertThatCode(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(r,
            Map.of(578L, producto(54)), bodega(1), paquete(bodega(54), Constants.ENVIO_RETIRO, 578L))).doesNotThrowAnyException();
    }

    @Test
    void retiroEnBodegaHotClickDeProductoHotClickPasa() {
        Bodega hotclick = new Bodega();
        Producto propio = new Producto();
        assertThatCode(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(1L, Constants.ENVIO_RETIRO),
            Map.of(10L, propio), hotclick, paquete(hotclick, Constants.ENVIO_RETIRO, 10L))).doesNotThrowAnyException();
    }

    @Test
    void retiroEnPaqueteMixtoConProductoAjenoLanza() {
        // El planner agrupa por bodega de origen: un paquete puede mezclar un producto de la tienda y otro ajeno.
        List<CheckoutPaquetesPlanner.Paquete> mixto = List.of(new CheckoutPaquetesPlanner.Paquete(bodega(52),
            List.of(item(577L), item(578L)), 29000, 0, Constants.ENVIO_RETIRO, null));
        assertThatThrownBy(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(52L, Constants.ENVIO_RETIRO),
            Map.of(577L, producto(52), 578L, producto(53)), bodega(52), mixto))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
