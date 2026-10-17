package com.hotclick.service.moderacion;

import com.hotclick.model.TerminoProhibido;
import com.hotclick.repository.TerminoProhibidoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * QA-NEG-038: productos con términos prohibidos (lista inicial aprobada: vape, tabaco, armas, drogas)
 * no se publican. Se compara el texto normalizado (minúsculas, sin tildes ni signos) del nombre,
 * la descripción y la categoría; un término coincide al inicio de una palabra («vape» atrapa «vapeador»).
 * La lista vive en hot_click_termino_prohibido_tb (V175) y la edita solo el ADMIN.
 */
@Service
public class TerminosProhibidosService {

    static final int MAX_LARGO = 80;
    private static final Pattern MARCAS = Pattern.compile("\\p{M}+");
    private static final Pattern NO_ALFANUM = Pattern.compile("[^a-z0-9]+");

    private final TerminoProhibidoRepository repo;

    public TerminosProhibidosService(TerminoProhibidoRepository repo) {
        this.repo = repo;
    }

    public static String normalizar(String texto) {
        if (texto == null) return "";
        String sinTildes = MARCAS.matcher(Normalizer.normalize(texto, Normalizer.Form.NFD)).replaceAll("");
        return NO_ALFANUM.matcher(sinTildes.toLowerCase(Locale.ROOT)).replaceAll(" ").trim();
    }

    @Transactional(readOnly = true)
    public List<TerminoProhibido> listar() {
        return repo.findAllByOrderByTerminoAsc();
    }

    @Transactional
    public TerminoProhibido agregar(String termino) {
        String t = normalizar(termino);
        if (t.isEmpty()) throw new IllegalArgumentException("Escribí el término a prohibir.");
        if (t.length() > MAX_LARGO) throw new IllegalArgumentException("El término no puede pasar de " + MAX_LARGO + " caracteres.");
        Optional<TerminoProhibido> existente = repo.findByTermino(t);
        if (existente.isPresent()) return existente.get();
        TerminoProhibido nuevo = new TerminoProhibido();
        nuevo.setTermino(t);
        return repo.save(nuevo);
    }

    @Transactional
    public void eliminar(Long id) {
        repo.deleteById(id);
    }

    /** Primer término prohibido presente en alguno de los textos, o vacío. */
    @Transactional(readOnly = true)
    public Optional<String> terminoEncontrado(String... textos) {
        StringBuilder sb = new StringBuilder(" ");
        for (String t : textos) sb.append(normalizar(t)).append(' ');
        String texto = sb.toString();
        for (TerminoProhibido tp : repo.findAll()) {
            if (texto.contains(" " + tp.getTermino())) return Optional.of(tp.getTermino());
        }
        return Optional.empty();
    }

    /** 400 con mensaje claro si el producto trae un término prohibido. */
    public void exigirPermitido(String nombre, String descripcionCorta, String descripcionLarga, String categoria) {
        terminoEncontrado(nombre, descripcionCorta, descripcionLarga, categoria).ifPresent(t -> {
            throw new IllegalArgumentException("No se puede publicar: el producto menciona «" + t
                + "», que está en la lista de productos prohibidos de HotClick. Si creés que es un error, escribinos a soporte.");
        });
    }
}
