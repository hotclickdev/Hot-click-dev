package com.hotclick.service.extraccion;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
class ExtraccionDetalleFallbackGenerator {

    String generarComoUsar(String nombre, List<String> etiquetas) {
        String ctx = (nombre != null ? nombre.toLowerCase() : "") + " " +
                     (etiquetas != null ? String.join(" ", etiquetas).toLowerCase() : "");
        if (ctx.contains("crema") || ctx.contains("serum") || ctx.contains("moisturizer") ||
            ctx.contains("skincare") || ctx.contains("lotion") || ctx.contains("toner") ||
            ctx.contains("cleanser") || ctx.contains("face cream") || ctx.contains("skin care")) {
            return "Aplicar en rostro y cuello con piel limpia. Masajear en círculos hasta absorber. Usar mañana y noche.";
        }
        if (ctx.contains("perfume") || ctx.contains("cologne") || ctx.contains("fragrance") ||
            ctx.contains("eau de") || ctx.contains("parfum")) {
            return "Aplicar en puntos de calor: cuello, muñecas e interior de codos. No frotar tras aplicar.";
        }
        if (ctx.contains("shampoo") || ctx.contains("conditioner") || ctx.contains("acondicionador") ||
            ctx.contains("cabello") || ctx.contains("hair mask") || ctx.contains("mascarilla capilar")) {
            return "Aplicar en cabello húmedo, masajear y enjuagar bien. Usar acondicionador de medios a puntas.";
        }
        if (ctx.contains("supplement") || ctx.contains("vitamin") || ctx.contains("capsule") ||
            ctx.contains("tablet") || ctx.contains("suplemento") || ctx.contains("vitamina") ||
            ctx.contains("proteina") || ctx.contains("protein") || ctx.contains("collagen") ||
            ctx.contains("colageno")) {
            return "Tomar según indicación del empaque, preferiblemente con alimentos. No exceder la dosis diaria recomendada.";
        }
        if (ctx.contains("charger") || ctx.contains("cargador") || ctx.contains("cable") ||
            ctx.contains("adapter") || ctx.contains("adaptador") || ctx.contains("power bank") ||
            ctx.contains("batería portátil")) {
            return "Conectar el cable al dispositivo y luego a la fuente de energía. Verificar compatibilidad de voltaje y conector.";
        }
        if (ctx.contains("headphone") || ctx.contains("auricular") || ctx.contains("earphone") ||
            ctx.contains("earbuds") || ctx.contains("audífono")) {
            return "Encender y activar modo pairing. Seleccionar el dispositivo desde ajustes Bluetooth. Ajustar el volumen gradualmente.";
        }
        if (ctx.contains("speaker") || ctx.contains("bocina") || ctx.contains("altavoz") ||
            ctx.contains("parlante")) {
            return "Encender y activar Bluetooth. Emparejar desde ajustes del dispositivo. Mantener alejado del agua salvo que sea resistente.";
        }
        if (ctx.contains("smartwatch") || ctx.contains("smart watch") || ctx.contains("wearable") ||
            ctx.contains("fitness band") || ctx.contains("reloj inteligente")) {
            return "Ajustar la correa a la muñeca. Instalar la app del fabricante y emparejar vía Bluetooth para sincronizar datos.";
        }
        if (ctx.contains("phone") || ctx.contains("celular") || ctx.contains("smartphone") ||
            ctx.contains("iphone") || ctx.contains("android")) {
            return "Insertar tarjeta SIM y encender. Seguir el asistente de configuración inicial. Cargar completamente antes del primer uso.";
        }
        if (ctx.contains("tablet") || ctx.contains("laptop") || ctx.contains("computer") ||
            ctx.contains("notebook") || ctx.contains("computadora")) {
            return "Cargar completamente antes del primer uso. Seguir la configuración inicial en pantalla. Mantener el software actualizado.";
        }
        if (ctx.contains("tenis") || ctx.contains("zapato") || ctx.contains("shoe") ||
            ctx.contains("sneaker") || ctx.contains("boot") || ctx.contains("bota") ||
            ctx.contains("sandal") || ctx.contains("sandalia")) {
            return "Usar con calcetines adecuados. Limpiar con paño húmedo tras el uso. No lavar a máquina ni sumergir en agua.";
        }
        if (ctx.contains("ropa") || ctx.contains("camisa") || ctx.contains("pantalon") ||
            ctx.contains("vestido") || ctx.contains("shirt") || ctx.contains("dress") ||
            ctx.contains("jacket") || ctx.contains("pants") || ctx.contains("jeans") ||
            ctx.contains("chaqueta") || ctx.contains("abrigo")) {
            return "Lavar a mano o en ciclo delicado según la etiqueta. No usar blanqueador. Planchar a la temperatura indicada.";
        }
        if (ctx.contains("bag") || ctx.contains("bolso") || ctx.contains("mochila") ||
            ctx.contains("backpack") || ctx.contains("wallet") || ctx.contains("cartera")) {
            return "Limpiar con paño húmedo. Guardar en bolsa de tela cuando no se use. Evitar exposición prolongada a la humedad.";
        }
        if (ctx.contains("toy") || ctx.contains("juguete") || ctx.contains("game") ||
            ctx.contains("juego") || ctx.contains("puzzle") || ctx.contains("doll")) {
            return "Usar bajo supervisión adulta para niños menores de 3 años. Guardar piezas pequeñas fuera del alcance de bebés.";
        }
        if (ctx.contains("kitchen") || ctx.contains("cocina") || ctx.contains("cookware") ||
            ctx.contains("olla") || ctx.contains("sarten") || ctx.contains("pot ") ||
            ctx.contains("pan ") || ctx.contains("utensilios")) {
            return "Lavar antes del primer uso. No usar utensilios metálicos en superficies antiadherentes. Verificar si es apto para lavavajillas.";
        }
        if (ctx.contains("food") || ctx.contains("snack") || ctx.contains("alimento") ||
            ctx.contains("comida") || ctx.contains("bebida") || ctx.contains("drink") ||
            ctx.contains("juice") || ctx.contains("jugo")) {
            return "Consumir antes de la fecha indicada en el empaque. Mantener refrigerado tras abrir si aplica.";
        }
        return "Usar según las indicaciones del fabricante en el empaque. Guardar en lugar fresco y seco, lejos del alcance de niños.";
    }

    /** Construye una descripción corta usando el nombre y las etiquetas de Vision. Nunca devuelve null. */
    String construirDescripcionDeEtiquetas(String nombre, List<String> etiquetas) {
        final String base;
        if (nombre == null || nombre.isBlank()) {
            if (!etiquetas.isEmpty()) {
                base = etiquetas.get(0);
            } else {
                return "Producto importado de calidad. Ver imágenes para más detalles.";
            }
        } else {
            base = nombre;
        }
        List<String> extras = etiquetas.stream()
            .filter(e -> !e.equalsIgnoreCase(base) && e.length() > 3)
            .limit(3)
            .collect(Collectors.toList());
        if (extras.isEmpty()) return base + ".";
        return base + ". " + String.join(", ", extras) + ".";
    }

    /** Construye especificaciones básicas usando los datos de Vision. Nunca devuelve null. */
    String construirEspecificacionesDeLabels(String nombre, List<String> labelsFisicos, List<String> etiquetas) {
        StringBuilder sb = new StringBuilder();
        if (nombre != null && !nombre.isBlank())
            sb.append("Producto: ").append(nombre).append("\n");
        if (!labelsFisicos.isEmpty())
            sb.append("Categoría: ").append(labelsFisicos.get(0)).append("\n");
        // Etiquetas que parezcan características (contienen espacio o número)
        etiquetas.stream()
            .filter(e -> e.length() > 4 && (e.contains(" ") || e.matches(".*\\d.*")))
            .limit(4)
            .forEach(e -> sb.append("Característica: ").append(e).append("\n"));
        // Si no tenemos nada útil, devolver plantilla para completar manualmente
        if (sb.length() < 15)
            return "Marca: \nModelo: \nMaterial: \nColor: \nDimensiones: ";
        return sb.toString().trim();
    }
}
