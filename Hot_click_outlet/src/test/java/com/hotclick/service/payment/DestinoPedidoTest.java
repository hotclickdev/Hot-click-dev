package com.hotclick.service.payment;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.envio.ConfiguracionEnvioService;
import com.hotclick.service.envio.DestinoEnvio;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/** MED-5 Auditor 3: el destino estructurado manda, se guarda en el pedido y se valida contra la lista de CR. */
@DisplayName("MED-5 Auditor 3 | destino del envío guardado y validado")
class DestinoPedidoTest {

    private static PaymentCheckoutRequest req(String provincia, String canton) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setItems(List.of()); r.setMetodoEnvio("ENVIO_NORMAL_GAM");
        r.setProvincia(provincia); r.setCanton(canton);
        return r;
    }

    private static CheckoutOrderFactory factory() {
        CheckoutOrderFactory f = new CheckoutOrderFactory();
        PedidoRepository repo = mock(PedidoRepository.class);
        when(repo.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));
        ReflectionTestUtils.setField(f, "pedidoRepository", repo);
        return f;
    }

    @Test
    @DisplayName("Checkout: cantón que no es de la provincia, solo uno de los dos o provincia inexistente = 400 genérico")
    void checkoutCantonAjenoRechaza() {
        CheckoutPaquetesPlanner planner = new CheckoutPaquetesPlanner();
        for (String[] d : new String[][]{{"Heredia", "Siquirres"}, {"San José", null}, {null, "Belén"}, {"Narnia", "Belén"}}) {
            assertThatThrownBy(() -> planner.planificar(req(d[0], d[1]), Map.of(), null))
                .isInstanceOf(IllegalArgumentException.class).hasMessage(DestinoEnvio.DESTINO_INVALIDO);
        }
        assertThat(planner.planificar(req("heredia", "BELEN"), Map.of(), null)).isEmpty();
        assertThat(planner.planificar(req(null, null), Map.of(), null)).isEmpty();
    }

    @Test
    @DisplayName("Checkout: texto «…, Siquirres, Limón» con Heredia/Belén cobra GAM y el pedido guarda destino, zona, monto y dirección del servidor")
    void checkoutGuardaDestinoYZona() {
        Pedido p = new Pedido(); p.setMetodoEnvio("ENVIO_NORMAL_GAM");
        factory().aplicarDestino(p, "Frente a la plaza, 200 m sur, Siquirres, Limón",
            DestinoEnvio.resolver("heredia", "belen"), 4000);
        assertThat(p.getDestinoProvincia()).isEqualTo("Heredia");
        assertThat(p.getDestinoCanton()).isEqualTo("Belén");
        assertThat(p.getEnvioZona()).isEqualTo("GAM");
        assertThat(p.getEnvioMontoZona()).isEqualTo(4000);
        assertThat(p.getDireccionEntrega()).isEqualTo("Frente a la plaza, 200 m sur, Belén, Heredia");

        Pedido r = new Pedido(); r.setMetodoEnvio("ENVIO_RAPIDO");
        factory().aplicarDestino(r, "Casa 4", DestinoEnvio.resolver("San José", "Escazú"), 5000);
        assertThat(r.getEnvioZona()).isEqualTo("EXPRESS");
        assertThat(r.getEnvioMontoZona()).isEqualTo(5000);
        assertThat(r.getDireccionEntrega()).isEqualTo("Casa 4, Escazú, San José");

        Pedido f = new Pedido(); f.setMetodoEnvio("ENVIO_NORMAL_FUERA_GAM");
        factory().aplicarDestino(f, "Casa 4", null, 5500);
        assertThat(f.getEnvioZona()).isEqualTo("FUERA_GAM");
        assertThat(f.getDestinoProvincia()).isNull();
    }

    @Test
    @DisplayName("Retiro: no guarda zona ni dirección")
    void retiroSinZona() {
        Pedido p = new Pedido(); p.setMetodoEnvio("RETIRO_EN_TIENDA");
        factory().aplicarDestino(p, "Casa 4", DestinoEnvio.resolver("San José", "Escazú"), 0);
        assertThat(p.getEnvioZona()).isNull();
        assertThat(p.getDireccionEntrega()).isNull();
    }

    @Test
    @DisplayName("BAJO: si falla leer la config de envío, log warn solo con la clase del error y se usan los defaults")
    @SuppressWarnings("unchecked")
    void configCaidaLogueaSinPii() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(anyString(), any(RowMapper.class)))
            .thenThrow(new DataAccessResourceFailureException("host=db usuario=ana@test.cr"));
        Logger logger = (Logger) LoggerFactory.getLogger(ConfiguracionEnvioService.class);
        ListAppender<ILoggingEvent> app = new ListAppender<>();
        app.start();
        logger.addAppender(app);
        try {
            assertThat(new ConfiguracionEnvioService(jdbc).montos()).isEqualTo(ConfiguracionEnvioService.DEFAULTS);
        } finally {
            logger.detachAppender(app);
        }
        assertThat(app.list).hasSize(1);
        ILoggingEvent ev = app.list.get(0);
        assertThat(ev.getLevel().toString()).isEqualTo("WARN");
        assertThat(ev.getFormattedMessage()).contains("DataAccessResourceFailureException")
            .doesNotContain("ana@test.cr").doesNotContain("host=db");
        assertThat(ev.getThrowableProxy()).isNull();
    }
}
