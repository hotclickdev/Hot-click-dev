package com.hotclick.agente.campana;

import com.hotclick.agente.campana.CampanaRepositorio.Campana;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Fila;
import com.hotclick.agente.conexion.MetaRechazoException;
import com.hotclick.agente.panel.PanelAcceso;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.security.PermiteLector;
import com.hotclick.security.PropietarioGuard;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Pestaña «Campañas» del panel del bot (AG-36). La empresa sale SIEMPRE de {@link PanelAcceso} (nunca de un
 * parámetro). Leer es para cualquier rol con acceso al panel (LECTOR incluido); crear, lanzar y cancelar mueven dinero
 * del negocio (Meta cobra cada mensaje) y exigen rol de gestión. Un id de otro negocio responde 404.
 */
@RestController
@RequestMapping("/api/agente/campanas")
public class CampanaController {

    static final String MSG_ROL = "Solo el dueño o el administrador del negocio puede gestionar campañas";

    public record SegmentoDto(Segmento.Tipo tipo, Integer dias, Long categoriaId) { }

    public record CampanaDto(Long id, String nombre, Long plantillaId, SegmentoDto segmento, List<String> parametros,
                             String estado, Instant programadaPara, int destinatarios, BigDecimal costoEstimadoUsd,
                             Instant lanzadaEn, Instant finalizadaEn, Instant creadoEn) {
        static CampanaDto de(Campana c) {
            return new CampanaDto(c.id(), c.nombre(), c.plantillaId(),
                new SegmentoDto(c.segmento().tipo(), c.segmento().dias(), c.segmento().categoriaId()),
                CampanaService.leerParametros(c.parametros()), c.estado(), c.programadaPara(), c.destinatarios(),
                c.costoEstimadoUsd(), c.lanzadaEn(), c.finalizadaEn(), c.creadoEn());
        }
    }

    public record DetalleDto(CampanaDto campana, CampanaRepositorio.Metricas metricas) { }

    public record PlantillaDto(Long id, String nombre, String idioma, String cuerpo, String estado,
                               String motivoRechazo, Instant creadoEn) {
        static PlantillaDto de(Fila f) {
            return new PlantillaDto(f.id(), f.nombre(), f.idioma(), f.cuerpo(), f.estado().name(), f.motivoRechazo(),
                f.creadoEn());
        }
    }

    public record CampanaPedido(String nombre, Long plantillaId, SegmentoDto segmento, List<String> parametros,
                                Instant programadaPara) { }

    public record PlantillaPedido(String nombre, String cuerpo, List<String> ejemplos) { }

    public record LanzarPedido(BigDecimal costoConfirmadoUsd) { }

    private final CampanaService campanas;
    private final PlantillaCampanaService plantillas;
    private final ConsentimientoService consentimientos;
    private final PanelAcceso acceso;
    private final PropietarioGuard propietarioGuard;

    public CampanaController(CampanaService campanas, PlantillaCampanaService plantillas,
                             ConsentimientoService consentimientos, PanelAcceso acceso, PropietarioGuard propietarioGuard) {
        this.campanas = campanas;
        this.plantillas = plantillas;
        this.consentimientos = consentimientos;
        this.acceso = acceso;
        this.propietarioGuard = propietarioGuard;
    }

    private Long gestion() {
        Long empresaId = acceso.empresa();
        if (!propietarioGuard.puedeGestionarEmpresa(empresaId) && !propietarioGuard.esAdminEquipo(empresaId))
            throw new TenantAccessDeniedException(MSG_ROL);
        return empresaId;
    }

    @PermiteLector
    @GetMapping
    public ResponseEntity<List<CampanaDto>> listar() {
        return ResponseEntity.ok(campanas.listar(acceso.empresa()).stream().map(CampanaDto::de).toList());
    }

    @PostMapping
    public ResponseEntity<CampanaDto> crear(@RequestBody CampanaPedido p) {
        Long empresaId = gestion();
        if (p == null || p.plantillaId() == null || p.segmento() == null) throw new IllegalArgumentException("Faltan los datos");
        Segmento seg = new Segmento(p.segmento().tipo(), p.segmento().dias(), p.segmento().categoriaId());
        Campana c = campanas.crear(empresaId, acceso.usuarioId(), p.nombre(), p.plantillaId(), seg, p.parametros(),
            p.programadaPara());
        return ResponseEntity.status(HttpStatus.CREATED).body(CampanaDto.de(c));
    }

    @PermiteLector
    @GetMapping("/{id}")
    public ResponseEntity<DetalleDto> detalle(@PathVariable Long id) {
        Long empresaId = acceso.empresa();
        return ResponseEntity.ok(new DetalleDto(CampanaDto.de(campanas.obtener(empresaId, id)),
            campanas.metricas(empresaId, id)));
    }

    /** Cuántos se alcanzan y cuánto cobra Meta: se muestra ANTES de lanzar. */
    @PermiteLector
    @GetMapping("/{id}/estimacion")
    public ResponseEntity<CampanaService.Estimacion> estimacion(@PathVariable Long id) {
        return ResponseEntity.ok(campanas.estimar(acceso.empresa(), id));
    }

    @PostMapping("/{id}/lanzar")
    public ResponseEntity<CampanaDto> lanzar(@PathVariable Long id, @RequestBody LanzarPedido p) {
        Long empresaId = gestion();
        return ResponseEntity.ok(CampanaDto.de(campanas.lanzar(empresaId, id, p == null ? null : p.costoConfirmadoUsd())));
    }

    @PostMapping("/{id}/cancelar")
    public ResponseEntity<CampanaDto> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(CampanaDto.de(campanas.cancelar(gestion(), id)));
    }

    @PermiteLector
    @GetMapping("/plantillas")
    public ResponseEntity<List<PlantillaDto>> plantillas() {
        return ResponseEntity.ok(plantillas.listar(acceso.empresa()).stream().map(PlantillaDto::de).toList());
    }

    @PostMapping("/plantillas")
    public ResponseEntity<PlantillaDto> crearPlantilla(@RequestBody PlantillaPedido p) {
        Long empresaId = gestion();
        if (p == null) throw new IllegalArgumentException("Faltan los datos");
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(PlantillaDto.de(plantillas.crear(empresaId, p.nombre(), p.cuerpo(), p.ejemplos())));
    }

    @PostMapping("/plantillas/{id}/sincronizar")
    public ResponseEntity<PlantillaDto> sincronizar(@PathVariable Long id) {
        return ResponseEntity.ok(PlantillaDto.de(plantillas.sincronizar(gestion(), id)));
    }

    @PermiteLector
    @GetMapping("/consentimientos")
    public ResponseEntity<ConsentimientoRepositorio.Resumen> consentimientos() {
        return ResponseEntity.ok(consentimientos.resumen(acceso.empresa()));
    }

    @ExceptionHandler(MetaRechazoException.class)
    ResponseEntity<ResponseDTO> rechazo(MetaRechazoException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(ResponseDTO.error(e.getMessage()));
    }
}
