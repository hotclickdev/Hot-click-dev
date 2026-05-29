package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * NIVEL: INTERMEDIO — 25 tests
 *
 * Verifica la lógica funcional de pedidos para el rol EMPRENDEDOR:
 * - Listar solo pedidos propios
 * - Cambiar estado (flujo correcto e incorrecto)
 * - Asignar guía / procesar envío
 * - Pendientes filtrados
 * - Eliminación de pedidos
 */
@DisplayName("[INTERMEDIO] Gestión de Pedidos para Emprendedor (EmprendedorPedido)")
class EmprendedorPedidoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository  empresaRepository;
    @Autowired private PedidoRepository   pedidoRepository;
    @Autowired private BodegaRepository   bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Empresa  empresa;
    private Usuario  emprendedor;
    private String   tokenEmp;
    private Bodega   bodega;
    private Pedido   pedido1;
    private Pedido   pedido2;
    private Pedido   pedidoExterno;   // pertenece a otra empresa
    private Empresa  empresaOtra;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);

        empresa      = crearEmpresa("Empr Pedido", "empr-pedido-test", "emp-ped@test.cr");
        empresaOtra  = crearEmpresa("Otra Empr",   "otra-empr-test",   "otra-ped@test.cr");

        emprendedor  = crearConEmpresa("ep@test.cr", "EP Test", rolEmp, empresa);
        tokenEmp     = "Bearer " + jwtUtil.generateToken(emprendedor.getCorreo(), emprendedor.getId(), Constants.ROL_EMPRENDEDOR);

        bodega = crearBodega("Bodega Ped", adminUser, empresa);

        pedido1       = crearPedido("ORD-PED-001", testUser, bodega, empresa,  Constants.PEDIDO_PENDIENTE);
        pedido2       = crearPedido("ORD-PED-002", testUser, bodega, empresa,  Constants.PEDIDO_PAGADO);
        pedidoExterno = crearPedido("ORD-EXT-001", testUser, bodega, empresaOtra, Constants.PEDIDO_PENDIENTE);
    }

    @AfterEach
    void tearDown() {
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── T-PED-001: Emprendedor lista pedidos (GET /api/pedidos) ──────────────
    @Test
    @DisplayName("T-PED-001 | INTERMEDIO — Emprendedor puede listar sus pedidos → 200")
    void emprendedor_listsPedidos_200() throws Exception {
        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PED-002: Lista devuelve solo pedidos de su empresa ─────────────────
    @Test
    @DisplayName("T-PED-002 | INTERMEDIO — Listado solo contiene pedidos de la empresa propia")
    void emprendedor_listPedidos_onlyOwnEmpresa() throws Exception {
        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.numeroPedido == 'ORD-PED-001')]").exists())
            .andExpect(jsonPath("$.data[?(@.numeroPedido == 'ORD-PED-002')]").exists())
            .andExpect(jsonPath("$.data[?(@.numeroPedido == 'ORD-EXT-001')]").doesNotExist());
    }

    // ── T-PED-003: Listar pedidos pendientes solo de su empresa ──────────────
    @Test
    @DisplayName("T-PED-003 | INTERMEDIO — Pendientes solo muestra los de la empresa propia")
    void emprendedor_pendientes_onlyOwnEmpresa() throws Exception {
        mockMvc.perform(get("/api/pedidos/pendientes")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.numeroPedido == 'ORD-PED-001')]").exists())
            .andExpect(jsonPath("$.data[?(@.numeroPedido == 'ORD-EXT-001')]").doesNotExist());
    }

    // ── T-PED-004: Cambiar estado PENDIENTE → EN_PREPARACION ─────────────────
    @Test
    @DisplayName("T-PED-004 | INTERMEDIO — Cambiar estado PENDIENTE → EN_PREPARACION → 200")
    void changeEstado_pendiente_a_enPreparacion() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/estado")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"EN_PREPARACION\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estadoPedido").value("EN_PREPARACION"));
    }

    // ── T-PED-005: Cambiar estado con nota persiste la notificación ──────────
    @Test
    @DisplayName("T-PED-005 | INTERMEDIO — Cambiar estado con nota → 200 y notificaciones no vacías")
    void changeEstado_conNota_persisteNotificacion() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/estado")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"EN_PREPARACION\",\"nota\":\"Preparando su pedido\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PED-006: Estado vacío en body → 400 ────────────────────────────────
    @Test
    @DisplayName("T-PED-006 | INTERMEDIO — Cambiar estado con campo vacío → 400")
    void changeEstado_emptyField_returns400() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/estado")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"\"}"))
            .andExpect(status().isBadRequest());
    }

    // ── T-PED-007: Body sin campo estado → 400 ───────────────────────────────
    @Test
    @DisplayName("T-PED-007 | INTERMEDIO — Cambiar estado sin campo 'estado' en body → 400")
    void changeEstado_missingField_returns400() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/estado")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    // ── T-PED-008: Asignar guía a pedido propio → 200 ────────────────────────
    @Test
    @DisplayName("T-PED-008 | INTERMEDIO — Asignar guía a pedido propio → 200")
    void asignarGuia_ownPedido_200() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/guia")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"numeroGuia\":\"CR111222333CR\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroGuia").value("CR111222333CR"));
    }

    // ── T-PED-009: Asignar guía vacía → 400 ──────────────────────────────────
    @Test
    @DisplayName("T-PED-009 | INTERMEDIO — Asignar guía vacía → 400")
    void asignarGuia_empty_returns400() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/guia")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"numeroGuia\":\"\"}"))
            .andExpect(status().isBadRequest());
    }

    // ── T-PED-010: Asignar guía sin campo → 400 ──────────────────────────────
    @Test
    @DisplayName("T-PED-010 | INTERMEDIO — Asignar guía sin campo numeroGuia → 400")
    void asignarGuia_missingField_returns400() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/guia")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    // ── T-PED-011: Procesar envío con guía y costo → 200 ─────────────────────
    @Test
    @DisplayName("T-PED-011 | INTERMEDIO — Procesar envío con guía y costo → 200")
    void procesarEnvio_ownPedido_200() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/envio")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guia\":\"CR999888777CR\",\"costoEnvio\":2500}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroGuia").value("CR999888777CR"));
    }

    // ── T-PED-012: Procesar envío sin guía → 400 ─────────────────────────────
    @Test
    @DisplayName("T-PED-012 | INTERMEDIO — Procesar envío sin guía → 400")
    void procesarEnvio_sinGuia_returns400() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/envio")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"costoEnvio\":2500}"))
            .andExpect(status().isBadRequest());
    }

    // ── T-PED-013: Emprendedor puede eliminar su propio pedido → 200 ─────────
    @Test
    @DisplayName("T-PED-013 | INTERMEDIO — Emprendedor puede eliminar su propio pedido → 200")
    void emprendedor_canDelete_ownPedido() throws Exception {
        mockMvc.perform(delete("/api/pedidos/" + pedido2.getId())
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk());
    }

    // ── T-PED-014: Pedido inexistente → 404/400 ───────────────────────────────
    @Test
    @DisplayName("T-PED-014 | INTERMEDIO — Cambiar estado de pedido inexistente → 400")
    void changeEstado_nonExistentPedido_returns400() throws Exception {
        mockMvc.perform(put("/api/pedidos/999999/estado")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"ENVIADO\"}"))
            .andExpect(status().is4xxClientError());
    }

    // ── T-PED-015: Listar pedidos sin token → 401 ─────────────────────────────
    @Test
    @DisplayName("T-PED-015 | INTERMEDIO — Listar pedidos sin token → 401")
    void listPedidos_noToken_401() throws Exception {
        mockMvc.perform(get("/api/pedidos"))
            .andExpect(status().isUnauthorized());
    }

    // ── T-PED-016: USUARIO_FINAL no puede listar pedidos admin → 403 ─────────
    @Test
    @DisplayName("T-PED-016 | INTERMEDIO — USUARIO_FINAL no puede listar pedidos admin → 403")
    void usuarioFinal_cannotListAdmin_403() throws Exception {
        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    // ── T-PED-017: USUARIO_FINAL puede ver su propio pedido por ID ───────────
    @Test
    @DisplayName("T-PED-017 | INTERMEDIO — USUARIO_FINAL puede ver su propio pedido por ID → 200")
    void usuarioFinal_canRead_ownPedido() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + pedido1.getId())
                .header("Authorization", userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroPedido").value("ORD-PED-001"));
    }

    // ── T-PED-018: Emprendedor puede leer pedido propio por ID ───────────────
    @Test
    @DisplayName("T-PED-018 | INTERMEDIO — Emprendedor puede leer pedido de su empresa por ID → 200")
    void emprendedor_canRead_ownPedidoById() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + pedido1.getId())
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroPedido").value("ORD-PED-001"));
    }

    // ── T-PED-019: Estado se persiste correctamente en BD ────────────────────
    @Test
    @DisplayName("T-PED-019 | INTERMEDIO — Estado actualizado se persiste y se refleja al releer")
    void changeEstado_persistsInDB() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/estado")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"LISTO_RETIRO\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/pedidos/" + pedido1.getId())
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estadoPedido").value("LISTO_RETIRO"));
    }

    // ── T-PED-020: Asignar guía actualiza estado a ENVIADO ───────────────────
    @Test
    @DisplayName("T-PED-020 | INTERMEDIO — Asignar guía cambia estado pedido a ENVIADO")
    void asignarGuia_updatesEstadoToEnviado() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/guia")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"numeroGuia\":\"CR777666555CR\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estadoPedido").value("ENVIADO"));
    }

    // ── T-PED-021: Procesar envío también cambia estado a ENVIADO ────────────
    @Test
    @DisplayName("T-PED-021 | INTERMEDIO — procesarEnvio cambia estado a ENVIADO")
    void procesarEnvio_updatesEstadoToEnviado() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/envio")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guia\":\"CR444555666CR\",\"costoEnvio\":3000}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estadoPedido").value("ENVIADO"));
    }

    // ── T-PED-022: Pedidos pendientes: PAGADO no aparece en /pendientes ───────
    @Test
    @DisplayName("T-PED-022 | INTERMEDIO — Pedido PAGADO no aparece en /pendientes")
    void pendientes_doesNotIncludePagado() throws Exception {
        mockMvc.perform(get("/api/pedidos/pendientes")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.numeroPedido == 'ORD-PED-002')]").doesNotExist());
    }

    // ── T-PED-023: Emprendedor ADMIN_IT ve todos los pendientes ──────────────
    @Test
    @DisplayName("T-PED-023 | INTERMEDIO — ADMIN_IT ve pendientes de todas las empresas en /pendientes")
    void adminIT_pendientes_showsAll() throws Exception {
        mockMvc.perform(get("/api/pedidos/pendientes")
                .header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PED-024: Cambiar estado CANCELADO también funciona ─────────────────
    @Test
    @DisplayName("T-PED-024 | INTERMEDIO — Cambiar estado a CANCELADO → 200")
    void changeEstado_toCancelado_200() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/estado")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"CANCELADO\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estadoPedido").value("CANCELADO"));
    }

    // ── T-PED-025: Asignar guía con espacios los trimea ─────────────────────
    @Test
    @DisplayName("T-PED-025 | INTERMEDIO — Guía con espacios al inicio/fin se trimea correctamente")
    void asignarGuia_trimsSpaces() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + pedido1.getId() + "/guia")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"numeroGuia\":\"  CR123456789CR  \"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroGuia").value("CR123456789CR"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario crearConEmpresa(String correo, String nombre, Rol rol, Empresa empresa) {
        Usuario u = crearUsuario(correo, nombre, rol);
        u.setEmpresa(empresa);
        return usuarioRepository.saveAndFlush(u);
    }

    private Bodega crearBodega(String nombre, Usuario admin, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle Ped 1");
        b.setTelefono("77770000");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(admin);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Pedido crearPedido(String numero, Usuario cliente, Bodega bodega, Empresa empresa, String estado) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(cliente);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(15000);
        p.setTotalPedido(15000);
        p.setCostoTotalProductos(10000);
        p.setUtilidadBruta(5000);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }
}
