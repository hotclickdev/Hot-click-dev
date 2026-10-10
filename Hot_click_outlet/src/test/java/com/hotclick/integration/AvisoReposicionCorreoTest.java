package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.SuscripcionReposicion;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SuscripcionReposicionRepository;
import com.hotclick.service.StockService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * «Avisame cuando vuelva»: cuando el stock disponible de un producto pasa de 0 a más de 0
 * —por cualquier camino: ajuste de entrada, edición, importación, liberación de reservas—
 * cada suscripción pendiente recibe UN correo (después del commit) y queda marcada.
 */
@DisplayName("Aviso de reposición por correo")
class AvisoReposicionCorreoTest extends BaseIntegrationTest {

    @Autowired private StockService stockService;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private SuscripcionReposicionRepository suscripcionRepository;
    @Autowired private PlatformTransactionManager txManager;

    private Empresa empresa;
    private Categoria categoria;
    private Bodega bodega;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setNombreEmpresa("Reposicion Inc");
        empresa.setSlug("reposicion-" + System.nanoTime());
        empresa.setCorreoEmpresa("repo" + System.nanoTime() + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);

        categoria = new Categoria();
        categoria.setNombreCategoria("Cat-Repo");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega Repo");
        bodega.setDireccionExacta("Calle Test Repo");
        bodega.setTelefono("88880000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
        clearInvocations(resendEmailService);
    }

    @AfterEach
    void tearDown() {
        suscripcionRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("ajuste de entrada 0→5: un correo por suscripción pendiente y queda marcada")
    void ajusteEntrada_avisaUnaVezYMarca() {
        Producto p = crearProducto(0);
        SuscripcionReposicion pendiente = suscribir(p, "ana@test.cr", false);
        suscribir(p, "beto@test.cr", true); // ya avisado antes

        stockService.ajustarEntrada(p.getId(), 5, "compra proveedor", "admin@test.cr");

        verify(resendEmailService, timeout(5000).times(1))
            .send(eq("ana@test.cr"), contains(p.getNombreProducto()), anyString());
        verify(resendEmailService, after(500).never()).send(eq("beto@test.cr"), anyString(), anyString());
        SuscripcionReposicion despues = suscripcionRepository.findById(pendiente.getId()).orElseThrow();
        assertThat(despues.isNotificado()).isTrue();
        assertThat(despues.getFechaNotificacion()).isNotNull();
    }

    @Test
    @DisplayName("una segunda reposición no reenvía a quien ya fue avisado")
    void segundaReposicion_noReenvia() {
        Producto p = crearProducto(0);
        suscribir(p, "ana@test.cr", false);

        stockService.ajustarEntrada(p.getId(), 5, "compra", "admin@test.cr");
        verify(resendEmailService, timeout(5000).times(1)).send(eq("ana@test.cr"), anyString(), anyString());

        stockService.ajustarAExistencia(p.getId(), 0, "conteo", "admin@test.cr");
        stockService.ajustarEntrada(p.getId(), 3, "compra", "admin@test.cr");

        verify(resendEmailService, after(1000).times(1)).send(eq("ana@test.cr"), anyString(), anyString());
    }

    @Test
    @DisplayName("edición/importación que guarda el producto con stock: también avisa (punto único)")
    void edicionDirecta_avisa() {
        Producto p = crearProducto(0);
        suscribir(p, "ana@test.cr", false);

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            Producto cargado = productoRepository.findById(p.getId()).orElseThrow();
            cargado.setStockActual(4);
            productoRepository.save(cargado);
        });

        verify(resendEmailService, timeout(5000).times(1)).send(eq("ana@test.cr"), anyString(), anyString());
    }

    @Test
    @DisplayName("si la transacción que repone hace rollback, no sale ningún correo")
    void rollback_noAvisa() {
        Producto p = crearProducto(0);
        suscribir(p, "ana@test.cr", false);

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            Producto cargado = productoRepository.findById(p.getId()).orElseThrow();
            cargado.setStockActual(4);
            productoRepository.saveAndFlush(cargado);
            s.setRollbackOnly();
        });

        verify(resendEmailService, after(1000).never()).send(anyString(), anyString(), anyString());
        assertThat(suscripcionRepository.findById(
            suscripcionRepository.findByProducto_IdAndCorreoIgnoreCase(p.getId(), "ana@test.cr").orElseThrow().getId())
            .orElseThrow().isNotificado()).isFalse();
    }

    @Test
    @DisplayName("subir stock que ya era positivo no avisa")
    void stockYaPositivo_noAvisa() {
        Producto p = crearProducto(2);
        suscribir(p, "ana@test.cr", false);

        stockService.ajustarEntrada(p.getId(), 5, "compra", "admin@test.cr");

        verify(resendEmailService, after(1000).never()).send(anyString(), anyString(), anyString());
    }

    private SuscripcionReposicion suscribir(Producto p, String correo, boolean notificado) {
        SuscripcionReposicion s = new SuscripcionReposicion();
        s.setProducto(p);
        s.setCorreo(correo);
        s.setNotificado(notificado);
        if (notificado) s.setFechaNotificacion(LocalDateTime.now());
        return suscripcionRepository.saveAndFlush(s);
    }

    private Producto crearProducto(int stock) {
        Producto p = new Producto();
        p.setNombreProducto("Taza de barro " + System.nanoTime());
        p.setSku("SKU-REPO-" + System.nanoTime());
        p.setPrecioVenta(10000);
        p.setPrecioCompra(7000);
        p.setStockActual(stock);
        p.setStockReservado(0);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }
}
