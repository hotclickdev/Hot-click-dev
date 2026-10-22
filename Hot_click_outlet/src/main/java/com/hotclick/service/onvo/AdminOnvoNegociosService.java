package com.hotclick.service.onvo;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MetodoCobro;
import com.hotclick.model.NegocioOnvoCuenta;
import com.hotclick.repository.AdminOnvoNegocioFila;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.repository.NegocioOnvoCuentaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * S2-29 / S3-22 (lectura, Frontend #173): lista y ficha del admin de cuentas ONVO de los negocios.
 * El IBAN solo sale enmascarado ("•••• 1234"). No llama a ONVO: la conciliación queda en SIN_DATOS
 * hasta que exista la sincronización con ONVO.
 */
@Service
public class AdminOnvoNegociosService {

    public static final String CODIGO_ESTADO_INVALIDO = "ESTADO_INVALIDO";
    static final Set<String> ESTADOS = Set.of("SIN_CUENTA", "ONBOARDING_PENDIENTE", "EN_REVISION", "ACTIVA",
        "PAUSADA", "SUSPENDIDA");
    static final String SIN_DATOS = "SIN_DATOS";
    public static final int MAX_POR_PAGINA = 200;

    private final NegocioOnvoCuentaRepository cuentaRepository;
    private final EmpresaRepository empresaRepository;
    private final MetodoCobroRepository metodoCobroRepository;
    private final CuentaOnvoNegocioService cuentaService;

    public AdminOnvoNegociosService(NegocioOnvoCuentaRepository cuentaRepository, EmpresaRepository empresaRepository,
                                    MetodoCobroRepository metodoCobroRepository, CuentaOnvoNegocioService cuentaService) {
        this.cuentaRepository = cuentaRepository;
        this.empresaRepository = empresaRepository;
        this.metodoCobroRepository = metodoCobroRepository;
        this.cuentaService = cuentaService;
    }

    /** @throws IllegalArgumentException si {@code estado} no es del enum. */
    @Transactional(readOnly = true)
    public Map<String, Object> listar(String estado, int page, int size) {
        String filtro = normalizarEstado(estado);
        int tam = Math.max(1, Math.min(size, MAX_POR_PAGINA));
        Page<AdminOnvoNegocioFila> filas = cuentaRepository.listarParaAdmin(cuentaService.modo(), filtro,
            PageRequest.of(Math.max(0, page), tam));
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("conciliadoEl", null);
        r.put("negocios", filas.getContent().stream().map(AdminOnvoNegociosService::fila).toList());
        r.put("total", filas.getTotalElements());
        r.put("pagina", filas.getNumber());
        r.put("tamano", filas.getSize());
        return r;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detalle(Long empresaId) {
        Empresa e = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Negocio no encontrado"));
        NegocioOnvoCuenta c = cuentaService.cuentaDe(empresaId).orElse(null);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("nombre", e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa());
        m.put("plan", e.getPlan() != null ? e.getPlan().getNombre() : null);
        m.put("porcentajeOnvo", c != null ? c.getPctComision() : null);
        m.put("porcentajePlan", e.getPlan() != null ? e.getPlan().getComisionPorcentaje() : null);
        m.put("estado", e.isCobrosPausados() ? "PAUSADA"
            : (c != null ? c.getEstado() : NegocioOnvoCuenta.ESTADO_SIN_CUENTA));
        m.put("conciliacion", SIN_DATOS);
        m.put("correo", e.getCorreoEmpresa());
        m.put("cuentaOnvo", c != null ? c.getOnvoAccountId() : null);
        m.put("ibanEnmascarado", ibanEnmascarado(empresaId));
        m.put("frecuencia", c != null ? c.getFrecuenciaLiquidacion() : null);
        m.put("frecuenciaPendiente", c != null ? c.getFrecuenciaPendiente() : null);
        return m;
    }

    private static Map<String, Object> fila(AdminOnvoNegocioFila f) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", f.getId());
        m.put("nombre", f.getNombre());
        m.put("plan", f.getPlan());
        m.put("porcentajeOnvo", f.getPorcentajeOnvo());
        m.put("porcentajePlan", f.getPorcentajePlan());
        m.put("estado", f.getEstado());
        m.put("conciliacion", SIN_DATOS);
        return m;
    }

    /** IBAN de cobro del negocio (predeterminado primero), solo los últimos 4: nunca el número completo. */
    private String ibanEnmascarado(Long empresaId) {
        List<MetodoCobro> metodos = metodoCobroRepository.findActivosByEmpresaId(empresaId);
        return metodos.stream()
            .filter(mc -> MetodoCobro.TIPO_IBAN.equals(mc.getTipo()))
            .min(Comparator.comparing(mc -> !mc.isPredeterminado()))
            .map(mc -> enmascararIban(mc.getDestino()))
            .orElse(null);
    }

    static String enmascararIban(String iban) {
        if (iban == null) return null;
        String limpio = iban.replaceAll("\\s", "");
        return limpio.length() < 8 ? "••••" : "•••• " + limpio.substring(limpio.length() - 4);
    }

    static String normalizarEstado(String estado) {
        if (estado == null || estado.isBlank()) return null;
        String e = estado.trim().toUpperCase(Locale.ROOT);
        if (!ESTADOS.contains(e)) throw new IllegalArgumentException("Estado inválido. Valores: " + String.join(", ", ESTADOS));
        return e;
    }
}
