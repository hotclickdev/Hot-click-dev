package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("S4-20 — número de pedido propio de cada tienda")
class NumeroPedidoTiendaTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    private Bodega bodega;

    private Empresa tiendaA;
    private Empresa tiendaB;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
        tiendaA = empresa("num-a");
        tiendaB = empresa("num-b");
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tokenA = vendedor("num-a@test.cr", tiendaA, rolEmp);
        tokenB = vendedor("num-b@test.cr", tiendaB, rolEmp);
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega Num");
        b.setDireccionExacta("Centro");
        b.setTelefono("88887777");
        b.setHorarioApertura(LocalTime.of(8, 0));
        b.setHorarioCierre(LocalTime.of(17, 0));
        b.setAdminCliente(testUser);
        b.setEmpresa(tiendaA);
        bodega = bodegaRepository.saveAndFlush(b);
    }

    @AfterEach
    void tearDown() {
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM hot_click_pedido_secuencia_tienda_tb");
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Tienda " + slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private String vendedor(String correo, Empresa e, Rol rol) {
        Usuario u = crearUsuario(correo, "Vendedor " + correo, rol);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        return tokenPara(u, Constants.ROL_EMPRENDEDOR);
    }

    private Pedido pedido(Empresa e, String numero, Long numeroTiendaPrevio) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setNumeroTienda(numeroTiendaPrevio);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(testUser);
        p.setEmpresa(e);
        p.setBodega(bodega);
        p.setSubtotal(1000);
        p.setTotalPedido(1000);
        p.setCostoTotalProductos(700);
        p.setUtilidadBruta(300);
        p.setMetodoPago("EFECTIVO");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        return pedidoRepository.saveAndFlush(p);
    }

    @Test
    void cadaTiendaNumeraDesdeUnoSinVerLasOtras() {
        assertThat(pedido(tiendaA, "ORD-NA1", null).getNumeroTienda()).isEqualTo(1L);
        assertThat(pedido(tiendaA, "ORD-NA2", null).getNumeroTienda()).isEqualTo(2L);
        assertThat(pedido(tiendaB, "ORD-NB1", null).getNumeroTienda()).isEqualTo(1L);
        assertThat(pedido(tiendaA, "ORD-NA3", null).getNumeroTienda()).isEqualTo(3L);
    }

    @Test
    void pedidoViejoConservaSuNumeroAlActualizarse() {
        Pedido viejo = pedido(tiendaA, "ORD-VIEJO", null);
        jdbcTemplate.update("UPDATE hot_click_pedido_tb SET numero_tienda = NULL WHERE id_pedido = ?", viejo.getId());
        Pedido recargado = pedidoRepository.findById(viejo.getId()).orElseThrow();
        recargado.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pedidoRepository.saveAndFlush(recargado);
        Pedido final_ = pedidoRepository.findById(viejo.getId()).orElseThrow();
        assertThat(final_.getNumeroPedido()).isEqualTo("ORD-VIEJO");
        assertThat(final_.getNumeroTienda()).isNull();
    }

    @Test
    void vendedorVeSuNumeroDeTienda() throws Exception {
        Pedido p = pedido(tiendaA, "ORD-VER", null);
        mockMvc.perform(get("/api/pedidos/" + p.getId()).header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroTienda").value(1));
    }

    @Test
    void pedidoDeOtraTiendaSigueBloqueado() throws Exception {
        Pedido p = pedido(tiendaA, "ORD-AJENO", null);
        mockMvc.perform(get("/api/pedidos/" + p.getId()).header("Authorization", tokenB))
            .andExpect(status().isForbidden());
    }

    @Test
    void listaDelVendedor_traeNumeroTienda_ySoloSusPedidos() throws Exception {
        pedido(tiendaA, "ORD-LA1", null);
        pedido(tiendaA, "ORD-LA2", null);
        pedido(tiendaB, "ORD-LB1", null);
        mockMvc.perform(get("/api/pedidos").header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.numeroPedido == 'ORD-LA1')].numeroTienda").value(org.hamcrest.Matchers.contains(1)))
            .andExpect(jsonPath("$.data[?(@.numeroPedido == 'ORD-LA2')].numeroTienda").value(org.hamcrest.Matchers.contains(2)))
            .andExpect(jsonPath("$.data[?(@.numeroPedido == 'ORD-LB1')]").isEmpty());
    }

    @Test
    void listaDePedidos_comprador403() throws Exception {
        mockMvc.perform(get("/api/pedidos").header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }
}
