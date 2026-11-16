package com.hotclick.controller;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PedidoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * IDOR entre negocios: POST /api/pedidos recalcula precios desde el catálogo; el producto de OTRO negocio
 * no puede entrar (ni filtrar su costo/precioCompra en la respuesta) y no debe llegar al servicio.
 */
@DisplayName("PedidoController.crearPedido: producto de otro negocio")
class PedidoControllerCatalogoIdorTest {

    static final Long NEGOCIO_A = 1L;
    static final Long NEGOCIO_B = 2L;
    static final Long PRODUCTO_DE_A = 10L;
    static final Long PRODUCTO_DE_B = 99L;

    private MockMvc mvc;
    private PedidoService pedidoService;
    private CompanyScope scope;

    private static Producto producto(Long id, Long empresaId, int venta, int compra) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        Producto p = new Producto();
        p.setId(id);
        p.setEmpresa(e);
        p.setPrecioVenta(venta);
        p.setPrecioCompra(compra);
        return p;
    }

    @BeforeEach
    void setUp() {
        Producto deA = producto(PRODUCTO_DE_A, NEGOCIO_A, 1000, 400);
        Producto deB = producto(PRODUCTO_DE_B, NEGOCIO_B, 5000, 777);

        // Repositorio fiel: findById ve todo; el método filtrado por negocio solo devuelve el del negocio pedido.
        ProductoRepository repo = mock(ProductoRepository.class, invocation -> {
            String m = invocation.getMethod().getName();
            Object[] a = invocation.getArguments();
            if (m.equals("findById")) {
                return a[0].equals(PRODUCTO_DE_A) ? Optional.of(deA) : a[0].equals(PRODUCTO_DE_B) ? Optional.of(deB) : Optional.empty();
            }
            if (m.equals("findByIdAndEmpresaId")) {
                Producto p = a[0].equals(PRODUCTO_DE_A) ? deA : a[0].equals(PRODUCTO_DE_B) ? deB : null;
                return Optional.ofNullable(p).filter(x -> a[1].equals(x.getEmpresaId()));
            }
            return null;
        });

        Empresa empresaA = new Empresa();
        empresaA.setId(NEGOCIO_A);
        EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
        when(empresaRepo.findById(NEGOCIO_A)).thenReturn(Optional.of(empresaA));

        scope = mock(CompanyScope.class);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(NEGOCIO_A);
        pedidoService = mock(PedidoService.class);
        when(pedidoService.crearPedido(any())).thenAnswer(i -> i.getArgument(0));

        PedidoController c = new PedidoController();
        ReflectionTestUtils.setField(c, "companyScope", scope);
        ReflectionTestUtils.setField(c, "pedidoService", pedidoService);
        ReflectionTestUtils.setField(c, "productoRepository", repo);
        ReflectionTestUtils.setField(c, "empresaRepository", empresaRepo);
        mvc = MockMvcBuilders.standaloneSetup(c).build();
    }

    private MvcResult crear(Long productoId) throws Exception {
        String json = "{\"items\":[{\"producto\":{\"id\":" + productoId + "},\"cantidad\":2}]}";
        return mvc.perform(post("/api/pedidos").contentType(MediaType.APPLICATION_JSON).content(json)).andReturn();
    }

    @Test
    @DisplayName("Producto de OTRO negocio → 4xx, sin crear pedido y sin filtrar costo/precioCompra")
    void productoAjeno_rechazadoSinFiltrarDatos() throws Exception {
        MvcResult r = crear(PRODUCTO_DE_B);
        String body = r.getResponse().getContentAsString();
        // (i) exposición: costoUnitarioMomento (777*... ) y precioCompra del producto ajeno en la respuesta
        assertThat(body).as("respuesta no debe contener costoUnitarioMomento=777").doesNotContain("\"costoUnitarioMomento\":777");
        assertThat(body).as("respuesta no debe contener precioCompra=777").doesNotContain("\"precioCompra\":777");
        assertThat(r.getResponse().getStatus()).as("estado HTTP").isIn(400, 404);
        verify(pedidoService, never()).crearPedido(any());
    }

    @Test
    @DisplayName("Producto del propio negocio → se crea con precio y costo del catálogo")
    void productoPropio_ok() throws Exception {
        MvcResult r = crear(PRODUCTO_DE_A);
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        var cap = org.mockito.ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoService).crearPedido(cap.capture());
        assertThat(cap.getValue().getItems().get(0).getPrecioUnitarioMomento()).isEqualTo(1000);
        assertThat(cap.getValue().getItems().get(0).getCostoUnitarioMomento()).isEqualTo(400);
        assertThat(cap.getValue().getTotalPedido()).isEqualTo(2000);
    }

    @Test
    @DisplayName("ADMIN de plataforma (empresa del scope null) conserva el catálogo global")
    void adminPlataforma_ve_catalogoGlobal() throws Exception {
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(null);
        MvcResult r = crear(PRODUCTO_DE_B);
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        verify(pedidoService).crearPedido(any());
    }
}
