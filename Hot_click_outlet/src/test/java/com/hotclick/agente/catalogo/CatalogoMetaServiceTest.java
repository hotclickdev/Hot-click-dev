package com.hotclick.agente.catalogo;

import com.hotclick.agente.conexion.MetaGraphCliente;
import com.hotclick.agente.conexion.MetaRechazoException;
import com.hotclick.exception.IntegracionExternaException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CatalogoMetaServiceTest extends CatalogoFixture {

    private static final String IMG = "https://img.test/p.jpg";

    @Test
    @DisplayName("sin catálogo conectado no se hace nada: ni evento, ni barrido, ni consulta a Meta")
    void sinCatalogoNoHaceNada() {
        producto(10, EMPRESA, 5000, IMG);

        servicio.sincronizarProducto(EMPRESA, 10L);
        assertThat(servicio.barrer(EMPRESA)).isZero();

        verifyNoInteractions(graph);
        assertThat(filasItem(EMPRESA, "SINCRONIZADO")).isZero();
    }

    @Test
    @DisplayName("el barrido sube solo productos visibles con imagen https; oculto, vendido, sin imagen y de otra empresa no")
    void soloVisiblesYPropios() {
        conectarCatalogo(EMPRESA);
        producto(10, EMPRESA, 5000, IMG);
        producto(11, EMPRESA, 6000, IMG);
        producto(12, EMPRESA, 7000, "http://inseguro.test/p.jpg"); // imagen no https: Meta la rechaza
        producto(13, EMPRESA, 8000, IMG);
        producto(14, OTRA, 9000, IMG);                              // de otro negocio
        jdbc.update("UPDATE hot_click_producto_tb SET visible_catalogo = FALSE WHERE id_producto = 11");
        jdbc.update("UPDATE hot_click_producto_tb SET vendido = TRUE WHERE id_producto = 13");

        assertThat(servicio.barrer(EMPRESA)).isEqualTo(1);

        ArgumentCaptor<List> lote = ArgumentCaptor.forClass(List.class);
        verify(graph).itemsBatch(eq("123456789"), eq("tok-prueba"), lote.capture());
        assertThat(lote(lote)).hasSize(1);
        Map<String, Object> data = (Map<String, Object>) lote(lote).get(0).get("data");
        assertThat(lote(lote).get(0)).containsEntry("method", "UPDATE");
        assertThat(data).containsEntry("id", "10").containsEntry("price", "5000 CRC")
            .containsEntry("availability", "in stock").containsEntry("condition", "new")
            .containsEntry("link", "https://hotclick.test/tienda/tienda-uno/producto/10");
        assertThat(filasItem(EMPRESA, "SINCRONIZADO")).isEqualTo(1);
        assertThat(filasItem(OTRA, "SINCRONIZADO")).isZero();
    }

    @Test
    @DisplayName("una empresa suspendida, oculta o con membresía sin confirmar no sincroniza (regla del catálogo público)")
    void reglaDeVisibilidadDeLaEmpresa() {
        for (String[] caso : new String[][]{{"INACTIVO", "true", null}, {"ACTIVO", "false", null},
                {"ACTIVO", "true", "REQUIERE_MEMBRESIA"}}) {
            jdbc.update("DELETE FROM hot_click_producto_tb");
            jdbc.update("DELETE FROM hot_click_empresa_tb WHERE id_empresa = 1");
            empresa(EMPRESA, caso[0], Boolean.parseBoolean(caso[1]), caso[2], "tienda-uno");
            conectarCatalogo(EMPRESA);
            producto(10, EMPRESA, 5000, IMG);

            assertThat(servicio.barrer(EMPRESA)).isZero();
        }
        verify(graph, never()).itemsBatch(anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("incremental: guardar un producto lo sube; sin cambios no llama a Meta; con cambio de precio lo actualiza")
    void incrementalPorEvento() {
        conectarCatalogo(EMPRESA);
        producto(10, EMPRESA, 5000, IMG);

        servicio.sincronizarProducto(EMPRESA, 10L);
        verify(graph, times(1)).itemsBatch(anyString(), anyString(), anyList());

        servicio.sincronizarProducto(EMPRESA, 10L); // misma huella
        verify(graph, times(1)).itemsBatch(anyString(), anyString(), anyList());

        jdbc.update("UPDATE hot_click_producto_tb SET precio_venta = 5500 WHERE id_producto = 10");
        servicio.sincronizarProducto(EMPRESA, 10L);
        ArgumentCaptor<List> lote = ArgumentCaptor.forClass(List.class);
        verify(graph, times(2)).itemsBatch(anyString(), anyString(), lote.capture());
        assertThat(((Map<String, Object>) lote(lote).get(0).get("data")).get("price")).isEqualTo("5500 CRC");
    }

    @Test
    @DisplayName("baja: un producto que deja de ser visible se elimina de Meta (evento y barrido) y no se re-elimina")
    void bajaDeProductoOculto() {
        conectarCatalogo(EMPRESA);
        producto(10, EMPRESA, 5000, IMG);
        producto(11, EMPRESA, 6000, IMG);
        servicio.barrer(EMPRESA);

        jdbc.update("UPDATE hot_click_producto_tb SET visible_catalogo = FALSE WHERE id_producto = 10");
        servicio.sincronizarProducto(EMPRESA, 10L);
        ArgumentCaptor<List> lote = ArgumentCaptor.forClass(List.class);
        verify(graph, times(2)).itemsBatch(anyString(), anyString(), lote.capture());
        assertThat(lote(lote).get(0)).containsEntry("method", "DELETE");
        assertThat(filasItem(EMPRESA, "ELIMINADO")).isEqualTo(1);

        servicio.sincronizarProducto(EMPRESA, 10L);       // ya eliminado: nada
        assertThat(servicio.barrer(EMPRESA)).isZero();      // el barrido tampoco lo repite
        verify(graph, times(2)).itemsBatch(anyString(), anyString(), anyList());

        // Empresa suspendida: el barrido da de baja lo que quedaba (lo que el evento no ve)
        jdbc.update("UPDATE hot_click_empresa_tb SET estado_empresa = 'INACTIVO' WHERE id_empresa = 1");
        assertThat(servicio.barrer(EMPRESA)).isEqualTo(1);
        assertThat(filasItem(EMPRESA, "SINCRONIZADO")).isZero();
    }

    @Test
    @DisplayName("aislamiento: el evento de un producto de otra empresa no sube nada al catálogo de esta")
    void eventoDeProductoAjeno() {
        conectarCatalogo(EMPRESA);
        producto(14, OTRA, 9000, IMG);

        servicio.sincronizarProducto(EMPRESA, 14L);

        verify(graph, never()).itemsBatch(anyString(), anyString(), anyList());
    }

    @Test
    @DisplayName("si Meta cae no se marca nada como sincronizado, queda el error, y el siguiente barrido reintenta")
    void metaCaidaNoPierdeCambios() {
        conectarCatalogo(EMPRESA);
        producto(10, EMPRESA, 5000, IMG);
        when(graph.itemsBatch(anyString(), anyString(), anyList()))
            .thenThrow(new IntegracionExternaException("meta-graph", IntegracionExternaException.Tipo.TIMEOUT, "x"));

        servicio.barrer(EMPRESA);

        assertThat(filasItem(EMPRESA, "SINCRONIZADO")).isZero();
        assertThat(servicio.estado(EMPRESA).ultimoError()).isEqualTo("META_CAIDA");

        org.mockito.Mockito.doReturn(new MetaGraphCliente.ResultadoLote(Set.of(), 1))
            .when(graph).itemsBatch(anyString(), anyString(), anyList());
        servicio.barrer(EMPRESA);
        assertThat(filasItem(EMPRESA, "SINCRONIZADO")).isEqualTo(1);
        assertThat(servicio.estado(EMPRESA).ultimoError()).isNull();
    }

    @Test
    @DisplayName("un producto que Meta valida con error no se marca como sincronizado")
    void errorDeValidacionDeMeta() {
        conectarCatalogo(EMPRESA);
        producto(10, EMPRESA, 5000, IMG);
        producto(11, EMPRESA, 6000, IMG);
        when(graph.itemsBatch(anyString(), anyString(), anyList())).thenReturn(new MetaGraphCliente.ResultadoLote(Set.of("11"), 2));

        servicio.barrer(EMPRESA);

        assertThat(filasItem(EMPRESA, "SINCRONIZADO")).isEqualTo(1);
    }

    @Test
    @DisplayName("conectar valida el id, prueba el token contra Meta y exige una cuenta conectada")
    void conectarCatalogoValidaTodo() {
        assertThatThrownBy(() -> servicio.conectar(EMPRESA, "abc")).isInstanceOf(IllegalArgumentException.class);
        when(graph.nombreCatalogo("123456789", "tok-prueba")).thenReturn("Mi tienda");

        CatalogoMetaService.Estado e = servicio.conectar(EMPRESA, "123456789");

        assertThat(e.conectado()).isTrue();
        assertThat(e.catalogoId()).isEqualTo("123456789");

        // Meta rechaza (falta catalog_management): no se guarda
        when(graph.nombreCatalogo("999999999", "tok-prueba")).thenThrow(new MetaRechazoException(200));
        assertThatThrownBy(() -> servicio.conectar(EMPRESA, "999999999")).isInstanceOf(MetaRechazoException.class);
        assertThat(servicio.estado(EMPRESA).catalogoId()).isEqualTo("123456789");

        // sin cuenta conectada
        assertThatThrownBy(() -> servicio.conectar(OTRA, "123456789")).isInstanceOf(IllegalStateException.class);
        when(cuentas.activaDe(eq(OTRA), org.mockito.ArgumentMatchers.any())).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("desconectar quita el catálogo y sus productos sincronizados; luego no se hace nada")
    void desconectar() {
        conectarCatalogo(EMPRESA);
        producto(10, EMPRESA, 5000, IMG);
        servicio.barrer(EMPRESA);

        servicio.desconectar(EMPRESA);

        assertThat(servicio.estado(EMPRESA).conectado()).isFalse();
        assertThat(filasItem(EMPRESA, "SINCRONIZADO")).isZero();
        assertThat(servicio.barrer(EMPRESA)).isZero();
    }
}
