package com.hotclick.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Seguridad #376 (MEDIO): EDITOR podía crear gift cards con cualquier monto y cancelarlas, y usar la ficha con IA
 * (costo de IA del negocio). Ambas rutas son del PROPIETARIO del negocio o del ADMIN de plataforma.
 * EDITOR y LECTOR (rol Spring EMPRENDEDOR) reciben 403 con el mensaje de propietario; PROPIETARIO pasa la guarda.
 */
@DisplayName("[MEDIO] Gift cards y generar-ia: solo PROPIETARIO o ADMIN")
class RolesGiftCardsGenerarIaSoloPropietarioTest extends BaseIntegrationTest {

    private static final String GC = "/api/admin/gift-cards";
    private static final String IA = "/api/admin/productos/generar-ia";
    private static final String CUERPO_GC = "{\"monto\":5000}";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ObjectMapper om;

    private String tokenDueno;
    private String tokenEditor;
    private String tokenLector;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa e = new Empresa();
        e.setNombreEmpresa("Roles GiftCards IA");
        e.setSlug("roles-giftcards-ia");
        e.setCorreoEmpresa("roles-giftcards-ia@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);
        tokenDueno = tokenEmpresa(miembro("gc-dueno@test.cr", rolEmp, e, "PROPIETARIO"), e);
        tokenEditor = tokenEmpresa(miembro("gc-editor@test.cr", rolEmp, e, "EDITOR"), e);
        tokenLector = tokenEmpresa(miembro("gc-lector@test.cr", rolEmp, e, "LECTOR"), e);
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_gift_card_tb");
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Usuario miembro(String correo, Rol rol, Empresa e, String rolEnEmpresa) {
        Usuario u = crearUsuario(correo, rolEnEmpresa, rol);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.save(new MiembroEmpresa(u, e, rolEnEmpresa));
        return u;
    }

    private String tokenEmpresa(Usuario u, Empresa e) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, e.getId(), e.getSlug());
    }

    private MvcResult json(HttpMethod m, String ruta, String token, String cuerpo) throws Exception {
        return mockMvc.perform(request(m, ruta).header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(cuerpo)).andReturn();
    }

    private MvcResult generarIa(String token) throws Exception {
        var b = multipart(IA)
            .file(new MockMultipartFile("imagen", "p.png", "image/png", new byte[]{1, 2, 3}))
            .header("Authorization", token);
        return mockMvc.perform(b).andReturn();
    }

    private List<String> abiertas(String token, boolean lector) throws Exception {
        List<String> r = new ArrayList<>();
        List<Object[]> llamadas = List.of(
            new Object[]{"GET " + GC, json(HttpMethod.GET, GC, token, "")},
            new Object[]{"POST " + GC, json(HttpMethod.POST, GC, token, CUERPO_GC)},
            new Object[]{"DELETE " + GC + "/1", json(HttpMethod.DELETE, GC + "/1", token, "")},
            new Object[]{"POST " + IA, generarIa(token)});
        for (Object[] l : llamadas) {
            var res = ((MvcResult) l[1]).getResponse();
            String cuerpo = res.getContentAsString();
            boolean ok = res.getStatus() == 403
                && (cuerpo.contains(PropietarioGuard.MSG) || (lector && cuerpo.contains("Lector")));
            if (!ok) r.add(l[0] + " → " + res.getStatus());
        }
        return r;
    }

    @Test
    @DisplayName("EDITOR → 403 (propietario) al listar, crear y cancelar gift cards y en generar-ia")
    void editor403() throws Exception {
        assertThat(abiertas(tokenEditor, false)).as("rutas abiertas a EDITOR").isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_gift_card_tb", Integer.class))
            .as("EDITOR no debe haber creado ninguna gift card").isZero();
    }

    @Test
    @DisplayName("LECTOR → 403 en las mismas rutas")
    void lector403() throws Exception {
        assertThat(abiertas(tokenLector, true)).as("rutas abiertas a LECTOR").isEmpty();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_gift_card_tb", Integer.class)).isZero();
    }

    @Test
    @DisplayName("PROPIETARIO → no lo frena la guarda (crea y lista gift cards; generar-ia no responde 403 de propietario)")
    void propietarioPasa() throws Exception {
        var crear = json(HttpMethod.POST, GC, tokenDueno, CUERPO_GC).getResponse();
        assertThat(crear.getStatus()).as("crear: " + crear.getContentAsString()).isNotIn(401, 403).isLessThan(500);
        assertThat(crear.getContentAsString()).doesNotContain(PropietarioGuard.MSG);
        var lista = json(HttpMethod.GET, GC, tokenDueno, "").getResponse();
        assertThat(lista.getContentAsString()).doesNotContain(PropietarioGuard.MSG);
        assertThat(lista.getStatus()).isNotIn(401, 403);
        var del = json(HttpMethod.DELETE, GC + "/999999", tokenDueno, "").getResponse();
        assertThat(del.getContentAsString()).doesNotContain(PropietarioGuard.MSG);
        assertThat(del.getStatus()).isNotIn(401, 403).isLessThan(500);
        var ia = generarIa(tokenDueno).getResponse();
        assertThat(ia.getContentAsString()).doesNotContain(PropietarioGuard.MSG);
        assertThat(ia.getStatus()).isNotEqualTo(401);
        assertThat(ia.getStatus()).as("la guarda no lo frena").isNotEqualTo(403);
    }

    @Test
    @DisplayName("ADMIN de plataforma pasa la guarda en gift cards")
    void adminPasa() throws Exception {
        var res = json(HttpMethod.GET, GC, adminToken, "").getResponse();
        assertThat(res.getContentAsString()).doesNotContain(PropietarioGuard.MSG);
    }

    @Test
    @DisplayName("Validación pública de gift cards en checkout no cambia (no pasa por la guarda de propietario)")
    void validarCheckoutSigueAbierto() throws Exception {
        var res = json(HttpMethod.GET, "/api/gift-cards/validar?codigo=NOEXISTE", tokenEditor, "").getResponse();
        assertThat(res.getStatus()).isEqualTo(200);
        JsonNode n = om.readTree(res.getContentAsString());
        assertThat(n.get("valida").asBoolean()).isFalse();
    }
}
