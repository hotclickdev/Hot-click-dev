package com.hotclick.service;

import com.hotclick.dto.CupoEmprendedorEstado;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import com.hotclick.dto.ResultadoAltaCupo;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("AltaEmprendedorNotificador")
class AltaEmprendedorNotificadorTest {

    @Mock TelegramService telegramService;
    @Mock NotificacionEmailService notificacionEmailService;

    @InjectMocks AltaEmprendedorNotificador notificador;

    @Test
    @DisplayName("El texto marca el cruce del último cupo")
    void textoUltimoCupo() {
        ResultadoAltaCupo alta = ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(70, 70));
        String texto = AltaEmprendedorNotificador.armarTexto("Café Luz", "luz@correo.com", alta);
        assertThat(texto).contains("Café Luz");
        assertThat(texto).contains("70/70");
        assertThat(texto).contains("membresía tiene costo");
    }

    @Test
    @DisplayName("El texto marca alta sin cupo")
    void textoSinCupo() {
        ResultadoAltaCupo alta = ResultadoAltaCupo.pago(CupoEmprendedorEstado.of(70, 70));
        String texto = AltaEmprendedorNotificador.armarTexto("Taller Sur", "sur@correo.com", alta);
        assertThat(texto).contains("Requiere membresía");
    }

    @Test
    @DisplayName("Envía Telegram y correo; un fallo no se propaga")
    void enviaCanalesYTragaError() {
        ResultadoAltaCupo alta = ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(3, 70));
        doThrow(new RuntimeException("telegram caído")).when(telegramService).enviar(anyString());

        notificador.notificar("Local Norte", "norte@correo.com", alta);

        verify(telegramService).enviar(contains("Local Norte"));
        verify(notificacionEmailService).enviarAltaEmprendedorAAdminIT(
            eq("Local Norte"), eq("norte@correo.com"), eq(true), any());
    }

    @Test
    @DisplayName("El aviso dice «3 meses gratis» (derivado de TRIAL_EMPRENDEDOR_DIAS=90) y ya no «cupo gratis»")
    void textoDiceTresMesesGratisDerivadoDeLaConfig() {
        String periodo = new TrialEmprendedorConfig(70, 90).periodoGratis();
        ResultadoAltaCupo gratis = ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(3, 70, periodo));
        ResultadoAltaCupo ultimo = ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(70, 70, periodo));
        ResultadoAltaCupo pago = ResultadoAltaCupo.pago(CupoEmprendedorEstado.of(70, 70, periodo));

        String a = AltaEmprendedorNotificador.armarTexto("Café Luz", "luz@correo.com", gratis);
        String b = AltaEmprendedorNotificador.armarTexto("Café Luz", "luz@correo.com", ultimo);
        String c = AltaEmprendedorNotificador.armarTexto("Café Luz", "luz@correo.com", pago);

        assertThat(a).contains("Entró con 3 meses gratis. Quedan 67.");
        assertThat(b).contains("último cupo de 3 meses gratis");
        assertThat(c).contains("Sin cupo de 3 meses gratis");
        assertThat(a + b + c).doesNotContain("cupo gratis");
    }

    @Test
    @DisplayName("Si cambia TRIAL_EMPRENDEDOR_DIAS el texto cambia solo (45 días → «45 días gratis»)")
    void textoSigueLaConfig() {
        String periodo = new TrialEmprendedorConfig(70, 45).periodoGratis();
        ResultadoAltaCupo alta = ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(1, 70, periodo));
        assertThat(AltaEmprendedorNotificador.armarTexto("X", "x@y.cr", alta))
            .contains("Entró con 45 días gratis").doesNotContain("3 meses");
    }
}
