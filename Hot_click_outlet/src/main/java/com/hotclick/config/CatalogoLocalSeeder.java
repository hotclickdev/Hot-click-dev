package com.hotclick.config;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Siembra 1 producto visible para probar compra en H2 local.
 * No corre en producción: exige profile {@code test} y
 * {@code hotclick.seed.catalogo-local=true}.
 */
@Component
@Profile("test")
@ConditionalOnProperty(name = "hotclick.seed.catalogo-local", havingValue = "true")
@Order(200)
public class CatalogoLocalSeeder implements ApplicationRunner {

    public static final String SKU_DEMO = "HC-LOCAL-CAFE-250";
    public static final String NOMBRE_DEMO = "Café de especialidad 250g";
    public static final String CORREO_ADMIN = "admin@hotclick.com";

    private static final Logger LOG = LoggerFactory.getLogger(CatalogoLocalSeeder.class);
    private static final String SLUG_EMPRESA = "cafe-especialidad-local";
    private static final String CORREO_EMPRESA = "cafe-local@hotclick.test";
    private static final int PRECIO_VENTA = 8500;
    private static final int PRECIO_COMPRA = 4000;
    private static final int STOCK = 20;

    private final ProductoRepository productoRepository;
    private final EmpresaRepository empresaRepository;
    private final BodegaRepository bodegaRepository;
    private final CategoriaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;

    public CatalogoLocalSeeder(
            ProductoRepository productoRepository,
            EmpresaRepository empresaRepository,
            BodegaRepository bodegaRepository,
            CategoriaRepository categoriaRepository,
            UsuarioRepository usuarioRepository) {
        this.productoRepository = productoRepository;
        this.empresaRepository = empresaRepository;
        this.bodegaRepository = bodegaRepository;
        this.categoriaRepository = categoriaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (productoRepository.count() > 0) return;
        if (productoRepository.findBySku(SKU_DEMO).isPresent()) return;
        Usuario admin = usuarioRepository.findByCorreo(CORREO_ADMIN).orElse(null);
        if (admin == null) {
            LOG.warn("CatalogoLocalSeeder: no existe {}, no se siembra catálogo", CORREO_ADMIN);
            return;
        }
        seedCatalogo(admin);
    }

    private void seedCatalogo(Usuario admin) {
        Empresa empresa = crearEmpresa();
        Bodega bodega = crearBodega(admin, empresa);
        Categoria categoria = crearCategoria(admin, empresa);
        crearProducto(admin, empresa, bodega, categoria);
        LOG.info("CatalogoLocalSeeder: {} ({})", NOMBRE_DEMO, SKU_DEMO);
    }

    private Empresa crearEmpresa() {
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("Café Local Demo");
        empresa.setNombreComercial("Café Local Demo");
        empresa.setSlug(SLUG_EMPRESA);
        empresa.setCorreoEmpresa(CORREO_EMPRESA);
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setEstado(Constants.ESTADO_ACTIVO);
        empresa.setVisibilidadPublica(true);
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa.setFechaAprobacion(LocalDateTime.now(Constants.ZONA_CR));
        return empresaRepository.save(empresa);
    }

    private Bodega crearBodega(Usuario admin, Empresa empresa) {
        Bodega bodega = new Bodega();
        bodega.setNombreBodega("Bodega Café Local");
        bodega.setDireccionExacta("San José, Costa Rica");
        bodega.setTelefono("22220000");
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega.setAdminCliente(admin);
        bodega.setEmpresa(empresa);
        return bodegaRepository.save(bodega);
    }

    private Categoria crearCategoria(Usuario admin, Empresa empresa) {
        Categoria categoria = new Categoria();
        categoria.setNombreCategoria("Alimentos");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(admin);
        categoria.setEmpresa(empresa);
        return categoriaRepository.save(categoria);
    }

    private void crearProducto(Usuario admin, Empresa empresa, Bodega bodega, Categoria categoria) {
        Producto producto = new Producto();
        producto.setNombreProducto(NOMBRE_DEMO);
        producto.setDescripcionCorta("Café tostado en Costa Rica, para probar el flujo de compra.");
        producto.setSku(SKU_DEMO);
        producto.setPrecioVenta(PRECIO_VENTA);
        producto.setPrecioCompra(PRECIO_COMPRA);
        producto.setStockActual(STOCK);
        producto.setStockMinimo(1);
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setVisibleCatalogo(true);
        producto.setVendido(false);
        producto.setEsUnico(false);
        producto.setCategoria(categoria);
        producto.setBodega(bodega);
        producto.setEmpresa(empresa);
        producto.setAdminCliente(admin);
        producto.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        productoRepository.save(producto);
    }
}
