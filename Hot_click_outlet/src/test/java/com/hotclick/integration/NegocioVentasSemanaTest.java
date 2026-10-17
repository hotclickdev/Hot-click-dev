package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Usuario;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("S4-23 — ventas de la semana del negocio")
class NegocioVentasSemanaTest extends BaseIntegrationTest {

    private static final String URL = "/api/negocio/ventas/semana";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private WalletTransaccionRepository ledger;

    private Empresa empresa;
    private Empresa otra;
    private String token;

    @BeforeEach
    void setUp() {
        Plan plan = new Plan();
        plan.setNombre("Plan Ventas Test");
        plan.setComisionPorcentaje(new BigDecimal("5.00"));
        plan.setComisionMinimaCrc(700);
        plan = planRepository.saveAndFlush(plan);
        empresa = empresa("ventas-a", plan);
        otra = empresa("ventas-b", null);
        Usuario u = crearUsuario("ventas-v@test.cr", "V", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        u.setEmpresa(empresa);
        u = usuarioRepository.saveAndFlush(u);
        token = tokenPara(u, Constants.ROL_EMPRENDEDOR);

        venta(empresa, LocalDateTime.of(2026, 10, 12, 9, 0), 20000, 1000, 0);   // 5 % = 1000
        venta(empresa, LocalDateTime.of(2026, 10, 14, 9, 0), 4000, 700, 100);   // 5 % = 200 < 700 → mínimo
        venta(empresa, LocalDateTime.of(2026, 10, 19, 9, 0), 9999, 500, 0);     // otra semana
        venta(otra, LocalDateTime.of(2026, 10, 13, 9, 0), 50000, 2500, 0);      // otro negocio
    }

    @AfterEach
    void tearDown() {
        ledger.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
        planRepository.findAll().stream().filter(p -> "Plan Ventas Test".equals(p.getNombre())).forEach(planRepository::delete);
    }

    private Empresa empresa(String slug, Plan plan) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e.setPlan(plan);
        return empresaRepository.saveAndFlush(e);
    }

    private void venta(Empresa e, LocalDateTime fecha, long bruto, long saas, long gw) {
        WalletTransaccion t = new WalletTransaccion();
        t.setEmpresaId(e.getId());
        t.setTipo(WalletTransaccion.CREDITO_VENTA);
        t.setMonto(bruto - saas - gw);
        t.setTotalBruto(bruto);
        t.setComisionSaas(saas);
        t.setComisionGw(gw);
        t.setDescripcion("Venta");
        t.setFechaCreacion(fecha);
        ledger.saveAndFlush(t);
    }

    @Test
    void semanaDelNegocio_soloSusVentas() throws Exception {
        mockMvc.perform(get(URL).param("desde", "2026-10-15").header("Authorization", token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.desde").value("2026-10-12"))
            .andExpect(jsonPath("$.data.hasta").value("2026-10-18"))
            .andExpect(jsonPath("$.data.porcentaje").value(5.0))
            .andExpect(jsonPath("$.data.minimoComision").value(700))
            .andExpect(jsonPath("$.data.ventas.length()").value(2))
            .andExpect(jsonPath("$.data.ventas[1].minimoAplicado").value(true))
            .andExpect(jsonPath("$.data.ventas[1].comision").value(800))
            .andExpect(jsonPath("$.data.totales.bruto").value(24000))
            .andExpect(jsonPath("$.data.totales.comision").value(1800))
            .andExpect(jsonPath("$.data.totales.neto").value(22200))
            .andExpect(jsonPath("$.data.totales.conMinimo").value(1))
            .andExpect(jsonPath("$.data.totales.cantidad").value(2));
    }

    @Test
    void empresaIdAjenoEnQuery_seIgnora() throws Exception {
        mockMvc.perform(get(URL).param("desde", "2026-10-12").param("empresaId", otra.getId().toString())
                .header("Authorization", token))
            .andExpect(jsonPath("$.data.totales.bruto").value(24000));
    }

    @Autowired private com.hotclick.repository.PedidoRepository pedidoRepository;
    @Autowired private com.hotclick.repository.ProductoRepository productoRepository;
    @Autowired private com.hotclick.repository.CategoriaRepository categoriaRepository;
    @Autowired private com.hotclick.repository.BodegaRepository bodegaRepository;

    @Test
    void producto_esElNombreDelProducto_noLaDescripcionDelLedger() throws Exception {
        ledger.deleteAll();
        com.hotclick.model.Categoria cat = new com.hotclick.model.Categoria();
        cat.setNombreCategoria("Cat Ventas Semana");
        cat.setEstado(Constants.ESTADO_ACTIVO);
        cat.setAdminCliente(adminUser);
        cat = categoriaRepository.saveAndFlush(cat);
        com.hotclick.model.Bodega b = new com.hotclick.model.Bodega();
        b.setNombreBodega("Bodega Ventas Semana");
        b.setDireccionExacta("Calle 1");
        b.setTelefono("88880000");
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        b = bodegaRepository.saveAndFlush(b);
        com.hotclick.model.Producto cafe = producto("Café de altura", "SKU-VS-1", cat, b);
        com.hotclick.model.Producto taza = producto("Taza", "SKU-VS-2", cat, b);
        com.hotclick.model.Pedido uno = pedido("ORD-VS-1", b, cafe);
        com.hotclick.model.Pedido dos = pedido("ORD-VS-2", b, cafe, taza);
        ventaDePedido(uno, LocalDateTime.of(2026, 10, 12, 9, 0));
        ventaDePedido(dos, LocalDateTime.of(2026, 10, 13, 9, 0));
        venta(empresa, LocalDateTime.of(2026, 10, 14, 9, 0), 1000, 700, 0);   // sin pedido

        try {
            mockMvc.perform(get(URL).param("desde", "2026-10-12").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ventas[0].producto").value("Café de altura"))
                .andExpect(jsonPath("$.data.ventas[1].producto").value("Café de altura y 1 más"))
                .andExpect(jsonPath("$.data.ventas[2].producto").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.minimoComision").value(700));
        } finally {
            ledger.deleteAll();
            pedidoRepository.deleteAll();
            productoRepository.deleteAll();
            bodegaRepository.deleteAll();
            categoriaRepository.delete(cat);
        }
    }

    @Test
    void minimoComision_salDelPlan_ySinMinimoEsNull() throws Exception {
        // El ₡700 viene de la configuración del plan (V168 lo carga en los planes); aquí, de la fila del plan.
        mockMvc.perform(get(URL).param("desde", "2026-10-12").header("Authorization", token))
            .andExpect(jsonPath("$.data.minimoComision").value(700));
        Plan plan = empresa.getPlan();
        plan.setComisionMinimaCrc(0);
        planRepository.saveAndFlush(plan);
        mockMvc.perform(get(URL).param("desde", "2026-10-12").header("Authorization", token))
            .andExpect(jsonPath("$.data.minimoComision").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.data.ventas[1].minimoAplicado").value(false));
    }

    private com.hotclick.model.Producto producto(String nombre, String sku, com.hotclick.model.Categoria cat,
                                                 com.hotclick.model.Bodega b) {
        com.hotclick.model.Producto p = new com.hotclick.model.Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku);
        p.setPrecioVenta(1000);
        p.setPrecioCompra(500);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setCategoria(cat);
        p.setEmpresa(empresa);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    private com.hotclick.model.Pedido pedido(String numero, com.hotclick.model.Bodega b,
                                             com.hotclick.model.Producto... productos) {
        com.hotclick.model.Pedido p = new com.hotclick.model.Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.of(2026, 10, 12, 8, 0));
        p.setEstadoPedido(Constants.PEDIDO_PAGADO);
        p.setUsuarioFinal(testUser);
        p.setBodega(b);
        p.setEmpresa(empresa);
        p.setSubtotal(1000);
        p.setTotalPedido(1000);
        p.setCostoTotalProductos(500);
        p.setUtilidadBruta(500);
        p.setMetodoPago("ONVO");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        java.util.List<com.hotclick.model.PedidoItem> items = new java.util.ArrayList<>();
        for (com.hotclick.model.Producto prod : productos) {
            com.hotclick.model.PedidoItem i = new com.hotclick.model.PedidoItem();
            i.setPedido(p);
            i.setProducto(prod);
            i.setCantidad(1);
            i.setPrecioUnitarioMomento(1000);
            i.setCostoUnitarioMomento(500);
            i.setSubtotalItem(1000);
            i.setUtilidadItem(500);
            items.add(i);
        }
        p.setItems(items);
        return pedidoRepository.saveAndFlush(p);
    }

    private void ventaDePedido(com.hotclick.model.Pedido p, LocalDateTime fecha) {
        WalletTransaccion t = new WalletTransaccion();
        t.setEmpresaId(empresa.getId());
        t.setTipo(WalletTransaccion.CREDITO_VENTA);
        t.setMonto(300L);
        t.setTotalBruto(1000L);
        t.setComisionSaas(700L);
        t.setComisionGw(0L);
        t.setReferenciaTipo(WalletTransaccion.REF_PEDIDO);
        t.setReferenciaId(p.getId());
        t.setDescripcion("Venta pedido " + p.getNumeroPedido());
        t.setFechaCreacion(fecha);
        ledger.saveAndFlush(t);
    }

    @Test
    void comprador_403() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", userToken)).andExpect(status().isForbidden());
    }

    @Test
    void fechaMalFormada_400() throws Exception {
        mockMvc.perform(get(URL).param("desde", "lunes").header("Authorization", token)).andExpect(status().isBadRequest());
    }
}
