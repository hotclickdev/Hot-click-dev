package com.hotclick.agente.interno;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.model.Usuario;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.copilot.AiCopilotToolExecutor;
import com.hotclick.service.telegram.TelegramFlujoSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class HerramientasInternasTest {

    private static final long EMPRESA = 7L;
    private static final long USUARIO = 100L;
    private static final String TEL = "50660000001";
    private static final Instant AHORA = Instant.parse("2026-12-01T10:00:00Z");

    private VinculacionInternaService vinc;
    private UsuarioRepository usuarios;
    private TelegramFlujoSupport permisos;
    private AiCopilotToolExecutor copilot;
    private BitacoraAgente bitacora;
    private AgenteVinculacion v;
    private final ObjectMapper mapper = new ObjectMapper();
    private final JsonNode vacio = mapper.createObjectNode();
    private final ContextoHerramienta ctx = new ContextoHerramienta(EMPRESA, TEL, PerfilAgente.NEGOCIO_INTERNO);

    @BeforeEach
    void init() {
        vinc = mock(VinculacionInternaService.class);
        usuarios = mock(UsuarioRepository.class);
        permisos = mock(TelegramFlujoSupport.class);
        copilot = mock(AiCopilotToolExecutor.class);
        bitacora = mock(BitacoraAgente.class);
        v = new AgenteVinculacion();
        v.setId(5L);
        v.setUsuarioId(USUARIO);
        v.setEmpresaId(EMPRESA);
        v.setEstado(AgenteVinculacion.ACTIVA);
        v.setPinHash("$2a$04$hashdeprueba");
        when(vinc.ahora()).thenReturn(AHORA);
        when(vinc.vinculacionActiva(EMPRESA, TEL)).thenReturn(Optional.of(v));
        when(usuarios.findById(USUARIO)).thenReturn(Optional.of(mock(Usuario.class)));
        when(copilot.buildTools(eq(EMPRESA), anyBoolean(), eq(true)))
            .thenReturn(List.of(Map.of("name", "consultar_finanzas")));
    }

    private ConsultarFinanzasInterna finanzas() {
        return new ConsultarFinanzasInterna(vinc, usuarios, permisos, copilot, bitacora);
    }

    // ── consultar_finanzas ────────────────────────────────────────────────────

    @Test
    void finanzasSinPinVigenteNoConsultaYDejaEsperaDePin() {
        when(permisos.esDueno(any(), eq(EMPRESA))).thenReturn(true);
        ResultadoHerramienta r = finanzas().ejecutar(ctx, vacio);
        assertThat(r.esError()).isTrue();
        verify(copilot, never()).ejecutarTool(anyLong(), anyString(), any(), any(), anyBoolean());
        verify(vinc).guardarPendiente(eq(5L), eq(AgenteVinculacion.PEND_PIN_FINANZAS), any(), any(Duration.class));
    }

    @Test
    void finanzasConPinVigenteYDuenoConsultaYQuedaEnBitacora() {
        when(permisos.esDueno(any(), eq(EMPRESA))).thenReturn(true);
        v.setPinSesionHasta(AHORA.plus(Duration.ofMinutes(5)));
        when(copilot.ejecutarTool(eq(EMPRESA), eq("consultar_finanzas"), any(), any(), eq(true))).thenReturn("Ventas: 100");
        ResultadoHerramienta r = finanzas().ejecutar(ctx, vacio);
        assertThat(r.esError()).isFalse();
        assertThat(r.contenido()).isEqualTo("Ventas: 100");
        verify(bitacora).registrar(EMPRESA, USUARIO, "CONSULTA_FINANZAS", AgenteAccion.EJECUTADA, null);
    }

    @Test
    void finanzasConPinVencidoVuelveAPedirlo() {
        when(permisos.esDueno(any(), eq(EMPRESA))).thenReturn(true);
        v.setPinSesionHasta(AHORA.minusSeconds(1));
        assertThat(finanzas().ejecutar(ctx, vacio).esError()).isTrue();
        verify(copilot, never()).ejecutarTool(anyLong(), anyString(), any(), any(), anyBoolean());
    }

    @Test
    void finanzasSiElRolNoEsDuenoSeRechazaAunConPin() {
        when(permisos.esDueno(any(), eq(EMPRESA))).thenReturn(false);
        v.setPinSesionHasta(AHORA.plus(Duration.ofMinutes(5)));
        assertThat(finanzas().ejecutar(ctx, vacio).esError()).isTrue();
        verify(copilot, never()).ejecutarTool(anyLong(), anyString(), any(), any(), anyBoolean());
        verify(bitacora).registrar(EMPRESA, USUARIO, "CONSULTA_FINANZAS", AgenteAccion.RECHAZADA, null);
    }

    @Test
    void finanzasSiElPlanNoLasIncluyeSeRechaza() {
        when(permisos.esDueno(any(), eq(EMPRESA))).thenReturn(true);
        when(copilot.buildTools(eq(EMPRESA), anyBoolean(), eq(true))).thenReturn(List.of());
        v.setPinSesionHasta(AHORA.plus(Duration.ofMinutes(5)));
        assertThat(finanzas().ejecutar(ctx, vacio).esError()).isTrue();
        verify(copilot, never()).ejecutarTool(anyLong(), anyString(), any(), any(), anyBoolean());
    }

    @Test
    void finanzasDeUnTelefonoNoVinculadoSeRechaza() {
        when(vinc.vinculacionActiva(EMPRESA, TEL)).thenReturn(Optional.empty());
        assertThat(finanzas().ejecutar(ctx, vacio).esError()).isTrue();
        verify(copilot, never()).ejecutarTool(anyLong(), anyString(), any(), any(), anyBoolean());
    }

    // ── proponer_* ────────────────────────────────────────────────────────────

    private ProponerAccionInterna proponer() {
        Map<String, Object> def = Map.of("name", "proponer_ajustar_stock", "description", "Ajusta el stock",
            "input_schema", Map.of("type", "object", "properties", Map.of("cantidadReal", Map.of("type", "integer"))));
        return new ProponerAccionInterna(def, vinc, usuarios, permisos, copilot, bitacora, mapper);
    }

    @Test
    void proponerSoloDejaLaPropuestaPendienteYNoEjecuta() {
        when(permisos.esPropietarioOAdmin(any(), eq(EMPRESA))).thenReturn(true);
        when(copilot.ejecutarTool(eq(EMPRESA), eq("proponer_ajustar_stock"), any(), any(), eq(false))).thenAnswer(i -> {
            AccionPropuestaTelegram[] holder = i.getArgument(3);
            holder[0] = new AccionPropuestaTelegram(AccionPropuestaTelegram.STOCK_AJUSTE, 9L,
                Map.of("cantidadReal", 4), "Ajustar stock de Camisa a 4");
            return "Propuesta generada";
        });
        ResultadoHerramienta r = proponer().ejecutar(ctx, vacio);
        assertThat(r.esError()).isFalse();
        assertThat(r.contenido()).contains("SÍ").doesNotContain("botones");
        verify(vinc).guardarPendiente(eq(5L), eq(AgenteVinculacion.PEND_CONFIRMAR), org.mockito.ArgumentMatchers.contains("STOCK_AJUSTE"), any(Duration.class));
        verify(bitacora, never()).registrar(anyLong(), anyLong(), anyString(), eq(AgenteAccion.EJECUTADA), any());
    }

    @Test
    void proponerSinPropuestaDevuelveElTextoSinPendiente() {
        when(permisos.esPropietarioOAdmin(any(), eq(EMPRESA))).thenReturn(true);
        when(copilot.ejecutarTool(eq(EMPRESA), anyString(), any(), any(), eq(false)))
            .thenReturn("Encontré varios pedidos que coinciden");
        ResultadoHerramienta r = proponer().ejecutar(ctx, vacio);
        assertThat(r.contenido()).contains("varios pedidos");
        verify(vinc, never()).guardarPendiente(anyLong(), anyString(), any(), any());
    }

    @Test
    void proponerSinRolDeGestionSeRechazaYQuedaEnBitacora() {
        when(permisos.esPropietarioOAdmin(any(), eq(EMPRESA))).thenReturn(false);
        ResultadoHerramienta r = proponer().ejecutar(ctx, vacio);
        assertThat(r.esError()).isTrue();
        verify(copilot, never()).ejecutarTool(anyLong(), anyString(), any(), any(), anyBoolean());
        verify(bitacora).registrar(EMPRESA, USUARIO, "proponer_ajustar_stock", AgenteAccion.RECHAZADA, null);
    }

    @Test
    void elSchemaEsEstrictoYLaDescripcionAvisaQueNoSeAplica() {
        ProponerAccionInterna t = proponer();
        assertThat(t.inputSchema()).containsEntry("additionalProperties", false).containsKey("required");
        assertThat(t.descripcion()).contains("NO se aplica");
        assertThat(PerfilAgente.NEGOCIO_INTERNO.permite("proponer_ajustar_stock")).isTrue();
        assertThat(PerfilAgente.NEGOCIO_INTERNO.permite("consultar_finanzas")).isTrue();
        assertThat(PerfilAgente.NEGOCIO_VENTAS.permite("consultar_finanzas")).isFalse();
        assertThat(PerfilAgente.NEGOCIO_VENTAS.permite("proponer_ajustar_stock")).isFalse();
        assertThat(PerfilAgente.HOTCLICK.permite("proponer_ajustar_stock")).isFalse();
    }
}
