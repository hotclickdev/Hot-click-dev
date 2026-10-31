package com.hotclick.service.payment;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Seguridad (seguimiento MED-2): única salida de {@code REVISION_SOBREVENTA}. Solo un ADMIN de plataforma
 * (sin impersonar) la usa; queda auditada con actor y motivo. No reembolsa ni llama a ningún procesador:
 * <ul>
 *   <li>{@code CANCELAR}: el grupo pasa a CANCELADO; el pago sigue REEMBOLSO_PENDIENTE (se debe la plata).</li>
 *   <li>{@code REEMBOLSO_PROCESADO}: el reembolso ya se hizo fuera; el pago pasa a REEMBOLSADO y el grupo
 *       a CANCELADO.</li>
 * </ul>
 * Las reservas ya se liberaron al entrar a revisión y el stock nunca se consumió, así que no se toca stock.
 */
@Service
public class SobreventaResolucionService {

    public static final String ACCION_CANCELAR = "CANCELAR";
    public static final String ACCION_REEMBOLSO_PROCESADO = "REEMBOLSO_PROCESADO";
    public static final int LARGO_MAXIMO_MOTIVO = 500;
    static final String MENSAJE_NO_EN_REVISION = "El pedido no está en revisión por sobreventa.";
    static final String MENSAJE_ACCION_INVALIDA = "Acción no válida: use CANCELAR o REEMBOLSO_PROCESADO.";
    static final String MENSAJE_MOTIVO = "El motivo es obligatorio (máximo 500 caracteres).";
    static final String MENSAJE_PAGO_NO_PENDIENTE = "El pago no tiene un reembolso pendiente.";
    private static final Pattern CONTROL = Pattern.compile("\\p{Cntrl}");

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private PedidoGrupoService pedidoGrupoService;
    @Autowired private AuditoriaAdminRegistroService auditoria;
    @Autowired private CompanyScope companyScope;

    @Transactional
    public Pedido resolver(Long pedidoId, String accionCruda, String motivoCrudo) {
        if (!companyScope.isAdminIT() || companyScope.isImpersonating()) {
            throw new AccessDeniedException("Solo un ADMIN de plataforma resuelve una sobreventa.");
        }
        String accion = accionCruda == null ? "" : accionCruda.trim().toUpperCase(Locale.ROOT);
        if (!ACCION_CANCELAR.equals(accion) && !ACCION_REEMBOLSO_PROCESADO.equals(accion)) {
            throw new IllegalArgumentException(MENSAJE_ACCION_INVALIDA);
        }
        String motivo = motivoCrudo == null ? "" : CONTROL.matcher(motivoCrudo).replaceAll(" ").trim();
        if (motivo.isEmpty() || motivo.length() > LARGO_MAXIMO_MOTIVO) {
            throw new IllegalArgumentException(MENSAJE_MOTIVO);
        }
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Pedido no encontrado"));
        if (!Constants.PEDIDO_REVISION_SOBREVENTA.equals(pedido.getEstadoPedido())) {
            throw new IllegalArgumentException(MENSAJE_NO_EN_REVISION);
        }
        // Pedido y pago releídos con lock (FOR UPDATE): dos ADMIN a la vez o un webhook tardío se serializan y el
        // segundo ve el estado ya resuelto (400), sin doble marca ni pisar otro estado.
        Optional<Pago> pagoOpt = pedidoGrupoService.pagoDelGrupo(pedido)
            .flatMap(p -> pagoRepository.findByIdForUpdate(p.getId()));
        if (ACCION_REEMBOLSO_PROCESADO.equals(accion)) {
            Pago pago = pagoOpt.filter(p -> Constants.PAGO_REEMBOLSO_PENDIENTE.equals(p.getEstadoPago()))
                .orElseThrow(() -> new IllegalArgumentException(MENSAJE_PAGO_NO_PENDIENTE));
            pago.setEstadoPago(Constants.PAGO_REEMBOLSADO);
            pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
            pagoRepository.save(pago);
        }
        List<Pedido> grupo = pedidoGrupoService.delGrupo(pedido);
        // Una sola escritura por lote (saveAll), sin consultas por pedido.
        StringBuilder numeros = new StringBuilder();
        Iterator<Pedido> it = grupo.iterator();
        while (it.hasNext()) {
            Pedido p = it.next();
            if (!Constants.PEDIDO_REVISION_SOBREVENTA.equals(p.getEstadoPedido())) continue;
            p.setEstadoPedido(Constants.PEDIDO_CANCELADO);
            if (numeros.length() > 0) numeros.append(',');
            numeros.append(p.getNumeroPedido());
        }
        pedidoRepository.saveAll(grupo);
        String estadoPago = pagoOpt.isPresent() ? pagoOpt.get().getEstadoPago() : "sin pago";
        auditoria.registrar("SOBREVENTA_" + accion, "PEDIDO", pedido.getId(), pedido.getEmpresaId(),
            String.format("Pedidos %s: %s → %s · pago %s · motivo: %s", numeros,
                Constants.PEDIDO_REVISION_SOBREVENTA, Constants.PEDIDO_CANCELADO, estadoPago, motivo));
        return pedido;
    }
}
