package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * G1: con la bandera legacy apagada (valor de producción), {@code /api/sinpe/guest-checkout} y
 * {@code /api/payments/guest-checkout} no crean un pago SINPE confirmable a mano. Solo EFECTIVO pasa.
 */
@DisplayName("[G1] Checkout público: sin SINPE manual, solo efectivo")
@TestPropertySource(properties = "hotclick.checkout.sinpe-manual.habilitado=false")
class SinpeCheckoutSoloEfectivoTest extends BaseIntegrationTest {

    @Autowired private PagoRepository pagoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private Bodega bodega;
    private Producto producto;
    private int correo;

    @BeforeEach
    void setUp() {
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("G1 Inc");
        empresa.setSlug("g1-" + System.nanoTime());
        empresa.setCorreoEmpresa("g1" + System.nanoTime() + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        Categoria categoria = new Categoria();
        categoria.setNombreCategoria("Cat-G1");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega G1");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("88880000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega.setPermiteRetiroCliente(true);
        bodega.setAceptaEfectivo(true);
        bodega = bodegaRepository.saveAndFlush(bodega);

        producto = new Producto();
        producto.setNombreProducto("Producto G1");
        producto.setSku("SKU-G1-" + System.nanoTime());
        producto.setPrecioVenta(10000);
        producto.setPrecioCompra(7000);
        producto.setStockActual(50);
        producto.setStockReservado(0);
        producto.setStockMinimo(1);
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setVisibleCatalogo(true);
        producto.setCategoria(categoria);
        producto.setEmpresa(empresa);
        producto.setBodega(bodega);
        producto.setAdminCliente(adminUser);
        producto.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        producto = productoRepository.saveAndFlush(producto);
    }

    @AfterEach
    void tearDown() {
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @ParameterizedTest(name = "[{index}] {0} {1} → 400 y no se crea pedido ni pago")
    @CsvSource({
        "/api/sinpe/guest-checkout,SINPE", "/api/sinpe/guest-checkout,TRANSFERENCIA",
        "/api/sinpe/guest-checkout,ONVO", "/api/payments/guest-checkout,SINPE"})
    @DisplayName("Ataque: checkout público con proveedor no efectivo no crea un pago SINPE")
    void proveedorNoEfectivo_400(String ruta, String proveedor) throws Exception {
        mockMvc.perform(post(ruta).contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.77").content(cuerpo(proveedor)))
            .andExpect(status().isBadRequest());
        assertThat(pedidoRepository.count()).isZero();
        assertThat(pagoRepository.count()).isZero();
    }

    @Test
    @DisplayName("Ataque: checkout público sin proveedor tampoco crea un pago SINPE")
    void sinProveedor_400() throws Exception {
        mockMvc.perform(post("/api/sinpe/guest-checkout").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.78")
                .content(cuerpo(null)))
            .andExpect(status().isBadRequest());
        assertThat(pedidoRepository.count()).isZero();
    }

    @Test
    @DisplayName("Legítimo: checkout público en efectivo sigue funcionando")
    void efectivo_ok() throws Exception {
        mockMvc.perform(post("/api/sinpe/guest-checkout").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.79").content(cuerpo("EFECTIVO")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
        assertThat(pedidoRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Bug bodega: envío a domicilio con bodegaId de otra tienda ya no da 'La bodega elegida no es de la tienda'")
    void envioConBodegaDeOtraTienda_ok() throws Exception {
        Empresa otra = new Empresa();
        otra.setNombreEmpresa("Otra G1");
        otra.setSlug("otra-g1-" + System.nanoTime());
        otra.setCorreoEmpresa("otra" + System.nanoTime() + "@test.cr");
        otra.setEstadoEmpresa("ACTIVO");
        otra.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        otra = empresaRepository.saveAndFlush(otra);
        Bodega ajena = new Bodega();
        ajena.setNombreBodega("Bodega ajena");
        ajena.setDireccionExacta("Calle Otra");
        ajena.setTelefono("88880001");
        ajena.setHorarioApertura(java.time.LocalTime.of(8, 0));
        ajena.setHorarioCierre(java.time.LocalTime.of(18, 0));
        ajena.setAdminCliente(adminUser);
        ajena.setEmpresa(otra);
        ajena.setEstado(Constants.ESTADO_ACTIVO);
        ajena.setAceptaEfectivo(true);
        ajena = bodegaRepository.saveAndFlush(ajena);

        String body = """
            {"bodegaId":%d,"metodoEnvio":"%s","provider":"EFECTIVO","guestEmail":"g1-env-%d@test.cr",
             "guestPhone":"88887777","direccionEntrega":"Limón, Matina, Carrandi",
             "items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(ajena.getId(), "ENVIO_NORMAL_GAM", System.nanoTime(), producto.getId());
        mockMvc.perform(post("/api/sinpe/guest-checkout").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.80").content(body))
            .andExpect(status().isOk());
        assertThat(pedidoRepository.count()).isEqualTo(1);
    }

    /** En prod la bodega 1 (HotClick) existe y es el fallback cuando bodegaId viene null; acá se crea. */
    private void asegurarBodegaHotClick1() {
        Integer hay = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_bodega_tb WHERE id_bodega = 1", Integer.class);
        if (hay != null && hay > 0) return;
        Bodega hc = new Bodega();
        hc.setNombreBodega("HotClick central");
        hc.setDireccionExacta("Central");
        hc.setTelefono("88880002");
        hc.setHorarioApertura(java.time.LocalTime.of(8, 0));
        hc.setHorarioCierre(java.time.LocalTime.of(18, 0));
        hc.setAdminCliente(adminUser);
        hc.setEstado(Constants.ESTADO_ACTIVO);
        hc = bodegaRepository.saveAndFlush(hc);
        jdbcTemplate.update("UPDATE hot_click_bodega_tb SET id_bodega = 1 WHERE id_bodega = ?", hc.getId());
    }

    @Test
    @DisplayName("QA5-002: envío sin bodegaId (null) ya no da 400 de validación")
    void envioConBodegaNull_ok() throws Exception {
        asegurarBodegaHotClick1();
        String body = """
            {"bodegaId":null,"metodoEnvio":"ENVIO_NORMAL_GAM","provider":"EFECTIVO","guestEmail":"g1-null-%d@test.cr",
             "guestPhone":"88886666","direccionEntrega":"Limón, Matina, Carrandi",
             "items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(System.nanoTime(), producto.getId());
        mockMvc.perform(post("/api/sinpe/guest-checkout").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.81").content(body))
            .andExpect(status().isOk());
        assertThat(pedidoRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("QA5-002: retiro en tienda sin bodegaId da 400 (fail-closed) y no crea pedido")
    void retiroSinBodega_400() throws Exception {
        asegurarBodegaHotClick1();
        String body = """
            {"metodoEnvio":"%s","provider":"EFECTIVO","guestEmail":"g1-rsb-%d@test.cr",
             "guestPhone":"88885555","items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(Constants.ENVIO_RETIRO, System.nanoTime(), producto.getId());
        mockMvc.perform(post("/api/sinpe/guest-checkout").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", "203.0.113.82").content(body))
            .andExpect(status().isBadRequest());
        assertThat(pedidoRepository.count()).isZero();
    }

    private String cuerpo(String proveedor) {
        String prov = proveedor == null ? "" : "\"provider\":\"" + proveedor + "\",";
        return """
            {"bodegaId":%d,"metodoEnvio":"%s",%s"guestEmail":"g1-%d@test.cr",
             "guestPhone":"8888%04d","items":[{"productoId":%d,"cantidad":1}]}
            """.formatted(bodega.getId(), Constants.ENVIO_RETIRO, prov, ++correo, correo, producto.getId());
    }
}
