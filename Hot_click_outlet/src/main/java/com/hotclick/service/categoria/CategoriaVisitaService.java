package com.hotclick.service.categoria;

import com.hotclick.utils.Constants;
import com.hotclick.dto.CategoriaTopDTO;
import com.hotclick.model.Categoria;
import com.hotclick.model.CategoriaVisitaDia;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.CategoriaVisitaDiaRepository;
import com.hotclick.repository.ProductoRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Categorías "top" de la barra del header.
 * <ul>
 *   <li>Visitas: contador agregado por categoría RAÍZ y día (sin IP, usuario ni cookie).</li>
 *   <li>Top: raíces activas y públicas con al menos un producto en el catálogo público (mismo gate que
 *       /publicas/con-productos: empresa ACTIVO y visibilidad_publica), ordenadas por visitas de los últimos
 *       30 días, después por productos públicos y por nombre. Sin visitas = fallback por productos.</li>
 * </ul>
 */
@Service
public class CategoriaVisitaService {

    public static final int DIAS_VENTANA = 30;
    public static final int MAXIMO_TOP = 3;
    private static final int PROFUNDIDAD_MAXIMA = 10;
    static final ZoneId ZONA = ZoneId.of("America/Costa_Rica");

    private final CategoriaRepository categorias;
    private final CategoriaVisitaDiaRepository visitas;
    private final ProductoRepository productos;
    private final Clock reloj;

    public CategoriaVisitaService(CategoriaRepository categorias, CategoriaVisitaDiaRepository visitas,
                                  ProductoRepository productos, Optional<Clock> reloj) {
        this.categorias = categorias;
        this.visitas = visitas;
        this.productos = productos;
        this.reloj = reloj.orElse(Clock.system(ZONA));
    }

    /** Suma una visita a la raíz de la categoría. Devuelve false si la categoría no es pública/activa. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean registrar(Long categoriaId) {
        Map<Long, Categoria> publicas = categoriasPublicas();
        Long raiz = raizDe(categoriaId, publicas);
        if (raiz == null) return false;
        LocalDate hoy = LocalDate.now(reloj.withZone(ZONA));
        if (visitas.incrementar(raiz, hoy) > 0) return true;
        try {
            visitas.saveAndFlush(new CategoriaVisitaDia(raiz, hoy, 1));
        } catch (DataIntegrityViolationException carrera) {
            visitas.incrementar(raiz, hoy);
        }
        return true;
    }

    @Cacheable(value = "categorias-publicas", key = "'top-nav'")
    @Transactional(readOnly = true)
    public List<CategoriaTopDTO> top() {
        Map<Long, Categoria> publicas = categoriasPublicas();

        Map<Long, Long> productosPorRaiz = new HashMap<>();
        for (Object[] fila : productos.contarCatalogoPublicoPorCategoria()) {
            Long raiz = raizDe(((Number) fila[0]).longValue(), publicas);
            if (raiz != null) productosPorRaiz.merge(raiz, ((Number) fila[2]).longValue(), Long::sum);
        }

        Map<Long, Long> visitasPorRaiz = new HashMap<>();
        LocalDate desde = LocalDate.now(reloj.withZone(ZONA)).minusDays(DIAS_VENTANA - 1L);
        for (Object[] fila : visitas.sumarDesde(desde)) {
            visitasPorRaiz.put(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue());
        }

        return productosPorRaiz.entrySet().stream()
            .map(e -> new CategoriaTopDTO(e.getKey(), publicas.get(e.getKey()).getNombreCategoria(),
                visitasPorRaiz.getOrDefault(e.getKey(), 0L), e.getValue()))
            .sorted(Comparator.comparingLong(CategoriaTopDTO::visitas).reversed()
                .thenComparing(Comparator.comparingLong(CategoriaTopDTO::productos).reversed())
                .thenComparing(CategoriaTopDTO::nombre, String.CASE_INSENSITIVE_ORDER))
            .limit(MAXIMO_TOP)
            .toList();
    }

    private Map<Long, Categoria> categoriasPublicas() {
        Map<Long, Categoria> porId = new HashMap<>();
        for (Categoria c : categorias.findPublicasByEstado(Constants.ESTADO_ACTIVO)) porId.put(c.getId(), c);
        return porId;
    }

    /** Raíz pública de la categoría; null si ella o algún ancestro no es pública/activa (o hay ciclo). */
    static Long raizDe(Long id, Map<Long, Categoria> publicas) {
        Long actual = id;
        for (int i = 0; i < PROFUNDIDAD_MAXIMA && actual != null; i++) {
            Categoria c = publicas.get(actual);
            if (c == null) return null;
            if (c.getPadreId() == null) return c.getId();
            actual = c.getPadreId();
        }
        return null;
    }
}
