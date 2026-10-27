package com.hotclick.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Seguridad #385 (BAJOS 1-3): gift cards con tope de intentos en validar, código manual de mínimo 8 caracteres,
 * monto validado (400, no 500) y código duplicado entre negocios con 409.
 */
@DisplayName("Gift cards: rate limit de validar, código mínimo, monto válido y duplicados")
class GiftCardsValidacionTest extends BaseIntegrationTest {

    private static final String GC = "/api/admin/gift-cards";
    private static final String VALIDAR = "/api/gift-cards/validar?codigo=NOEXISTE00";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ObjectMapper om;

    private Empresa empA;
    private Empresa empB;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empA = empresa("gcv-a");
        empB = empresa("gcv-b");
        tokenA = token(dueno("gcv-dueno-a@test.cr", rolEmp, empA), empA);
        tokenB = token(dueno("gcv-dueno-b@test.cr", rolEmp, empB), empB);
        jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb");
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_gift_card_tb");
        jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb");
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario dueno(String correo, Rol rol, Empresa e) {
        Usuario u = crearUsuario(correo, "PROPIETARIO", rol);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.save(new MiembroEmpresa(u, e, "PROPIETARIO"));
        return u;
    }

    private String token(Usuario u, Empresa e) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, e.getId(), e.getSlug());
    }

    private MockHttpServletResponse llamar(HttpMethod m, String ruta, String token, String cuerpo) throws Exception {
        return mockMvc.perform(request(m, ruta).header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(cuerpo)).andReturn().getResponse();
    }

    private long totalGiftCards() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_gift_card_tb", Long.class);
    }

    // ── (1) rate limit por usuario en validar ────────────────────────────────

    @Test
    @DisplayName("GET /gift-cards/validar: el intento 11 del mismo usuario en 60 s → 429; otro usuario no se ve afectado")
    void validarTienePorUsuario429() throws Exception {
        for (int i = 1; i <= 10; i++) {
            assertThat(llamar(HttpMethod.GET, VALIDAR, tokenA, "").getStatus()).as("intento " + i).isEqualTo(200);
        }
        assertThat(llamar(HttpMethod.GET, VALIDAR, tokenA, "").getStatus()).as("intento 11").isEqualTo(429);
        assertThat(llamar(HttpMethod.GET, VALIDAR, tokenB, "").getStatus()).as("otro usuario").isEqualTo(200);
    }

    // ── (1b) rate limit por usuario en crear (el 409 no puede ser un oráculo de existencia) ──────

    @Test
    @DisplayName("POST /admin/gift-cards: el intento 11 del mismo usuario en 60 s → 429 (también con códigos que ya existen); otro usuario no se ve afectado")
    void crearTienePorUsuario429() throws Exception {
        for (int i = 1; i <= 10; i++) {
            assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"SONDEO-" + i + "0000\"}").getStatus())
                .as("intento " + i).isEqualTo(200);
        }
        long antes = totalGiftCards();
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"SONDEO-10000\"}").getStatus())
            .as("intento 11 con un código que existe: 429, no 409").isEqualTo(429);
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"NOEXISTE-99\"}").getStatus())
            .as("intento 12 con un código libre").isEqualTo(429);
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{}").getStatus()).as("cuerpo inválido también cuenta").isEqualTo(429);
        assertThat(totalGiftCards()).isEqualTo(antes);
        assertThat(llamar(HttpMethod.POST, GC, tokenB, "{\"monto\":5000,\"codigo\":\"SONDEO-10000\"}").getStatus())
            .as("otro usuario: su propio cupo (409 por duplicado global)").isEqualTo(409);
    }

    @Test
    @DisplayName("POST /admin/gift-cards falla cerrado: si el cupo no se puede registrar (BD del limitador caída) → 429 y no crea nada")
    void crearFallaCerradoSiElLimitadorNoResponde() throws Exception {
        jdbcTemplate.execute("ALTER TABLE hot_click_rate_limit_tb RENAME TO hot_click_rate_limit_tb_off");
        try {
            assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"FALLACERRADO1\"}").getStatus()).isEqualTo(429);
        } finally {
            jdbcTemplate.execute("ALTER TABLE hot_click_rate_limit_tb_off RENAME TO hot_click_rate_limit_tb");
        }
        assertThat(totalGiftCards()).isZero();
    }

    // ── (2b) alfabeto del código manual: ^[A-Z0-9-]{8,30}$ tras toUpperCase(Locale.ROOT) ──────

    @Test
    @DisplayName("Código manual con caracteres fuera de A-Z, 0-9 y guion (NBSP, ancho cero, ß, ı, tildes, ñ, HTML, espacios, _ .) → 400 y no crea nada")
    void codigoManualFueraDelAlfabeto400() throws Exception {
        String[] malos = {
            "ABC\u00A01234",           // NBSP en medio
            "ABC\u200B12345",          // ancho cero
            "ABC\uFEFF12345",          // BOM
            "STRA\u00DFE123",          // ß: en mayúsculas daría SS
            "\u0131NICIO123",          // ı sin punto: en mayúsculas daría I
            "\u017Fecreto123",         // s larga: en mayúsculas daría S
            "CAF\u00C91234", "caf\u00E91234", "A\u00F1O-2026X", "<b>CODIGO12</b>", "<script>1</script>",
            "ABC 12345", "ABC_12345", "ABC.12345", "ABC/12345", "ABC%2012345", "\uFF21\uFF22\uFF23\uFF11\uFF12\uFF13\uFF14\uFF15",
            "\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668"   // dígitos árabes
        };
        for (String c : malos) {
            jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb");
            var res = llamar(HttpMethod.POST, GC, tokenA, om.writeValueAsString(java.util.Map.of("monto", 5000, "codigo", c)));
            assertThat(res.getStatus()).as("«" + c + "» → " + res.getContentAsString()).isEqualTo(400);
        }
        assertThat(totalGiftCards()).isZero();
    }

    @Test
    @DisplayName("Código manual válido: minúsculas se guardan en mayúsculas, con guiones y recortando espacios de los extremos")
    void codigoManualValidoSeNormaliza() throws Exception {
        for (String[] par : new String[][] {
            {"ABC-1234", "ABC-1234"}, {"navidad-2026", "NAVIDAD-2026"}, {"  abc12345  ", "ABC12345"}, {"1".repeat(30), "1".repeat(30)}
        }) {
            jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb");
            var res = llamar(HttpMethod.POST, GC, tokenA, om.writeValueAsString(java.util.Map.of("monto", 5000, "codigo", par[0])));
            assertThat(res.getStatus()).as(par[0] + " → " + res.getContentAsString()).isEqualTo(200);
            assertThat(om.readTree(res.getContentAsString()).get("codigo").asText()).isEqualTo(par[1]);
        }
    }

    // ── (2) código mínimo ────────────────────────────────────────────────────

    @Test
    @DisplayName("Código manual de menos de 8 caracteres → 400 y no se crea nada; de 8 → 200")
    void codigoManualMinimo8() throws Exception {
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"ABC1234\"}").getStatus()).isEqualTo(400);
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"  ab12  \"}").getStatus()).isEqualTo(400);
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"" + "A".repeat(31) + "\"}").getStatus()).isEqualTo(400);
        assertThat(totalGiftCards()).isZero();
        var ok = llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"abc12345\"}");
        assertThat(ok.getStatus()).as(ok.getContentAsString()).isEqualTo(200);
        assertThat(om.readTree(ok.getContentAsString()).get("codigo").asText()).isEqualTo("ABC12345");
    }

    @Test
    @DisplayName("Código generado (sin codigo en el body) ya cumple el mínimo: GC-XXXX-XXXX-XXXX")
    void codigoGeneradoLargo() throws Exception {
        var res = llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000}");
        assertThat(res.getStatus()).isEqualTo(200);
        String codigo = om.readTree(res.getContentAsString()).get("codigo").asText();
        assertThat(codigo).hasSizeGreaterThanOrEqualTo(8).matches("GC-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}");
    }

    // ── (3) monto ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Monto ausente, null, texto, decimal, cero, negativo, gigante o sobre el tope → 400 (no 500) y no crea nada")
    void montoInvalido400() throws Exception {
        String[] cuerpos = {
            "{}", "{\"monto\":null}", "{\"monto\":\"abc\"}", "{\"monto\":\"5000\"}", "{\"monto\":true}",
            "{\"monto\":12.5}", "{\"monto\":0}", "{\"monto\":-1}", "{\"monto\":-5000}",
            "{\"monto\":1000001}", "{\"monto\":99999999999}", "{\"monto\":1e30}"
        };
        for (String c : cuerpos) {
            jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb"); // 12 cuerpos > tope de crear por minuto
            var res = llamar(HttpMethod.POST, GC, tokenA, c);
            assertThat(res.getStatus()).as(c + " → " + res.getContentAsString()).isEqualTo(400);
            assertThat(res.getContentAsString()).contains("monto");
        }
        assertThat(totalGiftCards()).isZero();
    }

    @Test
    @DisplayName("Monto en el límite (1 y el tope) → 200")
    void montoLimitesValidos() throws Exception {
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":1}").getStatus()).isEqualTo(200);
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":1000000}").getStatus()).isEqualTo(200);
        assertThat(totalGiftCards()).isEqualTo(2);
    }

    @Test
    @DisplayName("fechaVencimiento mal formada o codigo que no es texto → 400 (no 500)")
    void camposMalFormados400() throws Exception {
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"fechaVencimiento\":\"mañana\"}").getStatus()).isEqualTo(400);
        assertThat(llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":12345678}").getStatus()).isEqualTo(400);
        assertThat(totalGiftCards()).isZero();
    }

    @Test
    @DisplayName("Mismo código en otro negocio → 409 (no 500) sin revelar de quién es; el original no cambia")
    void codigoDuplicadoEntreNegocios409() throws Exception {
        var primera = llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"DUPLICADO1\"}");
        assertThat(primera.getStatus()).isEqualTo(200);
        var otra = llamar(HttpMethod.POST, GC, tokenB, "{\"monto\":9000,\"codigo\":\"duplicado1\"}");
        assertThat(otra.getStatus()).as(otra.getContentAsString()).isEqualTo(409);
        JsonNode n = om.readTree(otra.getContentAsString());
        assertThat(n.get("error").asText()).doesNotContain("DUPLICADO1").doesNotContainIgnoringCase(empA.getSlug());
        var mismo = llamar(HttpMethod.POST, GC, tokenA, "{\"monto\":5000,\"codigo\":\"DUPLICADO1\"}");
        assertThat(mismo.getStatus()).isEqualTo(409);
        assertThat(totalGiftCards()).isEqualTo(1);
    }
}
