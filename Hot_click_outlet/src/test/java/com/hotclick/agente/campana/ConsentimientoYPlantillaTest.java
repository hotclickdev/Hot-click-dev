package com.hotclick.agente.campana;

import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Estado;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Fila;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conexion.MetaGraphCliente.PlantillaRemota;
import com.hotclick.agente.conexion.MetaRechazoException;
import com.hotclick.agente.cupo.ConfirmacionBajaEnvio;
import com.hotclick.agente.webhook.EstadoEntrante;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ConsentimientoYPlantillaTest extends CampanaFixture {

    // ── consentimiento ──────────────────────────────────────────────────────

    @Test
    @DisplayName("el opt-in queda con fecha, canal, origen y evidencia; repetirlo no cambia la prueba original")
    void optInRegistradoEIdempotente() {
        assertThat(consentimientos.registrarDesdeBoton(EMPRESA, "WHATSAPP", TEL_ANA, "Ana", "wamid.PRIMERO")).isTrue();
        assertThat(consentimientos.registrarDesdeBoton(EMPRESA, "WHATSAPP", TEL_ANA, "Ana", "wamid.SEGUNDO")).isFalse();

        Map<String, Object> fila = jdbc.queryForMap("SELECT * FROM hot_click_agente_consentimiento_tb");
        assertThat(fila.get("EVIDENCIA")).isEqualTo("boton:wamid.PRIMERO");
        assertThat(fila.get("ORIGEN")).isEqualTo("BOTON_BOT");
        assertThat(fila.get("CANAL")).isEqualTo("WHATSAPP");
        assertThat(fila.get("CONSENTIDO_EN")).isNotNull();
        assertThat(fila.get("VERSION_TEXTO")).isEqualTo(ConsentimientoService.VERSION_TEXTO);
        assertThat(fila.get("CONTACTO_ULTIMOS4")).isEqualTo("0001");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM hot_click_agente_consentimiento_tb", Integer.class)).isEqualTo(1);
    }

    @Test
    @DisplayName("el checkout también es evidencia válida (pedido)")
    void optInDesdeCheckout() {
        consentimientos.registrarDesdeCheckout(EMPRESA, TEL_ANA, "Ana", 77L);

        assertThat(jdbc.queryForMap("SELECT origen, evidencia FROM hot_click_agente_consentimiento_tb"))
            .containsEntry("ORIGEN", "CHECKOUT").containsEntry("EVIDENCIA", "pedido:77");
    }

    @Test
    @DisplayName("revocar borra el contacto cifrado y el nombre y deja la prueba; reactivar con un opt-in nuevo funciona")
    void revocarYReactivar() {
        consiente(EMPRESA, TEL_ANA, "Ana");

        assertThat(consentimientos.revocar(EMPRESA, "WHATSAPP", TEL_ANA)).isTrue();
        Map<String, Object> fila = jdbc.queryForMap("SELECT * FROM hot_click_agente_consentimiento_tb");
        assertThat(fila.get("ESTADO")).isEqualTo("REVOCADO");
        assertThat(fila.get("CONTACTO_CIFRADO")).isNull();
        assertThat(fila.get("NOMBRE")).isNull();
        assertThat(fila.get("EVIDENCIA")).isNotNull();
        assertThat(consRepo.resumen(EMPRESA)).isEqualTo(new ConsentimientoRepositorio.Resumen(0, 1));

        assertThat(consentimientos.registrarDesdeBoton(EMPRESA, "WHATSAPP", TEL_ANA, "Ana", "wamid.NUEVO")).isTrue();
        assertThat(consRepo.resumen(EMPRESA)).isEqualTo(new ConsentimientoRepositorio.Resumen(1, 0));
    }

    @Test
    @DisplayName("no se ofrece el opt-in a quien está de baja ni a quien ya decidió")
    void noSeOfreceAQuienYaDecidioOEstaDeBaja() {
        assertThat(consentimientos.puedeOfrecer(EMPRESA, "WHATSAPP", TEL_ANA)).isTrue();
        consiente(EMPRESA, TEL_ANA, "Ana");
        assertThat(consentimientos.puedeOfrecer(EMPRESA, "WHATSAPP", TEL_ANA)).isFalse();
        bajas.registrar(EMPRESA, "WHATSAPP", TEL_LUIS);
        assertThat(consentimientos.puedeOfrecer(EMPRESA, "WHATSAPP", TEL_LUIS)).isFalse();
    }

    private InterceptorConsentimiento interceptor(ConfirmacionBajaEnvio envio) {
        EmpresaConNombre empresa = new EmpresaConNombre();
        OfertaConsentimientoService oferta = new OfertaConsentimientoService(consentimientos, canal, empresa.repo);
        return new InterceptorConsentimiento(consentimientos, bajas, envio, oferta);
    }

    private static final class EmpresaConNombre {
        final com.hotclick.repository.EmpresaRepository repo = mock(com.hotclick.repository.EmpresaRepository.class);

        EmpresaConNombre() {
            Empresa e = new Empresa();
            e.setNombreEmpresa("Tienda Ana");
            when(repo.findById(any())).thenReturn(Optional.of(e));
        }
    }

    private static MensajeEntrante toque(String botonId, String tel) {
        return new MensajeEntrante(Canal.WHATSAPP, "PNID", tel, "Ana", "wamid.T1", "interactive", "Sí, quiero ofertas",
            null, 1L, botonId);
    }

    @Test
    @DisplayName("el botón «Sí, quiero ofertas» registra el consentimiento y consume el mensaje")
    void botonSiRegistraConsentimiento() {
        ConfirmacionBajaEnvio envio = mock(ConfirmacionBajaEnvio.class);

        boolean consumido = interceptor(envio).interceptar(cuentaWa, toque(OfertaConsentimientoService.ID_SI, TEL_ANA));

        assertThat(consumido).isTrue();
        assertThat(consRepo.activoPorHash(EMPRESA, CampanaTestSupport.hash(EMPRESA, TEL_ANA))).hasSize(1);
        verify(envio).enviar(eq(cuentaWa), eq(TEL_ANA), anyString());
    }

    @Test
    @DisplayName("el opt-in de quien está de baja NO levanta la baja ni registra consentimiento")
    void optInNoLevantaLaBaja() {
        bajas.registrar(EMPRESA, "WHATSAPP", TEL_ANA);
        ConfirmacionBajaEnvio envio = mock(ConfirmacionBajaEnvio.class);

        interceptor(envio).interceptar(cuentaWa, toque(OfertaConsentimientoService.ID_SI, TEL_ANA));

        assertThat(consRepo.resumen(EMPRESA).activos()).isZero();
        assertThat(bajas.estaDeBaja(EMPRESA, "WHATSAPP", TEL_ANA)).isTrue();
    }

    @Test
    @DisplayName("STOP revoca el consentimiento pero NO consume el mensaje (la baja la registra su interceptor)")
    void stopRevocaYNoConsume() {
        consiente(EMPRESA, TEL_ANA, "Ana");
        MensajeEntrante stop = new MensajeEntrante(Canal.WHATSAPP, "PNID", TEL_ANA, "Ana", "wamid.S", "text", "STOP", null, 1L);

        boolean consumido = interceptor(mock(ConfirmacionBajaEnvio.class)).interceptar(cuentaWa, stop);

        assertThat(consumido).isFalse();
        assertThat(consRepo.resumen(EMPRESA)).isEqualTo(new ConsentimientoRepositorio.Resumen(0, 1));
    }

    @Test
    @DisplayName("un mensaje de texto normal no da consentimiento, ni siquiera diciendo «sí»")
    void escribirNoEsConsentir() {
        MensajeEntrante si = new MensajeEntrante(Canal.WHATSAPP, "PNID", TEL_ANA, "Ana", "wamid.X", "text", "sí quiero", null, 1L);

        assertThat(interceptor(mock(ConfirmacionBajaEnvio.class)).interceptar(cuentaWa, si)).isFalse();
        assertThat(consRepo.resumen(EMPRESA).activos()).isZero();
    }

    @Test
    @DisplayName("el ofrecimiento sale con los dos botones; no se envía a quien ya consintió")
    void ofertaConBotones() {
        OfertaConsentimientoService oferta = new OfertaConsentimientoService(consentimientos, canal,
            new EmpresaConNombre().repo);

        assertThat(oferta.ofrecer(cuentaWa, TEL_ANA)).isTrue();
        ArgumentCaptor<List> botones = ArgumentCaptor.forClass(List.class);
        verify(canal).enviarBotones(eq(cuentaWa), eq(TEL_ANA), anyString(), botones.capture());
        assertThat(botones.getValue()).hasSize(2);

        consiente(EMPRESA, TEL_LUIS, "Luis");
        assertThat(oferta.ofrecer(cuentaWa, TEL_LUIS)).isFalse();
    }

    // ── plantillas ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("el alta va a Meta como MARKETING y queda PENDIENTE; sin llamada real")
    void altaDePlantillaQuedaPendiente() {
        when(graph.crearPlantilla(eq("WABA1"), eq("tok-prueba"), any())).thenReturn(new PlantillaRemota("m-1", "PENDING", null));

        Fila f = plantillas.crear(EMPRESA, "oferta_diciembre", "Hola {{1}}, mira nuestras ofertas de diciembre",
            List.of("Ana"));

        assertThat(f.estado()).isEqualTo(Estado.PENDIENTE);
        assertThat(f.metaPlantillaId()).isEqualTo("m-1");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> cuerpo = ArgumentCaptor.forClass(Map.class);
        verify(graph).crearPlantilla(eq("WABA1"), eq("tok-prueba"), cuerpo.capture());
        assertThat(cuerpo.getValue()).containsEntry("category", "MARKETING").containsEntry("language", "es")
            .containsEntry("name", "oferta_diciembre");
    }

    @Test
    @DisplayName("el estado de Meta se refleja: APROBADA y RECHAZADA, por webhook y por consulta; repetir no cambia nada")
    void estadoDeMetaSeAplica() {
        when(graph.crearPlantilla(any(), any(), any())).thenReturn(new PlantillaRemota("m-2", "PENDING", null));
        Fila f = plantillas.crear(EMPRESA, "oferta_x", "Hola {{1}}, ofertas nuevas", List.of("Ana"));

        plantillas.aplicarEstadoWebhook(new EstadoEntrante.EstadoPlantilla("m-2", "oferta_x", "APPROVED", null));
        plantillas.aplicarEstadoWebhook(new EstadoEntrante.EstadoPlantilla("m-2", "oferta_x", "APPROVED", null));
        assertThat(plantillas.obtener(EMPRESA, f.id()).estado()).isEqualTo(Estado.APROBADA);

        plantillas.aplicarEstadoWebhook(new EstadoEntrante.EstadoPlantilla("m-2", "oferta_x", "REJECTED", "INVALID_FORMAT"));
        Fila rechazada = plantillas.obtener(EMPRESA, f.id());
        assertThat(rechazada.estado()).isEqualTo(Estado.RECHAZADA);
        assertThat(rechazada.motivoRechazo()).isEqualTo("INVALID_FORMAT");

        when(graph.estadoPlantilla(eq("m-2"), any())).thenReturn(new PlantillaRemota("m-2", "APPROVED", null));
        assertThat(plantillas.sincronizar(EMPRESA, f.id()).estado()).isEqualTo(Estado.APROBADA);
    }

    @Test
    @DisplayName("si Meta rechaza el alta no se guarda nada y el error sube")
    void altaRechazadaNoSeGuarda() {
        when(graph.crearPlantilla(any(), any(), any())).thenThrow(new MetaRechazoException(100));

        assertThatThrownBy(() -> plantillas.crear(EMPRESA, "oferta_y", "Hola {{1}}, ofertas", List.of("Ana")))
            .isInstanceOf(MetaRechazoException.class);
        assertThat(plantillas.listar(EMPRESA)).isEmpty();
    }

    @Test
    @DisplayName("validaciones: nombre, variable al inicio, ejemplos y WhatsApp conectado")
    void validacionesDeAlta() {
        assertThatThrownBy(() -> plantillas.crear(EMPRESA, "Oferta Mala", "Hola {{1}}, ofertas", List.of("Ana")))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> plantillas.crear(EMPRESA, "oferta_z", "{{1}} te invita a ver ofertas", List.of("Ana")))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> plantillas.crear(EMPRESA, "oferta_z", "Hola {{1}}, ofertas", List.of()))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> plantillas.crear(EMPRESA, "oferta_z", "Hola {{2}}, ofertas", List.of("Ana")))
            .isInstanceOf(IllegalArgumentException.class);
        when(cuentas.activaDe(EMPRESA, Canal.WHATSAPP)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> plantillas.crear(EMPRESA, "oferta_z", "Hola {{1}}, ofertas", List.of("Ana")))
            .isInstanceOf(IllegalStateException.class);
        verify(graph, never()).crearPlantilla(any(), any(), any());
    }

    @Test
    @DisplayName("el estado de una plantilla de otro negocio no se puede consultar ni sincronizar")
    void plantillaAjenaInaccesible() {
        long pl = plantilla(EMPRESA, Estado.PENDIENTE);

        assertThatThrownBy(() -> plantillas.sincronizar(OTRA, pl))
            .isInstanceOf(com.hotclick.exception.RecursoNoEncontradoException.class);
    }

    @Test
    @DisplayName("las cuentas de Meta de otro tipo o inactivas no sirven para el alta")
    void cuentaInactivaNoSirve() {
        CanalCuenta pausada = CampanaTestSupport.cuenta(EMPRESA);
        pausada.setEstado(EstadoCanal.PAUSADA);
        when(cuentas.activaDe(EMPRESA, Canal.WHATSAPP)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> plantillas.crear(EMPRESA, "oferta_w", "Hola {{1}}, ofertas", List.of("Ana")))
            .isInstanceOf(IllegalStateException.class);
        CanalMensajeria sinUso = canal;
        verify(sinUso, never()).enviarPlantillaMarketing(any(), anyString(), anyString(), anyString(), anyList());
    }
}
