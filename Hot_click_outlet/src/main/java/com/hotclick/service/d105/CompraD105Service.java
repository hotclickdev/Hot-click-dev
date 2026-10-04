package com.hotclick.service.d105;

import com.hotclick.dto.CompraD105Resumen;
import com.hotclick.dto.ReporteD105;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.CompraD105;
import com.hotclick.repository.CompraD105Repository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.storage.StorageUrlHelper;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;

@Service
public class CompraD105Service {

    static final int PAGINA_MAX = 50;

    private final CompraXmlD105Parser parser;
    private final CompraD105Repository repository;
    private final UsuarioRepository usuarioRepository;
    private final SupabaseStorageService storage;

    public CompraD105Service(CompraXmlD105Parser parser,
                             CompraD105Repository repository,
                             UsuarioRepository usuarioRepository,
                             SupabaseStorageService storage) {
        this.parser = parser;
        this.repository = repository;
        this.usuarioRepository = usuarioRepository;
        this.storage = storage;
    }

    @Transactional
    public CompraD105Resumen cargar(byte[] xml, MultipartFile foto, Long usuarioId) throws IOException {
        CompraD105Parseada parsed = parser.parsear(xml);
        if (repository.existsByClaveNumerica(parsed.claveNumerica())) {
            throw new IllegalArgumentException("Este comprobante ya fue cargado");
        }
        String fotoPath = guardarFoto(foto, parsed.claveNumerica());
        String xmlPath = storage.subirXmlPrivado(xml, "d105/" + parsed.claveNumerica() + ".xml");
        return CompraD105Resumen.de(repository.save(nueva(parsed, xmlPath, fotoPath, usuarioId)));
    }

    private CompraD105 nueva(CompraD105Parseada parsed, String xmlPath, String fotoPath, Long usuarioId) {
        CompraD105 compra = new CompraD105();
        compra.setClaveNumerica(parsed.claveNumerica());
        compra.setTipoDocumento(parsed.tipoDocumento());
        compra.setFechaEmision(parsed.fechaEmision());
        compra.setAnio(parsed.anio());
        compra.setTrimestre(parsed.trimestre());
        compra.setEmisorCedula(parsed.emisorCedula());
        compra.setEmisorNombre(parsed.emisorNombre());
        compra.setSubtotalNeto(parsed.subtotalNeto());
        compra.setTotalImpuesto(parsed.totalImpuesto());
        compra.setTotalComprobante(parsed.totalComprobante());
        compra.setXmlPath(xmlPath);
        compra.setFotoPath(fotoPath);
        compra.setFechaCarga(LocalDateTime.now(Constants.ZONA_CR));
        if (usuarioId != null) {
            compra.setUsuarioCarga(usuarioRepository.getReferenceById(usuarioId));
        }
        return compra;
    }

    @Transactional(readOnly = true)
    public Page<CompraD105Resumen> listar(int page, int size) {
        int pagina = Math.max(page, 0);
        int tamano = Math.min(Math.max(size, 1), PAGINA_MAX);
        PageRequest pedido = PageRequest.of(pagina, tamano,
            Sort.by(Sort.Order.desc("fechaEmision"), Sort.Order.desc("id")));
        return repository.findAll(pedido).map(CompraD105Resumen::de);
    }

    public FotoCompra foto(Long id) {
        CompraD105 compra = repository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Compra no encontrada"));
        String path = compra.getFotoPath();
        if (path == null || path.isBlank()) {
            throw new RecursoNoEncontradoException("Esta compra no tiene foto");
        }
        String tipo = StorageUrlHelper.ALLOWED_EXTENSIONS.get(extension(path));
        if (tipo == null) {
            throw new RecursoNoEncontradoException("Esta compra no tiene foto");
        }
        return new FotoCompra(storage.leerPrivado(path), tipo);
    }

    @Transactional(readOnly = true)
    public ReporteD105 reporte(int anio, String trimestre) {
        String q = trimestre == null ? "" : trimestre.trim().toUpperCase();
        if (!q.matches("Q[1-4]")) {
            throw new IllegalArgumentException("El trimestre debe ser Q1, Q2, Q3 o Q4");
        }
        if (anio < 2000 || anio > 2100) {
            throw new IllegalArgumentException("El año está fuera de rango");
        }
        return new ReporteD105(
            anio,
            q,
            repository.sumarSubtotalNeto(anio, q),
            repository.countByAnioAndTrimestre(anio, q)
        );
    }

    private String guardarFoto(MultipartFile foto, String clave) throws IOException {
        if (foto == null || foto.isEmpty()) return null;
        String ext = StorageUrlHelper.obtenerExtension(foto.getOriginalFilename());
        return storage.subirImagenPrivada(foto, "d105/" + clave + "-foto." + ext);
    }

    private static String extension(String path) {
        int punto = path.lastIndexOf('.');
        if (punto < 0 || punto == path.length() - 1) return "";
        return path.substring(punto + 1);
    }
}
