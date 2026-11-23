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
import static org.mockito.Mockito.never;
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
        String texto = AltaEmprendedorNotificador.armarTexto("Café Luz", alta);
        assertThat(texto).contains("Café Luz");
        assertThat(texto).contains("70/70");
        assertThat(texto).contains("membresía tiene costo");
    }

    @Test
    @DisplayName("El texto marca alta sin cupo")
    void textoSinCupo() {
        ResultadoAltaCupo alta = ResultadoAltaCupo.pago(CupoEmprendedorEstado.of(70, 70));
        String texto = AltaEmprendedorNotificador.armarTexto("Taller Sur", alta);
        assertThat(texto).contains("Requiere membresía");
    }

    @Test
    @DisplayName("Envía Telegram y correo; un fallo no se propaga")
    void enviaCanalesYTragaError() {
        ResultadoAltaCupo alta = ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(3, 70));
        doThrow(new RuntimeException("telegram caído")).when(telegramService).enviar(anyString());

        notificador.notificar("Local Norte", "norte@test.invalid", alta);

        verify(telegramService).enviar(contains("Local Norte"));
        verify(telegramService, never()).enviar(contains("norte@test.invalid"));
        verify(notificacionEmailService).enviarAltaEmprendedorAAdminIT(
            eq("Local Norte"), eq("norte@test.invalid"), eq(true), any());
    }

    @Test
    @DisplayName("El aviso dice «3 meses gratis» (derivado de TRIAL_EMPRENDEDOR_DIAS=90) y ya no «cupo gratis»")
    void textoDiceTresMesesGratisDerivadoDeLaConfig() {
        String periodo = new TrialEmprendedorConfig(70, 90).periodoGratis();
        ResultadoAltaCupo gratis = ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(3, 70, periodo));
        ResultadoAltaCupo ultimo = ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(70, 70, periodo));
        ResultadoAltaCupo pago = ResultadoAltaCupo.pago(CupoEmprendedorEstado.of(70, 70, periodo));

        String a = AltaEmprendedorNotificador.armarTexto("Café Luz", gratis);
        String b = AltaEmprendedorNotificador.armarTexto("Café Luz", ultimo);
        String c = AltaEmprendedorNotificador.armarTexto("Café Luz", pago);

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
        assertThat(AltaEmprendedorNotificador.armarTexto("X", alta))
            .contains("Entró con 45 días gratis").doesNotContain("3 meses");
    }

    @Test
    @DisplayName("Alta pendiente: el aviso dice que el puesto se asigna al aprobar, sin «Entró con» ni «Requiere membresía»")
    void textoAltaPendiente() {
        String periodo = new TrialEmprendedorConfig(70, 90).periodoGratis();
        ResultadoAltaCupo alta = ResultadoAltaCupo.pendiente(CupoEmprendedorEstado.of(3, 70, periodo));
        String texto = AltaEmprendedorNotificador.armarTexto("Café Luz", alta);
        assertThat(texto).contains("Pendiente de aprobación").contains("se asigna al aprobar")
            .contains("correo verificado").contains("un puesto por persona");
        assertThat(texto).doesNotContain("Entró con").doesNotContain("Requiere membresía");
    }

    @Test
    @DisplayName("Excepción QA: el aviso dice PYME a cobro TEST y no habla de trial ni de puesto al aprobar")
    void textoQaPymeCobro() {
        ResultadoAltaCupo alta = ResultadoAltaCupo.qaPymeCobroTest(CupoEmprendedorEstado.of(9, 70));
        String texto = AltaEmprendedorNotificador.armarTexto("Sim", alta);
        assertThat(texto).contains("PYME a cobro TEST").contains("sin trial").contains("sin cupo");
        assertThat(texto).doesNotContain("se asigna al aprobar").doesNotContain("Entró con");
        assertThat(alta.qaPymeCobroTest()).isTrue();
        assertThat(alta.pendienteCupo()).isFalse();
    }

    @Test
    @DisplayName("Alta pendiente: usa el correo de alta pendiente, no el de «sin cupo / requiere membresía»")
    void notificaAltaPendiente() {
        ResultadoAltaCupo alta = ResultadoAltaCupo.pendiente(CupoEmprendedorEstado.of(3, 70));
        notificador.notificar("Local Norte", "norte@test.invalid", alta);

        verify(notificacionEmailService).enviarAltaEmprendedorPendienteAAdminIT(
            eq("Local Norte"), eq("norte@test.invalid"), any());
        org.mockito.Mockito.verify(notificacionEmailService, org.mockito.Mockito.never())
            .enviarAltaEmprendedorAAdminIT(anyString(), anyString(), org.mockito.ArgumentMatchers.anyBoolean(), any());
    }

    @Test
    @DisplayName("M8: el aviso de Telegram no lleva NINGÚN correo (varios canarios, todos los estados) ni nada con forma de correo")
    void telegramNuncaLlevaCorreo() {
        String[] correos = {"canario.alta@example.invalid", "otro.canario@example.invalid", "x.y+z@sub.example.invalid"};
        ResultadoAltaCupo[] altas = {
            ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(3, 70)),
            ResultadoAltaCupo.gratis(CupoEmprendedorEstado.of(70, 70)),
            ResultadoAltaCupo.pago(CupoEmprendedorEstado.of(70, 70)),
            ResultadoAltaCupo.pendiente(CupoEmprendedorEstado.of(3, 70)),
            ResultadoAltaCupo.qaPymeCobroTest(CupoEmprendedorEstado.of(9, 70))};
        for (String correo : correos) {
            for (ResultadoAltaCupo alta : altas) notificador.notificar("Negocio Canario", correo, alta);
        }
        org.mockito.ArgumentCaptor<String> c = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(telegramService, org.mockito.Mockito.times(correos.length * altas.length)).enviar(c.capture());
        for (String texto : c.getAllValues()) {
            for (String correo : correos) {
                assertThat(texto).doesNotContain(correo);
                assertThat(texto).doesNotContain(correo.substring(0, correo.indexOf('@')));
            }
            assertThat(texto).doesNotContain("@").doesNotContain("example.invalid")
                .doesNotContainPattern("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+");
        }
    }
}
