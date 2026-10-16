package com.hotclick.pedido;

import com.hotclick.model.OrigenPedido;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Por qué la suite no lo vio: corre en H2 con {@code ddl-auto=create-drop} y sin Flyway, así que el
 * CHECK {@code chk_pedido_origen} de V25 no existe en tests. Este test aplica el bloque real de V25
 * sobre PostgreSQL e inserta el origen que guarda cada camino. Opt-in como WalletUpsertPostgresTest:
 * {@code HC_PG_TEST_URL=jdbc:postgresql://127.0.0.1:55432/db?user=…}.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("[HOTFIX] chk_pedido_origen en PostgreSQL: cada camino de pedido inserta")
class PedidoOrigenPostgresTest {

    private static final String SCHEMA = "hc_pedido_origen_test";
    private SingleConnectionDataSource ds;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() throws Exception {
        ds = new SingleConnectionDataSource(System.getenv("HC_PG_TEST_URL"), true);
        jdbc = new JdbcTemplate(ds);
        jdbc.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        jdbc.execute("CREATE SCHEMA " + SCHEMA);
        jdbc.execute("SET search_path TO " + SCHEMA);
        jdbc.execute("CREATE TABLE hot_click_pedido_tb (id BIGSERIAL PRIMARY KEY, numero_pedido TEXT, origen VARCHAR(20))");
        String v25 = java.nio.file.Files.readString(java.nio.file.Path.of(
            "src/main/resources/db/migration/V25__pedido_origen_turno_caja.sql"));
        int i = v25.indexOf("DO $$", v25.indexOf("chk_pedido_origen") - 400);
        int j = v25.indexOf("END$$;", i) + "END$$;".length();
        jdbc.execute(v25.substring(i, j));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM pg_constraint WHERE conname='chk_pedido_origen' "
            + "AND connamespace = '" + SCHEMA + "'::regnamespace", Integer.class)).isEqualTo(1);
    }

    @AfterEach
    void tearDown() {
        jdbc.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        ds.destroy();
    }

    /** camino → origen que fija el código tras el hotfix. */
    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({
        "checkout con cuenta (CheckoutOrderFactory: default de Pedido), ONLINE",
        "invitado Comprar ahora/carrito marketplace (/payments|/sinpe/guest-checkout), ONLINE",
        "invitado en la tienda del negocio (StorefrontGuestOrderService), ONLINE",
        "QR de mesa (SelfCheckoutService), POS",
        "POS caja y QR de caja, POS",
        "venta Telegram (VentaService con DTO TELEGRAM), MANUAL",
        "pedido manual / asignación admin (PedidoManualFactory), MANUAL",
    })
    void cadaCaminoInserta(String camino, String esperado) {
        String origen = OrigenPedido.valueOf(esperado).codigo();
        jdbc.update("INSERT INTO hot_click_pedido_tb (numero_pedido, origen) VALUES (?, ?)", camino, origen);
        assertThat(jdbc.queryForObject("SELECT origen FROM hot_click_pedido_tb WHERE numero_pedido = ?", String.class, camino))
            .isEqualTo(esperado);
    }

    /** La barrera @PrePersist de Pedido deja cualquier valor (incluido uno desconocido) insertable. */
    @ParameterizedTest
    @ValueSource(strings = {"TIENDA_WEB", "QR", "TELEGRAM", "ASIGNACION_MANUAL", "MARKETPLACE", "WEB"})
    void guardDePedidoProduceValorInsertable(String crudo) {
        com.hotclick.model.Pedido p = new com.hotclick.model.Pedido();
        p.setOrigen(crudo);
        com.hotclick.model.PedidoOrigenGuardAccess.prePersist(p);
        jdbc.update("INSERT INTO hot_click_pedido_tb (numero_pedido, origen) VALUES ('g', ?)", p.getOrigen());
    }

    /** Los literales previos al hotfix fallan en PG (eran el 500) y su alias normalizado entra. */
    @ParameterizedTest
    @ValueSource(strings = {"TIENDA_WEB", "QR", "TELEGRAM", "ASIGNACION_MANUAL"})
    void literalesViejosFallanYNormalizadosEntran(String viejo) {
        assertThatThrownBy(() -> jdbc.update("INSERT INTO hot_click_pedido_tb (numero_pedido, origen) VALUES ('x', ?)", viejo))
            .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("chk_pedido_origen");
        jdbc.update("INSERT INTO hot_click_pedido_tb (numero_pedido, origen) VALUES ('y', ?)", OrigenPedido.normalizar(viejo).codigo());
    }
}
