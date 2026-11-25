package com.hotclick.agente.campana;

import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Estado;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conexion.MetaGraphCliente;
import com.hotclick.agente.cupo.AgenteBajaService;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.TotpSecretEncryptionService;
import com.hotclick.service.tenant.TenantInfoBuilder;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.Timestamp;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Piezas reales sobre H2 y Meta/canal de mentira (Mockito): ninguna prueba llama a Meta. */
abstract class CampanaFixture {

    static final Long EMPRESA = 1L;
    static final Long OTRA = 2L;
    static final String TEL_ANA = "50688880001";
    static final String TEL_LUIS = "50688880002";

    final JdbcTemplate jdbc = CampanaTestSupport.baseH2();
    final CampanaConfig config;
    final TotpSecretEncryptionService cifrado = CampanaTestSupport.cifrado();
    final ConsentimientoRepositorio consRepo = new ConsentimientoRepositorio(jdbc);
    final CampanaRepositorio campRepo = new CampanaRepositorio(jdbc);
    final PlantillaCampanaRepositorio plRepo = new PlantillaCampanaRepositorio(jdbc);
    final AgenteBajaService bajas = new AgenteBajaService(jdbc, CampanaTestSupport.HASHER);
    final CanalCuentaService cuentas = mock(CanalCuentaService.class);
    final CanalMensajeria canal = mock(CanalMensajeria.class);
    final MetaGraphCliente graph = mock(MetaGraphCliente.class);
    final EmpresaRepository empresas = mock(EmpresaRepository.class);
    final TenantInfoBuilder planes = mock(TenantInfoBuilder.class);
    final PlantillaCampanaService plantillas;
    final ConsentimientoService consentimientos;
    final SegmentoService segmentos;
    final CanalCuenta cuentaWa = CampanaTestSupport.cuenta(EMPRESA);

    CampanaFixture() {
        this(CampanaTestSupport.config(2, 100));
    }

    CampanaFixture(CampanaConfig config) {
        this.config = config;
        this.plantillas = new PlantillaCampanaService(plRepo, cuentas, graph, config);
        this.consentimientos = new ConsentimientoService(consRepo, CampanaTestSupport.HASHER, cifrado, bajas, config);
        this.segmentos = new SegmentoService(new SegmentoRepositorio(jdbc), consRepo, CampanaTestSupport.HASHER, cifrado);
        Plan plan = new Plan();
        plan.setNombre("PYME");
        Empresa e = new Empresa();
        e.setPlan(plan);
        when(empresas.findByIdWithPlan(any())).thenReturn(Optional.of(e));
        when(planes.planTiene(any(), eq("agente"))).thenReturn(true);
        when(cuentas.activaDe(EMPRESA, Canal.WHATSAPP)).thenReturn(Optional.of(cuentaWa));
        when(cuentas.tokenDe(cuentaWa)).thenReturn("tok-prueba");
    }

    CampanaEnvioService envio() {
        return new CampanaEnvioService(campRepo, consRepo, plantillas, bajas, cuentas, canal, cifrado, empresas, planes, config);
    }

    CampanaService campanas() {
        return new CampanaService(campRepo, plantillas, segmentos, bajas, cuentas, empresas, planes, config);
    }

    /** Opt-in del botón del bot. */
    void consiente(Long empresa, String tel, String nombre) {
        consentimientos.registrarDesdeBoton(empresa, "WHATSAPP", tel, nombre, "wamid.optin-" + tel);
    }

    long plantilla(Long empresa, Estado estado) {
        return plRepo.insertar(empresa, "promo_" + estado.name().toLowerCase(java.util.Locale.ROOT), "es",
            "Hola {{1}}, tenemos ofertas para vos", "[\"Ana\"]", estado, "meta-" + estado, CampanaTestSupport.AHORA);
    }

    /** Campaña EN_CURSO con un envío PENDIENTE por contacto (aunque no tengan consentimiento). */
    long campanaEnCurso(Long empresa, long plantillaId, String... telefonos) {
        long id = campRepo.insertar(empresa, plantillaId, "Oferta", new Segmento(Segmento.Tipo.TODOS, null, null),
            "[\"{nombre}\"]", null, 9L, CampanaTestSupport.AHORA);
        campRepo.lanzar(empresa, id, telefonos.length, java.math.BigDecimal.ZERO, CampanaTestSupport.AHORA);
        campRepo.crearEnvios(id, empresa, List.of(telefonos).stream().map(t -> CampanaTestSupport.hash(empresa, t)).toList(),
            CampanaTestSupport.AHORA);
        return id;
    }

    String estadoEnvio(long campanaId, Long empresa, String tel) {
        return jdbc.queryForObject("SELECT estado FROM hot_click_agente_campana_envio_tb WHERE fk_id_campana = ? "
            + "AND contacto_hash = ?", String.class, campanaId, CampanaTestSupport.hash(empresa, tel));
    }

    String motivoEnvio(long campanaId, Long empresa, String tel) {
        return jdbc.queryForObject("SELECT motivo FROM hot_click_agente_campana_envio_tb WHERE fk_id_campana = ? "
            + "AND contacto_hash = ?", String.class, campanaId, CampanaTestSupport.hash(empresa, tel));
    }

    String estadoCampana(long id) {
        return jdbc.queryForObject("SELECT estado FROM hot_click_agente_campana_tb WHERE id_campana = ?", String.class, id);
    }

    /** Un envío ya hecho {@code hace} atrás, de otra campaña (cuenta para los topes). */
    void envioPrevio(Long empresa, String tel, Duration hace) {
        jdbc.update("INSERT INTO hot_click_agente_campana_envio_tb (fk_id_campana, fk_id_empresa, contacto_hash, estado, "
            + "enviado_en) VALUES (?,?,?,'ENVIADO',?)", 999L + Math.abs(tel.hashCode() % 1000) + hace.toMinutes(), empresa,
            CampanaTestSupport.hash(empresa, tel), Timestamp.from(CampanaTestSupport.AHORA.minus(hace)));
    }
}
