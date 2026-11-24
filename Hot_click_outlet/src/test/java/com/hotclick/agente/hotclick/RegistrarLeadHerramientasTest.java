package com.hotclick.agente.hotclick;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.lead.LeadService;
import com.hotclick.agente.lead.TipoLead;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("registrar_lead y registrar_lead_negocio (HotClick)")
class RegistrarLeadHerramientasTest {

    private static final ObjectMapper OM = new ObjectMapper();
    private static final String TEL = "50670001234";   // ficticio

    private LeadService leads;
    private RegistrarLeadHerramienta comprador;
    private RegistrarLeadNegocioHerramienta negocio;
    private final UUID sesion = UUID.randomUUID();

    @BeforeEach
    void init() {
        leads = mock(LeadService.class);
        comprador = new RegistrarLeadHerramienta(leads);
        negocio = new RegistrarLeadNegocioHerramienta(leads, "https://hotclick.example/");
    }

    private ContextoHerramienta ctx() {
        return new ContextoHerramienta(null, TEL, PerfilAgente.HOTCLICK, null, MensajeEntrante.Canal.WHATSAPP, sesion);
    }

    private static JsonNode json(String s) throws Exception {
        return OM.readTree(s);
    }

    @Test
    @DisplayName("Comprador: la tienda se resuelve por slug público; empresa y contacto salen del contexto")
    void compradorTiendaValida() throws Exception {
        when(leads.empresaPublicaPorSlug("tienda-a")).thenReturn(Optional.of(11L));

        ResultadoHerramienta r = comprador.ejecutar(ctx(), json("{\"tienda\":\"tienda-a\",\"interes\":\"bolso\",\"nombre\":\"Ana\"}"));

        assertThat(r.esError()).isFalse();
        assertThat(r.accion().tipo()).isEqualTo(AccionAgente.Tipo.LEAD_REGISTRADO);
        assertThat(r.accion().dato()).doesNotContain(TEL);
        verify(leads).registrar(eq(TipoLead.COMPRADOR), eq(11L), eq(TEL), eq("WHATSAPP"), eq(sesion),
            eq("Ana"), isNull(), eq("bolso"));
    }

    @Test
    @DisplayName("Comprador: una tienda oculta o inexistente no registra nada")
    void compradorTiendaOculta() throws Exception {
        when(leads.empresaPublicaPorSlug(anyString())).thenReturn(Optional.empty());

        ResultadoHerramienta r = comprador.ejecutar(ctx(), json("{\"tienda\":\"oculta\",\"interes\":\"bolso\"}"));

        assertThat(r.esError()).isTrue();
        verify(leads, never()).registrar(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Comprador: con empresa en el contexto se ignora la tienda del input")
    void compradorEmpresaDelContexto() throws Exception {
        ContextoHerramienta c = new ContextoHerramienta(4L, TEL, PerfilAgente.NEGOCIO_VENTAS, "N",
            MensajeEntrante.Canal.WHATSAPP, sesion);

        comprador.ejecutar(c, json("{\"tienda\":\"otra\",\"interes\":\"x\",\"empresaId\":99}"));

        verify(leads).registrar(eq(TipoLead.COMPRADOR), eq(4L), any(), any(), any(), any(), any(), eq("x"));
        verify(leads, never()).empresaPublicaPorSlug(any());
    }

    @Test
    @DisplayName("Negocio: lead de HotClick (empresa null) y respuesta con el enlace de registro")
    void negocioConEnlace() throws Exception {
        ResultadoHerramienta r = negocio.ejecutar(ctx(),
            json("{\"nombre\":\"Café Sol\",\"tipoNegocio\":\"cafetería\",\"interes\":\"plan PyME\",\"empresaId\":5}"));

        assertThat(r.esError()).isFalse();
        assertThat(r.contenido()).contains("https://hotclick.example/registro-empresa").doesNotContain(TEL);
        verify(leads).registrar(eq(TipoLead.NEGOCIO), isNull(), eq(TEL), eq("WHATSAPP"), eq(sesion),
            eq("Café Sol"), eq("cafetería"), eq("plan PyME"));
    }

    @Test
    @DisplayName("Negocio: sin nombre o rubro no registra")
    void negocioIncompleto() throws Exception {
        assertThat(negocio.ejecutar(ctx(), json("{\"nombre\":\"\",\"tipoNegocio\":\"x\"}")).esError()).isTrue();
        verify(leads, never()).registrar(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Perfil HOTCLICK incluye las tools nuevas y los schemas no aceptan empresa")
    void perfilYSchema() {
        assertThat(PerfilAgente.HOTCLICK.herramientas())
            .contains("registrar_lead", "registrar_lead_negocio", "explicar_planes", "crear_enlace_compra");
        assertThat(comprador.inputSchema().toString()).doesNotContain("empresa");
        assertThat(negocio.inputSchema().toString()).doesNotContain("empresa");
        assertThat(comprador.inputSchema()).containsEntry("additionalProperties", false);
    }
}
