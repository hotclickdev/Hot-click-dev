package com.hotclick.agente.ventas;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.rag.service.EmbeddingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Conocimiento por tienda: búsqueda filtrada por empresa y degradación sin vectores. */
class ConocimientoTest {

    private static final ObjectMapper OM = new ObjectMapper();
    private static final float[] VEC = {0.1f, 0.2f};

    private ConocimientoRepository repo;
    private EmbeddingService emb;
    private ConocimientoService service;
    private ConsultarConocimientoHerramienta tool;

    @BeforeEach
    void init() {
        repo = mock(ConocimientoRepository.class);
        emb = mock(EmbeddingService.class);
        service = new ConocimientoService(repo, emb);
        tool = new ConsultarConocimientoHerramienta(service);
        when(emb.generarEmbedding(any())).thenReturn(VEC);
    }

    private static ConocimientoRepository.Fila fila(Long empresa, String titulo) {
        return new ConocimientoRepository.Fila(1L, empresa, titulo, "Envíos en 2 días", "ENVIOS", true);
    }

    private ResultadoHerramienta consultar(Long empresaId, String pregunta) throws Exception {
        return tool.ejecutar(new ContextoHerramienta(empresaId, "WAID-1", PerfilAgente.HOTCLICK),
            OM.readTree("{\"pregunta\":\"" + pregunta + "\",\"empresaId\":999}"));
    }

    @Test
    void buscaSoloEnLaEmpresaDelContextoIgnorandoElInput() throws Exception {
        when(repo.buscarSimilares(eq(7L), any(), anyInt(), anyDouble())).thenReturn(List.of(fila(7L, "Envíos")));

        ResultadoHerramienta r = consultar(7L, "cuánto tarda el envío");

        verify(repo).buscarSimilares(eq(7L), eq(VEC), anyInt(), anyDouble());
        verify(repo, never()).buscarSimilares(eq(999L), any(), anyInt(), anyDouble());
        assertThat(r.contenido()).contains("Envíos", "2 días");
    }

    @Test
    void sinEmpresaBuscaConocimientoDeHotclickNoDeTodas() throws Exception {
        when(repo.buscarSimilares(eq((Long) null), any(), anyInt(), anyDouble()))
            .thenReturn(List.of(fila(null, "Planes")));

        ResultadoHerramienta r = consultar(null, "planes disponibles");

        assertThat(r.contenido()).contains("Planes");
        verify(repo).buscarSimilares(eq((Long) null), any(), anyInt(), anyDouble());
    }

    @Test
    void sinVectoresCaeABusquedaPorPalabrasDeLaMismaEmpresa() throws Exception {
        when(emb.generarEmbedding(any())).thenThrow(new IllegalStateException("sin voyage"));
        when(repo.buscarPorPalabras(eq(7L), anyList(), anyInt())).thenReturn(List.of(fila(7L, "Horario")));

        ResultadoHerramienta r = consultar(7L, "horario de atención");

        assertThat(r.contenido()).contains("Horario");
        verify(repo).buscarPorPalabras(eq(7L), eq(List.of("horario", "atención")), anyInt());
    }

    @Test
    void sinResultadosIndicaDerivarAPersona() throws Exception {
        when(repo.buscarSimilares(any(), any(), anyInt(), anyDouble())).thenReturn(List.of());
        when(repo.buscarPorPalabras(any(), anyList(), anyInt())).thenReturn(List.of());

        assertThat(consultar(7L, "algo raro").contenido()).contains("pasar_a_persona");
    }

    @Test
    void crearGuardaYIndexaConLaEmpresaDada() {
        when(repo.insertar(eq(7L), any(), any(), any(), eq(true))).thenReturn(5L);

        long id = service.crear(7L, "Envíos", "Tardan 2 días", "ENVIOS", true);

        assertThat(id).isEqualTo(5L);
        verify(repo).guardarEmbedding(5L, 7L, VEC);
    }

    @Test
    void falloDeEmbeddingNoImpideGuardar() {
        when(repo.insertar(any(), any(), any(), any(), eq(true))).thenReturn(5L);
        when(emb.generarEmbedding(any())).thenThrow(new IllegalStateException("sin voyage"));

        assertThat(service.crear(7L, "Envíos", "Tardan 2 días", null, true)).isEqualTo(5L);
        verify(repo, never()).guardarEmbedding(any(), any(), any());
    }

    @Test
    void actualizarOEliminarDeOtraEmpresaEsNoEncontrado() {
        when(repo.actualizar(eq(5L), eq(8L), any(), any(), any(), eq(true))).thenReturn(false);
        when(repo.eliminar(5L, 8L)).thenReturn(false);

        assertThatThrownBy(() -> service.actualizar(5L, 8L, "t", "c", null, true))
            .isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.eliminar(5L, 8L)).isInstanceOf(RecursoNoEncontradoException.class);
    }
}
