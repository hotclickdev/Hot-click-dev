package com.hotclick.service.contador;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Consultas abiertas para confirmar con Hacienda. Las preguntas y el borrador de la consulta viven en el codigo
 * (texto del experto fiscal); en la base solo queda el estado de cada una. No envia nada: solo entrega el texto para
 * copiar.
 */
@Service
public class ContadorHaciendaService {

    public record Consulta(String clave, String titulo, String resumen, String texto) {}

    static final String CITAS = """
        Citas comunes (verificar el número y el artículo vigente de cada una antes de enviar):
        - Ley 9635 (Fortalecimiento de las Finanzas Públicas), que reformó la Ley del IVA.
        - Reglamento de la Ley del IVA.
        - Resolución MH-DGT-RES-0027-2024 (disposiciones técnicas de los comprobantes 4.4).
        - Reglamento del RTS: Decreto 25514-H, reformado por los decretos 43881-H y 45209-H.
        """;

    static final List<Consulta> CONSULTAS = List.of(
        new Consulta("FEC_NO_INSCRITOS", "FEC a vendedores no inscritos",
            "¿Aplica la factura electrónica de compra (FEC) a compras a personas no inscritas?",
            """
            Estimados señores de la Dirección General de Tributación:

            HOTCLICK, plataforma de comercio electrónico en Costa Rica, adquiere bienes de vendedores que no están inscritos como contribuyentes ni emiten comprobantes electrónicos. Consultamos:
            (a) si procede que HOTCLICK emita Factura Electrónica de Compra (FEC) a esos vendedores;
            (b) cuáles son los supuestos y requisitos para emitirla, conforme a la Ley del IVA, su reglamento y la resolución MH-DGT-RES-0027-2024;
            (c) si la emisión depende de que el vendedor sea o no contribuyente del IVA, de su actividad o de un monto;
            (d) cómo debe documentarse la identificación del vendedor; y
            (e) si el comprobante sustenta crédito de IVA y gasto deducible para HOTCLICK.

            Agradecemos la respuesta con la base normativa."""),
        new Consulta("COBRO_ONVO_FACTURA", "Cobro a nombre del negocio en ONVO mientras HotClick factura",
            "¿El cobro «a nombre del negocio» en ONVO choca con que HotClick emita la factura?",
            """
            Estimados señores:

            HOTCLICK cobra al comprador por medio de un procesador de pagos que permite cobrar en nombre de un tercero. Emite la factura electrónica al comprador a nombre de HOTCLICK, y cada negocio le factura a HOTCLICK sus productos como si HOTCLICK los comprara. Consultamos:
            (a) si esta estructura configura una reventa o una intermediación, y qué efecto tiene en quién es el sujeto pasivo del IVA y quién debe emitir el comprobante;
            (b) si es válido que el cobro se acredite al negocio mientras HOTCLICK factura al comprador;
            (c) cómo se documenta la comisión de HOTCLICK: como margen de reventa o como servicio facturado al negocio; y
            (d) qué comprobantes se deben emitir y en qué casos procede el reintegro del IVA.

            Agradecemos la respuesta con la base normativa."""),
        new Consulta("RECARGO_IVA_RENTA", "Recargo que cubre el IVA pero no la renta",
            "El recargo del 14 % cubre el IVA pero no la renta: ¿cuál es el tratamiento correcto?",
            """
            Estimados señores:

            HOTCLICK cobra un recargo del 14 % sobre la comisión a los negocios no inscritos o en Régimen de Tributación Simplificada, en lugar de que ellos facturen. Consultamos:
            (a) si ese recargo puede considerarse una traslación del IVA aunque no exista comprobante del vendedor;
            (b) cuál es el tratamiento del impuesto sobre la renta, dado que el recargo no cubre la renta del negocio ni la de HOTCLICK;
            (c) si HOTCLICK debe retener o informar algo por esos pagos; y
            (d) cómo debe documentarse el cobro para evitar doble imposición o que el gasto no sea deducible.

            Agradecemos la respuesta con la base normativa."""),
        new Consulta("RTS_REVENTA_TOPE", "Régimen Simplificado combinado con reventa y el tope de compras",
            "¿Qué normativa aplica al RTS combinado con reventa y cómo se mide el tope de compras?",
            """
            Estimados señores:

            HOTCLICK está inscrita en el Régimen de Tributación Simplificada (actividades 4719.9 y 4741.0) y opera una plataforma de reventa: compra los bienes a sus negocios aliados y los revende al comprador final. Consultamos:
            (a) si ese modelo es compatible con el RTS, incluidos los requisitos de establecimiento, empleados y activos;
            (b) si las compras a los negocios aliados cuentan para el tope anual de 186 salarios base, y si ese monto se mide con o sin IVA;
            (c) a partir de qué momento (mes, trimestre o período) se debe pasar al régimen tradicional si se supera el tope, y cómo se trata el IVA soportado durante la transición;
            (d) si en el RTS HOTCLICK debe enviar el mensaje del receptor por los comprobantes que recibe; y
            (e) si la aceptación tácita sustituye al mensaje formal para efectos del crédito.

            Agradecemos la respuesta con la base normativa."""));

    private final JdbcTemplate jdbc;

    public ContadorHaciendaService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> listar() {
        Map<String, String> estados = new HashMap<>();
        jdbc.query("SELECT clave, estado FROM hot_click_contador_hacienda_tb", rs -> {
            estados.put(rs.getString(1), rs.getString(2));
        });
        List<Map<String, Object>> out = new ArrayList<>();
        for (Consulta c : CONSULTAS) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("clave", c.clave());
            m.put("titulo", c.titulo());
            m.put("resumen", c.resumen());
            m.put("estado", estados.getOrDefault(c.clave(), "ABIERTA"));
            m.put("aviso", ContadorTextos.AVISO_BORRADOR);
            out.add(m);
        }
        return out;
    }

    /** Borrador de la consulta libre a Hacienda, como texto para copiar. No envia nada. */
    public Map<String, Object> borrador(String clave) {
        Consulta c = buscar(clave);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("clave", c.clave());
        m.put("titulo", c.titulo());
        m.put("aviso", ContadorTextos.AVISO_BORRADOR);
        m.put("texto", ContadorTextos.AVISO_BORRADOR + "\n\n" + c.texto().strip() + "\n\n" + CITAS.strip());
        return m;
    }

    @Transactional
    public void marcar(String clave, boolean confirmada) {
        Consulta c = buscar(clave);
        jdbc.update("INSERT INTO hot_click_contador_hacienda_tb (clave, estado, actualizado_en) VALUES (?, ?, NOW()) "
            + "ON CONFLICT (clave) DO UPDATE SET estado = EXCLUDED.estado, actualizado_en = NOW()",
            c.clave(), confirmada ? "CONFIRMADA" : "ABIERTA");
    }

    private static Consulta buscar(String clave) {
        return CONSULTAS.stream().filter(c -> c.clave().equals(clave)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("consulta desconocida"));
    }

    public static List<Consulta> consultas() { return CONSULTAS; }
}
