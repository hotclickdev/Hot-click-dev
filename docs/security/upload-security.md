# Seguridad de Uploads de Archivos

## Responsabilidades y alcance

El sistema permite subir imágenes de productos, logos de marcas, fotos de empresa y fotos de servicio. Todos los archivos van a Supabase Storage. El backend valida cada archivo antes de enviarlo al storage.

**Archivos implicados:**
- `service/SupabaseStorageService.java` — Validación central + upload
- `config/GlobalExceptionHandler.java` — Manejo de errores de tamaño
- `test/security/UploadSecurityTest.java` — 18 tests de validación

---

## Validaciones implementadas (en orden)

### 1. Límite de tamaño (Spring)

```properties
# application.properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=30MB
```

Spring rechaza la request **antes** de que llegue al controlador si supera 10 MB por archivo o 30 MB por request (3 imágenes máximo). El `GlobalExceptionHandler` captura `MaxUploadSizeExceededException` y retorna:

```http
HTTP/1.1 413 Payload Too Large
{ "message": "La imagen no puede superar 10 MB" }
```

### 2. Archivo no vacío

```java
if (file.isEmpty()) {
    throw new IllegalArgumentException("El archivo está vacío");
}
```

### 3. Extensión — allowlist estricta

```java
// Solo estas extensiones permitidas (lowercase comparison):
Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif");

String filename = file.getOriginalFilename().toLowerCase();
String extension = filename.substring(filename.lastIndexOf('.'));
if (!ALLOWED_EXTENSIONS.contains(extension)) {
    throw new IllegalArgumentException("Formato de archivo no permitido: " + extension);
}
```

Rechazados explícitamente (aunque no limitado): `.svg`, `.php`, `.exe`, `.html`, `.js`, cualquier otro.

**Por qué no `.svg`:** SVG es XML y puede contener JavaScript, lo que lo hace un vector de XSS si se sirve directamente. Supabase serviría el archivo con el Content-Type correcto que permitiría la ejecución.

### 4. Validación de tipo MIME

```java
// MIME types permitidos explícitamente:
Set<String> ALLOWED_MIMES = Set.of(
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif"
);

String contentType = file.getContentType();
// Excepción: application/octet-stream (iOS Safari envía esto para algunos formatos)
// → Se acepta pero REQUIERE pasar la validación de magic bytes
if (!"application/octet-stream".equals(contentType) && !ALLOWED_MIMES.contains(contentType)) {
    throw new IllegalArgumentException("Tipo MIME no permitido: " + contentType);
}
```

### 5. Magic bytes — validación de contenido real

La validación más importante: verifica los bytes reales del archivo, independientemente de la extensión o MIME declarado.

```java
byte[] header = file.getBytes();

// JPEG/JPG: 0xFF 0xD8 0xFF
boolean isJpeg = header.length >= 3 &&
    (header[0] & 0xFF) == 0xFF &&
    (header[1] & 0xFF) == 0xD8 &&
    (header[2] & 0xFF) == 0xFF;

// PNG: 0x89 0x50 0x4E 0x47 (+ 0x0D 0x0A 0x1A 0x0A en signature completa)
boolean isPng = header.length >= 4 &&
    (header[0] & 0xFF) == 0x89 &&
    (header[1] & 0xFF) == 0x50 &&
    (header[2] & 0xFF) == 0x4E &&
    (header[3] & 0xFF) == 0x47;

// GIF: 0x47 0x49 0x46 0x38 (GIF8)
boolean isGif = header.length >= 4 &&
    (header[0] & 0xFF) == 0x47 &&
    (header[1] & 0xFF) == 0x49 &&
    (header[2] & 0xFF) == 0x46 &&
    (header[3] & 0xFF) == 0x38;

// WebP: RIFF....WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
boolean isWebp = header.length >= 12 &&
    header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
    header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';

// AVIF: no tiene magic bytes cortos identificables → validado por extensión + MIME únicamente
boolean isAvif = extension.equals(".avif");
```

Si ningún formato coincide con los bytes reales → `IllegalArgumentException`.

---

## Ataques prevenidos

| Ataque | Sin validación | Con validación |
|---|---|---|
| Upload de `.php` renombrado como `.jpg` | Ejecución de código en servidor | Rechazado por magic bytes |
| MIME spoofing: EXE con MIME `image/jpeg` | Almacenamiento de ejecutable | Magic bytes de EXE no coinciden |
| Upload de SVG con JavaScript embebido | XSS via Storage URL | Extensión `.svg` rechazada |
| Archivo vacío | Crasheo o error inesperado | Rechazado en validación 2 |
| Archivo de 50 MB | Out of memory / timeout | Rechazado por Spring (413) |
| MIME `application/octet-stream` iOS legítimo | Rechazado por MIME | Permitido si magic bytes son válidos |

---

## Cobertura de tests

**Archivo:** `test/security/UploadSecurityTest.java` — 18 tests (15 activos)

```
✓ EXE renombrado como .jpg → rechazado (magic bytes no coinciden)
✓ PHP renombrado como .png → rechazado
✓ WAV renombrado como .webp → rechazado
✓ Archivo con extensión no permitida (.svg, .html, .php) → rechazado
✓ JPEG real válido → aceptado
✓ PNG real válido → aceptado
✓ GIF real válido → aceptado
✓ WebP real válido → aceptado
✓ Archivo vacío → rechazado
✓ MIME image/jpeg con bytes de EXE → rechazado
✓ application/octet-stream + magic bytes JPEG válidos → aceptado (iOS compat)
```

---

## Flujo completo de upload

```
1. Cliente → POST /api/productos/imagen (o /api/marcas/logo, etc.)
             multipart/form-data, file: <bytes>

2. Spring (antes del controlador):
   ├── Verifica max-file-size (10 MB) → 413 si supera
   └── Parsea multipart

3. Controlador:
   └── Pasa MultipartFile a SupabaseStorageService.uploadImage(file, path)

4. SupabaseStorageService.uploadImage():
   ├── isEmpty() → IllegalArgumentException
   ├── getOriginalFilename() → extraer extensión → validar en allowlist
   ├── getContentType() → validar en allowlist MIME (o aceptar octet-stream)
   ├── getBytes() → leer header → validar magic bytes
   ├── Si todo OK → HTTP PUT a Supabase Storage API con service-key auth
   └── Retornar URL pública del objeto

5. GlobalExceptionHandler:
   └── IllegalArgumentException → 400 con mensaje amigable
```

---

## Consideraciones de seguridad adicionales

- **Los archivos nunca se sirven desde el backend.** Van directo a Supabase Storage, que los sirve con el Content-Type correcto.
- **Nombres de archivo:** Generados en backend (UUID + extensión), nunca el nombre original del usuario. Previene path traversal.
- **Storage bucket:** Configurado en Supabase. Verificar que el bucket es de acceso público solo para lectura, no escritura anónima.
- **Virus scanning:** No implementado. Para contenido de usuario a gran escala, considerar integrar un antivirus como ClamAV o servicio de escaneo.
