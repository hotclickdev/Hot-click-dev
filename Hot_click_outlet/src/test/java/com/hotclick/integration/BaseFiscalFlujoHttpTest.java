package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.HaciendaContribuyenteService;
import com.hotclick.service.HaciendaContribuyenteService.ContribuyenteDTO;
import com.hotclick.utils.Constants;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * QA base fiscal (PR #672): matriz de autorización HTTP real (filtro de seguridad + @PreAuthorize + CompanyScope),
 * aislamiento entre negocios y el flujo completo de comisión/inscripción/verificación sobre H2 con los servicios
 * reales. Hacienda está simulada (nunca se llama a la API real). Cédulas y correos ficticios.
 */
@DisplayName("QA base fiscal: matriz de autorización, aislamiento y flujo completo (HTTP)")
class BaseFiscalFlujoHttpTest extends BaseIntegrationTest {

    private static final String CED_A = "3111111111";
    private static final String CED_B = "3222222222";

    @MockitoBean private HaciendaContribuyenteService hacienda;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PlanRepository planRepository;

    private Empresa empA, empB;
    private final List<Long> planes = new ArrayList<>();
    private String tDuenoA, tCajeroA, tEditorA, tDuenoB, tStaff, tImpLectura, tImpEscritura;

    @BeforeEach
    void setUp() {
        empA = empresa("fis-a", "9");
        empB = empresa("fis-b", "7.5");
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tDuenoA = token(miembro("fis-dueno-a@test.cr", "PROPIETARIO", rolEmp, empA), empA);
        tCajeroA = token(miembro("fis-cajero-a@test.cr", "CAJERO", rolEmp, empA), empA);
        tEditorA = token(miembro("fis-editor-a@test.cr", "EDITOR", rolEmp, empA), empA);
        tDuenoB = token(miembro("fis-dueno-b@test.cr", "PROPIETARIO", rolEmp, empB), empB);
        String lectura = jwtUtil.generateImpersonationToken(adminUser.getCorreo(), adminUser.getId(),
            Constants.ROL_EMPRENDEDOR, empA.getId(), empA.getSlug(), adminUser.getId(), adminUser.getCorreo());
        tImpLectura = "Bearer " + lectura;
        tImpEscritura = "Bearer " + jwtUtil.generateImpersonationWriteToken(lectura, "QA matriz fiscal 15+ caracteres");
        // Staff de plataforma con global.companies: rol SUPPORT + permiso por la tabla rol-permiso (que H2 no crea sola).
        tStaff = tokenPara(staffConPermiso(), Constants.ROL_SUPPORT);
        when(hacienda.consultar(anyString())).thenAnswer(inv -> coincide(inv.getArgument(0)));
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS hot_click_rol_permiso_tb");
        jdbcTemplate.update("DELETE FROM hot_click_permiso_tb");
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); u.setEmpresaRegistro(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
        planRepository.deleteAllById(planes);
    }

    // ── fixtures ─────────────────────────────────────────────────────────────

    private static ContribuyenteDTO coincide(String cedula) {
        return new ContribuyenteDTO(cedula, "Negocio de Prueba S.A.", "02", "Inscrito", "Régimen Tradicional", true,
            List.of("4711 Venta de ropa"));
    }

    private Empresa empresa(String slug, String comision) {
        Plan p = new Plan();
        p.setNombre("FIS_" + slug + "_" + System.nanoTime());
        p.setComisionPorcentaje(new BigDecimal(comision));
        p = planRepository.saveAndFlush(p);
        planes.add(p.getId());
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        e.setPlan(p);
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

    private Usuario staffConPermiso() {
        Rol rol = obtenerOCrearRol(Constants.ROL_SUPPORT, 5);
        Usuario s = crearUsuario("fis-staff@hotclick.cr", "Staff", rol);
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS hot_click_rol_permiso_tb "
            + "(fk_id_rol BIGINT, fk_id_permiso INT, fk_id_estado INT)");
        jdbcTemplate.update("INSERT INTO hot_click_permiso_tb (nombre_permiso, descripcion, modulo, fk_id_estado) "
            + "VALUES (?, ?, ?, 1)", Constants.PERM_GLOBAL_COMPANIES, "QA", "global");
        Integer idPermiso = jdbcTemplate.queryForObject(
            "SELECT id_permiso FROM hot_click_permiso_tb WHERE nombre_permiso = ?", Integer.class, Constants.PERM_GLOBAL_COMPANIES);
        jdbcTemplate.update("INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso, fk_id_estado) VALUES (?, ?, 1)",
            rol.getId(), idPermiso);
        return s;
    }

    private int st(MockHttpServletRequestBuilder b, String token) throws Exception {
        if (token != null) b.header("Authorization", token);
        return mockMvc.perform(b).andReturn().getResponse().getStatus();
    }

    private String body(MockHttpServletRequestBuilder b, String token) throws Exception {
        return mockMvc.perform(b.header("Authorization", token)).andReturn().getResponse().getContentAsString();
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String json) {
        return b.contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private static String inscripcion(String cedula) {
        return "{\"situacion\":\"INSCRITO\",\"cedula\":\"" + cedula + "\",\"nombre\":\"Negocio de Prueba\","
            + "\"actividad\":\"Venta de ropa\",\"correo\":\"facturas@example.com\",\"aceptaDeclaracion\":true}";
    }

    private MockHttpServletRequestBuilder inscribir(String cedula) {
        return json(post("/api/empresa/fiscal/inscripcion"), inscripcion(cedula));
    }

    private BigDecimal efectiva(String token) throws Exception {
        return new BigDecimal(JsonPath.read(body(get("/api/empresa/fiscal"), token), "$.data.comisionEfectivaPct").toString());
    }

    private String huellaDe(Empresa e) throws Exception {
        return JsonPath.read(body(get("/api/admin/empresas/" + e.getId() + "/fiscal"), adminToken), "$.data.huella");
    }

    private MockHttpServletRequestBuilder verificar(Empresa e, String decision, String huella) {
        return json(post("/api/admin/empresas/" + e.getId() + "/fiscal/verificar"),
            "{\"decision\":\"" + decision + "\",\"motivo\":\"QA\",\"huella\":\"" + huella + "\"}");
    }


    private int inscr(String token, String cedula) throws Exception {
        return inscrJson(token, inscripcion(cedula));
    }

    private int inscrJson(String token, String json) throws Exception {
        return inscrReq(token, json).status();
    }

    private String inscrBody(String token, String cedula) throws Exception {
        return inscrReq(token, inscripcion(cedula)).body();
    }

    private record Resp(int status, String body) {}

    private Resp inscrReq(String token, String json) throws Exception {
        var rq = json(post("/api/empresa/fiscal/inscripcion"), json);
        if (token != null) rq.header("Authorization", token);
        var r = mockMvc.perform(rq).andReturn().getResponse();
        return new Resp(r.getStatus(), r.getContentAsString());
    }

    @Test
    @DisplayName("Inscripción de un negocio CON plan debe dar 200 (QA-FISCAL-1: el plan se carga con fetch join)")
    void inscripcionConPlanDa200() throws Exception {
        assertThat(st(inscribir(CED_A), tDuenoA)).isEqualTo(200);
    }

    @Test
    @DisplayName("El cajero VE la situación fiscal (GET 200) pero no la escribe (403)")
    void cajeroVeDatosFiscales() throws Exception {
        assertThat(st(get("/api/empresa/fiscal"), tCajeroA)).isEqualTo(200);
        assertThat(st(inscribir(CED_A), tCajeroA)).isEqualTo(403);
    }

    // ── 1. matriz de autorización ────────────────────────────────────────────

    @Test
    @DisplayName("Matriz /api/empresa/fiscal*: anónimo, comprador, cajero, editor, dueño, staff, ADMIN e impersonación")
    void matrizTenant() throws Exception {
        String situacion = "{\"situacion\":\"NO_INSCRITO\"}";
        // anónimo
        assertThat(st(get("/api/empresa/fiscal"), null)).isIn(401, 403);
        assertThat(st(json(put("/api/empresa/fiscal/situacion"), situacion), null)).isIn(401, 403);
        assertThat(inscr(null, CED_A)).isIn(401, 403);
        // comprador (USUARIO_FINAL)
        assertThat(st(get("/api/empresa/fiscal"), userToken)).isEqualTo(403);
        assertThat(st(json(put("/api/empresa/fiscal/situacion"), situacion), userToken)).isEqualTo(403);
        assertThat(inscr(userToken, CED_A)).isEqualTo(403);
        // lectura: el equipo (editor) y el dueño VEN (decisión del PO); el cajero: ver cajeroVeDatosFiscales (BUG QA-FISCAL-2)
        assertThat(st(get("/api/empresa/fiscal"), tEditorA)).isEqualTo(200);
        assertThat(st(get("/api/empresa/fiscal"), tDuenoA)).isEqualTo(200);
        for (String t : new String[] {tCajeroA, tEditorA}) {
            assertThat(st(json(put("/api/empresa/fiscal/situacion"), situacion), t)).isEqualTo(403);
            assertThat(inscr(t, CED_A)).isEqualTo(403);
        }
        assertThat(empresaRepository.findById(empA.getId()).orElseThrow().getSituacionFiscal()).isNull();
        assertThat(st(json(put("/api/empresa/fiscal/situacion"), situacion), tDuenoA)).isEqualTo(200);
        assertThat(inscr(tDuenoA, CED_A)).isEqualTo(200);
        // staff global.companies: sin tenant, fuera
        assertThat(st(get("/api/empresa/fiscal"), tStaff)).isEqualTo(403);
        assertThat(inscr(tStaff, CED_A)).isEqualTo(403);
        // ADMIN sin impersonar no tiene empresa: no lee ni escribe por la ruta del negocio
        assertThat(st(get("/api/empresa/fiscal"), adminToken)).isEqualTo(403);
        assertThat(inscr(adminToken, CED_A)).isEqualTo(403);
        // ADMIN "ver como el negocio": lee, no escribe (ni en modo lectura ni en modo escritura)
        assertThat(st(get("/api/empresa/fiscal"), tImpLectura)).isEqualTo(200);
        assertThat(inscr(tImpLectura, CED_A)).isEqualTo(403);
        assertThat(inscr(tImpEscritura, CED_A)).isEqualTo(403);
        assertThat(st(json(put("/api/empresa/fiscal/situacion"), "{\"situacion\":\"INSCRITO\"}"), tImpEscritura)).isEqualTo(403);
    }

    @Test
    @DisplayName("Matriz /api/admin/**/fiscal*: solo el ADMIN real; staff global.companies, dueño, cajero e impersonación, 403")
    void matrizAdmin() throws Exception {
        String id = String.valueOf(empA.getId());
        String reglas = "{\"regimen\":\"SIMPLIFICADO\",\"extraNoInscritoPct\":14.00,\"diasEnviarFactura\":7,"
            + "\"onvoPagoMinimoCrc\":20000,\"onvoCostoPagoCrc\":0}";
        List<Supplier<MockHttpServletRequestBuilder>> rutas = List.of(
            () -> get("/api/admin/empresas/fiscal/pendientes"),
            () -> get("/api/admin/empresas/" + id + "/fiscal"),
            () -> post("/api/admin/empresas/" + id + "/fiscal/reconsultar"),
            () -> json(post("/api/admin/empresas/" + id + "/fiscal/verificar"), "{\"decision\":\"APROBAR\",\"huella\":\"x\"}"),
            () -> get("/api/admin/configuracion/fiscal"),
            () -> json(put("/api/admin/configuracion/fiscal"), reglas));
        for (int i = 0; i < rutas.size(); i++) {
            assertThat(st(rutas.get(i).get(), null)).as("anónimo, ruta " + i).isIn(401, 403);
            for (String t : new String[] {userToken, tDuenoA, tCajeroA, tEditorA, tStaff, tImpLectura, tImpEscritura}) {
                assertThat(st(rutas.get(i).get(), t)).as("ruta " + i + " con token ajeno al ADMIN").isEqualTo(403);
            }
        }
        // ADMIN: pasa el filtro y llega al negocio
        assertThat(st(rutas.get(0).get(), adminToken)).isEqualTo(200);
        assertThat(st(rutas.get(1).get(), adminToken)).isEqualTo(200);
        assertThat(st(rutas.get(2).get(), adminToken)).isEqualTo(409); // sin inscripción declarada
        assertThat(st(rutas.get(3).get(), adminToken)).isEqualTo(409); // huella que no coincide
        assertThat(st(rutas.get(4).get(), adminToken)).isEqualTo(200);
    }

    @Test
    @DisplayName("Validación HTTP: sin declaración jurada, correo sin punto o cédula inválida dan 400 y no guardan ni gastan intento")
    void validacionHttp() throws Exception {
        String base = "\"situacion\":\"INSCRITO\",\"nombre\":\"Negocio de Prueba\",\"actividad\":\"Venta de ropa\"";
        assertThat(st(json(post("/api/empresa/fiscal/inscripcion"),
            "{" + base + ",\"cedula\":\"" + CED_A + "\",\"correo\":\"a@example.com\"}"), tDuenoA)).isEqualTo(400);
        assertThat(st(json(post("/api/empresa/fiscal/inscripcion"),
            "{" + base + ",\"cedula\":\"" + CED_A + "\",\"correo\":\"a@example.com\",\"aceptaDeclaracion\":false}"), tDuenoA)).isEqualTo(400);
        assertThat(st(json(post("/api/empresa/fiscal/inscripcion"),
            "{" + base + ",\"cedula\":\"" + CED_A + "\",\"correo\":\"a@example\",\"aceptaDeclaracion\":true}"), tDuenoA)).isEqualTo(400);
        for (String ced : new String[] {"012345678", "1111111111", "12345678", "1234567890123"}) {
            assertThat(inscr(tDuenoA, ced)).as("cédula " + ced).isEqualTo(400);
        }
        assertThat(empresaRepository.findById(empA.getId()).orElseThrow().getCedulaFiscal()).isNull();
        Integer intentos = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_rate_limit_tb", Integer.class);
        assertThat(intentos).isZero();
        verifyNoInteractions(hacienda);
        // y una válida con cada tipo de cédula pasa
        for (String ok : new String[] {"111111111", "3111111111", "11111111111", "111111111111"}) {
            assertThat(inscr(tDuenoA, ok)).as("cédula " + ok).isEqualTo(200);
        }
    }

    // ── 2. aislamiento entre negocios ────────────────────────────────────────

    @Test
    @DisplayName("Aislamiento: el negocio B no lee ni cambia lo de A, ni siquiera nombrando a A en el cuerpo; no se aprueba solo")
    void aislamiento() throws Exception {
        assertThat(inscr(tDuenoA, CED_A)).isEqualTo(200);
        // B ve solo lo suyo
        String vistaB = body(get("/api/empresa/fiscal"), tDuenoB);
        assertThat(vistaB).doesNotContain(CED_A);
        assertThat(JsonPath.<Object>read(vistaB, "$.data.situacionFiscal")).isNull();
        // B intenta colar la empresa de A en el cuerpo (campos extra se ignoran)
        String conIntruso = inscripcion(CED_B).replace("{", "{\"empresaId\":" + empA.getId() + ",\"id\":" + empA.getId() + ",");
        assertThat(inscrJson(tDuenoB, conIntruso)).isEqualTo(200);
        Empresa a = empresaRepository.findById(empA.getId()).orElseThrow();
        Empresa b = empresaRepository.findById(empB.getId()).orElseThrow();
        assertThat(a.getCedulaFiscal()).isEqualTo(CED_A);
        assertThat(b.getCedulaFiscal()).isEqualTo(CED_B);
        // B no pasa por las rutas ADMIN: ni ver ni aprobarse (ni aprobar a A)
        for (Empresa e : new Empresa[] {empA, empB}) {
            assertThat(st(get("/api/admin/empresas/" + e.getId() + "/fiscal"), tDuenoB)).isEqualTo(403);
            assertThat(st(verificar(e, "APROBAR", "x"), tDuenoB)).isEqualTo(403);
            assertThat(st(post("/api/admin/empresas/" + e.getId() + "/fiscal/reconsultar"), tDuenoB)).isEqualTo(403);
        }
        assertThat(empresaRepository.findById(empB.getId()).orElseThrow().isFiscalVerificado()).isFalse();
        // el cajero de A tampoco escribe sobre A
        assertThat(inscr(tCajeroA, CED_A)).isEqualTo(403);
        // la comisión de cada uno sale de su propio plan (9 y 7.5)
        assertThat(efectiva(tDuenoA)).isEqualByComparingTo("23.00");
        assertThat(efectiva(tDuenoB)).isEqualByComparingTo("21.50");
    }

    // ── 3. flujo completo ────────────────────────────────────────────────────

    @Test
    @DisplayName("Flujo: sin declarar y NO_INSCRITO pagan extra; COINCIDE sigue con extra; ADMIN aprueba (solo plan); reenviar vuelve el extra; ADMIN rechaza (NO_INSCRITO)")
    void flujoCompleto() throws Exception {
        // sin declarar: plan 9 + extra 14
        assertThat(efectiva(tDuenoA)).isEqualByComparingTo("23.00");
        assertThat(st(json(put("/api/empresa/fiscal/situacion"), "{\"situacion\":\"NO_INSCRITO\"}"), tDuenoA)).isEqualTo(200);
        assertThat(efectiva(tDuenoA)).isEqualByComparingTo("23.00");
        // "Ya me inscribí" con COINCIDE: el extra sigue y queda pendiente
        String r = inscrBody(tDuenoA, CED_A);
        assertThat(JsonPath.<String>read(r, "$.data.verifAuto")).isEqualTo("COINCIDE");
        assertThat(JsonPath.<Boolean>read(r, "$.data.pendienteVerificacion")).isTrue();
        assertThat(JsonPath.<Boolean>read(r, "$.data.fiscalVerificado")).isFalse();
        assertThat(efectiva(tDuenoA)).isEqualByComparingTo("23.00");
        assertThat(r).doesNotContain("Negocio de Prueba S.A."); // lo de Hacienda solo lo ve el ADMIN
        // ADMIN aprueba: solo el plan
        assertThat(st(verificar(empA, "APROBAR", huellaDe(empA)), adminToken)).isEqualTo(200);
        assertThat(efectiva(tDuenoA)).isEqualByComparingTo("9.00");
        assertThat(JsonPath.<Boolean>read(body(get("/api/empresa/fiscal"), tEditorA), "$.data.fiscalVerificado")).isTrue();
        // reenviar anula la verificación: extra otra vez
        assertThat(inscr(tDuenoA, CED_A)).isEqualTo(200);
        Empresa tras = empresaRepository.findById(empA.getId()).orElseThrow();
        assertThat(tras.isFiscalVerificado()).isFalse();
        assertThat(tras.getFechaFiscalVerificado()).isNull();
        assertThat(tras.getFiscalVerificadoPor()).isNull();
        assertThat(efectiva(tDuenoA)).isEqualByComparingTo("23.00");
        // ADMIN rechaza: NO_INSCRITO, con extra
        assertThat(st(verificar(empA, "RECHAZAR", huellaDe(empA)), adminToken)).isEqualTo(200);
        assertThat(empresaRepository.findById(empA.getId()).orElseThrow().getSituacionFiscal()).isEqualTo("NO_INSCRITO");
        assertThat(efectiva(tDuenoA)).isEqualByComparingTo("23.00");
        // ya no hay nada pendiente: otro intento de aprobar da 409
        assertThat(st(verificar(empA, "APROBAR", huellaDe(empA)), adminToken)).isEqualTo(409);
    }

    @Test
    @DisplayName("Aprobar con una huella vieja (el negocio reenvió datos) da 409 y no aprueba")
    void huellaVieja409() throws Exception {
        assertThat(inscr(tDuenoA, CED_A)).isEqualTo(200);
        String vista = huellaDe(empA);
        // el negocio cambia el correo mientras el ADMIN mira
        assertThat(inscrJson(tDuenoA, inscripcion(CED_A).replace("facturas@example.com", "otro@example.com"))).isEqualTo(200);
        assertThat(st(verificar(empA, "APROBAR", vista), adminToken)).isEqualTo(409);
        assertThat(st(verificar(empA, "RECHAZAR", vista), adminToken)).isEqualTo(409);
        Empresa e = empresaRepository.findById(empA.getId()).orElseThrow();
        assertThat(e.isFiscalVerificado()).isFalse();
        assertThat(e.getSituacionFiscal()).isEqualTo("INSCRITO");
        // con la huella nueva sí
        assertThat(st(verificar(empA, "APROBAR", huellaDe(empA)), adminToken)).isEqualTo(200);
    }

    @Test
    @DisplayName("Límite: 5 envíos por día y por negocio; el 6.º da 429 sin consultar a Hacienda; otro negocio no se afecta")
    void sextoIntento429() throws Exception {
        for (int i = 1; i <= 5; i++) assertThat(inscr(tDuenoA, CED_A)).as("envío " + i).isEqualTo(200);
        verify(hacienda, times(5)).consultar(anyString());
        assertThat(inscr(tDuenoA, CED_A)).isEqualTo(429);
        verify(hacienda, times(5)).consultar(anyString());
        assertThat(inscr(tDuenoB, CED_B)).isEqualTo(200);
    }

    @Test
    @DisplayName("Hacienda caída o respuesta rara: ERROR_CONSULTA, el envío no se bloquea y el ADMIN puede reconsultar")
    void haciendaCaida() throws Exception {
        when(hacienda.consultar(anyString())).thenThrow(new RuntimeException("timeout simulado"));
        String r = inscrBody(tDuenoA, CED_A);
        assertThat(JsonPath.<String>read(r, "$.data.verifAuto")).isEqualTo("ERROR_CONSULTA");
        assertThat(JsonPath.<Boolean>read(r, "$.data.pendienteVerificacion")).isTrue();
        assertThat(efectiva(tDuenoA)).isEqualByComparingTo("23.00");
        // vuelve la API: reconsultar guarda COINCIDE pero no aprueba
        org.mockito.Mockito.doAnswer(inv -> coincide(inv.getArgument(0))).when(hacienda).consultar(anyString());
        assertThat(st(post("/api/admin/empresas/" + empA.getId() + "/fiscal/reconsultar"), adminToken)).isEqualTo(200);
        Empresa e = empresaRepository.findById(empA.getId()).orElseThrow();
        assertThat(e.getFiscalVerifAuto()).isEqualTo("COINCIDE");
        assertThat(e.isFiscalVerificado()).isFalse();
        assertThat(efectiva(tDuenoA)).isEqualByComparingTo("23.00");
        // NO_ENCONTRADO tampoco bloquea
        org.mockito.Mockito.doReturn(new ContribuyenteDTO(CED_A, null, null, "NO_ENCONTRADO", null, false)).when(hacienda).consultar(anyString());
        assertThat(JsonPath.<String>read(inscrBody(tDuenoA, CED_A), "$.data.verifAuto")).isEqualTo("NO_ENCONTRADO");
    }
}
