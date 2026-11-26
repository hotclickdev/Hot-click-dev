package com.hotclick.agente.asesor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.VectorSearchService;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** AG-28: validaciones de las tools del asesor web (carrito, pedido, chat de la tienda). */
class AsesorHerramientasTest {

    private static final ObjectMapper OM = new ObjectMapper();
    private static final long TIENDA = 5L;

    private VectorSearchService busqueda;
    private PedidoAsesorRepository pedidos;
    private EmpresaRepository empresas;
    private AgregarAlCarritoHerramienta carrito;
    private ConsultarPedidoWebHerramienta pedido;
    private PasarAlChatTiendaHerramienta chat;

    @BeforeEach
    void init() {
        busqueda = mock(VectorSearchService.class);
        pedidos = mock(PedidoAsesorRepository.class);
        empresas = mock(EmpresaRepository.class);
        carrito = new AgregarAlCarritoHerramienta(busqueda);
        pedido = new ConsultarPedidoWebHerramienta(pedidos);
        chat = new PasarAlChatTiendaHerramienta(new ChatTiendaService(empresas));
    }

    private static JsonNode json(String s) throws Exception {
        return OM.readTree(s);
    }

    private static ContextoHerramienta tienda(Long usuarioId) {
        return new ContextoHerramienta(TIENDA, null, PerfilAgente.ASESOR_WEB, "Tienda", null, null, usuarioId);
    }

    private static ContextoHerramienta marketplace() {
        return new ContextoHerramienta(null, null, PerfilAgente.ASESOR_WEB, null, null, null, null);
    }

    private static ProductoContexto producto(long id, int stock, boolean personalizado) {
        return new ProductoContexto(id, "Taza", "SKU", 5000, "corta", null, stock, null, "Hogar", null, null,
            personalizado, null, null, null, null, "₡5000");
    }

    // ── agregar_al_carrito ───────────────────────────────────────────────────

    @Test
    void agregaUnProductoVisibleDeLaTiendaConLaCantidadValidada() throws Exception {
        when(busqueda.buscarPorId(TIENDA, 10L, false)).thenReturn(List.of(producto(10, 3, false)));

        ResultadoHerramienta r = carrito.ejecutar(tienda(null), json("{\"productoId\":10,\"cantidad\":8}"));

        assertThat(r.esError()).isFalse();
        assertThat(r.accion().tipo()).isEqualTo(AccionAgente.Tipo.AGREGAR_CARRITO);
        JsonNode dato = OM.readTree(r.accion().dato());
        assertThat(dato.path("productoId").asLong()).isEqualTo(10L);
        assertThat(dato.path("cantidad").asInt()).isEqualTo(3); // tope por stock
        assertThat(r.contenido()).contains("NO está en el carrito");
    }

    @Test
    void rechazaProductoOcultoOdeOtraTiendaYUsaLaEmpresaDelContexto() throws Exception {
        // El gate de visibilidad (o la tienda distinta) hace que la búsqueda no lo devuelva.
        when(busqueda.buscarPorId(anyLong(), anyLong(), anyBoolean())).thenReturn(List.of());

        ResultadoHerramienta r = carrito.ejecutar(tienda(null), json("{\"productoId\":99,\"cantidad\":1}"));

        assertThat(r.esError()).isTrue();
        assertThat(r.accion()).isNull();
        verify(busqueda).buscarPorId(eq(TIENDA), eq(99L), eq(false));
    }

    @Test
    void enMarketplaceBuscaSinFiltrarPorEmpresa() throws Exception {
        when(busqueda.buscarPorId(null, 10L, true)).thenReturn(List.of(producto(10, 4, false)));

        ResultadoHerramienta r = carrito.ejecutar(marketplace(), json("{\"productoId\":10,\"cantidad\":1}"));

        assertThat(r.accion()).isNotNull();
    }

    @Test
    void rechazaAgotadosPersonalizadosYEntradaInvalida() throws Exception {
        when(busqueda.buscarPorId(TIENDA, 1L, false)).thenReturn(List.of(producto(1, 0, false)));
        when(busqueda.buscarPorId(TIENDA, 2L, false)).thenReturn(List.of(producto(2, 5, true)));

        assertThat(carrito.ejecutar(tienda(null), json("{\"productoId\":1,\"cantidad\":1}")).esError()).isTrue();
        assertThat(carrito.ejecutar(tienda(null), json("{\"productoId\":2,\"cantidad\":1}")).esError()).isTrue();
        assertThat(carrito.ejecutar(tienda(null), json("{\"productoId\":\"x\",\"cantidad\":1}")).esError()).isTrue();
    }

    // ── consultar_pedido_web ─────────────────────────────────────────────────

    private static Pedido pedido(long empresaId, String numero, String correo, String tel) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        Usuario u = new Usuario();
        u.setId(77L);
        u.setCorreo(correo);
        u.setTelefono(tel);
        Pedido p = new Pedido();
        p.setEmpresa(e);
        p.setNumeroPedido(numero);
        p.setUsuarioFinal(u);
        p.setEstadoPedido("ENVIADO");
        p.setTotalPedido(12000);
        p.setNumeroGuia("GUIA1");
        return p;
    }

    @Test
    void pedidoAjenoSinDatosNoSeRevelaNiSeConsulta() throws Exception {
        ResultadoHerramienta sinNada = pedido.ejecutar(tienda(null), json("{\"numeroPedido\":\"ORD-AAAA1\",\"correoOTelefono\":\"\"}"));
        assertThat(sinNada.contenido()).contains("hacen falta el número").doesNotContain("ENVIADO");

        when(pedidos.porNumero("ORD-AAAA1")).thenReturn(Optional.of(pedido(TIENDA, "ORD-AAAA1", "dueno@correo.cr", "88887777")));
        ResultadoHerramienta ajeno = pedido.ejecutar(tienda(null),
            json("{\"numeroPedido\":\"ord-aaaa1\",\"correoOTelefono\":\"otro@correo.cr\"}"));
        assertThat(ajeno.contenido()).isEqualTo(ConsultarPedidoWebHerramienta.NO_ENCONTRADO);
    }

    @Test
    void pedidoConNumeroYCorreoOTelefonoCorrectosSeMuestra() throws Exception {
        when(pedidos.porNumero("ORD-AAAA1")).thenReturn(Optional.of(pedido(TIENDA, "ORD-AAAA1", "dueno@correo.cr", "8888-7777")));

        ResultadoHerramienta porCorreo = pedido.ejecutar(tienda(null),
            json("{\"numeroPedido\":\"ORD-AAAA1\",\"correoOTelefono\":\"DUENO@correo.cr\"}"));
        ResultadoHerramienta porTel = pedido.ejecutar(tienda(null),
            json("{\"numeroPedido\":\"ORD-AAAA1\",\"correoOTelefono\":\"88887777\"}"));

        assertThat(porCorreo.contenido()).contains("ENVIADO", "GUIA1").doesNotContain("dueno@");
        assertThat(porTel.contenido()).contains("ENVIADO");
    }

    @Test
    void pedidoDeOtraTiendaNoSeConsultaDesdeUnaTienda() throws Exception {
        when(pedidos.porNumero("ORD-BBBB2")).thenReturn(Optional.of(pedido(99L, "ORD-BBBB2", "a@b.cr", "88887777")));

        ResultadoHerramienta r = pedido.ejecutar(tienda(null),
            json("{\"numeroPedido\":\"ORD-BBBB2\",\"correoOTelefono\":\"a@b.cr\"}"));

        assertThat(r.contenido()).isEqualTo(ConsultarPedidoWebHerramienta.NO_ENCONTRADO);
    }

    @Test
    void conSesionSoloVeSusPedidosYDeLaTienda() throws Exception {
        when(pedidos.delUsuario(eq(77L), any(Pageable.class))).thenReturn(List.of(
            pedido(TIENDA, "ORD-MIO01", "a@b.cr", "88887777"), pedido(99L, "ORD-OTRA1", "a@b.cr", "88887777")));

        ResultadoHerramienta r = pedido.ejecutar(tienda(77L), json("{\"numeroPedido\":\"\",\"correoOTelefono\":\"\"}"));

        assertThat(r.contenido()).contains("ORD-MIO01").doesNotContain("ORD-OTRA1");
    }

    // ── pasar_al_chat_tienda ─────────────────────────────────────────────────

    private void plan(String nombre, String whatsapp) {
        Empresa e = new Empresa();
        e.setId(TIENDA);
        e.setNumeroWhatsapp(whatsapp);
        when(empresas.findNombrePlanEfectivo(TIENDA)).thenReturn(Optional.ofNullable(nombre));
        when(empresas.findById(TIENDA)).thenReturn(Optional.of(e));
    }

    @Test
    void traspasoSoloConPlanPymeONegocioPlus() throws Exception {
        plan("PYME", "8888-7777");
        ResultadoHerramienta pyme = chat.ejecutar(tienda(null), json("{\"motivo\":\"quiere hablar\"}"));
        assertThat(pyme.accion().tipo()).isEqualTo(AccionAgente.Tipo.CHAT_TIENDA);
        assertThat(pyme.accion().dato()).isEqualTo("https://wa.me/50688887777");

        plan("EMPRENDEDOR", "8888-7777");
        assertThat(chat.ejecutar(tienda(null), json("{\"motivo\":\"x\"}")).accion()).isNull();

        plan(null, "8888-7777");
        assertThat(chat.ejecutar(tienda(null), json("{\"motivo\":\"x\"}")).accion()).isNull();
    }

    @Test
    void traspasoSinNumeroOEnMarketplaceNoDaBoton() throws Exception {
        plan("NEGOCIO_PLUS", null);
        assertThat(chat.ejecutar(tienda(null), json("{\"motivo\":\"x\"}")).accion()).isNull();
        assertThat(chat.ejecutar(marketplace(), json("{\"motivo\":\"x\"}")).accion()).isNull();
    }

    // ── intención ────────────────────────────────────────────────────────────

    @Test
    void detectaSoloMensajesDeAccion() {
        assertThat(AsesorIntencion.detecta("Agrégalo al carrito por favor")).isTrue();
        assertThat(AsesorIntencion.detecta("¿Dónde está mi pedido ORD-AB12CD?")).isTrue();
        assertThat(AsesorIntencion.detecta("busco una lámpara azul")).isFalse();
        assertThat(AsesorIntencion.detecta(null)).isFalse();
    }
}
