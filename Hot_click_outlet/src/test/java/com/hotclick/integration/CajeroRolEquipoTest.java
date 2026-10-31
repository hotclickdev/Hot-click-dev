package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@DisplayName("[MEDIO] CAJERO como rol de equipo asignable: solo PROPIETARIO/ADMIN lo asignan y solo opera el POS")
class CajeroRolEquipoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private TicketSoporteRepository ticketSoporteRepository;
    @Autowired private ClienteEmpresaRepository clienteEmpresaRepository;

    private Empresa empA, empB;
    private Usuario editorA, miembroB, adminA2, duenoA, adminA, lectorA;
    private String tDuenoA, tAdminA, tEditorA, tLectorA, tCajeroA, tCajeroB;

    @BeforeEach
    void setUp() {
        empA = empresa("cre-a");
        empB = empresa("cre-b");
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        duenoA = miembro("cre-dueno@test.cr", "PROPIETARIO", rolEmp, empA);
        tDuenoA = token(duenoA, empA);
        adminA = miembro("cre-admin@test.cr", "ADMIN", rolEmp, empA);
        tAdminA = token(adminA, empA);
        editorA = miembro("cre-editor@test.cr", "EDITOR", rolEmp, empA);
        tEditorA = token(editorA, empA);
        lectorA = miembro("cre-lector@test.cr", "LECTOR", rolEmp, empA);
        tLectorA = token(lectorA, empA);
        tCajeroA = token(miembro("cre-cajero@test.cr", "CAJERO", rolEmp, empA), empA);
        adminA2 = miembro("cre-admin2@test.cr", "ADMIN", rolEmp, empA);
        miembro("cre-dueno-b@test.cr", "PROPIETARIO", rolEmp, empB);
        miembroB = miembro("cre-editor-b@test.cr", "EDITOR", rolEmp, empB);
        tCajeroB = token(miembro("cre-cajero-b@test.cr", "CAJERO", rolEmp, empB), empB);
    }

    @AfterEach
    void tearDown() {
        ticketSoporteRepository.deleteAll();
        clienteEmpresaRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); u.setEmpresaRegistro(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario miembro(String correo, String rolEquipo, Rol rol, Empresa emp) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return u;
    }

    private String token(Usuario u, Empresa emp) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private int st(MockHttpServletRequestBuilder b, String token) throws Exception {
        return mockMvc.perform(b.header("Authorization", token)).andReturn().getResponse().getStatus();
    }

    private static MockHttpServletRequestBuilder aCajero(Long id) {
        return put("/api/empresa/equipo/" + id + "/rol").contentType(MediaType.APPLICATION_JSON)
            .content("{\"rolEnEmpresa\":\"CAJERO\"}");
    }

    private static MockHttpServletRequestBuilder invitarCajero(String correo) {
        return post("/api/empresa/equipo").contentType(MediaType.APPLICATION_JSON).content(
            "{\"nombre\":\"Caja\",\"correo\":\"" + correo + "\",\"password\":\"Temporal123!\",\"rolEnEmpresa\":\"CAJERO\"}");
    }

    private String rol(Usuario u, Empresa e) {
        return miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), e.getId()).orElseThrow().getRolEnEmpresa();
    }

    @Test
    void propietarioYAdminAsignanCajero() throws Exception {
        assertThat(st(aCajero(editorA.getId()), tDuenoA)).isEqualTo(200);
        assertThat(rol(editorA, empA)).isEqualTo("CAJERO");
        assertThat(st(invitarCajero("cre-nuevo1@test.cr"), tDuenoA)).isNotEqualTo(403);
        assertThat(st(invitarCajero("cre-nuevo2@test.cr"), tAdminA)).isNotEqualTo(403);
    }

    @Test
    void editorLectorYCajeroReciben403AlAsignar() throws Exception {
        for (String t : List.of(tEditorA, tLectorA, tCajeroA)) {
            assertThat(st(aCajero(editorA.getId()), t)).isEqualTo(403);
            assertThat(st(invitarCajero("cre-x@test.cr"), t)).isEqualTo(403);
        }
        assertThat(rol(editorA, empA)).isEqualTo("EDITOR");
    }

    @Test
    void lowAdminDeEquipoNoConvierteMiembrosExistentesNiSeAutoasigna() throws Exception {
        assertThat(st(aCajero(editorA.getId()), tAdminA)).isEqualTo(403);
        assertThat(st(aCajero(lectorA.getId()), tAdminA)).isEqualTo(403);
        assertThat(st(aCajero(adminA.getId()), tAdminA)).isEqualTo(403);
        assertThat(rol(editorA, empA)).isEqualTo("EDITOR");
        assertThat(rol(lectorA, empA)).isEqualTo("LECTOR");
        assertThat(rol(adminA, empA)).isEqualTo("ADMIN");
        // el propietario tampoco se pasa a sí mismo a CAJERO
        assertThat(st(aCajero(duenoA.getId()), tDuenoA)).isEqualTo(403);
        assertThat(rol(duenoA, empA)).isEqualTo("PROPIETARIO");
        // el propietario sí convierte a un LECTOR existente
        assertThat(st(aCajero(lectorA.getId()), tDuenoA)).isEqualTo(200);
    }

    @Test
    void lowCajeroLeeBusquedaDeClientesPeroNoCreaNiListaClientes() throws Exception {
        assertThat(st(get("/api/crm/clientes/buscar").param("q", "ana"), tCajeroA)).isNotEqualTo(403);
        assertThat(st(post("/api/crm/clientes").contentType(MediaType.APPLICATION_JSON).content("{}"), tCajeroA))
            .isNotEqualTo(403); // POST exacto permitido por decisión del Mentor; {} vacío falla validación
        assertThat(st(get("/api/crm/clientes/1"), tCajeroA)).isEqualTo(403);
    }

    @Test
    void adminDeEquipoNoDegradaAOtroAdmin() throws Exception {
        assertThat(st(aCajero(adminA2.getId()), tAdminA)).isEqualTo(403);
        assertThat(rol(adminA2, empA)).isEqualTo("ADMIN");
    }

    @Test
    void cajeroRecibe403FueraDelPos() throws Exception {
        for (String ruta : List.of("/api/pedidos", "/api/crm/clientes", "/api/empresa/equipo", "/api/gastos",
                "/api/cupones", "/api/facturas", "/api/empresa/perfil")) {
            assertThat(st(get(ruta), tCajeroA)).as(ruta).isEqualTo(403);
        }
        assertThat(st(post("/api/bodegas").contentType(MediaType.APPLICATION_JSON).content("{}"), tCajeroA)).isEqualTo(403);
        assertThat(st(get("/api/pos/caja/activo"), tCajeroA)).isNotEqualTo(403);
        assertThat(st(get("/api/pos/historial"), tCajeroA)).isNotEqualTo(403);
        assertThat(st(get("/api/productos/pos/categorias"), tCajeroA)).isNotEqualTo(403);
        assertThat(st(get("/api/pedidos"), tEditorA)).isNotEqualTo(403);
    }

    @Test
    void crossTenant() throws Exception {
        // ADMIN de A no toca a un miembro de B.
        assertThat(st(aCajero(miembroB.getId()), tAdminA)).isIn(403, 404);
        assertThat(rol(miembroB, empB)).isEqualTo("EDITOR");
        // CAJERO de A pidiendo datos de B fuera del POS: 403.
        assertThat(st(get("/api/pedidos").param("empresaId", String.valueOf(empB.getId())), tCajeroA)).isEqualTo(403);
    }

    private com.jayway.jsonpath.DocumentContext json(MockHttpServletRequestBuilder b, String token, int[] status)
            throws Exception {
        var r = mockMvc.perform(b.header("Authorization", token)).andReturn().getResponse();
        status[0] = r.getStatus();
        return com.jayway.jsonpath.JsonPath.parse(r.getContentAsString());
    }

    private static MockHttpServletRequestBuilder postJson(String ruta, String body) {
        return post(ruta).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    @Test
    void cajeroCreaClienteYTicketEnSuNegocioAunqueMandeOtraEmpresa() throws Exception {
        int[] st = new int[1];
        // en su negocio
        Long cli = Long.valueOf(json(postJson("/api/crm/clientes", "{\"nombre\":\"Ana Caja\",\"telefono\":\"88880001\"}"),
            tCajeroA, st).read("$.data.id").toString());
        assertThat(st[0]).isBetween(200, 201);
        assertThat(clienteEmpresaRepository.findByEmpresaIdAndUsuarioId(empA.getId(), cli)).isPresent();
        Long tic = Long.valueOf(json(postJson("/api/soporte/tickets", "{\"titulo\":\"Caja\",\"descripcion\":\"No imprime\"}"),
            tCajeroA, st).read("$.data.id").toString());
        assertThat(st[0]).isBetween(200, 201);
        assertThat(ticketSoporteRepository.findById(tic).orElseThrow().getEmpresa().getId()).isEqualTo(empA.getId());

        // cajero de B mandando la empresa de A en el body: queda en B (la empresa sale del token)
        String otra = "\"empresaId\":\"" + empA.getId() + "\",\"rol\":\"ADMIN\",\"rolEnEmpresa\":\"PROPIETARIO\",\"estado\":\"0\"";
        Long cliB = Long.valueOf(json(postJson("/api/crm/clientes", "{\"nombre\":\"Beto\",\"telefono\":\"88880002\"," + otra + "}"),
            tCajeroB, st).read("$.data.id").toString());
        assertThat(st[0]).isBetween(200, 201);
        assertThat(clienteEmpresaRepository.findByEmpresaIdAndUsuarioId(empB.getId(), cliB)).isPresent();
        assertThat(clienteEmpresaRepository.findByEmpresaIdAndUsuarioId(empA.getId(), cliB)).isEmpty();
        // rol/rolEnEmpresa/estado del body se ignoran: no queda como miembro de equipo de ningún negocio
        assertThat(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(cliB, empB.getId())).isEmpty();
        assertThat(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(cliB, empA.getId())).isEmpty();
        Long ticB = Long.valueOf(json(postJson("/api/soporte/tickets", "{\"titulo\":\"B\",\"descripcion\":\"x\"," + otra + "}"),
            tCajeroB, st).read("$.data.id").toString());
        assertThat(st[0]).isBetween(200, 201);
        assertThat(ticketSoporteRepository.findById(ticB).orElseThrow().getEmpresa().getId()).isEqualTo(empB.getId());
        // ?empresaId de A tampoco cambia el negocio
        assertThat(st(postJson("/api/soporte/tickets", "{\"titulo\":\"B2\",\"descripcion\":\"y\"}")
            .param("empresaId", String.valueOf(empA.getId())), tCajeroB)).isBetween(200, 201);
        assertThat(ticketSoporteRepository.findByEmpresaIdOrderByFechaCreacionDesc(empA.getId())).hasSize(1);
    }

    @Test
    void cajeroNoEditaNiBorraClientesNiVeTickets() throws Exception {
        int[] st = new int[1];
        String id = json(postJson("/api/crm/clientes", "{\"nombre\":\"Cora\",\"telefono\":\"88880003\"}"),
            tDuenoA, st).read("$.data.id").toString();
        assertThat(st(put("/api/crm/clientes/" + id).contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"X\"}"),
            tCajeroA)).isEqualTo(403);
        assertThat(st(patch("/api/crm/clientes/" + id).contentType(MediaType.APPLICATION_JSON).content("{}"),
            tCajeroA)).isIn(403, 405); // PATCH/DELETE no tienen endpoint: 405 para todos
        assertThat(st(delete("/api/crm/clientes/" + id), tCajeroA)).isIn(403, 405);
        assertThat(st(postJson("/api/crm/clientes/" + id + "/puntos", "{\"delta\":5}"), tCajeroA)).isEqualTo(403);
        // no existe listado GET de tickets para negocios (405 antes del interceptor)
        assertThat(st(get("/api/soporte/tickets"), tCajeroA)).isIn(403, 404, 405);
        assertThat(st(get("/api/soporte/tickets/1"), tCajeroA)).isIn(403, 404, 405);
        assertThat(st(get("/api/admin/soporte/tickets"), tCajeroA)).isEqualTo(403);
        assertThat(st(get("/api/admin/soporte/tickets").param("empresaId", String.valueOf(empB.getId())), tCajeroA))
            .isEqualTo(403);
        assertThat(st(put("/api/admin/soporte/tickets/1").contentType(MediaType.APPLICATION_JSON).content("{}"),
            tCajeroA)).isEqualTo(403);
    }

    @Test
    void cajeroBuscaClientesEnmascaradosYConMinimoDeTresCaracteres() throws Exception {
        int[] st = new int[1];
        json(postJson("/api/crm/clientes", "{\"nombre\":\"Zoila Mask\",\"telefono\":\"88123456\",\"correo\":\"zoila.mask@test.cr\"}"),
            tDuenoA, st);
        var cajero = json(get("/api/crm/clientes/buscar").param("q", "Zoila"), tCajeroA, st);
        assertThat(st[0]).isEqualTo(200);
        String correo = cajero.read("$.data[0].correo"), tel = cajero.read("$.data[0].telefono");
        assertThat(correo).isNotEqualTo("zoila.mask@test.cr").doesNotContain("zoila.mask");
        assertThat(tel).isNotEqualTo("88123456");
        assertThat(json(get("/api/crm/clientes/buscar").param("q", "Zo"), tCajeroA, st).read("$.data.length()", Integer.class))
            .isZero();
        // el cajero de otro negocio no lo encuentra
        assertThat(json(get("/api/crm/clientes/buscar").param("q", "Zoila"), tCajeroB, st).read("$.data.length()", Integer.class))
            .isZero();
    }

    @Test
    void duenoSinPlanCrmSigueBuscandoYCajeroRecibeEnmascarado() throws Exception {
        int[] st = new int[1];
        json(postJson("/api/crm/clientes", "{\"nombre\":\"Paula Plan\",\"telefono\":\"88765432\",\"correo\":\"paula.plan@test.cr\"}"),
            tDuenoA, st);
        // el negocio de prueba no tiene plan CRM: el listado completo sí queda bloqueado
        assertThat(st(get("/api/crm/clientes"), tDuenoA)).isEqualTo(403);
        var dueno = json(get("/api/crm/clientes/buscar").param("q", "Paula"), tDuenoA, st);
        assertThat(st[0]).isEqualTo(200);
        assertThat((String) dueno.read("$.data[0].correo")).isEqualTo("paula.plan@test.cr");
        var cajero = json(get("/api/crm/clientes/buscar").param("q", "Paula"), tCajeroA, st);
        assertThat(st[0]).isEqualTo(200);
        assertThat((String) cajero.read("$.data[0].correo")).doesNotContain("paula.plan");
        assertThat((String) cajero.read("$.data[0].telefono")).isNotEqualTo("88765432");
    }

    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};

    private int foto(org.springframework.mock.web.MockMultipartFile f, String token) throws Exception {
        return st(multipart("/api/soporte/tickets/fotos").file(f), token);
    }

    @Test
    void cajeroSubeFotoDeTicketSoloEnSuNegocioYSoloImagenes() throws Exception {
        org.mockito.Mockito.when(supabaseStorageService.subirImagen(org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.anyString())).thenReturn("https://cdn.test/foto.png");
        var ok = new org.springframework.mock.web.MockMultipartFile("file", "f.png", "image/png", PNG);
        // propio negocio: la carpeta sale del token
        assertThat(foto(ok, tCajeroA)).isEqualTo(200);
        org.mockito.Mockito.verify(supabaseStorageService).subirImagen(org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq("Soporte/Tickets/empresa-" + empA.getId()));
        // pedir otro negocio por query no cambia nada: queda en el del token
        assertThat(st(multipart("/api/soporte/tickets/fotos").file(ok).param("empresaId", String.valueOf(empA.getId())),
            tCajeroB)).isEqualTo(200);
        org.mockito.Mockito.verify(supabaseStorageService).subirImagen(org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.eq("Soporte/Tickets/empresa-" + empB.getId()));
        org.mockito.Mockito.verify(supabaseStorageService, org.mockito.Mockito.times(2))
            .subirImagen(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString());
        // no es imagen (texto con content-type falso y con extensión png) -> 400, sin tocar storage
        assertThat(foto(new org.springframework.mock.web.MockMultipartFile("file", "x.txt", "text/plain",
            "hola".getBytes()), tCajeroA)).isEqualTo(400);
        assertThat(foto(new org.springframework.mock.web.MockMultipartFile("file", "x.png", "image/png",
            "no soy png, solo texto".getBytes()), tCajeroA)).isEqualTo(400);
        // demasiado grande (>10 MB) -> 400
        byte[] grande = java.util.Arrays.copyOf(PNG, 10 * 1024 * 1024 + 1);
        assertThat(foto(new org.springframework.mock.web.MockMultipartFile("file", "g.png", "image/png", grande),
            tCajeroA)).isEqualTo(400);
        org.mockito.Mockito.verify(supabaseStorageService, org.mockito.Mockito.times(2))
            .subirImagen(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString());
    }

    @org.springframework.beans.factory.annotation.Value("${aws.s3.public-url}")
    private String storagePublicUrl;
    @Autowired private com.hotclick.controller.CrmController crmController;

    private int ticket(String fotoUrl, String token) throws Exception {
        return st(postJson("/api/soporte/tickets", "{\"titulo\":\"Falla POS\",\"descripcion\":\"No imprime\",\"fotoUrl\":\""
            + fotoUrl + "\"}"), token);
    }

    @Test
    void fotoUrlDelTicketSoloDelStorageYDeLaCarpetaDelNegocio() throws Exception {
        String base = storagePublicUrl.replaceAll("/+$", "") + "/Soporte/Tickets/empresa-";
        String uuid = "123e4567-e89b-12d3-a456-426614174000";
        assertThat(ticket(base + empA.getId() + "/" + uuid + ".png", tCajeroA)).isEqualTo(200);
        // otra carpeta de negocio, otro host, otra carpeta, traversal, query o nombre arbitrario → 400
        assertThat(ticket(base + empB.getId() + "/" + uuid + ".png", tCajeroA)).isEqualTo(400);
        assertThat(ticket("https://evil.test/Soporte/Tickets/empresa-" + empA.getId() + "/" + uuid + ".png", tCajeroA))
            .isEqualTo(400);
        assertThat(ticket(storagePublicUrl + "/productos/" + uuid + ".png", tCajeroA)).isEqualTo(400);
        assertThat(ticket(base + empA.getId() + "/../empresa-" + empB.getId() + "/" + uuid + ".png", tCajeroA))
            .isEqualTo(400);
        assertThat(ticket(base + empA.getId() + "/" + uuid + ".png?x=1", tCajeroA)).isEqualTo(400);
        assertThat(ticket(base + empA.getId() + "/foto.svg", tCajeroA)).isEqualTo(400);
        assertThat(ticket(storagePublicUrl + ".evil.test/Soporte/Tickets/empresa-" + empA.getId() + "/" + uuid + ".png",
            tCajeroA)).isEqualTo(400);
        assertThat(ticketSoporteRepository.count()).isEqualTo(1);
    }

    @Test
    void crearClienteTieneTopePorUsuarioContraElOraculoDe409() throws Exception {
        Object ctrl = org.springframework.test.util.AopTestUtils.getUltimateTargetObject(crmController);
        Object previo = org.springframework.test.util.ReflectionTestUtils.getField(ctrl, "crearMax");
        org.springframework.test.util.ReflectionTestUtils.setField(ctrl, "crearMax", 3);
        try {
            for (int i = 0; i < 3; i++) {
                assertThat(st(postJson("/api/crm/clientes", "{\"nombre\":\"Rata " + i + "\",\"correo\":\"rata" + i
                    + "@test.cr\"}"), tCajeroA)).isIn(200, 409);
            }
            assertThat(st(postJson("/api/crm/clientes", "{\"nombre\":\"Rata X\",\"correo\":\"rata0@test.cr\"}"),
                tCajeroA)).isEqualTo(429);
            // el tope es por usuario: otro usuario del mismo negocio sigue pudiendo
            assertThat(st(postJson("/api/crm/clientes", "{\"nombre\":\"Rata Y\"}"), tDuenoA)).isEqualTo(200);
        } finally {
            org.springframework.test.util.ReflectionTestUtils.setField(ctrl, "crearMax", previo);
        }
    }
}
