package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.SolicitudRecoleccion;
import com.hotclick.repository.SolicitudRecoleccionRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.consola.ConsolaBusquedaService;
import com.hotclick.service.consola.ConsolaFichaService;
import com.hotclick.service.consola.ConsolaMovimientoService;
import com.hotclick.service.consola.ConsolaPedidoService;
import com.hotclick.service.consola.NotaOperadorService;
import com.hotclick.service.consola.QuincenaAdminService;
import com.hotclick.service.consola.SancionPlataformaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/consola")
public class ConsolaOperadorController {

    private final ConsolaBusquedaService busqueda;
    private final ConsolaFichaService ficha;
    private final ConsolaPedidoService pedido;
    private final ConsolaMovimientoService movimiento;
    private final QuincenaAdminService quincena;
    private final SancionPlataformaService sanciones;
    private final NotaOperadorService notas;
    private final SolicitudRecoleccionRepository recoleccionRepo;
    private final AuditoriaAdminRegistroService auditoria;

    public ConsolaOperadorController(ConsolaBusquedaService busqueda,
                                     ConsolaFichaService ficha,
                                     ConsolaPedidoService pedido,
                                     ConsolaMovimientoService movimiento,
                                     QuincenaAdminService quincena,
                                     SancionPlataformaService sanciones,
                                     NotaOperadorService notas,
                                     SolicitudRecoleccionRepository recoleccionRepo,
                                     AuditoriaAdminRegistroService auditoria) {
        this.busqueda = busqueda;
        this.ficha = ficha;
        this.pedido = pedido;
        this.movimiento = movimiento;
        this.quincena = quincena;
        this.sanciones = sanciones;
        this.notas = notas;
        this.recoleccionRepo = recoleccionRepo;
        this.auditoria = auditoria;
    }

    @GetMapping("/buscar")
    public ResponseEntity<ResponseDTO> buscar(@RequestParam String q) {
        return ResponseEntity.ok(ResponseDTO.success("Búsqueda", busqueda.buscar(q)));
    }

    @GetMapping("/reloj")
    public ResponseEntity<ResponseDTO> reloj() {
        return ResponseEntity.ok(ResponseDTO.success("Reloj", busqueda.reloj()));
    }

    @GetMapping("/crm")
    public ResponseEntity<ResponseDTO> crm() {
        return ResponseEntity.ok(ResponseDTO.success("CRM", busqueda.crm()));
    }

    @GetMapping("/movimiento")
    public ResponseEntity<ResponseDTO> movimiento(@RequestParam(defaultValue = "30") int dias) {
        return ResponseEntity.ok(ResponseDTO.success("Movimiento", movimiento.movimiento(dias)));
    }

    @GetMapping("/quincena")
    public ResponseEntity<ResponseDTO> quincena(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate inicio = desde != null ? desde : QuincenaAdminService.inicioHoy();
        LocalDate fin = hasta != null ? hasta : QuincenaAdminService.finHoy();
        return ResponseEntity.ok(ResponseDTO.success("Quincena", quincena.periodo(inicio, fin)));
    }

    @GetMapping("/tiendas/{id}")
    public ResponseEntity<ResponseDTO> tienda(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Ficha", ficha.armar(id)));
    }

    @PostMapping("/tiendas/{id}/sanciones")
    public ResponseEntity<ResponseDTO> sancionar(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ResponseDTO.success("Sanción",
            sanciones.crear(id, body.get("nivel"), body.get("motivo"), body.get("politica"))));
    }

    @GetMapping("/pedidos/{id}")
    public ResponseEntity<ResponseDTO> pedido(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Pedido", pedido.detalle(id)));
    }

    @PutMapping("/pedidos/{id}/resolucion")
    public ResponseEntity<ResponseDTO> resolucion(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ResponseDTO.success("Resolución",
            pedido.resolver(id, body.get("tipo"), body.get("nota"))));
    }

    @PutMapping("/pedidos/{pedidoId}/items/{itemId}/sin-inventario")
    public ResponseEntity<ResponseDTO> sinInventario(@PathVariable Long pedidoId, @PathVariable Long itemId) {
        return ResponseEntity.ok(ResponseDTO.success("Sin inventario", pedido.sinInventario(pedidoId, itemId)));
    }

    @GetMapping("/compradores/{id}")
    public ResponseEntity<ResponseDTO> comprador(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseDTO.success("Comprador", pedido.delComprador(id)));
    }

    @PostMapping("/notas")
    public ResponseEntity<ResponseDTO> nota(@RequestBody Map<String, String> body) {
        Long empresaId = body.get("empresaId") == null ? null : Long.valueOf(body.get("empresaId"));
        return ResponseEntity.ok(ResponseDTO.success("Nota",
            notas.crear(empresaId, body.get("nota"), body.get("proximaAccion"), body.get("bandeja"))));
    }

    @PutMapping("/recolecciones/{id}/efectivo")
    public ResponseEntity<ResponseDTO> efectivo(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        SolicitudRecoleccion fila = recoleccionRepo.findByIdConEmpresa(id)
            .orElseThrow(() -> new IllegalArgumentException("Recolección no encontrada."));
        Object crudo = body.get("monto");
        if (!(crudo instanceof Number numero) || numero.intValue() < 0) {
            throw new IllegalArgumentException("Anotá el efectivo en colones.");
        }
        fila.setEfectivoAnotado(numero.intValue());
        recoleccionRepo.save(fila);
        Long empresaId = fila.getEmpresa() != null ? fila.getEmpresa().getId() : null;
        auditoria.registrar("EFECTIVO_MENSAJERO", "RECOLECCION", id, empresaId, "₡" + numero.intValue());
        return ResponseEntity.ok(ResponseDTO.success("Efectivo", Map.of("id", id, "monto", numero.intValue())));
    }
}
