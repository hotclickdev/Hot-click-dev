package com.hotclick.service.onvo;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.NegocioOnvoCuenta;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.NegocioOnvoCuentaRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

/**
 * S3-07 / S3-08: activar la cuenta ONVO del negocio, enlace de onboarding y reenvío; y la comisión que
 * fija el admin. Todo lo que habla con ONVO pasa por {@link OnvoMarketplaceClient} y falla cerrado sin llaves.
 */
@Service
public class OnvoOnboardingService {

    public static final String CODIGO_CUENTA_YA_EXISTE = "CUENTA_YA_EXISTE";
    public static final String CODIGO_SIN_CUENTA = "SIN_CUENTA_ONVO";
    public static final String CODIGO_NO_CONFIGURADO = "ONVO_NO_CONFIGURADO";
    public static final String CODIGO_ENLACE_INVALIDO = "ENLACE_ONVO_INVALIDO";
    public static final String CODIGO_PORCENTAJE_INVALIDO = "PORCENTAJE_INVALIDO";

    /** Conflicto de estado de la cuenta (409) con código estable. */
    public static class ConflictoOnvo extends RuntimeException {
        private final String code;
        public ConflictoOnvo(String code, String message) { super(message); this.code = code; }
        public String code() { return code; }
    }

    private final OnvoMarketplaceClient client;
    private final CuentaOnvoNegocioService cuentaService;
    private final NegocioOnvoCuentaRepository cuentaRepository;
    private final EmpresaRepository empresaRepository;
    private final AuditoriaAdminRegistroService auditoria;

    public OnvoOnboardingService(OnvoMarketplaceClient client, CuentaOnvoNegocioService cuentaService,
                                 NegocioOnvoCuentaRepository cuentaRepository, EmpresaRepository empresaRepository,
                                 AuditoriaAdminRegistroService auditoria) {
        this.client = client;
        this.cuentaService = cuentaService;
        this.cuentaRepository = cuentaRepository;
        this.empresaRepository = empresaRepository;
        this.auditoria = auditoria;
    }

    /** Crea la cuenta en ONVO. 409 si ya existe; 503 si ONVO no está configurado. */
    @Transactional
    public Map<String, Object> activar(Long empresaId, Long actor) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Negocio no encontrado"));
        NegocioOnvoCuenta c = cuentaService.cuentaDe(empresaId).orElse(null);
        if (c != null && c.getOnvoAccountId() != null) {
            throw new ConflictoOnvo(CODIGO_CUENTA_YA_EXISTE, "El negocio ya tiene una cuenta en ONVO.");
        }
        exigirConfigurado();
        String nombre = empresa.getNombreComercial() != null ? empresa.getNombreComercial() : empresa.getNombreEmpresa();
        OnvoMarketplaceClient.CuentaCreada creada = client.crearCuenta(empresaId, nombre, empresa.getCorreoEmpresa());
        String url = exigirHttps(creada.urlOnboarding());
        if (c == null) {
            c = new NegocioOnvoCuenta();
            c.setEmpresaId(empresaId);
            c.setModo(cuentaService.modo());
        }
        c.setOnvoAccountId(creada.accountId());
        c.setEstado("ONBOARDING_PENDIENTE");
        c.tocar(actor);
        cuentaRepository.save(c);
        auditoria.registrarSiAdmin("ONVO_REGISTRAR", "NEGOCIO_ONVO_CUENTA", c.getId(), empresaId, null);
        return Map.of("url", url);
    }

    /** Enlace vigente para «Continuar en ONVO». 409 sin cuenta; 503 sin ONVO. */
    @Transactional(readOnly = true)
    public Map<String, Object> enlace(Long empresaId) {
        String accountId = accountIdExistente(empresaId);
        exigirConfigurado();
        return Map.of("url", exigirHttps(client.enlaceOnboarding(accountId)));
    }

    /** 409 sin cuenta; 503 sin ONVO. */
    @Transactional(readOnly = true)
    public void reenviarEnlace(Long empresaId) {
        String accountId = accountIdExistente(empresaId);
        exigirConfigurado();
        client.reenviarEnlace(accountId);
        auditoria.registrarSiAdmin("ONVO_REENVIAR_ENLACE", "NEGOCIO_ONVO_CUENTA", null, empresaId, null);
    }

    /**
     * Comisión de ONVO del negocio que carga el admin (0–100). No llama a ONVO. Auditado.
     * @throws IllegalArgumentException fuera de rango o no numérico.
     */
    @Transactional
    public void cambiarComision(Long empresaId, Object valor, Long actor) {
        empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Negocio no encontrado"));
        BigDecimal pct = porcentaje(valor);
        NegocioOnvoCuenta c = cuentaService.cuentaDe(empresaId).orElseGet(() -> {
            NegocioOnvoCuenta n = new NegocioOnvoCuenta();
            n.setEmpresaId(empresaId);
            n.setModo(cuentaService.modo());
            return n;
        });
        BigDecimal anterior = c.getPctComision();
        c.setPctComision(pct);
        c.tocar(actor);
        cuentaRepository.save(c);
        auditoria.registrarSiAdmin("ONVO_COMISION", "NEGOCIO_ONVO_CUENTA", c.getId(), empresaId,
            "Comisión ONVO " + (anterior != null ? anterior.toPlainString() : "sin valor") + " → " + pct.toPlainString());
    }

    static BigDecimal porcentaje(Object valor) {
        if (!(valor instanceof Number) && !(valor instanceof String)) {
            throw new IllegalArgumentException("El porcentaje es obligatorio (0 a 100).");
        }
        BigDecimal pct;
        try {
            pct = new BigDecimal(valor.toString().trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("El porcentaje tiene que ser un número (0 a 100).");
        }
        if (pct.signum() < 0 || pct.compareTo(BigDecimal.valueOf(100)) > 0 || pct.scale() > 2) {
            throw new IllegalArgumentException("El porcentaje va de 0 a 100, con hasta 2 decimales.");
        }
        return pct;
    }

    private String accountIdExistente(Long empresaId) {
        empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Negocio no encontrado"));
        NegocioOnvoCuenta c = cuentaService.cuentaDe(empresaId).orElse(null);
        if (c == null || c.getOnvoAccountId() == null) {
            throw new ConflictoOnvo(CODIGO_SIN_CUENTA, "El negocio todavía no tiene cuenta en ONVO.");
        }
        return c.getOnvoAccountId();
    }

    private void exigirConfigurado() {
        if (!client.configurado()) throw new OnvoMarketplaceClient.OnvoNoConfiguradoException();
    }

    /** Solo enlaces https de ONVO llegan al front; cualquier otra cosa se trata como ONVO no disponible. */
    static String exigirHttps(String url) {
        if (url == null || !url.trim().toLowerCase().startsWith("https://")) {
            throw new OnvoMarketplaceClient.OnvoNoConfiguradoException();
        }
        return url.trim();
    }
}
