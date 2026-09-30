package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;
import com.hotclick.model.SuscripcionReposicion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SuscripcionReposicionRepository;
import com.hotclick.security.CompanyScope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * "Avisame cuando vuelva" — guarda el interés de un cliente en un producto
 * agotado. El disparo automático del correo cuando el producto vuelve a
 * tener stock queda pendiente (NUEVO · por programar); ver ADR en el
 * commit de esta feature.
 */
@Service
public class SuscripcionReposicionService {

    private static final Logger log = LoggerFactory.getLogger(SuscripcionReposicionService.class);

    private final SuscripcionReposicionRepository repo;
    private final ProductoRepository productoRepository;
    private final CompanyScope companyScope;

    public SuscripcionReposicionService(
            SuscripcionReposicionRepository repo,
            ProductoRepository productoRepository,
            CompanyScope companyScope) {
        this.repo = repo;
        this.productoRepository = productoRepository;
        this.companyScope = companyScope;
    }

    @Transactional
    public Map<String, Object> suscribirse(Long productoId, String correoRaw) {
        Producto producto = productoRepository.findById(productoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));
        String correo = correoRaw.trim().toLowerCase();

        boolean yaExiste = repo.existsByProducto_IdAndCorreoIgnoreCase(productoId, correo);
        if (!yaExiste) {
            SuscripcionReposicion s = new SuscripcionReposicion();
            s.setProducto(producto);
            Usuario user = companyScope.getCurrentUser();
            if (user != null) s.setUsuario(user);
            s.setCorreo(correo);
            repo.save(s);
            log.info("[avisar-reposicion] producto {} — nueva suscripción", productoId);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("productoId", productoId);
        out.put("correo", correo);
        out.put("yaEstabaSuscrito", yaExiste);
        return out;
    }
}
