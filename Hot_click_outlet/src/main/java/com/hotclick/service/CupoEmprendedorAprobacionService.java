package com.hotclick.service;

import com.hotclick.exception.CupoEmprendedorCorreoNoVerificadoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.CupoEmprendedorService.ResultadoReserva;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Puesto y trial del plan Emprendedor, contados desde la APROBACIÓN del negocio.
 *
 * <p>Decisión de diseño: el registro deja el negocio PENDIENTE_CUPO sin consumir nada; el puesto se asigna dentro de la
 * misma transacción (y bajo el lock de la empresa) en que {@code EmpresaAprobacionService.aprobarYPublicar} lo aprueba.
 * Esa es la única ruta de aprobación, así que es el único punto donde se exige correo verificado, se aplica "un puesto
 * por persona" y arrancan {@code trialEmprendedorHasta} y los días que verá ONVO. Se descartó "reservar al registrar y
 * arrancar fechas al aprobar": un negocio pendiente (o falso) seguiría ocupando un puesto real y habría que liberarlo
 * en cada abandono.
 */
@Service
public class CupoEmprendedorAprobacionService {

    private static final Logger log = LoggerFactory.getLogger(CupoEmprendedorAprobacionService.class);

    public enum Resultado { NO_APLICA, TRIAL_ASIGNADO, REQUIERE_MEMBRESIA }

    private final CupoEmprendedorService cupoService;
    private final MiembroEmpresaRepository miembroRepository;
    private final UsuarioRepository usuarioRepository;
    private final SuscripcionRepository suscripcionRepository;

    public CupoEmprendedorAprobacionService(CupoEmprendedorService cupoService,
                                            MiembroEmpresaRepository miembroRepository,
                                            UsuarioRepository usuarioRepository,
                                            SuscripcionRepository suscripcionRepository) {
        this.cupoService = cupoService;
        this.miembroRepository = miembroRepository;
        this.usuarioRepository = usuarioRepository;
        this.suscripcionRepository = suscripcionRepository;
    }

    /** true si la empresa espera puesto: PENDIENTE_CUPO, o un puesto del registro anterior que aún no tiene titular. */
    static boolean necesitaResolver(Empresa e) {
        if (e == null) return false;
        if (Constants.ESTADO_PLAN_PENDIENTE_CUPO.equals(e.getEstadoPlan())) return true;
        return Constants.ESTADO_PLAN_TRIAL.equals(e.getEstadoPlan())
            && e.getTrialEmprendedorPos() != null
            && e.getTrialEmprendedorTitularUsuario() == null
            && e.getTrialEmprendedorTitularCorreo() == null;
    }

    /**
     * Resuelve el puesto al aprobar. {@code e} debe venir bloqueada ({@code findByIdForUpdate}) y dentro de la
     * transacción de la aprobación. Idempotente: una empresa que ya resolvió devuelve NO_APLICA y no reinicia fechas.
     *
     * @throws CupoEmprendedorCorreoNoVerificadoException si el propietario no tiene el correo verificado (se revierte
     *         la aprobación completa; no se consume puesto).
     */
    @Transactional
    public Resultado resolverAlAprobar(Empresa e) {
        if (!necesitaResolver(e)) return Resultado.NO_APLICA;
        Usuario dueno = propietario(e.getId());
        if (dueno == null || !Boolean.TRUE.equals(dueno.getCorreoVerificado())) {
            throw new CupoEmprendedorCorreoNoVerificadoException();
        }
        ResultadoReserva r = cupoService.reservarPuesto(e, dueno.getId(), normalizarCorreo(dueno.getCorreo()));
        if (r == ResultadoReserva.ASIGNADO) {
            cupoService.aplicarTrial(e);
            return Resultado.TRIAL_ASIGNADO;
        }
        if (r == ResultadoReserva.PUESTO_CONSERVADO_CON_SUSCRIPCION) {
            // Puesto heredado con suscripción vigente: no se toca ni el puesto ni el estado del plan.
            return Resultado.NO_APLICA;
        }
        log.info("[cupo-emprendedor] empresa={} aprobada sin trial ({})", e.getId(), r);
        cupoService.aplicarRequiereMembresia(e);
        return Resultado.REQUIERE_MEMBRESIA;
    }

    /**
     * Rechazo de un negocio: libera su puesto si lo tenía (TRIAL o PENDIENTE_CUPO). No libera si ya hay una
     * suscripción vigente (cobro ONVO creado): ese negocio es del flujo de pagos, no se le quita el puesto aquí.
     * {@code e} debe venir bloqueada y dentro de la transacción del rechazo.
     */
    @Transactional
    public boolean liberarAlRechazar(Empresa e) {
        if (e == null || e.getTrialEmprendedorPos() == null) return false;
        if (suscripcionRepository.findActivaByEmpresaId(e.getId()).isPresent()) {
            log.warn("[cupo-emprendedor] empresa={} rechazada con suscripción vigente: el puesto no se libera", e.getId());
            return false;
        }
        return cupoService.liberarPuesto(e);
    }

    /**
     * El propietario del negocio, de forma determinista: entre los miembros PROPIETARIO activos el de menor id de
     * usuario; si no hay, el usuario ligado a la empresa con menor id (el más antiguo, quien creó el negocio). La
     * consulta no garantiza orden, así que se ordena acá: dos aprobaciones nunca eligen titulares distintos.
     */
    private Usuario propietario(Long empresaId) {
        List<MiembroEmpresa> miembros = miembroRepository.findByEmpresaIdAndEstado(empresaId, 1);
        Usuario propietario = miembros.stream()
            .filter(m -> "PROPIETARIO".equals(m.getRolEnEmpresa()) && m.getUsuario() != null)
            .map(MiembroEmpresa::getUsuario)
            .min(PORID)
            .orElse(null);
        if (propietario != null) return propietario;
        return usuarioRepository.findByEmpresaIdConRoles(empresaId).stream().min(PORID).orElse(null);
    }

    private static final Comparator<Usuario> PORID =
        Comparator.comparing(Usuario::getId, Comparator.nullsLast(Comparator.naturalOrder()));

    /**
     * Clave de "misma persona" por correo: minúsculas, sin alias {@code +tag} y, en Gmail/Googlemail, sin puntos del
     * usuario y con dominio único. No pretende detectar personas distintas con correos distintos: ese límite se
     * documenta, la identidad real es el usuario verificado.
     */
    public static String normalizarCorreo(String correo) {
        if (correo == null) return null;
        String c = correo.trim().toLowerCase(Locale.ROOT);
        int at = c.lastIndexOf('@');
        if (at <= 0) return c;
        String local = c.substring(0, at);
        String dominio = c.substring(at + 1);
        int mas = local.indexOf('+');
        if (mas > 0) local = local.substring(0, mas);
        if (dominio.equals("gmail.com") || dominio.equals("googlemail.com")) {
            local = local.replace(".", "");
            dominio = "gmail.com";
        }
        return local + "@" + dominio;
    }
}
