package com.hotclick.service.shoppingassistant;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.model.Pedido;
import com.hotclick.service.ModeracionAdminAvisoService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.VentaAvisoService;
import com.hotclick.service.telegram.TelegramTexto;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

/** C2: saneo de tokens de Telegram y fail-closed de errores de datos. Tokens ficticios. */
class TelegramC2SaneoTest {

    private static final String SECRETO = "AAFAKEfakeFAKEfakeFAKEfakeFAKEfake01";
    private static final String TOKEN = "123456789:" + SECRETO;

    @Test
    void sinToken_cubreUrlCodificadaConPorcentaje3A() {
        String t = TelegramTexto.sinToken("https://api.telegram.org/bot123456789%3A" + SECRETO + "/sendMessage");
        assertThat(t).doesNotContain(SECRETO);
        String t2 = TelegramTexto.sinToken("/BOT123456789%3a" + SECRETO);
        assertThat(t2).doesNotContain(SECRETO);
    }

    @Test
    void sinToken_cubreTokenSinPrefijoBot() {
        assertThat(TelegramTexto.sinToken("token invalido: " + TOKEN)).doesNotContain(SECRETO);
        assertThat(TelegramTexto.sinToken("x 123456789%3A" + SECRETO)).doesNotContain(SECRETO);
        // texto normal no se toca
        assertThat(TelegramTexto.sinToken("pedido 12:30 ok")).isEqualTo("pedido 12:30 ok");
    }

    @Test
    void cadenaDeMasDe16Causas_fallaCerrado() {
        RuntimeException e = new RuntimeException("raiz");
        for (int i = 0; i < 20; i++) e = new RuntimeException("n" + i, e);
        assertThat(ShoppingAssistantService.esErrorDeDatos(e)).isTrue();
        assertThat(ShoppingAssistantService.esErrorDeDatos(new RuntimeException("corta"))).isFalse();
    }

    @Test
    void sqlExceptionCruda_seDetecta() {
        assertThat(ShoppingAssistantService.esErrorDeDatos(
            new RuntimeException(new SQLException("texto del visitante")))).isTrue();
    }

    @Test
    void ventaAviso_noFiltraTokenAlLog() throws Exception {
        ModeracionAdminAvisoService mod = mock(ModeracionAdminAvisoService.class);
        doThrow(new RuntimeException("404 on POST https://api.telegram.org/bot" + TOKEN + "/sendMessage"))
            .when(mod).avisarNuevaVenta(any());
        VentaAvisoService svc = new VentaAvisoService(mock(NotificacionEmailService.class), mod);

        Logger logger = (Logger) LoggerFactory.getLogger(VentaAvisoService.class);
        ListAppender<ILoggingEvent> app = new ListAppender<>();
        app.start();
        logger.addAppender(app);
        try {
            Pedido p = new Pedido();
            svc.avisarVentaConfirmada(p);
        } finally {
            logger.detachAppender(app);
        }
        assertThat(app.list).isNotEmpty();
        assertThat(app.list).allSatisfy(ev -> assertThat(ev.getFormattedMessage()).doesNotContain(SECRETO));
    }
}
