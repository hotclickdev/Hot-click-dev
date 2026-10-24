package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** Prod: el reset borró la bodega 1 y el checkout caía con "Bodega no encontrado: 1". */
class BodegaDefaultFallbackTest {

    private final BodegaRepository repo = mock(BodegaRepository.class);

    private CheckoutValidator validator() {
        CheckoutValidator v = new CheckoutValidator();
        ReflectionTestUtils.setField(v, "bodegaRepository", repo);
        return v;
    }

    private static Bodega bodega(long id, Empresa e) { Bodega b = new Bodega(); b.setId(id); b.setEmpresa(e); return b; }
    private static Empresa empresa(long id) { Empresa e = new Empresa(); e.setId(id); return e; }

    @Test
    void sinBodega1_usaPrimeraActivaDePlataforma() {
        Bodega alt = bodega(9L, empresa(1L));
        when(repo.findById(1L)).thenReturn(Optional.empty());
        when(repo.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(Constants.EMPRESA_PLATAFORMA_ID, Constants.ESTADO_ACTIVO))
            .thenReturn(List.of(alt));
        assertThat(validator().resolverBodegaDefault(null)).isSameAs(alt);
    }

    @Test
    void sinBodega1_niPlataforma_devuelveNullSinLanzar() {
        when(repo.findById(1L)).thenReturn(Optional.empty());
        when(repo.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(anyLong(), anyInt())).thenReturn(List.of());
        assertThat(validator().resolverBodegaDefault(null)).isNull();
    }

    @Test
    void bodegaIdExplicitaInexistente_sigueSiendoEstricta() {
        when(repo.findById(5L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> validator().resolverBodegaDefault(5L)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    private static PaymentCheckoutRequest req(long productoId) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        PaymentCheckoutRequest.ItemDTO it = new PaymentCheckoutRequest.ItemDTO();
        it.setProductoId(productoId); it.setCantidad(1);
        r.setItems(List.of(it));
        return r;
    }

    private static Producto producto(long id, Empresa e) {
        Producto p = new Producto(); p.setId(id); p.setEmpresa(e); p.setPrecioVenta(1000); p.setNombreProducto("Taza");
        return p;
    }

    @Test
    void plannerSinDefault_usaBodegaActivaDeLaTiendaDelProducto() {
        Empresa e = empresa(7L);
        Bodega b7 = bodega(70L, e);
        when(repo.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(7L, Constants.ESTADO_ACTIVO)).thenReturn(List.of(b7));
        var paquetes = new CheckoutPaquetesPlanner(repo).planificar(req(3L), Map.of(3L, producto(3L, e)), null);
        assertThat(paquetes).hasSize(1);
        assertThat(paquetes.get(0).bodega()).isSameAs(b7);
    }

    @Test
    void plannerSinNingunaBodega_fallaConMensajeClaro() {
        Empresa e = empresa(7L);
        when(repo.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(anyLong(), anyInt())).thenReturn(List.of());
        assertThatThrownBy(() -> new CheckoutPaquetesPlanner(repo).planificar(req(3L), Map.of(3L, producto(3L, e)), null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("Taza");
    }

    /** Repro exacto de guest-checkout en prod: el front manda bodegaId=1 con envío y 2 productos HotClick. */
    @Test
    void guestCheckout_envio_bodegaId1Explicita_inexistente_usaFallback() {
        Empresa hc = empresa(Constants.EMPRESA_PLATAFORMA_ID);
        Bodega alt = bodega(9L, hc);
        when(repo.findById(1L)).thenReturn(Optional.empty());
        when(repo.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(Constants.EMPRESA_PLATAFORMA_ID, Constants.ESTADO_ACTIVO))
            .thenReturn(List.of(alt));
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        PaymentCheckoutRequest.ItemDTO a = new PaymentCheckoutRequest.ItemDTO(); a.setProductoId(3L); a.setCantidad(1);
        PaymentCheckoutRequest.ItemDTO b = new PaymentCheckoutRequest.ItemDTO(); b.setProductoId(4L); b.setCantidad(1);
        r.setItems(List.of(a, b));
        r.setBodegaId(Constants.BODEGA_DEFAULT_ID);
        r.setMetodoEnvio("ENVIO_NORMAL_GAM");

        Bodega def = validator().resolverBodegaDefault(r.getBodegaId());
        assertThat(def).isSameAs(alt);
        var paquetes = new CheckoutPaquetesPlanner(repo).planificar(r,
            Map.of(3L, producto(3L, hc), 4L, producto(4L, hc)), def);
        assertThat(paquetes).hasSize(1);
        assertThat(paquetes.get(0).bodega()).isSameAs(alt);
        assertThat(paquetes.get(0).items()).hasSize(2);
        assertThat(paquetes.get(0).metodoEnvio()).isEqualTo("ENVIO_NORMAL_GAM");
    }

    @Test
    void bodegaId1Explicita_existente_seUsa() {
        Bodega b1 = bodega(1L, empresa(1L));
        when(repo.findById(1L)).thenReturn(Optional.of(b1));
        assertThat(validator().resolverBodegaDefault(1L)).isSameAs(b1);
    }

    /** bodegaId=1 con fallback a bodega de otro negocio no dispara CMP-4; un id explícito ajeno sí. */
    @Test
    void cmp4_bodegaDefault1_noExige_peroIdAjenoSi() {
        Empresa tienda = empresa(7L);
        Bodega ajena = bodega(9L, empresa(2L));
        PaymentCheckoutRequest r = req(3L);
        r.setBodegaId(Constants.BODEGA_DEFAULT_ID);
        CheckoutGrupoFactory.exigirBodegaDeLaTienda(r, Map.of(3L, producto(3L, tienda)), ajena);
        r.setBodegaId(9L);
        assertThatThrownBy(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(r, Map.of(3L, producto(3L, tienda)), ajena))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
