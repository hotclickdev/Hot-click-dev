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

    /** P-08: bodegaId=1 explícita ya no se trata como "no enviada": si no existe, 404 como cualquier otra. */
    @Test
    void bodegaId1Explicita_inexistente_esEstricta() {
        when(repo.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> validator().resolverBodegaDefault(Constants.BODEGA_DEFAULT_ID))
            .isInstanceOf(RecursoNoEncontradoException.class);
        verify(repo, never()).findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(anyLong(), anyInt());
    }

    @Test
    void bodegaId1Explicita_existente_seUsa() {
        Bodega b1 = bodega(1L, empresa(1L));
        when(repo.findById(1L)).thenReturn(Optional.of(b1));
        assertThat(validator().resolverBodegaDefault(1L)).isSameAs(b1);
    }

    /** P-08: bodegaId=1 de otro negocio también dispara CMP-4, igual que cualquier id ajeno. */
    @Test
    void cmp4_bodegaId1Ajena_exige_igualQueIdAjeno() {
        Empresa tienda = empresa(7L);
        Bodega ajena1 = bodega(1L, empresa(2L));
        Bodega ajena = bodega(9L, empresa(2L));
        PaymentCheckoutRequest r = req(3L);
        r.setBodegaId(Constants.BODEGA_DEFAULT_ID);
        assertThatThrownBy(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(r, Map.of(3L, producto(3L, tienda)), ajena1))
            .isInstanceOf(IllegalArgumentException.class);
        r.setBodegaId(9L);
        assertThatThrownBy(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(r, Map.of(3L, producto(3L, tienda)), ajena))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
