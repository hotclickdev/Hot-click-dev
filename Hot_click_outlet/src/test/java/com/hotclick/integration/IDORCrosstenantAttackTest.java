package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * [SEGURIDAD] IDOR Cross-Tenant Attack — Emprendedor A ataca recursos de Empresa B.
 *
 * Verifica que los guards de tenant isolation en GastoController y EquipoController
 * rechazan correctamente el acceso a recursos de otros tenants.
 *
 * Superficies de ataque cubiertas:
 *   IDOR-01  EmprendedorA PUT  /api/gastos/{gastoB}              → 403
 *   IDOR-02  EmprendedorA DELETE /api/gastos/{gastoB}            → 403
 *   IDOR-03  EmprendedorA PUT  /api/empresa/equipo/{memberB}/rol → 404
 *   IDOR-04  EmprendedorA DELETE /api/empresa/equipo/{memberB}   → 403
 *   IDOR-05  EmprendedorA PUT  /api/gastos/{gastoA}  → 200 (control positivo)
 *   IDOR-06  EmprendedorA DELETE /api/gastos/{gastoA2} → 200 (control positivo)
 *   IDOR-07  EmprendedorA PUT  /api/empresa/equipo/{memberA}/rol → 200 (control positivo)
 *   IDOR-08  ADMIN_IT PUT /api/gastos/{gastoB} → 200 (bypass por empresaId=null en JWT)
 *   IDOR-09  EmprendedorB DELETE /api/gastos/{gastoA}  → 403 (ataque inverso B→A)
 */
@DisplayName("[SEGURIDAD] IDOR Cross-Tenant — Emprendedor A ataca recursos de Empresa B")
class IDORCrosstenantAttackTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private GastoRepository     gastoRepository;

    private Empresa  empresaA, empresaB;
    private Usuario  emprendedorA, emprendedorB, miembroA, miembroB;
    private String   tokenA, tokenB;
    private Gasto    gastoA, gastoA2, gastoB;

    @BeforeEach
    void setUp() {
        Rol rolEmp        = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR,   5);
        Rol rolAdminCliente = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 2);

        empresaA = crearEmpresa("IDOR-Alpha", "idor-alpha-" + System.nanoTime());
        empresaB = crearEmpresa("IDOR-Beta",  "idor-beta-"  + System.nanoTime());

        emprendedorA = crearEmprendedorConEmpresa("idor-a@test.cr", "Empr IDOR-A", rolEmp, empresaA);
        emprendedorB = crearEmprendedorConEmpresa("idor-b@test.cr", "Empr IDOR-B", rolEmp, empresaB);

        tokenA = "Bearer " + jwtUtil.generateToken(
            emprendedorA.getCorreo(), emprendedorA.getId(),
            Constants.ROL_EMPRENDEDOR, empresaA.getId(), empresaA.getSlug());
        tokenB = "Bearer " + jwtUtil.generateToken(
            emprendedorB.getCorreo(), emprendedorB.getId(),
            Constants.ROL_EMPRENDEDOR, empresaB.getId(), empresaB.getSlug());

        // Miembro del equipo de empresa A (gestionable por emprendedorA)
        miembroA = crearUsuario("miembro-a@test.cr", "Miembro A", rolAdminCliente);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(miembroA, empresaA, "EDITOR"));

        // Miembro del equipo de empresa B (víctima del ataque IDOR)
        miembroB = crearUsuario("miembro-b@test.cr", "Miembro B", rolAdminCliente);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(miembroB, empresaB, "EDITOR"));

        gastoA  = crearGasto("Gasto A principal", empresaA);
        gastoA2 = crearGasto("Gasto A secundario", empresaA);
        gastoB  = crearGasto("Gasto B víctima",   empresaB);
    }

    @AfterEach
    void tearDown() {
        gastoRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── IDOR-01: EmprendedorA PUT gasto de EmpresaB → 403 ───────────────────

    @Test
    @DisplayName("IDOR-01 | CRÍTICO — EmprendedorA PUT gasto de EmpresaB → 403 (tenant isolation)")
    void emprendedorA_putGasoB_denegado403() throws Exception {
        mockMvc.perform(put("/api/gastos/" + gastoB.getId())
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"concepto\":\"Intento de modificación cross-tenant\",\"monto\":99999}"))
            .andExpect(status().isForbidden());
    }

    // ── IDOR-02: EmprendedorA DELETE gasto de EmpresaB → 403 ────────────────

    @Test
    @DisplayName("IDOR-02 | CRÍTICO — EmprendedorA DELETE gasto de EmpresaB → 403 (tenant isolation)")
    void emprendedorA_deleteGastoB_denegado403() throws Exception {
        mockMvc.perform(delete("/api/gastos/" + gastoB.getId())
                .header("Authorization", tokenA))
            .andExpect(status().isForbidden());

        // El gasto no debe haber sido eliminado
        assertThat(gastoRepository.findById(gastoB.getId())).isPresent();
    }

    // ── IDOR-03: EmprendedorA cambia rol de miembro de EmpresaB → 404 ────────

    @Test
    @DisplayName("IDOR-03 | CRÍTICO — EmprendedorA PUT /equipo/{memberB}/rol → 404 (no pertenece al equipo)")
    void emprendedorA_cambiarRolMiembroB_retorna404() throws Exception {
        mockMvc.perform(put("/api/empresa/equipo/" + miembroB.getId() + "/rol")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rolEnEmpresa\":\"LECTOR\"}"))
            .andExpect(status().isNotFound());
    }

    // ── IDOR-04: EmprendedorA elimina miembro de EmpresaB → 403 ─────────────

    @Test
    @DisplayName("IDOR-04 | CRÍTICO — EmprendedorA DELETE /equipo/{memberB} → 403 (no pertenece al equipo)")
    void emprendedorA_eliminarMiembroB_retorna403() throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + miembroB.getId())
                .header("Authorization", tokenA))
            .andExpect(status().isForbidden());

        // La membresía de miembroB en empresaB sigue activa
        assertThat(miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndEstado(miembroB.getId(), empresaB.getId(), 1))
            .isPresent();
    }

    // ── IDOR-05: EmprendedorA modifica su propio gasto → 200 (control positivo)

    @Test
    @DisplayName("IDOR-05 | HIGH — EmprendedorA PUT su propio gasto → 200 (acceso legítimo permitido)")
    void emprendedorA_putGastoA_exitoso200() throws Exception {
        mockMvc.perform(put("/api/gastos/" + gastoA.getId())
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"concepto\":\"Gasto actualizado legítimamente\",\"monto\":5000}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── IDOR-06: EmprendedorA elimina su propio gasto → 200 (control positivo)

    @Test
    @DisplayName("IDOR-06 | HIGH — EmprendedorA DELETE su propio gasto → 200 (acceso legítimo permitido)")
    void emprendedorA_deleteGastoA2_exitoso200() throws Exception {
        mockMvc.perform(delete("/api/gastos/" + gastoA2.getId())
                .header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── IDOR-07: EmprendedorA cambia rol de su propio miembro → 200 (control positivo)

    @Test
    @DisplayName("IDOR-07 | HIGH — EmprendedorA PUT /equipo/{memberA}/rol → 200 (acceso legítimo)")
    void emprendedorA_cambiarRolMiembroA_exitoso200() throws Exception {
        mockMvc.perform(put("/api/empresa/equipo/" + miembroA.getId() + "/rol")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rolEnEmpresa\":\"LECTOR\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── IDOR-08: ADMIN_IT modifica gasto de cualquier empresa → 200 (bypass admin)

    @Test
    @DisplayName("IDOR-08 | MEDIUM — ADMIN_IT PUT gasto de EmpresaB → 200 (empresaId=null en JWT, guard no aplica)")
    void adminIt_putGastoB_exitoso200_bypass() throws Exception {
        mockMvc.perform(put("/api/gastos/" + gastoB.getId())
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"concepto\":\"Revisión admin\",\"monto\":1000}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── IDOR-09: EmprendedorB elimina gasto de EmpresaA → 403 (ataque inverso) ─

    @Test
    @DisplayName("IDOR-09 | CRÍTICO — EmprendedorB DELETE gasto de EmpresaA → 403 (protección bidireccional)")
    void emprendedorB_deleteGastoA_denegado403() throws Exception {
        mockMvc.perform(delete("/api/gastos/" + gastoA.getId())
                .header("Authorization", tokenB))
            .andExpect(status().isForbidden());

        assertThat(gastoRepository.findById(gastoA.getId())).isPresent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Empresa crearEmpresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug.substring(0, Math.min(slug.length(), 30)) + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario crearEmprendedorConEmpresa(String correo, String nombre, Rol rol, Empresa empresa) {
        Usuario u = crearUsuario(correo, nombre, rol);
        u.setEmpresa(empresa);
        return usuarioRepository.saveAndFlush(u);
    }

    private Gasto crearGasto(String concepto, Empresa empresa) {
        Gasto g = new Gasto();
        g.setConcepto(concepto);
        g.setMonto(10000);
        g.setEmpresa(empresa);
        return gastoRepository.saveAndFlush(g);
    }
}
