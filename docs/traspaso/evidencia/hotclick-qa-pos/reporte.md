# QA 6 · Re-QA área 4 (POS e Inventario) · master 2c051030 · 2026-10-26 14:08 CR
Backend propio en :8082 (PID 3041266, ya parado) desde un worktree detached en 2c05103064c878d4dda8a56abff84d9e8b5238da, que incluye #341 (14e2573c9). Perfil dev, DB local propia hotclick_qa6_2c05 (copia de hotclick_qa5_b456; borrada al terminar), ONVO_* sin definir. Staging y su .env no se tocaron.
Cuenta: PYME "QA PYME Prueba" (empresa 3). Solo en la copia local se le puso una contraseña local, que no se imprimió.

| Caso | Resultado |
|---|---|
| QA6-R4-01 kardex del producto 14 con venta POS | OK: 200 con el movimiento VENTA_POS 10→9 (antes daba 500) |
| QA6-R4-02 PUT /api/pos/caja/9999/cerrar | OK: 404 "Turno no encontrado" (antes daba 500) |
| Venta sin turno | OK: 400 |
| Abrir caja | OK: 200 (turno 2) |
| Venta en efectivo | OK: 200 y el stock en la DB baja de 10 a 9 |
| Stock insuficiente (999) / cantidad -3 | OK: 400 y 400; el stock sigue en 9 |
| Kardex de un producto de otra empresa | OK: 403 |
| Cerrar con diferencia 0 | OK: 200 (calculado 45000 = declarado 45000) |
| Cerrar dos veces | OK: 400 |
| Venta después del cierre | OK: 400; el stock no cambia |
| 8 rutas sin sesión | OK: 401 |

No hay bugs nuevos. Nota de entorno: el envío del correo de nueva venta falló con 401 de SendGrid porque no hay credencial local; no se envió nada y la venta no se afectó.
Las filas QA6-R4-01 y R4-02 quedaron marcadas como cerradas en bugs-pendientes-media-baja-2026-10-23.md.
