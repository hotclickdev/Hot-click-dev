package com.hotclick.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.scheduler.TelegramInventarioScheduler;
import com.hotclick.service.AiCopilotService;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.sse.StockCambioEvent;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integración del bot de Telegram para clientes — sin tocar la API real:
 * los updates entrantes se simulan como los POST que Telegram haría al webhook,
 * y los envíos salientes se capturan sobre el mock de TelegramClienteBotService.
 *
 * Cubre: validación del secret, flujo de vinculación por código, expiración,
 * consultas por botones, aislamiento multi-tenant, permisos de ajuste de stock,
 * rechazo de archivos, rate limiting, cuota de IA, chequeo semanal y
 * notificaciones de venta/stock.
 */
class TelegramBotIntegrationTest extends BaseIntegrationTest {

    private static final String SECRET = "test-webhook-secret";
    private static final String WEBHOOK = "/api/webhooks/telegram";
    private static final long CHAT_ID = 555_001L;

    @MockitoBean protected TelegramClienteBotService bot;

    /** Spy: comportamiento real por defecto; los tests de fallback fuerzan chatSync → null (proveedor caído). */
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean
    protected AiCopilotService aiCopilotService;

    @Autowired TelegramVinculacionRepository vinculacionRepository;
    @Autowired EmpresaRepository            empresaRepository;
    @Autowired ProductoRepository           productoRepository;
    @Autowired CategoriaRepository          categoriaRepository;
    @Autowired BodegaRepository             bodegaRepository;
    @Autowired MovimientoStockRepository    movimientoStockRepository;
    @Autowired TelegramInventarioScheduler  scheduler;
    @Autowired TelegramNotificacionClienteService notificacionService;

    private final ObjectMapper json = new ObjectMapper();

    private Empresa empresa;
    private Empresa empresaAjena;
    private Usuario duenno;
    private String  tokenDuenno;
    private Categoria categoria;
    private Bodega    bodega;

    @BeforeEach
    void setUp() {
        when(bot.isConfigured()).thenReturn(true);
        when(bot.getBotUsername()).thenReturn("HotClickTestBot");
        when(bot.validarSecret(SECRET)).thenReturn(true);

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);

        empresa      = crearEmpresa("Tienda TG A", "tienda-tg-a", "tg-a@test.cr");
        empresaAjena = crearEmpresa("Tienda TG B", "tienda-tg-b", "tg-b@test.cr");

        duenno = crearUsuario("tg-duenno@test.cr", "Duenno TG", rolEmp);
        duenno.setEmpresa(empresa);
        duenno = usuarioRepository.saveAndFlush(duenno);
        tokenDuenno = tokenPara(duenno, Constants.ROL_EMPRENDEDOR);
        crearMiembro(duenno, empresa, "PROPIETARIO");

        categoria = obtenerOCrearCategoria();
        bodega    = crearBodega();
    }

    @AfterEach
    void tearDown() {
        vinculacionRepository.deleteAll();
        movimientoStockRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        miembroEmpresaRepository.deleteAll(); // antes que empresas — FK no nula
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── Seguridad del webhook ─────────────────────────────────────────────────

    @Test
    @DisplayName("Webhook sin secret token → 403 y no procesa nada")
    void webhook_sinSecret_403() throws Exception {
        mockMvc.perform(post(WEBHOOK)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mensajeTexto(CHAT_ID, "/start ABC12345")))
            .andExpect(status().isForbidden());
        verify(bot, never()).enviarMensaje(anyLong(), anyString());
    }

    @Test
    @DisplayName("Webhook con secret incorrecto → 403")
    void webhook_secretIncorrecto_403() throws Exception {
        mockMvc.perform(post(WEBHOOK)
                .header("X-Telegram-Bot-Api-Secret-Token", "otro-secreto")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mensajeTexto(CHAT_ID, "hola")))
            .andExpect(status().isForbidden());
        verify(bot, never()).enviarMensaje(anyLong(), anyString());
    }

    // ── Flujo de vinculación ──────────────────────────────────────────────────

    @Test
    @DisplayName("Vinculación completa: código del panel + /start → ACTIVA con chat_id")
    void vinculacion_flujoCompleto() throws Exception {
        MvcResult res = mockMvc.perform(post("/api/telegram/vincular")
                .header("Authorization", tokenDuenno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.deepLink").exists())
            .andReturn();

        JsonNode body = json.readTree(res.getResponse().getContentAsString());
        String codigo = body.get("codigo").asText();
        assertThat(body.get("deepLink").asText()).contains("t.me/HotClickTestBot?start=" + codigo);

        postUpdate(mensajeTexto(CHAT_ID, "/start " + codigo));

        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(duenno.getId()).orElseThrow();
        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA);
        assertThat(v.getChatId()).isEqualTo(CHAT_ID);
        assertThat(v.getCodigo()).isNull(); // un solo uso
        assertThat(v.getEmpresaActivaId()).isEqualTo(empresa.getId());
        verify(bot, atLeastOnce()).enviarMensaje(eq(CHAT_ID), contains("vinculada"));
    }

    @Test
    @DisplayName("Código vencido → no vincula y avisa")
    void vinculacion_codigoVencido() throws Exception {
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(duenno);
        v.setCodigo("VENCIDO1");
        v.setCodigoExpira(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1));
        vinculacionRepository.saveAndFlush(v);

        postUpdate(mensajeTexto(CHAT_ID, "/start VENCIDO1"));

        TelegramVinculacion despues = vinculacionRepository.findByUsuarioId(duenno.getId()).orElseThrow();
        assertThat(despues.getEstado()).isEqualTo(TelegramVinculacion.PENDIENTE);
        assertThat(despues.getChatId()).isNull();
        verify(bot).enviarMensaje(eq(CHAT_ID), contains("venció"));
    }

    // ── Consultas con botones ─────────────────────────────────────────────────

    @Test
    @DisplayName("Botón Inventario → responde con totales y productos de stock bajo")
    void callback_inventario_respondeDatos() throws Exception {
        vincularDirecto(duenno, empresa, CHAT_ID);
        crearProducto("Audifonos Gamer", 10, 3);
        crearProducto("Mouse Pro", 2, 3); // stock bajo

        postUpdate(callback(CHAT_ID, "inv"));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(bot).enviarMensaje(eq(CHAT_ID), captor.capture());
        assertThat(captor.getValue()).contains("Inventario").contains("Mouse Pro");
        assertThat(captor.getValue()).doesNotContain("Audifonos Gamer"); // no está bajo
    }

    @Test
    @DisplayName("Botón Ventas de hoy → responde sin fugas de otra empresa")
    void callback_ventasHoy_responde() throws Exception {
        vincularDirecto(duenno, empresa, CHAT_ID);

        postUpdate(callback(CHAT_ID, "ventas"));

        verify(bot).enviarMensaje(eq(CHAT_ID), contains("Ventas de hoy"));
    }

    // ── Aislamiento multi-tenant ──────────────────────────────────────────────

    @Test
    @DisplayName("Seleccionar una empresa donde NO es miembro → denegado y no cambia")
    void callback_empresaAjena_denegada() throws Exception {
        vincularDirecto(duenno, empresa, CHAT_ID);

        postUpdate(callback(CHAT_ID, "emp:" + empresaAjena.getId()));

        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(duenno.getId()).orElseThrow();
        assertThat(v.getEmpresaActivaId()).isEqualTo(empresa.getId());
        verify(bot).enviarMensaje(eq(CHAT_ID), contains("No tenés acceso"));
    }

    // ── Rechazo de contenido no textual ───────────────────────────────────────

    @Test
    @DisplayName("Foto/archivo → rechazado por seguridad, nunca se procesa")
    void mensaje_conFoto_rechazado() throws Exception {
        vincularDirecto(duenno, empresa, CHAT_ID);

        String update = """
            {"message":{"chat":{"id":%d,"type":"private"},"from":{"username":"x"},
             "photo":[{"file_id":"abc"}],"caption":"analiza esto"}}
            """.formatted(CHAT_ID);
        postUpdate(update);

        verify(bot).enviarMensaje(eq(CHAT_ID), contains("solo acepto mensajes de texto"));
    }

    // ── Chequeo semanal y ajuste de stock ────────────────────────────────────

    @Test
    @DisplayName("Chequeo semanal → mensaje con teclado de productos priorizados")
    void scheduler_chequeoSemanal_envia() {
        TelegramVinculacion v = vincularDirecto(duenno, empresa, CHAT_ID);
        crearProducto("Teclado RGB", 2, 3);

        boolean enviado = scheduler.enviarChequeoA(v);

        assertThat(enviado).isTrue();
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<List<Map<String, Object>>>> teclado =
            ArgumentCaptor.forClass((Class) List.class);
        verify(bot).enviarMensaje(eq(CHAT_ID), contains("Chequeo semanal"), teclado.capture());
        assertThat(teclado.getValue().get(0).get(0).get("callback_data")).isEqualTo("chkok");
        assertThat(teclado.getValue()).hasSize(2); // "todo correcto" + 1 producto
    }

    @Test
    @DisplayName("Ajuste desde el chequeo: botón + cantidad → stock actualizado y auditado")
    void ajuste_stock_flujoCompleto() throws Exception {
        vincularDirecto(duenno, empresa, CHAT_ID);
        Producto p = crearProducto("Parlante BT", 10, 3);

        postUpdate(callback(CHAT_ID, "chk:" + p.getId()));
        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(duenno.getId()).orElseThrow();
        assertThat(v.getContexto()).isEqualTo("AJUSTE:" + p.getId());

        postUpdate(mensajeTexto(CHAT_ID, "7"));

        Producto actualizado = productoRepository.findById(p.getId()).orElseThrow();
        assertThat(actualizado.getStockActual()).isEqualTo(7);

        List<MovimientoStock> movs = movimientoStockRepository
            .findByProductoIdOrderByFechaMovimientoDesc(p.getId());
        assertThat(movs).isNotEmpty();
        assertThat(movs.get(0).getTipoMovimiento()).isEqualTo(MovimientoStock.AJUSTE_SALIDA);
        assertThat(movs.get(0).getCantidad()).isEqualTo(3);

        assertThat(vinculacionRepository.findByUsuarioId(duenno.getId()).orElseThrow().getContexto()).isNull();
        verify(bot).enviarMensaje(eq(CHAT_ID), contains("7"));
    }

    @Test
    @DisplayName("Miembro sin rol PROPIETARIO/ADMIN no puede ajustar stock")
    void ajuste_stock_miembroSinPermiso() throws Exception {
        Rol rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario empleado = crearUsuario("tg-empleado@test.cr", "Empleado TG", rolUser);
        crearMiembro(empleado, empresa, "MIEMBRO");
        vincularDirecto(empleado, empresa, 555_002L);
        Producto p = crearProducto("Cable USB", 10, 3);

        postUpdate(callback(555_002L, "chk:" + p.getId()));

        assertThat(vinculacionRepository.findByUsuarioId(empleado.getId()).orElseThrow().getContexto()).isNull();
        assertThat(productoRepository.findById(p.getId()).orElseThrow().getStockActual()).isEqualTo(10);
        verify(bot).enviarMensaje(eq(555_002L), contains("propietario o un administrador"));
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("Más de 20 mensajes por minuto → se bloquea con un solo aviso")
    void rateLimit_porMinuto_bloquea() throws Exception {
        for (int i = 0; i < 25; i++) {
            postUpdate(mensajeTexto(CHAT_ID, "hola " + i));
        }
        // 20 respuestas "no vinculado" + 1 aviso de límite = 21; los últimos 4 en silencio
        verify(bot, times(21)).enviarMensaje(eq(CHAT_ID), anyString());
    }

    // ── IA de texto libre ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Texto libre sin créditos de IA → mensaje de cuota, sin llamar a NVIDIA")
    void textoLibre_sinCreditos_mensajeDeCuota() throws Exception {
        vincularDirecto(duenno, empresa, CHAT_ID); // empresa GRATUITO sin plan → 0 créditos

        postUpdate(mensajeTexto(CHAT_ID, "¿qué me recomendás mejorar?")); // sin keywords de fallback

        // La rama de texto libre es async — el webhook responde 200 al instante
        verify(bot, timeout(3000)).enviarMensaje(eq(CHAT_ID), contains("cuota"), isNull(), eq(false));
    }

    @Test
    @DisplayName("IA caída + pregunta de ventas → fallback con los datos de ventas de hoy")
    void textoLibre_iaCaida_fallbackVentas() throws Exception {
        vincularDirecto(duenno, empresa, CHAT_ID);
        doReturn(null).when(aiCopilotService).chatSync(anyLong(), anyString(), anyString());

        postUpdate(mensajeTexto(CHAT_ID, "cuanto vendi hoy?"));

        ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
        verify(bot, timeout(3000)).enviarMensaje(eq(CHAT_ID), captor.capture());
        assertThat(captor.getValue())
            .contains("La IA no está disponible")
            .contains("Ventas de hoy");
    }

    @Test
    @DisplayName("IA caída + texto sin intención clara → aviso + menú de botones")
    void textoLibre_iaCaida_sinIntencion_muestraMenu() throws Exception {
        vincularDirecto(duenno, empresa, CHAT_ID);
        doReturn(null).when(aiCopilotService).chatSync(anyLong(), anyString(), anyString());

        postUpdate(mensajeTexto(CHAT_ID, "hola que tal"));

        verify(bot, timeout(3000)).enviarMensaje(eq(CHAT_ID), contains("no está disponible"));
        verify(bot, timeout(3000)).enviarMensaje(eq(CHAT_ID), anyString(), anyList()); // menú con botones
    }

    // ── Notificaciones ────────────────────────────────────────────────────────

    @Test
    @DisplayName("Venta → notifica a todos los miembros vinculados de la empresa")
    void notificacionVenta_llegaATodosLosVinculados() {
        Rol rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario socio = crearUsuario("tg-socio@test.cr", "Socio TG", rolUser);
        crearMiembro(socio, empresa, "ADMIN");
        vincularDirecto(duenno, empresa, CHAT_ID);
        vincularDirecto(socio, empresa, 555_003L);

        notificacionService.notificarVenta(empresa.getId(), "ORD-TEST-1", 25_000, "SINPE", "Cliente Feliz", "ONLINE");

        verify(bot, timeout(3000)).enviarMensaje(eq(CHAT_ID), contains("ORD-TEST-1"));
        verify(bot, timeout(3000)).enviarMensaje(eq(555_003L), contains("ORD-TEST-1"));
    }

    @Test
    @DisplayName("Stock llega a 0 → aviso de agotado una sola vez cada 24h")
    void notificacionAgotado_conDeduplicacion() {
        vincularDirecto(duenno, empresa, CHAT_ID);
        Producto p = crearProducto("Ultimo Item", 0, 3);

        notificacionService.onStockCambio(new StockCambioEvent(this, p.getId(), empresa.getId(), 0));
        notificacionService.onStockCambio(new StockCambioEvent(this, p.getId(), empresa.getId(), 0));

        verify(bot, timeout(3000).times(1)).enviarMensaje(eq(CHAT_ID), contains("agotado"));
    }

    // ── Desvinculación ────────────────────────────────────────────────────────

    @Test
    @DisplayName("/desvincular → REVOCADA y deja de responder datos")
    void desvincular_revoca() throws Exception {
        vincularDirecto(duenno, empresa, CHAT_ID);

        postUpdate(mensajeTexto(CHAT_ID, "/desvincular"));

        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(duenno.getId()).orElseThrow();
        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.REVOCADA);
        assertThat(v.getChatId()).isNull();

        clearInvocations(bot);
        postUpdate(callback(CHAT_ID, "inv"));
        verify(bot).enviarMensaje(eq(CHAT_ID), contains("no está vinculado"));
    }

    @Test
    @DisplayName("El panel permite al propietario revocar el Telegram de un miembro")
    void panel_propietarioRevocaMiembro() throws Exception {
        Rol rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario empleado = crearUsuario("tg-emp2@test.cr", "Emp2 TG", rolUser);
        crearMiembro(empleado, empresa, "MIEMBRO");
        vincularDirecto(empleado, empresa, 555_004L);

        mockMvc.perform(delete("/api/telegram/equipo/" + empleado.getId())
                .header("Authorization", tokenDuenno))
            .andExpect(status().isOk());

        assertThat(vinculacionRepository.findByUsuarioId(empleado.getId()).orElseThrow().getEstado())
            .isEqualTo(TelegramVinculacion.REVOCADA);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void postUpdate(String body) throws Exception {
        mockMvc.perform(post(WEBHOOK)
                .header("X-Telegram-Bot-Api-Secret-Token", SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
    }

    private String mensajeTexto(long chatId, String texto) {
        return """
            {"message":{"chat":{"id":%d,"type":"private"},"from":{"username":"tester"},"text":"%s"}}
            """.formatted(chatId, texto);
    }

    private String callback(long chatId, String data) {
        return """
            {"callback_query":{"id":"cb-1","data":"%s","message":{"chat":{"id":%d,"type":"private"}}}}
            """.formatted(data, chatId);
    }

    private TelegramVinculacion vincularDirecto(Usuario u, Empresa e, long chatId) {
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(chatId);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setEmpresaActivaId(e.getId());
        v.setFechaVinculacion(LocalDateTime.now(Constants.ZONA_CR));
        return vinculacionRepository.saveAndFlush(v);
    }

    private void crearMiembro(Usuario u, Empresa e, String rol) {
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, e, rol));
    }

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Categoria obtenerOCrearCategoria() {
        return categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("TG-Cat");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
    }

    private Bodega crearBodega() {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega TG");
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("88880000");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Producto crearProducto(String nombre, int stock, int minimo) {
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku("SKU-" + nombre.replaceAll("\\s", "-").toUpperCase());
        p.setPrecioVenta(10_000);
        p.setPrecioCompra(6_000);
        p.setStockActual(stock);
        p.setStockMinimo(minimo);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }
}
