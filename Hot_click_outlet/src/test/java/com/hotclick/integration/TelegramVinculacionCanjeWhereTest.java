package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** Predicados del UPDATE condicional {@code canjearCodigo} contra la base real del perfil test. */
@DisplayName("canjearCodigo: el WHERE exige el código vigente y estado <> REVOCADA")
class TelegramVinculacionCanjeWhereTest extends BaseIntegrationTest {

    @Autowired private TelegramVinculacionRepository repo;
    @Autowired private EmpresaRepository empresas;

    private Usuario u;
    private Empresa e;

    @BeforeEach
    void setUp() {
        e = new Empresa();
        e.setNombreEmpresa("canje-where"); e.setSlug("canje-where"); e.setCorreoEmpresa("canje-where@test.invalid");
        e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        e = empresas.saveAndFlush(e);
        u = crearUsuario("canje-where@test.invalid", "W", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, e, "PROPIETARIO"));
    }

    @AfterEach
    void limpiar() {
        repo.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(x -> { x.setEmpresa(null); usuarioRepository.save(x); });
        empresas.deleteAll();
    }

    private TelegramVinculacion fila(String estado, String codigo) {
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setEstado(estado);
        v.setCodigo(codigo);
        v.setCodigoExpira(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(5)); // vigente
        return repo.saveAndFlush(v);
    }

    @Test
    @DisplayName("N3: el código de la fila ya no es el canjeado (se regeneró entre el find y el UPDATE) → 0 filas, sigue sin ACTIVA")
    void codigoRegeneradoNoCanjea() {
        TelegramVinculacion v = fila(TelegramVinculacion.PENDIENTE, "NUEVO2345"); // el viejo "VIEJO2345" ya no existe

        int filas = repo.canjearCodigo(v.getId(), "VIEJO2345", 555L, "alguien", LocalDateTime.now(Constants.ZONA_CR));

        assertThat(filas).isZero();
        TelegramVinculacion r = repo.findById(v.getId()).orElseThrow();
        assertThat(r.getEstado()).isEqualTo(TelegramVinculacion.PENDIENTE);
        assertThat(r.getChatId()).isNull();
        assertThat(r.getCodigo()).isEqualTo("NUEVO2345");
    }

    @Test
    @DisplayName("M3: REVOCADA con código y vencimiento aún vigentes → 0 filas (solo lo impide estado <> 'REVOCADA')")
    void revocadaConCodigoVigenteNoCanjea() {
        TelegramVinculacion v = fila(TelegramVinculacion.REVOCADA, "ABCD2345");

        int filas = repo.canjearCodigo(v.getId(), "ABCD2345", 555L, "alguien", LocalDateTime.now(Constants.ZONA_CR));

        assertThat(filas).isZero();
        TelegramVinculacion r = repo.findById(v.getId()).orElseThrow();
        assertThat(r.getEstado()).isEqualTo(TelegramVinculacion.REVOCADA);
        assertThat(r.getChatId()).isNull();
    }

    @Test
    @DisplayName("control: PENDIENTE con el código vigente sí canjea (1 fila) y queda ACTIVA sin código")
    void pendienteVigenteCanjea() {
        TelegramVinculacion v = fila(TelegramVinculacion.PENDIENTE, "ABCD2345");

        int filas = repo.canjearCodigo(v.getId(), "ABCD2345", 555L, "alguien", LocalDateTime.now(Constants.ZONA_CR));

        assertThat(filas).isEqualTo(1);
        TelegramVinculacion r = repo.findById(v.getId()).orElseThrow();
        assertThat(r.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA);
        assertThat(r.getChatId()).isEqualTo(555L);
        assertThat(r.getCodigo()).isNull();
    }
}
