package com.hotclick.service.negocio;

import com.hotclick.dto.NegocioPublicoDTO;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.NegocioPublicoFila;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Directorio y buscador público de negocios. El plan se resuelve en el backend (Plan estructurado o planSaas)
 * y solo sale como plan público; nunca se entrega contacto del vendedor. Solo aparecen negocios activos,
 * públicos y con al menos un producto publicado (los mismos que ya se ven en el catálogo).
 */
@Service
public class DirectorioNegociosService {

    /** Tope de negocios que se leen por consulta: el directorio es chico y así la consulta queda acotada. */
    static final int MAX_NEGOCIOS = 500;
    static final int LIMITE_DEFECTO = 50;
    static final int LIMITE_MAXIMO = 200;
    static final int LARGO_MAXIMO_BUSQUEDA = 80;

    private final EmpresaRepository empresaRepository;

    public DirectorioNegociosService(EmpresaRepository empresaRepository) {
        this.empresaRepository = empresaRepository;
    }

    /**
     * @param texto nombre o slug del negocio (sin tildes ni mayúsculas, como la búsqueda de productos)
     * @param plan  filtro de plan ({@link PlanPublico#filtro}); desconocido devuelve lista vacía
     */
    @Transactional(readOnly = true)
    public List<NegocioPublicoDTO> buscar(String texto, String plan, Integer limite) {
        String filtroPlan = PlanPublico.filtro(plan);
        if (filtroPlan == null) return List.of();
        String consulta = normalizar(texto);
        if (consulta.length() > LARGO_MAXIMO_BUSQUEDA) consulta = consulta.substring(0, LARGO_MAXIMO_BUSQUEDA);
        int tope = limite == null || limite < 1 ? LIMITE_DEFECTO : Math.min(limite, LIMITE_MAXIMO);

        final String q = consulta;
        return empresaRepository.findNegociosPublicos(PageRequest.of(0, MAX_NEGOCIOS)).stream()
            .filter(f -> f.getSlug() != null && !f.getSlug().isBlank() && f.getNombre() != null)
            .filter(f -> f.getProductos() != null && f.getProductos() > 0)
            .map(DirectorioNegociosService::aDto)
            .filter(n -> filtroPlan.isEmpty() || filtroPlan.equals(n.plan()))
            .filter(n -> q.isEmpty() || coincide(n, q))
            .sorted(Comparator.comparingInt((NegocioPublicoDTO n) -> q.isEmpty() ? 0 : rango(n, q))
                .thenComparing(n -> normalizar(n.nombre())))
            .limit(tope)
            .toList();
    }

    private static NegocioPublicoDTO aDto(NegocioPublicoFila f) {
        return new NegocioPublicoDTO(
            f.getSlug(),
            f.getNombre().trim(),
            f.getLogoUrl() == null ? "" : f.getLogoUrl(),
            f.getCategoria() == null ? "" : f.getCategoria(),
            PlanPublico.de(f.getPlan()),
            f.getProductos());
    }

    private static boolean coincide(NegocioPublicoDTO n, String q) {
        return normalizar(n.nombre()).contains(q) || normalizar(n.slug().replace('-', ' ')).contains(q);
    }

    /** 0 = el nombre empieza con lo buscado, 1 = una palabra empieza con lo buscado, 2 = lo contiene. */
    private static int rango(NegocioPublicoDTO n, String q) {
        String nombre = normalizar(n.nombre());
        if (nombre.startsWith(q)) return 0;
        if (nombre.contains(" " + q)) return 1;
        return 2;
    }

    /** Minúsculas, sin tildes y con espacios simples: "Café  Luna" y "cafe luna" coinciden. */
    static String normalizar(String valor) {
        if (valor == null) return "";
        String sinTildes = Normalizer.normalize(valor, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinTildes.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }
}
