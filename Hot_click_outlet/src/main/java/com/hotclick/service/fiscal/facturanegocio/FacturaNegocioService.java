package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.FacturaNegocio;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaNegocioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.fiscal.CedulaFiscal;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioCalculo.Periodo;
import com.hotclick.service.hacienda.CedulaEmisor;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Lado del negocio: "Mi dinero → Factura a HotClick". Ve cuánto le debe facturar, sube el XML y ve el resultado.
 * La empresa sale siempre de la sesión (CompanyScope) y un registro de otro negocio responde 404.
 */
@Service
public class FacturaNegocioService {

    private static final Logger log = LoggerFactory.getLogger(FacturaNegocioService.class);

    static final int MAX_SUBIDAS_DIA = 10;
    static final int VENTANA_SEG = 24 * 60 * 60;
    static final int MAX_HISTORIAL = 24;
    static final String REGIMEN_TRADICIONAL = "TRADICIONAL";
    static final Set<String> ESTADOS_SUBIBLES = Set.of(FacturaNegocio.PENDIENTE, FacturaNegocio.RECHAZADA, FacturaNegocio.VENCIDA);
    public static final String MENSAJE_NO_APLICA = "No te corresponde facturar: ya pagás el recargo del 14 %.";
    static final String AVISO_SIN_RESPUESTA = "No subiste la respuesta de Hacienda. Revisá en tu sistema de facturación "
        + "que Hacienda haya aceptado esta factura.";

    /** Límite diario de subidas alcanzado. */
    public static class LimiteSubidasException extends RuntimeException {
        public LimiteSubidasException() { super("Ya subiste varias facturas hoy. Intentá de nuevo mañana."); }
    }

    private final FacturaNegocioRepository repo;
    private final EmpresaRepository empresas;
    private final CompanyScope companyScope;
    private final RateLimiter rateLimiter;
    private final FacturaNegocioXmlValidador validador;
    private final FacturaNegocioMontoService montos;
    private final ConfiguracionFiscalService config;
    private final SupabaseStorageService storage;
    private final ApplicationEventPublisher eventos;
    private final AuditoriaAdminRegistroService auditoria;

    public FacturaNegocioService(FacturaNegocioRepository repo, EmpresaRepository empresas, CompanyScope companyScope,
                                 RateLimiter rateLimiter, FacturaNegocioXmlValidador validador,
                                 FacturaNegocioMontoService montos, ConfiguracionFiscalService config,
                                 SupabaseStorageService storage, ApplicationEventPublisher eventos,
                                 AuditoriaAdminRegistroService auditoria) {
        this.repo = repo;
        this.empresas = empresas;
        this.companyScope = companyScope;
        this.rateLimiter = rateLimiter;
        this.validador = validador;
        this.montos = montos;
        this.config = config;
        this.storage = storage;
        this.eventos = eventos;
        this.auditoria = auditoria;
    }

    /** Pantalla del negocio: si le corresponde facturar, lo pendiente, la quincena en curso, el receptor y el historial. */
    public Map<String, Object> resumen(Long empresaId) {
        Empresa e = cargarEmpresa(empresaId);
        LocalDate hoy = LocalDate.now(Constants.ZONA_CR);
        boolean tradicional = tradicional();
        boolean aplica = FacturaNegocioCalculo.leCorrespondeFacturar(e.getSituacionFiscal(), e.isFiscalVerificado());
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("leCorrespondeFacturar", aplica);
        if (!aplica) m.put("mensajeNoAplica", MENSAJE_NO_APLICA);
        List<FacturaNegocio> registros = repo.findByEmpresaIdOrderByPeriodoDesdeDesc(e.getId(), PageRequest.of(0, MAX_HISTORIAL))
            .getContent();
        List<Map<String, Object>> historial = FacturaNegocioVista.lista(registros, hoy, tradicional);
        m.put("pendiente", FacturaNegocioVista.primeraPorSubir(historial, ESTADOS_SUBIBLES).orElse(null));
        m.put("historial", historial);
        Periodo actual = FacturaNegocioCalculo.quincenaDe(hoy);
        FacturaNegocioMontoService.Monto enCurso = montos.calcular(e.getId(), actual, config.reglasFactura().base());
        Map<String, Object> curso = new LinkedHashMap<>();
        curso.put("periodoDesde", actual.desde());
        curso.put("periodoHasta", actual.hasta());
        curso.put("montoCrc", enCurso.monto());
        curso.put("base", enCurso.base());
        curso.put("fechaLimite", FacturaNegocioCalculo.fechaLimite(actual.hasta(), config.reglas().diasEnviarFactura()));
        curso.put("desglose", enCurso.desglose());
        m.put("quincenaEnCurso", curso);
        m.put("receptor", receptorHotclick());
        m.put("diasParaFacturar", config.reglas().diasEnviarFactura());
        m.put("regimenHotclick", config.reglas().regimen());
        return m;
    }

    /**
     * Sube el XML de la factura (y, opcional, la respuesta de Hacienda) y lo revisa. Queda ACEPTADA o RECHAZADA con los
     * motivos. Solo el propietario (lo exige el controlador). Sin @Transactional: el archivo se guarda en el
     * almacenamiento antes de escribir en la base.
     */
    public Map<String, Object> subirXml(Long empresaId, Long facturaId, byte[] xml, byte[] respuestaHacienda) {
        Empresa e = cargarEmpresa(empresaId);
        FacturaNegocio f = cargarSubible(e.getId(), facturaId);
        if (!rateLimiter.tryAcquireEstricto("empresa:" + e.getId() + ":factura-negocio:xml", MAX_SUBIDAS_DIA, VENTANA_SEG)) {
            throw new LimiteSubidasException();
        }
        ConfiguracionFiscalService.ReglasFactura reglas = config.reglasFactura();
        FacturaNegocioXmlValidador.Resultado r = validador.validar(xml, new FacturaNegocioXmlValidador.Esperado(
            CedulaFiscal.normalizar(e.getCedulaFiscal()), cedulaHotclick(), f.getMontoCrc(), reglas.toleranciaCrc(),
            clave -> repo.existsByClaveXmlAndIdNot(clave, f.getId())));
        List<String> errores = new ArrayList<>(r.errores());
        List<String> avisos = new ArrayList<>(r.avisos());
        boolean conRespuesta = respuestaHacienda != null && respuestaHacienda.length > 0;
        String estadoRespuesta = revisarRespuesta(conRespuesta ? respuestaHacienda : null, r.clave(), errores, avisos);
        boolean aceptada = errores.isEmpty();
        String base = "facturas-negocio/" + e.getId() + "/" + f.getId() + "-" + System.currentTimeMillis();
        String xmlPath = guardar(xml, base + ".xml");
        String respuestaPath = conRespuesta ? guardar(respuestaHacienda, base + "-respuesta.xml") : null;

        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        f.setEstado(aceptada ? FacturaNegocio.ACEPTADA : FacturaNegocio.RECHAZADA);
        // La clave solo se fija al aceptar: el índice único impide usar la misma factura dos veces.
        f.setClaveXml(aceptada ? r.clave() : null);
        f.setCedulaEmisor(cedulaCorta(r.cedulaEmisor()));
        f.setTotalFacturaCrc(r.totalComprobanteCrc());
        f.setTotalIvaCrc(r.totalImpuestoCrc());
        f.setXmlPath(xmlPath);
        f.setXmlRespuestaPath(respuestaPath);
        f.setRespuestaHaciendaEstado(estadoRespuesta);
        f.setMensajeValidacion(FacturaNegocioVista.empaquetar(errores, avisos));
        f.setFechaRecibida(ahora);
        f.setFechaActualizacion(ahora);
        if (aceptada) aplicarMensajeReceptor(f, reglas);
        FacturaNegocio guardada = repo.save(f);
        auditoria.registrar("FACTURA_NEGOCIO_SUBIDA", "FACTURA_NEGOCIO", guardada.getId(), e.getId(), guardada.getEstado());
        if (aceptada) eventos.publishEvent(new FacturaNegocioRecibidaEvent(e.getId()));
        return FacturaNegocioVista.negocio(guardada, LocalDate.now(Constants.ZONA_CR), tradicional());
    }

    private FacturaNegocio cargarSubible(Long empresaId, Long facturaId) {
        FacturaNegocio f = repo.findByIdAndEmpresaId(facturaId, empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Factura no encontrada"));
        if (FacturaNegocio.NO_APLICA.equals(f.getEstado())) throw new IllegalStateException(MENSAJE_NO_APLICA);
        if (!ESTADOS_SUBIBLES.contains(f.getEstado())) {
            throw new IllegalStateException("Esta quincena ya tiene una factura aceptada.");
        }
        return f;
    }

    /** Respuesta de Hacienda opcional: si viene, tiene que decir aceptado y ser de esta clave; si no, queda un aviso. */
    static String revisarRespuesta(byte[] respuesta, String clave, List<String> errores, List<String> avisos) {
        if (respuesta == null) {
            avisos.add(AVISO_SIN_RESPUESTA);
            return null;
        }
        MensajeHaciendaValidador.Resultado mh = MensajeHaciendaValidador.validar(respuesta, clave);
        if (!mh.aceptado()) errores.add(mh.error());
        return mh.estado();
    }

    private static String cedulaCorta(String cedula) {
        return cedula != null && cedula.length() <= 12 ? cedula : null;
    }

    /**
     * Mensaje receptor (aceptación ante Hacienda). En RTS no se envía: la factura queda aceptada internamente. En
     * tradicional se guarda el plazo legal; con el interruptor apagado no se envía nada, y encendido igual queda
     * bloqueado mientras no exista el XSD oficial de MensajeReceptor 4.4 en el repo.
     */
    void aplicarMensajeReceptor(FacturaNegocio f, ConfiguracionFiscalService.ReglasFactura reglas) {
        if (!tradicional()) {
            f.setMensajeReceptorEstado(MensajeReceptorCodigos.ESTADO_ACEPTADA_INTERNA);
            f.setMensajeReceptorDetalle("HotClick está en el Régimen Simplificado: no se envía mensaje receptor.");
            return;
        }
        f.setFechaLimiteMensajeReceptor(FacturaNegocioCalculo.plazoMensajeReceptor(f.getPeriodoHasta()));
        if (!reglas.mensajeReceptorHabilitado()) {
            f.setMensajeReceptorEstado(MensajeReceptorCodigos.ESTADO_NO_ENVIADO_INTERRUPTOR);
            f.setMensajeReceptorDetalle("El envío del mensaje receptor está apagado en la configuración fiscal.");
        } else if (!MensajeReceptorCodigos.XSD_DISPONIBLE) {
            f.setMensajeReceptorEstado(MensajeReceptorCodigos.ESTADO_BLOQUEADO_SIN_XSD);
            f.setMensajeReceptorDetalle("No hay XSD oficial de MensajeReceptor 4.4: el envío queda bloqueado.");
        }
        f.setMensajeReceptorFecha(LocalDateTime.now(Constants.ZONA_CR));
    }

    /** Datos de HotClick como receptor, para que el negocio arme la factura. Sin cédula configurada, va null. */
    Map<String, Object> receptorHotclick() {
        Map<String, Object> m = new LinkedHashMap<>();
        Empresa p = empresas.findById(Constants.EMPRESA_PLATAFORMA_ID).orElse(null);
        m.put("nombre", p == null ? "HotClick" : nombre(p));
        m.put("tipoIdentificacion", p == null ? null : p.getTipoCedula());
        m.put("cedula", cedulaDe(p));
        m.put("correo", p == null ? null : p.getCorreoEmpresa());
        return m;
    }

    String cedulaHotclick() {
        return cedulaDe(empresas.findById(Constants.EMPRESA_PLATAFORMA_ID).orElse(null));
    }

    private static String cedulaDe(Empresa p) {
        if (p == null) return null;
        try {
            return CedulaEmisor.normalizar(p.getCedulaJuridica());
        } catch (HaciendaConfiguracionException ex) {
            return null;
        }
    }

    private static String nombre(Empresa p) {
        if (p.getNombreHacienda() != null && !p.getNombreHacienda().isBlank()) return p.getNombreHacienda();
        return p.getNombreComercialFe();
    }

    private String guardar(byte[] bytes, String clave) {
        try {
            return storage.subirXmlPrivado(bytes, clave);
        } catch (RuntimeException ex) {
            log.error("[factura-negocio] no se pudo guardar el XML: {}", ex.getClass().getSimpleName());
            throw new IllegalStateException("No pudimos guardar el archivo. Intentá de nuevo en unos minutos.");
        }
    }

    private boolean tradicional() {
        return REGIMEN_TRADICIONAL.equals(config.reglas().regimen());
    }

    private Empresa cargarEmpresa(Long empresaId) {
        Empresa e = empresas.findById(empresaId)
            .orElseThrow(() -> RecursoNoEncontradoException.conDetalle("Empresa no encontrada", "empresaId=" + empresaId));
        companyScope.assertCanAccess(e.getId());
        return e;
    }
}
