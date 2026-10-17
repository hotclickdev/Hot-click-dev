package com.hotclick.service.negocio;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * S2 · Contra entrega por negocio: el negocio decide si la acepta y un pedido mínimo opcional (₡).
 * HotClick no fija ningún monto: null = sin mínimo.
 */
@Service
public class ContraEntregaNegocioService {

    public static final String CODIGO_ACEPTA_INVALIDO = "ACEPTA_INVALIDO";
    public static final String CODIGO_MINIMO_INVALIDO = "MINIMO_INVALIDO";
    /** Tope de cordura del campo (no es una regla de negocio). */
    static final long MINIMO_MAX = 100_000_000L;

    private final EmpresaRepository empresaRepository;

    public ContraEntregaNegocioService(EmpresaRepository empresaRepository) {
        this.empresaRepository = empresaRepository;
    }

    public static class ConfigInvalidaException extends RuntimeException {
        private final String codigo;
        public ConfigInvalidaException(String codigo, String message) { super(message); this.codigo = codigo; }
        public String getCodigo() { return codigo; }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> obtener(Long empresaId) {
        return cuerpo(cargar(empresaId));
    }

    @Transactional
    public Map<String, Object> guardar(Long empresaId, Map<String, Object> body) {
        Object a = body == null ? null : body.get("acepta");
        if (!(a instanceof Boolean acepta)) {
            throw new ConfigInvalidaException(CODIGO_ACEPTA_INVALIDO, "Indicá si aceptás contra entrega (sí o no).");
        }
        Integer minimo = leerMinimo(body.get("minimo"));
        Empresa e = cargar(empresaId);
        e.setAceptaContraEntrega(acepta);
        e.setContraEntregaMinimoCrc(acepta ? minimo : null);
        return cuerpo(empresaRepository.save(e));
    }

    static Integer leerMinimo(Object v) {
        if (v == null) return null;
        String msg = "El pedido mínimo tiene que ser un número entero mayor que cero, o vacío.";
        if (!(v instanceof Number n)) throw new ConfigInvalidaException(CODIGO_MINIMO_INVALIDO, msg);
        double d = n.doubleValue();
        if (Double.isNaN(d) || d != Math.rint(d) || d <= 0 || d > MINIMO_MAX) {
            throw new ConfigInvalidaException(CODIGO_MINIMO_INVALIDO, msg);
        }
        return (int) d;
    }

    private Empresa cargar(Long empresaId) {
        return empresaRepository.findById(empresaId)
            .orElseThrow(() -> new IllegalStateException("Negocio no encontrado"));
    }

    private static Map<String, Object> cuerpo(Empresa e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("acepta", e.isAceptaContraEntrega());
        m.put("minimo", e.isAceptaContraEntrega() ? e.getContraEntregaMinimoCrc() : null);
        return m;
    }
}
