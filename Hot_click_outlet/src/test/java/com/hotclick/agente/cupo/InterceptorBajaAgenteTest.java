package com.hotclick.agente.cupo;

import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.interno.HasherInterno;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.IdiomaConversacion;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("STOP y ACTIVAR: lista de bajas e interceptor previo al motor (AG-29)")
class InterceptorBajaAgenteTest {

    private static final String CONTACTO = "50688880001";

    private AgenteBajaService bajas;
    private ConfirmacionBajaEnvio envio;
    private InterceptorBajaAgente interceptor;
    private IdiomaConversacion idiomas;
    private CanalCuenta cuenta;

    @BeforeEach
    void init() {
        bajas = new AgenteBajaService(CupoTestSupport.baseH2(), new HasherInterno("pepper-de-prueba"));
        envio = mock(ConfirmacionBajaEnvio.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        Empresa e = new Empresa();
        e.setNombreEmpresa("Tienda Uno");
        when(empresas.findById(7L)).thenReturn(Optional.of(e));
        idiomas = mock(IdiomaConversacion.class);
        interceptor = new InterceptorBajaAgente(bajas, empresas, envio, idiomas);
        cuenta = CupoTestSupport.cuenta(7L);
    }

    private MensajeEntrante msg(String texto) {
        return new MensajeEntrante(Canal.WHATSAPP, "PNID-1", CONTACTO, "Ana", "wamid.1", "text", texto, null, 1L);
    }

    @Test
    @DisplayName("STOP, BAJA y 'no quiero mensajes' (con tildes, mayúsculas y signos) marcan la baja y confirman")
    void stopMarcaLaBaja() {
        for (String texto : List.of("STOP", " Baja ", "¡Parar!", "No quiero mensajes.", "NO QUIERO MÁS MENSAJES")) {
            bajas.quitar(7L, "WHATSAPP", CONTACTO);
            assertThat(interceptor.interceptar(cuenta, msg(texto))).as(texto).isTrue();
            assertThat(bajas.estaDeBaja(7L, "WHATSAPP", CONTACTO)).as(texto).isTrue();
        }
        verify(envio, org.mockito.Mockito.times(5)).enviar(eq(cuenta), eq(CONTACTO), contains("Tienda Uno"));
    }

    @Test
    @DisplayName("STOP o ACTIVAR solos se confirman en el idioma del historial del contacto")
    void confirmacionUsaElIdiomaDelHistorial() {
        when(idiomas.deContacto(any(), eq(CONTACTO))).thenReturn(Idioma.EN);

        interceptor.interceptar(cuenta, msg("STOP"));
        verify(envio).enviar(any(), eq(CONTACTO), eq(TextosFijos.baja(Idioma.EN, "Tienda Uno")));

        interceptor.interceptar(cuenta, msg("ACTIVAR"));
        verify(envio).enviar(any(), eq(CONTACTO), eq(TextosFijos.activar(Idioma.EN, "Tienda Uno")));
    }

    @Test
    @DisplayName("si el mensaje trae pistas de idioma (portugués) manda sobre el historial")
    void elTextoActualManda() {
        when(idiomas.deContacto(any(), eq(CONTACTO))).thenReturn(Idioma.EN);

        interceptor.interceptar(cuenta, msg("Nao quero mensagens"));

        verify(envio).enviar(any(), eq(CONTACTO), eq(TextosFijos.baja(Idioma.PT, "Tienda Uno")));
    }

    @Test
    @DisplayName("repetir STOP no falla ni duplica")
    void stopRepetido() {
        assertThat(interceptor.interceptar(cuenta, msg("stop"))).isTrue();
        assertThat(interceptor.interceptar(cuenta, msg("stop"))).isTrue();
        assertThat(bajas.estaDeBaja(7L, "WHATSAPP", CONTACTO)).isTrue();
    }

    @Test
    @DisplayName("una frase que solo contiene la palabra no es una baja y sigue su camino al motor")
    void fraseNoEsBaja() {
        assertThat(interceptor.interceptar(cuenta, msg("no paren de enviarme el catálogo, stop de verdad no"))).isFalse();
        assertThat(interceptor.interceptar(cuenta, msg("hola"))).isFalse();
        assertThat(interceptor.interceptar(cuenta, msg(null))).isFalse();
        assertThat(bajas.estaDeBaja(7L, "WHATSAPP", CONTACTO)).isFalse();
        verify(envio, never()).enviar(any(), any(), any());
    }

    @Test
    @DisplayName("ACTIVAR quita la baja y confirma; sin baja previa el mensaje sigue su camino")
    void activar() {
        assertThat(interceptor.interceptar(cuenta, msg("Activar"))).isFalse();
        interceptor.interceptar(cuenta, msg("STOP"));
        assertThat(interceptor.interceptar(cuenta, msg("ACTIVAR"))).isTrue();
        assertThat(bajas.estaDeBaja(7L, "WHATSAPP", CONTACTO)).isFalse();
        verify(envio).enviar(eq(cuenta), eq(CONTACTO), contains("sobre lo que consultaste"));
    }

    @Test
    @DisplayName("la lista por lote devuelve solo a los de baja y respeta empresa y canal")
    void listaPorLote() {
        bajas.registrar(7L, "WHATSAPP", CONTACTO);
        ListaBajasAgente.Contacto deBaja = new ListaBajasAgente.Contacto(7L, "WHATSAPP", CONTACTO);
        ListaBajasAgente.Contacto otroNegocio = new ListaBajasAgente.Contacto(8L, "WHATSAPP", CONTACTO);
        ListaBajasAgente.Contacto otroCanal = new ListaBajasAgente.Contacto(7L, "MESSENGER", CONTACTO);
        ListaBajasAgente.Contacto otroContacto = new ListaBajasAgente.Contacto(7L, "WHATSAPP", "50688880002");
        Set<ListaBajasAgente.Contacto> r = bajas.dadosDeBaja(List.of(deBaja, otroNegocio, otroCanal, otroContacto));
        assertThat(r).containsExactly(deBaja);
        assertThat(bajas.dadosDeBaja(List.of())).isEmpty();
    }

    @Test
    @DisplayName("la tabla guarda solo hash: el contacto en claro no aparece")
    void sinContactoEnClaro() {
        bajas.registrar(7L, "WHATSAPP", CONTACTO);
        String guardado = bajasTablaComoTexto();
        assertThat(guardado).doesNotContain(CONTACTO);
    }

    private String bajasTablaComoTexto() {
        var jdbc = (org.springframework.jdbc.core.JdbcTemplate) org.springframework.test.util.ReflectionTestUtils.getField(bajas, "jdbc");
        return String.valueOf(jdbc.queryForList("SELECT * FROM hot_click_agente_baja_tb"));
    }
}
