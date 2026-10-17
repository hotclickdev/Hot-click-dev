package com.hotclick.service.onvo;

import com.hotclick.model.Empresa;
import com.hotclick.model.NegocioOnvoCuenta;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.NegocioOnvoCuentaRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * S3-06 / S3-11 / S3-15 (lectura): estado de la cuenta ONVO del negocio y frecuencia de liquidación.
 * No llama a ONVO: la API de ONVO no permite fijar la frecuencia, así que con cuenta creada el cambio
 * queda «pendiente» para que el admin lo aplique a mano.
 */
@Service
public class CuentaOnvoNegocioService {

    static final String PROVEEDOR = "ONVO";
    static final Set<String> FRECUENCIAS = Set.of(NegocioOnvoCuenta.FRECUENCIA_QUINCENAL, NegocioOnvoCuenta.FRECUENCIA_MENSUAL);

    private final NegocioOnvoCuentaRepository repo;
    private final EmpresaRepository empresaRepository;
    private final String modo;

    public CuentaOnvoNegocioService(NegocioOnvoCuentaRepository repo, EmpresaRepository empresaRepository,
                                    @Value("${hotclick.onvo.modo:TEST}") String modo) {
        this.repo = repo;
        this.empresaRepository = empresaRepository;
        String m = modo == null ? "" : modo.trim().toUpperCase(Locale.ROOT);
        this.modo = "LIVE".equals(m) ? "LIVE" : "TEST";
    }

    @Transactional(readOnly = true)
    public Map<String, Object> estado(Long empresaId) {
        NegocioOnvoCuenta c = cuenta(empresaId).orElse(null);
        Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
        boolean pausadaPorHotClick = empresa != null && empresa.isCobrosPausados();
        Map<String, Object> m = new LinkedHashMap<>();
        String estadoCuenta = c != null ? c.getEstado() : NegocioOnvoCuenta.ESTADO_SIN_CUENTA;
        m.put("estado", pausadaPorHotClick ? "PAUSADA" : estadoCuenta);
        m.put("frecuencia", c != null ? c.getFrecuenciaLiquidacion() : null);
        m.put("pausadaEl", pausadaPorHotClick && empresa.getCobrosPausadosEl() != null
            ? empresa.getCobrosPausadosEl().atZone(com.hotclick.utils.Constants.ZONA_CR).toOffsetDateTime().toString() : null);
        m.put("motivoPausa", pausadaPorHotClick ? empresa.getCobrosPausaMotivo() : null);
        return m;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> frecuencia(Long empresaId) {
        return frecuenciaDe(cuenta(empresaId).orElse(null));
    }

    /** Código estable (Frontend #170) para frecuencia ausente o inválida. */
    public static final String CODIGO_FRECUENCIA_INVALIDA = "FRECUENCIA_INVALIDA";

    /**
     * Decisión del dueño: no hay frecuencia por defecto; el negocio elige QUINCENAL o MENSUAL y es obligatorio.
     * Usar también en el alta del negocio cuando el registro la pida.
     *
     * @return la frecuencia normalizada (QUINCENAL | MENSUAL)
     * @throws IllegalArgumentException si falta, viene vacía o no es QUINCENAL ni MENSUAL.
     */
    public static String exigirFrecuencia(Object valor) {
        if (!(valor instanceof String texto) || texto.isBlank()) {
            throw new IllegalArgumentException("La frecuencia de liquidación es obligatoria: QUINCENAL o MENSUAL");
        }
        String f = texto.trim().toUpperCase(Locale.ROOT);
        if (!FRECUENCIAS.contains(f)) throw new IllegalArgumentException("La frecuencia debe ser QUINCENAL o MENSUAL");
        return f;
    }

    /** @throws IllegalArgumentException si la frecuencia falta o no es QUINCENAL ni MENSUAL. */
    @Transactional
    public Map<String, Object> cambiarFrecuencia(Long empresaId, Object valor, Long actor) {
        String f = exigirFrecuencia(valor);
        NegocioOnvoCuenta c = cuenta(empresaId).orElseGet(() -> {
            NegocioOnvoCuenta n = new NegocioOnvoCuenta();
            n.setEmpresaId(empresaId);
            n.setModo(modo);
            return n;
        });
        if (c.getOnvoAccountId() == null || c.getFrecuenciaLiquidacion() == null) {
            // Sin cuenta en ONVO todavía: la elección es la vigente y el admin la usa al registrar.
            c.setFrecuenciaLiquidacion(f);
            c.setFrecuenciaPendiente(null);
        } else if (f.equals(c.getFrecuenciaLiquidacion())) {
            c.setFrecuenciaPendiente(null);
        } else {
            c.setFrecuenciaPendiente(f);
        }
        c.tocar(actor);
        return frecuenciaDe(repo.save(c));
    }

    private Optional<NegocioOnvoCuenta> cuenta(Long empresaId) {
        return repo.findByEmpresaIdAndProveedorAndModo(empresaId, PROVEEDOR, modo);
    }

    private static Map<String, Object> frecuenciaDe(NegocioOnvoCuenta c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("actual", c != null ? c.getFrecuenciaLiquidacion() : null);
        m.put("pendiente", c != null ? c.getFrecuenciaPendiente() : null);
        return m;
    }
}
