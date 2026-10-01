# Pruebas de flujos (API)

Scripts automáticos que recorren los flujos completos del sistema y verifican que **los montos cuadren**
y que las reglas de negocio y permisos se cumplan. Usan el runner nativo de Node (`node:test`).

| Archivo | Qué prueba |
|---|---|
| `flows/reservations.test.js` | Reservas: solapamientos, margen de limpieza, fechas, abono en caja, zona horaria |
| `flows/stays.test.js` | Check-in (walk-in y desde reserva), tarifas del servidor, consumos, horas extra, salida tardía, penalidad y checkout |
| `flows/store.test.js` | Tienda: carrito, stock, precio congelado en ventas, pago mixto |
| `flows/vouchers.test.js` | Ticket / boleta / factura: numeración correlativa, RUC, un comprobante por operación |
| `flows/duration.test.js` | Duración: pernocte (1 noche y horario), estadía por días, abono mínimo, precio reservado |
| `flows/cash.test.js` | Caja y turnos: efectivo esperado, anulaciones, arqueo, un solo turno abierto |
| `flows/validation.test.js` | Validaciones de datos y permisos por rol/módulo |
| `flows/textiles.test.js` | Textiles: movimientos, lavandería, retorno con dañadas, stock bajo |

## ⚠️ Siempre contra una base de datos de PRUEBAS

Las pruebas crean y modifican datos. **Nunca** las corras contra la base real.

### 1. Crear la base de pruebas (una sola vez)

```bash
docker exec hotel_peru_postgres createdb -U hotel_admin hotel_test
```

### 2. Levantar un backend de pruebas (puerto 4021, dentro del contenedor)

```bash
docker exec -d -e DB_NAME=hotel_test -e PORT=4021 hotel_peru_backend sh -c 'node src/server.js > /tmp/test-server.log 2>&1'
```

Al arrancar crea las tablas y datos iniciales en `hotel_test`. Si reinicias el contenedor, vuelve a ejecutar este paso.

### 3. Correr las pruebas

```bash
docker exec -e DB_NAME=hotel_test hotel_peru_backend npm run test:flows
```

Variables opcionales: `TEST_API_URL` (por defecto `http://localhost:4021/api/v1`), `TEST_ADMIN_USER`, `TEST_ADMIN_PASSWORD`.

Antes de cada corrida, `tests/resetTestDb.js` limpia la base de pruebas (reservas, estadías, caja, ventas, textiles)
y deja las habitaciones disponibles. Solo funciona si `DB_NAME` contiene "test", así que nunca toca la base real.
