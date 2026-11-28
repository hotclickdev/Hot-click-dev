package com.hotclick.controller;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.contador.AjustesContadorRequest;
import com.hotclick.dto.contador.HaciendaEstadoRequest;
import com.hotclick.dto.contador.NormativaContadorRequest;
import com.hotclick.dto.contador.ParametrosContadorRequest;
import com.hotclick.dto.contador.PreguntaContadorRequest;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.contador.ContadorAcceso;
import com.hotclick.service.contador.ContadorAjustesService;
import com.hotclick.service.contador.ContadorAvisosService;
import com.hotclick.service.contador.ContadorCalculos;
import com.hotclick.service.contador.ContadorChatService;
import com.hotclick.service.contador.ContadorFiscalService;
import com.hotclick.service.contador.ContadorHaciendaService;
import com.hotclick.service.contador.ContadorNormativaService;
import com.hotclick.service.contador.ContadorParametrosService;
import com.hotclick.service.contador.ContadorTextos;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.utils.Constants;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Contador IA de la consola de plataforma. Solo un ADMIN de plataforma y nunca durante una impersonacion: cada metodo
 * llama a {@link ContadorAcceso#exigirAdmin()} ademas del {@code @PreAuthorize}. Nada de aca presenta, paga ni envia a
 * Hacienda: calcula, muestra borradores y responde preguntas con herramientas de solo lectura.
 */
@RestController
public class AdminContadorController {

    private static final String BASE = "/api/admin/contador";

    private final ContadorAcceso acceso;
    private final ContadorFiscalService fiscal;
    private final ContadorChatService chat;
    private final ContadorAjustesService ajustes;
    private final ContadorParametrosService parametros;
    private final ContadorNormativaService normativa;
    private final ContadorHaciendaService hacienda;
    private final ContadorAvisosService avisos;
    private final ConfiguracionFiscalService reglas;
    private final AuditoriaAdminRegistroService auditoria;

    public AdminContadorController(ContadorAcceso acceso, ContadorFiscalService fiscal, ContadorChatService chat,
                                   ContadorAjustesService ajustes, ContadorParametrosService parametros,
                                   ContadorNormativaService normativa, ContadorHaciendaService hacienda,
                                   ContadorAvisosService avisos, ConfiguracionFiscalService reglas,
                                   AuditoriaAdminRegistroService auditoria) {
        this.acceso = acceso;
        this.fiscal = fiscal;
        this.chat = chat;
        this.ajustes = ajustes;
        this.parametros = parametros;
        this.normativa = normativa;
        this.hacienda = hacienda;
        this.avisos = avisos;
        this.reglas = reglas;
        this.auditoria = auditoria;
    }

    private static LocalDate hoy() { return LocalDate.now(Constants.ZONA_CR); }

    @GetMapping(BASE + "/este-mes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> esteMes() {
        acceso.exigirAdmin();
        return ok("Este mes", fiscal.esteMes(hoy()));
    }

    @GetMapping(BASE + "/calendario")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> calendario() {
        acceso.exigirAdmin();
        return ok("Calendario", fiscal.calendario(hoy()));
    }

    @GetMapping(BASE + "/borrador/iva")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> borradorIva(@RequestParam(required = false) Integer anio,
                                                   @RequestParam(required = false) Integer mes) {
        acceso.exigirAdmin();
        if (mes != null && (mes < 1 || mes > 12)) return malo("Mes inválido.");
        try {
            return ok("Borrador del formulario 150", fiscal.borradorIva(hoy(), anio, mes));
        } catch (IllegalArgumentException e) {
            return malo("Período inválido.");
        }
    }

    @GetMapping(BASE + "/borrador/rts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> borradorRts(@RequestParam(required = false) Integer anio,
                                                   @RequestParam(required = false) Integer trimestre) {
        acceso.exigirAdmin();
        try {
            return ok("Borrador de la declaración trimestral", fiscal.borradorRts(hoy(), anio, trimestre));
        } catch (IllegalArgumentException e) {
            return malo("Trimestre inválido.");
        }
    }

    @GetMapping(BASE + "/calculadora")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> calculadora(@RequestParam long precio, @RequestParam String vendedor,
                                                   @RequestParam(required = false) BigDecimal margenPct) {
        acceso.exigirAdmin();
        ContadorCalculos.Vendedor v = ContadorCalculos.vendedorDe(vendedor);
        if (v == null) return malo("Tipo de vendedor inválido.");
        try {
            return ok("Calculadora", ContadorCalculos.calculadora(precio, v, margenPct, reglas.reglas().extraNoInscritoPct()));
        } catch (IllegalArgumentException e) {
            return malo("Revisá el precio y el margen.");
        }
    }

    @PostMapping(BASE + "/preguntar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> preguntar(@Valid @RequestBody PreguntaContadorRequest body) {
        acceso.exigirAdmin();
        try {
            return ok("Respuesta del contador", chat.preguntar(body.pregunta(), hoy()));
        } catch (IllegalArgumentException e) {
            return malo("Escribí una pregunta de hasta " + ContadorChatService.MAX_PREGUNTA + " caracteres.");
        }
    }

    @GetMapping(BASE + "/ajustes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> verAjustes() {
        acceso.exigirAdmin();
        return ok("Ajustes del contador", ajustesYParametros());
    }

    @PutMapping(BASE + "/ajustes")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> guardarAjustes(@Valid @RequestBody AjustesContadorRequest body) {
        acceso.exigirAdmin();
        ContadorAjustesService.Ajustes antes = ajustes.ajustes();
        ContadorAjustesService.Ajustes nuevos;
        try {
            nuevos = ajustes.actualizar(new ContadorAjustesService.Ajustes(body.salarioBaseCrc(), body.topeIaMesUsd(),
                body.limitePreguntasDia()));
        } catch (IllegalArgumentException e) {
            return malo("Revisá los rangos de los ajustes.");
        }
        auditoria.registrar("CONTADOR_AJUSTES_ACTUALIZADOS", "CONTADOR_IA", 1L, null,
            "salarioBase " + antes.salarioBaseCrc() + "->" + nuevos.salarioBaseCrc()
                + ", topeIaUsd " + antes.topeIaMesUsd() + "->" + nuevos.topeIaMesUsd()
                + ", preguntasDia " + antes.limitePreguntasDia() + "->" + nuevos.limitePreguntasDia());
        return ok("Ajustes guardados", ajustesYParametros());
    }

    @PutMapping(BASE + "/parametros")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> guardarParametros(@Valid @RequestBody ParametrosContadorRequest body) {
        acceso.exigirAdmin();
        try {
            parametros.actualizar(body.parametros());
        } catch (IllegalArgumentException e) {
            return malo("Revisá los parámetros: algún valor no tiene el formato esperado.");
        }
        auditoria.registrar("CONTADOR_PARAMETROS_ACTUALIZADOS", "CONTADOR_IA", 1L, null,
            "claves " + String.join(",", body.parametros().keySet()));
        return ok("Parámetros guardados", ajustesYParametros());
    }

    @GetMapping(BASE + "/normativa")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> verNormativa() {
        acceso.exigirAdmin();
        return ok("Normativa cargada", normativa.listar());
    }

    @PostMapping(BASE + "/normativa")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> agregarNormativa(@Valid @RequestBody NormativaContadorRequest body) {
        acceso.exigirAdmin();
        long id;
        try {
            id = normativa.agregar(body.titulo(), body.fuente(), body.texto(), acceso.adminId());
        } catch (IllegalArgumentException e) {
            return malo("Revisá el título, la fuente y el texto (20 a 20.000 caracteres).");
        }
        auditoria.registrar("CONTADOR_NORMATIVA_AGREGADA", "CONTADOR_NORMATIVA", id, null, "documento de normativa cargado");
        return ok("Documento agregado", Map.of("id", id));
    }

    @GetMapping(BASE + "/hacienda")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> consultasHacienda() {
        acceso.exigirAdmin();
        return ok("Consultas para Hacienda", hacienda.listar());
    }

    /** Solo arma el texto para copiar: no envía nada a Hacienda. */
    @GetMapping(BASE + "/hacienda/{clave}/borrador")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> borradorHacienda(@PathVariable String clave) {
        acceso.exigirAdmin();
        try {
            return ok("Borrador de consulta", hacienda.borrador(clave));
        } catch (IllegalArgumentException e) {
            return malo("Consulta desconocida.");
        }
    }

    @PutMapping(BASE + "/hacienda/{clave}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> marcarHacienda(@PathVariable String clave, @Valid @RequestBody HaciendaEstadoRequest body) {
        acceso.exigirAdmin();
        try {
            hacienda.marcar(clave, body.confirmada());
        } catch (IllegalArgumentException e) {
            return malo("Consulta desconocida.");
        }
        auditoria.registrar("CONTADOR_HACIENDA_ESTADO", "CONTADOR_IA", null, null,
            "consulta " + clave + " -> " + (body.confirmada() ? "CONFIRMADA" : "ABIERTA"));
        return ok("Estado guardado", hacienda.listar());
    }

    @GetMapping(BASE + "/avisos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> verAvisos() {
        acceso.exigirAdmin();
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("sinLeer", avisos.sinLeer());
        d.put("avisos", avisos.listar());
        return ok("Avisos", d);
    }

    @PostMapping(BASE + "/avisos/{id}/leido")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResponseDTO> avisoLeido(@PathVariable long id) {
        acceso.exigirAdmin();
        avisos.marcarLeido(id);
        return ok("Aviso leído", Map.of("id", id));
    }

    private Map<String, Object> ajustesYParametros() {
        ContadorAjustesService.Ajustes a = ajustes.ajustes();
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("salarioBaseCrc", a.salarioBaseCrc());
        d.put("topeIaMesUsd", a.topeIaMesUsd());
        d.put("limitePreguntasDia", a.limitePreguntasDia());
        d.put("topeAnualRtsCrc", ContadorCalculos.topeAnualRts(a.salarioBaseCrc()));
        d.put("parametros", parametros.todos());
        d.put("etiquetaVerificar", ContadorFiscalService.VERIFICAR);
        d.put("avisoLegal", ContadorTextos.AVISO_LEGAL);
        return d;
    }

    private static ResponseEntity<ResponseDTO> ok(String mensaje, Object datos) {
        return ResponseEntity.ok(ResponseDTO.success(mensaje, datos));
    }

    private static ResponseEntity<ResponseDTO> malo(String mensaje) {
        return ResponseEntity.badRequest().body(ResponseDTO.error(mensaje));
    }
}
