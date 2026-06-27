package com.hotclick.controller;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plugin;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PluginEventoRepository;
import com.hotclick.repository.PluginRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.WebhookDispatcherService;
import static com.hotclick.service.WebhookDispatcherService.validateWebhookUrl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/plugins")
@PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT','ADMIN_CLIENTE')")
public class PluginController {

    @Autowired private PluginRepository       pluginRepository;
    @Autowired private PluginEventoRepository pluginEventoRepository;
    @Autowired private EmpresaRepository      empresaRepository;
    @Autowired private WebhookDispatcherService dispatcher;

    @GetMapping
    public ResponseEntity<?> listar() {
        Long empresaId = TenantContext.get();
        List<Map<String, Object>> result = pluginRepository.findByEmpresaIdOrderByFechaCreacionDesc(empresaId)
            .stream().map(this::toMap).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT')")
    public ResponseEntity<?> crear(@RequestBody Map<String, Object> body) {
        try {
            Long empresaId = TenantContext.get();
            Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

            Plugin p = new Plugin();
            p.setEmpresa(empresa);
            apply(p, body);
            pluginRepository.save(p);
            return ResponseEntity.ok(toMap(p));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT')")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Long empresaId = TenantContext.get();
        Optional<Plugin> opt = pluginRepository.findById(id);
        if (opt.isEmpty() || opt.get().getEmpresa() == null || !Objects.equals(opt.get().getEmpresa().getId(), empresaId)) {
            return ResponseEntity.status(403).body(Map.of("error", "No autorizado"));
        }
        Plugin p = opt.get();
        apply(p, body);
        pluginRepository.save(p);
        return ResponseEntity.ok(toMap(p));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT')")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        Long empresaId = TenantContext.get();
        Optional<Plugin> opt = pluginRepository.findById(id);
        if (opt.isEmpty() || opt.get().getEmpresa() == null || !Objects.equals(opt.get().getEmpresa().getId(), empresaId)) {
            return ResponseEntity.status(403).body(Map.of("error", "No autorizado"));
        }
        opt.get().setActivo(false);
        pluginRepository.save(opt.get());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    /** Sends a test webhook immediately (synchronous, returns result). */
    @PostMapping("/{id}/test")
    @PreAuthorize("hasAnyRole('EMPRENDEDOR','ADMIN_IT')")
    public ResponseEntity<?> test(@PathVariable Long id) {
        Long empresaId = TenantContext.get();
        Optional<Plugin> opt = pluginRepository.findById(id);
        if (opt.isEmpty() || opt.get().getEmpresa() == null || !Objects.equals(opt.get().getEmpresa().getId(), empresaId)) {
            return ResponseEntity.status(403).body(Map.of("error", "No autorizado"));
        }
        dispatcher.dispatch(empresaId, "plugin.test", Map.of(
            "mensaje", "Test de conexión desde HOTCLICK",
            "plugin_id", id
        ));
        return ResponseEntity.ok(Map.of("ok", true, "mensaje", "Webhook de prueba enviado"));
    }

    /** Last 50 event logs for a plugin. */
    @GetMapping("/{id}/eventos")
    public ResponseEntity<?> eventos(@PathVariable Long id) {
        Long empresaId = TenantContext.get();
        Optional<Plugin> opt = pluginRepository.findById(id);
        if (opt.isEmpty() || opt.get().getEmpresa() == null || !Objects.equals(opt.get().getEmpresa().getId(), empresaId)) {
            return ResponseEntity.status(403).body(Map.of("error", "No autorizado"));
        }
        var page = pluginEventoRepository.findByPluginIdOrderByFechaEnvioDesc(id, PageRequest.of(0, 50));
        List<Map<String, Object>> items = page.stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",              e.getId());
            m.put("evento",          e.getEvento());
            m.put("estado",          e.getEstado());
            m.put("codigoRespuesta", e.getCodigoRespuesta());
            m.put("mensajeError",    e.getMensajeError());
            m.put("fechaEnvio",      e.getFechaEnvio() != null ? e.getFechaEnvio().toString() : "");
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(items);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void apply(Plugin p, Map<String, Object> b) {
        if (b.containsKey("nombre"))           p.setNombre(str(b, "nombre"));
        if (b.containsKey("descripcion"))      p.setDescripcion(str(b, "descripcion"));
        if (b.containsKey("tipo"))             p.setTipo(str(b, "tipo"));
        if (b.containsKey("url")) {
            String url = str(b, "url");
            validateWebhookUrl(url);
            p.setUrl(url);
        }
        if (b.containsKey("eventosSuscritos")) p.setEventosSuscritos(str(b, "eventosSuscritos"));
        if (b.containsKey("secretoHmac"))      p.setSecretoHmac(str(b, "secretoHmac"));
        if (b.containsKey("activo"))           p.setActivo(Boolean.TRUE.equals(b.get("activo")));

        if (p.getNombre() == null || p.getNombre().isBlank())
            throw new IllegalArgumentException("El nombre es requerido");
        if (p.getUrl() == null || p.getUrl().isBlank())
            throw new IllegalArgumentException("La URL es requerida");
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString().trim() : null;
    }

    private Map<String, Object> toMap(Plugin p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",               p.getId());
        m.put("nombre",           p.getNombre());
        m.put("descripcion",      p.getDescripcion());
        m.put("tipo",             p.getTipo());
        m.put("url",              p.getUrl());
        m.put("eventosSuscritos", p.getEventosSuscritos());
        m.put("tieneSecretoHmac", p.getSecretoHmac() != null && !p.getSecretoHmac().isBlank());
        m.put("activo",           p.getActivo());
        m.put("fechaCreacion",    p.getFechaCreacion() != null ? p.getFechaCreacion().toString() : "");
        return m;
    }
}
