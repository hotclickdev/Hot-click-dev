package com.hotclick.agente.pago;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.service.whatsapp.PlantillaMeta;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;

import static com.hotclick.agente.pago.PagoBotTestSupport.cuenta;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Aviso fuera de la ventana de 24 h: plantillas de Meta solo por WhatsApp. */
class AvisoFueraDeVentanaPlantillasTest {

    private final CanalMensajeria canal = mock(CanalMensajeria.class);
    private final AvisoFueraDeVentanaPlantillas aviso = new AvisoFueraDeVentanaPlantillas(canal);

    @SuppressWarnings("unchecked")
    private List<String> enviado(PlantillaMeta esperada) {
        ArgumentCaptor<List<String>> params = ArgumentCaptor.forClass(List.class);
        verify(canal).enviarPlantilla(any(), any(), org.mockito.ArgumentMatchers.eq(esperada), params.capture());
        return params.getValue();
    }

    @Test
    void pagoConfirmadoUsaLaPlantillaConPedidoYTotalSinSimbolo() {
        boolean ok = aviso.enviar(cuenta(EstadoCanal.ACTIVA), "50688881234", AvisoFueraDeVentana.Tipo.PAGO_CONFIRMADO,
            Map.of("pedido", "HC-100", "total", "₡12.500", "nombre", "Ana"));

        assertThat(ok).isTrue();
        assertThat(enviado(PlantillaMeta.PAGO_CONFIRMADO)).containsExactly("Ana", "HC-100", "12.500");
    }

    @Test
    void traspasoUsaLaPlantillaDeAsesorYSinNombreSaludaComoCliente() {
        boolean ok = aviso.enviar(cuenta(EstadoCanal.ACTIVA), "50688881234", AvisoFueraDeVentana.Tipo.TRASPASO_ASESOR, Map.of());

        assertThat(ok).isTrue();
        assertThat(enviado(PlantillaMeta.TRASPASO_ASESOR)).containsExactly("cliente");
    }

    @Test
    void recordatorio1UsaLaPlantillaDeCompraPendiente() {
        boolean ok = aviso.enviar(cuenta(EstadoCanal.ACTIVA), "50688881234", AvisoFueraDeVentana.Tipo.RECORDATORIO_1,
            Map.of("nombre", "Ana"));

        assertThat(ok).isTrue();
        assertThat(enviado(PlantillaMeta.RECORDATORIO_COMPRA_PENDIENTE)).containsExactly("Ana", "tus productos");
    }

    @Test
    void tiposSinPlantillaQuedanPendientes() {
        assertThat(aviso.enviar(cuenta(EstadoCanal.ACTIVA), "50688881234", AvisoFueraDeVentana.Tipo.PAGO_RECHAZADO, Map.of()))
            .isFalse();
        assertThat(aviso.enviar(cuenta(EstadoCanal.ACTIVA), "50688881234", AvisoFueraDeVentana.Tipo.RECORDATORIO_2, Map.of()))
            .isFalse();
        verify(canal, never()).enviarPlantilla(any(), any(), any(), any());
    }

    @Test
    void fueraDeWhatsappNoHayPlantillas() {
        CanalCuenta ig = cuenta(EstadoCanal.ACTIVA);
        ig.setTipo(MensajeEntrante.Canal.INSTAGRAM);

        assertThat(aviso.enviar(ig, "IGSID-1", AvisoFueraDeVentana.Tipo.PAGO_CONFIRMADO, Map.of())).isFalse();
        verify(canal, never()).enviarPlantilla(any(), any(), any(), any());
    }

    @Test
    void siMetaFallaDevuelveFalseYNoPropagaLaExcepcion() {
        when(canal.enviarPlantilla(any(), any(), any(), any())).thenThrow(new IllegalStateException("caído"));

        assertThat(aviso.enviar(cuenta(EstadoCanal.ACTIVA), "50688881234", AvisoFueraDeVentana.Tipo.PAGO_CONFIRMADO, Map.of()))
            .isFalse();
    }

    @Test
    void sinCuentaODestinatarioNoEnvia() {
        assertThat(aviso.enviar(null, "50688881234", AvisoFueraDeVentana.Tipo.PAGO_CONFIRMADO, Map.of())).isFalse();
        assertThat(aviso.enviar(cuenta(EstadoCanal.ACTIVA), " ", AvisoFueraDeVentana.Tipo.PAGO_CONFIRMADO, Map.of())).isFalse();
    }
}
