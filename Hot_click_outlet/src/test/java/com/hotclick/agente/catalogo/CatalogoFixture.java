package com.hotclick.agente.catalogo;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conexion.MetaGraphCliente;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** H2 con el mínimo del catálogo público y Meta de mentira: ninguna prueba llama a Meta. */
abstract class CatalogoFixture {

    static final Long EMPRESA = 1L;
    static final Long OTRA = 2L;
    static final Clock RELOJ = Clock.fixed(Instant.parse("2026-12-10T15:00:00Z"), ZoneOffset.UTC);

    final JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(
        "jdbc:h2:mem:cat" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", ""));
    final CatalogoRepositorio repo = new CatalogoRepositorio(jdbc);
    final MetaGraphCliente graph = mock(MetaGraphCliente.class);
    final CanalCuentaService cuentas = mock(CanalCuentaService.class);
    final CanalMensajeria canal = mock(CanalMensajeria.class);
    final CanalCuenta cuenta = new CanalCuenta();
    final CatalogoMetaService servicio;

    CatalogoFixture() {
        jdbc.execute("CREATE TABLE hot_click_empresa_tb (id_empresa BIGINT PRIMARY KEY, estado_empresa VARCHAR(20), "
            + "visibilidad_publica BOOLEAN, estado_plan VARCHAR(30), slug VARCHAR(100), nombre_comercial VARCHAR(200), "
            + "nombre_empresa VARCHAR(200))");
        jdbc.execute("CREATE TABLE hot_click_producto_tb (id_producto BIGINT PRIMARY KEY, fk_id_empresa BIGINT, "
            + "fk_id_estado INTEGER, visible_catalogo BOOLEAN, vendido BOOLEAN, nombre_producto VARCHAR(200), "
            + "descripcion_corta VARCHAR(300), precio_venta INTEGER, stock_actual INTEGER, stock_reservado INTEGER, "
            + "imagen_principal_url VARCHAR(500), condicion VARCHAR(20), marca VARCHAR(100))");
        jdbc.execute("CREATE TABLE hot_click_agente_catalogo_tb (fk_id_empresa BIGINT PRIMARY KEY, catalogo_id VARCHAR(64) "
            + "NOT NULL, estado VARCHAR(10) DEFAULT 'ACTIVO' NOT NULL, ultima_sync_en TIMESTAMP WITH TIME ZONE, "
            + "ultimo_error VARCHAR(60), creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL)");
        jdbc.execute("CREATE TABLE hot_click_agente_catalogo_item_tb (fk_id_empresa BIGINT NOT NULL, fk_id_producto BIGINT "
            + "NOT NULL, meta_producto_id VARCHAR(64), huella VARCHAR(64) NOT NULL, estado VARCHAR(12) DEFAULT "
            + "'SINCRONIZADO' NOT NULL, sincronizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, "
            + "PRIMARY KEY (fk_id_empresa, fk_id_producto))");
        empresa(EMPRESA, "ACTIVO", true, null, "tienda-uno");
        empresa(OTRA, "ACTIVO", true, null, "tienda-dos");
        cuenta.setId(5L);
        cuenta.setTipo(Canal.WHATSAPP);
        cuenta.setEmpresaId(EMPRESA);
        cuenta.setIdExterno("PNID");
        cuenta.setEstado(EstadoCanal.ACTIVA);
        when(cuentas.activaDe(EMPRESA, Canal.WHATSAPP)).thenReturn(Optional.of(cuenta));
        when(cuentas.activaDe(EMPRESA, Canal.INSTAGRAM)).thenReturn(Optional.empty());
        when(cuentas.activaDe(EMPRESA, Canal.MESSENGER)).thenReturn(Optional.empty());
        when(cuentas.tokenDe(cuenta)).thenReturn("tok-prueba");
        when(graph.itemsBatch(anyString(), anyString(), anyList()))
            .thenAnswer(i -> new MetaGraphCliente.ResultadoLote(Set.of(), ((java.util.List<?>) i.getArgument(2)).size()));
        servicio = new CatalogoMetaService(repo, graph, cuentas, "https://hotclick.test", RELOJ);
    }

    void empresa(Long id, String estado, boolean visible, String estadoPlan, String slug) {
        jdbc.update("INSERT INTO hot_click_empresa_tb VALUES (?,?,?,?,?,?,?)", id, estado, visible, estadoPlan, slug,
            "Negocio " + id, "Razón " + id);
    }

    void producto(long id, Long empresa, int precio, String imagen) {
        jdbc.update("INSERT INTO hot_click_producto_tb VALUES (?,?,1,TRUE,FALSE,?,?,?,5,0,?,'NUEVO','Marca')",
            id, empresa, "Producto " + id, "Descripción " + id, precio, imagen);
    }

    void conectarCatalogo(Long empresa) {
        repo.guardarConexion(empresa, "123456789", RELOJ.instant());
    }

    int filasItem(Long empresa, String estado) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_catalogo_item_tb WHERE fk_id_empresa = ? "
            + "AND estado = ?", Integer.class, empresa, estado);
    }

    @SuppressWarnings("unchecked")
    static java.util.List<java.util.Map<String, Object>> lote(org.mockito.ArgumentCaptor<java.util.List> c) {
        return (java.util.List<java.util.Map<String, Object>>) (java.util.List<?>) c.getValue();
    }

    static Object cualquiera() {
        return any();
    }
}
