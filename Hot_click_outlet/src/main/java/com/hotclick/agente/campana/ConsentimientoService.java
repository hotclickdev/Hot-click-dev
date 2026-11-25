package com.hotclick.agente.campana;

import com.hotclick.agente.cupo.AgenteBajaService;
import com.hotclick.agente.interno.HasherInterno;
import com.hotclick.service.TotpSecretEncryptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;

/**
 * Consentimiento explícito para campañas (AG-36), por contacto y negocio, con fecha, canal y evidencia. Solo cuenta
 * un opt-in ACTIVO y específico: el botón «Sí, quiero ofertas» que envió el bot, o la casilla del checkout. Escribir
 * al bot, comprar o aceptar el aviso general NO es consentimiento de campañas.
 *
 * <p>STOP y la lista de bajas siempre ganan: aunque el consentimiento esté ACTIVO, {@link CampanaEnvioService} revisa
 * la lista de bajas antes de cada envío. Un opt-in nuevo NO levanta una baja; solo ACTIVAR (o una decisión humana)
 * lo hace. Al revocar se borran el contacto cifrado y el nombre; queda el hash y la prueba.
 */
@Service
public class ConsentimientoService {

    private static final Logger log = LoggerFactory.getLogger(ConsentimientoService.class);

    /** Versión del texto que vio el cliente; subirla cuando cambie el texto legal del ofrecimiento. */
    public static final String VERSION_TEXTO = "OPTIN-V1";
    public static final String ORIGEN_BOTON = "BOTON_BOT";
    public static final String ORIGEN_CHECKOUT = "CHECKOUT";

    private final ConsentimientoRepositorio repo;
    private final HasherInterno hasher;
    private final TotpSecretEncryptionService cifrado;
    private final AgenteBajaService bajas;
    private final CampanaConfig config;

    public ConsentimientoService(ConsentimientoRepositorio repo, HasherInterno hasher,
                                 TotpSecretEncryptionService cifrado, AgenteBajaService bajas, CampanaConfig config) {
        this.repo = repo;
        this.hasher = hasher;
        this.cifrado = cifrado;
        this.bajas = bajas;
        this.config = config;
    }

    /**
     * Opt-in con el botón del bot. @param mensajeId wamid del toque (evidencia). @return true si quedó activo ahora.
     */
    public boolean registrarDesdeBoton(Long empresaId, String canal, String contacto, String nombre, String mensajeId) {
        return registrar(empresaId, canal, contacto, nombre, ORIGEN_BOTON, "boton:" + recortar(mensajeId, 120));
    }

    /** Opt-in marcado en el checkout. @param pedidoId pedido donde la persona marcó la casilla (evidencia). */
    public boolean registrarDesdeCheckout(Long empresaId, String contactoWhatsapp, String nombre, Long pedidoId) {
        return registrar(empresaId, "WHATSAPP", contactoWhatsapp, nombre, ORIGEN_CHECKOUT, "pedido:" + pedidoId);
    }

    private boolean registrar(Long empresaId, String canal, String contacto, String nombre, String origen,
                              String evidencia) {
        if (empresaId == null || contacto == null || contacto.isBlank() || canal == null)
            throw new IllegalArgumentException("negocio, canal y contacto son obligatorios");
        String c = canal.toUpperCase(Locale.ROOT);
        String limpio = contacto.strip();
        String hash = hasher.contacto(empresaId, c, limpio);
        boolean nuevo = repo.registrarActivo(empresaId, c, hash, HasherInterno.ultimos4(limpio),
            cifrado.encryptContactoCampana(limpio), recortar(nombre, 120), origen, evidencia, VERSION_TEXTO,
            config.ahora());
        if (nuevo) log.info("[campana-consent] consentimiento registrado empresa={} origen={}", empresaId, origen);
        return nuevo;
    }

    /** El cliente retiró el consentimiento (botón «No, gracias» o STOP). */
    public boolean revocar(Long empresaId, String canal, String contacto) {
        if (empresaId == null || contacto == null || canal == null) return false;
        boolean estaba = repo.revocar(empresaId, hasher.contacto(empresaId, canal.toUpperCase(Locale.ROOT), contacto),
            config.ahora());
        if (estaba) log.info("[campana-consent] consentimiento revocado empresa={}", empresaId);
        return estaba;
    }

    /** Se puede ofrecer el opt-in: nunca decidió antes y no está de baja. */
    public boolean puedeOfrecer(Long empresaId, String canal, String contacto) {
        String c = canal.toUpperCase(Locale.ROOT);
        if (bajas.estaDeBaja(empresaId, c, contacto)) return false;
        return !repo.existe(empresaId, hasher.contacto(empresaId, c, contacto));
    }

    public ConsentimientoRepositorio.Resumen resumen(Long empresaId) {
        return repo.resumen(empresaId);
    }

    private static String recortar(String s, int max) {
        if (s == null) return null;
        String t = s.strip();
        return t.length() <= max ? t : t.substring(0, max);
    }
}
