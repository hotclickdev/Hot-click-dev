package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.hacienda.CertificadoDePrueba;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Seguimiento del PR 584: {@code PinCertHttpTest.bdCaida_503} rompe TODA la tabla del límite, así que el primer
 * fallo ocurre en una LECTURA ({@code segundosBloqueado}) y no detecta por sí solo un manejo fail-open de la
 * escritura. Aquí solo falla la ESCRITURA de la reserva atómica (el {@code INSERT … ON CONFLICT … RETURNING count}
 * del contador {@code pincert:fail:*}; en H2 su equivalente {@code INSERT}); las lecturas y el resto del SQL
 * funcionan. Esperado: 503 y el .p12 NO se abre (ni {@code leerPrivado} ni {@code FirmaDigitalService.cargar}).
 */
@TestPropertySource(properties = "totp.encryption.key=abababababababababababababababababababababababababababababababab")
@DisplayName("PIN del .p12 — si solo falla el UPSERT de la reserva de intentos: 503 y el .p12 no se abre")
class PinCertUpsertFalloHttpTest extends BaseIntegrationTest {

    private static final String RUTA = "certs/prueba.p12";
    /** 14 caracteres inventados para el test; es el PIN del .p12 que devuelve {@link #p12()}. */
    private static final String PIN_OK = "Zz9!Zz9!Zz9!Zz";
    private static final String PIN_MAL = "1111";

    @Autowired private EmpresaRepository empresaRepository;
    @MockitoSpyBean private JdbcTemplate jdbcSpy;

    private Empresa empA, empB;
    private String tokenDueno, tokenDuenoB;
    private Rol rolEmp;
    private int seq;

    @BeforeEach
    void preparar() {
        rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empA = empresa("pinhttp-a");
        empB = empresa("pinhttp-b");
        tokenDueno = miembro("pinhttp-dueno@test.cr", "PROPIETARIO", empA);
        tokenDuenoB = miembro("pinhttp-duenob@test.cr", "PROPIETARIO", empB);
        when(supabaseStorageService.leerPrivado(anyString())).thenReturn(p12());
    }

    @AfterEach
    void limpiar() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    /** .p12 desechable reempaquetado con el PIN de 14 caracteres de prueba. */
    private static byte[] p12() {
        try {
            CertificadoDePrueba c = CertificadoDePrueba.obtener();
            java.security.KeyStore ks = java.security.KeyStore.getInstance("PKCS12");
            ks.load(null, null);
            ks.setKeyEntry("firma", c.llave, PIN_OK.toCharArray(), new java.security.cert.Certificate[]{c.certificado});
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            ks.store(out, PIN_OK.toCharArray());
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e.setCertP12Path(RUTA);
        return empresaRepository.saveAndFlush(e);
    }

    private String miembro(String correo, String rolEquipo, Empresa emp) {
        Usuario u = crearUsuario(correo, rolEquipo, rolEmp);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private MockHttpServletRequestBuilder pin(String token, String json) {
        return put("/api/empresa/perfil/pin-cert").header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private int estado(String token, String json) throws Exception {
        return mockMvc.perform(pin(token, json)).andReturn().getResponse().getStatus();
    }

    private String pinEnBD(Long empresaId) {
        return empresaRepository.findById(empresaId).orElseThrow().getPinCertEnc();
    }

    private int escriturasFallidas;

    private void fallarSoloElUpsertDeLaReserva() {
        escriturasFallidas = 0;
        org.mockito.stubbing.Answer<Object> respuesta = inv -> {
            String sql = inv.getArgument(0);
            boolean esInsertDelLimite = sql.contains("INSERT INTO hot_click_rate_limit_tb");
            boolean esElContadorDeIntentos = inv.getArguments().length > 2
                && inv.getArguments()[1] instanceof String s1 && s1.startsWith("pincert:fail:")
                || inv.getArguments().length > 2 && inv.getArguments()[2] instanceof String s2 && s2.startsWith("pincert:fail:");
            if (esInsertDelLimite && esElContadorDeIntentos) {
                escriturasFallidas++;
                throw new DataAccessResourceFailureException("UPSERT de la reserva simulado como caído");
            }
            return inv.callRealMethod();
        };
        doAnswer(respuesta).when(jdbcSpy).queryForObject(anyString(), eq(Integer.class), any(Object[].class)); // PostgreSQL: UPSERT … RETURNING
        doAnswer(respuesta).when(jdbcSpy).update(anyString(), any(Object[].class));                            // H2 (pruebas): INSERT
    }

    @Test
    @DisplayName("PIN-UPSERT-1 | solo la escritura de la reserva falla (lecturas OK) → 503 con Retry-After, sin abrir el .p12 ni guardar nada")
    void upsertCaido_503_sinAbrirElP12() throws Exception {
        fallarSoloElUpsertDeLaReserva();

        MvcResult r = mockMvc.perform(pin(tokenDueno, "{\"pin\":\"" + PIN_OK + "\"}")).andReturn();

        assertThat(escriturasFallidas).as("el UPSERT de la reserva sí se intentó (y falló)").isGreaterThan(0);
        assertThat(r.getResponse().getStatus()).isEqualTo(503);
        assertThat(r.getResponse().getHeader("Retry-After")).isNotNull();
        assertThat(r.getResponse().getContentAsString()).doesNotContain(PIN_OK);
        verify(supabaseStorageService, never()).leerPrivado(anyString()); // cargar() nunca llegó a leer el .p12
        assertThat(pinEnBD(empA.getId())).isNull();                          // y el PIN no se guardó
    }

    @Test
    @DisplayName("PIN-UPSERT-2 | control: sin la falla simulada el mismo pedido sí llega al .p12 (PIN incorrecto → 400): el 503 salía del UPSERT")
    void control_sinFalla_abreElP12() throws Exception {
        fallarSoloElUpsertDeLaReserva();
        assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(503);
        verify(supabaseStorageService, never()).leerPrivado(anyString());

        reset(jdbcSpy);
        assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(400);
        verify(supabaseStorageService).leerPrivado(anyString());
    }
}
