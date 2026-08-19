package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Marca;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.utils.Constants;
import com.hotclick.utils.InputSanitizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class MarcaService {

    @Autowired private MarcaRepository marcaRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private SupabaseStorageService supabaseStorageService;
    @Autowired private InputSanitizer sanitizer;
    @Autowired private ImageModerationService imageModerationService;
    @Autowired private TextModerationService textModerationService;

    @Cacheable("marcas-publicas")
    public List<Marca> listarPublicas() {
        return marcaRepository.findPublicasByEstado(Constants.ESTADO_ACTIVO);
    }

    public List<Marca> listar(Long empresaId) {
        if (empresaId != null) {
            return marcaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        }
        return marcaRepository.findByEstado(Constants.ESTADO_ACTIVO);
    }

    @CacheEvict(value = "marcas-publicas", allEntries = true)
    public Marca crear(String nombre, String logoUrl, String correoAdmin, Long empresaId, boolean adminIt) {
        if (!textModerationService.moderar(nombre).safe()) {
            throw new IllegalArgumentException("El nombre de la marca contiene contenido no permitido");
        }
        Usuario admin = usuarioRepository.findByCorreo(correoAdmin)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario no encontrado"));
        Empresa empresa = empresaId != null ? empresaRepository.findById(empresaId).orElse(null) : null;
        Long eid = empresa != null ? empresa.getId() : null;
        if (eid != null && !adminIt
                && marcaRepository.countByEmpresaIdAndEstado(eid, Constants.ESTADO_ACTIVO) >= 1) {
            throw new IllegalArgumentException("Tu negocio ya tiene una marca creada. Solo se permite 1 marca por negocio.");
        }
        if (nombreDuplicado(nombre.trim(), eid, null)) {
            throw new IllegalArgumentException("Ya existe una marca activa con ese nombre");
        }
        Marca m = new Marca();
        m.setNombreMarca(sanitizer.cleanWithLimit(nombre, 150));
        m.setLogoUrl(logoUrl != null ? sanitizer.cleanWithLimit(logoUrl, 500) : null);
        m.setAdminCliente(admin);
        m.setEmpresa(empresa);
        m.setEstado(Constants.ESTADO_ACTIVO);
        return marcaRepository.save(m);
    }

    @CacheEvict(value = "marcas-publicas", allEntries = true)
    public Marca actualizar(Marca m, Map<String, String> body) {
        if (body.containsKey("nombreMarca") && !body.get("nombreMarca").isBlank()) {
            if (!textModerationService.moderar(body.get("nombreMarca")).safe()) {
                throw new IllegalArgumentException("El nombre de la marca contiene contenido no permitido");
            }
            String nuevoNombre = sanitizer.cleanWithLimit(body.get("nombreMarca"), 150);
            if (nombreDuplicado(nuevoNombre, m.getEmpresaId(), m.getId())) {
                throw new IllegalArgumentException("Ya existe una marca activa con ese nombre");
            }
            m.setNombreMarca(nuevoNombre);
        }
        if (body.containsKey("logoUrl")) {
            m.setLogoUrl(body.get("logoUrl") != null ? sanitizer.cleanWithLimit(body.get("logoUrl"), 500) : null);
        }
        return marcaRepository.save(m);
    }

    @CacheEvict(value = "marcas-publicas", allEntries = true)
    public Map<String, Integer> importarBulk(List<Map<String, String>> items, String correoAdmin,
                                             Long empresaId, boolean adminIt) {
        Usuario admin = usuarioRepository.findByCorreo(correoAdmin)
            .orElseThrow(() -> new RecursoNoEncontradoException("Admin no encontrado"));
        Empresa empresa = empresaId != null ? empresaRepository.findById(empresaId).orElse(null) : null;
        Long eid = empresa != null ? empresa.getId() : null;
        boolean limitado = eid != null && !adminIt;
        long yaCreadas = limitado ? marcaRepository.countByEmpresaIdAndEstado(eid, Constants.ESTADO_ACTIVO) : 0;
        int ok = 0;
        int duplicates = 0;
        for (Map<String, String> item : items) {
            if (limitado && yaCreadas + ok >= 1) break;
            String nombre = item.get("nombreMarca");
            if (nombre == null || nombre.isBlank()) continue;
            if (nombreDuplicado(nombre.trim(), eid, null)) {
                duplicates++;
                continue;
            }
            Marca m = new Marca();
            m.setNombreMarca(sanitizer.cleanWithLimit(nombre, 150));
            m.setLogoUrl(item.get("logoUrl") != null ? sanitizer.cleanWithLimit(item.get("logoUrl"), 500) : null);
            m.setAdminCliente(admin);
            m.setEmpresa(empresa);
            m.setEstado(Constants.ESTADO_ACTIVO);
            marcaRepository.save(m);
            ok++;
        }
        return Map.of("ok", ok, "duplicates", duplicates);
    }

    public String subirLogo(MultipartFile file) throws IOException {
        var mod = imageModerationService.moderar(file);
        if (!mod.safe()) {
            throw new IllegalArgumentException("Imagen rechazada: " + mod.reason());
        }
        return supabaseStorageService.subirImagen(file, "Marcas");
    }

    public Marca eliminar(Marca m) {
        m.setEstado(Constants.ESTADO_INACTIVO);
        return marcaRepository.save(m);
    }

    public Marca buscar(Long id) {
        return marcaRepository.findById(id)
            .orElseThrow(() -> new RecursoNoEncontradoException("Marca no encontrada"));
    }

    private boolean nombreDuplicado(String nombre, Long empresaId, Long idExcluido) {
        if (idExcluido == null) {
            return empresaId != null
                ? marcaRepository.existsByNombreMarcaAndEmpresaIdAndEstado(nombre, empresaId, Constants.ESTADO_ACTIVO)
                : marcaRepository.existsByNombreMarcaAndEstado(nombre, Constants.ESTADO_ACTIVO);
        }
        return empresaId != null
            ? marcaRepository.existsByNombreMarcaAndEmpresaIdAndEstadoAndIdNot(
                nombre, empresaId, Constants.ESTADO_ACTIVO, idExcluido)
            : marcaRepository.existsByNombreMarcaAndEstadoAndIdNot(nombre, Constants.ESTADO_ACTIVO, idExcluido);
    }
}
