package com.hotclick.service.email;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class NegocioEmailBuilder {

    @Autowired private EmailLayoutHelper layout;

    public String buildCuponBienvenida(String codigo) {
        return layout.abrirHtml()
            + layout.header("Tu código de descuento", "13% menos en tu primera compra en línea")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Gracias por unirte a HotClick. Usá este código al pagar y obtené un <strong style='color:#14171C'>13% de descuento</strong> en tu primera compra en línea:</p>"
            + "<div style='background:#FEF2F1;border:2px dashed #E73B33;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px'>"
            + "<span style=\"font-size:28px;font-weight:800;letter-spacing:4px;color:#D02A23;font-family:'IBM Plex Mono',monospace\">" + layout.esc(codigo) + "</span>"
            + "</div>"
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:13px;line-height:1.8'>• Válido para una sola compra<br>• Una vez por persona<br>• Ingresalo en el campo «¿Tenés un cupón?» al hacer checkout</p>"
            + layout.cta("https://hotclick.lat/productos", "Encontrá lo que buscás")
            + layout.footer("¿Tenés alguna pregunta?");
    }

    public String buildBienvenidaEmprendedor(String nombre, String nombreEmpresa) {
        return layout.abrirHtml()
            + layout.header("Tu tienda está lista", "Bienvenido a la comunidad de emprendedores")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Tu negocio <strong style='color:#14171C'>" + layout.esc(nombreEmpresa) + "</strong> quedó registrado en HotClick. Ya podés entrar a tu panel y empezar a configurar tu tienda.</p>"
            + "<div style='background:#EFF4FE;border:1px solid #C2D5F9;border-radius:12px;padding:20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 10px;font-weight:700;color:#14171C'>Próximos pasos:</p>"
            + "<ul style='margin:0;padding-left:20px;color:#4D5560;line-height:1.8;font-size:14px'>"
            + "<li>Agregá tus primeros productos desde el panel</li>"
            + "<li>Configurá el perfil de tu negocio (logo, colores, WhatsApp)</li>"
            + "<li>Invitá a tu equipo de administración</li>"
            + "</ul>"
            + "</div>"
            + layout.cta("https://hotclick.lat/admin", "Ir a mi panel")
            + layout.footer("¿Tenés dudas para arrancar?");
    }

    public String buildAprobacionNegocio(String nombre, String nombreEmpresa) {
        return layout.abrirHtml()
            + layout.header("¡Tu negocio fue aprobado!", "Tus productos ya son visibles al público")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Tu negocio <strong style='color:#14171C'>" + layout.esc(nombreEmpresa) + "</strong> fue revisado y aprobado. Desde ahora tus productos aparecen en HotClick.</p>"
            + "<div style='background:#E9F7F0;border:1px solid #BFE5D1;border-radius:12px;padding:20px;margin-bottom:24px'>"
            + "<p style='margin:0 0 10px;font-weight:700;color:#178A50'>Tu tienda ya está en línea</p>"
            + "<p style='margin:0;color:#14171C;line-height:1.7;font-size:14px'>Podés activar la visibilidad, agregar más productos y configurar tu perfil desde el panel de administración.</p>"
            + "</div>"
            + layout.cta("https://hotclick.lat/admin", "Ver mi panel")
            + layout.footer("¿Tenés alguna pregunta?");
    }

    public String buildRechazoNegocio(String nombre, String nombreEmpresa) {
        return buildRechazoNegocio(nombre, nombreEmpresa, null);
    }

    public String buildRechazoNegocio(String nombre, String nombreEmpresa, String motivo) {
        String motivoHtml = (motivo != null && !motivo.isBlank())
            ? "<div style='background:#FEF2F1;border:1px solid #F5C2BE;border-radius:12px;padding:16px;margin:0 0 24px'>"
              + "<p style='margin:0 0 6px;font-weight:700;color:#14171C'>Motivo</p>"
              + "<p style='margin:0;color:#4D5560;font-size:14px;line-height:1.6'>" + layout.esc(motivo) + "</p></div>"
            : "";
        return layout.abrirHtml()
            + layout.header("Actualización sobre tu solicitud", null)
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
            + "<p style='margin:0 0 16px;color:#4D5560;font-size:14px;line-height:1.6'>Revisamos tu solicitud para <strong style='color:#14171C'>" + layout.esc(nombreEmpresa) + "</strong> y en esta ocasión no fue aprobada.</p>"
            + motivoHtml
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Esto no cierra la puerta: corregí lo indicado y volvé a aplicar, o escribinos a <a href='mailto:soporte@hotclick.cr' style='color:#1747A8'>soporte@hotclick.cr</a> o por WhatsApp.</p>"
            + layout.footer("¿Querés que lo revisemos juntos?");
    }

    public String buildInvitacionMiembro(String correo, String nombre, String rolEnEmpresa,
                                         String nombreEmpresa, String passwordPlano) {
        String rolLabel = switch (rolEnEmpresa) {
            case "EDITOR" -> "Editor — puede editar productos y pedidos";
            case "LECTOR" -> "Lector — solo visualización";
            case "ADMIN"  -> "Admin — acceso completo";
            default -> rolEnEmpresa;
        };

        String credencialesBlock;
        if (passwordPlano != null) {
            credencialesBlock = "<div style='background:#F8F9FB;border:1px solid #E4E7EC;border-radius:12px;padding:20px;margin:20px 0'>"
                + "<p style='margin:0 0 12px;font-weight:700;color:#14171C'>Tus credenciales de acceso</p>"
                + "<table style='width:100%;border-collapse:collapse'>"
                + "<tr><td style='color:#4D5560;padding:4px 0;width:110px;font-size:14px'>Correo:</td>"
                + "<td style=\"color:#14171C;font-family:'IBM Plex Mono',monospace;font-size:14px\">" + layout.esc(correo) + "</td></tr>"
                + "<tr><td style='color:#4D5560;padding:4px 0;font-size:14px'>Contraseña:</td>"
                + "<td style=\"color:#9A6700;font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:14px\">" + layout.esc(passwordPlano) + "</td></tr>"
                + "</table>"
                + "<p style='margin:12px 0 0;font-size:12px;color:#6E7682'>Te recomendamos cambiar la contraseña al ingresar desde Configuración → Seguridad.</p>"
                + "</div>";
        } else {
            credencialesBlock = "<p style='color:#4D5560;background:#F8F9FB;border:1px solid #E4E7EC;border-radius:10px;padding:14px;margin:16px 0;font-size:14px'>"
                + "Ingresá con tu correo <strong style='color:#14171C'>" + layout.esc(correo) + "</strong> y tu contraseña habitual.</p>";
        }

        return layout.abrirHtml()
            + layout.header("Te agregaron a un equipo", "Ya tenés acceso al panel del negocio")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
            + "<p style='margin:0 0 20px;color:#4D5560;font-size:14px;line-height:1.6'>Fuiste invitado al negocio <strong style='color:#14171C'>" + layout.esc(nombreEmpresa) + "</strong> en HotClick.</p>"
            + "<div style='background:#EFF4FE;border:1px solid #C2D5F9;border-radius:12px;padding:16px;margin-bottom:4px'>"
            + "<p style='margin:0 0 6px;color:#4D5560;font-size:13px'>Tu rol asignado</p>"
            + "<p style='margin:0;color:#1747A8;font-weight:700'>" + layout.esc(rolLabel) + "</p>"
            + "</div>"
            + credencialesBlock
            + layout.cta("https://hotclick.lat/login", "Ingresar al panel")
            + layout.footer("¿Tenés alguna pregunta?");
    }

    public String buildModeracionAprobada(String nombre, String tipoLabel, String nombreItem) {
        return layout.abrirHtml()
            + layout.header(layout.esc(tipoLabel) + " aprobado", "Ya está activo en HotClick")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Revisamos <strong style='color:#14171C'>"
            + layout.esc(nombreItem) + "</strong> y quedó aprobado.</p>"
            + layout.cta("https://hotclick.lat/admin", "Ver mi panel")
            + layout.footer("¿Tenés alguna pregunta?");
    }

    public String buildModeracionRechazada(String nombre, String tipoLabel, String nombreItem, String motivo) {
        String motivoHtml = (motivo != null && !motivo.isBlank())
            ? "<div style='background:#FEF2F1;border:1px solid #F5C2BE;border-radius:12px;padding:16px;margin-bottom:24px'>"
              + "<p style='margin:0 0 6px;font-weight:700;color:#14171C'>Motivo</p>"
              + "<p style='margin:0;color:#4D5560;font-size:14px;line-height:1.6'>" + layout.esc(motivo) + "</p></div>"
            : "";
        return layout.abrirHtml()
            + layout.header("Actualización sobre " + layout.esc(tipoLabel.toLowerCase()), null)
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
            + "<p style='margin:0 0 16px;color:#4D5560;font-size:14px;line-height:1.6'>Revisamos <strong style='color:#14171C'>"
            + layout.esc(nombreItem) + "</strong> y por ahora no quedó aprobado.</p>"
            + motivoHtml
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Podés corregirlo y volver a enviarlo, o escribirnos si tenés dudas.</p>"
            + layout.cta("https://hotclick.lat/admin", "Ir al panel")
            + layout.footer("¿Querés que lo revisemos juntos?");
    }

    public String buildResenaResultado(String nombre, boolean aprobada, String productoNombre) {
        if (aprobada) {
            return layout.abrirHtml()
                + layout.header("Tu reseña ya está publicada", null)
                + layout.abrirCuerpo()
                + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
                + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Publicamos tu reseña"
                + (productoNombre != null ? " de <strong style='color:#14171C'>" + layout.esc(productoNombre) + "</strong>" : "")
                + ". Gracias por ayudar a otros compradores.</p>"
                + layout.cta("https://hotclick.lat/productos", "Seguir comprando")
                + layout.footer("¿Tenés alguna pregunta?");
        }
        return layout.abrirHtml()
            + layout.header("Actualización sobre tu reseña", null)
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
            + "<p style='margin:0 0 24px;color:#4D5560;font-size:14px;line-height:1.6'>Revisamos tu reseña"
            + (productoNombre != null ? " de <strong style='color:#14171C'>" + layout.esc(productoNombre) + "</strong>" : "")
            + " y en esta ocasión no la publicamos. Si creés que fue un error, escribinos.</p>"
            + layout.footer("¿Querés que lo revisemos juntos?");
    }

    public String buildProductoModerado(String nombre, String productoNombre, boolean pausado, String notas) {
        String notasHtml = (notas != null && !notas.isBlank())
            ? "<div style='background:#F8F9FB;border:1px solid #E4E7EC;border-radius:12px;padding:16px;margin:0 0 24px'>"
              + "<p style='margin:0 0 6px;font-weight:700;color:#14171C'>Comentario</p>"
              + "<p style='margin:0;color:#4D5560;font-size:14px;line-height:1.6'>" + layout.esc(notas) + "</p></div>"
            : "";
        String cuerpo = pausado
            ? "Pausamos <strong style='color:#14171C'>" + layout.esc(productoNombre)
              + "</strong> del catálogo. Pausado no es rechazo de tu negocio: podés corregirlo y publicarlo de nuevo."
            : "Revisamos <strong style='color:#14171C'>" + layout.esc(productoNombre)
              + "</strong>. Revisá el comentario y ajustá si hace falta.";
        return layout.abrirHtml()
            + layout.header(pausado ? "Producto pausado" : "Aviso sobre tu producto", null)
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
            + "<p style='margin:0 0 16px;color:#4D5560;font-size:14px;line-height:1.6'>" + cuerpo + "</p>"
            + notasHtml
            + layout.cta("https://hotclick.lat/admin", "Ir al panel")
            + layout.footer("¿Querés que lo revisemos juntos?");
    }

    public String buildCambioCobroPendiente(String nombre, String tipoCuenta, String mascaraNueva) {
        return layout.abrirHtml()
            + layout.header("Cambio de cuenta de cobro", "Quedó en revisión")
            + layout.abrirCuerpo()
            + "<p style='margin:0 0 6px;color:#14171C;font-size:16px'>Hola, <strong>" + layout.esc(nombre) + "</strong>.</p>"
            + "<p style='margin:0 0 16px;color:#4D5560;font-size:14px;line-height:1.6'>"
            + "Pediste cambiar tu " + layout.esc(tipoCuenta) + " a <strong style='color:#14171C'>"
            + layout.esc(mascaraNueva) + "</strong>. La cuenta vigente no cambia hasta que HotClick lo apruebe.</p>"
            + layout.cta("https://hotclick.lat/admin", "Ver métodos de cobro")
            + layout.footer("Si no fuiste vos, escribinos ya.");
    }
}
