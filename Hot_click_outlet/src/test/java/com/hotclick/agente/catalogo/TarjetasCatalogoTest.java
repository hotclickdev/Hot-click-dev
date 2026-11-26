package com.hotclick.agente.catalogo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.canal.CanalMensajeria.ReferenciaCatalogo;
import com.hotclick.agente.canal.TarjetaProducto;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.agente.ventas.MostrarProductosHerramienta;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class TarjetasCatalogoTest extends CatalogoFixture {

    private static final String IMG = "https://img.test/p.jpg";
    private final TarjetasCatalogoService tarjetas = new TarjetasCatalogoService(repo, canal, cuentas, graph);
    private final ObjectMapper om = new ObjectMapper();

    private void sincronizados() {
        conectarCatalogo(EMPRESA);
        producto(10, EMPRESA, 5000, IMG);
        producto(11, EMPRESA, 6000, IMG);
        servicio.barrer(EMPRESA);
    }

    @Test
    @DisplayName("sin catálogo conectado no se envía ninguna tarjeta")
    void sinCatalogoNoEnvia() {
        producto(10, EMPRESA, 5000, IMG);

        assertThat(tarjetas.enviar(cuenta, "5068888", List.of(10L))).isFalse();

        verifyNoInteractions(canal);
    }

    @Test
    @DisplayName("un producto sincronizado sale como tarjeta nativa con el catálogo y el retailer id")
    void tarjetaNativa() {
        sincronizados();

        assertThat(tarjetas.enviar(cuenta, "5068888", List.of(10L))).isTrue();

        verify(canal).enviarProductoCatalogo(eq(cuenta), eq("5068888"),
            eq(new ReferenciaCatalogo("123456789", "10", null)), any(TarjetaProducto.class));
    }

    @Test
    @DisplayName("varios productos sincronizados en WhatsApp salen como product_list")
    void listaDeProductos() {
        sincronizados();

        tarjetas.enviar(cuenta, "5068888", List.of(10L, 11L));

        verify(canal).enviarListaProductosCatalogo(eq(cuenta), eq("5068888"), eq("123456789"), anyString(), anyString(),
            eq(List.of("10", "11")), anyList());
    }

    @Test
    @DisplayName("un producto que aún no está en Meta cae a la tarjeta normal (enviarProducto)")
    void respaldoSiNoEstaSincronizado() {
        conectarCatalogo(EMPRESA);
        producto(10, EMPRESA, 5000, IMG); // sin barrido: no está en Meta

        assertThat(tarjetas.enviar(cuenta, "5068888", List.of(10L))).isTrue();

        verify(canal).enviarProducto(eq(cuenta), eq("5068888"), any(TarjetaProducto.class));
        verify(canal, never()).enviarProductoCatalogo(any(), anyString(), any(), any());
    }

    @Test
    @DisplayName("un producto oculto o de otro negocio no genera tarjeta")
    void ocultoOAjenoNoSeMuestra() {
        sincronizados();
        producto(14, OTRA, 9000, IMG);
        jdbc.update("UPDATE hot_click_producto_tb SET visible_catalogo = FALSE WHERE id_producto = 11");

        assertThat(tarjetas.enviar(cuenta, "5068888", List.of(14L, 11L))).isFalse();

        verifyNoInteractions(canal);
    }

    @Test
    @DisplayName("la herramienta mostrar_productos: sin catálogo responde error y no emite acción")
    void herramientaSinCatalogo() throws Exception {
        producto(10, EMPRESA, 5000, IMG);

        ResultadoHerramienta r = new MostrarProductosHerramienta(tarjetas).ejecutar(
            new ContextoHerramienta(EMPRESA, "5068888", PerfilAgente.NEGOCIO_VENTAS), om.readTree("{\"productoIds\":[10]}"));

        assertThat(r.esError()).isTrue();
        assertThat(r.accion()).isNull();
    }

    @Test
    @DisplayName("la herramienta emite la acción solo con los ids visibles del negocio (máx. 3) y no acepta ids ajenos")
    void herramientaValidaIds() throws Exception {
        sincronizados();
        producto(14, OTRA, 9000, IMG);
        MostrarProductosHerramienta h = new MostrarProductosHerramienta(tarjetas);
        ContextoHerramienta ctx = new ContextoHerramienta(EMPRESA, "5068888", PerfilAgente.NEGOCIO_VENTAS);

        ResultadoHerramienta r = h.ejecutar(ctx, om.readTree("{\"productoIds\":[10,14,11]}"));

        assertThat(r.esError()).isFalse();
        assertThat(r.accion().tipo()).isEqualTo(AccionAgente.Tipo.MOSTRAR_PRODUCTOS);
        assertThat(r.accion().dato()).isEqualTo("10,11");
        assertThat(h.ejecutar(ctx, om.readTree("{\"productoIds\":[14]}")).esError()).isTrue();
        assertThat(h.ejecutar(ctx, om.readTree("{\"productoIds\":[\"x\"]}")).esError()).isTrue();
        assertThat(PerfilAgente.NEGOCIO_VENTAS.permite("mostrar_productos")).isTrue();
        assertThat(PerfilAgente.HOTCLICK.permite("mostrar_productos")).isFalse();
    }
}
