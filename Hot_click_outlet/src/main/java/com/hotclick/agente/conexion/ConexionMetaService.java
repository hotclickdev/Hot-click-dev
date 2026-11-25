package com.hotclick.agente.conexion;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaDto;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.conexion.ConexionDtos.ConexionResultado;
import com.hotclick.agente.conexion.ConexionDtos.PaginaDto;
import com.hotclick.agente.conexion.MetaGraphCliente.PaginaMeta;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Conecta cuentas de Meta desde el panel (AG-23, AG-30). Sin transacción abierta: las llamadas a Graph van antes
 * de guardar (solo {@code registrarCuenta} es transaccional), así no se sostiene una conexión de BD durante I/O.
 * {@code empresaScope == null} = cuenta de HotClick (solo ADMIN). Nunca registra ni devuelve tokens.
 */
@Service
public class ConexionMetaService {

    private static final Logger log = LoggerFactory.getLogger(ConexionMetaService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final MetaConexionConfig config;
    private final MetaGraphCliente graph;
    private final CanalCuentaService cuentas;

    public ConexionMetaService(MetaConexionConfig config, MetaGraphCliente graph, CanalCuentaService cuentas) {
        this.config = config;
        this.graph = graph;
        this.cuentas = cuentas;
    }

    public ConexionDtos.ConfigPublica configPublica() {
        boolean wa = config.whatsappDisponible();
        boolean login = config.metaLoginDisponible();
        return new ConexionDtos.ConfigPublica(wa, login, wa || login ? config.appId() : "",
            wa ? config.signupConfigId() : "", login ? config.loginConfigId() : "", config.graphVersion());
    }

    /** Embedded Signup: código a token en el servidor, suscripción a la WABA, registro del número y alta. */
    public ConexionResultado conectarWhatsapp(Long empresaScope, ConexionDtos.WhatsappRequest req) {
        config.exigirWhatsapp();
        exigirLibre(empresaScope, Canal.WHATSAPP, req.phoneNumberId());
        String token = graph.intercambiarCodigo(req.code());
        // Prueba que el token realmente administra ese número (ids falsos del navegador no sirven).
        String nombre = graph.nombreDelNumero(req.phoneNumberId(), token);
        graph.suscribirWaba(req.wabaId(), token);
        List<String> avisos = new ArrayList<>();
        try {
            graph.registrarNumero(req.phoneNumberId(), token, nuevoPin());
        } catch (RuntimeException e) {
            // Un número ya registrado (o con PIN propio) no impide recibir y responder: se avisa y se sigue.
            log.warn("[conexion-meta] el registro del número no se confirmó ({})", e.getClass().getSimpleName());
            avisos.add("REGISTRO_NUMERO_PENDIENTE");
        }
        CanalCuenta c = cuentas.registrarCuenta(empresaScope, Canal.WHATSAPP, req.phoneNumberId(), req.wabaId(),
            nombre == null || nombre.isBlank() ? "WhatsApp" : nombre, token);
        log.info("[conexion-meta] WhatsApp conectado (cuenta {})", c.getId());
        return new ConexionResultado(List.of(CanalCuentaDto.de(c)), avisos);
    }

    /** Páginas del usuario y su Instagram vinculado; sin tokens. */
    public List<PaginaDto> listarPaginas(String tokenUsuario) {
        config.exigirLogin();
        return paginasDe(tokenUsuario).stream()
            .map(p -> new PaginaDto(p.id(), p.nombre(), p.instagramId(), p.instagramUsuario())).toList();
    }

    /** Conecta la página elegida (Messenger) y su Instagram vinculado con el token de página de larga duración. */
    public ConexionResultado conectarPagina(Long empresaScope, String tokenUsuario, String paginaId) {
        config.exigirLogin();
        // La página debe estar entre las que el usuario administra: si no, Meta no la entrega y se rechaza.
        PaginaMeta pagina = paginasDe(tokenUsuario).stream().filter(p -> p.id().equals(paginaId)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Esa página no está entre las que administrás en Meta"));
        exigirLibre(empresaScope, Canal.MESSENGER, pagina.id());
        if (pagina.instagramId() != null) exigirLibre(empresaScope, Canal.INSTAGRAM, pagina.instagramId());
        graph.suscribirPagina(pagina.id(), pagina.token());
        List<CanalCuentaDto> out = new ArrayList<>();
        out.add(CanalCuentaDto.de(cuentas.registrarCuenta(empresaScope, Canal.MESSENGER, pagina.id(), null,
            vacioA(pagina.nombre(), "Facebook"), pagina.token())));
        if (pagina.instagramId() != null) {
            String nombreIg = pagina.instagramUsuario() == null ? "Instagram" : "@" + pagina.instagramUsuario();
            out.add(CanalCuentaDto.de(cuentas.registrarCuenta(empresaScope, Canal.INSTAGRAM, pagina.instagramId(),
                null, nombreIg, pagina.token())));
        }
        log.info("[conexion-meta] página conectada ({} cuenta(s))", out.size());
        return new ConexionResultado(out, List.of());
    }

    private List<PaginaMeta> paginasDe(String tokenUsuario) {
        return graph.paginas(graph.tokenLargaDuracion(tokenUsuario));
    }

    /** Falla antes de llamar a Meta si esa cuenta ya pertenece a otro negocio. */
    private void exigirLibre(Long empresaScope, Canal tipo, String idExterno) {
        cuentas.buscar(tipo, idExterno).ifPresent(c -> {
            if (!Objects.equals(c.getEmpresaId(), empresaScope))
                throw new IllegalStateException("La cuenta ya está conectada a otro negocio");
        });
    }

    private static String vacioA(String s, String porDefecto) {
        return s == null || s.isBlank() ? porDefecto : s;
    }

    private static String nuevoPin() {
        return String.format(java.util.Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
    }
}
