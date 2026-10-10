package com.hotclick.service.reposicion;

import com.hotclick.model.Producto;
import com.hotclick.service.email.EmailLayoutHelper;
import org.springframework.stereotype.Component;

/** Correo «¡Volvió!» de «Avisame cuando vuelva», con el layout de marca de los demás correos. */
@Component
public class ReposicionEmailBuilder {

    private final EmailLayoutHelper layout;

    public ReposicionEmailBuilder(EmailLayoutHelper layout) {
        this.layout = layout;
    }

    public String asunto(Producto producto) {
        return "¡Volvió! " + producto.getNombreProducto() + " ya está disponible en HotClick";
    }

    public String html(Producto producto) {
        String nombre = layout.esc(producto.getNombreProducto());
        return layout.abrirHtml()
            + layout.headerConIcono(EmailLayoutHelper.FONDO_EXITO, "caja", "¡Volvió!",
                nombre + " ya tiene stock otra vez.")
            + layout.abrirCuerpo()
            + layout.parrafo("Nos pediste que te avisáramos cuando <strong>" + nombre
                + "</strong> volviera. Ya está disponible, pero puede agotarse de nuevo.")
            + layout.cta(layout.urlSitio("/productos/" + producto.getId()), "Ver producto")
            + layout.notaPequena("Te escribimos una sola vez por este producto. Si ya no te interesa, ignorá este mensaje.")
            + layout.footer(EmailLayoutHelper.PREGUNTA_DUDAS);
    }
}
