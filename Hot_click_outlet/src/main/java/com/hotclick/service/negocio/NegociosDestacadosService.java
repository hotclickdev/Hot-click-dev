package com.hotclick.service.negocio;

import com.hotclick.dto.NegocioDestacadoDTO;
import com.hotclick.model.Bodega;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.NegocioDestacadoFila;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.function.Supplier;

/**
 * Bloque «Negocio destacado» del carrusel del inicio (HANDOFF carrusel-inicio, 16-oct-2026).
 * <ul>
 *   <li>Solo catálogo público: empresa ACTIVO y visible, con productos activos, visible_catalogo y con stock.</li>
 *   <li>Si el superadmin destacó negocios ({@code Empresa.destacado}), salen esos, por orden y fecha de destacado.</li>
 *   <li>Si no hay ninguno destacado aplica D1 (provisorio): con logo o foto de producto, planes pagos primero,
 *       más productos publicados primero y desempate estable por día con hash(slug + fecha).</li>
 *   <li>D3: como máximo {@link #LIMITE_MAXIMO}.</li>
 * </ul>
 */
@Service
public class NegociosDestacadosService {

    public static final int LIMITE_MAXIMO = 5;
    static final int MAX_CANDIDATOS = 500;
    private static final ZoneId ZONA = ZoneId.of("America/Costa_Rica");

    private final EmpresaRepository empresaRepository;
    private final ProductoRepository productoRepository;
    private final BodegaRepository bodegaRepository;
    private final Supplier<LocalDate> hoy;

    @org.springframework.beans.factory.annotation.Autowired
    public NegociosDestacadosService(EmpresaRepository empresaRepository, ProductoRepository productoRepository,
                                     BodegaRepository bodegaRepository) {
        this(empresaRepository, productoRepository, bodegaRepository, () -> LocalDate.now(ZONA));
    }

    NegociosDestacadosService(EmpresaRepository empresaRepository, ProductoRepository productoRepository,
                              BodegaRepository bodegaRepository, Supplier<LocalDate> hoy) {
        this.empresaRepository = empresaRepository;
        this.productoRepository = productoRepository;
        this.bodegaRepository = bodegaRepository;
        this.hoy = hoy;
    }

    @Transactional(readOnly = true)
    public List<NegocioDestacadoDTO> listar(Integer limite) {
        int tope = limite == null ? LIMITE_MAXIMO : Math.min(Math.max(limite, 1), LIMITE_MAXIMO);
        List<NegocioDestacadoFila> candidatos = empresaRepository.findCandidatosDestacados(PageRequest.of(0, MAX_CANDIDATOS))
            .stream()
            .filter(f -> f.getSlug() != null && !f.getSlug().isBlank() && f.getNombre() != null && !f.getNombre().isBlank())
            .filter(f -> f.getProductos() != null && f.getProductos() > 0)
            .toList();
        return ordenar(candidatos, hoy.get()).stream().limit(tope).map(this::aDto).toList();
    }

    /** Destacados por el admin si los hay; si no, D1. Puro para poder probarlo. */
    static List<NegocioDestacadoFila> ordenar(List<NegocioDestacadoFila> candidatos, LocalDate dia) {
        List<NegocioDestacadoFila> curados = candidatos.stream().filter(f -> Boolean.TRUE.equals(f.getDestacado())).toList();
        if (!curados.isEmpty()) {
            return curados.stream()
                .sorted(Comparator.comparing(NegocioDestacadoFila::getDestacadoOrden, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(NegocioDestacadoFila::getDestacadoDesde, Comparator.nullsLast(Comparator.<LocalDateTime>naturalOrder()))
                    .thenComparing(NegocioDestacadoFila::getSlug))
                .toList();
        }
        String fecha = dia.toString();
        return candidatos.stream()
            .filter(f -> tieneTexto(f.getLogoUrl()) || (f.getConFoto() != null && f.getConFoto() > 0))
            .sorted(Comparator.comparingInt((NegocioDestacadoFila f) -> "EMPRENDEDOR".equals(PlanPublico.de(f.getPlan())) ? 1 : 0)
                .thenComparing(Comparator.comparingLong((NegocioDestacadoFila f) -> f.getProductos()).reversed())
                .thenComparingInt(f -> (f.getSlug() + fecha).hashCode())
                .thenComparing(NegocioDestacadoFila::getSlug))
            .toList();
    }

    private NegocioDestacadoDTO aDto(NegocioDestacadoFila f) {
        String logo = tieneTexto(f.getLogoUrl()) ? f.getLogoUrl().trim() : "";
        String portada = logo;
        if (portada.isEmpty()) {
            portada = productoRepository.findFotosCatalogoPublico(f.getId(), PageRequest.of(0, 1)).stream()
                .findFirst().orElse("");
        }
        String provincia = bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(f.getId(), Constants.ESTADO_ACTIVO)
            .stream().map(Bodega::getProvincia).filter(NegociosDestacadosService::tieneTexto).map(String::trim)
            .findFirst().orElse("");
        return new NegocioDestacadoDTO(f.getSlug(), f.getNombre().trim(),
            f.getCategoria() == null ? "" : f.getCategoria().trim(), provincia, logo, portada);
    }

    private static boolean tieneTexto(String s) {
        return s != null && !s.isBlank();
    }
}
