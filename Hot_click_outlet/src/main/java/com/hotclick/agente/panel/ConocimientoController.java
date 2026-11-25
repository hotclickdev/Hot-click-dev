package com.hotclick.agente.panel;

import com.hotclick.agente.ventas.ConocimientoRepository;
import com.hotclick.agente.ventas.ConocimientoService;
import com.hotclick.security.PermiteLector;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Conocimiento del bot (políticas, envíos, horarios, FAQ) del negocio. Cada negocio gestiona solo el suyo; el ADMIN
 * de plataforma gestiona el de HotClick (empresa null). Un id de otro negocio responde 404.
 */
@RestController
@RequestMapping("/api/agente/conocimiento")
public class ConocimientoController {

    static final int MAX_ENTRADAS = 100;

    public record Dto(Long id, String titulo, String contenido, String categoria, boolean activo) {
        static Dto de(ConocimientoRepository.Fila f) {
            return new Dto(f.id(), f.titulo(), f.contenido(), f.categoria(), f.activo());
        }
    }

    public record Pedido(String titulo, String contenido, String categoria, Boolean activo) {}

    private final ConocimientoService service;
    private final PanelAcceso acceso;

    public ConocimientoController(ConocimientoService service, PanelAcceso acceso) {
        this.service = service;
        this.acceso = acceso;
    }

    @PermiteLector
    @GetMapping
    public ResponseEntity<List<Dto>> listar() {
        return ResponseEntity.ok(service.listar(acceso.empresaOAdmin()).stream().map(Dto::de).toList());
    }

    @PostMapping
    public ResponseEntity<Dto> crear(@RequestBody Pedido p) {
        Long empresaId = acceso.empresaOAdmin();
        Pedido b = exigir(p);
        if (service.listar(empresaId).size() >= MAX_ENTRADAS)
            throw new IllegalArgumentException("Llegaste al máximo de " + MAX_ENTRADAS + " entradas de conocimiento");
        boolean activo = b.activo() == null || b.activo();
        long id = service.crear(empresaId, b.titulo(), b.contenido(), b.categoria(), activo);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(new Dto(id, b.titulo().strip(), b.contenido().strip(), b.categoria(), activo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Dto> actualizar(@PathVariable Long id, @RequestBody Pedido p) {
        Long empresaId = acceso.empresaOAdmin();
        Pedido b = exigir(p);
        boolean activo = b.activo() == null || b.activo();
        service.actualizar(id, empresaId, b.titulo(), b.contenido(), b.categoria(), activo);
        return ResponseEntity.ok(new Dto(id, b.titulo().strip(), b.contenido().strip(), b.categoria(), activo));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id, acceso.empresaOAdmin());
        return ResponseEntity.noContent().build();
    }

    private static Pedido exigir(Pedido p) {
        if (p == null) throw new IllegalArgumentException("Faltan los datos");
        return p;
    }
}
