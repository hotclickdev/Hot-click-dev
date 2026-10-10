package com.hotclick.service.consola;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.TiendaRapida;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TiendaRapidaRepository;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Onboarding guiado del negocio asignado por enlace. Orden fijo: bodega → producto → datos del
 * negocio → cobro. Bodega y producto salen de los datos reales (no se pueden omitir); datos del
 * negocio y cobro el panel ya los deja para después, así que se pueden marcar u omitir.
 */
@Service
public class NegocioRapidoOnboardingService {

    public static final List<String> PASOS = List.of("BODEGA", "PRODUCTO", "NEGOCIO", "COBRO");
    private static final Set<String> OMITIBLES = Set.of("NEGOCIO", "COBRO");

    private final TiendaRapidaRepository rapidas;
    private final BodegaRepository bodegas;
    private final ProductoRepository productos;

    public NegocioRapidoOnboardingService(TiendaRapidaRepository rapidas, BodegaRepository bodegas,
                                          ProductoRepository productos) {
        this.rapidas = rapidas;
        this.bodegas = bodegas;
        this.productos = productos;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> estado(Long empresaId) {
        return vista(fila(empresaId), empresaId);
    }

    /** accion: HECHO u OMITIR. Solo para NEGOCIO y COBRO, y solo cuando los pasos anteriores están listos. */
    @Transactional
    public Map<String, Object> marcar(Long empresaId, String paso, String accion) {
        TiendaRapida fila = fila(empresaId);
        String p = paso == null ? "" : paso.trim().toUpperCase();
        if (!PASOS.contains(p)) throw new IllegalArgumentException("Ese paso no existe.");
        if (!OMITIBLES.contains(p)) {
            throw new IllegalArgumentException("Ese paso se completa creando el dato, no se puede omitir.");
        }
        Map<String, String> estados = estados(fila, empresaId);
        for (String anterior : PASOS.subList(0, PASOS.indexOf(p))) {
            if ("PENDIENTE".equals(estados.get(anterior))) {
                throw new IllegalStateException("Primero completá el paso " + anterior + ".");
            }
        }
        String a = accion == null ? "" : accion.trim().toUpperCase();
        if (!"HECHO".equals(a) && !"OMITIR".equals(a)) throw new IllegalArgumentException("Acción no válida.");
        Set<String> hechos = hechos(fila);
        hechos.removeIf(h -> h.startsWith(p + ":"));
        hechos.add(p + ":" + ("HECHO".equals(a) ? "HECHO" : "OMITIDO"));
        fila.setOnboardingHechos(String.join(",", hechos));
        return vista(fila, empresaId);
    }

    private TiendaRapida fila(Long empresaId) {
        if (empresaId == null) throw new RecursoNoEncontradoException("No hay negocio en la sesión.");
        TiendaRapida fila = rapidas.findFirstByEmpresaIdOrderByCreadaDesc(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Este negocio no viene de un enlace de asignación."));
        if (fila.getAceptadoEn() == null) {
            throw new RecursoNoEncontradoException("Falta aceptar la responsabilidad del negocio.");
        }
        return fila;
    }

    private Map<String, String> estados(TiendaRapida fila, Long empresaId) {
        Set<String> hechos = hechos(fila);
        Map<String, String> out = new LinkedHashMap<>();
        out.put("BODEGA", bodegas.countByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO) > 0 ? "HECHO" : "PENDIENTE");
        out.put("PRODUCTO", productos.countProductosActivosByEmpresaId(empresaId) > 0 ? "HECHO" : "PENDIENTE");
        for (String p : List.of("NEGOCIO", "COBRO")) {
            out.put(p, hechos.contains(p + ":HECHO") ? "HECHO" : hechos.contains(p + ":OMITIDO") ? "OMITIDO" : "PENDIENTE");
        }
        return out;
    }

    private Map<String, Object> vista(TiendaRapida fila, Long empresaId) {
        Map<String, String> estados = estados(fila, empresaId);
        List<Map<String, Object>> pasos = new ArrayList<>();
        String siguiente = null;
        boolean bloqueado = false;
        for (String p : PASOS) {
            String estado = estados.get(p);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("paso", p);
            m.put("estado", bloqueado && "PENDIENTE".equals(estado) ? "BLOQUEADO" : estado);
            m.put("omitible", OMITIBLES.contains(p));
            pasos.add(m);
            if ("PENDIENTE".equals(estado)) {
                if (siguiente == null) siguiente = p;
                bloqueado = true;
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("negocio", fila.getEmpresa() == null ? "" : fila.getEmpresa().getNombreComercial());
        out.put("pasos", pasos);
        out.put("siguiente", siguiente);
        out.put("completo", siguiente == null);
        return out;
    }

    private static Set<String> hechos(TiendaRapida fila) {
        String raw = fila.getOnboardingHechos();
        Set<String> out = new LinkedHashSet<>();
        if (raw != null && !raw.isBlank()) out.addAll(Arrays.asList(raw.split(",")));
        return out;
    }
}
