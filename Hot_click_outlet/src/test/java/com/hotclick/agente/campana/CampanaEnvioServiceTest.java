package com.hotclick.agente.campana;

import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Estado;
import com.hotclick.agente.conexion.MetaRechazoException;
import com.hotclick.exception.IntegracionExternaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CampanaEnvioServiceTest extends CampanaFixture {

    @Test
    @DisplayName("sin consentimiento no se envía, aunque el contacto esté en la campaña")
    void sinConsentimientoNoSeEnvia() {
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA);

        assertThat(envio().procesarLote()).isZero();

        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("OMITIDO");
        assertThat(motivoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("SIN_CONSENTIMIENTO");
        verify(canal, never()).enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("con consentimiento se envía la plantilla aprobada con el nombre del cliente")
    void conConsentimientoSeEnvia() {
        consiente(EMPRESA, TEL_ANA, "Ana Mora");
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA);
        when(canal.enviarPlantillaMarketing(any(), eq(TEL_ANA), eq("promo_aprobada"), eq("es"), eq(List.of("Ana"))))
            .thenReturn("wamid.OK1");

        assertThat(envio().procesarLote()).isEqualTo(1);

        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("ENVIADO");
        assertThat(jdbc.queryForObject("SELECT meta_mensaje_id FROM hot_click_agente_campana_envio_tb", String.class))
            .isEqualTo("wamid.OK1");
        assertThat(estadoCampana(camp)).isEqualTo("COMPLETADA");
    }

    @Test
    @DisplayName("STOP gana: un contacto en la lista de bajas no recibe, aunque su consentimiento siga activo")
    void bajaGanaAlConsentimiento() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        consiente(EMPRESA, TEL_LUIS, "Luis");
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA, TEL_LUIS);
        bajas.registrar(EMPRESA, "WHATSAPP", TEL_ANA); // escribió STOP después de lanzar
        when(canal.enviarPlantillaMarketing(any(), eq(TEL_LUIS), anyString(), anyString(), anyList())).thenReturn("wamid.L");

        envio().procesarLote();

        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("OMITIDO");
        assertThat(motivoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("BAJA");
        assertThat(estadoEnvio(camp, EMPRESA, TEL_LUIS)).isEqualTo("ENVIADO");
        verify(canal, never()).enviarPlantillaMarketing(any(), eq(TEL_ANA), anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("un consentimiento revocado antes del envío no recibe")
    void consentimientoRevocadoNoRecibe() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA);
        consentimientos.revocar(EMPRESA, "WHATSAPP", TEL_ANA);

        envio().procesarLote();

        assertThat(motivoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("SIN_CONSENTIMIENTO");
        verify(canal, never()).enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("tope por contacto: con 2 envíos en 7 días no recibe el tercero; uno de hace 8 días no cuenta")
    void topePorContacto() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        consiente(EMPRESA, TEL_LUIS, "Luis");
        envioPrevio(EMPRESA, TEL_ANA, Duration.ofDays(1));
        envioPrevio(EMPRESA, TEL_ANA, Duration.ofDays(3));
        envioPrevio(EMPRESA, TEL_LUIS, Duration.ofDays(1));
        envioPrevio(EMPRESA, TEL_LUIS, Duration.ofDays(8));
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA, TEL_LUIS);
        when(canal.enviarPlantillaMarketing(any(), eq(TEL_LUIS), anyString(), anyString(), anyList())).thenReturn("wamid.L");

        envio().procesarLote();

        assertThat(motivoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("TOPE_CONTACTO");
        assertThat(estadoEnvio(camp, EMPRESA, TEL_LUIS)).isEqualTo("ENVIADO");
    }

    @Test
    @DisplayName("tope mensual del plan: al llegar al tope el resto se omite")
    void topeMensualDelNegocio() {
        CampanaFixture f = new CampanaFixture(CampanaTestSupport.config(2, 1)) { };
        f.consiente(EMPRESA, TEL_ANA, "Ana");
        f.consiente(EMPRESA, TEL_LUIS, "Luis");
        long camp = f.campanaEnCurso(EMPRESA, f.plantilla(EMPRESA, Estado.APROBADA), TEL_ANA, TEL_LUIS);
        when(f.canal.enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList())).thenReturn("wamid.X");

        f.envio().procesarLote();

        assertThat(f.estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("ENVIADO");
        assertThat(f.estadoEnvio(camp, EMPRESA, TEL_LUIS)).isEqualTo("OMITIDO");
        assertThat(f.motivoEnvio(camp, EMPRESA, TEL_LUIS)).isEqualTo("TOPE_MENSUAL");
    }

    @Test
    @DisplayName("plantilla no aprobada (pendiente): no se envía nada y la campaña espera")
    void plantillaPendienteNoSeEnvia() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.PENDIENTE), TEL_ANA);

        assertThat(envio().procesarLote()).isZero();

        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("PENDIENTE");
        assertThat(estadoCampana(camp)).isEqualTo("EN_CURSO");
        verify(canal, never()).enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("plantilla rechazada por Meta: la campaña se cancela y nada se envía")
    void plantillaRechazadaCancela() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.RECHAZADA), TEL_ANA);

        envio().procesarLote();

        assertThat(estadoCampana(camp)).isEqualTo("CANCELADA");
        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("OMITIDO");
        verify(canal, never()).enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("aislamiento: el consentimiento de un negocio no sirve para otro")
    void aislamientoEntreEmpresas() {
        consiente(OTRA, TEL_ANA, "Ana"); // consintió con OTRO negocio, no con EMPRESA
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA);

        envio().procesarLote();

        assertThat(motivoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("SIN_CONSENTIMIENTO");
        verify(canal, never()).enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList());
        assertThat(consRepo.activosEntre(EMPRESA, List.of(CampanaTestSupport.hash(OTRA, TEL_ANA)))).isEmpty();
    }

    @Test
    @DisplayName("una baja de otro negocio no frena a este (la baja es por negocio)")
    void bajaEsPorNegocio() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        bajas.registrar(OTRA, "WHATSAPP", TEL_ANA);
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA);
        when(canal.enviarPlantillaMarketing(any(), eq(TEL_ANA), anyString(), anyString(), anyList())).thenReturn("wamid.A");

        envio().procesarLote();

        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("ENVIADO");
    }

    @Test
    @DisplayName("Meta rechaza el envío (4xx): FALLIDO con el código, sin reintentar")
    void metaRechazaMarcaFallido() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA);
        when(canal.enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList()))
            .thenThrow(new MetaRechazoException(131049));

        envio().procesarLote();

        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("FALLIDO");
        assertThat(motivoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("META_131049");
        assertThat(estadoCampana(camp)).isEqualTo("COMPLETADA");
    }

    @Test
    @DisplayName("Meta caída: el envío sigue PENDIENTE y tras 3 intentos queda FALLIDO")
    void metaCaidaReintentaYLuegoFalla() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA);
        when(canal.enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList()))
            .thenThrow(new IntegracionExternaException("meta-graph", IntegracionExternaException.Tipo.TIMEOUT, "x"));
        CampanaEnvioService servicio = envio();

        servicio.procesarLote();
        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("PENDIENTE");
        servicio.procesarLote();
        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("PENDIENTE");
        servicio.procesarLote();

        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("FALLIDO");
        verify(canal, times(3)).enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("un contacto no se envía dos veces aunque el lote se procese de nuevo")
    void noDuplicaEnvios() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        long camp = campanaEnCurso(EMPRESA, plantilla(EMPRESA, Estado.APROBADA), TEL_ANA);
        when(canal.enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList())).thenReturn("wamid.1");
        CampanaEnvioService servicio = envio();

        servicio.procesarLote();
        servicio.procesarLote();

        verify(canal, times(1)).enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList());
        assertThat(estadoEnvio(camp, EMPRESA, TEL_ANA)).isEqualTo("ENVIADO");
    }
}
